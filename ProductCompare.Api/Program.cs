using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ProductCompare.Api.Data;
using ProductCompare.Api.Services;
using Elastic.Clients.Elasticsearch;
using ProductCompare.Api.Search;
var builder = WebApplication.CreateBuilder(args);
builder.Logging.ClearProviders();
builder.Logging.AddConsole();
builder.Services.AddControllers().AddJsonOptions(o => o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));
builder.Services.Configure<ApiBehaviorOptions>(o => o.InvalidModelStateResponseFactory = context =>
 new BadRequestObjectResult(new { message = "Doğrulama başarısız.", errors = context.ModelState.Values.SelectMany(x => x.Errors).Select(x => string.IsNullOrEmpty(x.ErrorMessage) ? "Geçersiz istek." : x.ErrorMessage).ToArray() }));
builder.Services.AddDbContext<AppDbContext>(o => o.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")
 ?? throw new InvalidOperationException("ConnectionStrings:DefaultConnection yapılandırılmalıdır.")));
builder.Services.AddScoped<SlugService>();
builder.Services.AddScoped<CategoryService>();
builder.Services.AddScoped<BrandService>();
builder.Services.AddScoped<AttributeService>();
builder.Services.AddScoped<ProductService>();
builder.Services.AddScoped<ComparisonService>();
builder.Services.AddSingleton(sp => new ElasticsearchClient(new ElasticsearchClientSettings(
    new Uri(sp.GetRequiredService<IConfiguration>()["Elasticsearch:Url"]
        ?? throw new InvalidOperationException("Elasticsearch:Url is required.")))
    .RequestTimeout(TimeSpan.FromSeconds(15))));
builder.Services.AddSingleton<ProductSearchIndexService>();
builder.Services.AddScoped<ProductSearchReindexService>();
builder.Services.AddScoped<ProductSearchService>();
builder.Services.AddExceptionHandler<ApiExceptionHandler>();
builder.Services.AddProblemDetails();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
if (builder.Environment.IsDevelopment())
{
    builder.Services.AddCors(options => options.AddPolicy("FrontendDevelopment", policy =>
        policy.WithOrigins("http://localhost:5173", "http://localhost:3000")
            .AllowAnyHeader().AllowAnyMethod()));
}
var app = builder.Build();
app.UseExceptionHandler();
app.UseStatusCodePages(async context =>
{
    var response = context.HttpContext.Response;
    await response.WriteAsJsonAsync(new { message = response.StatusCode == 404 ? "Endpoint bulunamadı." : "İstek işlenemedi.", errors = Array.Empty<string>() });
});
if (app.Environment.IsDevelopment())
{
    app.UseCors("FrontendDevelopment");
    app.UseSwagger(); app.UseSwaggerUI();
    if (builder.Configuration.GetValue<bool>("SeedData:Enabled"))
    {
        await using var scope = app.Services.CreateAsyncScope();
        await SeedData.InitializeAsync(scope.ServiceProvider);
    }
}
app.MapControllers();
try
{
    await app.Services.GetRequiredService<ProductSearchIndexService>().EnsureIndexAsync();
}
catch (Exception exception)
{
    app.Logger.LogWarning(exception, "Elasticsearch initialization failed. PostgreSQL endpoints remain available; reindex will retry initialization.");
}
app.Run();
