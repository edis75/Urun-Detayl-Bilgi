using Microsoft.EntityFrameworkCore;
using ProductCompare.Api.Data;
using ProductCompare.Api.DTOs.Categories;
using ProductCompare.Api.Entities;
namespace ProductCompare.Api.Services;

public class CategoryService(AppDbContext db, SlugService slugs)
{
    // A single metadata snapshot serves navigation, validation and indexing.
    public static List<Category> Path(long id, IReadOnlyDictionary<long, Category> categories)
    {
        var path = new List<Category>();
        var seen = new HashSet<long>();
        long? cursor = id;
        while (cursor.HasValue)
        {
            if (!seen.Add(cursor.Value) || !categories.TryGetValue(cursor.Value, out var category))
                throw ApiException.Invalid("Geçersiz kategori hiyerarşisi.");
            path.Add(category);
            cursor = category.ParentCategoryId;
        }
        path.Reverse();
        return path;
    }
    public async Task<List<CategoryNode>> TreeAsync(CancellationToken ct)
    {
        var categories = await db.Categories.AsNoTracking().OrderBy(c => c.DisplayOrder).ThenBy(c => c.Id).ToListAsync(ct);
        var children = categories.Where(c => c.IsActive).ToLookup(c => c.ParentCategoryId);
        CategoryNode Node(Category c) => new(c.Id, c.Name, c.Slug, children[c.Id].Select(Node).ToList());
        return children[null].Select(Node).ToList();
    }
    public async Task<CategoryDetail> BySlugAsync(string slug, CancellationToken ct)
    {
        var categories = await db.Categories.AsNoTracking().ToDictionaryAsync(c => c.Id, ct);
        var category = categories.Values.SingleOrDefault(c => c.Slug == slug) ?? throw ApiException.NotFound();
        var path = Path(category.Id, categories);
        if (path.Any(c => !c.IsActive)) throw ApiException.NotFound();
        return new(category.Id, category.Name, category.Slug,
            path.Count > 1 ? Map(path[^2]) : null,
            categories.Values.Where(c => c.ParentCategoryId == category.Id && c.IsActive)
                .OrderBy(c => c.DisplayOrder).ThenBy(c => c.Id).Select(Map).ToList(), path.Select(Map).ToList());
    }
    public static CategoryResponse Map(Category c) => new(c.Id, c.Name, c.Slug, c.ParentCategoryId, c.IsActive, c.DisplayOrder, c.CreatedAtUtc, c.UpdatedAtUtc);
    public async Task<List<CategoryResponse>> ListAsync(CancellationToken ct)
    {
        var categories = await db.Categories.AsNoTracking().OrderBy(x => x.DisplayOrder).ThenBy(x => x.Id).ToListAsync(ct);
        var lookup = categories.ToDictionary(c => c.Id);
        var parents = categories.Where(c => c.IsActive && c.ParentCategoryId.HasValue).Select(c => c.ParentCategoryId!.Value).ToHashSet();
        return categories.Select(c => { var path = Path(c.Id, lookup); return Map(c) with
        { PathName = string.Join(" > ", path.Select(p => p.Name)), IsSelectable = path.All(p => p.IsActive) && !parents.Contains(c.Id) }; }).ToList();
    }
    public async Task<CategoryResponse> GetAsync(long id, CancellationToken ct) => Map(await db.Categories.AsNoTracking().SingleOrDefaultAsync(x => x.Id == id, ct) ?? throw ApiException.NotFound());
    public async Task<CategoryResponse> SaveAsync(long? id, CreateCategoryRequest r, CancellationToken ct)
    {
        await using var tx = await db.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable, ct);
        var c = id.HasValue ? await db.Categories.FindAsync([id.Value], ct) ?? throw ApiException.NotFound() : new Category();
        var categories = await db.Categories.AsNoTracking().ToDictionaryAsync(x => x.Id, ct);
        if (r.ParentCategoryId.HasValue && Path(r.ParentCategoryId.Value, categories).Any(x => x.Id == id))
            throw ApiException.Invalid("Kategori hiyerarşisi döngü içeremez.");
        if (!string.IsNullOrWhiteSpace(r.Slug))
        {
            var slug = SlugService.Normalize(r.Slug);
            if (slug.Length == 0 || categories.Values.Any(x => x.Id != id && x.Slug == slug))
                throw ApiException.Invalid("Slug boş veya başka bir kategori tarafından kullanılıyor.");
            c.Slug = slug;
        }
        else if (!id.HasValue) c.Slug = await slugs.CreateAsync<Category>(r.Name, 250, id, ct);
        c.Name = r.Name.Trim(); c.ParentCategoryId = r.ParentCategoryId;
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
