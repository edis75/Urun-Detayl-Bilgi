namespace ProductCompare.Api.DTOs.Products;

public record ProductImageResponse(long Id, string ImageUrl, bool IsPrimary, int SortOrder);

public class UploadProductImagesRequest
{
    public List<IFormFile> Files { get; set; } = [];
    public int? PrimaryImageIndex { get; set; }
}
