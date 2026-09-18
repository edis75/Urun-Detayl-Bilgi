namespace ProductCompare.Api.Services;

public class ApiException(int statusCode, string message, params string[] errors) : Exception(message)
{
    public int StatusCode { get; } = statusCode;
    public string[] Errors { get; } = errors;
    public static ApiException NotFound() => new(404, "Kayıt bulunamadı.");
    public static ApiException Conflict(string message) => new(409, message);
    public static ApiException Invalid(params string[] errors) => new(400, "Doğrulama başarısız.", errors);
}
