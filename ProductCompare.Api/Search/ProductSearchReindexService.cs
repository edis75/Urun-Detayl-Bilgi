using Microsoft.EntityFrameworkCore;
using ProductCompare.Api.Data;

namespace ProductCompare.Api.Search;

public class ProductSearchReindexService(AppDbContext db, ProductSearchIndexService index)
{
    private const int BatchSize = 500;

    public async Task<long> ReindexAsync(CancellationToken ct = default)
    {
        await index.EnsureIndexAsync(ct);
        return await CopyAsync(false, ct);
    }

    public async Task<long> MigrateIndexAsync(CancellationToken ct = default)
    {
        await index.EnsureMigrationTargetAsync(ct);
        await using var snapshot = await db.Database.BeginTransactionAsync(System.Data.IsolationLevel.RepeatableRead, ct);
        var expected = await db.Products.LongCountAsync(ct);
        var indexed = await CopyAsync(true, ct);
        if (indexed != expected) throw new InvalidOperationException("Incomplete PostgreSQL snapshot copy.");
        await index.ValidateAndActivateAsync(expected, ct);
        return indexed;
    }

    private async Task<long> CopyAsync(bool targetPhysicalIndex, CancellationToken ct)
    {
        // Bound this run even when new products are being inserted concurrently.
        var upperId = await db.Products.MaxAsync(p => (long?)p.Id, ct);
        long? lastId = null;
        long indexed = 0;
        var categories = await db.Categories.AsNoTracking().ToDictionaryAsync(c => c.Id, ct);
        while (upperId.HasValue)
        {
            var query = db.Products.AsNoTracking().Where(p => p.Id <= upperId.Value);
            if (lastId.HasValue) query = query.Where(p => p.Id > lastId.Value);
            var batch = await query.OrderBy(p => p.Id).Take(BatchSize)
                .Select(ProductSearchDocumentMapper.Projection).ToListAsync(ct);
            if (batch.Count == 0) break;
            ProductSearchDocumentMapper.ApplyCategoryPaths(batch, categories);
            await index.BulkIndexAsync(batch, ct, targetPhysicalIndex);
            indexed += batch.Count;
            lastId = batch[^1].Id;
        }
        await index.RefreshAsync(ct, targetPhysicalIndex);
        return indexed;
    }
}
