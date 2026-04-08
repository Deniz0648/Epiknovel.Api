using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Books.Data;
using Epiknovel.Modules.Books.Services;
using Epiknovel.Shared.Core.Interfaces;
using Epiknovel.Shared.Infrastructure.Data.Interceptors;

namespace Epiknovel.Modules.Books;

public static class BooksModuleExtensions
{
    public static IServiceCollection AddBooksModule(this IServiceCollection services, string connectionString)
    {
        // 1. DbContext Kaydı
        services.AddDbContext<BooksDbContext>((sp, options) =>
            options.UseNpgsql(connectionString, x => 
                x.MigrationsHistoryTable("__EFMigrationsHistory", "books")
                 .EnableRetryOnFailure())
                 .ConfigureWarnings(w => w.Ignore(20100, 20605))
                 .AddInterceptors(sp.GetRequiredService<AuditInterceptor>())
                 .AddInterceptors(sp.GetRequiredService<SoftDeleteInterceptor>()));

        // 2. Background Workers (İstatistik Senkronizasyonu + Zamanlanmış Yayın + Outbox)
        services.AddHostedService<Epiknovel.Modules.Books.Workers.ChapterStatsSyncWorker>();
        services.AddHostedService<Epiknovel.Modules.Books.Workers.ScheduledPublishWorker>();
        services.AddHostedService<Epiknovel.Modules.Books.Workers.OutboxProcessorWorker>();

        // 3. Services Register
        services.AddScoped<IFileUsageProvider, BooksFileUsageProvider>();
        services.AddScoped<IBookSearchProvider, BookSearchProvider>();
        services.AddScoped<Epiknovel.Shared.Core.Interfaces.Books.IBookProvider, BookProvider>();
        services.AddScoped<Epiknovel.Shared.Core.Interfaces.Management.IManagementBookProvider, ManagementBookProvider>();
        
        return services;
    }

    /// <summary>
    /// Geliştirme ortamında veritabanı tablolarını otomatik oluşturur (Migrations).
    /// </summary>
    public static async Task MigrateBooksDatabaseAsync(IServiceProvider serviceProvider)
    {
        using var scope = serviceProvider.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<BooksDbContext>();
        
        // Önemli: Eğer Migration'lar henüz oluşmadıysa EnsureCreated() kullanılabilir 
        // ancak gerçek proje akışında MigrateAsync() önerilir.
        await dbContext.Database.MigrateAsync();
    }
}
