using Epiknovel.Shared.Core.Models;
using MediatR;

namespace Epiknovel.Modules.Users.Features.AuthorApplications.Commands.SubmitPaidAuthorApplication;

public record SubmitPaidAuthorApplicationCommand(
    Guid UserId,
    Guid ExemptionCertificateId,
    Guid BankDocumentId,
    string Iban,
    string BankName
) : IRequest<Result<string>>;
