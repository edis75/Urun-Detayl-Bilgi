using ProductCompare.Api.Enums;
namespace ProductCompare.Api.DTOs.Products;

public record CatalogReference(long Id, string Name, string Slug);
public record TechnicalAttributeResponse(long AttributeId, string Name, string Code, AttributeDataType DataType, object? Value, string? Unit);
public record ProductResponse(long Id, string Name, string Slug, string? ModelCode, CatalogReference Category, CatalogReference Brand,
 string? ShortDescription, string? Description, decimal CurrentPrice, string Currency, string? MainImageUrl, bool IsActive,
 DateTime CreatedAtUtc, DateTime UpdatedAtUtc, IReadOnlyList<TechnicalAttributeResponse> Attributes);
public record PagedResponse<T>(IReadOnlyList<T> Items, int Page, int PageSize, int TotalCount, int TotalPages);
