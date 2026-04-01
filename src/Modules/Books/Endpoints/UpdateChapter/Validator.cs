using FastEndpoints;
using FluentValidation;

namespace Epiknovel.Modules.Books.Endpoints.UpdateChapter;

public class Validator : Validator<Request>
{
    private const int MaxLinesPerChapter = 2000;
    private const int MaxCharsPerLine = 4000;

    public Validator()
    {
        RuleFor(x => x.ChapterId)
            .NotEmpty().WithMessage("Bölüm kimliği zorunludur.");

        RuleFor(x => x.Title)
            .NotEmpty().WithMessage("Bölüm başlığı boş olamaz.")
            .MaximumLength(200).WithMessage("Bölüm başlığı 200 karakterden uzun olamaz.");

        RuleFor(x => x.Order)
            .GreaterThan(0).WithMessage("Bölüm sırası 1 veya daha büyük olmalıdır.");

        RuleFor(x => x.Lines)
            .NotNull().WithMessage("Bölüm içeriği boş olamaz.")
            .Must(lines => lines.Count > 0).WithMessage("Bölüm içeriği boş olamaz.")
            .Must(lines => lines.Count <= MaxLinesPerChapter)
            .WithMessage($"Bir bölüm en fazla {MaxLinesPerChapter} satır içerebilir.");

        RuleForEach(x => x.Lines).ChildRules(line =>
        {
            line.RuleFor(l => l.Content)
                .NotEmpty().WithMessage("Satır içeriği boş olamaz.")
                .MaximumLength(MaxCharsPerLine)
                .WithMessage($"Her satır en fazla {MaxCharsPerLine} karakter olabilir.");
        });
    }
}

