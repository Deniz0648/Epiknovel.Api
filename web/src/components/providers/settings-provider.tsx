"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";

type PublicSettings = {
  SITE_Name: string;
  SITE_Slogan: string;
  SITE_LogoUrl: string;
  SITE_FaviconUrl: string;
  [key: string]: string;
};

type SettingsContextType = {
  settings: PublicSettings;
  isLoading: boolean;
};

const defaultSettings: PublicSettings = {
  SITE_Name: "EpikNovel",
  SITE_Slogan: "Modern Okuma Platformu",
  SITE_LogoUrl: "",
  SITE_FaviconUrl: "/favicon.svg",
};

const SettingsContext = createContext<SettingsContextType>({
  settings: defaultSettings,
  isLoading: true,
});

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<PublicSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const data = await apiRequest<Record<string, string>>("/Settings/public");
        setSettings({
          ...defaultSettings,
          ...data
        } as PublicSettings);
      } catch (error) {
        console.error("Halka acik ayarlar yuklenemedi:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchSettings();
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, isLoading }}>
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => useContext(SettingsContext);
