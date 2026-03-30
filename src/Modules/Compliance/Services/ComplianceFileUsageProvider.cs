using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Compliance.Data;
using Epiknovel.Shared.Core.Interfaces;

namespace Epiknovel.Modules.Compliance.Services;

public class ComplianceFileUsageProvider(ComplianceDbContext dbContext) : IFileUsageProvider
{
    public async Task<IEnumerable<string>> GetUsedFilesAsync()
    {
        // Güvenli belgelerdeki aktif dosya adlarını al
        return await dbContext.SecureDocuments
            .Where(d => !string.IsNullOrEmpty(d.StoredFileName))
            .Select(d => d.StoredFileName)
            .ToListAsync();
    }
}
