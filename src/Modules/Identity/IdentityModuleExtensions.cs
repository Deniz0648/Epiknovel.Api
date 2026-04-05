using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Identity.Data;
using Epiknovel.Modules.Identity.Domain;
using Epiknovel.Shared.Core.Constants;
using Epiknovel.Shared.Core.Interfaces;
using Epiknovel.Shared.Infrastructure.Data.Interceptors;

namespace Epiknovel.Modules.Identity;

public static class IdentityModuleExtensions
{
    public static IServiceCollection AddIdentityModule(this IServiceCollection services, string connectionString)
    {
        // 1. DbContext Kaydı
        services.AddDbContext<IdentityDbContext>((sp, options) =>
            options.UseNpgsql(connectionString, x => 
                x.MigrationsHistoryTable("__EFMigrationsHistory", "identity")
                 .EnableRetryOnFailure())
                 .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning))
                 .AddInterceptors(sp.GetRequiredService<AuditInterceptor>()));

        // 2. Identity Yapılandırması (Kullanıcının Özel Şifre Kuralları)
        services.AddIdentityCore<User>(options =>
        {
            options.Password.RequireDigit = true;
            options.Password.RequiredLength = 8;
            options.Password.RequireNonAlphanumeric = true;
            options.Password.RequireUppercase = true;
            options.Password.RequireLowercase = true;
            
            options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
            options.Lockout.MaxFailedAccessAttempts = 5;
            options.Lockout.AllowedForNewUsers = true;

            options.User.RequireUniqueEmail = true;
        })
        .AddRoles<IdentityRole<Guid>>()
        .AddSignInManager()
        .AddEntityFrameworkStores<IdentityDbContext>()
        .AddDefaultTokenProviders();

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
                if (!await roleManager.RoleExistsAsync(item.Key))
                {
                    Console.WriteLine($"[Seed] Creating role: {item.Key}");
                    await roleManager.CreateAsync(new IdentityRole<Guid>(item.Key));
                }

                var user = await userManager.FindByEmailAsync(item.Value);
                if (user == null)
                {
                    Console.WriteLine($"[Seed] Creating user: {item.Value} with role {item.Key}");
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
                        Console.WriteLine($"[Seed] Success for {item.Value}");
                    }
                }

                if (user != null)
                {
                    await mediator.Publish(new Epiknovel.Shared.Core.Events.UserRegisteredEvent(user.Id, user.Email!, user.DisplayName), CancellationToken.None);
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Identity Seed Error]: {ex.Message}");
            throw; // Re-throw to be caught by Program.cs
        }
    }
}
