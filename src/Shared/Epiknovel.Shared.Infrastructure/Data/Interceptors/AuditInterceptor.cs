using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.AspNetCore.Http;
using System.Text.Json;
using Epiknovel.Shared.Core.Domain;
using Epiknovel.Shared.Core.Attributes;
using Epiknovel.Shared.Core.Events;
using Epiknovel.Shared.Infrastructure.Logging;
using Epiknovel.Shared.Core.Attributes;
using Epiknovel.Shared.Core.Enums;
using System.Reflection;
using MediatR;
using Microsoft.Extensions.DependencyInjection;

namespace Epiknovel.Shared.Infrastructure.Data.Interceptors;

/// <summary>
/// Tüm veri değişikliklerini (Added, Modified, Deleted) otomatik olarak yakalayan interceptor.
/// Sadece IAuditable arayüzünden türeyen sınıfları izler.
/// </summary>
public class AuditInterceptor(IHttpContextAccessor httpContextAccessor, IServiceProvider serviceProvider) : SaveChangesInterceptor
{
    public override async ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData, 
        InterceptionResult<int> result, 
        CancellationToken ct = default)
    {
        if (eventData.Context == null) return result;

        _entries = OnBeforeSaveChanges(eventData.Context);
        
        return await base.SavingChangesAsync(eventData, result, ct);
    }

    public override async ValueTask<int> SavedChangesAsync(
        SaveChangesCompletedEventData eventData, 
        int result, 
        CancellationToken ct = default)
    {
        if (eventData.Context == null || _entries == null || _entries.Count == 0) return result;

        await OnAfterSaveChanges(eventData.Context, _entries);
        _entries = null; // Belleği temizle
        
        return await base.SavedChangesAsync(eventData, result, ct);
    }

    private List<AuditEntry>? _entries;

    private List<AuditEntry> OnBeforeSaveChanges(DbContext context)
    {
        context.ChangeTracker.DetectChanges();
        var auditEntries = new List<AuditEntry>();

        foreach (var entry in context.ChangeTracker.Entries())
        {
            if (entry.Entity is AuditLog || entry.State == Microsoft.EntityFrameworkCore.EntityState.Detached || entry.State == Microsoft.EntityFrameworkCore.EntityState.Unchanged)
                continue;

            if (entry.Entity is not IAuditable)
                continue;

            var auditEntry = new AuditEntry(entry)
            {
                EntityName = entry.Entity.GetType().Name,
                Module = context.GetType().Namespace?.Split('.').ElementAtOrDefault(2) ?? "Unknown",
                UserId = GetUserId(),
                TraceId = httpContextAccessor.HttpContext?.TraceIdentifier,
                IpAddress = httpContextAccessor.HttpContext?.Connection.RemoteIpAddress?.ToString(),
                UserAgent = httpContextAccessor.HttpContext?.Request.Headers.UserAgent,
                Endpoint = httpContextAccessor.HttpContext?.Request.Path,
                Method = httpContextAccessor.HttpContext?.Request.Method
            };

            auditEntries.Add(auditEntry);

            var sensitiveProps = new[] { 
                "Password", "Hash", "Secret", "Stamp", "Token", 
                "Key", "ApiKey", "Iban", "Swift", "Pin", "AccountNumber"
            };

            foreach (var property in entry.Properties)
            {
                var auditAttr = property.Metadata.PropertyInfo?.GetCustomAttribute<NotAuditedAttribute>();
                var maskedAttr = property.Metadata.PropertyInfo?.GetCustomAttribute<MaskedAttribute>();

                if (auditAttr != null || sensitiveProps.Any(p => property.Metadata.Name.Contains(p, StringComparison.OrdinalIgnoreCase)))
                    continue;

                string propertyName = property.Metadata.Name;
                object? oldValue = property.OriginalValue;
                object? newValue = property.CurrentValue;

                if (maskedAttr != null)
                {
                    oldValue = ApplyMask(oldValue, maskedAttr.Type);
                    newValue = ApplyMask(newValue, maskedAttr.Type);
                }

                if (property.Metadata.IsPrimaryKey())
                {
                    auditEntry.KeyValues[propertyName] = property.CurrentValue;
                    continue;
                }

                switch (entry.State)
                {
                    case Microsoft.EntityFrameworkCore.EntityState.Added:
                        auditEntry.State = Shared.Core.Domain.EntityState.Added;
                        auditEntry.NewValues[propertyName] = newValue;
                        break;

                    case Microsoft.EntityFrameworkCore.EntityState.Deleted:
                        auditEntry.State = Shared.Core.Domain.EntityState.Deleted;
                        auditEntry.OldValues[propertyName] = oldValue;
                        break;

                    case Microsoft.EntityFrameworkCore.EntityState.Modified:
                        if (property.IsModified)
                        {
                            auditEntry.ChangedColumns.Add(propertyName);
                            auditEntry.State = Shared.Core.Domain.EntityState.Modified;
                            auditEntry.OldValues[propertyName] = oldValue;
                            auditEntry.NewValues[propertyName] = newValue;
                        }
                        break;
                }
            }
        }

        return auditEntries;
    }

    private string? ApplyMask(object? value, MaskType type)
    {
        if (value == null) return null;
        var str = value.ToString() ?? "";
        if (string.IsNullOrWhiteSpace(str)) return str;

        return type switch
        {
            MaskType.IBAN => str.Length > 8 ? str[..2] + "****************" + str[^4..] : "****",
            MaskType.Email => str.Contains("@") ? str[..3] + "****@" + str.Split('@')[1] : "****",
            MaskType.Phone => str.Length > 4 ? str[..3] + "****" + str[^2..] : "****",
            MaskType.Password => "********",
            _ => str.Length > 4 ? str[..2] + "****" + str[^2..] : "****"
        };
    }

    private async Task OnAfterSaveChanges(DbContext context, List<AuditEntry> auditEntries)
    {
        var queue = serviceProvider.GetService<IBackgroundAuditQueue>();
        if (queue == null) return;

        foreach (var auditEntry in auditEntries)
        {
            foreach (var prop in auditEntry.Entry.Properties)
            {
                if (prop.Metadata.IsPrimaryKey())
                {
                    auditEntry.KeyValues[prop.Metadata.Name] = prop.CurrentValue;
                }
            }

            var log = auditEntry.ToAuditLog();
            
            // Asenkron kuyruğa ekle
            await queue.QueueAuditEventAsync(new AuditEvent(
                UserId: log.UserId,
                Module: log.Module,
                Action: log.Action,
                EntityName: log.EntityName,
                PrimaryKeys: log.PrimaryKeys,
                State: log.State,
                OldValues: log.OldValues,
                NewValues: log.NewValues,
                ChangedColumns: log.ChangedColumns,
                IpAddress: log.IpAddress,
                UserAgent: log.UserAgent,
                Endpoint: log.Endpoint,
                Method: log.Method,
                TraceId: log.TraceId
            ));
        }
    }

    private Guid? GetUserId()
    {
        var claim = httpContextAccessor.HttpContext?.User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
        return claim != null && Guid.TryParse(claim.Value, out var id) ? id : null;
    }
}

