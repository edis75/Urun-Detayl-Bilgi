using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProductCompare.Api.DTOs.Categories;
using ProductCompare.Api.Services;
namespace ProductCompare.Api.Controllers;

[ApiController, Route("api/categories")]
public class CategoriesController(CategoryService service) : ControllerBase
{
    [HttpGet("tree")] public async Task<IActionResult> Tree(CancellationToken ct) => Ok(await service.TreeAsync(ct));
    [HttpGet("by-slug/{slug}")] public async Task<IActionResult> BySlug(string slug, CancellationToken ct) => Ok(await service.BySlugAsync(slug, ct));
    [HttpGet] public async Task<IActionResult> List(CancellationToken ct) => Ok(await service.ListAsync(ct));
    [HttpGet("{id:long}")] public async Task<IActionResult> Get(long id, CancellationToken ct) => Ok(await service.GetAsync(id, ct));
    [Authorize(Roles = "Editor")]
    [HttpPost]
    public async Task<IActionResult> Create(CreateCategoryRequest request, CancellationToken ct)
    { var result = await service.SaveAsync(null, request, ct); return CreatedAtAction(nameof(Get), new { id = result.Id }, result); }
    [Authorize(Roles = "Editor")]
    [HttpPut("{id:long}")] public async Task<IActionResult> Update(long id, UpdateCategoryRequest request, CancellationToken ct) => Ok(await service.SaveAsync(id, request, ct));
    [Authorize(Roles = "Editor")]
    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Delete(long id, CancellationToken ct)
    { await service.DeleteAsync(id, ct); return NoContent(); }

    [HttpGet("{id:long}/attributes")] public async Task<IActionResult> Attributes(long id, CancellationToken ct) => Ok(await service.AttributesAsync(id, ct));
    [Authorize(Roles = "Editor")]
    [HttpPost("{id:long}/attributes")]
    public async Task<IActionResult> Assign(long id, CategoryAttributeRequest request, CancellationToken ct)
    { var result = await service.AssignAsync(id, request, ct); return CreatedAtAction(nameof(Attributes), new { id }, result); }
    [Authorize(Roles = "Editor")]
    [HttpDelete("{id:long}/attributes/{attributeId:long}")]
    public async Task<IActionResult> Unassign(long id, long attributeId, CancellationToken ct)
    { await service.UnassignAsync(id, attributeId, ct); return NoContent(); }

}
