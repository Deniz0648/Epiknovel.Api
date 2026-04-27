using Epiknovel.Shared.Core.Interfaces;
using Epiknovel.Shared.Core.Models;
using MediatR;

namespace Epiknovel.Modules.Users.Features.AuthorApplications.Commands.SubmitPaidAuthorApplication;

public class SubmitPaidAuthorApplicationHandler(
    IAuthorApplicationService authorApplicationService) : IRequestHandler<SubmitPaidAuthorApplicationCommand, Result<string>>
{
    public async Task<Result<string>> Handle(SubmitPaidAuthorApplicationCommand request, CancellationToken ct)
    {
        try
        {
            // 2. Submit to Management Module via Service
            return await authorApplicationService.SubmitPaidAuthorApplicationAsync(
                request.UserId,
                request.ExemptionCertificateId,
                request.BankDocumentId,
                request.Iban,
                request.BankName,
                ct);
        }
        catch (Exception ex)
        {
            return Result<string>.Failure($"Başvuru sırasında hata oluştu: {ex.Message}");
        }
    }
}
