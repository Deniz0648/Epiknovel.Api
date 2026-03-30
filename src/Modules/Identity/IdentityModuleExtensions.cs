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
            options.UseNpgsql(connectionString));

        // 2. Identity Yapılandırması (Kullanıcının Özel Şifre Kuralları)
        services.AddIdentity<User, IdentityRole<Guid>>(options =>
        {
            // Şifre Kuralları: EN AZ 6 KARAKTER
            options.Password.RequireDigit = false;
            options.Password.RequiredLength = 6;
            options.Password.RequireNonAlphanumeric = false;
            options.Password.RequireUppercase = false;
            options.Password.RequireLowercase = false;
            
            // Email Kuralları
            options.User.RequireUniqueEmail = true;

            // Güvenlik: Token Ömürleri (Şifre Sıfırlama, Email Onay vb.)
            options.Tokens.PasswordResetTokenProvider = TokenOptions.DefaultProvider;
            options.Tokens.EmailConfirmationTokenProvider = TokenOptions.DefaultProvider;
        })
        .AddEntityFrameworkStores<IdentityDbContext>()
        .AddDefaultTokenProviders();

        services.AddScoped<IUserRoleProvider, Services.UserRoleProvider>();

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
                var existingUser = await userManager.FindByEmailAsync(item.Value);
                if (existingUser == null)
                {
                    var newUser = new User
                    {
                        Id = Guid.NewGuid(),
                        UserName = item.Value,
                        Email = item.Value,
                        EmailConfirmed = true,
                        DisplayName = $"{item.Key} Test",
                        CreatedAt = DateTime.UtcNow
                    };

                    var result = await userManager.CreateAsync(newUser, "Epik123!");
                    if (result.Succeeded)
                    {
                        await userManager.AddToRoleAsync(newUser, item.Key);
                        Console.WriteLine($"[Seed] Created {item.Key} Account: {item.Value}");
                    }
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Identity Seed Error]: {ex.Message}");
        }
    }
}
