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
}

