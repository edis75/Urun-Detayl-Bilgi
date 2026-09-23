using System.Globalization;
using Microsoft.EntityFrameworkCore;
using ProductCompare.Api.Data;
using ProductCompare.Api.DTOs.Products;
using ProductCompare.Api.Entities;
using ProductCompare.Api.Enums;
namespace ProductCompare.Api.Services;

public class ComparisonService(AppDbContext db)
{
    public async Task<ComparisonResponse> GetAsync(string? productIds, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(productIds)) throw ApiException.Invalid("En az bir ürün ID değeri gereklidir.");
        var ids = new List<long>();
        foreach (var token in productIds.Split(','))
        {
            if (!long.TryParse(token.Trim(), NumberStyles.None, CultureInfo.InvariantCulture, out var id) || id <= 0)
                throw ApiException.Invalid("Ürün ID değerleri pozitif tam sayı olmalıdır.");
            if (!ids.Contains(id)) ids.Add(id);
            if (ids.Count > 4) throw ApiException.Invalid("En fazla 4 ürün karşılaştırılabilir.");
        }
        var products = await db.Products.AsNoTracking().Where(p => ids.Contains(p.Id))
            .Select(p => new { Category = new CatalogReference(p.Category.Id, p.Category.Name, p.Category.Slug),
                Product = new ComparisonProductResponse(p.Id, p.Name, p.Slug, p.Brand.Name, p.MainImageUrl) })
            .ToListAsync(ct);
        if (products.Count != ids.Count) throw new ApiException(404, "Seçilen ürünlerden biri bulunamadı.");
        if (products.Select(p => p.Category.Id).Distinct().Count() != 1)
            throw new ApiException(400, "Yalnızca aynı kategorideki ürünler karşılaştırılabilir.");
        var category = products[0].Category;
        var attributes = await db.CategoryAttributes.AsNoTracking().Where(a => a.CategoryId == category.Id && a.IsComparable)
            .OrderBy(a => a.DisplayOrder).ThenBy(a => a.AttributeDefinitionId)
            .Select(a => new { Id = a.AttributeDefinitionId, a.AttributeDefinition.Name, a.AttributeDefinition.Code,
                a.AttributeDefinition.Unit, a.AttributeDefinition.DataType, a.DisplayOrder }).ToListAsync(ct);
        var attributeIds = attributes.Select(a => a.Id).ToArray();
        var values = await db.ProductAttributeValues.AsNoTracking()
            .Where(v => ids.Contains(v.ProductId) && attributeIds.Contains(v.AttributeDefinitionId))
            .ToDictionaryAsync(v => new { v.ProductId, v.AttributeDefinitionId }, ct);
        return new(category, ids.Select(id => products.Single(p => p.Product.Id == id).Product).ToList(),
            attributes.Select(a => new ComparisonAttributeResponse(a.Id, a.Name, a.Code, a.Unit, a.DataType, a.DisplayOrder,
                ids.Select(id => new ComparisonValueResponse(id, Format(values.GetValueOrDefault(new { ProductId = id, AttributeDefinitionId = a.Id }), a.DataType, a.Unit))).ToList())).ToList());
    }

    private static string Format(ProductAttributeValue? value, AttributeDataType type, string? unit)
    {
        var text = type switch
        {
            AttributeDataType.Number => value?.NumericValue?.ToString("0.############################", CultureInfo.GetCultureInfo("tr-TR")),
            AttributeDataType.Text => value?.TextValue,
            AttributeDataType.Boolean => value?.BooleanValue is bool b ? b ? "Var" : "Yok" : null,
            AttributeDataType.Date => value?.DateValue?.ToString("dd.MM.yyyy", CultureInfo.InvariantCulture),
            _ => null
        };
        return text is null ? "—" : text + (type == AttributeDataType.Number && !string.IsNullOrWhiteSpace(unit) ? " " + unit : "");
    }
}
