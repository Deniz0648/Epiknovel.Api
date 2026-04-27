using System;

namespace Epiknovel.Modules.Books.Helpers;

public static class RatingMath
{
    public static (double NewAverage, int NewCount) Calculate(double currentAvg, int currentCount, int ratingDelta, int countDelta)
    {
        // 🛡️ Guard: Eğer mevcut puan 0 ise ama oy sayısı varsa, oy sayısını 0 kabul et (Self-healing)
        // Çünkü 0 puanlı bir kitabın oyu olamaz (puanlar 1-5 arası).
        if (currentAvg <= 0)
        {
            currentCount = 0;
        }

        double totalSum = (currentAvg * currentCount) + ratingDelta;
        int totalCount = currentCount + countDelta;

        if (totalCount <= 0) return (0, 0);

        double newAvg = Math.Round(totalSum / totalCount, 1);
        
        // 🛡️ Hard Limit: Puan 1-5 arası olmalı
        newAvg = Math.Clamp(newAvg, 0, 5.0);

        return (newAvg, totalCount);
    }
}
