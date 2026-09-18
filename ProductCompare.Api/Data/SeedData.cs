using Microsoft.EntityFrameworkCore;
using ProductCompare.Api.Entities;
using ProductCompare.Api.Enums;
using ProductCompare.Api.Services;
using ProductCompare.Api.DTOs.Products;
namespace ProductCompare.Api.Data;

public static class SeedData
{
    public static async Task InitializeAsync(IServiceProvider services, CancellationToken ct = default)
    {
        var db = services.GetRequiredService<AppDbContext>();
        // Migrations are deliberately applied by the operator, not on every API startup.
        await using var tx = await db.Database.BeginTransactionAsync(ct);
        await db.Database.ExecuteSqlRawAsync("SELECT pg_advisory_xact_lock(7102401)", ct);
        async Task<Category> CategoryAsync(string name, string slug, long? parent)
        {
            var c = await db.Categories.SingleOrDefaultAsync(x => x.Slug == slug, ct);
            if (c is not null) return c;
            c = new Category { Name = name, Slug = slug, ParentCategoryId = parent }; db.Categories.Add(c); await db.SaveChangesAsync(ct); return c;
        }
        var root = await CategoryAsync("Elektronik", "elektronik", null);
        var phone = await CategoryAsync("Telefon", "telefon", root.Id);
        var laptop = await CategoryAsync("Laptop", "laptop", root.Id);
        foreach (var name in new[] { "Apple", "Samsung", "Xiaomi", "Lenovo", "Asus" })
        {
            var slug = SlugService.Normalize(name);
            if (!await db.Brands.AnyAsync(x => x.Slug == slug, ct)) db.Brands.Add(new Brand { Name = name, Slug = slug });
        }
        var specs = new (string Name, string Code, AttributeDataType Type, string? Unit)[] {
   ("RAM","ram",AttributeDataType.Number,"GB"),("Depolama","storage",AttributeDataType.Number,"GB"),
   ("Ekran Boyutu","screen_size",AttributeDataType.Number,"inch"),("Yenileme Hızı","refresh_rate",AttributeDataType.Number,"Hz"),
   ("Batarya Kapasitesi","battery_capacity",AttributeDataType.Number,"mAh"),("İşlemci","processor",AttributeDataType.Text,null),
   ("5G","has_5g",AttributeDataType.Boolean,null),("GPU","gpu",AttributeDataType.Text,null)
  };
        foreach (var s in specs)
            if (!await db.AttributeDefinitions.AnyAsync(x => x.Code == s.Code, ct))
                db.AttributeDefinitions.Add(new AttributeDefinition { Name = s.Name, Code = s.Code, DataType = s.Type, Unit = s.Unit });
        await db.SaveChangesAsync(ct);
        var attributes = await db.AttributeDefinitions.ToDictionaryAsync(x => x.Code, ct);
        foreach (var category in new[] { phone, laptop })
        {
            var codes = category.Id == phone.Id ? new[] { "ram", "storage", "screen_size", "refresh_rate", "battery_capacity", "processor", "has_5g" }
             : new[] { "ram", "storage", "screen_size", "refresh_rate", "processor", "gpu" };
            for (var i = 0; i < codes.Length; i++)
            {
                var a = attributes[codes[i]];
                if (!await db.CategoryAttributes.AnyAsync(x => x.CategoryId == category.Id && x.AttributeDefinitionId == a.Id, ct))
                    db.CategoryAttributes.Add(new CategoryAttribute
                    {
                        CategoryId = category.Id,
                        AttributeDefinitionId = a.Id,
                        IsRequired = codes[i] is "ram" or "storage" or "processor",
                        IsFilterable = true,
                        IsComparable = true,
                        DisplayOrder = i + 1
                    });
            }
        }
        await db.SaveChangesAsync(ct);
        var apple = await db.Brands.SingleAsync(x => x.Slug == "apple", ct);
        foreach (var generation in new[] { 14, 15 })
        {
            var name = $"Apple iPhone {generation} Pro 256 GB"; var slug = SlugService.Normalize(name);
            if (await db.Products.AnyAsync(x => x.Slug == slug, ct)) continue;
            var p = new Product
            {
                Name = name,
                Slug = slug,
                CategoryId = phone.Id,
                BrandId = apple.Id,
                ModelCode = generation == 14 ? "A2890" : null,
                CurrentPrice = generation == 14 ? 52999.90m : 64999.90m,
                Currency = "TRY",
                ShortDescription = "Development örnek ürünü; fiyat temsili."
            };
            void Number(string code, decimal value) => p.AttributeValues.Add(new ProductAttributeValue { AttributeDefinitionId = attributes[code].Id, NumericValue = value });
            Number("ram", generation == 14 ? 6 : 8); Number("storage", 256); Number("screen_size", 6.1m); Number("refresh_rate", 120);
            if (generation == 14) Number("battery_capacity", 3200);
            p.AttributeValues.Add(new ProductAttributeValue { AttributeDefinitionId = attributes["processor"].Id, TextValue = generation == 14 ? "Apple A16 Bionic" : "Apple A17 Pro" });
            p.AttributeValues.Add(new ProductAttributeValue { AttributeDefinitionId = attributes["has_5g"].Id, BooleanValue = true });
            var rules = await db.CategoryAttributes.Include(x => x.AttributeDefinition).Where(x => x.CategoryId == phone.Id).ToListAsync(ct);
            var values = p.AttributeValues.Select(x => new ProductAttributeValueRequest { AttributeDefinitionId = x.AttributeDefinitionId, TextValue = x.TextValue, NumericValue = x.NumericValue, BooleanValue = x.BooleanValue }).ToList();
            var errors = ProductService.ValidateAttributes(values, rules);
            if (errors.Count > 0) throw new InvalidOperationException("Seed verisi mevcut kategori tanımlarıyla uyumsuz: " + string.Join("; ", errors));
            db.Products.Add(p);
        }
        await db.SaveChangesAsync(ct); await tx.CommitAsync(ct);
    }
}
