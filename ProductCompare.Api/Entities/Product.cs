namespace ProductCompare.Api.Entities;

public class Product : CatalogEntity
{
    public long CategoryId { get; set; }
    public Category Category { get; set; } = null!;
    public long BrandId { get; set; }
    public Brand Brand { get; set; } = null!;
    public string Name { get; set; } = "";
    public string Slug { get; set; } = "";
    public string? ModelCode { get; set; }
    public string? ShortDescription { get; set; }
    public string? Description { get; set; }
    public string? MainImageUrl { get; set; }
    public bool IsActive { get; set; } = true;
    public ICollection<ProductAttributeValue> AttributeValues { get; set; } = new List<ProductAttributeValue>();
}
