using FastEndpoints;
using FluentValidation;

namespace Epiknovel.Modules.Books.Endpoints.CreateCategory;

public class Validator : Validator<Request>
{
    public Validator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Kategori ismi boş olamaz.")
            .MaximumLength(50).WithMessage("Kategori ismi 50 karakterden fazla olamaz.");

        RuleFor(x => x.Description)
            .MaximumLength(200).WithMessage("Açıklama 200 karakterden fazla olamaz.");
    }
}
