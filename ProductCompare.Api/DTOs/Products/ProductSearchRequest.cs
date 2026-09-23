namespace ProductCompare.Api.DTOs.Products;

public class ProductSearchRequest
{
    public string? Q { get; set; }
    public string? Sort { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
    public long? CategoryId { get; set; }
    public List<long> BrandIds { get; set; } = [];
    public bool? IsActive { get; set; }
    public Dictionary<string, string> Filters { get; set; } = [];
}
