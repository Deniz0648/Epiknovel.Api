using FastEndpoints;
using FluentValidation;

namespace Epiknovel.Modules.Identity.Endpoints.RefreshToken;

public class Validator : Validator<Request>
{
    public Validator()
    {
        RuleFor(x => x.RefreshToken)
            .NotEmpty().WithMessage("Yenileme token'ı gereklidir.");
    }
}
