using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProductCompare.Api.Services;
namespace ProductCompare.Api.Controllers;

public class LoginRequest
{
    private string email = "";
    [Required, EmailAddress, MaxLength(254)] public string Email { get => email; set => email = AuthService.NormalizeEmail(value ?? ""); }
    [Required, MaxLength(1024)] public string Password { get; set; } = "";
}
public class RegisterRequest
{
    private string email = "";
    [Required, EmailAddress, MaxLength(254)] public string Email { get => email; set => email = AuthService.NormalizeEmail(value ?? ""); }
    [Required, MinLength(8), MaxLength(128)] public string Password { get; set; } = "";
    [Required, MaxLength(128), Compare(nameof(Password))] public string ConfirmPassword { get; set; } = "";
}
[ApiController, Route("api/auth")]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
public class AuthController(AuthService auth, TokenService tokens) : ControllerBase
{
    [HttpGet("csrf")]
    public IActionResult Csrf([FromServices] IAntiforgery antiforgery)
        => Ok(new { token = antiforgery.GetAndStoreTokens(HttpContext).RequestToken });
    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginRequest request, CancellationToken ct)
        => Ok(new { user = await auth.LoginAsync(request.Email, request.Password, Response, ct) });
    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterRequest request, CancellationToken ct)
        => Ok(new { user = await auth.RegisterAsync(request.Email, request.Password, Response, ct) });
    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh(CancellationToken ct)
    {
        try { return Ok(new { user = await auth.RefreshAsync(Request.Cookies[TokenService.RefreshCookie], Response, ct) }); }
        catch (ApiException) { tokens.DeleteCookies(Response); throw; }
    }
    [HttpPost("logout")]
    public async Task<IActionResult> Logout(CancellationToken ct)
    { await auth.LogoutAsync(Request.Cookies[TokenService.RefreshCookie], Response, ct); return NoContent(); }
    [Authorize, HttpGet("me")]
    public async Task<IActionResult> Me(CancellationToken ct)
        => Ok(await auth.MeAsync(long.Parse(User.FindFirst("sub")!.Value), ct));
}
