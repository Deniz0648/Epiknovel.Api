using FastEndpoints;
using FluentValidation;

namespace Epiknovel.Modules.Infrastructure.Endpoints.Announcements.Create;

public class Validator : Validator<Request>
{
    public Validator()
    {
        RuleFor(x => x.Title)
            .NotEmpty().WithMessage("Baslik gereklidir.")
            .MaximumLength(160).WithMessage("Baslik en fazla 160 karakter olabilir.");

        RuleFor(x => x.Content)
            .NotEmpty().WithMessage("Icerik gereklidir.")
            .MaximumLength(10000).WithMessage("Icerik en fazla 10000 karakter olabilir.");

        RuleFor(x => x.ImageUrl)
            .MaximumLength(500).WithMessage("Gorsel adresi en fazla 500 karakter olabilir.")
            .When(x => !string.IsNullOrWhiteSpace(x.ImageUrl));

        RuleFor(x => x.ExpiresAt)
            .Must(v => !v.HasValue || v.Value > DateTime.UtcNow)
            .WithMessage("Gecerlilik tarihi gelecekte olmalidir.");
    }
}

