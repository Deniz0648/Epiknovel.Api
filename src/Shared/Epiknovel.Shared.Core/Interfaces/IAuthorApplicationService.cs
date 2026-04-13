using Epiknovel.Shared.Core.Models;

namespace Epiknovel.Shared.Core.Interfaces;

public interface IAuthorApplicationService
{
    Task<Result<string>> SubmitAuthorApplicationAsync(
        Guid userId,
        string sampleContent,
        string experience,
        string plannedWork,
        CancellationToken ct = default);

    Task<Result<string>> SubmitPaidAuthorApplicationAsync(
        Guid userId,
        string exemptionCertificateUrl,
        string bankDocumentUrl,
        string iban,
        string bankName,
        CancellationToken ct = default);
    Task<Result<List<AuthorApplicationDto>>> GetAuthorApplicationsAsync(ApplicationStatus? status = null, CancellationToken ct = default);
    Task<Result<List<PaidAuthorApplicationDto>>> GetPaidAuthorApplicationsAsync(ApplicationStatus? status = null, CancellationToken ct = default);
}

public class AuthorApplicationDto
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string UserName { get; set; } = string.Empty;
    public string SampleContent { get; set; } = string.Empty;
    public string Experience { get; set; } = string.Empty;
    public string PlannedWork { get; set; } = string.Empty;
    public ApplicationStatus Status { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class PaidAuthorApplicationDto
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string UserName { get; set; } = string.Empty;
    public string BankName { get; set; } = string.Empty;
    public string Iban { get; set; } = string.Empty;
    public string BankDocumentUrl { get; set; } = string.Empty;
    public string GvkExemptionCertificateUrl { get; set; } = string.Empty;
    public ApplicationStatus Status { get; set; }
    public DateTime CreatedAt { get; set; }
}

