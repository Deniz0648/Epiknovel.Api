using System.Security.Cryptography;
using System.Text;
using Epiknovel.Shared.Core.Interfaces;
using Microsoft.Extensions.Configuration;

namespace Epiknovel.Shared.Infrastructure.Services;

public class AesEncryptionService : IEncryptionService
{
    private readonly byte[] _key;
    private const int IvSize = 16;

    public AesEncryptionService(IConfiguration configuration)
    {
        var keyString = configuration["Security:EncryptionKey"] ?? "EpiknovelDefaultEncryptionKey_2024!";
        _key = SHA256.HashData(Encoding.UTF8.GetBytes(keyString));
    }

    public string Encrypt(string plainText)
    {
        if (string.IsNullOrEmpty(plainText)) return plainText;

        using var aes = Aes.Create();
        aes.Key = _key;
        aes.GenerateIV();
        var iv = aes.IV;

        using var encryptor = aes.CreateEncryptor(aes.Key, iv);
        using var ms = new MemoryStream();
        ms.Write(iv, 0, iv.Length);

        using (var cs = new CryptoStream(ms, encryptor, CryptoStreamMode.Write))
        using (var sw = new StreamWriter(cs))
        {
            sw.Write(plainText);
        }

        return Convert.ToBase64String(ms.ToArray());
    }

    public string Decrypt(string cipherText)
    {
        if (string.IsNullOrEmpty(cipherText)) return cipherText;

        try
        {
            var fullCipher = Convert.FromBase64String(cipherText);
            using var aes = Aes.Create();
            aes.Key = _key;

            var iv = new byte[IvSize];
            Array.Copy(fullCipher, 0, iv, 0, IvSize);
            aes.IV = iv;

            using var decryptor = aes.CreateDecryptor(aes.Key, aes.IV);
            using var ms = new MemoryStream(fullCipher, IvSize, fullCipher.Length - IvSize);
            using var cs = new CryptoStream(ms, decryptor, CryptoStreamMode.Read);
            using var sr = new StreamReader(cs);
            
            return sr.ReadToEnd();
        }
        catch
        {
            // Decryption failed (e.g. invalid format or wrong key)
            // In a real scenario, we might want to log this but return the text as is if it's not encrypted
            return cipherText;
        }
    }
}
