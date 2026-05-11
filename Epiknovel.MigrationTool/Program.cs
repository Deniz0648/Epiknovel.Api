using System.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;
using Epiknovel.Modules.Identity.Data;
using Epiknovel.Modules.Users.Data;
using Epiknovel.Modules.Books.Data;
using Epiknovel.Modules.Social.Data;
using Epiknovel.Modules.Search.Data;
using Epiknovel.Modules.Wallet.Data;
using Epiknovel.Modules.Management.Data;
using Epiknovel.Modules.Compliance.Data;
using Epiknovel.Modules.Infrastructure.Data;
using Epiknovel.Modules.Identity;
using Epiknovel.Modules.Users;
using Epiknovel.Modules.Books;
using Epiknovel.Modules.Compliance;
using Epiknovel.Modules.Infrastructure;
using Epiknovel.Modules.Social;
using Epiknovel.Modules.Search;
using Epiknovel.Modules.Wallet;
using Epiknovel.Modules.Management;
using Epiknovel.Shared.Infrastructure;
using Npgsql;

Console.WriteLine("🚀 Epiknovel COMPREHENSIVE MIGRATION Tool starting...");

// --- 🛠️ MIGRATION CONTROL FLAGS ---
bool applyPendingMigrations = true; 
bool resetDatabase = false; 
bool migrateIdentityAndUsers = false; // Already done (Users and UserProfiles)
bool migrateRoles = true;            // 🔑 NEW: For role assignments
bool migrateBooks = false;
bool migrateInfrastructure = false; 
bool migrateWallet = false;
bool initializeNotificationPreferences = true; 
bool runSecurityMaintenance = true;
// ----------------------------------

// 1. .env Load
DotNetEnv.Env.Load(".env");

// 2. Configuration & DB Connection
var dbConn = Environment.GetEnvironmentVariable("DB_CONNECTION") 
    ?? "Host=localhost;Database=epiknovel_db;Username=admin;Password=60J4nqvSLEMm1rEfTLcjUnn/PPdnYX24j29uXYs0NuQ=";
dbConn = dbConn.Replace("Host=epiknovel_db", "Host=localhost");

var sourceDbConn = "Host=localhost;Port=5433;Database=postgres;Username=postgres;Password=migration_pass";

// 🛡️ HARDENING: Npgsql & PostgreSQL 17 Compatibility Switches
AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);
AppContext.SetSwitch("Npgsql.DisableDateTimeInfinityConversions", true);

// 3. Service Collection setup
var services = new ServiceCollection();
var configuration = new ConfigurationBuilder().AddEnvironmentVariables().Build();
services.AddSingleton<IConfiguration>(configuration);
services.AddLogging();
var redisConn = Environment.GetEnvironmentVariable("REDIS_CONNECTION") ?? "localhost:6379";
services.AddSharedInfrastructure(configuration, redisConn, dbConn);
services.AddIdentityModule(dbConn);
services.AddUsersModule(dbConn);
services.AddBooksModule(dbConn);
services.AddComplianceModule(dbConn);
services.AddInfrastructureModule(dbConn);
services.AddSocialModule(dbConn);
services.AddSearchModule(dbConn);
services.AddWalletModule(dbConn);
services.AddManagementModule(dbConn);
var serviceProvider = services.BuildServiceProvider();

// 4. Run Migrations & Reset
if (applyPendingMigrations || resetDatabase)
{
    Console.WriteLine("\n[PHASE 1] 🛠️ Applying Migrations...");
    using (var scope = serviceProvider.CreateScope())
    {
        var identityContext = scope.ServiceProvider.GetRequiredService<IdentityDbContext>();
        
        if (resetDatabase) {
             var schemasToDrop = new[] { "identity", "users", "books", "social", "search", "wallet", "management", "compliance", "infrastructure" };
             foreach (var sc in schemasToDrop) {
                 Console.WriteLine($"   [DROP] Dropping schema {sc}...");
                 await identityContext.Database.ExecuteSqlRawAsync($"DROP SCHEMA IF EXISTS \"{sc}\" CASCADE;");
             }
        }

        var contexts = new List<DbContext> {
            identityContext,
            scope.ServiceProvider.GetRequiredService<UsersDbContext>(),
            scope.ServiceProvider.GetRequiredService<BooksDbContext>(),
            scope.ServiceProvider.GetRequiredService<SocialDbContext>(),
            scope.ServiceProvider.GetRequiredService<SearchDbContext>(),
            scope.ServiceProvider.GetRequiredService<WalletDbContext>(),
            scope.ServiceProvider.GetRequiredService<ManagementDbContext>(),
            scope.ServiceProvider.GetRequiredService<ComplianceDbContext>(),
            scope.ServiceProvider.GetRequiredService<InfrastructureDbContext>()
        };

        foreach (var context in contexts) {
            var schema = context.Model.GetDefaultSchema() ?? "public";
            Console.WriteLine($"   -> Migrating Schema: {schema}");
            await context.Database.ExecuteSqlRawAsync($"CREATE SCHEMA IF NOT EXISTS \"{schema}\";");
            await context.Database.MigrateAsync();
        }
    }
}

// 5. DATA MIGRATION PHASE
Console.WriteLine("\n--- [PHASE 2] 📦 DATA MIGRATION ---");

