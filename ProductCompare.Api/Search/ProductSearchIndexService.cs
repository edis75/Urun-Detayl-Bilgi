using System.Globalization;
using Elastic.Clients.Elasticsearch;
using Elastic.Clients.Elasticsearch.Core.Bulk;
using Elastic.Clients.Elasticsearch.IndexManagement;
using Elastic.Clients.Elasticsearch.Mapping;
using Elastic.Transport.Products.Elasticsearch;
using Elastic.Clients.Elasticsearch.Analysis;

namespace ProductCompare.Api.Search;

public class ProductSearchIndexService(ElasticsearchClient client, IConfiguration configuration)
{
    private readonly string alias = configuration["Elasticsearch:ProductIndex"]
        ?? throw new InvalidOperationException("Elasticsearch:ProductIndex is required.");
    private readonly string physicalIndex = configuration["Elasticsearch:ProductPhysicalIndex"]
        ?? throw new InvalidOperationException("Elasticsearch:ProductPhysicalIndex is required.");

    public async Task EnsureIndexAsync(CancellationToken ct = default)
    {
        var exists = await client.Indices.ExistsAsync(physicalIndex, ct);
        if (!exists.Exists)
        {
            if (exists.ApiCallDetails.HttpStatusCode != 404) Check(exists);
            var created = await client.Indices.CreateAsync(new CreateIndexRequest(physicalIndex)
            {
                Settings = new IndexSettings
                {
                    Analysis = new IndexSettingsAnalysis
                    {
                        Analyzers = new Analyzers
                        {
                            { "product_text", new CustomAnalyzer { Tokenizer = "standard", Filter = new[] { "product_lowercase", "asciifolding" } } }
                        },
                        TokenFilters = new TokenFilters
                        {
                            { "product_lowercase", new LowercaseTokenFilter { Language = "turkish" } }
                        }
                    }
                },
                Mappings = new TypeMapping
                {
                    Dynamic = DynamicMapping.Strict,
                    Properties = new Properties
                    {
                        { "id", new LongNumberProperty() },
                        { "name", TextWithKeyword() },
                        { "description", new TextProperty() },
                        { "brandId", new LongNumberProperty() },
                        { "brandName", TextWithKeyword() },
                        { "categoryId", new LongNumberProperty() },
                        { "categoryName", TextWithKeyword() },
                        { "categoryPathIds", new LongNumberProperty() },
                        { "categoryPathNames", TextWithKeyword() },
                        { "categoryPathSlugs", new KeywordProperty() },
                        { "isActive", new BooleanProperty() },
                        { "attributes", new NestedProperty
                            {
                                Properties = new Properties
                                {
                                    { "code", new KeywordProperty() },
                                    { "name", TextWithKeyword() },
                                    { "unit", new KeywordProperty() },
                                    { "numericValue", new DoubleNumberProperty() },
                                    { "textValue", TextWithKeyword() },
                                    { "booleanValue", new BooleanProperty() },
                                    { "dateValue", new DateProperty() }
                                }
                            }
                        }
                    }
                }
            }, ct);
            // Another API instance may have created the same index concurrently.
            if (created.ElasticsearchServerError?.Error.Type != "resource_already_exists_exception") Check(created);
        }
        await EnsureAliasAsync(ct);
    }

    public async Task EnsureAliasAsync(CancellationToken ct = default)
    {
        var exists = await client.Indices.ExistsAliasAsync(new ExistsAliasRequest(alias), ct);
        if (exists.Exists) return; // Preserve an alias already moved to a later index version.
        if (exists.ApiCallDetails.HttpStatusCode != 404) Check(exists);
        Check(await client.Indices.PutAliasAsync(new PutAliasRequest(physicalIndex, alias) { IsWriteIndex = true }, ct));
    }

    public async Task IndexProductAsync(ProductSearchDocument document, CancellationToken ct = default)
        => Check(await client.IndexAsync(new IndexRequest<ProductSearchDocument>(document, alias, Id(document.Id))
        { RequireAlias = true }, ct));

