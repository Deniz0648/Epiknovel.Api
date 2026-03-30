using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;

namespace Epiknovel.Modules.Identity.Data;

public class IdentityDbContextFactory : IDesignTimeDbContextFactory<IdentityDbContext>
{
    public IdentityDbContext CreateDbContext(string[] args)
    {
        DotNetEnv.Env.Load();
        
        var optionsBuilder = new DbContextOptionsBuilder<IdentityDbContext>();
        var connectionString = Environment.GetEnvironmentVariable("DB_CONNECTION") 
            ?? "Host=localhost;Database=epiknovel_db;Username=postgres;Password=password";

        optionsBuilder.UseNpgsql(connectionString);

        return new IdentityDbContext(optionsBuilder.Options);
    }
}
