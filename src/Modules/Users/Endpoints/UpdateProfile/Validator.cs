using FastEndpoints;
using FluentValidation;

namespace Epiknovel.Modules.Users.Endpoints.UpdateProfile;

public class Validator : Validator<Request>
{
    public Validator()
    {
        RuleFor(x => x.DisplayName)
            .NotEmpty().WithMessage("Görünen ad boş bırakılamaz.")
            .MinimumLength(2).WithMessage("Görünen ad en az 2 karakter olmalıdır.")
            .MaximumLength(50).WithMessage("Görünen ad en fazla 50 karakter olabilir.");

        RuleFor(x => x.Bio)
            .MaximumLength(500).WithMessage("Biyografi en fazla 500 karakter olabilir.");
    }
}
