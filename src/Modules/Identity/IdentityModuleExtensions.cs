using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Identity.Data;
using Epiknovel.Modules.Identity.Domain;
using Epiknovel.Shared.Core.Constants;
using Epiknovel.Shared.Core.Interfaces;

namespace Epiknovel.Modules.Identity;

public static class IdentityModuleExtensions
{
    public static IServiceCollection AddIdentityModule(this IServiceCollection services, string connectionString)
    {
        // 1. DbContext Kaydı
        services.AddDbContext<IdentityDbContext>(options =>
            options.UseNpgsql(connectionString, x => x.MigrationsHistoryTable("__EFMigrationsHistory", "identity")));

        // 2. Identity Yapılandırması (Kullanıcının Özel Şifre Kuralları)
        // Not: AddIdentity yerine AddIdentityCore kullanıyoruz ki Default Authentication Scheme'i (Bearer) ezmesin.
        services.AddIdentityCore<User>(options =>
        {
            // Şifre Kuralları (Security Hardening)
            options.Password.RequireDigit = true;
            options.Password.RequiredLength = 8;
            options.Password.RequireNonAlphanumeric = true;
            options.Password.RequireUppercase = true;
            options.Password.RequireLowercase = true;
            
            // Hesap Kilitleme (Brute-force Koruması)
            options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
            options.Lockout.MaxFailedAccessAttempts = 5;
            options.Lockout.AllowedForNewUsers = true;

            // Email Kuralları
            options.User.RequireUniqueEmail = true;
        })
        .AddRoles<IdentityRole<Guid>>() // Rol desteği için manuel ekliyoruz
        .AddSignInManager() // Login endpointinde ihtiyaç duyulan SignInManager'ı ekliyoruz
        .AddEntityFrameworkStores<IdentityDbContext>()
        .AddDefaultTokenProviders();

        // API'nin 302 (Redirect) yerine 401 dönmesini sağlıyoruz
        services.ConfigureApplicationCookie(options =>
        {
            options.Events.OnRedirectToLogin = context =>
            {
                context.Response.StatusCode = 401;
                return Task.CompletedTask;
            };
            options.Events.OnRedirectToAccessDenied = context =>
            {
                context.Response.StatusCode = 403;
                return Task.CompletedTask;
            };
        });

        services.AddScoped<IUserRoleProvider, Services.UserRoleProvider>();
        services.AddScoped<IUserAccountProvider, Services.UserRoleProvider>();
        services.AddScoped<IAuthStateService, Services.AuthStateService>();
        services.AddScoped<Epiknovel.Shared.Core.Interfaces.Management.IManagementUserProvider, Services.ManagementUserProvider>();

        // Token Ömürlerini Global Olarak Yapılandırıyoruz (3 Saat Standart)
        services.Configure<DataProtectionTokenProviderOptions>(options =>
        {
            options.TokenLifespan = TimeSpan.FromHours(3);
        });

        return services;
    }

    public static async Task SeedRolesAsync(IServiceProvider serviceProvider)
    {
        using var scope = serviceProvider.CreateScope();
        var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole<Guid>>>();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<User>>();
        var mediator = scope.ServiceProvider.GetRequiredService<MediatR.IMediator>();

        // Rol ve Email Eşleşmeleri
        var seedData = new Dictionary<string, string>
        {
            { RoleNames.SuperAdmin, "admin@epiknovel.com" },
            { RoleNames.Admin, "staff@epiknovel.com" },
            { RoleNames.Mod, "mod@epiknovel.com" },
            { RoleNames.Author, "author@epiknovel.com" },
            { RoleNames.User, "user@epiknovel.com" }
        };

        try 
        {
            foreach (var item in seedData)
            {
                // 1. Rolü oluştur (Yoksa)
                if (!await roleManager.RoleExistsAsync(item.Key))
                {
                    await roleManager.CreateAsync(new IdentityRole<Guid>(item.Key));
                }

                // 2. Kullanıcıyı oluştur (Yoksa)
                var user = await userManager.FindByEmailAsync(item.Value);
                if (user == null)
                {
                    user = new User
                    {
                        Id = Guid.NewGuid(),
                        UserName = item.Value,
                        Email = item.Value,
                        EmailConfirmed = true,
                        DisplayName = $"{item.Key} Test",
                        CreatedAt = DateTime.UtcNow
                    };

                    var result = await userManager.CreateAsync(user, "Epik123!");
                    if (result.Succeeded)
                    {
                        await userManager.AddToRoleAsync(user, item.Key);
                        Console.WriteLine($"[Seed] Created {item.Key} Account: {item.Value}");
                    }
                }

                // 3. Modüller Arası Verileri Kontrol Et ve Oluştur (Event Üzerinden)
                if (user != null)
                {
                    // Not: Seed sırasında senkron çalışması için Publish'i bekliyoruz.
                    // Bu event Users ve Wallet modülleri tarafından yakalanıp verileri oluşturacaktır.
                    await mediator.Publish(new Epiknovel.Shared.Core.Events.UserRegisteredEvent(user.Id, user.Email!, user.DisplayName), CancellationToken.None);
                    
                    Console.WriteLine($"[Seed] Cross-module setup triggered for {item.Value}");
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Identity Seed Error]: {ex.Message}");
        }
    }
}
