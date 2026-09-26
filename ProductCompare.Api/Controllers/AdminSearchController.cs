using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProductCompare.Api.Search;

namespace ProductCompare.Api.Controllers;

[ApiController, Route("api/admin/search")]
public class AdminSearchController(ProductSearchReindexService service) : ControllerBase
{
    [Authorize(Roles = "Editor")]
    [HttpPost("reindex")]
    public async Task<IActionResult> Reindex(CancellationToken ct)
        => Ok(new { indexedCount = await service.ReindexAsync(ct) });

    [Authorize(Roles = "Editor")]
    [HttpPost("migrate-index")]
    public async Task<IActionResult> MigrateIndex(CancellationToken ct)
        => Ok(new { indexedCount = await service.MigrateIndexAsync(ct) });
}
