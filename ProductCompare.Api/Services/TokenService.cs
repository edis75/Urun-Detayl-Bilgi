using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using ProductCompare.Api.Entities;
namespace ProductCompare.Api.Services;

public class TokenService(IOptions<JwtOptions> options, IOptions<AuthCookieOptions> cookies)
{
    public const string AccessCookie = "pc_access", RefreshCookie = "pc_refresh";
    public static string GenerateRefreshToken() => Base64UrlEncoder.Encode(RandomNumberGenerator.GetBytes(64));
    public static string Hash(string token) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token)));
    public RefreshToken NewRefreshToken(User user, string raw) => new()
    {
        User = user, TokenHash = Hash(raw), CreatedAtUtc = DateTime.UtcNow,
        ExpiresAtUtc = DateTime.UtcNow.AddDays(options.Value.RefreshTokenDays)
    };
    public string CreateAccessToken(User user, DateTime expires) => new JwtSecurityTokenHandler().WriteToken(new JwtSecurityToken(
        issuer: options.Value.Issuer, audience: options.Value.Audience,
        claims: [new("sub", user.Id.ToString()), new("email", user.Email), new("role", user.Role.ToString()), new("jti", Guid.NewGuid().ToString())],
        expires: expires, signingCredentials: new SigningCredentials(new SymmetricSecurityKey(Encoding.UTF8.GetBytes(options.Value.SigningKey)), SecurityAlgorithms.HmacSha256)));
    private CookieOptions Cookie(string path, DateTime? expires = null) => new()
    { HttpOnly = true, Secure = cookies.Value.Secure, SameSite = cookies.Value.SameSite, Path = path, Expires = expires, IsEssential = true };
    public void SetCookies(HttpResponse response, User user, string refresh, DateTime refreshExpires)
    {
        var expires = DateTime.UtcNow.AddMinutes(options.Value.AccessTokenMinutes);
        response.Cookies.Append(AccessCookie, CreateAccessToken(user, expires), Cookie("/api", expires));
        response.Cookies.Append(RefreshCookie, refresh, Cookie("/api/auth", refreshExpires));
        response.Headers.CacheControl = "no-store";
    }
    public void DeleteCookies(HttpResponse response)
    {
        response.Cookies.Delete(AccessCookie, Cookie("/api"));
        response.Cookies.Delete(RefreshCookie, Cookie("/api/auth"));
    }
}
