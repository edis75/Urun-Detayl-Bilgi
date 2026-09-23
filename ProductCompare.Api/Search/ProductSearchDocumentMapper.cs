using System.Linq.Expressions;
using ProductCompare.Api.Entities;

namespace ProductCompare.Api.Search;

public static class ProductSearchDocumentMapper
{
    public static void ApplyCategoryPaths(IEnumerable<ProductSearchDocument> documents,
        IReadOnlyDictionary<long, Category> categories)
    {
        var paths = categories.Keys.ToDictionary(id => id, id => Services.CategoryService.Path(id, categories));
        foreach (var document in documents)
        {
            var path = paths[document.CategoryId];
            document.CategoryPathIds = path.Select(c => c.Id).ToList();
            document.CategoryPathNames = path.Select(c => c.Name).ToList();
            document.CategoryPathSlugs = path.Select(c => c.Slug).ToList();
            document.IsActive &= path.All(c => c.IsActive);
        }
    }
    // EF translates this projection, including related data, without per-product queries.
    public static Expression<Func<Product, ProductSearchDocument>> Projection { get; } = p => new ProductSearchDocument
    {
        Id = p.Id,
        Name = p.Name,
        Description = p.Description,
        BrandId = p.BrandId,
        BrandName = p.Brand.Name,
        CategoryId = p.CategoryId,
        CategoryName = p.Category.Name,
        IsActive = p.IsActive,
        Attributes = p.AttributeValues.OrderBy(v => v.AttributeDefinitionId).Select(v => new ProductSearchAttribute
        {
            Code = v.AttributeDefinition.Code,
            Name = v.AttributeDefinition.Name,
            Unit = v.AttributeDefinition.Unit,
            NumericValue = v.NumericValue,
            TextValue = v.TextValue,
            BooleanValue = v.BooleanValue,
            DateValue = v.DateValue
        }).ToList()
    };
}
