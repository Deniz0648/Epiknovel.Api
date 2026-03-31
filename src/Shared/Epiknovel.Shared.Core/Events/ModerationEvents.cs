using Epiknovel.Shared.Core.Enums;
using MediatR;
using System;

namespace Epiknovel.Shared.Core.Events;

// Şikayet iletildiğinde tetiklenir (Social -> Compliance)
public record ContentReportedEvent(Guid ReporterId, Guid ContentId, TargetContentType ContentType, ReportReason Reason, string? Description, DateTime ReportedAt) : INotification;

// Admin içeriği silme/gizleme kararı verdiğinde tetiklenir (Compliance -> Social/Books/Users)
public record ContentModeratedEvent(Guid ContentId, TargetContentType ContentType, bool IsDeleted, string ActionReason, DateTime ModeratedAt, Guid AdminId, bool DeleteReplies = false) : INotification;

// Kullanıcı 3 Strike veya daha ağır bir ceza aldığında tetiklenir (Compliance -> Identity)
public record UserBannedEvent(Guid UserId, string Reason, DateTime BannedUntil) : INotification;
