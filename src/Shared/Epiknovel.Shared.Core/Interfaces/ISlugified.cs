namespace Epiknovel.Shared.Core.Interfaces;

public interface ISlugified
{
    string Title { get; }
    string Slug { get; set; }
}
