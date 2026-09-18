namespace ProductCompare.Api.Entities;

public abstract class CatalogEntity
{
    public long Id { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime UpdatedAtUtc { get; set; }
}
