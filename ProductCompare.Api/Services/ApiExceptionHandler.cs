using Microsoft.AspNetCore.Diagnostics;
using Microsoft.EntityFrameworkCore;
using Npgsql;
namespace ProductCompare.Api.Services;

public class ApiExceptionHandler(ILogger<ApiExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext context, Exception exception, CancellationToken ct)
    {
        var pg = (exception as DbUpdateException)?.InnerException as PostgresException ?? exception as PostgresException;
        var error = exception as ApiException ?? pg?.SqlState switch
        {
            PostgresErrorCodes.UniqueViolation => ApiException.Conflict("Slug, code veya ilişki zaten mevcut; tekrar deneyin."),
            PostgresErrorCodes.ForeignKeyViolation => ApiException.Conflict("İlişkili kayıt nedeniyle işlem yapılamıyor."),
            PostgresErrorCodes.CheckViolation => ApiException.Invalid("Veritabanı doğrulaması başarısız."),
            PostgresErrorCodes.SerializationFailure or PostgresErrorCodes.DeadlockDetected => ApiException.Conflict("Eşzamanlı değişiklik algılandı; işlemi tekrar deneyin."),
            _ => new ApiException(500, "Beklenmeyen bir hata oluştu.")
        };
        if (error.StatusCode == 500) logger.LogError(exception, "API request failed");
        context.Response.StatusCode = error.StatusCode;
        await context.Response.WriteAsJsonAsync(new { message = error.Message, errors = error.Errors }, ct);
        return true;
    }
}
