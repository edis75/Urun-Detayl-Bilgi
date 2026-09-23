namespace ProductCompare.Api.Search;

public class ProductSearchDocument
{
    public long Id { get; set; }
    public string Name { get; set; } = "";
    public string? Description { get; set; }
    public long BrandId { get; set; }
    public string BrandName { get; set; } = "";
    public long CategoryId { get; set; }
    public string CategoryName { get; set; } = "";
    public List<long> CategoryPathIds { get; set; } = [];
    public List<string> CategoryPathNames { get; set; } = [];
    public List<string> CategoryPathSlugs { get; set; } = [];
    public bool IsActive { get; set; }
    public List<ProductSearchAttribute> Attributes { get; set; } = [];
}

public class ProductSearchAttribute
{
    public string Code { get; set; } = "";
    public string Name { get; set; } = "";
    public string? Unit { get; set; }
    public decimal? NumericValue { get; set; }
    public string? TextValue { get; set; }
    public bool? BooleanValue { get; set; }
    public DateTime? DateValue { get; set; }
}
