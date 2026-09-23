using Microsoft.EntityFrameworkCore;
using ProductCompare.Api.Data;
using ProductCompare.Api.DTOs.Products;
using ProductCompare.Api.Entities;
using ProductCompare.Api.Enums;
namespace ProductCompare.Api.Services;

public class ProductService(AppDbContext db, SlugService slugs)
{
    private IQueryable<Product> Details => db.Products.AsNoTracking().Include(x => x.Category).Include(x => x.Brand).Include(x => x.AttributeValues).ThenInclude(x => x.AttributeDefinition);
    private async Task<List<ProductResponse>> MapAsync(List<Product> products, CancellationToken ct)
    {
        var categories = products.Select(x => x.CategoryId).Distinct().ToArray();
        var rules = await db.CategoryAttributes.AsNoTracking().Where(x => categories.Contains(x.CategoryId))
            .ToDictionaryAsync(x => (x.CategoryId, x.AttributeDefinitionId), x => new { x.DisplayOrder, x.IsComparable }, ct);
        return products.Select(p =>
        {
            var attributes = p.AttributeValues.OrderBy(v => rules.GetValueOrDefault((p.CategoryId, v.AttributeDefinitionId))?.DisplayOrder ?? 0)
                .ThenBy(v => v.AttributeDefinitionId)
                .Select(v => new TechnicalAttributeResponse(v.AttributeDefinitionId, v.AttributeDefinition.Name, v.AttributeDefinition.Code,
                    v.AttributeDefinition.DataType, Value(v), v.AttributeDefinition.Unit)).ToList();
            var comparable = attributes.Where(a => rules.GetValueOrDefault((p.CategoryId, a.AttributeId))?.IsComparable == true).ToList();
            var summary = (comparable.Count > 0 ? comparable : attributes).Take(4).ToList();
            return new ProductResponse(p.Id, p.Name, p.Slug, p.ModelCode, new(p.Category.Id, p.Category.Name, p.Category.Slug),
         new(p.Brand.Id, p.Brand.Name, p.Brand.Slug), p.ShortDescription, p.Description, p.MainImageUrl, p.IsActive, p.CreatedAtUtc, p.UpdatedAtUtc,
                attributes, summary);
        }).ToList();
    }
    private static object? Value(ProductAttributeValue v) => v.AttributeDefinition.DataType switch
    {
        AttributeDataType.Text => v.TextValue,
        AttributeDataType.Number => v.NumericValue,
        AttributeDataType.Boolean => v.BooleanValue,
        AttributeDataType.Date => v.DateValue,
        _ => null
    };
    public async Task<ProductResponse> GetAsync(long id, CancellationToken ct) =>
     (await MapAsync([await Details.SingleOrDefaultAsync(x => x.Id == id, ct) ?? throw ApiException.NotFound()], ct))[0];
    public async Task<List<ProductResponse>> GetManyAsync(long[] ids, CancellationToken ct)
    {
        var products = await MapAsync(await Details.Where(p => ids.Contains(p.Id)).ToListAsync(ct), ct);
        var byId = products.ToDictionary(p => p.Id);
        return ids.Where(byId.ContainsKey).Select(id => byId[id]).ToList();
    }
    public async Task<ProductResponse> BySlugAsync(string slug, CancellationToken ct) =>
     (await MapAsync([await Details.SingleOrDefaultAsync(x => x.Slug == slug, ct) ?? throw ApiException.NotFound()], ct))[0];
    public async Task<PagedResponse<ProductResponse>> ListAsync(long? categoryId, long? brandId, bool? isActive, int page, int pageSize, CancellationToken ct, string? search = null)
    {
        if (page < 1 || pageSize < 1 || pageSize > 100 || (long)(page - 1) * pageSize > int.MaxValue) throw ApiException.Invalid("page >= 1 ve pageSize 1–100 olmalıdır.");
        var q = Details;
        if (!string.IsNullOrWhiteSpace(search)) q = q.Where(x => x.Name.ToLower().Contains(search.Trim().ToLower()));
        if (categoryId.HasValue) q = q.Where(x => x.CategoryId == categoryId);
        if (brandId.HasValue) q = q.Where(x => x.BrandId == brandId);
        if (isActive.HasValue) q = q.Where(x => x.IsActive == isActive);
        var count = await q.CountAsync(ct);
        var items = await MapAsync(await q.OrderBy(x => x.Id).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(ct), ct);
        return new(items, page, pageSize, count, (int)Math.Ceiling(count / (double)pageSize));
    }
    public static List<string> ValidateAttributes(IReadOnlyCollection<ProductAttributeValueRequest> values, IReadOnlyCollection<CategoryAttribute> definitions)
    {
        var errors = new List<string>();
        if (values.Any(x => x is null)) return ["Özellik listesi null kayıt içeremez."];
        if (values.GroupBy(x => x.AttributeDefinitionId).Any(g => g.Count() > 1)) errors.Add("Aynı özellik birden fazla gönderilemez.");
        var rules = definitions.ToDictionary(x => x.AttributeDefinitionId);
        foreach (var v in values)
        {
            if (!rules.TryGetValue(v.AttributeDefinitionId, out var rule)) { errors.Add($"Özellik kategoriye ait değil: {v.AttributeDefinitionId}."); continue; }
            var count = (v.TextValue is null ? 0 : 1) + (v.NumericValue.HasValue ? 1 : 0) + (v.BooleanValue.HasValue ? 1 : 0) + (v.DateValue.HasValue ? 1 : 0);
            var valid = rule.AttributeDefinition.DataType switch
            {
                AttributeDataType.Text => !string.IsNullOrWhiteSpace(v.TextValue),
                AttributeDataType.Number => v.NumericValue.HasValue,
                AttributeDataType.Boolean => v.BooleanValue.HasValue,
                AttributeDataType.Date => v.DateValue.HasValue && v.DateValue.Value.Kind == DateTimeKind.Utc,
                _ => false
            };
            if (count != 1 || !valid) errors.Add($"{rule.AttributeDefinition.Name}: veri tipine uygun tek değer gereklidir; tarihler UTC (Z) olmalıdır.");
        }
        foreach (var r in definitions.Where(x => x.IsRequired))
            if (!values.Any(x => x.AttributeDefinitionId == r.AttributeDefinitionId)) errors.Add($"{r.AttributeDefinition.Name} alanı zorunludur.");
        return errors;
    }
    public async Task<ProductResponse> SaveAsync(long? id, CreateProductRequest r, CancellationToken ct)
    {
        await using var tx = await db.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable, ct);
        var p = id.HasValue ? await db.Products.Include(x => x.AttributeValues).SingleOrDefaultAsync(x => x.Id == id, ct) ?? throw ApiException.NotFound() : new Product();
        var categories = await db.Categories.AsNoTracking().ToDictionaryAsync(c => c.Id, ct);
        if (CategoryService.Path(r.CategoryId, categories).Any(c => !c.IsActive))
            throw ApiException.Invalid("Aktif bir kategori seçin.");
        if (categories.Values.Any(c => c.ParentCategoryId == r.CategoryId && c.IsActive))
            throw ApiException.Invalid("Ürün için en alt seviyedeki kategoriyi seçin.");
        if (!await db.Brands.AnyAsync(x => x.Id == r.BrandId, ct)) throw ApiException.Invalid("Marka bulunamadı.");
        var rules = await db.CategoryAttributes.Include(x => x.AttributeDefinition).Where(x => x.CategoryId == r.CategoryId).ToListAsync(ct);
        var errors = ValidateAttributes(r.Attributes, rules);
        if (errors.Count > 0) throw ApiException.Invalid(errors.ToArray());
        p.Slug = await slugs.CreateAsync<Product>(r.Name, 350, id, ct);
        p.Name = r.Name.Trim(); p.CategoryId = r.CategoryId; p.BrandId = r.BrandId; p.ModelCode = r.ModelCode;
        p.ShortDescription = r.ShortDescription; p.Description = r.Description;
        p.MainImageUrl = r.MainImageUrl; p.IsActive = r.IsActive; p.UpdatedAtUtc = DateTime.UtcNow;
        var incoming = r.Attributes.Select(x => x.AttributeDefinitionId).ToHashSet();
        foreach (var old in p.AttributeValues.Where(x => !incoming.Contains(x.AttributeDefinitionId)).ToList())
        { db.ProductAttributeValues.Remove(old); p.AttributeValues.Remove(old); }
        foreach (var v in r.Attributes)
        {
            var target = p.AttributeValues.SingleOrDefault(x => x.AttributeDefinitionId == v.AttributeDefinitionId);
            if (target is null) { target = new ProductAttributeValue { AttributeDefinitionId = v.AttributeDefinitionId }; p.AttributeValues.Add(target); }
            target.TextValue = v.TextValue; target.NumericValue = v.NumericValue; target.BooleanValue = v.BooleanValue; target.DateValue = v.DateValue;
        }
        if (!id.HasValue) db.Products.Add(p);
        await db.SaveChangesAsync(ct); await tx.CommitAsync(ct);
        return await GetAsync(p.Id, ct);
    }
    public async Task DeleteAsync(long id, CancellationToken ct)
    {
        var p = await db.Products.FindAsync([id], ct) ?? throw ApiException.NotFound();
        db.Products.Remove(p); await db.SaveChangesAsync(ct);
    }
}
