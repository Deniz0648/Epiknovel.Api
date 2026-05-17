"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";

type Props = {
  userType: "guest" | "member";
  genre: string;
  status: string;
  length: string;
  pricing: string;
};

export function HomeAnalyticsBeacon({ userType, genre, status, length, pricing }: Props) {
  useEffect(() => {
    trackEvent("section_view", { section: "home", user_type: userType });
  }, [userType]);

  useEffect(() => {
    if (genre !== "all" || status !== "all" || length !== "all" || pricing !== "all") {
      trackEvent("filter_apply", { section: "home", genre, status, length, pricing, user_type: userType });
    }
  }, [genre, status, length, pricing, userType]);

  return null;
}
