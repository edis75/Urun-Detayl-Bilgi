namespace ProductCompare.Api.Entities;

public class ProductContent
{
    public long ProductId { get; set; }
    public Product Product { get; set; } = null!;
    public string ContentHtml { get; set; } = "";
    public string[] Pros { get; set; } = [];
    public string[] Cons { get; set; } = [];
}
