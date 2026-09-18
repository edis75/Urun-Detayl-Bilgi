using ProductCompare.Api.Enums;
namespace ProductCompare.Api.DTOs.Brands;

public record BrandResponse(long Id, string Name, string Slug, bool IsActive, DateTime CreatedAtUtc, DateTime UpdatedAtUtc);
