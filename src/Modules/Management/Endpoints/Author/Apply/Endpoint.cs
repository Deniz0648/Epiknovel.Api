using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Management.Data;
using Epiknovel.Modules.Management.Domain;
using Epiknovel.Shared.Core.Models;
using System.Security.Claims;

namespace Epiknovel.Modules.Management.Endpoints.Author.Apply;

public record Request
{
    public string SampleContent { get; init; } = string.Empty;
    public string Experience { get; init; } = string.Empty;
    public string PlannedWork { get; init; } = string.Empty;
}

public class Endpoint(ManagementDbContext dbContext) : Endpoint<Request, Result<string>>
{
    public override void Configure()
    {
        Post("/management/author/apply");
        Summary(s => {
            s.Summary = "Yazarlık başvurusu yap.";
            s.Description = "Kullanıcıların platformda yazar olmak için başvuru yapmasını sağlar. Örnek içerik ve tecrübe bilgilerini içerir.";
        });
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        var userIdString = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdString, out var userId))
        {
            await Send.ResponseAsync(Result<string>.Failure("Unauthorized"), 401, ct);
            return;
        }

        // 1. Bekleyen başvuru var mı?
        var existing = await dbContext.AuthorApplications
            .AnyAsync(a => a.UserId == userId && a.Status == ApplicationStatus.Pending, ct);

        if (existing)
        {
            await Send.ResponseAsync(Result<string>.Failure("Zaten bekleyen bir başvurunuz bulunuyor."), 400, ct);
            return;
        }

        // 2. Başvuru Oluştur
        var application = new AuthorApplication
        {
            UserId = userId,
            SampleContent = req.SampleContent,
            Experience = req.Experience,
            PlannedWork = req.PlannedWork,
            Status = ApplicationStatus.Pending
        };

        dbContext.AuthorApplications.Add(application);
        await dbContext.SaveChangesAsync(ct);

        await Send.ResponseAsync(Result<string>.Success("Yazarlık başvurunuz başarıyla alınmıştır. Sistem yöneticisi onayından sonra kitap oluşturabileceksiniz."), 200, ct);
    }
}
