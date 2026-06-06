using Epiknovel.Modules.Books.Data;
using Epiknovel.Modules.Management.Data;
using Epiknovel.Modules.Social.Data;
using Epiknovel.Shared.Core.Constants;
using Epiknovel.Shared.Core.Models;
using FastEndpoints;
using Microsoft.EntityFrameworkCore;

namespace Epiknovel.Modules.Management.Endpoints.Author.Insights;

public sealed class Request
{
    public int Days { get; set; } = 30;
    public Guid? BookId { get; set; }
    public string? Action { get; set; }
    public string? Entity { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
}

public sealed class Response
{
    public required FunnelDto Funnel { get; init; }
    public required List<FunnelDailyPointDto> FunnelDaily { get; init; }
    public required List<RevisionEventDto> RevisionTimeline { get; init; }
}

public sealed class FunnelDto
{
    public long BookViews { get; init; }
    public int ChapterOpens { get; init; }
    public int ChapterCompletions { get; init; }
    public int Votes { get; init; }
}

public sealed class FunnelDailyPointDto
{
    public DateOnly Date { get; init; }
    public int ChapterOpens { get; init; }
    public int ChapterCompletions { get; init; }
    public int Votes { get; init; }
}

public sealed class RevisionEventDto
{
    public DateTime CreatedAt { get; init; }
    public string Module { get; init; } = string.Empty;
    public string Action { get; init; } = string.Empty;
    public string EntityName { get; init; } = string.Empty;
    public string State { get; init; } = string.Empty;
    public string? ChangedColumns { get; init; }
    public string? PrimaryKeys { get; init; }
}

public class Endpoint(
    BooksDbContext booksDb,
    SocialDbContext socialDb,
    ManagementDbContext managementDb)
    : FastEndpoints.Endpoint<Request, Result<Response>>
{
    public override void Configure()
    {
        Get("/author/insights");
        Policies(PolicyNames.AuthorPanelAccess);
        Summary(s =>
        {
            s.Summary = "Yazar için event-level funnel ve revision timeline döndürür.";
        });
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        var userIdValue = User.FindFirst(global::System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdValue, out var userId))
        {
            await Send.ResponseAsync(Result<Response>.Failure("Unauthorized"), 401, ct);
            return;
        }

        var days = req.Days is > 0 and <= 365 ? req.Days : 30;
        var since = req.StartDate?.ToUniversalTime().Date ?? DateTime.UtcNow.AddDays(-days).Date;
        var until = req.EndDate?.ToUniversalTime().Date.AddDays(1).AddTicks(-1) ?? DateTime.UtcNow;

        var ownBooks = await booksDb.Books
            .IgnoreQueryFilters()
            .Where(b => b.AuthorId == userId || b.Members.Any(m => m.UserId == userId))
            .Select(b => new { b.Id, b.ViewCount })
            .ToListAsync(ct);

        var bookIds = ownBooks.Select(b => b.Id).ToList();
        if (req.BookId.HasValue)
        {
            bookIds = bookIds.Where(id => id == req.BookId.Value).ToList();
            ownBooks = ownBooks.Where(b => b.Id == req.BookId.Value).ToList();
        }
        var bookViews = ownBooks.Sum(b => b.ViewCount);

        var chapterIds = await booksDb.Chapters
            .IgnoreQueryFilters()
            .Where(c => bookIds.Contains(c.BookId))
            .Select(c => c.Id)
            .ToListAsync(ct);

        var chapterOpens = await socialDb.ReadingProgresses
            .AsNoTracking()
            .Where(r => bookIds.Contains(r.BookId) && r.LastReadAt >= since && r.LastReadAt <= until)
            .CountAsync(ct);

        var chapterCompletions = await socialDb.ReadingProgresses
            .AsNoTracking()
            .Where(r => bookIds.Contains(r.BookId) && r.LastReadAt >= since && r.LastReadAt <= until && r.ScrollPercentage >= 90)
            .CountAsync(ct);

        var votes = await socialDb.BookVotes
            .AsNoTracking()
            .Where(v => bookIds.Contains(v.BookId) && v.CreatedAt >= since && v.CreatedAt <= until)
            .CountAsync(ct);

        var chapterDailyRaw = await socialDb.ReadingProgresses
            .AsNoTracking()
            .Where(r => bookIds.Contains(r.BookId) && r.LastReadAt >= since && r.LastReadAt <= until)
            .Select(r => new { Day = DateOnly.FromDateTime(r.LastReadAt), IsCompleted = r.ScrollPercentage >= 90 })
            .ToListAsync(ct);

        var voteDailyRaw = await socialDb.BookVotes
            .AsNoTracking()
            .Where(v => bookIds.Contains(v.BookId) && v.CreatedAt >= since && v.CreatedAt <= until)
            .Select(v => DateOnly.FromDateTime(v.CreatedAt))
            .ToListAsync(ct);

        var dailyMap = new Dictionary<DateOnly, FunnelDailyPointDto>();
        for (var dt = DateOnly.FromDateTime(since); dt <= DateOnly.FromDateTime(until); dt = dt.AddDays(1))
        {
            dailyMap[dt] = new FunnelDailyPointDto
            {
                Date = dt,
                ChapterOpens = 0,
                ChapterCompletions = 0,
                Votes = 0
            };
        }

        foreach (var row in chapterDailyRaw)
        {
            if (!dailyMap.TryGetValue(row.Day, out var point)) continue;
            dailyMap[row.Day] = new FunnelDailyPointDto
            {
                Date = point.Date,
                ChapterOpens = point.ChapterOpens + 1,
                ChapterCompletions = point.ChapterCompletions + (row.IsCompleted ? 1 : 0),
                Votes = point.Votes
            };
        }
        foreach (var day in voteDailyRaw)
        {
            if (!dailyMap.TryGetValue(day, out var point)) continue;
            dailyMap[day] = new FunnelDailyPointDto
            {
                Date = point.Date,
                ChapterOpens = point.ChapterOpens,
                ChapterCompletions = point.ChapterCompletions,
                Votes = point.Votes + 1
            };
        }

        var bookIdTexts = bookIds.Select(id => id.ToString()).ToList();
        var chapterIdTexts = chapterIds.Select(id => id.ToString()).ToList();

        var timeline = await managementDb.AuditLogs
            .AsNoTracking()
            .Where(a => a.CreatedAt >= since && a.CreatedAt <= until)
            .Where(a => a.UserId == userId || a.EntityName == "Book" || a.EntityName == "Chapter")
            .OrderByDescending(a => a.CreatedAt)
            .Take(500)
            .ToListAsync(ct);

        var filteredTimeline = timeline
            .Where(a =>
                a.UserId == userId ||
                (!string.IsNullOrWhiteSpace(a.PrimaryKeys) &&
                 (bookIdTexts.Any(id => a.PrimaryKeys!.Contains(id, StringComparison.OrdinalIgnoreCase)) ||
                  chapterIdTexts.Any(id => a.PrimaryKeys!.Contains(id, StringComparison.OrdinalIgnoreCase)))))
            .Where(a => string.IsNullOrWhiteSpace(req.Action) || a.Action.Contains(req.Action))
            .Where(a => string.IsNullOrWhiteSpace(req.Entity) || a.EntityName.Contains(req.Entity))
            .Select(a => new RevisionEventDto
            {
                CreatedAt = a.CreatedAt,
                Module = a.Module,
                Action = a.Action,
                EntityName = a.EntityName,
                State = a.State.ToString(),
                ChangedColumns = a.ChangedColumns,
                PrimaryKeys = a.PrimaryKeys
            })
            .ToList();

        var response = new Response
        {
            Funnel = new FunnelDto
            {
                BookViews = bookViews,
                ChapterOpens = chapterOpens,
                ChapterCompletions = chapterCompletions,
                Votes = votes
            },
            FunnelDaily = dailyMap.Values.OrderBy(x => x.Date).ToList(),
            RevisionTimeline = filteredTimeline
        };

        await Send.ResponseAsync(Result<Response>.Success(response), 200, ct);
    }
}
