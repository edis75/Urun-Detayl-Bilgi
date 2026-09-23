using ProductCompare.Api.Enums;
namespace ProductCompare.Api.DTOs.Products;

public record ComparisonProductResponse(long Id, string Name, string Slug, string BrandName, string? MainImageUrl);
public record ComparisonValueResponse(long ProductId, string Value);
public record ComparisonAttributeResponse(long AttributeId, string Name, string Code, string? Unit, AttributeDataType DataType, int DisplayOrder, IReadOnlyList<ComparisonValueResponse> Values);
public record ComparisonResponse(CatalogReference Category, IReadOnlyList<ComparisonProductResponse> Products, IReadOnlyList<ComparisonAttributeResponse> Attributes);
