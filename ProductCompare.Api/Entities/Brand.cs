namespace ProductCompare.Api.Entities;

public class Brand : CatalogEntity
{
    public string Name { get; set; } = "";
    public string Slug { get; set; } = "";
    public bool IsActive { get; set; } = true;
}
