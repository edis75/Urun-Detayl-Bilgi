using Microsoft.AspNetCore.Mvc;
using ProductCompare.Api.DTOs.Brands;
using ProductCompare.Api.Services;
namespace ProductCompare.Api.Controllers;

[ApiController, Route("api/brands")]
public class BrandsController(BrandService service) : ControllerBase
{
    [HttpGet] public async Task<IActionResult> List(CancellationToken ct) => Ok(await service.ListAsync(ct));
    [HttpGet("{id:long}")] public async Task<IActionResult> Get(long id, CancellationToken ct) => Ok(await service.GetAsync(id, ct));
    [HttpPost]
    public async Task<IActionResult> Create(CreateBrandRequest request, CancellationToken ct)
    { var result = await service.SaveAsync(null, request, ct); return CreatedAtAction(nameof(Get), new { id = result.Id }, result); }
    [HttpPut("{id:long}")] public async Task<IActionResult> Update(long id, UpdateBrandRequest request, CancellationToken ct) => Ok(await service.SaveAsync(id, request, ct));
    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Delete(long id, CancellationToken ct)
    { await service.DeleteAsync(id, ct); return NoContent(); }

}
