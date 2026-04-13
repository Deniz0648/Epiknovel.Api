using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Management.Data;
using Epiknovel.Modules.Management.Domain;
using Epiknovel.Shared.Core.Interfaces;
using Epiknovel.Shared.Core.Models;

using Epiknovel.Shared.Core.Interfaces.Management;

namespace Epiknovel.Modules.Management.Services;

public class AuthorApplicationService(
    ManagementDbContext dbContext,
    ISystemSettingProvider settings,
    IUserProvider userProvider) : IAuthorApplicationService
{
    // ... (existing Submit methods remain)
    
    public async Task<Result<List<AuthorApplicationDto>>> GetAuthorApplicationsAsync(ApplicationStatus? status = null, CancellationToken ct = default)
    {
        var query = dbContext.AuthorApplications.AsNoTracking();
        
        if (status.HasValue)
            query = query.Where(x => x.Status == status.Value);
            
        var applications = await query
            .OrderByDescending(x => x.CreatedAt)
            .ToListAsync(ct);
            
        var userIds = applications.Select(a => a.UserId).Distinct();
        var userNames = await userProvider.GetDisplayNamesByUserIdsAsync(userIds, ct);
        
        var dtos = applications.Select(a => new AuthorApplicationDto
        {
            Id = a.Id,
            UserId = a.UserId,
            UserName = userNames.GetValueOrDefault(a.UserId, "Bilinmeyen Kullanıcı"),
            SampleContent = a.SampleContent,
            Experience = a.Experience,
            PlannedWork = a.PlannedWork,
            Status = a.Status,
            CreatedAt = a.CreatedAt
        }).ToList();
        
        return Result<List<AuthorApplicationDto>>.Success(dtos);
    }

    public async Task<Result<List<PaidAuthorApplicationDto>>> GetPaidAuthorApplicationsAsync(ApplicationStatus? status = null, CancellationToken ct = default)
    {
        var query = dbContext.PaidAuthorApplications.AsNoTracking();
        
        if (status.HasValue)
            query = query.Where(x => x.Status == status.Value);
            
        var applications = await query
            .OrderByDescending(x => x.CreatedAt)
            .ToListAsync(ct);
            
        var userIds = applications.Select(a => a.UserId).Distinct();
        var userNames = await userProvider.GetDisplayNamesByUserIdsAsync(userIds, ct);
        
        var dtos = applications.Select(a => new PaidAuthorApplicationDto
        {
            Id = a.Id,
            UserId = a.UserId,
            UserName = userNames.GetValueOrDefault(a.UserId, "Bilinmeyen Kullanıcı"),
            BankName = a.BankName,
            Iban = a.Iban,
            BankDocumentUrl = a.BankAccountDocumentUrl,
            GvkExemptionCertificateUrl = a.GvkExemptionCertificateUrl,
            Status = a.Status,
            CreatedAt = a.CreatedAt
        }).ToList();
        
        return Result<List<PaidAuthorApplicationDto>>.Success(dtos);
    }

    public async Task<Result<string>> SubmitAuthorApplicationAsync(
        Guid userId,
        string sampleContent,
        string experience,
        string plannedWork,
        CancellationToken ct = default)
    {
        // 🚀 GLOBAL SETTING CHECK
        var allowApplications = await settings.GetSettingValueAsync<bool>("CONTENT_AllowAuthorApplications", ct);
        if (!allowApplications)
        {
            return Result<string>.Failure("Şu anda yazarlık başvuruları geçici olarak kapalıdır.");
        }

        var existing = await dbContext.AuthorApplications
            .AnyAsync(a => a.UserId == userId && a.Status == ApplicationStatus.Pending, ct);

        if (existing)
        {
            return Result<string>.Failure("Zaten bekleyen bir başvurunuz bulunuyor.");
        }

        var application = new AuthorApplication
        {
            UserId = userId,
            SampleContent = sampleContent,
            Experience = experience,
            PlannedWork = plannedWork,
            Status = ApplicationStatus.Pending
        };

        dbContext.AuthorApplications.Add(application);
        await dbContext.SaveChangesAsync(ct);

        return Result<string>.Success("Yazarlık başvurunuz başarıyla alındı.");
    }

    public async Task<Result<string>> SubmitPaidAuthorApplicationAsync(
        Guid userId,
        string exemptionCertificateUrl,
        string bankDocumentUrl,
        string iban,
        string bankName,
        CancellationToken ct = default)
    {
        // 🚀 GLOBAL SETTING CHECK
        var allowApplications = await settings.GetSettingValueAsync<bool>("CONTENT_AllowAuthorApplications", ct);
        if (!allowApplications)
        {
            return Result<string>.Failure("Şu anda yazarlık başvuruları geçici olarak kapalıdır.");
        }

        var existing = await dbContext.PaidAuthorApplications
            .AnyAsync(a => a.UserId == userId && a.Status == ApplicationStatus.Pending, ct);

        if (existing)
        {
            return Result<string>.Failure("Hali hazırda bekleyen bir başvurunuz bulunmaktadır.");
        }

        var application = new PaidAuthorApplication
        {
            UserId = userId,
            GvkExemptionCertificateUrl = exemptionCertificateUrl,
            BankAccountDocumentUrl = bankDocumentUrl,
            Iban = iban,
            BankName = bankName,
            Status = ApplicationStatus.Pending
        };

        dbContext.PaidAuthorApplications.Add(application);
        await dbContext.SaveChangesAsync(ct);

        return Result<string>.Success("Ücretli yazarlık başvurunuz başarıyla alındı.");
    }
}

