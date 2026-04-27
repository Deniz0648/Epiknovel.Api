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
            BankDocumentId = a.BankAccountDocumentId,
            BankDocumentUrl = $"/api/compliance/documents/{a.BankAccountDocumentId}/download",
            GvkExemptionCertificateId = a.GvkExemptionCertificateId,
            GvkExemptionCertificateUrl = $"/api/compliance/documents/{a.GvkExemptionCertificateId}/download",
            Status = a.Status,
            AdminNote = a.AdminNote,
            CreatedAt = a.CreatedAt
        }).ToList();
        
        return Result<List<PaidAuthorApplicationDto>>.Success(dtos);
    }

    public async Task<Result<AuthorApplicationDto?>> GetUserActiveApplicationAsync(Guid userId, CancellationToken ct = default)
    {
        var application = await dbContext.AuthorApplications
            .AsNoTracking()
            .Where(a => a.UserId == userId && a.Status == ApplicationStatus.Pending)
            .FirstOrDefaultAsync(ct);

        if (application == null)
            return Result<AuthorApplicationDto?>.Success(null);

        var userNames = await userProvider.GetDisplayNamesByUserIdsAsync(new[] { userId }, ct);

        var dto = new AuthorApplicationDto
        {
            Id = application.Id,
            UserId = application.UserId,
            UserName = userNames.GetValueOrDefault(application.UserId, "Bilinmeyen Kullanıcı"),
            SampleContent = application.SampleContent,
            Experience = application.Experience,
            PlannedWork = application.PlannedWork,
            Status = application.Status,
            CreatedAt = application.CreatedAt
        };

        return Result<AuthorApplicationDto?>.Success(dto);
    }

    public async Task<Result<PaidAuthorApplicationDto?>> GetUserActivePaidAuthorApplicationAsync(Guid userId, CancellationToken ct = default)
    {
        var application = await dbContext.PaidAuthorApplications
            .AsNoTracking()
            .Where(a => a.UserId == userId)
            .OrderByDescending(a => a.CreatedAt)
            .FirstOrDefaultAsync(ct);

        if (application == null)
            return Result<PaidAuthorApplicationDto?>.Success(null);

        var userNames = await userProvider.GetDisplayNamesByUserIdsAsync(new[] { userId }, ct);

        var dto = new PaidAuthorApplicationDto
        {
            Id = application.Id,
            UserId = application.UserId,
            UserName = userNames.GetValueOrDefault(application.UserId, "Bilinmeyen Kullanıcı"),
            BankName = application.BankName,
            Iban = application.Iban,
            BankDocumentId = application.BankAccountDocumentId,
            BankDocumentUrl = $"/api/compliance/documents/{application.BankAccountDocumentId}/download",
            GvkExemptionCertificateId = application.GvkExemptionCertificateId,
            GvkExemptionCertificateUrl = $"/api/compliance/documents/{application.GvkExemptionCertificateId}/download",
            Status = application.Status,
            AdminNote = application.AdminNote,
            CreatedAt = application.CreatedAt
        };

        return Result<PaidAuthorApplicationDto?>.Success(dto);
    }

    public async Task<Result<string>> ProcessAuthorApplicationAsync(Guid applicationId, bool approve, string? reason = null, CancellationToken ct = default)
    {
        var application = await dbContext.AuthorApplications
            .FirstOrDefaultAsync(a => a.Id == applicationId, ct);

        if (application == null)
            return Result<string>.Failure("Başvuru bulunamadı.");

        if (application.Status != ApplicationStatus.Pending)
            return Result<string>.Failure("Bu başvuru zaten işlenmiş.");

        if (approve)
        {
            application.Status = ApplicationStatus.Approved;
            await userProvider.SetAuthorStatusAsync(application.UserId, true, ct);
        }
        else
        {
            application.Status = ApplicationStatus.Rejected;
            // Not: Domain modelinde RejectionReason alanı yoksa sadece status güncellenir.
            // Eğer isterseniz domain modeline bu alanı ekleyebiliriz.
        }

        await dbContext.SaveChangesAsync(ct);
        return Result<string>.Success(approve ? "Başvuru onaylandı ve kullanıcı yazar yapıldı." : "Başvuru reddedildi.");
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
        Guid exemptionCertificateId,
        Guid bankDocumentId,
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
            GvkExemptionCertificateId = exemptionCertificateId,
            BankAccountDocumentId = bankDocumentId,
            Iban = iban,
            BankName = bankName,
            Status = ApplicationStatus.Pending
        };

        dbContext.PaidAuthorApplications.Add(application);
        await dbContext.SaveChangesAsync(ct);

        return Result<string>.Success("Ücretli yazarlık başvurunuz başarıyla alındı.");
    }
}

