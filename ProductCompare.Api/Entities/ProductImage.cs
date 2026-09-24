namespace ProductCompare.Api.Entities;

public class ProductImage
{
    public long Id { get; set; }
    public long ProductId { get; set; }
    public Product Product { get; set; } = null!;
    public string ImageUrl { get; set; } = "";
    public string ObjectKey { get; set; } = "";
    public bool IsPrimary { get; set; }
    public int SortOrder { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}
