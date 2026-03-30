using FastEndpoints;
using Epiknovel.Shared.Core.Constants;
using Epiknovel.Shared.Core.Interfaces;
using Epiknovel.Modules.Search.Data;
using Epiknovel.Shared.Core.Models;
using Microsoft.EntityFrameworkCore;
using MediatR;
using Epiknovel.Shared.Core.Events;

namespace Epiknovel.Modules.Search.Endpoints.RebuildIndex;

public class Endpoint(
    SearchDbContext dbContext,
    IEnumerable<IBookSearchProvider> bookProviders,
    IEnumerable<IUserSearchProvider> userProviders,
    IMediator mediator) : EndpointWithoutRequest<Result<Response>>
{
    public override void Configure()
    {
        Post("/search/rebuild"); // Sadece Admin tetikleyebilir
        Policies(PolicyNames.SuperAdminOnly);
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        // 1. Mevcut indeksleri temizle (Truncate)
        // Eğer tablo boyutu çok büyükse ExecuteSqlRaw ile TRUNCATE daha iyi olabilir, 
        // ancak EF Core üzerinden güvenli silme:
        await dbContext.Database.ExecuteSqlRawAsync("TRUNCATE TABLE search.\"SearchDocuments\"", ct);

        int totalIndexed = 0;

        // 2. Kitapları Çek ve Indeksle
        // Modülerite: Search modülü hiçbir şekilde BooksDbContext'i bilmez (Tight Coupling yok).
        // Sadece Shared.Core'dan gelen Interface ile konuşur.
        foreach (var provider in bookProviders)
        {
            var books = await provider.GetIndexableBooksAsync();
            foreach (var book in books)
            {
                // MediatR ile mevcut handler'ı tetikle (Yeniden kod yazmamak için)
                await mediator.Publish(book, ct);
                totalIndexed++;
            }
        }

        // 3. Kullanıcı Profillerini Çek ve Indeksle
        foreach (var provider in userProviders)
        {
            var users = await provider.GetIndexableUsersAsync();
            foreach (var user in users)
            {
                await mediator.Publish(user, ct);
                totalIndexed++;
            }
        }

        await Send.ResponseAsync(Result<Response>.Success(new Response(totalIndexed)), 200, ct);
    }
}

public record Response(int TotalIndexed);
