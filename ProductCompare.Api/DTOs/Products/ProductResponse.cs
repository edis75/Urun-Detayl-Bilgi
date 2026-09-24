using ProductCompare.Api.Enums;
namespace ProductCompare.Api.DTOs.Products;

public record CatalogReference(long Id, string Name, string Slug);
public record TechnicalAttributeResponse(long AttributeId, string Name, string Code, AttributeDataType DataType, object? Value, string? Unit);
public record ProductResponse(long Id, string Name, string Slug, string? ModelCode, CatalogReference Category, CatalogReference Brand,
 string? ShortDescription, string? Description, string? MainImageUrl, bool IsActive,
 DateTime CreatedAtUtc, DateTime UpdatedAtUtc, IReadOnlyList<TechnicalAttributeResponse> Attributes,
 IReadOnlyList<TechnicalAttributeResponse> SummaryAttributes);

public record ProductDetailResponse : ProductResponse
{
    public string ContentHtml { get; init; }
    public IReadOnlyList<string> Pros { get; init; }
    public IReadOnlyList<string> Cons { get; init; }
    public IReadOnlyList<ProductImageResponse> Images { get; init; } = [];

    public ProductDetailResponse(ProductResponse product, string contentHtml, IReadOnlyList<string> pros, IReadOnlyList<string> cons)
        : base(product.Id, product.Name, product.Slug, product.ModelCode, product.Category, product.Brand,
            product.ShortDescription, product.Description, product.MainImageUrl, product.IsActive,
            product.CreatedAtUtc, product.UpdatedAtUtc, product.Attributes, product.SummaryAttributes)
    {
        ContentHtml = contentHtml; Pros = pros; Cons = cons;
    }
}
public record PagedResponse<T>(IReadOnlyList<T> Items, int Page, int PageSize, int TotalCount, int TotalPages);
