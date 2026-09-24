namespace ProductCompare.Api.Services;

public record R2UploadResult(string ObjectKey, string PublicUrl);

public interface IR2StorageService
{
    Task<R2UploadResult> UploadAsync(IFormFile file, string prefix, CancellationToken cancellationToken);
    Task DeleteAsync(string objectKey, CancellationToken cancellationToken);
}
