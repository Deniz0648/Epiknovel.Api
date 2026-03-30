using MediatR;

namespace Epiknovel.Shared.Core.Events;

/// <summary>
/// Kullanıcı profilinin arama motorunda (FTS vb.) güncellenmesi 
/// gerektiğinde Users modülünden fırlatılan olay.
/// </summary>
public record UserProfileUpdatedEvent(
    Guid UserId,
    string DisplayName,
    string Slug,
    string? Bio,
    string? AvatarUrl
) : INotification;
