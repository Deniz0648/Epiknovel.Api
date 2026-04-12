using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Management.Data;
using Epiknovel.Modules.Management.Domain;
using Epiknovel.Shared.Core.Interfaces;
using Epiknovel.Shared.Core.Models;

using Epiknovel.Shared.Core.Interfaces.Management;

namespace Epiknovel.Modules.Management.Services;

public class AuthorApplicationService(
    ManagementDbContext dbContext,
    ISystemSettingProvider settings) : IAuthorApplicationService
{
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