/// <summary>
/// Geçici audit verisi tutan yardımcı sınıf.
/// </summary>
internal class AuditEntry(EntityEntry entry)
{
    public EntityEntry Entry { get; } = entry;
    public Guid? UserId { get; set; }
    public string EntityName { get; set; } = string.Empty;
    public string Module { get; set; } = string.Empty;
    public string? TraceId { get; set; }
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }
    public string? Endpoint { get; set; }
    public string? Method { get; set; }
    public Dictionary<string, object?> KeyValues { get; } = [];
    public Dictionary<string, object?> OldValues { get; } = [];
    public Dictionary<string, object?> NewValues { get; } = [];
    public List<string> ChangedColumns { get; } = [];
    public Shared.Core.Domain.EntityState State { get; set; }

    public AuditLog ToAuditLog()
    {
        return new AuditLog
        {
            UserId = UserId,
            Module = Module,
            Action = $"{EntityName} {State}",
            EntityName = EntityName,
            PrimaryKeys = JsonSerializer.Serialize(KeyValues),
            OldValues = OldValues.Count == 0 ? null : JsonSerializer.Serialize(OldValues),
            NewValues = NewValues.Count == 0 ? null : JsonSerializer.Serialize(NewValues),
            ChangedColumns = ChangedColumns.Count == 0 ? null : JsonSerializer.Serialize(ChangedColumns),
            State = State,
            IpAddress = IpAddress,
            UserAgent = UserAgent,
            Endpoint = Endpoint,
            Method = Method,
            TraceId = TraceId,
            CreatedAt = DateTime.UtcNow
        };
    }
}
