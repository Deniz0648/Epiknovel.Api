using FastEndpoints;
using FastEndpoints.Swagger;
using Scalar.AspNetCore;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Storage;
using Epiknovel.Shared.Infrastructure;
using Epiknovel.Modules.Identity;
using Epiknovel.Modules.Users;
using Epiknovel.Modules.Books;
using Epiknovel.Modules.Compliance;
using Epiknovel.Modules.Infrastructure;
using Epiknovel.Modules.Social;
using Epiknovel.Modules.Search;
using Epiknovel.Modules.Wallet;
using Epiknovel.Modules.Management;
using Epiknovel.Modules.Identity.Data;
using Epiknovel.Modules.Users.Data;
using Epiknovel.Modules.Books.Data;
using Epiknovel.Modules.Social.Data;
using Epiknovel.Modules.Search.Data;
using Epiknovel.Modules.Wallet.Data;
using Epiknovel.Modules.Management.Data;
using Epiknovel.Modules.Compliance.Data;
using Epiknovel.Modules.Infrastructure.Data;

DotNetEnv.Env.Load();

var builder = WebApplication.CreateBuilder(args);

// 1. .env ve Yapılandırma
var jwtSecret = Environment.GetEnvironmentVariable("JWT_SECRET") ?? "super-secret-key-2026";
var redisConn = Environment.GetEnvironmentVariable("REDIS_CONNECTION") ?? "localhost:6379";
var dbConn = Environment.GetEnvironmentVariable("DB_CONNECTION") ?? "Host=localhost;Database=epiknovel_db;Username=postgres;Password=password";

// 2. Altyapı ve Modüllerin Kaydı
builder.Services.AddSharedInfrastructure(jwtSecret, redisConn, dbConn);

// Tüm Modülleri Kendi Yapılandırmalarıyla Kaydediyoruz
builder.Services.AddIdentityModule(dbConn);
builder.Services.AddUsersModule(dbConn);
builder.Services.AddBooksModule(dbConn);
builder.Services.AddComplianceModule(dbConn);
builder.Services.AddInfrastructureModule(dbConn);
builder.Services.AddSocialModule(dbConn);
builder.Services.AddSearchModule(dbConn);
builder.Services.AddWalletModule(dbConn);
builder.Services.AddManagementModule(dbConn);

// 3. FastEndpoints (Assembly Scanning)
builder.Services.AddFastEndpoints(o =>
{
    o.Assemblies = AppDomain.CurrentDomain.GetAssemblies()
        .Where(a => a.FullName != null && 
                   (a.FullName.StartsWith("Epiknovel.Modules") || 
                    a.FullName.StartsWith("Epiknovel.Shared.Infrastructure")))
        .ToArray();
});

var app = builder.Build();

// 4. Veritabanı Hazırlık (Daha Sağlam Yöntem)
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    var contexts = new List<DbContext>
    {
        services.GetRequiredService<IdentityDbContext>(),
        services.GetRequiredService<UsersDbContext>(),
        services.GetRequiredService<BooksDbContext>(),
        services.GetRequiredService<SocialDbContext>(),
        services.GetRequiredService<SearchDbContext>(),
        services.GetRequiredService<WalletDbContext>(),
        services.GetRequiredService<ManagementDbContext>(),
        services.GetRequiredService<ComplianceDbContext>(),
        services.GetRequiredService<InfrastructureDbContext>()
    };

    foreach (var context in contexts)
    {
        try 
        {
            // Npgsql için şemaları elle oluştur (EnsureCreated her zaman şemayı oluşturmayabilir)
            var schema = context.Model.GetDefaultSchema();
            if (!string.IsNullOrEmpty(schema))
            {
                // SQL-injection warning (EF1002) avoidance: Identifiers can't be parameterized, but we know schema is from model
                await context.Database.ExecuteSqlRawAsync("CREATE SCHEMA IF NOT EXISTS \"" + schema + "\";");
            }
            
            await context.Database.EnsureCreatedAsync();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[DB Init Error] {context.GetType().Name}: {ex.Message}");
        }
    }
    
    // Rollerimizi Oluşturalım
    await IdentityModuleExtensions.SeedRolesAsync(services);
}

// 5. Pipeline & Scalar UI
if (app.Environment.IsDevelopment() || true) 
{
    app.UseSwaggerGen(); 
    app.MapScalarApiReference(options =>
    {
        options.WithTitle("Epiknovel API")
               .WithTheme(ScalarTheme.Moon)
               .WithDefaultHttpClient(ScalarTarget.CSharp, ScalarClient.HttpClient)
               .HideModels()
               .WithOpenApiRoutePattern("/swagger/v1/swagger.json");
    });
}

app.UseSharedPipeline();

app.Run();