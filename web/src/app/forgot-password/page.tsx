"use client";

import Link from "next/link";
import { ArrowLeft, KeyRound, Mail } from "lucide-react";
import { useState } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { ApiError } from "@/lib/api";
import { forgotPassword } from "@/lib/auth";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      const result = await forgotPassword({ email: email.trim() });
      setSuccessMessage(result.message);
    } catch (submitError) {
      if (submitError instanceof ApiError) {
        setError(submitError.message);
      } else {
        setError("Sifre sifirlama baglantisi gonderilemedi.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Sifremi Unuttum"
      description="Endiselenmeyin, hesabiniza kayitli e-posta adresinizi girin, size sifrenizi sifirlamaniz icin bir baglanti gonderelim."
      preHeader={
        <div className="space-y-6">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm font-semibold text-base-content/70 no-underline hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Geri Don
          </Link>
          <div className="flex justify-center">
            <span className="inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
              <KeyRound className="h-7 w-7" />
            </span>
          </div>
        </div>
      }
    >
      <form className="space-y-9" onSubmit={handleSubmit}>
        <div className="auth-form-fields">
          <label className="form-control w-full">
            <span className="mb-2 block label-text text-xs font-semibold uppercase tracking-[0.08em] text-base-content/55">
              E-posta Adresi
            </span>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-base-content/45" />
              <input
                type="email"
                placeholder="ornek@email.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
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
          className="btn btn-primary mt-20 h-14 w-full rounded-2xl text-lg font-black"
        >
          {isSubmitting ? "Gonderiliyor" : "Yenileme Baglantisi Gonder"}
        </button>
      </form>
    </AuthShell>
  );
}

