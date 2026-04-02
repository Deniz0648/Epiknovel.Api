using Epiknovel.Shared.Core.Models;
using Microsoft.AspNetCore.Http;
using MediatR;

namespace Epiknovel.Shared.Infrastructure.Features.Media.Commands.UploadImage;

public record UploadImageCommand(
    IFormFile File,
    string Category,
    int? Width = null,
    int? Height = null
) : IRequest<Result<UploadImageResponse>>;

public record UploadImageResponse(string Url, string FileName);
