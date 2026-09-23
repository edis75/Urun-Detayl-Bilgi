using System.ComponentModel.DataAnnotations;
using ProductCompare.Api.Enums;
namespace ProductCompare.Api.DTOs.Categories;

public class CreateCategoryRequest
{
    [Required, MaxLength(200)] public string Name { get; set; } = "";
    [MaxLength(250)] public string? Slug { get; set; }
    public long? ParentCategoryId { get; set; }
    public bool IsActive { get; set; } = true;
    public int DisplayOrder { get; set; }
}
