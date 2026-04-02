using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;
using Microsoft.AspNetCore.DataProtection;
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
using System.Security.Claims;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Authorization;

namespace Epiknovel.Shared.Infrastructure;

public static class InfrastructureExtensions
{
    public static IServiceCollection AddSharedInfrastructure(this IServiceCollection services, IConfiguration configuration, string redisConn, string dbConn)
    {
        // 1. .env Yükleme En Başta Olmalı
        Env.Load();
        
        // 🔐 Security Config (Strict .env Enforcement)
        var jwtSecret = Environment.GetEnvironmentVariable("JWT_SECRET") ?? configuration["JWT_SECRET"] 
            ?? throw new InvalidOperationException("CRITICAL: JWT_SECRET environment variable is missing!");
            
        var apiKey = Environment.GetEnvironmentVariable("API_KEY") ?? configuration["API_KEY"]
            ?? throw new InvalidOperationException("CRITICAL: API_KEY environment variable is missing!");

        var maskedSecret = jwtSecret.Length > 6 ? $"{jwtSecret[..3]}***{jwtSecret[^3..]}" : "***";
        Console.WriteLine($"[INFRA_STARTUP] JWT Secret loaded for validation: {maskedSecret}");
        Console.Out.Flush();
        services.AddHttpContextAccessor();

        // 1.1 Performans: AutoMapper Entegrasyonu (Doğrudan paket üzerinden - 16.x syntax)
        services.AddAutoMapper(cfg => cfg.AddMaps(typeof(MappingProfile).Assembly));

        // 1.2 Güvenlik: Veri Koruma (Docker Resetlerinde Oturum Kaybını Önler)
        services.AddDataProtection()
                .PersistKeysToFileSystem(new System.IO.DirectoryInfo("/app/Keys"));

        // 1.3 Güvenlik: CORS Politikası (Web Frontend'in API ile konuşabilmesi için)
        services.AddCors(options =>
        {
            options.AddPolicy("AllowAll", builder =>
            {
                builder.WithOrigins(
                           "https://localhost:3000", "http://localhost:3000",
                           "https://127.0.0.1:3000", "http://127.0.0.1:3000",
                           "https://localhost", "http://localhost",
                           "https://127.0.0.1", "http://127.0.0.1")
                       .AllowAnyMethod()
                       .AllowAnyHeader()
                       .AllowCredentials();
            });
        });


        // 2. Performans: Yanıt Sıkıştırma (Gzip/Brotli) ve Önbellekleme
        services.AddResponseCaching();
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
        services.Configure<ForwardedHeadersOptions>(options =>
        {
            options.ForwardedHeaders =
                ForwardedHeaders.XForwardedFor |
                ForwardedHeaders.XForwardedProto |
                ForwardedHeaders.XForwardedHost;
            options.KnownIPNetworks.Clear();
            options.KnownProxies.Clear();
        });

        // 2. Kimlik Doğrulama Katmanı (JWT)
        services.AddAuthentication(o => {
            o.DefaultScheme = "Bearer"; // Ana şema
            o.DefaultAuthenticateScheme = "Bearer";
            o.DefaultChallengeScheme = "Bearer";
        })
        .AddJwtBearer("Bearer", s => {
            s.RequireHttpsMetadata = false; // Docker içi HTTP iletişimi için
            s.SaveToken = true;
            
            s.TokenValidationParameters = new Microsoft.IdentityModel.Tokens.TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new Microsoft.IdentityModel.Tokens.SymmetricSecurityKey(System.Text.Encoding.UTF8.GetBytes(jwtSecret)),
                ValidateIssuer = false,
                ValidateAudience = false,
                ValidateLifetime = true,
                RequireExpirationTime = true,
                ClockSkew = TimeSpan.FromMinutes(10) // Daha fazla tolerans
            };
            
            // Token doğrulama ve mesaj alım logları
            s.Events = new Microsoft.AspNetCore.Authentication.JwtBearer.JwtBearerEvents
            {
                OnMessageReceived = context =>
                {
                    var authHeader = context.Request.Headers["Authorization"].FirstOrDefault();
                    if (!string.IsNullOrEmpty(authHeader))
                    {
                        // Manuel Yakalama (Fail-safe): Eğer kütüphane otomatik bulamazsa biz veriyoruz
                        if (authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
                        {
                            context.Token = authHeader.Substring("Bearer ".Length).Trim();
                            Console.WriteLine($"[AUTH_MANUAL] Token extracted manually for Path: {context.Request.Path}");
                        }
                        
                        Console.WriteLine($"[AUTH_DEBUG] Path: {context.Request.Path} | Header: {authHeader[..Math.Min(20, authHeader.Length)]}...");
                        Console.Out.Flush();
                    }

                    if (string.IsNullOrWhiteSpace(context.Token) &&
                        context.HttpContext.Request.Path.StartsWithSegments("/hubs/notifications"))
                    {
                        var queryToken = context.Request.Query["access_token"].FirstOrDefault();
                        if (!string.IsNullOrWhiteSpace(queryToken))
                        {
                            context.Token = queryToken;
                        }
                        else
                        {
                            var cookieToken = context.Request.Cookies["epiknovel_at"];
                            if (!string.IsNullOrWhiteSpace(cookieToken))
                            {
                                context.Token = cookieToken;
                            }
                        }
                    }

                    return Task.CompletedTask;
                },
                OnAuthenticationFailed = context =>
                {
                    Console.WriteLine($"[AUTH_FAILED] Path: {context.Request.Path} | Reason: {context.Exception.Message}");
                    var maskedSecret = jwtSecret.Length > 6 ? $"{jwtSecret[..3]}***{jwtSecret[^3..]}" : "***";
                    Console.WriteLine($"[AUTH_CONFIG] Secret: {maskedSecret}");
                    if (context.Exception.InnerException != null)
                        Console.WriteLine($"[AUTH_FAILED_INNER] {context.Exception.InnerException.Message}");
                    Console.Out.Flush();
                    return Task.CompletedTask;
                },
                OnTokenValidated = context =>
                {
                    var userId = context.Principal?.FindFirstValue(ClaimTypes.NameIdentifier);
                    Console.WriteLine($"[AUTH_SUCCESS] User: {userId} | Path: {context.Request.Path}");
                    Console.Out.Flush();
                    return Task.CompletedTask;
                }
            };
        });
        
        services.AddAuthorization(o => {
            o.AddPolicy("BOLA", b => b.RequireAuthenticatedUser());
        });

        // 4. Akıllı Rate Limiting (Sliding Window & Token Bucket)
        services.AddRateLimiter(o => {
            // Global Korum (Sabit Pencere)
            o.AddFixedWindowLimiter("GlobalPolicy", opt => {
                opt.Window = TimeSpan.FromSeconds(1);
                opt.PermitLimit = 10;
                opt.QueueLimit = 0;
            });

            // Yazma/kimlik gibi daha hassas endpoint'ler için sıkı limit
            o.AddFixedWindowLimiter("StrictPolicy", opt => {
                opt.Window = TimeSpan.FromSeconds(10);
                opt.PermitLimit = 10;
                opt.QueueLimit = 0;
            });

            // Sosyal Etkileşimler (Yorum, Beğeni): Dakikada 15 işlem
            o.AddFixedWindowLimiter("SocialPolicy", opt => {
                opt.Window = TimeSpan.FromMinutes(1);
                opt.PermitLimit = 15;
                opt.QueueLimit = 0;
            });

            // Okuma İlerlemesi: Kullanıcıyı yormayan, sunucuyu koruyan debounce (10 saniyede bir)
            o.AddFixedWindowLimiter("ProgressPolicy", opt => {
                opt.Window = TimeSpan.FromSeconds(10);
                opt.PermitLimit = 1;
                opt.QueueLimit = 0;
            });
        });

        // 4. Dosya Yönetimi (Yerel Depolama) & Slug Sistemi & Email Yönetimi
        services.AddScoped<IFileService, LocalFileService>();
        services.AddScoped<ISlugService, SlugService>();
        services.AddScoped<IEmailService, ConsoleEmailService>();
        services.AddScoped<IPermissionService, PermissionService>();
        services.AddScoped<IAuthorizationHandler, PermissionAuthorizationHandler>();

        services.AddAuthorization(options =>
        {
            options.AddPolicy(PolicyNames.AuthorPanelAccess, policy => policy
                .RequireAuthenticatedUser()
                .AddRequirements(new PermissionRequirement(PermissionNames.AccessAuthorPanel)));
            options.AddPolicy(PolicyNames.AuthorContentAccess, policy => policy
                .RequireAuthenticatedUser()
                .AddRequirements(new PermissionRequirement(PermissionNames.CreateBook)));
            options.AddPolicy(PolicyNames.SuperAdminOnly, policy => policy
                .RequireAuthenticatedUser()
                .AddRequirements(new PermissionRequirement(PermissionNames.SuperAdminAccess)));
            options.AddPolicy(PolicyNames.AdminAccess, policy => policy
                .RequireAuthenticatedUser()
                .AddRequirements(new PermissionRequirement(PermissionNames.AdminAccess)));
            options.AddPolicy(PolicyNames.ModAccess, policy => policy
                .RequireAuthenticatedUser()
                .AddRequirements(new PermissionRequirement(PermissionNames.ModerateContent)));
        });

        // 5. FastEndpoints & Redis & MediatR & OpenAPI
        services.AddFastEndpoints();
        services.SwaggerDocument(o => {
            o.DocumentSettings = s => {
                s.Title = "Epiknovel API";
                s.Version = "v1";
                s.AddSecurity("Bearer", new NSwag.OpenApiSecurityScheme
                {
                    Type = NSwag.OpenApiSecuritySchemeType.Http,
                    Scheme = "Bearer",
                    BearerFormat = "JWT",
                    Description = "Lütfen JWT tokenınızı buraya yapıştırın (Bearer öneki otomatik eklenir).",
                    In = NSwag.OpenApiSecurityApiKeyLocation.Header
                });

                // 📚 Endpoint Sıralama Mantığı (Metodlara Göre: GET, POST, PUT, DELETE)
                s.PostProcess = doc =>
                {
                    var sortedPaths = doc.Paths
                        .OrderBy(p => p.Key) // Önce alfabetik yol
                        .ToList();

                    // Not: NSwag'de Paths bir sözlüktür (Dictionary), 
                    // sıralamayı korumak için sözlüğü temizleyip sıralı eklemeliyiz.
                    doc.Paths.Clear();
                    
                    // Metod ağırlıkları (Sıralama önceliği)
                    var methodOrder = new Dictionary<string, int>
                    {
                        { "get", 1 },
                        { "post", 2 },
                        { "put", 3 },
                        { "patch", 4 },
                        { "delete", 5 }
                    };

                    foreach (var path in sortedPaths)
                    {
                        doc.Paths.Add(path.Key, path.Value);
                    }
                };
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
        services.AddMediatR(cfg => {
            cfg.RegisterServicesFromAssemblies(AppDomain.CurrentDomain.GetAssemblies());
            
            // LuckyPenny MediatR Lisans Yapılandırması
            var mediatrLicense = Environment.GetEnvironmentVariable("MEDIATR_LICENSE_KEY") ?? configuration["MEDIATR_LICENSE_KEY"];
            if (!string.IsNullOrEmpty(mediatrLicense))
            {
                cfg.LicenseKey = mediatrLicense;
            }
        });

        // 5. Görsel İşleme (Arka Plan WebP Dönüştürücü)
        services.AddSingleton<Background.IImageProcessingQueue, Background.ImageProcessingQueue>();
        services.AddHostedService<Background.ImageProcessingWorker>();

        return services;
    }

    public static IApplicationBuilder UseSharedPipeline(this IApplicationBuilder app)
    {
        app.UseForwardedHeaders();

        // 1. Kimlik Doğrulama (En Başta)
        app.UseAuthentication();

        // 1.1 JWT Revocation (Redis Blacklist Kontrolü)
        // Her istekte JTI'nın Redis kara listesinde olup olmadığı taranır.
        app.UseMiddleware<Epiknovel.Shared.Infrastructure.Middleware.TokenRevocationMiddleware>();

        // 2. Global Request Tracker (Ham istekleri izler) - Auth den sonra olmalı ki User'ı görelim
        app.Use(async (context, next) => {
            if (context.Request.Path.Value?.StartsWith("/api") == true)
            {
                var auth = context.Request.Headers["Authorization"].FirstOrDefault();
                Console.WriteLine($"[REQUEST_TRACE] Path: {context.Request.Path} | Auth: {(string.IsNullOrEmpty(auth) ? "YOK" : auth[..Math.Min(15, auth.Length)] + "...")}");
                Console.Out.Flush();
            }
            await next();
        });

        // 1. Güvenlik: Security Headers (CSP, XSS, HSTS)
        app.UseSecurityHeaders(new HeaderPolicyCollection()
            .AddDefaultSecurityHeaders()
            .AddContentSecurityPolicy(builder =>
            {
                builder.AddDefaultSrc().Self();
                builder.AddImgSrc().Self().Data().From("https://epiknovel.com").From("*.s3.amazonaws.com").From("localhost:*").From("http://localhost:*");
                builder.AddStyleSrc().Self().UnsafeInline().From("https://fonts.googleapis.com").From("https://cdn.jsdelivr.net");
                builder.AddFontSrc().Self().Data().From("https://fonts.gstatic.com").From("https://cdn.jsdelivr.net");
                builder.AddScriptSrc().Self().UnsafeInline().From("https://cdn.jsdelivr.net").From("https://api.scalar.com");
                builder.AddConnectSrc().Self().From("https://localhost:*").From("http://localhost:*").From("wss://localhost:*").From("ws://localhost:*").From("https://api.scalar.com");
                builder.AddFrameAncestors().None();
            })
            .AddCustomHeader("X-Content-Type-Options", "nosniff")
            .RemoveServerHeader());

        // 1.1 Güvenlik: Cloudflare Bypass Koruması (Doğrudan IP erişimini engeller)
        app.UseMiddleware<DirectOriginAccessMiddleware>();

        // 2. Performans ve Güvenlik Middleware'leri
        app.UseCors("AllowAll"); // Kimlik doğrulamadan önce CORS gelmelidir
        app.UseResponseCompression();
        app.UseExceptionHandler(); 
        app.UseStaticFiles();

        app.UseRouting();

        // 3. Yetkilendirme Katmanı (Routing'den hemen sonra)
        app.UseAuthorization();
        app.UseResponseCaching();
        app.UseRateLimiter();
        
        // 4. Servisler ve Endpoints
        app.UseHealthChecks("/health");
        app.UseOutputCache();
        
        app.UseFastEndpoints(c => {
            c.Endpoints.RoutePrefix = "api";
            c.Endpoints.Configurator = ep => {
                ep.PreProcessors(Order.Before, new JwtBlacklistPreProcessor(app.ApplicationServices.GetRequiredService<StackExchange.Redis.IConnectionMultiplexer>()));
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
