using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using ProductCompare.Api.Data;
using ProductCompare.Api.DTOs.Products;
using ProductCompare.Api.Entities;
using ProductCompare.Api.Services;
using System.Text.Json;

static void Check(bool value, string message) { if (!value) throw new Exception(message); }
static async Task Reject(Func<Task> operation, int status)
{
    try { await operation(); throw new Exception("Expected rejection"); }
    catch (ApiException error) { Check(error.StatusCode == status, $"Expected {status}, got {error.StatusCode}"); }
}
static IFormFile File(string name, byte[] data) => new FormFile(new MemoryStream(data), 0, data.Length, "Files", name);

using var storage = new R2StorageService(new ConfigurationBuilder().Build(), NullLogger<R2StorageService>.Instance);
await Reject(() => storage.UploadAsync(File("bad.svg", "<svg/>"u8.ToArray()), "products/25", default), 400);
await Reject(() => storage.UploadAsync(File("bad.png", "<script>evil</script>"u8.ToArray()), "products/25", default), 400);
await Reject(() => storage.UploadAsync(File("empty.jpg", []), "products/25", default), 400);
var oversized = new FormFile(Stream.Null, 0, R2StorageService.MaxFileSize + 1, "Files", "large.jpg");
await Reject(() => storage.UploadAsync(oversized, "products/25", default), 400);
// Valid image signatures reach the configuration check without contacting a network.
await Reject(() => storage.UploadAsync(File("photo.jpg", [255,216,255,224]), "products/25", default), 503);
await Reject(() => storage.UploadAsync(File("photo.jpeg", [255,216,255,224]), "products/25", default), 503);
await Reject(() => storage.UploadAsync(File("photo.png", [137,80,78,71,13,10,26,10]), "products/25", default), 503);
await Reject(() => storage.UploadAsync(File("photo.webp", "RIFF1234WEBP"u8.ToArray()), "products/25", default), 503);
Check(R2StorageService.NormalizeObjectKey("/products/25/photo.webp/") == "products/25/photo.webp", "Key normalization");
foreach (var key in new[] { "../secret", "products//25", "https://host/image.png", "products\\25\\image.png" })
    await Reject(() => { R2StorageService.NormalizeObjectKey(key); return Task.CompletedTask; }, 400);

using var db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseNpgsql("Host=localhost;Database=unused").Options);
var entity = db.Model.FindEntityType(typeof(ProductImage))!;
var primaryIndex = entity.GetIndexes().Single(x => x.IsUnique && x.Properties.Single().Name == "ProductId");
Check(primaryIndex.GetFilter() == "\"IsPrimary\" = TRUE", "Partial unique primary index");
Check(entity.GetForeignKeys().Single().DeleteBehavior == DeleteBehavior.Cascade, "Image cascade deletion");
var script = db.Database.GenerateCreateScript();
Check(script.Contains("WHERE \"IsPrimary\" = TRUE"), "PostgreSQL primary constraint SQL");
var dto = JsonSerializer.Serialize(new ProductImageResponse(1, "https://cdn.example/image.png", true, 0), new JsonSerializerOptions(JsonSerializerDefaults.Web));
Check(!dto.Contains("objectKey", StringComparison.OrdinalIgnoreCase), "Internal object key leaked");
var imageService = new ProductImageService(db, storage, NullLogger<ProductImageService>.Instance);
await Reject(() => imageService.UploadAsync(25, new(), default), 400);
await Reject(() => imageService.UploadAsync(25, new() { Files = [File("photo.jpg", [255,216,255])], PrimaryImageIndex = 1 }, default), 400);
Console.WriteLine("PASS: image formats/signatures/size, blank R2 config, key safety, primary unique constraint, cascade and public DTO. No database or R2 connection made.");
