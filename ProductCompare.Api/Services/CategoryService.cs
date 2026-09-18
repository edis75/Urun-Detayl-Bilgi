using Microsoft.EntityFrameworkCore;
using ProductCompare.Api.Data;
using ProductCompare.Api.DTOs.Categories;
using ProductCompare.Api.Entities;
namespace ProductCompare.Api.Services;

public class CategoryService(AppDbContext db, SlugService slugs)
{
    public static CategoryResponse Map(Category c) => new(c.Id, c.Name, c.Slug, c.ParentCategoryId, c.IsActive, c.DisplayOrder, c.CreatedAtUtc, c.UpdatedAtUtc);
    public async Task<List<CategoryResponse>> ListAsync(CancellationToken ct) => (await db.Categories.AsNoTracking().OrderBy(x => x.DisplayOrder).ThenBy(x => x.Id).ToListAsync(ct)).Select(Map).ToList();
    public async Task<CategoryResponse> GetAsync(long id, CancellationToken ct) => Map(await db.Categories.AsNoTracking().SingleOrDefaultAsync(x => x.Id == id, ct) ?? throw ApiException.NotFound());
    public async Task<CategoryResponse> SaveAsync(long? id, CreateCategoryRequest r, CancellationToken ct)
    {
        await using var tx = await db.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable, ct);
        var c = id.HasValue ? await db.Categories.FindAsync([id.Value], ct) ?? throw ApiException.NotFound() : new Category();
        var parent = r.ParentCategoryId; var visited = new HashSet<long>();
        while (parent.HasValue)
        {
            if (parent == id || !visited.Add(parent.Value)) throw ApiException.Invalid("Kategori hiyerarşisi döngü içeremez.");
            var ancestor = await db.Categories.AsNoTracking().SingleOrDefaultAsync(x => x.Id == parent, ct) ?? throw ApiException.Invalid("Üst kategori bulunamadı.");
            parent = ancestor.ParentCategoryId;
        }
        c.Slug = await slugs.CreateAsync<Category>(r.Name, 250, id, ct); c.Name = r.Name.Trim(); c.ParentCategoryId = r.ParentCategoryId;
        c.IsActive = r.IsActive; c.DisplayOrder = r.DisplayOrder;
        if (!id.HasValue) db.Categories.Add(c);
        await db.SaveChangesAsync(ct); await tx.CommitAsync(ct); return Map(c);
    }
    public async Task DeleteAsync(long id, CancellationToken ct)
    {
        var c = await db.Categories.FindAsync([id], ct) ?? throw ApiException.NotFound();
        if (await db.Categories.AnyAsync(x => x.ParentCategoryId == id, ct) || await db.Products.AnyAsync(x => x.CategoryId == id, ct) || await db.CategoryAttributes.AnyAsync(x => x.CategoryId == id, ct))
            throw ApiException.Conflict("Kategoriye bağlı kayıtlar var.");
        db.Categories.Remove(c); await db.SaveChangesAsync(ct);
    }
    public async Task<List<CategoryAttributeResponse>> AttributesAsync(long id, CancellationToken ct)
    {
        await GetAsync(id, ct);
        return (await db.CategoryAttributes.AsNoTracking().Include(x => x.AttributeDefinition).Where(x => x.CategoryId == id).OrderBy(x => x.DisplayOrder).ThenBy(x => x.AttributeDefinitionId).ToListAsync(ct))
         .Select(x => new CategoryAttributeResponse(AttributeService.Map(x.AttributeDefinition), x.IsRequired, x.IsFilterable, x.IsComparable, x.DisplayOrder)).ToList();
    }
    public async Task<CategoryAttributeResponse> AssignAsync(long id, CategoryAttributeRequest r, CancellationToken ct)
    {
        await using var tx = await db.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable, ct);
        await GetAsync(id, ct);
        var a = await db.AttributeDefinitions.FindAsync([r.AttributeDefinitionId], ct) ?? throw ApiException.Invalid("Özellik bulunamadı.");
        if (await db.CategoryAttributes.AnyAsync(x => x.CategoryId == id && x.AttributeDefinitionId == r.AttributeDefinitionId, ct)) throw ApiException.Conflict("Özellik zaten atanmış.");
        if (r.IsRequired && await db.Products.AnyAsync(x => x.CategoryId == id && !x.AttributeValues.Any(v => v.AttributeDefinitionId == r.AttributeDefinitionId), ct))
            throw ApiException.Conflict("Mevcut ürünlerde bu zorunlu özellik eksik.");
        db.CategoryAttributes.Add(new CategoryAttribute { CategoryId = id, AttributeDefinitionId = a.Id, IsRequired = r.IsRequired, IsFilterable = r.IsFilterable, IsComparable = r.IsComparable, DisplayOrder = r.DisplayOrder });
        await db.SaveChangesAsync(ct); await tx.CommitAsync(ct);
        return new(AttributeService.Map(a), r.IsRequired, r.IsFilterable, r.IsComparable, r.DisplayOrder);
    }
    public async Task UnassignAsync(long id, long attributeId, CancellationToken ct)
    {
        await using var tx = await db.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable, ct);
        var ca = await db.CategoryAttributes.FindAsync([id, attributeId], ct) ?? throw ApiException.NotFound();
        if (await db.ProductAttributeValues.AnyAsync(x => x.Product.CategoryId == id && x.AttributeDefinitionId == attributeId, ct))
            throw ApiException.Conflict("Bu özellik kategorideki ürünlerde kullanılıyor.");
        db.CategoryAttributes.Remove(ca); await db.SaveChangesAsync(ct); await tx.CommitAsync(ct);
    }
}
