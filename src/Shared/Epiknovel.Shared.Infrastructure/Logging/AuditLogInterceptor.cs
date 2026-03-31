using Epiknovel.Shared.Core.Attributes;
using Epiknovel.Shared.Core.Common;
using Epiknovel.Shared.Core.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using System.Reflection;
using System.Text.Json;

namespace Epiknovel.Shared.Infrastructure.Logging;

public class AuditLogInterceptor : SaveChangesInterceptor
{
    private readonly BackgroundAuditQueue _auditQueue;

    public AuditLogInterceptor(BackgroundAuditQueue auditQueue)
    {
        _auditQueue = auditQueue;
    }

    public override InterceptionResult<int> SavingChanges(DbContextEventData eventData, InterceptionResult<int> result)
    {
        ProcessAuditWait(eventData.Context);
        return base.SavingChanges(eventData, result);
    }

    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(DbContextEventData eventData, InterceptionResult<int> result, CancellationToken cancellationToken = default)
    {
        ProcessAuditWait(eventData.Context);
        return base.SavingChangesAsync(eventData, result, cancellationToken);
    }

    private void ProcessAuditWait(DbContext? context)
    {
        if (context == null) return;

        var entries = context.ChangeTracker.Entries()
            .Where(e => e.State == EntityState.Added || e.State == EntityState.Modified || e.State == EntityState.Deleted)
            .ToList();

        foreach (var entry in entries)
        {
            var entityType = entry.Entity.GetType();

            if (entry.Entity is ISoftDelete softDeleteEntity && entry.State == EntityState.Modified)
            {
                // Soft deletes are treated as modified. We need to check if IsDeleted changed.
                if (entry.Property(nameof(ISoftDelete.IsDeleted)).IsModified)
                {
                    // If it was just deleted, we log it.
                    if (softDeleteEntity.IsDeleted)
                        entry.State = EntityState.Deleted; // Log representation
                }
            }

            // Extract Deltas
            var deltas = new Dictionary<string, object?>();

            foreach (var property in entry.Properties)
            {
                if (entry.State == EntityState.Added)
                {
                    deltas[property.Metadata.Name] = MaskIfNecessary(property.Metadata.PropertyInfo, property.CurrentValue);
                }
                else if (entry.State == EntityState.Deleted)
                {
                    deltas[property.Metadata.Name] = MaskIfNecessary(property.Metadata.PropertyInfo, property.OriginalValue);
                }
                else if (entry.State == EntityState.Modified && property.IsModified)
                {
                    deltas[$"{property.Metadata.Name}_Old"] = MaskIfNecessary(property.Metadata.PropertyInfo, property.OriginalValue);
                    deltas[$"{property.Metadata.Name}_New"] = MaskIfNecessary(property.Metadata.PropertyInfo, property.CurrentValue);
                }
            }

            if (deltas.Any())
            {
                var payload = JsonSerializer.Serialize(deltas);
                // The queue logic can push these deltas to the unified logging table.
                // Depending on context, we might lack the current UserId inside the DB Context unless passed, 
                // but this represents the core delta & masking behavior required for the AuditLog.
                // We leave the actual queueing to the endpoint post-processor or inject an IHttpContextAccessor.
            }
        }
    }

    private object? MaskIfNecessary(PropertyInfo? propertyInfo, object? value)
    {
        if (propertyInfo == null || value == null) return value;

        var maskedAttribute = propertyInfo.GetCustomAttribute<MaskedAttribute>();
        if (maskedAttribute != null && value is string strValue)
        {
            return DataMasker.Mask(strValue, maskedAttribute.Type);
        }

        return value;
    }
}
