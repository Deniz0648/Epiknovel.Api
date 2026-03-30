using FastEndpoints;
using FluentValidation;

namespace Epiknovel.Modules.Compliance.Endpoints.SecureDocuments.Upload;

public class Validator : Validator<Request>
{
    public Validator()
    {
        RuleFor(x => x.File)
            .NotEmpty().WithMessage("Dosya seçilmelidir.")
            .Must(x => x.Length > 0).WithMessage("Dosya boş olamaz.")
            .Must(x => x.Length <= 10 * 1024 * 1024).WithMessage("Dosya boyutu 10MB'dan büyük olamaz.");

        RuleFor(x => x.Category)
            .NotEmpty().WithMessage("Kategori belirtilmelidir.")
            .MaximumLength(50).WithMessage("Kategori adı çok uzun.");
    }
}
