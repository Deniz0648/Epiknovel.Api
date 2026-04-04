using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;

namespace Epiknovel.Modules.Search.Data;

public class SearchDbContextFactory : IDesignTimeDbContextFactory<SearchDbContext>
{
    public SearchDbContext CreateDbContext(string[] args)
    {
        // 1. .env dosyasını oku (Yerel geliştirmede şifreleri buradan alır)
        DotNetEnv.Env.Load();

        var optionsBuilder = new DbContextOptionsBuilder<SearchDbContext>();

        // 2. Önce Environment Variable'danoku, yoksa varsayılanı kullan (Güvenlik Hardening)
        var connectionString = Environment.GetEnvironmentVariable("DB_CONNECTION") 
                               ?? "Host=localhost;Database=epiknovel_db;Username=postgres;Password=password";

        optionsBuilder.UseNpgsql(connectionString, x => x.EnableRetryOnFailure());

        return new SearchDbContext(optionsBuilder.Options);
    }
}
