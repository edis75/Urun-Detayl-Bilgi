using ProductCompare.Api.Enums;
namespace ProductCompare.Api.DTOs.Categories;

public record CategoryResponse(long Id, string Name, string Slug, long? ParentCategoryId, bool IsActive, int DisplayOrder, DateTime CreatedAtUtc, DateTime UpdatedAtUtc);
