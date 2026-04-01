"use client";

import Link from "next/link";
import { ArrowLeft, KeyRound, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { ApiError } from "@/lib/api";
import { resetPassword } from "@/lib/auth";
import { useAuth } from "@/components/providers/auth-provider";

function ResetPasswordContent() {
  const router = useRouter();
  const { profile, isLoading } = useAuth();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const token = searchParams.get("token") ?? "";
  const [newPassword, setNewPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (profile) {
      router.replace("/");
    }
  }, [isLoading, profile, router]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!email || !token) {
      setError("Sifre sifirlama baglantisi eksik veya gecersiz.");
      return;
    }

    if (newPassword !== repeatPassword) {
      setError("Yeni sifre alanlari ayni olmali.");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await resetPassword({
        email,
        token,
        newPassword,
      });
      setSuccessMessage(result.message);
      setNewPassword("");
      setRepeatPassword("");
    } catch (submitError) {
      if (submitError instanceof ApiError) {
        setError(submitError.message);
      } else {
        setError("Sifre guncellenemedi.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Sifre Yenile"
      description="Yeni sifreni olustur ve hesabina guvenli sekilde geri don."
      preHeader={
        <div className="space-y-6">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm font-semibold text-base-content/70 no-underline hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Geri Don
          </Link>
          <span className="inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
            <KeyRound className="h-7 w-7" />
          </span>
        </div>
      }
      footer={
        <p className="text-center text-sm text-base-content/70">
          Giris ekranina donmek ister misin?{" "}
          <Link href="/login" className="font-bold text-primary no-underline hover:underline">
            Giris Yap
          </Link>
        </p>
      }
    >
      <form className="space-y-9" onSubmit={handleSubmit}>
        <div className="auth-form-fields">
          <label className="form-control w-full">
            <span className="mb-2 block label-text text-xs font-semibold uppercase tracking-[0.08em] text-base-content/55">
              Yeni Sifre
            </span>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-base-content/45" />
              <input
                type="password"
                placeholder="Yeni sifren"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                autoComplete="new-password"
                required
                className="input input-bordered h-14 w-full rounded-2xl border-base-content/24 bg-base-100/26 pl-11"
              />
            </div>
          </label>

          <label className="form-control w-full">
            <span className="mb-2 block label-text text-xs font-semibold uppercase tracking-[0.08em] text-base-content/55">
              Yeni Sifre (Tekrar)
            </span>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-base-content/45" />
              <input
                type="password"
                placeholder="Yeni sifreni tekrar gir"
                value={repeatPassword}
                onChange={(event) => setRepeatPassword(event.target.value)}
                autoComplete="new-password"
                required
                className="input input-bordered h-14 w-full rounded-2xl border-base-content/24 bg-base-100/26 pl-11"
              />
            </div>
          </label>
        </div>

        {error ? (
          <p className="rounded-2xl border border-error/25 bg-error/10 px-4 py-3 text-sm font-medium text-error">
            {error}
          </p>
        ) : null}

        {successMessage ? (
          <p className="rounded-2xl border border-success/25 bg-success/10 px-4 py-3 text-sm font-medium text-success">
            {successMessage}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="btn btn-primary mt-8 h-14 w-full rounded-2xl text-lg font-black"
        >
          {isSubmitting ? "Guncelleniyor" : "Sifreyi Guncelle"}
        </button>
      </form>
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordContent />
    </Suspense>
  );
}

