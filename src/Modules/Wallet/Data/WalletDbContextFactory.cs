using DotNetEnv;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Epiknovel.Modules.Wallet.Data;

public class WalletDbContextFactory : IDesignTimeDbContextFactory<WalletDbContext>
{
    public WalletDbContextFactory()
    {
        // Parameterless constructor required by EF Core CLI
    }

    public WalletDbContext CreateDbContext(string[] args)
    {
        // 1. Solution kök dizinindeki .env dosyasını bulmaya çalışır (Development)
        var envPath = Path.Combine(Directory.GetCurrentDirectory(), "..", "..", "..", ".env");
        if (File.Exists(envPath))
        {
            Env.Load(envPath);
        }
        else
        {
            Env.Load(); // Mevcut dizinde varsa
        }

        // 2. Ortam değişkenlerinden DB_CONNECTION al
        string connectionString = Environment.GetEnvironmentVariable("DB_CONNECTION") 
                                  ?? "Host=localhost;Database=epiknovel_db;Username=postgres;Password=password";

        // 3. DbContext Opsiyonlarını Oluştur
        var optionsBuilder = new DbContextOptionsBuilder<WalletDbContext>();
        optionsBuilder.UseNpgsql(connectionString);

        return new WalletDbContext(optionsBuilder.Options);
    }
}
