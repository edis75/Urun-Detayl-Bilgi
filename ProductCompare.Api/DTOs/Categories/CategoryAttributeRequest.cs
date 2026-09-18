using System.ComponentModel.DataAnnotations;
using ProductCompare.Api.DTOs.Attributes;
namespace ProductCompare.Api.DTOs.Categories;

public class CategoryAttributeRequest
{
    [Range(1, long.MaxValue)] public long AttributeDefinitionId { get; set; }
    public bool IsRequired { get; set; }
    public bool IsFilterable { get; set; }
    public bool IsComparable { get; set; }
    public int DisplayOrder { get; set; }
}
public record CategoryAttributeResponse(AttributeResponse Attribute, bool IsRequired, bool IsFilterable, bool IsComparable, int DisplayOrder);
