using System.Net;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text.Json;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Npgsql;
using ProductCompare.Api.Controllers;
using ProductCompare.Api.Data;
using ProductCompare.Api.Entities;
using ProductCompare.Api.Enums;
using ProductCompare.Api.Services;

public static class AuthChecks
{
    private static void Check(bool value, string message) { if (!value) throw new Exception(message); }
    public static async Task RunAsync(string connection)
    {
        var schema = "auth_checks_" + Guid.NewGuid().ToString("N");
        await using var admin = new NpgsqlConnection(connection);
        await admin.OpenAsync();
        await new NpgsqlCommand($"CREATE SCHEMA \"{schema}\"", admin).ExecuteNonQueryAsync();
        WebApplication? app = null;
        try
        {
            var scopedConnection = new NpgsqlConnectionStringBuilder(connection) { SearchPath = schema }.ConnectionString;
            var builder = WebApplication.CreateBuilder(new WebApplicationOptions { EnvironmentName = "Development" });
            builder.Logging.ClearProviders();
            builder.WebHost.UseUrls("http://127.0.0.1:0");
            builder.Configuration.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:SigningKey"] = Convert.ToBase64String(RandomNumberGenerator.GetBytes(48)),
                ["AuthCookies:Secure"] = "false", ["Cors:AllowedOrigins:0"] = "http://localhost:3000"
            });
            builder.Services.AddDbContext<AppDbContext>(o => o.UseNpgsql(scopedConnection));
            builder.Services.AddProductCompareAuthentication(builder.Configuration, builder.Environment);
            builder.Services.AddControllers().AddApplicationPart(typeof(AuthController).Assembly);
            builder.Services.AddExceptionHandler<ApiExceptionHandler>(); builder.Services.AddProblemDetails();
            app = builder.Build();
            app.UseExceptionHandler(); app.UseCors("Frontend"); app.UseAuthentication(); app.UseAuthorization(); app.UseMiddleware<CsrfMiddleware>();
            app.MapControllers();
            app.MapPost("/api/editor-check", () => Results.Ok()).RequireAuthorization(p => p.RequireRole("Editor"));
            app.MapGet("/api/public-check", () => Results.Ok());
            await using (var scope = app.Services.CreateAsyncScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                await db.Database.MigrateAsync();
                var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher<User>>();
                foreach (var (email, role, active) in new[] { ("editor@example.test", UserRole.Editor, true), ("user@example.test", UserRole.User, true), ("inactive@example.test", UserRole.Editor, false) })
                {
                    var user = new User { Email = email, Role = role, IsActive = active };
                    user.PasswordHash = hasher.HashPassword(user, "Test-only-password-123!"); db.Users.Add(user);
                }
                await db.SaveChangesAsync();
            }
            await app.StartAsync(); var address = new Uri(app.Urls.Single());
            var jar = new CookieContainer();
            using var client = new HttpClient(new HttpClientHandler { CookieContainer = jar }) { BaseAddress = address };
            async Task<HttpResponseMessage> Post(string path, object? data = null)
            {
                var csrf = await client.GetFromJsonAsync<JsonElement>("/api/auth/csrf");
                using var request = new HttpRequestMessage(HttpMethod.Post, path) { Content = JsonContent.Create(data ?? new { }) };
                request.Headers.Add("X-CSRF-TOKEN", csrf.GetProperty("token").GetString());
                return await client.SendAsync(request);
            }
            Task<HttpResponseMessage> Login(string email = "editor@example.test", string password = "Test-only-password-123!", string role = "User")
                => Post("/api/auth/login", new { email, password, role });
            string Refresh() => jar.GetCookies(new Uri(address, "/api/auth"))[TokenService.RefreshCookie]!.Value;
            async Task WithDb(Func<AppDbContext, Task> action) { await using var scope = app.Services.CreateAsyncScope(); await action(scope.ServiceProvider.GetRequiredService<AppDbContext>()); }
            Task<HttpResponseMessage> Register(string email = "  NEW@example.test  ", string password = "simplepassword", string? confirmation = null)
                => Post("/api/auth/register", new { email, password, confirmPassword = confirmation ?? password, role = "Editor", isEditor = true });
            Check((await client.PostAsJsonAsync("/api/auth/register", new { email = "csrf@example.test", password = "simplepassword", confirmPassword = "simplepassword" })).StatusCode == HttpStatusCode.BadRequest, "Registration requires CSRF");
            Check((await Register(password: "short")).StatusCode == HttpStatusCode.BadRequest, "Short registration password");
            Check((await Register(password: new string('a',129))).StatusCode == HttpStatusCode.BadRequest, "Long registration password");
            Check((await Register(confirmation: "different-password")).StatusCode == HttpStatusCode.BadRequest, "Registration confirmation");
            Check((await Register(email: "invalid-email")).StatusCode == HttpStatusCode.BadRequest, "Registration email validation");
            var registration = await Register();
            Check(registration.IsSuccessStatusCode, "Registration succeeds");
            var registered = await registration.Content.ReadFromJsonAsync<JsonElement>();
            Check(registered.GetProperty("user").GetProperty("role").GetString() == "User", "Registration ignores privilege injection");
            Check(registered.GetProperty("user").GetProperty("email").GetString() == "new@example.test", "Registration email normalization");
            Check(!registered.ToString().Contains("Token", StringComparison.OrdinalIgnoreCase) && !registered.ToString().Contains("Hash"), "Registration exposes only metadata");
            Check(registration.Headers.GetValues("Set-Cookie").Count(c => c.Contains("httponly", StringComparison.OrdinalIgnoreCase)) == 2, "Registration HttpOnly cookies");
            Check((await client.GetFromJsonAsync<JsonElement>("/api/auth/me")).GetProperty("email").GetString() == "new@example.test", "Registered session works");
            Check((await Post("/api/editor-check")).StatusCode == HttpStatusCode.Forbidden, "Registered User cannot edit");
            var duplicate = await Register(email: "NEW@example.test");
            Check(duplicate.StatusCode == HttpStatusCode.Conflict && (await duplicate.Content.ReadAsStringAsync()).Contains("Email address is already registered."), "Duplicate registration conflict");
            await WithDb(async db => {
                var user = await db.Users.SingleAsync(x => x.Email == "new@example.test");
                Check(user.IsActive && user.Role == UserRole.User && user.CreatedAtUtc.Kind == DateTimeKind.Utc, "Registration account defaults");
                Check(user.PasswordHash != "simplepassword" && new PasswordHasher<User>().VerifyHashedPassword(user,user.PasswordHash,"simplepassword") != PasswordVerificationResult.Failed, "Registration password hash");
                Check(await db.RefreshTokens.CountAsync(x => x.UserId == user.Id) == 1, "Single initial registration session");
            });
            async Task<bool> RegisterConcurrent()
            {
                await using var scope = app.Services.CreateAsyncScope();
                try { await scope.ServiceProvider.GetRequiredService<AuthService>().RegisterAsync("race@example.test", "simplepassword", new DefaultHttpContext().Response, default); return true; }
                catch (ApiException e) when (e.StatusCode == 409) { Check(e.Message == "Email address is already registered.", "Friendly duplicate race"); return false; }
            }
            Check((await Task.WhenAll(RegisterConcurrent(), RegisterConcurrent())).Count(x => x) == 1, "Concurrent registration only creates one account");
            await Post("/api/auth/logout");
            Check((await Login(email: "new@example.test",password: "simplepassword")).IsSuccessStatusCode, "Registered password works for login");
            Check((await Post("/api/auth/refresh")).IsSuccessStatusCode, "Registered session refresh");
            await Post("/api/auth/logout");
            Console.WriteLine("PASS: registration validation, CSRF, User-only role, duplicate/concurrent email, hashing, cookies, me, login, refresh and Editor denial.");
            Check((await client.GetAsync("/api/public-check")).IsSuccessStatusCode, "Public endpoint");
            Check((await client.GetAsync("/api/auth/me")).StatusCode == HttpStatusCode.Unauthorized, "Anonymous me = 401");
            Check((await Post("/api/editor-check")).StatusCode == HttpStatusCode.Unauthorized, "Anonymous mutation = 401");
            Check((await Login(password: "wrong")).StatusCode == HttpStatusCode.Unauthorized, "Wrong password");
            Check((await Login(email: "inactive@example.test")).StatusCode == HttpStatusCode.Unauthorized, "Inactive login");
            var login = await Login(email: "  EDITOR@example.test  ");
            Check(login.IsSuccessStatusCode, "Editor login");
            var json = await login.Content.ReadAsStringAsync();
            Check(!json.Contains("Token", StringComparison.OrdinalIgnoreCase) && !json.Contains("Hash"), "No token/hash JSON");
            var cookies = login.Headers.GetValues("Set-Cookie").ToArray();
            Check(cookies.Count(c => c.Contains("httponly", StringComparison.OrdinalIgnoreCase)) == 2, "Both auth cookies HttpOnly");
            Check(cookies.Any(c => c.StartsWith("pc_refresh=") && c.Contains("path=/api/auth")), "Refresh cookie scope");
            Check((await client.GetFromJsonAsync<JsonElement>("/api/auth/me")).GetProperty("role").GetString() == "Editor", "Me role");
            Check((await Post("/api/editor-check")).IsSuccessStatusCode, "Editor authorization");
            Check((await client.PostAsJsonAsync("/api/editor-check", new { })).StatusCode == HttpStatusCode.BadRequest, "Missing CSRF rejected");
            var old = Refresh();
            Check((await Post("/api/auth/refresh")).IsSuccessStatusCode, "Refresh success");
            var rotated = Refresh(); Check(old != rotated, "Refresh rotates");
            await WithDb(async db => { var token = await db.RefreshTokens.SingleAsync(x => x.TokenHash == TokenService.Hash(old)); Check(token.RevokedAtUtc != null && token.ReplacedByTokenHash == TokenService.Hash(rotated), "Rotation stored atomically"); });
            jar.Add(address, new Cookie(TokenService.RefreshCookie, old, "/api/auth"));
            Check((await Post("/api/auth/refresh")).StatusCode == HttpStatusCode.Unauthorized, "Replay rejected");
            await Login(); var expired = Refresh();
            await WithDb(db => db.RefreshTokens.Where(x => x.TokenHash == TokenService.Hash(expired)).ExecuteUpdateAsync(s => s.SetProperty(x => x.ExpiresAtUtc, DateTime.UtcNow.AddDays(-1))));
            Check((await Post("/api/auth/refresh")).StatusCode == HttpStatusCode.Unauthorized, "Expired refresh");
            await Login(); var logoutToken = Refresh(); Check((await Post("/api/auth/logout")).IsSuccessStatusCode, "Logout");
            await WithDb(async db => Check((await db.RefreshTokens.SingleAsync(x => x.TokenHash == TokenService.Hash(logoutToken))).RevokedAtUtc != null, "Logout revokes"));
            Check((await Post("/api/auth/logout")).IsSuccessStatusCode, "Logout without cookies");
            Check((await Login(email: "user@example.test", role: "Editor")).IsSuccessStatusCode, "User login");
            Check((await Post("/api/editor-check")).StatusCode == HttpStatusCode.Forbidden, "User = 403 despite supplied Editor role");
            Check((await client.GetFromJsonAsync<JsonElement>("/api/auth/me")).GetProperty("role").GetString() == "User", "Frontend role ignored");
            var accessCookie = jar.GetCookies(new Uri(address, "/api"))[TokenService.AccessCookie]!;
            var parts = accessCookie.Value.Split('.');
            var payload = System.Text.Encoding.UTF8.GetString(Microsoft.IdentityModel.Tokens.Base64UrlEncoder.DecodeBytes(parts[1])).Replace("\"User\"", "\"Editor\"");
            parts[1] = Microsoft.IdentityModel.Tokens.Base64UrlEncoder.Encode(System.Text.Encoding.UTF8.GetBytes(payload));
            jar.Add(address, new Cookie(TokenService.AccessCookie, string.Join('.', parts), "/api"));
            Check((await Post("/api/editor-check")).StatusCode == HttpStatusCode.Unauthorized, "Tampered JWT rejected");
            await Login();
            await using (var scope = app.Services.CreateAsyncScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                var editor = await db.Users.SingleAsync(x => x.Role == UserRole.Editor && x.IsActive);
                var expiredAccess = scope.ServiceProvider.GetRequiredService<TokenService>().CreateAccessToken(editor, DateTime.UtcNow.AddMinutes(-1));
                jar.Add(address, new Cookie(TokenService.AccessCookie, expiredAccess, "/api"));
            }
            Check((await client.GetAsync("/api/auth/me")).StatusCode == HttpStatusCode.Unauthorized, "Expired access rejected");
            Check((await Post("/api/auth/refresh")).IsSuccessStatusCode, "Expired access can refresh");
            var concurrent = Refresh();
            async Task<bool> Rotate()
            {
                await using var scope = app.Services.CreateAsyncScope();
                try { await scope.ServiceProvider.GetRequiredService<AuthService>().RefreshAsync(concurrent, new DefaultHttpContext().Response, default); return true; }
                catch (ApiException e) when (e.StatusCode == 401) { return false; }
            }
            Check((await Task.WhenAll(Rotate(), Rotate())).Count(x => x) == 1, "Concurrent refresh has exactly one winner");
            await Login();
            await WithDb(db => db.Users.Where(x => x.Email == "editor@example.test").ExecuteUpdateAsync(s => s.SetProperty(x => x.IsActive, false)));
            Check((await client.GetAsync("/api/auth/me")).StatusCode == HttpStatusCode.Unauthorized, "Deactivation invalidates access immediately");
            Check((await Post("/api/auth/refresh")).StatusCode == HttpStatusCode.Unauthorized, "Inactive refresh rejected");
            // Authorization attributes cover every existing catalog mutation.
            foreach (var type in new[] { typeof(ProductsController), typeof(CategoriesController), typeof(BrandsController), typeof(AttributesController), typeof(AdminSearchController) })
                foreach (var method in type.GetMethods().Where(m => m.GetCustomAttributes(true).OfType<Microsoft.AspNetCore.Mvc.Routing.HttpMethodAttribute>().Any(a => a.HttpMethods.Any(v => v != "GET"))))
                    Check(method.GetCustomAttributes(true).OfType<Microsoft.AspNetCore.Authorization.AuthorizeAttribute>().Any(a => a.Roles == "Editor"), $"Missing Editor authorization: {type.Name}.{method.Name}");
            Console.WriteLine("PASS: auth login, normalization, inactivity, 401/403/Editor, cookies, CSRF, me, rotation/replay/expiry, logout and frontend role injection; isolated PostgreSQL migration.");
        }
        finally
        {
            if (app != null) { await app.StopAsync(); await app.DisposeAsync(); }
            // Only the randomly generated schema created by this test is removed.
            await new NpgsqlCommand($"DROP SCHEMA \"{schema}\" CASCADE", admin).ExecuteNonQueryAsync();
        }
    }
}
