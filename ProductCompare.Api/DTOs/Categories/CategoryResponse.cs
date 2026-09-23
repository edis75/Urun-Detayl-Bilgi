using ProductCompare.Api.Enums;
namespace ProductCompare.Api.DTOs.Categories;

public record CategoryResponse(long Id, string Name, string Slug, long? ParentCategoryId, bool IsActive, int DisplayOrder, DateTime CreatedAtUtc, DateTime UpdatedAtUtc)
{
    public string PathName { get; init; } = Name;
    public bool IsSelectable { get; init; }
}

public record CategoryNode(long Id, string Name, string Slug, IReadOnlyList<CategoryNode> Children);
public record CategoryDetail(long Id, string Name, string Slug, CategoryResponse? Parent,
    IReadOnlyList<CategoryResponse> Children, IReadOnlyList<CategoryResponse> Breadcrumb);
