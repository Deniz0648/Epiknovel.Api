"use client";

import React, { createContext, useContext, useEffect, useState, useMemo, useRef } from "react";
import { apiRequest } from "@/lib/api";
import { connectHub, type HubInvocation } from "@/lib/signalr-client";
import { toast } from "@/lib/toast";

type PublicSettings = {
  SITE_Name: string;
  SITE_Slogan: string;
  SITE_LogoUrl: string;
  SITE_FaviconUrl: string;
  Economy_EnableWalletSystem?: string;
  Economy_EnablePurchasing?: string;
  [key: string]: string | undefined;
};

type SettingsContextType = {
  settings: PublicSettings;
  isLoading: boolean;
  isEnableEconomy: boolean;
};

const defaultSettings: PublicSettings = {
  SITE_Name: "EpikNovel",
  SITE_Slogan: "Modern Okuma Platformu",
  SITE_LogoUrl: "",
  SITE_FaviconUrl: "/favicon.svg",
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

/**
 * Epiknovel Sistem Ayarları ve Real-time Güncelleme Sağlayıcısı.
 * Tek bir noktadan ayarları yönetir ve SignalR üzerinden anlık güncellemeleri dinler.
 */
export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<PublicSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const fetchedRef = useRef(false);

  useEffect(() => {
    // Birden fazla mount durumunda (Strict Mode vb.) gereksiz istekleri engelle
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    async function fetchSettings() {
      try {
        const response = await fetch("/api/Settings/public");
        if (response.ok) {
           const result = await response.json();
           const data = result.data || result; // API route wrapper handle
           setSettings(prev => ({
             ...prev,
             ...data
           }));
        }
      } catch (error) {
        console.error("Ayarlar yuklenemedi:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchSettings();
  }, []);

  // Real-time Güncellemeleri Dinle
  useEffect(() => {
    const hub = connectHub("/hubs/settings", {
      onInvocation: (msg) => {
        if (msg.target === "SettingUpdated") {
            const key = msg.args[0] as string;
            const value = msg.args[1] as string;
            
            setSettings(prev => ({
                ...prev,
                [key]: value
            }));
        }
      }
    });

    return () => hub.dispose();
  }, []);

  // Ekonomi durumunu hesapla
  const isEnableEconomy = useMemo(() => {
    const isWalletEnabled = settings["Economy_EnableWalletSystem"] !== "false";
    const isPurchasingEnabled = settings["Economy_EnablePurchasing"] !== "false";
    return isWalletEnabled && isPurchasingEnabled;
  }, [settings]);

  // Context değerini stabilize et (sonsuz döngüyü önler)
  const contextValue = useMemo(() => ({
    settings,
    isLoading,
    isEnableEconomy
  }), [settings, isLoading, isEnableEconomy]);

  return (
    <SettingsContext.Provider value={contextValue}>
      {children}
    </SettingsContext.Provider>
  );
}

export function usePublicSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    // Geriye dönük uyumluluk için varsayılan değerleri dön ama uyar
    return { settings: defaultSettings, isLoading: false, isEnableEconomy: true };
  }
  return context;
}

// Eski useSettings ismini kullanan yerler için alias
export const useSettings = usePublicSettings;
