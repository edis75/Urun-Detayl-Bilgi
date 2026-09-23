using Elastic.Clients.Elasticsearch;
using Elastic.Clients.Elasticsearch.QueryDsl;
using System.Globalization;
using ProductCompare.Api.DTOs.Products;
using ProductCompare.Api.Services;
using Elastic.Clients.Elasticsearch.Aggregations;
using Microsoft.EntityFrameworkCore;
using ProductCompare.Api.Data;
using ProductCompare.Api.Enums;

namespace ProductCompare.Api.Search;

public class ProductSearchService(ElasticsearchClient client, IConfiguration configuration, AppDbContext db, ProductService products)
{
    private readonly string alias = configuration["Elasticsearch:ProductIndex"]
        ?? throw new InvalidOperationException("Elasticsearch:ProductIndex is required.");

    public async Task<ProductSearchResponseDto> SearchAsync(ProductSearchRequest request,
        CancellationToken cancellationToken = default)
    {
        var query = request.Q?.Trim() ?? "";
        var page = request.Page;
        var pageSize = request.PageSize;
        if (string.IsNullOrEmpty(query) && !request.CategoryId.HasValue) throw new ApiException(400, "Arama metni veya kategori gereklidir.");
        if (page < 1 || pageSize < 1 || pageSize > 100)
            throw ApiException.Invalid("page >= 1 ve pageSize 1–100 olmalıdır.");

        var from = (long)(page - 1) * pageSize;
        // Respect Elasticsearch's default result window without changing index settings.
        if (from + pageSize > 10_000)
            throw ApiException.Invalid("Arama sayfalaması ilk 10000 sonuçla sınırlıdır.");
        if (query.Length > 300 || request.CategoryId <= 0 || request.BrandIds.Any(id => id <= 0) ||
            request.BrandIds.Count > 100 || request.Filters.Count > 32)
            throw ApiException.Invalid("Geçersiz arama veya filtre değeri.");
        if (request.Filters.Count > 0 && !request.CategoryId.HasValue)
            throw ApiException.Invalid("Özellik filtreleri için categoryId gereklidir.");

        var categories = await db.Categories.AsNoTracking().ToDictionaryAsync(c => c.Id, cancellationToken);
        var visible = categories.Values.Where(c => CategoryService.Path(c.Id, categories).All(p => p.IsActive)).ToDictionary(c => c.Id);
        if (request.CategoryId.HasValue && categories.ContainsKey(request.CategoryId.Value) && !visible.ContainsKey(request.CategoryId.Value)) throw ApiException.NotFound();
        var normalized = SlugService.Normalize(query);
        var intent = visible.Values.Where(c => SlugService.Normalize(c.Name) == normalized || c.Slug == normalized).Take(2).ToList();
        var context = request.CategoryId.HasValue ? visible.GetValueOrDefault(request.CategoryId.Value) : intent.Count == 1 ? intent[0] : null;
        // Exact category intent supplies metadata, without constraining broad text results.
        var metadataCategoryId = context?.Id;
        var children = visible.Values.Where(c => c.ParentCategoryId == request.CategoryId)
            .OrderBy(c => c.DisplayOrder).ThenBy(c => c.Id).ToList();
        // Product filtering and facet counts stay in Elasticsearch.
        var metadata = metadataCategoryId.HasValue
            ? await db.CategoryAttributes.AsNoTracking()
                .Where(a => a.CategoryId == metadataCategoryId && a.IsFilterable)
                .OrderBy(a => a.DisplayOrder).ThenBy(a => a.AttributeDefinitionId)
                .Select(a => new AttributeSearchFacet(a.AttributeDefinition.Code, a.AttributeDefinition.Name,
                    a.AttributeDefinition.Unit, a.AttributeDefinition.DataType, a.DisplayOrder, new List<SearchFacetValue>()))
                .ToListAsync(cancellationToken)
            : new List<AttributeSearchFacet>();
        var filters = BuildFilters(request, metadata);

        var matches = new List<Query>
        {
            new MatchPhraseQuery("name") { Query = query, Boost = 12 },
            new MultiMatchQuery { Query = query, Fields = new[] { "name^6", "brandName^4", "categoryName^2" } },
            new NestedQuery
            {
                Path = "attributes",
                Query = new MultiMatchQuery
                {
                    Query = query,
                    Fields = new[] { "attributes.textValue^3", "attributes.name^1", "attributes.code" }
                }
            }
        };
        var parts = query.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries);
        // AUTO:4,7 permits no edits for tokens shorter than four characters (A17, M3, 5G).
        matches.Add(new MultiMatchQuery
        {
            Query = query, Fields = new[] { "name", "brandName" }, Boost = 0.3f,
            Fuzziness = new Fuzziness("AUTO:4,7"), PrefixLength = 1, MaxExpansions = 25
        });
        if (parts.Length == 2 && parts[1].All(char.IsLetter) &&
            double.TryParse(parts[0], NumberStyles.AllowLeadingSign | NumberStyles.AllowDecimalPoint,
                CultureInfo.InvariantCulture, out var numericValue) && double.IsFinite(numericValue))
        {
            // Both conditions must match the same attribute; retain root/text search alongside them.
            matches.Add(new NestedQuery
            {
                Path = "attributes",
                Query = new BoolQuery
                {
                    Must = new Query[]
                    {
                        new TermQuery("attributes.numericValue") { Value = numericValue },
                        new TermQuery("attributes.unit") { Value = parts[1] }
                    }
                }
            });
        }

