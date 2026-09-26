using System.Text;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using ProductCompare.Api.Data;
using ProductCompare.Api.Entities;
namespace ProductCompare.Api.Services;

public static class AuthenticationSetup
{
    public static void AddProductCompareAuthentication(this IServiceCollection services, IConfiguration config, IHostEnvironment env)
    {
        var jwt = config.GetSection("Jwt").Get<JwtOptions>() ?? new();
        services.AddOptions<JwtOptions>().Bind(config.GetSection("Jwt"))
            .Validate(o => Encoding.UTF8.GetByteCount(o.SigningKey) >= 32 && !string.IsNullOrWhiteSpace(o.Issuer) && !string.IsNullOrWhiteSpace(o.Audience)
                && o.AccessTokenMinutes is > 0 and <= 60 && o.RefreshTokenDays is > 0 and <= 90, "Configure Jwt signing key (32+ bytes), issuer, audience and valid lifetimes.").ValidateOnStart();
        var cookie = config.GetSection("AuthCookies").Get<AuthCookieOptions>() ?? new();
        services.AddOptions<AuthCookieOptions>().Bind(config.GetSection("AuthCookies"))
            .Validate(o => (env.IsDevelopment() || o.Secure) && (o.SameSite != SameSiteMode.None || o.Secure)
                && o.SameSite is SameSiteMode.Lax or SameSiteMode.Strict or SameSiteMode.None, "Production and SameSite=None cookies require Secure.").ValidateOnStart();
        var origins = config.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
        if (origins.Any(o => !Uri.TryCreate(o, UriKind.Absolute, out var uri) || uri.GetLeftPart(UriPartial.Authority) != o || (uri.Scheme != "https" && (!env.IsDevelopment() || uri.Scheme != "http"))))
            throw new InvalidOperationException("Configure exact frontend origins (HTTPS in production).");
        services.AddCors(o => o.AddPolicy("Frontend", p => p.WithOrigins(origins).AllowAnyHeader().AllowAnyMethod().AllowCredentials()));
        services.AddScoped<IPasswordHasher<User>, PasswordHasher<User>>();
        services.AddScoped<TokenService>(); services.AddScoped<AuthService>();
        services.AddAntiforgery(o => { o.HeaderName = "X-CSRF-TOKEN"; o.Cookie.Name = "pc_csrf"; o.Cookie.HttpOnly = true;
            o.Cookie.Path = "/api"; o.Cookie.SameSite = cookie.SameSite; o.Cookie.SecurePolicy = cookie.Secure ? CookieSecurePolicy.Always : CookieSecurePolicy.None; });
        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(o =>
        {
            o.MapInboundClaims = false;
            o.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true, IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.SigningKey)),
                ValidateIssuer = true, ValidIssuer = jwt.Issuer, ValidateAudience = true, ValidAudience = jwt.Audience,
                ValidateLifetime = true, RequireExpirationTime = true, RequireSignedTokens = true,
                ValidAlgorithms = [SecurityAlgorithms.HmacSha256], ClockSkew = TimeSpan.Zero, NameClaimType = "email", RoleClaimType = "role"
            };
            o.Events = new JwtBearerEvents
            {
                OnMessageReceived = ctx => { if (ctx.Request.Cookies.TryGetValue(TokenService.AccessCookie, out var token)) ctx.Token = token; else ctx.NoResult(); return Task.CompletedTask; },
                OnTokenValidated = async ctx =>
                {
                    var db = ctx.HttpContext.RequestServices.GetRequiredService<AppDbContext>();
                    if (!long.TryParse(ctx.Principal?.FindFirst("sub")?.Value, out var id)) { ctx.Fail("Invalid session."); return; }
                    var user = await db.Users.AsNoTracking().SingleOrDefaultAsync(x => x.Id == id, ctx.HttpContext.RequestAborted);
                    if (user is null || !user.IsActive || user.Role.ToString() != ctx.Principal?.FindFirst("role")?.Value) ctx.Fail("Invalid session.");
                }
            };
        });
        services.AddAuthorization();
    }
}

public class CsrfMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext context, IAntiforgery antiforgery)
    {
        if (context.Request.Path.StartsWithSegments("/api") && !HttpMethods.IsGet(context.Request.Method)
            && !HttpMethods.IsHead(context.Request.Method) && !HttpMethods.IsOptions(context.Request.Method))
        {
            try { await antiforgery.ValidateRequestAsync(context); }
            catch (AntiforgeryValidationException) { throw new ApiException(400, "Invalid CSRF token. Reload and try again."); }
        }
        await next(context);
    }
}
