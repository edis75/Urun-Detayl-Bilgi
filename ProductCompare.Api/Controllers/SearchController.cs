using Microsoft.AspNetCore.Mvc;
using ProductCompare.Api.Search;
using ProductCompare.Api.DTOs.Products;

namespace ProductCompare.Api.Controllers;

[ApiController, Route("api/search")]
public class SearchController(ProductSearchService service) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Search([FromQuery] ProductSearchRequest request, CancellationToken ct)
        => Ok(await service.SearchAsync(request, ct));

    [HttpGet("suggestions")]
    public async Task<IActionResult> Suggestions(CancellationToken ct, string? q = null)
        => Ok(await service.SuggestionsAsync(q, ct));
}
