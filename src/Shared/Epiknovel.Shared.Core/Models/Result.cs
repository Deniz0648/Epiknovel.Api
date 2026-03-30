using Epiknovel.Shared.Core.Constants;

namespace Epiknovel.Shared.Core.Models;

public class Result<T>
{
    public bool IsSuccess { get; set; }
    public string Message { get; set; } = ApiMessages.Common.Success;
    public T? Data { get; set; }
    public List<string>? Errors { get; set; }

    public static Result<T> Success(T data, string message = ApiMessages.Common.Success) => 
        new() { IsSuccess = true, Data = data, Message = message };

    public static Result<T> Failure(string message = ApiMessages.Common.InternalError, List<string>? errors = null) => 
        new() { IsSuccess = false, Message = message, Errors = errors };
}
