using Iyzipay.Model;

namespace Epiknovel.Modules.Wallet.Services;

public interface IIyzicoService
{
    Task<CheckoutFormInitialize> InitializeCheckoutFormAsync(
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
        CancellationToken ct = default);

    Task<CheckoutForm> RetrieveCheckoutFormResultAsync(string token, CancellationToken ct = default);
}