async Task MigrateTable(string sourceTable, string targetSchema, string targetTable, string[] sourceColumns, string[] targetColumns, Func<NpgsqlDataReader, object[]> mapper, string customSourceSql = null)
{
    Console.WriteLine($"\n[SYNC] {sourceTable} -> {targetSchema}.{targetTable}");
    using var sConn = new NpgsqlConnection(sourceDbConn);
    using var tConn = new NpgsqlConnection(dbConn);
    await sConn.OpenAsync();
    await tConn.OpenAsync();

    var sCmdSql = customSourceSql;
    if (string.IsNullOrEmpty(sCmdSql))
    {
        var sColList = string.Join(", ", sourceColumns.Select(c => $"\"{c}\""));
        sCmdSql = $"SELECT {sColList} FROM \"{sourceTable}\"";
    }
    
    using var sCmd = new NpgsqlCommand(sCmdSql, sConn);
    using var reader = await sCmd.ExecuteReaderAsync();

    var tColList = string.Join(", ", targetColumns.Select(c => $"\"{c}\""));
    int count = 0;
    HashSet<string> seenIds = new HashSet<string>();

    while (await reader.ReadAsync())
    {
        var values = mapper(reader);
        
        // Composite Key support for HashSet (UserId + RoleId)
        string compositeKey = string.Join("|", values.Take(Math.Min(values.Length, 2)));
        if (seenIds.Contains(compositeKey)) continue;
        seenIds.Add(compositeKey);

        var placeholders = string.Join(", ", Enumerable.Range(0, values.Length).Select(i => $"@{i}"));
        using var tCmd = new NpgsqlCommand($"INSERT INTO \"{targetSchema}\".\"{targetTable}\" ({tColList}) VALUES ({placeholders})", tConn);
        for (int i = 0; i < values.Length; i++)
        {
            tCmd.Parameters.AddWithValue($"@{i}", values[i] ?? DBNull.Value);
        }
        
        try {
            await tCmd.ExecuteNonQueryAsync();
        } catch (PostgresException ex) when (ex.SqlState == "23505") {
            continue;
        }

        count++;
        if (count % 1000 == 0) Console.Write($"\r   -> Migrated: {count} rows...");
    }
    Console.WriteLine($"\r   ✅ SUCCESS: {count} total rows migrated.");
}

Guid IntToGuid(int value)
{
    byte[] bytes = new byte[16];
    BitConverter.GetBytes(value).CopyTo(bytes, 0);
    return new Guid(bytes);
}

string Sanitize(string? val, string? emailFallback)
{
    if (string.IsNullOrWhiteSpace(val) || val.Contains("@"))
    {
        if (!string.IsNullOrWhiteSpace(emailFallback))
        {
            var parts = emailFallback.Split('@');
            return parts[0].Replace(".", "-").Replace("+", "-");
        }
        return "User_" + Guid.NewGuid().ToString("N").Substring(0, 8);
    }
    return val;
}

// 5.1 Roles
if (migrateRoles)
{
    await MigrateTable("AspNetRoles", "identity", "Roles", 
        new[] { "Id", "Name", "NormalizedName", "ConcurrencyStamp" },
        new[] { "Id", "Name", "NormalizedName", "ConcurrencyStamp" },
        r => new object[] { r[0], r[1], r[2], r[3] });

    await MigrateTable("AspNetUserRoles", "identity", "UserRoles", 
        new[] { "UserId", "RoleId" },
        new[] { "UserId", "RoleId" },
        r => new object[] { r[0], r[1] });
}

// 5.2 Identity & Users
if (migrateIdentityAndUsers)
{
    // ... (Already implemented blocks)
}

// 🔔 SPECIAL: Initialize Notification Preferences
if (initializeNotificationPreferences)
{
    Console.WriteLine("\n[NOTIFY] Initializing Notification Preferences for all users...");
    using (var scope = serviceProvider.CreateScope())
    {
        var context = scope.ServiceProvider.GetRequiredService<UsersDbContext>();
        var userIds = await context.UserProfiles.Select(p => p.UserId).ToListAsync();
        
        int nCreated = 0;
        foreach (var userId in userIds)
        {
            var exists = await context.NotificationPreferences.AnyAsync(p => p.UserId == userId);
            if (!exists)
            {
                context.NotificationPreferences.Add(new Epiknovel.Modules.Users.Domain.NotificationPreference {
                    UserId = userId,
                    EmailMarketing = true,
                    EmailOnNewChapter = true,
                    EmailOnNewComment = true,
                    EmailOnNewReview = true,
                    PushOnNewChapter = true,
                    PushOnNewComment = true,
                    PushOnNewReview = true
                });
                nCreated++;
            }
        }
        await context.SaveChangesAsync();
        Console.WriteLine($"   ✅ Created default preferences for {nCreated} users.");
    }
}

// 7. Password Reset for Admin
if (runSecurityMaintenance)
{
    Console.WriteLine("\n[PHASE 3] 🔐 Security maintenance...");
    using (var scope = serviceProvider.CreateScope())
    {
        var context = scope.ServiceProvider.GetRequiredService<IdentityDbContext>();
        var user = await context.Users.FirstOrDefaultAsync(u => u.Email == "admin@epiknovel.com");
        if (user != null)
        {
            var hasher = new Microsoft.AspNetCore.Identity.PasswordHasher<Epiknovel.Modules.Identity.Domain.User>();
            user.PasswordHash = hasher.HashPassword(user, "EpikNovel123!");
            await context.SaveChangesAsync();
            Console.WriteLine("   ✅ Administrator (admin@epiknovel.com) password reset to: EpikNovel123!");
        }
    }
}

Console.WriteLine("\n🎉 COMPLETE RE-MIGRATION SUCCESSFUL!");
Console.WriteLine("--------------------------------------------------");
Console.WriteLine("Ready for production use. Check logs for details.");
