using FastEndpoints;
using FluentValidation;

namespace Epiknovel.Modules.Identity.Endpoints.ConfirmEmail;

public class Validator : Validator<Request>
{
    public Validator()
    {
        RuleFor(x => x.UserId)
            .NotEmpty().WithMessage("Kullanıcı ID gereklidir.");

        RuleFor(x => x.Token)
            .NotEmpty().WithMessage("Doğrulama anahtarı gereklidir.");
    }
}