        var response = await client.SearchAsync<ProductSearchDocument>(s => s
            .Index(alias)
            .TrackTotalHits(new Elastic.Clients.Elasticsearch.Core.Search.TrackHits(true))
            .From((int)from)
            .Size(pageSize)
            .AllowPartialSearchResults(false)
            .Query(new BoolQuery { Should = query.Length > 0 ? matches : null, MinimumShouldMatch = query.Length > 0 ? 1 : 0, Filter = filters.Count > 0 ? filters : null })
            .Sort(BuildSort(request.Sort, query.Length > 0))
            .Aggregations(BuildAggregations(metadata, children)), cancellationToken);

        // The existing exception handler logs the failure and returns the API error envelope.
        if (!response.IsValidResponse || response.TimedOut)
            throw new InvalidOperationException("Elasticsearch search failed: " + response.DebugInformation);

        var items = response.Hits.Select(hit =>
        {
            var source = hit.Source ?? throw new InvalidOperationException("Elasticsearch search hit has no source.");
            return new ProductSearchItemDto(source.Id, source.Name, source.BrandId, source.BrandName,
                source.CategoryId, source.CategoryName, hit.Score);
        }).ToList();

        return new ProductSearchResponseDto(response.Total, page, pageSize, items, MapFacets(response, metadata, visible, children),
            context is null ? null : CategoryService.Map(context), await products.GetManyAsync(items.Select(p => p.Id).ToArray(), cancellationToken));
    }

    private static List<SortOptions> BuildSort(string? sort, bool hasQuery)
    {
        var result = new List<SortOptions>();
        switch (sort ?? "relevance")
        {
            case "relevance": if (hasQuery) result.Add(SortOptions.Score(new ScoreSort { Order = SortOrder.Desc })); break;
            case "newest": break; // IDs are the existing stable insertion order.
            default: throw ApiException.Invalid("Geçersiz sıralama.");
        }
        result.Add(SortOptions.Field("id", new FieldSort { Order = SortOrder.Desc }));
        return result;
    }

    public async Task<IReadOnlyList<ProductSuggestionDto>> SuggestionsAsync(string? query, CancellationToken ct)
    {
        query = query?.Trim();
        if (string.IsNullOrEmpty(query) || query.Length < 2) return [];
        if (query.Length > 300) throw ApiException.Invalid("Arama metni en fazla 300 karakter olmalıdır.");
        var response = await client.SearchAsync<ProductSearchDocument>(s => s.Index(alias).Size(10)
            .TrackTotalHits(new Elastic.Clients.Elasticsearch.Core.Search.TrackHits(false))
            .Source(new Elastic.Clients.Elasticsearch.Core.Search.SourceConfig(
                new Elastic.Clients.Elasticsearch.Core.Search.SourceFilter
                { Includes = new[] { "id", "name", "brandName", "categoryName" } }))
            .AllowPartialSearchResults(false)
            .Query(new BoolQuery
            {
                Filter = new Query[] { new TermQuery("isActive") { Value = true } },
                Must = new Query[] { new MatchPhrasePrefixQuery("name") { Query = query, MaxExpansions = 25 } }
            }), ct);
        if (!response.IsValidResponse || response.TimedOut)
            throw new InvalidOperationException("Elasticsearch suggestions failed: " + response.DebugInformation);
        return response.Hits.Select(hit => hit.Source
                ?? throw new InvalidOperationException("Suggestion source is missing."))
            .Select(p => new ProductSuggestionDto(p.Id, p.Name, p.BrandName, p.CategoryName)).ToList();
    }

    private static List<Query> BuildFilters(ProductSearchRequest request, List<AttributeSearchFacet> metadata)
    {
        var filters = new List<Query>();
        if (request.CategoryId is long categoryId) filters.Add(new TermQuery("categoryPathIds") { Value = categoryId });
        if (request.IsActive is bool active) filters.Add(new TermQuery("isActive") { Value = active });
        if (request.BrandIds.Count > 0) filters.Add(new TermsQuery
        {
            Field = "brandId", Terms = new TermsQueryField(request.BrandIds.Distinct().Select(id => FieldValue.Long(id)).ToArray())
        });
        foreach (var (code, value) in request.Filters)
        {
            var attribute = metadata.SingleOrDefault(a => a.Code == code)
                ?? throw ApiException.Invalid($"Filtrelenebilir kategori özelliği bulunamadı: {code}");
            FieldValue parsed;
            if (string.IsNullOrWhiteSpace(value) || value.Length > 256)
                throw ApiException.Invalid($"Geçersiz özellik değeri: {code}");
            switch (attribute.DataType)
            {
                case AttributeDataType.Number when double.TryParse(value,
                    NumberStyles.AllowLeadingSign | NumberStyles.AllowDecimalPoint, CultureInfo.InvariantCulture, out var number)
                    && double.IsFinite(number): parsed = number; break;
                case AttributeDataType.Boolean when bool.TryParse(value, out var boolean): parsed = boolean; break;
                case AttributeDataType.Text: parsed = value; break;
                case AttributeDataType.Date when DateTimeOffset.TryParse(value, CultureInfo.InvariantCulture,
                    DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal, out var date):
                    parsed = date.ToUnixTimeMilliseconds(); break;
                default: throw ApiException.Invalid($"Özellik veri tipi ile değer uyumsuz: {code}");
            }
            filters.Add(new NestedQuery
            {
                Path = "attributes",
                Query = new BoolQuery
                {
                    Filter = new Query[]
                    {
                        new TermQuery("attributes.code") { Value = code },
                        new TermQuery(AttributeField(attribute.DataType)) { Value = parsed }
                    }
                }
            });
        }
        return filters;
    }

    private static string AttributeField(AttributeDataType type) => type switch
    {
        AttributeDataType.Number => "attributes.numericValue",
        AttributeDataType.Boolean => "attributes.booleanValue",
        AttributeDataType.Date => "attributes.dateValue",
        _ => "attributes.textValue.keyword"
    };

    private static Dictionary<string, Aggregation> BuildAggregations(List<AttributeSearchFacet> metadata, List<Entities.Category> children)
    {
        var aggregations = new Dictionary<string, Aggregation>
        {
            ["categories"] = new TermsAggregation("categories") { Field = "categoryId", Size = 100 },
            ["brands"] = new TermsAggregation("brands")
            {
                Field = "brandId", Size = 100,
                Aggregations = new Dictionary<string, Aggregation>
                { ["name"] = new TermsAggregation("name") { Field = "brandName.keyword", Size = 1 } }
            },
        };
        if (children.Count > 0)
            aggregations["children"] = new FiltersAggregation("children")
            { Filters = new Buckets<Query>(children.Select(c => (Query)new TermQuery("categoryPathIds") { Value = c.Id }).ToArray()) };
        if (metadata.Count == 0) return aggregations;
        aggregations["attributes"] = new NestedAggregation("attributes")
        {
            Path = "attributes",
            Aggregations = metadata.ToDictionary(a => a.Code, a => (Aggregation)new TermsAggregation(a.Code)
            {
                Field = "attributes.code", Include = new TermsInclude(new[] { a.Code }), Size = 1,
                Aggregations = new Dictionary<string, Aggregation>
                { ["values"] = new TermsAggregation("values") { Field = AttributeField(a.DataType), Size = 100 } }
            })
        };
        return aggregations;
    }

    private static ProductSearchFacets MapFacets(SearchResponse<ProductSearchDocument> response,
        List<AttributeSearchFacet> metadata, IReadOnlyDictionary<long, Entities.Category> categories, List<Entities.Category> children)
    {
        var aggregations = response.Aggregations ?? throw new InvalidOperationException("Search aggregations are missing.");
        var brands = aggregations.GetLongTerms("brands")!.Buckets.Select(b =>
            new BrandSearchFacet(b.Key, b.GetStringTerms("name")!.Buckets.FirstOrDefault()?.Key.ToString() ?? "", b.DocCount)).ToList();
        var nested = aggregations.GetNested("attributes");
        var attributes = metadata.Select(a =>
        {
            var values = nested!.GetStringTerms(a.Code)!.Buckets.FirstOrDefault();
            if (values is null) return a;
            IReadOnlyList<SearchFacetValue> buckets = a.DataType switch
            {
                AttributeDataType.Number => values.GetDoubleTerms("values")!.Buckets
                    .Select(b => new SearchFacetValue(b.Key, b.DocCount)).ToList(),
                AttributeDataType.Boolean => values.GetLongTerms("values")!.Buckets
                    .Select(b => new SearchFacetValue(b.Key != 0, b.DocCount)).ToList(),
                AttributeDataType.Date => values.GetLongTerms("values")!.Buckets
                    .Select(b => new SearchFacetValue(DateTimeOffset.FromUnixTimeMilliseconds(b.Key), b.DocCount)).ToList(),
                _ => values.GetStringTerms("values")!.Buckets
                    .Select(b => new SearchFacetValue(b.Key.ToString(), b.DocCount)).ToList()
            };
            return a with { Values = buckets };
        }).ToList();
        return new ProductSearchFacets(brands, attributes,
            aggregations.GetLongTerms("categories")!.Buckets.Where(b => categories.ContainsKey(b.Key))
                .Select(b => new CategorySearchFacet(b.Key, categories[b.Key].Name, categories[b.Key].Slug, b.DocCount)).ToList(),
            children.Select((c, i) => new CategorySearchFacet(c.Id, c.Name, c.Slug,
                aggregations.GetFilters("children")!.Buckets.ElementAt(i).DocCount)).ToList());
    }
}
