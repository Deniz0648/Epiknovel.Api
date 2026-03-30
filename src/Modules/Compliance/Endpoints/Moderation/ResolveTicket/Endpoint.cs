using FastEndpoints;
using Epiknovel.Modules.Compliance.Data;
using Epiknovel.Shared.Core.Models;
using Epiknovel.Shared.Core.Events;
using MediatR;
using Microsoft.EntityFrameworkCore;
using System.Linq;
using System.Security.Claims;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace Epiknovel.Modules.Compliance.Endpoints.Moderation.ResolveTicket;

public record Request(Guid TicketId, string Action, string? Reason, Guid? TargetUserId);

public class Endpoint(ComplianceDbContext dbContext, IPublisher publisher) : Endpoint<Request, Result<string>>
{
    public override void Configure()
    {
        Post("/compliance/moderation/tickets/{ticketId}/resolve");
        Summary(s => {
            s.Summary = "Şikayet biletini karara bağlar.";
            s.Description = "Action tipleri: Ignore, DeleteContent, WarnUser. 'WarnUser' gönderildiğinde 3 uyarı (strike) limiti kontrol edilir ve aşılmışsa Identity sistemine Ban Event'i gönderilir.";
        });
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        var adminIdString = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier)?.Value;
        Guid adminId = Guid.TryParse(adminIdString, out var parsed) ? parsed : Guid.Empty;

        var ticket = await dbContext.ModerationTickets.FirstOrDefaultAsync(t => t.Id == req.TicketId, ct);
        if (ticket == null)
        {
            await Send.ResponseAsync(Result<string>.Failure("Bilet bulunamadı."), 404, ct);
            return;
        }

        if (req.Action == "Ignore")
        {
            ticket.Status = Domain.TicketStatus.Ignored;
            ticket.ResolutionAction = "Ignored";
        }
        else if (req.Action == "DeleteContent")
        {
            ticket.Status = Domain.TicketStatus.Resolved;
            ticket.ResolutionAction = "DeletedContent";
            await publisher.Publish(new ContentModeratedEvent(ticket.ContentId, ticket.ContentType, true, req.Reason ?? "Community rules violation", DateTime.UtcNow, adminId), ct);
        }
        else if (req.Action == "WarnUser" && req.TargetUserId.HasValue)
        {
            ticket.Status = Domain.TicketStatus.Resolved;
            ticket.ResolutionAction = "WarnedUser";
            dbContext.UserStrikes.Add(new Domain.UserStrike 
            { 
                UserId = req.TargetUserId.Value, 
                AdminId = adminId, 
                TicketId = ticket.Id, 
                Reason = req.Reason ?? "Violation", 
                ExpiryDate = DateTime.UtcNow.AddMonths(6) 
            });
            
            // Eğer uyarı verildiyse içeriği büyük ihtimal silmek/gizlemek isteriz
            await publisher.Publish(new ContentModeratedEvent(ticket.ContentId, ticket.ContentType, true, req.Reason ?? "Community rules violation", DateTime.UtcNow, adminId), ct);
            
            // 3 Strike Ban Logic
            var userStrikeCount = await dbContext.UserStrikes
                .CountAsync(s => s.UserId == req.TargetUserId.Value && s.ExpiryDate > DateTime.UtcNow, ct);
            
            // Veritabanına asenkron insert henüz olmadı (+1 bu transactiondaki strike)
            if (userStrikeCount + 1 >= 3)
            {
                await publisher.Publish(new UserBannedEvent(req.TargetUserId.Value, "3 moderasyon kural ihlali (Strike) sınırı aşıldı.", DateTime.UtcNow.AddYears(100)), ct);
            }
        }
        else
        {
            await Send.ResponseAsync(Result<string>.Failure("Geçersiz işlem veya eksik parametre."), 400, ct);
            return;
        }

        ticket.ResolvedByAdminId = adminId;
        ticket.ResolvedAt = DateTime.UtcNow;
        
        await dbContext.SaveChangesAsync(ct);
        await Send.ResponseAsync(Result<string>.Success($"Bilet '{req.Action}' olarak başarıyla çözümlendi."), 200, ct);
    }
}
