using FastEndpoints;
using FluentValidation;

namespace Epiknovel.Modules.Identity.Endpoints.ConfirmChangeEmail;

public class Validator : Validator<Request>
{
    public Validator()
    {
        RuleFor(x => x.NewEmail)
            .NotEmpty().WithMessage("Yeni e-posta adresi gereklidir.")
            .EmailAddress().WithMessage("Geçersiz e-posta formatı.");

        RuleFor(x => x.Token)
            .NotEmpty().WithMessage("Doğrulama anahtarı gereklidir.");
    }
}
