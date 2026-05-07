using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Management.Data;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;

var services = new ServiceCollection();
var configuration = new ConfigurationBuilder()
    .AddJsonFile("appsettings.json", optional: true)
    .AddEnvironmentVariables()
    .Build();

var connectionString = Environment.GetEnvironmentVariable("DB_CONNECTION") ?? "Host=localhost;Database=epiknovel;Username=postgres;Password=postgres";

services.AddDbContext<ManagementDbContext>(options => options.UseNpgsql(connectionString));

using var sp = services.BuildServiceProvider();
using var scope = sp.CreateScope();
var db = scope.ServiceProvider.GetRequiredService<ManagementDbContext>();

var settings = await db.SystemSettings
    .Where(s => s.Key.StartsWith("SMTP_"))
    .ToListAsync();

foreach (var s in settings)
{
    Console.WriteLine($"{s.Key}: {s.Value}");
}
