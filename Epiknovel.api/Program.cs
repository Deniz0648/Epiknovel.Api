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

// 2. Modüllerin Kaydı
builder.Services.AddIdentityModule(dbConn);
builder.Services.AddUsersModule(dbConn);
builder.Services.AddBooksModule(dbConn);
builder.Services.AddComplianceModule(dbConn);
builder.Services.AddInfrastructureModule(dbConn);
builder.Services.AddSocialModule(dbConn);
builder.Services.AddSearchModule(dbConn);
builder.Services.AddWalletModule(dbConn);
builder.Services.AddManagementModule(dbConn);

// 2.1 Altyapının Kaydı (Tüm modüllerden sonra olmalı ki Auth ayarları ezilmesin)
builder.Services.AddSharedInfrastructure(builder.Configuration, redisConn, dbConn);

// 3. FastEndpoints (Açık Montaj Taraması - Modüler Monolith için en güvenli yöntem)
builder.Services.AddFastEndpoints(o =>
{
    o.Assemblies = new[]
    {
        typeof(Epiknovel.Modules.Identity.IdentityModuleExtensions).Assembly,
        typeof(Epiknovel.Modules.Users.UsersModuleExtensions).Assembly,
        typeof(Epiknovel.Modules.Books.BooksModuleExtensions).Assembly,
        typeof(Epiknovel.Modules.Social.SocialModuleExtensions).Assembly,
        typeof(Epiknovel.Modules.Infrastructure.InfrastructureModuleExtensions).Assembly,
        typeof(Epiknovel.Modules.Management.ManagementModuleExtensions).Assembly,
        typeof(Epiknovel.Modules.Compliance.ComplianceModuleExtensions).Assembly,
        typeof(Epiknovel.Modules.Search.SearchModuleExtensions).Assembly,
        typeof(Epiknovel.Modules.Wallet.WalletModuleExtensions).Assembly,
        typeof(Epiknovel.Shared.Infrastructure.InfrastructureExtensions).Assembly

    };
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

    Console.WriteLine($"[DB INIT] Running in environment: {app.Environment.EnvironmentName}");

    foreach (var context in contexts)
    {
        var contextName = context.GetType().Name;
        try 
        {
            var schema = context.Model.GetDefaultSchema() ?? "public";
            Console.WriteLine($"[DB INIT] Processing {contextName} (Schema: {schema})...");

            // Use raw string formatting for schema creation (safe as schema names are controlled)
            #pragma warning disable EF1002
            await context.Database.ExecuteSqlRawAsync($"CREATE SCHEMA IF NOT EXISTS \"{schema}\";");
            #pragma warning restore EF1002

            // 🚀 Otomatik Migration Uygulama 🚀
            await context.Database.MigrateAsync();
            Console.WriteLine($"[DB INIT] {contextName} migrated successfully.");
        }
        catch (Exception ex)
        {
             Console.WriteLine($"[DB GLOBAL ERROR] {contextName}: {ex.Message}");
        }
    }
    
    // Rollerimizi ve Şablonlarımızı Oluşturalım
    try {
        await IdentityModuleExtensions.SeedRolesAsync(services);
        await ManagementModuleExtensions.SeedTemplatesAsync(services);
    } catch (Exception ex) {
        Console.WriteLine($"[DB SEED ERROR]: {ex.Message}");
    }
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
               .SortOperationsByMethod()
               .SortTagsAlphabetically()
               .WithOpenApiRoutePattern("/swagger/v1/swagger.json");
    });
}

app.UseSharedPipeline();

// Real-time Support Module Map
app.MapHub<Epiknovel.Modules.Management.Hubs.SupportTicketHub>("/hubs/support");

app.Run();