using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using ProductCompare.Api.Data;
using ProductCompare.Api.Entities;
namespace ProductCompare.Api.Services;

public class SlugService(AppDbContext db)
{
    public static string Normalize(string text)
    {
        text = text.Replace('ı', 'i').Replace('İ', 'i').ToLowerInvariant().Normalize(NormalizationForm.FormD);
        var s = new string(text.Where(c => CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark).ToArray());
        return Regex.Replace(s, "[^a-z0-9]+", "-").Trim('-');
    }
    public async Task<string> CreateAsync<T>(string name, int maxLength, long? exceptId, CancellationToken ct) where T : CatalogEntity
    {
        var root = Normalize(name); if (root.Length == 0) throw ApiException.Invalid("İsim slug oluşturabilecek harf veya rakam içermelidir.");
        root = root[..Math.Min(root.Length, maxLength)].TrimEnd('-');
        var slug = root; var i = 2;
        while (await db.Set<T>().AnyAsync(x => EF.Property<string>(x, "Slug") == slug && (!exceptId.HasValue || x.Id != exceptId), ct))
        {
            var suffix = "-" + i++; slug = root[..Math.Min(root.Length, maxLength - suffix.Length)].TrimEnd('-') + suffix;
        }
        return slug;
    }
}
