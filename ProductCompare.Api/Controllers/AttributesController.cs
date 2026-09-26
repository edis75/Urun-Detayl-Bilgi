using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProductCompare.Api.DTOs.Attributes;
using ProductCompare.Api.Services;
namespace ProductCompare.Api.Controllers;

[ApiController, Route("api/attributes")]
public class AttributesController(AttributeService service) : ControllerBase
{
    [HttpGet] public async Task<IActionResult> List(CancellationToken ct) => Ok(await service.ListAsync(ct));
    [HttpGet("{id:long}")] public async Task<IActionResult> Get(long id, CancellationToken ct) => Ok(await service.GetAsync(id, ct));
    [Authorize(Roles = "Editor")]
    [HttpPost]
    public async Task<IActionResult> Create(CreateAttributeRequest request, CancellationToken ct)
    { var result = await service.SaveAsync(null, request, ct); return CreatedAtAction(nameof(Get), new { id = result.Id }, result); }
    [Authorize(Roles = "Editor")]
    [HttpPut("{id:long}")] public async Task<IActionResult> Update(long id, UpdateAttributeRequest request, CancellationToken ct) => Ok(await service.SaveAsync(id, request, ct));
    [Authorize(Roles = "Editor")]
    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Delete(long id, CancellationToken ct)
    { await service.DeleteAsync(id, ct); return NoContent(); }

}
