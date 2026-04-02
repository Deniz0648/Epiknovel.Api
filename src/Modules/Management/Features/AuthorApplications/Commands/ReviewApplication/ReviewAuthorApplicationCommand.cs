using Epiknovel.Modules.Management.Domain;
using Epiknovel.Shared.Core.Models;
using MediatR;

namespace Epiknovel.Modules.Management.Features.AuthorApplications.Commands.ReviewApplication;

public record ReviewAuthorApplicationCommand(
    Guid ApplicationId,
    ApplicationStatus Status, // Approved, Rejected
    string? RejectionReason,
    Guid AdminUserId
) : IRequest<Result<string>>;
