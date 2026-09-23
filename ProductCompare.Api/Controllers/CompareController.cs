using Microsoft.AspNetCore.Mvc;
using ProductCompare.Api.Services;
namespace ProductCompare.Api.Controllers;

[ApiController, Route("api/compare")]
public class CompareController(ComparisonService service) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken ct, string? productIds = null)
        => Ok(await service.GetAsync(productIds, ct));
}
