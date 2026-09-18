using Microsoft.EntityFrameworkCore;
using ProductCompare.Api.Data;
using ProductCompare.Api.DTOs.Attributes;
using ProductCompare.Api.Entities;
namespace ProductCompare.Api.Services;

public class AttributeService(AppDbContext db)
{
    public static AttributeResponse Map(AttributeDefinition a) => new(a.Id, a.Name, a.Code, a.DataType, a.Unit, a.Description, a.CreatedAtUtc, a.UpdatedAtUtc);
    public async Task<List<AttributeResponse>> ListAsync(CancellationToken ct) => (await db.AttributeDefinitions.AsNoTracking().OrderBy(x => x.Name).ToListAsync(ct)).Select(Map).ToList();
    public async Task<AttributeResponse> GetAsync(long id, CancellationToken ct) => Map(await db.AttributeDefinitions.AsNoTracking().SingleOrDefaultAsync(x => x.Id == id, ct) ?? throw ApiException.NotFound());
    public async Task<AttributeResponse> SaveAsync(long? id, CreateAttributeRequest r, CancellationToken ct)
    {
        await using var tx = await db.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable, ct);
        var a = id.HasValue ? await db.AttributeDefinitions.FindAsync([id.Value], ct) ?? throw ApiException.NotFound() : new AttributeDefinition();
        if (id.HasValue && a.Code != r.Code) throw ApiException.Conflict("Code sabit kimliktir; değiştirilemez.");
        if (id.HasValue && a.DataType != r.DataType && await db.ProductAttributeValues.AnyAsync(x => x.AttributeDefinitionId == id, ct))
            throw ApiException.Conflict("Kullanılan özelliğin veri tipi değiştirilemez.");
        if (await db.AttributeDefinitions.AnyAsync(x => x.Code == r.Code && (!id.HasValue || x.Id != id), ct)) throw ApiException.Conflict("Code zaten kullanılıyor.");
        a.Name = r.Name.Trim(); a.Code = r.Code; a.DataType = r.DataType; a.Unit = r.Unit; a.Description = r.Description;
        if (!id.HasValue) db.AttributeDefinitions.Add(a);
        await db.SaveChangesAsync(ct); await tx.CommitAsync(ct); return Map(a);
    }
    public async Task DeleteAsync(long id, CancellationToken ct)
    {
        var a = await db.AttributeDefinitions.FindAsync([id], ct) ?? throw ApiException.NotFound();
        if (await db.CategoryAttributes.AnyAsync(x => x.AttributeDefinitionId == id, ct) || await db.ProductAttributeValues.AnyAsync(x => x.AttributeDefinitionId == id, ct))
            throw ApiException.Conflict("Özellik kullanımda.");
        db.AttributeDefinitions.Remove(a); await db.SaveChangesAsync(ct);
    }
}
