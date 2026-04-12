using Epiknovel.Shared.Core.Attributes;
using Epiknovel.Shared.Core.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace Epiknovel.Shared.Infrastructure.Data;

public static class ModelBuilderExtensions
{
    public static void UseEncryption(this ModelBuilder modelBuilder, IEncryptionService encryptionService)
    {
        if (encryptionService == null) return;

        var converter = new ValueConverter<string, string>(
            v => encryptionService.Encrypt(v),
            v => encryptionService.Decrypt(v));

        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            foreach (var property in entityType.GetProperties())
            {
                if (property.ClrType == typeof(string) && 
                    property.PropertyInfo != null && 
                    Attribute.IsDefined(property.PropertyInfo, typeof(EncryptedAttribute)))
                {
                    property.SetValueConverter(converter);
                }
            }
        }
    }
}
