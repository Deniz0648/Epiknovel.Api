using Epiknovel.Shared.Core.Models;

namespace Epiknovel.Modules.Books.Endpoints.RateBook;

public class Request
{
    public Guid BookId { get; set; }
    public int Value { get; set; } // 1-5 arası
}

public class Response 
{
    public double NewAverageRating { get; set; }
    public int TotalVotes { get; set; }
}
