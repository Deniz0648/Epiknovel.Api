using Microsoft.Extensions.DependencyInjection;
using Epiknovel.Shared.Core.Services;
using FastEndpoints;
using FastEndpoints.Security;
using DotNetEnv;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using NetEscapades.AspNetCore.SecurityHeaders;
using Microsoft.AspNetCore.Http;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;
using Epiknovel.Shared.Infrastructure.Middleware;
using Epiknovel.Shared.Core.Interfaces;
using Epiknovel.Shared.Infrastructure.Services;
using Epiknovel.Shared.Infrastructure.Logging;
using Epiknovel.Shared.Core.Constants;
using Epiknovel.Shared.Infrastructure.Security;
using MediatR;
using FastEndpoints.Swagger;
using Epiknovel.Shared.Infrastructure.Monitoring;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using AutoMapper;
using Epiknovel.Shared.Infrastructure.Mapping;

namespace Epiknovel.Shared.Infrastructure;

public static class InfrastructureExtensions
{
    public static IServiceCollection AddSharedInfrastructure(this IServiceCollection services, string jwtSecret, string redisConn, string dbConn)
    {
        // 1. .env Yükleme ve Konteks Erişimi
        Env.Load();
        services.AddHttpContextAccessor();

        // 1.1 Performans: AutoMapper Entegrasyonu (Doğrudan paket üzerinden - 16.x syntax)
        services.AddAutoMapper(cfg => cfg.AddMaps(typeof(MappingProfile).Assembly));

        // 2. Performans: Yanıt Sıkıştırma (Gzip/Brotli)
        services.AddResponseCompression(options =>
        {
            options.EnableForHttps = true;
        });

        // 2. Canlılık İzlemesi (Health Checks)
        services.AddHealthChecks()
            .AddNpgSql(dbConn, name: "PostgreSQL")
            .AddRedis(redisConn, name: "Redis")
            .AddCheck<FileStorageHealthCheck>("FileStorage");

        // 2. Global Hata Yönetimi
        services.AddExceptionHandler<GlobalExceptionHandler>();
        services.AddProblemDetails();

        // 3. Auth & BOLA (IDOR) Kuralları
        services.AddAuthenticationJwtBearer(s => s.SigningKey = jwtSecret);
        services.AddAuthorization(o => {
            o.AddPolicy("BOLA", b => b.RequireAuthenticatedUser()); // İleri seviye BOLA için zemin hazır
        });

        // 4. Akıllı Rate Limiting (Sliding Window & Token Bucket)
        services.AddRateLimiter(o => {
            // Global Korum (Sabit Pencere)
            o.AddFixedWindowLimiter("GlobalPolicy", opt => {
                opt.Window = TimeSpan.FromSeconds(1);
                opt.PermitLimit = 10;
                opt.QueueLimit = 0;
            });

            // Hassas İşlemler (Sliding Window): Botları yorma algoritması
            o.AddSlidingWindowLimiter("StrictPolicy", opt => {
                opt.Window = TimeSpan.FromMinutes(1); // 1 Dakikalık pencere
                opt.SegmentsPerWindow = 6; // 10 saniyelik 6 segmente böl
                opt.PermitLimit = 5; // Dakikada max 5 işlem (Örn: Kitap oluşturma)
                opt.QueueLimit = 0;
            });
        });

        // 4. Dosya Yönetimi (Yerel Depolama) & Slug Sistemi & Email Yönetimi
        services.AddScoped<IFileService, LocalFileService>();
        services.AddScoped<ISlugService, SlugService>();
        services.AddScoped<IEmailService, ConsoleEmailService>();

        services.AddAuthorization(options =>
        {
            options.AddPolicy(PolicyNames.SuperAdminOnly, policy => policy.RequireRole(RoleNames.SuperAdmin));
            options.AddPolicy(PolicyNames.AdminAccess, policy => policy.RequireRole(RoleNames.SuperAdmin, RoleNames.Admin));
            options.AddPolicy(PolicyNames.ModAccess, policy => policy.RequireRole(RoleNames.SuperAdmin, RoleNames.Admin, RoleNames.Mod));
        });

        // 5. FastEndpoints & Redis & MediatR & OpenAPI
        services.AddFastEndpoints();
        services.SwaggerDocument(o => {
            o.DocumentSettings = s => {
                s.Title = "Epiknovel API";
                s.Version = "v1";
            };
        });
        
        var redisOptions = StackExchange.Redis.ConfigurationOptions.Parse(redisConn);
        redisOptions.AbortOnConnectFail = false; // Design-time (migration) veya geçici kesintilerde startup'ı patlatma
        
        var multiplexer = StackExchange.Redis.ConnectionMultiplexer.Connect(redisOptions);
        services.AddSingleton<StackExchange.Redis.IConnectionMultiplexer>(multiplexer);
        services.AddStackExchangeRedisCache(o => o.Configuration = redisConn);
        services.AddOutputCache();

        // 7. SignalR & Redis Backplane (Real-time haberleşme sistemi)
        services.AddSignalR()
                .AddStackExchangeRedis(redisConn, options => {
                    options.Configuration.AbortOnConnectFail = false;
                });

        // 6. Performans: Arka Plan İşlemleri (Background Audit Logging)
        services.AddSingleton<IBackgroundAuditQueue, BackgroundAuditQueue>();
        services.AddHostedService<BackgroundAuditWorker>();
        
        // MediatR: Tüm modülleri tarar (Modüler Monolit İletişimi)
        services.AddMediatR(cfg => cfg.RegisterServicesFromAssemblies(AppDomain.CurrentDomain.GetAssemblies()));

        return services;
    }

    public static IApplicationBuilder UseSharedPipeline(this IApplicationBuilder app)
    {
        // 0. Güvenlik: Cloudflare Bypass Koruması (Doğrudan IP erişimini engeller)
        app.UseMiddleware<DirectOriginAccessMiddleware>();

        // 1. Performans: Yanıt Sıkıştırma Hattı (En Başta Olmalı)
        app.UseResponseCompression();

        // Önemli: Hata yönetimi en başta olmalı!
        app.UseExceptionHandler(); 

        app.UseRouting(); // SignalR ve Endpoints için zorunlu

        app.UseAuthentication();
        app.UseAuthorization();
        
        app.UseRateLimiter(); // Brute force engelleme
        
        // 2. Canlılık İzlemesi (Uç nokta)
        app.UseHealthChecks("/health");

        app.UseStaticFiles(); // Yerel depolama için statik dosya sunumunu açıyoruz
        
        app.UseOutputCache(); // Performans artırma
        
        app.UseFastEndpoints(c => {
            c.Endpoints.RoutePrefix = "api";
            // Global Audit: [AuditLog] etiketi olan her endpoint otomatik mühürlenir
            c.Endpoints.Configurator = ep => {
                ep.PreProcessors(Order.Before, new BOLAValidationPreProcessor());
                ep.PostProcessors(Order.After, new GlobalAuditPostProcessor(app.ApplicationServices.GetRequiredService<IBackgroundAuditQueue>()));
            };
        });

        app.UseEndpoints(endpoints => 
        {
            endpoints.MapHub<Hubs.GlobalNotificationHub>("/hubs/notifications");
        });
        
        return app;
    }
}
