using FastEndpoints;
using FluentValidation;
using Epiknovel.Shared.Core.Constants;

namespace Epiknovel.Modules.Identity.Endpoints.AssignRole;

public class Validator : Validator<Request>
{
    public Validator()
    {
        RuleFor(x => x.UserId).NotEmpty().WithMessage("Kullanıcı ID'si gereklidir.");
        RuleFor(x => x.RoleName)
            .NotEmpty().WithMessage("Rol adı gereklidir.")
            .Must(role => typeof(RoleNames).GetFields().Any(f => f.GetValue(null)?.ToString() == role))
            .WithMessage("Geçersiz rol adı.");
    }
}
