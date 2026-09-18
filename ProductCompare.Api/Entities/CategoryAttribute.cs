namespace ProductCompare.Api.Entities;

public class CategoryAttribute
{
    public long CategoryId { get; set; }
    public Category Category { get; set; } = null!;
    public long AttributeDefinitionId { get; set; }
    public AttributeDefinition AttributeDefinition { get; set; } = null!;
    public bool IsRequired { get; set; }
    public bool IsFilterable { get; set; }
    public bool IsComparable { get; set; }
    public int DisplayOrder { get; set; }
}
