using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using ProductCompare.Api.Data;
using ProductCompare.Api.Entities;
using ProductCompare.Api.Enums;
using System.ComponentModel.DataAnnotations;
using Npgsql;
namespace ProductCompare.Api.Services;

public record AuthUser(long Id, string Email, string Role);
public class AuthService(AppDbContext db, IPasswordHasher<User> hasher, TokenService tokens)
{
    public static string NormalizeEmail(string email) => email.Trim().ToLowerInvariant();
    public static AuthUser Metadata(User user) => new(user.Id, user.Email, user.Role.ToString());
    private static ApiException Unauthorized() => new(401, "Invalid credentials or session.");
    // A valid hash ensures nonexistent users still incur password verification work.
    private static readonly string DummyHash = new PasswordHasher<User>().HashPassword(new User(), Guid.NewGuid().ToString());
    public async Task<AuthUser> LoginAsync(string email, string password, HttpResponse response, CancellationToken ct)
    {
        var user = await db.Users.SingleOrDefaultAsync(x => x.Email == NormalizeEmail(email), ct);
        var result = hasher.VerifyHashedPassword(user ?? new User(), user?.PasswordHash ?? DummyHash, password);
        if (user is null || !user.IsActive || result == PasswordVerificationResult.Failed) throw Unauthorized();
        if (result == PasswordVerificationResult.SuccessRehashNeeded) user.PasswordHash = hasher.HashPassword(user, password);
        return await IssueSessionAsync(user, response, ct);
    }
    public async Task<AuthUser> RegisterAsync(string email, string password, HttpResponse response, CancellationToken ct)
    {
        var normalized = NormalizeEmail(email);
        if (normalized.Length > 254 || !new EmailAddressAttribute().IsValid(normalized))
            throw ApiException.Invalid("Enter a valid email address.");
        if (string.IsNullOrWhiteSpace(password) || password.Length is < 8 or > 128)
            throw ApiException.Invalid("Password must contain between 8 and 128 characters.");
        if (await db.Users.AnyAsync(x => x.Email == normalized, ct))
            throw ApiException.Conflict("Email address is already registered.");
        var user = new User { Email = normalized, Role = UserRole.User, IsActive = true, CreatedAtUtc = DateTime.UtcNow };
        user.PasswordHash = hasher.HashPassword(user, password);
        db.Users.Add(user);
        try
        {
            // User and initial refresh token are saved atomically in the same SaveChanges.
            return await IssueSessionAsync(user, response, ct);
        }
        catch (DbUpdateException e) when (e.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation, ConstraintName: "IX_Users_Email" })
        {
            throw ApiException.Conflict("Email address is already registered.");
        }
    }
    private async Task<AuthUser> IssueSessionAsync(User user, HttpResponse response, CancellationToken ct)
    {
        var raw = TokenService.GenerateRefreshToken();
        var refresh = tokens.NewRefreshToken(user, raw);
        db.RefreshTokens.Add(refresh);
        await db.SaveChangesAsync(ct);
        tokens.SetCookies(response, user, raw, refresh.ExpiresAtUtc);
        return Metadata(user);
    }
    public async Task<AuthUser> RefreshAsync(string? raw, HttpResponse response, CancellationToken ct)
    {
        if (string.IsNullOrEmpty(raw) || raw.Length > 512) throw Unauthorized();
        var hash = TokenService.Hash(raw);
        await using var tx = await db.Database.BeginTransactionAsync(ct);
        // Lock the existing row so simultaneous refreshes cannot both rotate it.
        var old = await db.RefreshTokens.FromSqlInterpolated($"SELECT * FROM \"RefreshTokens\" WHERE \"TokenHash\" = {hash} FOR UPDATE").SingleOrDefaultAsync(ct);
        if (old is null || old.RevokedAtUtc != null || old.ExpiresAtUtc <= DateTime.UtcNow) throw Unauthorized();
        var user = await db.Users.SingleAsync(x => x.Id == old.UserId, ct);
        if (!user.IsActive) throw Unauthorized();
        var nextRaw = TokenService.GenerateRefreshToken();
        var next = tokens.NewRefreshToken(user, nextRaw);
        old.RevokedAtUtc = DateTime.UtcNow; old.ReplacedByTokenHash = next.TokenHash;
        db.RefreshTokens.Add(next);
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        tokens.SetCookies(response, user, nextRaw, next.ExpiresAtUtc);
        return Metadata(user);
    }
    public async Task LogoutAsync(string? raw, HttpResponse response, CancellationToken ct)
    {
        tokens.DeleteCookies(response);
        if (string.IsNullOrEmpty(raw) || raw.Length > 512) return;
        var hash = TokenService.Hash(raw);
        await db.RefreshTokens.Where(x => x.TokenHash == hash && x.RevokedAtUtc == null)
            .ExecuteUpdateAsync(s => s.SetProperty(x => x.RevokedAtUtc, DateTime.UtcNow), ct);
    }
    public async Task<AuthUser> MeAsync(long id, CancellationToken ct)
        => Metadata(await db.Users.AsNoTracking().SingleOrDefaultAsync(x => x.Id == id && x.IsActive, ct) ?? throw Unauthorized());
}
