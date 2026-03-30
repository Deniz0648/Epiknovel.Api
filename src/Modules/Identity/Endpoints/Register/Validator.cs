using FastEndpoints;
using FluentValidation;

namespace Epiknovel.Modules.Identity.Endpoints.Register;

public class Validator : Validator<Request>
{
    public Validator()
    {
        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("E-posta adresi gereklidir.")
            .EmailAddress().WithMessage("Geçersiz e-posta formatı.");

        RuleFor(x => x.Password)
            .NotEmpty().WithMessage("Şifre gereklidir.")
            .MinimumLength(6).WithMessage("Şifre en az 6 karakter olmalıdır.");

        RuleFor(x => x.DisplayName)
            .NotEmpty().WithMessage("Görünen ad gereklidir.")
            .MinimumLength(3).WithMessage("Görünen ad en az 3 karakter olmalıdır.");
    }
}
