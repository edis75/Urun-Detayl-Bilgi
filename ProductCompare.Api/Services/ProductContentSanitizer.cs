using Ganss.Xss;

namespace ProductCompare.Api.Services;

public static class ProductContentSanitizer
{
    public static string Sanitize(string? html)
    {
        var sanitizer = new HtmlSanitizer();
        sanitizer.AllowedTags.Clear();
        sanitizer.AllowedTags.UnionWith(["p", "h2", "h3", "h4", "strong", "b", "em", "i", "u", "ul", "ol", "li", "blockquote", "a", "span", "br"]);
        sanitizer.AllowedAttributes.Clear();
        sanitizer.AllowedAttributes.UnionWith(["href", "title"]);
        sanitizer.AllowedSchemes.Clear();
        sanitizer.AllowedSchemes.UnionWith(["https", "http", "mailto"]);
        sanitizer.AllowDataAttributes = false;
        return sanitizer.Sanitize(html ?? "");
    }

    public static string[] Normalize(string[] values) => values
        .Where(value => !string.IsNullOrWhiteSpace(value)).Select(value => value.Trim()).ToArray();
}
