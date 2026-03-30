using FastEndpoints;
using FluentValidation;

namespace Epiknovel.Modules.Identity.Endpoints.ForgotPassword;

public class Validator : Validator<Request>
{
    public Validator()
    {
        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("E-posta adresi gereklidir.")
            .EmailAddress().WithMessage("Geçersiz e-posta formatı.");
    }
}
