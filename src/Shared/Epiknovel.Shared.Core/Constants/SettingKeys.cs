namespace Epiknovel.Shared.Core.Constants;

public static class SettingKeys
{
    public static class Site
    {
        public const string Name = "SITE_Name";
        public const string Slogan = "SITE_Slogan";
        public const string LogoUrl = "SITE_LogoUrl";
        public const string FaviconUrl = "SITE_FaviconUrl";
        public const string SupportEmail = "SITE_SupportEmail";
        public const string MaintenanceMode = "SITE_MaintenanceMode";
    }

    public static class Rewards
    {
        public const string EnableRewards = "REWARDS_EnableRewards";
        public const string DailyLoginReward = "REWARDS_DailyLoginReward";
        public const string ReferralReward = "REWARDS_ReferralReward";
        public const string FirstRegistrationBonus = "REWARDS_FirstRegistrationBonus";
        public const string CommentReward = "REWARDS_CommentReward";
    }

    public static class Economy
    {
        public const string AuthorCommission = "ECONOMY_AuthorCommission";
        public const string TokenValue = "ECONOMY_TokenValue";
        public const string MinWithdrawal = "ECONOMY_MinWithdrawal";
    }
}
