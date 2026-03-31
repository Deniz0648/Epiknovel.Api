using Epiknovel.Shared.Core.Enums;

namespace Epiknovel.Shared.Core.Common;

public static class DataMasker
{
    public static string Mask(string? input, MaskType maskType)
    {
        if (string.IsNullOrWhiteSpace(input))
            return string.Empty;

        return maskType switch
        {
            MaskType.Email => MaskEmail(input),
            MaskType.IBAN => MaskIBAN(input),
            MaskType.Password => "********",
            MaskType.Phone => MaskPhone(input),
            _ => new string('*', input.Length)
        };
    }

    private static string MaskEmail(string email)
    {
        var parts = email.Split('@');
        if (parts.Length != 2) return new string('*', email.Length);

        var name = parts[0];
        if (name.Length <= 2)
            name = new string('*', name.Length);
        else
            name = $"{name[0]}{new string('*', name.Length - 2)}{name[^1]}";

        return $"{name}@{parts[1]}";
    }

    private static string MaskIBAN(string iban)
    {
        iban = iban.Replace(" ", "");
        if (iban.Length <= 8) return new string('*', iban.Length);

        return $"{iban[..4]}{new string('*', iban.Length - 8)}{iban[^4..]}";
    }
    
    private static string MaskPhone(string phone)
    {
        if (phone.Length <= 4) return new string('*', phone.Length);
        return $"{new string('*', phone.Length - 4)}{phone[^4..]}";
    }
}
