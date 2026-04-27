using Iyzipay;
using Iyzipay.Model;
using Iyzipay.Request;
using Microsoft.Extensions.Configuration;

namespace Epiknovel.Modules.Wallet.Services;

public class IyzicoService(Epiknovel.Shared.Core.Interfaces.Management.ISystemSettingProvider settingProvider) : IIyzicoService
{
    private async Task<Options> GetOptionsAsync(CancellationToken ct = default)
    {
        // 🚀 DATABASE SETTINGS (Priority 1)
        var apiKey = await settingProvider.GetSettingValueAsync("POS_Iyzico_ApiKey", ct);
        var secretKey = await settingProvider.GetSettingValueAsync("POS_Iyzico_SecretKey", ct);
        var baseUrl = await settingProvider.GetSettingValueAsync("POS_Iyzico_BaseUrl", ct);

        string source = "DATABASE";

        // 🏗️ ENVIRONMENT SETTINGS (Priority 2 - Fallback)
        // Not: Eğer DB'deki değer boş ise VEYA varsayılan "sandbox-xxxx" ise .env'den almayı dene
        if (string.IsNullOrEmpty(apiKey) || apiKey.Contains("sandbox-xxxx"))
        {
            var envApiKey = Environment.GetEnvironmentVariable("IYZICO_API_KEY");
            var envSecretKey = Environment.GetEnvironmentVariable("IYZICO_SECRET_KEY");
            var envBaseUrl = Environment.GetEnvironmentVariable("IYZICO_BASE_URL");

            if (!string.IsNullOrEmpty(envApiKey))
            {
                apiKey = envApiKey;
                secretKey = envSecretKey ?? secretKey;
                baseUrl = envBaseUrl ?? baseUrl;
                source = "ENVIRONMENT";
            }
            else if (string.IsNullOrEmpty(apiKey))
            {
                // Eğer hem DB boş hem de ENV boşsa, kütüphanenin hata vermemesi için 
                // ama çalışmayacağını bildiğimiz bir değer ata (veya hata fırlat)
                apiKey = "sandbox-xxxx";
                secretKey = "sandbox-xxxx";
                baseUrl = "https://sandbox-api.iyzipay.com";
                source = "FALLBACK (MISSING CONFIG)";
            }
        }

        Console.WriteLine($"[IYZICO CONFIG] Keys loaded from {source}. BaseUrl: {baseUrl}");

        return new Options
        {
            ApiKey = apiKey,
            SecretKey = secretKey,
            BaseUrl = baseUrl
        };
    }

    public async Task<CheckoutFormInitialize> InitializeCheckoutFormAsync(
        string conversationId,
        decimal price,
        string basketId,
        string callbackUrl,
        string buyerId,
        string buyerName,
        string buyerSurname,
        string buyerEmail,
        string buyerIdentityNumber,
        string buyerGsmNumber,
        string buyerRegistrationAddress,
        string buyerCity,
        string buyerCountry,
        string ipAddress,
        CancellationToken ct = default)
    {
        var options = await GetOptionsAsync(ct);
        
        // 🔍 DIAGNOSTIC LOG
        Console.WriteLine($"[IYZICO] Initializing checkout form. ConversationId: {conversationId}, Price: {price}");
        Console.WriteLine($"[IYZICO] Using Key: {options.ApiKey.Substring(0, 5)}..., Secret: {options.SecretKey.Substring(0, 5)}..., BaseUrl: {options.BaseUrl}");

        var request = new CreateCheckoutFormInitializeRequest
        {
            Locale = Locale.TR.ToString(),
            ConversationId = conversationId,
            Price = price.ToString("F2", global::System.Globalization.CultureInfo.InvariantCulture),
            PaidPrice = price.ToString("F2", global::System.Globalization.CultureInfo.InvariantCulture),
            Currency = Currency.TRY.ToString(),
            BasketId = basketId,
            PaymentGroup = PaymentGroup.PRODUCT.ToString(),
            CallbackUrl = callbackUrl
        };

        var buyer = new Buyer
        {
            Id = buyerId,
            Name = buyerName,
            Surname = buyerSurname,
            GsmNumber = buyerGsmNumber,
            Email = buyerEmail,
            IdentityNumber = buyerIdentityNumber,
            LastLoginDate = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss"),
            RegistrationDate = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss"),
            RegistrationAddress = buyerRegistrationAddress,
            Ip = ipAddress,
            City = buyerCity,
            Country = buyerCountry,
            ZipCode = "34000"
        };
        request.Buyer = buyer;

        var billingAddress = new Address
        {
            ContactName = $"{buyerName} {buyerSurname}",
            City = buyerCity,
            Country = buyerCountry,
            Description = buyerRegistrationAddress,
            ZipCode = "34000"
        };
        request.BillingAddress = billingAddress;

        var basketItems = new List<BasketItem>
        {
            new BasketItem
            {
                Id = basketId,
                Name = "Epiknovel Coin Paketi",
                Category1 = "Digital-Coin",
                ItemType = BasketItemType.VIRTUAL.ToString(),
                Price = price.ToString("F2", global::System.Globalization.CultureInfo.InvariantCulture)
            }
        };
        request.BasketItems = basketItems;

        var response = await Task.Run(() => CheckoutFormInitialize.Create(request, options), ct);

        if (response.Status != "success")
        {
            Console.WriteLine($"[IYZICO ERROR] Status: {response.Status}, ErrorCode: {response.ErrorCode}, Message: {response.ErrorMessage}");
        }

        return response;
    }

    public async Task<CheckoutForm> RetrieveCheckoutFormResultAsync(string token, CancellationToken ct = default)
    {
        var options = await GetOptionsAsync(ct);
        var request = new RetrieveCheckoutFormRequest
        {
            Token = token
        };

        return await Task.Run(() => CheckoutForm.Retrieve(request, options), ct);
    }

    public async Task<Refund> RefundAsync(string paymentTransactionId, decimal price, string conversationId, string ipAddress, CancellationToken ct = default)
    {
        var options = await GetOptionsAsync(ct);
        var request = new CreateRefundRequest
        {
            PaymentTransactionId = paymentTransactionId,
            Price = price.ToString("F2", global::System.Globalization.CultureInfo.InvariantCulture),
            Ip = ipAddress,
            ConversationId = conversationId,
            Locale = Locale.TR.ToString(),
            Currency = Currency.TRY.ToString()
        };

        return await Task.Run(() => Refund.Create(request, options), ct);
    }
}
