using AngleSharp.Html.Parser;
using Microsoft.EntityFrameworkCore;
using ProductCompare.Api.Data;
using ProductCompare.Api.Entities;
using ProductCompare.Api.Services;

static void Check(bool condition, string message)
{
    if (!condition) throw new Exception(message);
}

var safe = "<h2>Screen</h2><h3>Details</h3><h4>More</h4><p><strong>Bold</strong><em>Italic</em><u>Underline</u><br><span>Text</span></p><ul><li>One</li></ul><ol><li>Two</li></ol><blockquote>Quote</blockquote><a href=\"https://example.com\">Link</a>";
var sanitized = ProductContentSanitizer.Sanitize(safe);
var parser = new HtmlParser();
var document = parser.ParseDocument(sanitized);
foreach (var tag in new[] { "h2", "h3", "h4", "strong", "em", "u", "br", "span", "ul", "ol", "li", "blockquote", "a" })
    Check(document.QuerySelector(tag) is not null, $"Formatting lost: {tag}");
Check(document.QuerySelector("a")!.GetAttribute("href") == "https://example.com", "Safe link lost");

var attacks = new[] {
    "<script>alert(1)</script><iframe src='https://evil.test'></iframe><object data='x'></object><embed src='x'>",
    "<p onclick='alert(1)' onload='alert(2)' style='background:url(javascript:alert(3))' class='injected'>Text</p><img src=x onerror='alert(4)'>",
    "<a href='javascript:alert(1)'>bad</a><a href='jav&#x61;script:alert(1)'>encoded</a><a href='data:text/html,test'>data</a>",
    "<svg><a xlink:href='javascript:alert(1)'>bad</a></svg><math><mtext><img src=x onerror=alert(1)></mtext></math>"
};
var allowed = new HashSet<string>(["html", "head", "body", "p", "h2", "h3", "h4", "strong", "b", "em", "i", "u", "ul", "ol", "li", "blockquote", "a", "span", "br"]);
foreach (var attack in attacks)
{
    var result = parser.ParseDocument(ProductContentSanitizer.Sanitize(attack));
    foreach (var element in result.All)
    {
        Check(allowed.Contains(element.LocalName), $"Unsafe element: {element.LocalName}");
        foreach (var attribute in element.Attributes)
        {
            Check(attribute.Name is "href" or "title", $"Unsafe attribute: {attribute.Name}");
            Check(!attribute.Value.Contains("javascript:", StringComparison.OrdinalIgnoreCase) && !attribute.Value.StartsWith("data:"), "Unsafe URL");
        }
    }
}
Check(ProductContentSanitizer.Sanitize(null) == "", "Empty content");
Check(ProductContentSanitizer.Normalize(["  OLED  ", "", "  ", null!, "Battery"]).SequenceEqual(["OLED", "Battery"]), "Point normalization");
using var db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseNpgsql("Host=localhost;Database=unused").Options);
var entity = db.Model.FindEntityType(typeof(ProductContent))!;
Check(entity.FindPrimaryKey()!.Properties.Single().Name == "ProductId", "Shared product key");
Check(entity.GetForeignKeys().Single().IsUnique, "One-to-one relationship");
Check(entity.GetForeignKeys().Single().DeleteBehavior == DeleteBehavior.Cascade, "Cascade deletion");
Check(entity.FindProperty("ContentHtml")!.GetColumnType() == "text", "HTML column type");
Check(entity.FindProperty("Pros")!.GetColumnType() == "text[]" && entity.FindProperty("Cons")!.GetColumnType() == "text[]", "Structured point columns");
Console.WriteLine("PASS: HTML formatting, XSS sanitization, point normalization and EF model. No database connection made.");
