using FastEndpoints;
using FluentValidation;

namespace Epiknovel.Modules.Identity.Endpoints.ChangePassword;

public class Validator : Validator<Request>
{
    public Validator()
    {
        RuleFor(x => x.CurrentPassword)
            .NotEmpty().WithMessage("Mevcut şifre gereklidir.");

        RuleFor(x => x.NewPassword)
            .NotEmpty().WithMessage("Yeni şifre gereklidir.")
            .MinimumLength(6).WithMessage("Yeni şifre en az 6 karakter olmalıdır.");
    }
}
