using Iyzipay;
using Iyzipay.Model;
using Iyzipay.Request;
using Microsoft.Extensions.Configuration;

namespace Epiknovel.Modules.Wallet.Services;

public class IyzicoService() : IIyzicoService
{
    private Options GetOptions()
    {
        return new Options
        {
            ApiKey = Environment.GetEnvironmentVariable("IYZICO_API_KEY") ?? "sandbox-xxxx",
            SecretKey = Environment.GetEnvironmentVariable("IYZICO_SECRET_KEY") ?? "sandbox-xxxx",
            BaseUrl = Environment.GetEnvironmentVariable("IYZICO_BASE_URL") ?? "https://sandbox-api.iyzipay.com"
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
        var request = new CreateCheckoutFormInitializeRequest
        {
            Locale = Locale.TR.ToString(),
            ConversationId = conversationId,
            Price = price.ToString("F2").Replace(",", "."),
            PaidPrice = price.ToString("F2").Replace(",", "."), // Komisyonlar eklenirse değişebilir
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
                Price = price.ToString("F2").Replace(",", ".")
            }
        };
        request.BasketItems = basketItems;

        return await Task.Run(() => CheckoutFormInitialize.Create(request, GetOptions()), ct);
    }

    public async Task<CheckoutForm> RetrieveCheckoutFormResultAsync(string token, CancellationToken ct = default)
    {
        var request = new RetrieveCheckoutFormRequest
        {
            Token = token
        };

        return await Task.Run(() => CheckoutForm.Retrieve(request, GetOptions()), ct);
    }
}
