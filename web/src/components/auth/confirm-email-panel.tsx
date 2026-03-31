"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ApiError } from "@/lib/api";
import { confirmChangeEmail, confirmEmail } from "@/lib/auth";

type ConfirmMode = "email" | "change-email";

export function ConfirmEmailPanel({ mode }: { mode: ConfirmMode }) {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Dogrulama suruyor...");

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        if (mode === "email") {
          const userId = searchParams.get("userId") ?? "";
          const token = searchParams.get("token") ?? "";

          if (!userId || !token) {
            throw new ApiError("Dogrulama baglantisi eksik veya gecersiz.", 400);
          }

          const result = await confirmEmail({ userId, token });
          if (!cancelled) {
            setStatus("success");
            setMessage(result.message);
          }
          return;
        }

        const newEmail = searchParams.get("email") ?? "";
        const token = searchParams.get("token") ?? "";

        if (!newEmail || !token) {
          throw new ApiError("E-posta degisikligi baglantisi eksik veya gecersiz.", 400);
        }

        const result = await confirmChangeEmail({ newEmail, token });
        if (!cancelled) {
          setStatus("success");
          setMessage(result.message);
        }
      } catch (error) {
        if (cancelled) {
          return;
        }

        if (error instanceof ApiError) {
          setMessage(error.message);
        } else {
          setMessage("Islem tamamlanamadi.");
        }
        setStatus("error");
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [mode, searchParams]);

  return (
    <div className="glass-frame relative mx-auto max-w-2xl overflow-hidden p-6 text-center sm:p-8">
      <div className="pointer-events-none absolute -left-10 top-8 h-28 w-28 rounded-full bg-primary/12 blur-3xl" />
      <div className="pointer-events-none absolute -right-8 bottom-4 h-24 w-24 rounded-full bg-secondary/12 blur-3xl" />
      <div className="relative z-10">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-base-content/45">
        {mode === "email" ? "E-posta Onayi" : "E-posta Degisikligi"}
      </p>
      <h1 className="mt-3 text-[clamp(2rem,5vw,3rem)] font-black leading-[1.02]">
        {status === "loading" ? "Dogrulaniyor" : status === "success" ? "Tamamlandi" : "Islem Basarisiz"}
      </h1>
      <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-base-content/70">{message}</p>
      <div className="mt-8 flex justify-center gap-3">
        <Link href="/" className="btn rounded-full px-6">
          Ana Sayfa
        </Link>
        <Link href="/account/security" className="btn btn-primary rounded-full px-6">
          Guvenlik Ayarlari
        </Link>
      </div>
      </div>
    </div>
  );
}
