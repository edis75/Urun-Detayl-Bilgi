using System.ComponentModel.DataAnnotations;
namespace ProductCompare.Api.DTOs.Products;

public class ProductAttributeValueRequest
{
    [Range(1, long.MaxValue)] public long AttributeDefinitionId { get; set; }
    public string? TextValue { get; set; }
    public decimal? NumericValue { get; set; }
    public bool? BooleanValue { get; set; }
    public DateTime? DateValue { get; set; }
}
