namespace ProductCompare.Api.DTOs.Products;

public record ProductSearchItemDto(long Id, string Name, long BrandId, string BrandName,
    long CategoryId, string CategoryName, double? Score);

// Elasticsearch total hits is Int64; the existing PagedResponse uses Int32 totals.
public record ProductSearchResponseDto(long Total, int Page, int PageSize,
    IReadOnlyList<ProductSearchItemDto> Items, ProductSearchFacets Facets,
    Categories.CategoryResponse? CategoryContext = null,
    IReadOnlyList<ProductResponse>? Products = null);

public record ProductSearchFacets(IReadOnlyList<BrandSearchFacet> Brands,
    IReadOnlyList<AttributeSearchFacet> Attributes,
    IReadOnlyList<CategorySearchFacet> Categories, IReadOnlyList<CategorySearchFacet> Children);
public record CategorySearchFacet(long Id, string Name, string Slug, long Count);
public record BrandSearchFacet(long Id, string Name, long Count);
public record AttributeSearchFacet(string Code, string Name, string? Unit,
    ProductCompare.Api.Enums.AttributeDataType DataType, int DisplayOrder, IReadOnlyList<SearchFacetValue> Values);
public record SearchFacetValue(object Value, long Count);
public record ProductSuggestionDto(long Id, string Name, string BrandName, string CategoryName);
