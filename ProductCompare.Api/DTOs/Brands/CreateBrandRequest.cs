using System.ComponentModel.DataAnnotations;
using ProductCompare.Api.Enums;
namespace ProductCompare.Api.DTOs.Brands;

public class CreateBrandRequest
{
    [Required, MaxLength(150)] public string Name { get; set; } = "";
    public bool IsActive { get; set; } = true;
}

