"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { connectHub, type HubInvocation } from "@/lib/signalr-client";

type SettingsContextValue = {
  settings: Record<string, string>;
  isEnableEconomy: boolean;
};

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [isEnableEconomy, setIsEnableEconomy] = useState(true);

  // İlk yüklemede ayarları getir
  useEffect(() => {
    async function fetchInitialSettings() {
      try {
        const res = await fetch("/api/Settings/public");
        if (res.ok) {
          const data = await res.json();
          setSettings(data);
          updateEconomyState(data);
        }
      } catch (e) {
        console.error("Failed to fetch initial settings:", e);
      }
    }

    fetchInitialSettings();
  }, []);

  function updateEconomyState(newSettings: Record<string, string>) {
    const isWalletEnabled = newSettings["Economy_EnableWalletSystem"] !== "false";
    const isPurchasingEnabled = newSettings["Economy_EnablePurchasing"] !== "false";
    setIsEnableEconomy(isWalletEnabled && isPurchasingEnabled);
  }

  // Real-time Settings Hub Bağlantısı
  useEffect(() => {
    return connectHub("/hubs/settings", {
      onInvocation: (msg) => {
        if (msg.target === "SettingUpdated") {
            const key = msg.args[0] as string;
            const value = msg.args[1] as string;
            
            setSettings(prev => {
                const next = { ...prev, [key]: value };
                updateEconomyState(next);
                return next;
            });
        }
      }
    });
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, isEnableEconomy }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function usePublicSettings() {
  const context = useContext(SettingsContext);
  if (!context) throw new Error("usePublicSettings must be used within RealtimeProvider");
  return context;
}
