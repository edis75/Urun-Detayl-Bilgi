using Microsoft.EntityFrameworkCore;
using ProductCompare.Api.Data;
using ProductCompare.Api.DTOs.Products;
using ProductCompare.Api.Entities;

namespace ProductCompare.Api.Services;

public class ProductImageService(AppDbContext db, IR2StorageService storage, ILogger<ProductImageService> logger)
{
    // All image mutations take the same product-row lock, including an empty gallery.
    private async Task<Product> LockProductAsync(long productId, CancellationToken ct)
    {
        var products = await db.Products.FromSqlInterpolated($"SELECT * FROM \"Products\" WHERE \"Id\" = {productId} FOR UPDATE").ToListAsync(ct);
        var product = products.SingleOrDefault() ?? throw ApiException.NotFound();
        await db.Entry(product).Collection(x => x.Images).LoadAsync(ct);
        return product;
    }

    private static List<ProductImageResponse> Map(Product product) => product.Images
        .OrderByDescending(x => x.IsPrimary).ThenBy(x => x.SortOrder).ThenBy(x => x.Id)
        .Select(x => new ProductImageResponse(x.Id, x.ImageUrl, x.IsPrimary, x.SortOrder)).ToList();

    private async Task SelectPrimaryAsync(Product product, ProductImage selected, CancellationToken ct)
    {
        // Flush the old primary first so the partial unique index remains valid during the switch.
        foreach (var image in product.Images) image.IsPrimary = false;
        await db.SaveChangesAsync(ct);
        selected.IsPrimary = true;
        product.MainImageUrl = selected.ImageUrl;
        product.UpdatedAtUtc = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
    }

    public async Task<List<ProductImageResponse>> UploadAsync(long productId, UploadProductImagesRequest request, CancellationToken ct)
    {
        if (request.Files is null || request.Files.Count is < 1 or > 10) throw ApiException.Invalid("Bir işlemde 1–10 görsel seçin.");
        if (request.PrimaryImageIndex is int primary && (primary < 0 || primary >= request.Files.Count)) throw ApiException.Invalid("Kapak görseli seçimi geçersiz.");
        var uploaded = new List<R2UploadResult>();
        await using var tx = await db.Database.BeginTransactionAsync(ct);
        try
        {
            var product = await LockProductAsync(productId, ct);
            var nextOrder = product.Images.Count == 0 ? 0 : product.Images.Max(x => x.SortOrder) + 1;
            var added = new List<ProductImage>();
            foreach (var file in request.Files)
            {
                var result = await storage.UploadAsync(file, $"products/{productId}", ct);
                uploaded.Add(result);
                var image = new ProductImage { ImageUrl = result.PublicUrl, ObjectKey = result.ObjectKey, SortOrder = nextOrder++ };
                product.Images.Add(image); added.Add(image);
            }
            var selected = request.PrimaryImageIndex is int index ? added[index] : product.Images.FirstOrDefault(x => x.IsPrimary) ?? added[0];
            await SelectPrimaryAsync(product, selected, ct);
            await tx.CommitAsync(ct);
            return Map(product);
        }
        catch
        {
            foreach (var item in uploaded)
            {
                using var cleanup = new CancellationTokenSource(TimeSpan.FromSeconds(15));
                try { await storage.DeleteAsync(item.ObjectKey, cleanup.Token); }
                catch (Exception error) { logger.LogError(error, "Image cleanup failed for {ObjectKey}", item.ObjectKey); }
            }
            throw;
        }
    }

    public async Task<List<ProductImageResponse>> SetPrimaryAsync(long productId, long imageId, CancellationToken ct)
    {
        await using var tx = await db.Database.BeginTransactionAsync(ct);
        var product = await LockProductAsync(productId, ct);
        var image = product.Images.SingleOrDefault(x => x.Id == imageId) ?? throw ApiException.NotFound();
        await SelectPrimaryAsync(product, image, ct);
        await tx.CommitAsync(ct);
        return Map(product);
    }

    public async Task<List<ProductImageResponse>> DeleteAsync(long productId, long imageId, CancellationToken ct)
    {
        await using var tx = await db.Database.BeginTransactionAsync(ct);
        var product = await LockProductAsync(productId, ct);
        var image = product.Images.SingleOrDefault(x => x.Id == imageId) ?? throw ApiException.NotFound();
        product.Images.Remove(image); db.ProductImages.Remove(image);
        // Persist metadata changes inside the transaction before deleting the remote object.
        await db.SaveChangesAsync(ct);
        if (image.IsPrimary)
        {
            var next = product.Images.OrderBy(x => x.SortOrder).ThenBy(x => x.Id).FirstOrDefault();
            if (next is not null) await SelectPrimaryAsync(product, next, ct);
            else { product.MainImageUrl = null; product.UpdatedAtUtc = DateTime.UtcNow; await db.SaveChangesAsync(ct); }
        }
        await storage.DeleteAsync(image.ObjectKey, ct);
        await tx.CommitAsync(ct);
        return Map(product);
    }

    public async Task DeleteProductAsync(long productId, CancellationToken ct)
    {
        await using var tx = await db.Database.BeginTransactionAsync(ct);
        var product = await LockProductAsync(productId, ct);
        var keys = product.Images.Select(x => x.ObjectKey).ToList();
        db.Products.Remove(product); await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        // The product is gone: attempt every cleanup even if one object fails. Rolling back
        // after partially deleting remote images would leave a product with broken references.
        foreach (var key in keys)
        {
            using var cleanup = new CancellationTokenSource(TimeSpan.FromSeconds(15));
            try { await storage.DeleteAsync(key, cleanup.Token); }
            catch (Exception error) { logger.LogError(error, "Deleted product image cleanup failed for {ObjectKey}", key); }
        }
    }
}
