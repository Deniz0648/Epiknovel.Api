using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Books.Data;
using Epiknovel.Modules.Books.Services;
using Epiknovel.Shared.Core.Interfaces;

namespace Epiknovel.Modules.Books;

public static class BooksModuleExtensions
{
    public static IServiceCollection AddBooksModule(this IServiceCollection services, string connectionString)
    {
        // 1. DbContext Kaydı
        services.AddDbContext<BooksDbContext>(options =>
            options.UseNpgsql(connectionString));

        // 2. Background Workers (İstatistik Senkronizasyonu)
        services.AddHostedService<Epiknovel.Modules.Books.Workers.ChapterStatsSyncWorker>();

        // 3. Services Register
        services.AddScoped<IFileUsageProvider, BooksFileUsageProvider>();
        services.AddScoped<IBookSearchProvider, BookSearchProvider>();
        services.AddScoped<Epiknovel.Shared.Core.Interfaces.Books.IBookProvider, BookProvider>();
        
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
