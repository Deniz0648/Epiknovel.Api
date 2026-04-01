using FastEndpoints;
using FluentValidation;

namespace Epiknovel.Modules.Infrastructure.Endpoints.Announcements.Update;

public class Validator : Validator<Request>
{
    public Validator()
    {
        RuleFor(x => x.Id)
            .NotEmpty().WithMessage("Duyuru kimligi gereklidir.");

        RuleFor(x => x)
            .Must(x =>
                x.Title is not null ||
                x.Content is not null ||
                x.ImageUrl is not null ||
                x.IsActive.HasValue ||
                x.IsPinned.HasValue ||
                x.ExpiresAt.HasValue ||
                x.ClearExpiresAt == true)
            .WithMessage("Guncellenecek en az bir alan gonderilmelidir.");

        RuleFor(x => x.Title)
            .MaximumLength(160).WithMessage("Baslik en fazla 160 karakter olabilir.")
            .When(x => x.Title is not null);

        RuleFor(x => x.Content)
            .MaximumLength(10000).WithMessage("Icerik en fazla 10000 karakter olabilir.")
            .When(x => x.Content is not null);

        RuleFor(x => x.ImageUrl)
            .MaximumLength(500).WithMessage("Gorsel adresi en fazla 500 karakter olabilir.")
            .When(x => x.ImageUrl is not null);

        RuleFor(x => x.ExpiresAt)
            .Must(v => !v.HasValue || v.Value > DateTime.UtcNow)
            .WithMessage("Gecerlilik tarihi gelecekte olmalidir.")
            .When(x => x.ClearExpiresAt != true);
    }
}

