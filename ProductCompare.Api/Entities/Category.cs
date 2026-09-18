namespace ProductCompare.Api.Entities;

public class Category : CatalogEntity
{
    public string Name { get; set; } = "";
    public string Slug { get; set; } = "";
    public long? ParentCategoryId { get; set; }
    public Category? ParentCategory { get; set; }
    public ICollection<Category> Children { get; set; } = new List<Category>();
    public bool IsActive { get; set; } = true;
    public int DisplayOrder { get; set; }
}
