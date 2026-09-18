using ProductCompare.Api.Enums;
namespace ProductCompare.Api.Entities;

public class AttributeDefinition : CatalogEntity
{
    public string Name { get; set; } = "";
    public string Code { get; set; } = "";
    public AttributeDataType DataType { get; set; }
    public string? Unit { get; set; }
    public string? Description { get; set; }
}
