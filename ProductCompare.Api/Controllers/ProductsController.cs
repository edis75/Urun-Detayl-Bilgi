using Microsoft.AspNetCore.Mvc;
using ProductCompare.Api.DTOs.Products;
using ProductCompare.Api.Services;
namespace ProductCompare.Api.Controllers;

[ApiController, Route("api/products")]
public class ProductsController(ProductService service, ProductImageService images) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List(CancellationToken ct, long? categoryId = null, long? brandId = null, bool? isActive = null, int page = 1, int pageSize = 20, string? search = null)
     => Ok(await service.ListAsync(categoryId, brandId, isActive, page, pageSize, ct, search));
    [HttpGet("{id:long}")] public async Task<IActionResult> Get(long id, CancellationToken ct) => Ok(await service.GetAsync(id, ct));
    [HttpGet("by-slug/{slug}")] public async Task<IActionResult> BySlug(string slug, CancellationToken ct) => Ok(await service.BySlugAsync(slug, ct));
    [HttpPost]
    public async Task<IActionResult> Create(CreateProductRequest request, CancellationToken ct)
    { var result = await service.SaveAsync(null, request, ct); return CreatedAtAction(nameof(Get), new { id = result.Id }, result); }
    [HttpPut("{id:long}")] public async Task<IActionResult> Update(long id, UpdateProductRequest request, CancellationToken ct) => Ok(await service.SaveAsync(id, request, ct));
    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Delete(long id, CancellationToken ct)
    { await service.DeleteAsync(id, ct); return NoContent(); }

    [HttpPost("{productId:long}/images")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(105 * 1024 * 1024)]
    [RequestFormLimits(MultipartBodyLengthLimit = 105 * 1024 * 1024)]
    public async Task<IActionResult> UploadImages(long productId, [FromForm] UploadProductImagesRequest request, CancellationToken ct)
        => Ok(await images.UploadAsync(productId, request, ct));

    [HttpPut("{productId:long}/images/{imageId:long}/primary")]
    public async Task<IActionResult> SetPrimaryImage(long productId, long imageId, CancellationToken ct)
        => Ok(await images.SetPrimaryAsync(productId, imageId, ct));

    [HttpDelete("{productId:long}/images/{imageId:long}")]
    public async Task<IActionResult> DeleteImage(long productId, long imageId, CancellationToken ct)
        => Ok(await images.DeleteAsync(productId, imageId, ct));
}
