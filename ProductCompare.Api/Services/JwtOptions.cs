namespace ProductCompare.Api.Services;
public class JwtOptions
{
    public string Issuer { get; set; } = "ProductCompare.Api";
    public string Audience { get; set; } = "ProductCompare";
    public string SigningKey { get; set; } = "";
    public int AccessTokenMinutes { get; set; } = 15;
    public int RefreshTokenDays { get; set; } = 7;
}
public class AuthCookieOptions
{
    public bool Secure { get; set; } = true;
    public SameSiteMode SameSite { get; set; } = SameSiteMode.Lax;
}
