using FastEndpoints;
using FluentValidation;

namespace Epiknovel.Modules.Users.Endpoints.UpdateAvatar;

public class Validator : Validator<Request>
{
    public Validator()
    {
        RuleFor(x => x.FileName)
            .NotEmpty().WithMessage("Dosya adı boş olamaz.")
            .MinimumLength(5).WithMessage("Geçersiz dosya adı.");
    }
}
