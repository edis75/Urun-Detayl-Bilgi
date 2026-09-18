using System.ComponentModel.DataAnnotations;
namespace ProductCompare.Api.DTOs.Products;

public class CreateProductRequest
{
    [Range(1, long.MaxValue)] public long CategoryId { get; set; }
    [Range(1, long.MaxValue)] public long BrandId { get; set; }
    [Required, MaxLength(300)] public string Name { get; set; } = "";
    [MaxLength(150)] public string? ModelCode { get; set; }
    [MaxLength(1000)] public string? ShortDescription { get; set; }
    public string? Description { get; set; }
    [Range(typeof(decimal), "0", "9999999999999999.99", ParseLimitsInInvariantCulture = true)] public decimal CurrentPrice { get; set; }
    [Required, RegularExpression("^[A-Z]{3}$")] public string Currency { get; set; } = "TRY";
    [MaxLength(2048), Url] public string? MainImageUrl { get; set; }
    public bool IsActive { get; set; } = true;
    [Required] public List<ProductAttributeValueRequest> Attributes { get; set; } = [];
}
public class UpdateProductRequest : CreateProductRequest { }