    public async Task DeleteProductAsync(long id, CancellationToken ct = default)
    {
        var response = await client.DeleteAsync(alias, Id(id), ct);
        if (response.Result != Result.NotFound) Check(response);
    }

    public async Task BulkIndexAsync(IReadOnlyCollection<ProductSearchDocument> documents, CancellationToken ct = default,
        bool targetPhysicalIndex = false)
    {
        if (documents.Count == 0) return;
        var response = await client.BulkAsync(new BulkRequest(targetPhysicalIndex ? physicalIndex : alias)
        {
            RequireAlias = !targetPhysicalIndex,
            Operations = new BulkOperationsCollection(documents.Select(d =>
                new BulkIndexOperation<ProductSearchDocument>(d) { Id = Id(d.Id) }))
        }, ct);
        Check(response);
        if (response.Errors)
            throw new InvalidOperationException("Elasticsearch bulk indexing failed: " + string.Join("; ",
                response.ItemsWithErrors.Take(5).Select(i => $"{i.Id}: {i.Error?.Reason}")));
    }

    public async Task RefreshAsync(CancellationToken ct = default, bool targetPhysicalIndex = false)
        => Check(await client.Indices.RefreshAsync(targetPhysicalIndex ? physicalIndex : alias, ct));

    public async Task ValidateAndActivateAsync(long expectedCount, CancellationToken ct)
    {
        var count = await client.CountAsync<ProductSearchDocument>(s => s.Indices(physicalIndex), ct);
        Check(count);
        if (count.Count != expectedCount)
            throw new InvalidOperationException("Target index count differs from PostgreSQL snapshot; alias was not moved.");
        var missingPaths = await client.CountAsync<ProductSearchDocument>(s => s.Indices(physicalIndex)
            .Query(q => q.Bool(b => b.MustNot(m => m.Exists(e => e.Field("categoryPathIds"))))), ct);
        Check(missingPaths);
        if (missingPaths.Count != 0)
            throw new InvalidOperationException("Target index contains documents without category paths; alias was not moved.");
        var current = await client.Indices.GetAliasAsync(new GetAliasRequest((Names)alias), ct);
        Check(current);
        var actions = current.Aliases.Keys.Select(index => Elastic.Clients.Elasticsearch.IndexManagement.Action.Remove(
            new RemoveAction { Index = index, Alias = alias })).ToList();
        actions.Add(Elastic.Clients.Elasticsearch.IndexManagement.Action.Add(
            new AddAction { Index = physicalIndex, Alias = alias, IsWriteIndex = true }));
        Check(await client.Indices.UpdateAliasesAsync(new UpdateAliasesRequest { Actions = actions }, ct));
    }

    public async Task EnsureMigrationTargetAsync(CancellationToken ct)
    {
        await EnsureIndexAsync(ct);
        var current = await client.Indices.GetAliasAsync(new GetAliasRequest((Names)alias), ct);
        Check(current);
        if (current.Aliases.Keys.Any(index => index.ToString() == physicalIndex))
            throw new InvalidOperationException("Migration target is already active; use the normal reindex endpoint.");
        var count = await client.CountAsync<ProductSearchDocument>(s => s.Indices(physicalIndex), ct);
        Check(count);
        if (count.Count != 0)
            throw new InvalidOperationException("Migration requires an empty target index. Existing data was preserved.");
    }

    private static string Id(long id) => id.ToString(CultureInfo.InvariantCulture);
    private static TextProperty TextWithKeyword() => new()
    {
        Analyzer = "product_text",
        Fields = new Properties { { "keyword", new KeywordProperty { IgnoreAbove = 256 } } }
    };
    private static void Check(ElasticsearchResponse response)
    {
        if (!response.IsValidResponse)
            throw new InvalidOperationException("Elasticsearch request failed: " + response.DebugInformation);
    }
}
