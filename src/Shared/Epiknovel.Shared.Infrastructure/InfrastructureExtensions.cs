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
using Epiknovel.Shared.Core.Interfaces.SignalR;
using Epiknovel.Shared.Infrastructure.Services;
using Epiknovel.Shared.Infrastructure.Logging;
using Epiknovel.Shared.Infrastructure.Security;
using Epiknovel.Shared.Infrastructure.Data.Interceptors;
using Epiknovel.Shared.Core.Constants;
using Epiknovel.Shared.Core.Events;
using MediatR;
using FastEndpoints.Swagger;
using Epiknovel.Shared.Infrastructure.Monitoring;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.OutputCaching;
using AutoMapper;
using Epiknovel.Shared.Infrastructure.Mapping;
using System.Security.Claims;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Authorization;
using Polly;
using Polly.Retry;
using Microsoft.Extensions.Resilience;
using OpenTelemetry.Trace;
using OpenTelemetry.Resources;

namespace Epiknovel.Shared.Infrastructure;

public static class InfrastructureExtensions
{
    public static IServiceCollection AddSharedInfrastructure(this IServiceCollection services, IConfiguration configuration, string redisConn, string dbConn)
    {
        // 1. .env Yükleme En Başta Olmalı
        Env.Load();
        
        // 🔐 Security Config (Strict .env Enforcement)
        var jwtSecret = Environment.GetEnvironmentVariable("JWT_SECRET") ?? configuration["JWT_SECRET"] 
            ?? "epiknovel-super-secret-development-key-2026"; // Fallback for Design-Time
            
        var apiKey = Environment.GetEnvironmentVariable("API_KEY") ?? configuration["API_KEY"]
            ?? "epik-dev-api-key"; // Fallback for Design-Time

        var maskedSecret = jwtSecret.Length > 6 ? $"{jwtSecret[..3]}***{jwtSecret[^3..]}" : "***";
        Console.WriteLine($"[INFRA_STARTUP] JWT Secret loaded for validation: {maskedSecret}");
        Console.Out.Flush();
        services.AddHttpContextAccessor();

        // 🛡️ Resilience: Polly Circuit Breaker ve Retry Politikaları
        services.AddResiliencePipeline("default", builder =>
        {
            builder.AddRetry(new RetryStrategyOptions
            {
                MaxRetryAttempts = 3,
                BackoffType = DelayBackoffType.Exponential,
                UseJitter = true,
                Delay = TimeSpan.FromSeconds(1)
            });
            builder.AddCircuitBreaker(new Polly.CircuitBreaker.CircuitBreakerStrategyOptions
            {
                FailureRatio = 0.5,
                SamplingDuration = TimeSpan.FromSeconds(30),
                MinimumThroughput = 10,
                BreakDuration = TimeSpan.FromSeconds(15)
            });
        });

        // 📊 Monitoring: OpenTelemetry (Distributed Tracing) Entegrasyonu
        services.AddOpenTelemetry()
            .WithTracing(tracing => {
                tracing.SetResourceBuilder(ResourceBuilder.CreateDefault().AddService("Epiknovel.API"))
                       .AddAspNetCoreInstrumentation()
                       .AddHttpClientInstrumentation()
                       .AddConsoleExporter(); // Şimdilik loglarda görmek için
            });

        // 1.1 Performans: AutoMapper Entegrasyonu
        services.AddAutoMapper(cfg => cfg.AddMaps(typeof(MappingProfile).Assembly));

        // 1.2 Güvenlik: Veri Koruma
        services.AddDataProtection()
                .PersistKeysToFileSystem(new System.IO.DirectoryInfo("/app/Keys"));

        // 1.3 Güvenlik: CORS Politikası
        services.AddCors(options =>
        {
            options.AddPolicy("AllowAll", builder =>
            {
                builder.WithOrigins(
                           "https://localhost:3000", "http://localhost:3000",
                           "https://127.0.0.1:3000", "http://127.0.0.1:3000",
                           "https://localhost", "http://localhost",
                           "http://192.168.0.19:3000", "https://192.168.0.19:3000", // Kullanıcının mevcut IP'si
                           "https://127.0.0.1", "http://127.0.0.1")
                       .AllowAnyMethod()
                       .AllowAnyHeader()
                       .AllowCredentials();
            });
        });


        // 2. Performans: Yanıt Sıkıştırma, Önbellekleme ve ETag
        services.AddResponseCaching();
        services.AddHttpCacheHeaders(
            (expirationModelOptions) => {
                expirationModelOptions.MaxAge = 60;
                expirationModelOptions.SharedMaxAge = 300;
            },
            (validationModelOptions) => {
                validationModelOptions.MustRevalidate = true;
            });
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
            o.DefaultScheme = "Bearer";
            o.DefaultAuthenticateScheme = "Bearer";
            o.DefaultChallengeScheme = "Bearer";
        })
        .AddJwtBearer("Bearer", s => {
            s.RequireHttpsMetadata = false;
            s.SaveToken = true;
            
            s.TokenValidationParameters = new Microsoft.IdentityModel.Tokens.TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new Microsoft.IdentityModel.Tokens.SymmetricSecurityKey(System.Text.Encoding.UTF8.GetBytes(jwtSecret)),
                ValidateIssuer = false,
                ValidateAudience = false,
                ValidateLifetime = true,
                RequireExpirationTime = true,
                ClockSkew = TimeSpan.FromMinutes(10)
            };
            
            s.Events = new Microsoft.AspNetCore.Authentication.JwtBearer.JwtBearerEvents
            {
                OnMessageReceived = context =>
                {
                    var authHeader = context.Request.Headers["Authorization"].FirstOrDefault();
                    if (!string.IsNullOrEmpty(authHeader))
                    {
                        if (authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
                        {
                            context.Token = authHeader.Substring("Bearer ".Length).Trim();
                            Console.WriteLine($"[AUTH_MANUAL] Token extracted manually for Path: {context.Request.Path}");
                        }
                        
                        Console.WriteLine($"[AUTH_DEBUG] Path: {context.Request.Path} | Header: {authHeader[..Math.Min(20, authHeader.Length)]}...");
                        Console.Out.Flush();
                    }

                    if (string.IsNullOrWhiteSpace(context.Token))
                    {
                        var cookieToken = context.Request.Cookies["epiknovel_at"];
                        if (!string.IsNullOrWhiteSpace(cookieToken))
                        {
                            context.Token = cookieToken;
                            // Opsiyonel: Log ekleyerek doğrulayalım
                            // Console.WriteLine($"[AUTH_COOKIE] Token extracted from cookie for Path: {context.Request.Path}");
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
            o.AddFixedWindowLimiter("GlobalPolicy", opt => {
                opt.Window = TimeSpan.FromSeconds(1);
                opt.PermitLimit = 10;
                opt.QueueLimit = 0;
            });

            o.AddFixedWindowLimiter("StrictPolicy", opt => {
                opt.Window = TimeSpan.FromSeconds(10);
                opt.PermitLimit = 10;
                opt.QueueLimit = 0;
            });

            o.AddFixedWindowLimiter("SocialPolicy", opt => {
                opt.Window = TimeSpan.FromMinutes(1);
                opt.PermitLimit = 15;
                opt.QueueLimit = 0;
            });

            o.AddFixedWindowLimiter("ProgressPolicy", opt => {
                opt.Window = TimeSpan.FromSeconds(10);
                opt.PermitLimit = 1;
                opt.QueueLimit = 0;
            });
        });

        services.AddScoped<IFileService, LocalFileService>();
        services.AddScoped<ISlugService, SlugService>();
        services.AddScoped<IEmailService, ConsoleEmailService>();
        services.AddSingleton<IDiscordAlertService, DiscordAlertService>();
        services.AddHttpClient();
        services.AddScoped<IPermissionService, PermissionService>();
        services.AddScoped<IEncryptionService, AesEncryptionService>();
        services.AddScoped<ISystemSettingsBroadcastService, SystemSettingsBroadcastService>();
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
        services.AddControllers(); // 🎮 Controller desteği (Legacy/3rd party callbackler için)
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

                s.PostProcess = doc =>
                {
                    var sortedPaths = doc.Paths.OrderBy(p => p.Key).ToList();
                    doc.Paths.Clear();
                    foreach (var path in sortedPaths)
                    {
                        doc.Paths.Add(path.Key, path.Value);
                    }
                };
            };
        });
        
        StackExchange.Redis.IConnectionMultiplexer multiplexer;
        try 
        {
            var redisOptions = StackExchange.Redis.ConfigurationOptions.Parse(redisConn);
            redisOptions.AbortOnConnectFail = false; 
            multiplexer = StackExchange.Redis.ConnectionMultiplexer.Connect(redisOptions);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[REDIS_WARN] Could not connect to Redis during startup: {ex.Message}");
            var dummyOptions = new StackExchange.Redis.ConfigurationOptions { AbortOnConnectFail = false };
            multiplexer = StackExchange.Redis.ConnectionMultiplexer.Connect(dummyOptions); 
        }

        services.AddSingleton<StackExchange.Redis.IConnectionMultiplexer>(multiplexer);
        services.AddStackExchangeRedisCache(o => o.Configuration = redisConn);

        // 🚀 Redis Tabanlı Output Cache ve Akıllı Önbellek Politikası
        services.AddOutputCache(options =>
        {
            options.AddBasePolicy(builder => 
            {
                // 🛡️ Sadece anonim istekleri Redis'te tut (Cache Explosion Koruması)
                builder.With(c => !c.HttpContext.Request.Headers.ContainsKey("Authorization"))
                       .Tag(CacheTags.AllBooks)
                       .Tag(CacheTags.Global)
                       .Expire(TimeSpan.FromSeconds(300));
            });
        });

        // 7. SignalR & Redis Backplane
        services.AddSignalR()
                .AddStackExchangeRedis(redisConn, options => {
                    options.Configuration.AbortOnConnectFail = false;
                });

        services.AddSingleton<IBackgroundAuditQueue, BackgroundAuditQueue>();
        services.AddHostedService<BackgroundAuditWorker>();
        services.AddScoped<AuditInterceptor>();
        services.AddScoped<SoftDeleteInterceptor>();
        
        services.AddMediatR(cfg => {
            cfg.RegisterServicesFromAssemblies(AppDomain.CurrentDomain.GetAssemblies());
            
            var mediatrLicense = Environment.GetEnvironmentVariable("MEDIATR_LICENSE_KEY") ?? configuration["MEDIATR_LICENSE_KEY"];
            if (!string.IsNullOrEmpty(mediatrLicense))
            {
                cfg.LicenseKey = mediatrLicense;
            }
        });

        services.AddSingleton<Background.IImageProcessingQueue, Background.ImageProcessingQueue>();
        services.AddHostedService<Background.ImageProcessingWorker>();

        services.AddSingleton<Epiknovel.Shared.Infrastructure.Cache.IChapterCacheService, Epiknovel.Shared.Infrastructure.Cache.ChapterCacheService>();

        return services;
    }

    public static IApplicationBuilder UseSharedPipeline(this IApplicationBuilder app)
    {
        app.UseForwardedHeaders();

        // 1. Güvenlik: Security Headers (Harden Edilmiş CSP, HSTS, XSS)
        app.UseSecurityHeaders(new HeaderPolicyCollection()
            .AddDefaultSecurityHeaders() // X-Frame-Options: DENY, X-Content-Type-Options: nosniff dahildir
            .AddContentSecurityPolicy(builder =>
            {
                builder.AddDefaultSrc().Self();
                builder.AddImgSrc().Self().Data().From("https://epiknovel.com").From("*.s3.amazonaws.com").From("localhost:*").From("http://localhost:*");
                builder.AddStyleSrc().Self().UnsafeInline().From("https://fonts.googleapis.com").From("https://cdn.jsdelivr.net");
                builder.AddFontSrc().Self().Data().From("https://fonts.gstatic.com").From("https://cdn.jsdelivr.net");
                builder.AddScriptSrc().Self().UnsafeInline().From("https://cdn.jsdelivr.net").From("https://api.scalar.com");
                builder.AddConnectSrc().Self()
                       .From("https://localhost:*").From("http://localhost:*")
                       .From("wss://localhost:*").From("ws://localhost:*")
                       .From("http://192.168.0.19:*").From("ws://192.168.0.19:*") // Yerel ağ desteği
                       .From("https://api.scalar.com");
                builder.AddFrameAncestors().None();
            })
            .AddReferrerPolicyStrictOriginWhenCrossOrigin()
            .RemoveServerHeader());

        // 🛡️ HARDENING: Sadece GET/HEAD isteklerinde önbellek başlıklarını etkinleştir. 
        // POST/DELETE gibi işlemlerde Marvin'in araya girmesini ve olası çakışmaları engeller.
        app.UseWhen(context => {
            var path = context.Request.Path.Value ?? "";
            var method = context.Request.Method;

            // Sadece GET ve HEAD istekleri için önbellek yönetimi yap
            if (!HttpMethods.IsGet(method) && !HttpMethods.IsHead(method)) return false;

            return !path.StartsWith("/swagger", StringComparison.OrdinalIgnoreCase) && 
                   !path.StartsWith("/scalar", StringComparison.OrdinalIgnoreCase) && 
                   !path.Contains("/hubs/", StringComparison.OrdinalIgnoreCase) && 
                   !path.EndsWith("/negotiate", StringComparison.OrdinalIgnoreCase) &&
                   (!path.Contains("/social/", StringComparison.OrdinalIgnoreCase) && !path.EndsWith("/social", StringComparison.OrdinalIgnoreCase));
        }, builder => builder.UseHttpCacheHeaders());

        app.UseAuthentication();
        app.UseMiddleware<Epiknovel.Shared.Infrastructure.Middleware.TokenRevocationMiddleware>();

        // 3. Global Request Tracker
        app.Use(async (context, next) => {
            if (context.Request.Path.Value?.StartsWith("/api") == true)
            {
                var auth = context.Request.Headers["Authorization"].FirstOrDefault();
                Console.WriteLine($"[REQUEST_TRACE] Path: {context.Request.Path} | Auth: {(string.IsNullOrEmpty(auth) ? "YOK" : auth[..Math.Min(15, auth.Length)] + "...")}");
                Console.Out.Flush();
            }
            await next();
        });

        app.UseMiddleware<DirectOriginAccessMiddleware>();
        app.UseCors("AllowAll");
        app.UseResponseCompression();
        app.UseExceptionHandler(); 
        app.UseStaticFiles();

        app.UseRouting();
        app.UseMiddleware<IdempotencyMiddleware>();
        app.UseAuthorization();
        app.UseResponseCaching();
        app.UseRateLimiter();
        
        app.UseHealthChecks("/health");
        
        // 🚀 X-Cache Header Middleware (Professional Monitoring)
        app.Use(async (context, next) =>
        {
            context.Items["HandlerReached"] = false;
            
            await next();
            
            // Eğer istek Handler'a kadar ulaştıysa Items içinde işaretlenmiş olacaktır.
            // Eğer ulaşmadıysa (OutputCache kestiği için), bu bir HIT'tir.
            bool reached = context.Items.TryGetValue("HandlerReached", out var obj) && obj is true;
            
            // Sadece başarılı GET isteklerinde ve yanıt henüz gönderilmeye başlanmadıysa X-Cache başlığı gösterilir
            if (context.Request.Method == HttpMethods.Get && context.Response.StatusCode == 200 && !context.Response.HasStarted)
            {
                context.Response.Headers["X-Cache"] = reached ? "Miss" : "Hit";
            }
        });

        app.UseOutputCache();
        
        app.UseFastEndpoints(c => {
            c.Endpoints.RoutePrefix = "api";
            c.Serializer.Options.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
            c.Endpoints.Configurator = ep => {
                // X-Cache için Handler'ın ulaşıldığını işaretle
                ep.PreProcessors(Order.Before, new ActionPreProcessor());
                ep.PreProcessors(Order.Before, new BOLAValidationPreProcessor());
                ep.PostProcessors(Order.After, new GlobalAuditPostProcessor(app.ApplicationServices.GetRequiredService<IBackgroundAuditQueue>()));
            };
        });

        app.UseEndpoints(endpoints => 
        {
            endpoints.MapControllers(); // 🎮 Controller'ları haritala
            endpoints.MapHub<Hubs.GlobalNotificationHub>("/hubs/notifications");
            endpoints.MapHub<Hubs.SystemSettingsHub>("/hubs/settings");
        });
        
        return app;
    }
}
