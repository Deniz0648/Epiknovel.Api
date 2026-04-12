using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Users.Data;
using Epiknovel.Modules.Users.Domain;
using Epiknovel.Shared.Core.Models;
using Epiknovel.Shared.Core.Attributes;
using System.Security.Claims;

namespace Epiknovel.Modules.Users.Endpoints.UpdateBillingAddress;

public record Request : AddressDto
{
    // Inherits everything from AddressDto
}

public record Response
{
    public string Message { get; init; } = string.Empty;
}

[AuditLog("Fatura Bilgileri Güncellendi")]
public class Endpoint(UsersDbContext dbContext) : Endpoint<Request, Result<Response>>
{
    public override void Configure()
    {
        Put("/users/me/billing-address");
        Policies("BOLA"); 
        Summary(s => {
            s.Summary = "Fatura bilgilerini günceller.";
            s.Description = "Oturum açmış kullanıcının fatura adres bilgilerini ekler veya günceller.";
        });
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdString, out var userId))
        {
            await Send.ResponseAsync(Result<Response>.Failure("Kullanıcı bulunamadı."), 401, ct);
            return;
        }

        var address = await dbContext.UserAddresses
            .FirstOrDefaultAsync(x => x.UserId == userId && x.Type == AddressType.Billing, ct);

        if (address == null)
        {
            address = new UserAddress
            {
                UserId = userId,
                Type = AddressType.Billing
            };
            dbContext.UserAddresses.Add(address);
        }

        address.FullName = req.FullName.Trim();
        address.Country = req.Country.Trim();
        address.City = req.City.Trim();
        address.District = req.District.Trim();
        address.AddressLine = req.AddressLine.Trim();
        address.ZipCode = req.ZipCode.Trim();
        address.PhoneNumber = req.PhoneNumber.Trim();
        address.TaxNumber = req.TaxNumber?.Trim();
        address.TaxOffice = req.TaxOffice?.Trim();
        address.IdentityNumber = req.IdentityNumber?.Trim();

        await dbContext.SaveChangesAsync(ct);

        await Send.ResponseAsync(Result<Response>.Success(new Response
        {
            Message = "Fatura bilgileriniz başarıyla kaydedildi."
        }), 200, ct);
    }
}
