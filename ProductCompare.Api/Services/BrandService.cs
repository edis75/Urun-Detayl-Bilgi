using Microsoft.EntityFrameworkCore;
using ProductCompare.Api.Data;
using ProductCompare.Api.DTOs.Brands;
using ProductCompare.Api.Entities;
namespace ProductCompare.Api.Services;

public class BrandService(AppDbContext db, SlugService slugs)
{
    public static BrandResponse Map(Brand b) => new(b.Id, b.Name, b.Slug, b.IsActive, b.CreatedAtUtc, b.UpdatedAtUtc);
    public async Task<List<BrandResponse>> ListAsync(CancellationToken ct) => (await db.Brands.AsNoTracking().OrderBy(x => x.Name).ToListAsync(ct)).Select(Map).ToList();
    public async Task<BrandResponse> GetAsync(long id, CancellationToken ct) => Map(await db.Brands.AsNoTracking().SingleOrDefaultAsync(x => x.Id == id, ct) ?? throw ApiException.NotFound());
    public async Task<BrandResponse> SaveAsync(long? id, CreateBrandRequest r, CancellationToken ct)
    {
        var b = id.HasValue ? await db.Brands.FindAsync([id.Value], ct) ?? throw ApiException.NotFound() : new Brand();
        b.Slug = await slugs.CreateAsync<Brand>(r.Name, 180, id, ct); b.Name = r.Name.Trim(); b.IsActive = r.IsActive;
        if (!id.HasValue) db.Brands.Add(b);
        await db.SaveChangesAsync(ct); return Map(b);
    }
    public async Task DeleteAsync(long id, CancellationToken ct)
    {
        var b = await db.Brands.FindAsync([id], ct) ?? throw ApiException.NotFound();
        if (await db.Products.AnyAsync(x => x.BrandId == id, ct)) throw ApiException.Conflict("Markaya bağlı ürünler var.");
        db.Brands.Remove(b); await db.SaveChangesAsync(ct);
    }
}
