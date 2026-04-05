"use client";

import { Star } from "lucide-react";
import { useState, useEffect } from "react";
import { apiRequest } from "@/lib/api";
import { showToast } from "@/lib/toast";

interface RatingStarsProps {
  bookId: string;
  initialRating: number; // Ortalama puan (sayısal gösterim için)
  myRating?: number | null; // Kullanıcının bizzat verdiği puan (yıldız renkleri için)
  onRatingUpdated: (newRating: number, totalVotes: number, myRating: number) => void;
}

export function RatingStars({ bookId, initialRating, myRating, onRatingUpdated }: RatingStarsProps) {
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [localMyRating, setLocalMyRating] = useState<number | null>(myRating ?? null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Prop güncellendiğinde local state'i güncelle (Sayfa ilk açılışında)
  useEffect(() => {
    if (myRating !== undefined) setLocalMyRating(myRating);
  }, [myRating]);

  const handleRate = async (value: number) => {
    try {
      setIsSubmitting(true);
      const response = await apiRequest<{ newAverageRating: number; totalVotes: number }>(
        `/books/${bookId}/rate`,
        {
          method: "POST",
          body: JSON.stringify({ BookId: bookId, Value: value }),
        }
      );

      showToast({
        title: "Puanlandı",
        description: `Kitaba ${value} puan verdiniz.`,
        tone: "success",
      });

      setLocalMyRating(value);
      onRatingUpdated(response.newAverageRating, response.totalVotes, value);
    } catch (err: any) {
      showToast({
        title: "Hata",
        description: err.message || "Puan kaydedilemedi.",
        tone: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex items-center gap-1.5 text-warning group">
      {Array.from({ length: 5 }, (_, index) => {
        const starValue = index + 1;
        // Yıldızın dolu olma kuralı: 
        // 1. Hover varsa hover değeri
        // 2. Kullanıcın puanı varsa o
        const isFilled = (hoverRating ?? localMyRating ?? 0) >= starValue;
        // 3. Hiçbiri yoksa ortalama puanı sönük göster (Görsel Rehber)
        const isAverageOnly = !hoverRating && !localMyRating && Math.round(initialRating) >= starValue;

        return (
          <button
            key={index}
            disabled={isSubmitting}
            onMouseEnter={() => setHoverRating(starValue)}
            onMouseLeave={() => setHoverRating(null)}
            onClick={() => handleRate(starValue)}
            className={`transition-all duration-200 hover:scale-125 disabled:opacity-50 disabled:cursor-not-allowed ${
              isSubmitting ? "animate-pulse" : ""
            }`}
            aria-label={`${starValue} yıldız ver`}
          >
            <Star
              className={`h-5 w-5 ${
                isFilled ? "fill-current" : 
                isAverageOnly ? "fill-current opacity-20" : "text-base-content/20"
              }`}
              strokeWidth={1.9}
            />
          </button>
        );
      })}
    </div>
  );
}
