using Epiknovel.Modules.Management.Domain;
using Epiknovel.Shared.Core.Models;
using MediatR;

namespace Epiknovel.Modules.Management.Features.PaidAuthorApplications.Commands.ReviewApplication;

public record ReviewPaidAuthorApplicationCommand(
    Guid ApplicationId,
    ApplicationStatus Status, // Approved, Rejected
    string? AdminNote,
    Guid AdminUserId
) : IRequest<Result<string>>;
