using Amazon.Runtime;
using Amazon.S3;
using Amazon.S3.Model;
using System.Text.RegularExpressions;

namespace ProductCompare.Api.Services;

public sealed class R2StorageService(IConfiguration configuration, ILogger<R2StorageService> logger) : IR2StorageService, IDisposable
{
    public const long MaxFileSize = 10 * 1024 * 1024;
    private AmazonS3Client? client;
    private string Bucket => configuration["R2:Bucket"]!;

    private AmazonS3Client Client
    {
        get
        {
            if (client is not null) return client;
            var keys = new[] { "AccessKey", "SecretKey", "AccountId", "Bucket", "PublicBaseUrl" };
            if (keys.Any(key => string.IsNullOrWhiteSpace(configuration["R2:" + key])))
                throw new ApiException(503, "Görsel depolama henüz yapılandırılmadı. R2 ayarlarını tamamlayın.");
            if (!Regex.IsMatch(configuration["R2:AccountId"]!, "^[a-fA-F0-9]{32}$") ||
                !Uri.TryCreate(configuration["R2:PublicBaseUrl"], UriKind.Absolute, out var publicUri) ||
                publicUri.Scheme != "https" || !string.IsNullOrEmpty(publicUri.Query) || !string.IsNullOrEmpty(publicUri.Fragment))
                throw new ApiException(503, "R2 AccountId veya PublicBaseUrl ayarı geçersiz.");
            client = new AmazonS3Client(configuration["R2:AccessKey"], configuration["R2:SecretKey"], new AmazonS3Config
            {
                ServiceURL = $"https://{configuration["R2:AccountId"]}.r2.cloudflarestorage.com",
                AuthenticationRegion = "auto", ForcePathStyle = true,
                RequestChecksumCalculation = RequestChecksumCalculation.WHEN_REQUIRED,
                ResponseChecksumValidation = ResponseChecksumValidation.WHEN_REQUIRED
            });
            return client;
        }
    }

    public static string NormalizeObjectKey(string objectKey)
    {
        var key = objectKey.Trim().Trim('/');
        if (string.IsNullOrEmpty(key) || key.Split('/').Any(segment => segment is "" or "." or ".." || !Regex.IsMatch(segment, "^[a-zA-Z0-9._-]+$")))
            throw ApiException.Invalid("Geçersiz görsel yolu.");
        return key;
    }

    public async Task<R2UploadResult> UploadAsync(IFormFile file, string prefix, CancellationToken cancellationToken)
    {
        if (file.Length <= 0 || file.Length > MaxFileSize) throw ApiException.Invalid("Her görsel 1 bayt ile 10 MB arasında olmalıdır.");
        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        var contentType = extension switch
        {
            ".jpg" or ".jpeg" => "image/jpeg", ".png" => "image/png", ".webp" => "image/webp",
            _ => throw ApiException.Invalid("Yalnızca JPG, JPEG, PNG ve WebP görselleri yüklenebilir.")
        };
        await using var stream = new MemoryStream();
        await file.CopyToAsync(stream, cancellationToken);
        var header = stream.GetBuffer();
        var valid = extension switch
        {
            ".jpg" or ".jpeg" => stream.Length >= 3 && header[0] == 0xff && header[1] == 0xd8 && header[2] == 0xff,
            ".png" => stream.Length >= 8 && header.AsSpan(0, 8).SequenceEqual(new byte[] { 137, 80, 78, 71, 13, 10, 26, 10 }),
            ".webp" => stream.Length >= 12 && header.AsSpan(0, 4).SequenceEqual("RIFF"u8) && header.AsSpan(8, 4).SequenceEqual("WEBP"u8),
            _ => false
        };
        if (!valid || stream.Length > MaxFileSize) throw ApiException.Invalid("Dosya içeriği geçerli bir JPG, PNG veya WebP görseli değil.");
        stream.Position = 0;
        var key = NormalizeObjectKey($"{NormalizeObjectKey(prefix)}/{Guid.NewGuid():N}{extension}");
        var s3 = Client;
        try
        {
            await s3.PutObjectAsync(new PutObjectRequest
            {
                BucketName = Bucket, Key = key, InputStream = stream, ContentType = contentType,
                AutoCloseStream = false, DisablePayloadSigning = true, DisableDefaultChecksumValidation = true
            }, cancellationToken);
        }
        catch (Exception error)
        {
            // A timed-out PUT may still have reached R2. Its GUID key is safe to clean up.
            using var cleanup = new CancellationTokenSource(TimeSpan.FromSeconds(15));
            try { await DeleteAsync(key, cleanup.Token); }
            catch (Exception cleanupError) { logger.LogError(cleanupError, "R2 upload cleanup failed for {ObjectKey}", key); }
            if (error is OperationCanceledException) throw;
            logger.LogError(error, "R2 upload failed");
            throw new ApiException(503, "Görsel yüklenemedi. Lütfen tekrar deneyin.");
        }
        return new(key, configuration["R2:PublicBaseUrl"]!.TrimEnd('/') + "/" + key);
    }

    public async Task DeleteAsync(string objectKey, CancellationToken cancellationToken)
    {
        var key = NormalizeObjectKey(objectKey);
        try { await Client.DeleteObjectAsync(new DeleteObjectRequest { BucketName = Bucket, Key = key }, cancellationToken); }
        catch (AmazonS3Exception error)
        {
            logger.LogError(error, "R2 delete failed for {ObjectKey}", key);
            throw new ApiException(503, "Görsel depolamadan silinemedi. Lütfen tekrar deneyin.");
        }
    }

    public void Dispose() => client?.Dispose();
}
