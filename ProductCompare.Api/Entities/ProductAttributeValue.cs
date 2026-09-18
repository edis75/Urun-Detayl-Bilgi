namespace ProductCompare.Api.Entities;

public class ProductAttributeValue
{
    public long ProductId { get; set; }
    public Product Product { get; set; } = null!;
    public long AttributeDefinitionId { get; set; }
    public AttributeDefinition AttributeDefinition { get; set; } = null!;
    public string? TextValue { get; set; }
    public decimal? NumericValue { get; set; }
    public bool? BooleanValue { get; set; }
    public DateTime? DateValue { get; set; }
}
