using Epiknovel.Shared.Core.Models;
using Microsoft.AspNetCore.Http;
using MediatR;

namespace Epiknovel.Modules.Users.Features.AuthorApplications.Commands.SubmitPaidAuthorApplication;

public record SubmitPaidAuthorApplicationCommand(
    Guid UserId,
    IFormFile ExemptionCertificate,
    IFormFile BankDocument,
    string Iban,
    string BankName
) : IRequest<Result<string>>;
