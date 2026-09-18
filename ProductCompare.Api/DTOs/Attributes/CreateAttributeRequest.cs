using System.ComponentModel.DataAnnotations;
using ProductCompare.Api.Enums;
namespace ProductCompare.Api.DTOs.Attributes;

public class CreateAttributeRequest
{
    [Required, MaxLength(150)] public string Name { get; set; } = "";
    [Required, MaxLength(150), RegularExpression("^[a-z][a-z0-9_]*$")] public string Code { get; set; } = "";
    [EnumDataType(typeof(AttributeDataType))] public AttributeDataType DataType { get; set; }
    [MaxLength(50)] public string? Unit { get; set; }
    [MaxLength(500)] public string? Description { get; set; }
}

