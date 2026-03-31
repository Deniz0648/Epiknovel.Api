"use client";

import Link from "next/link";
import { Lock, Mail } from "lucide-react";
import { useState } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/components/providers/auth-provider";

export default function RegisterPage() {
  const { registerWithPassword } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordRepeat, setPasswordRepeat] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (password !== passwordRepeat) {
      setError("Sifre alanlari ayni olmali.");
      return;
    }

    setIsSubmitting(true);

    try {
      const message = await registerWithPassword({
        displayName: displayName.trim(),
        email: email.trim(),
        password,
      });
      setSuccessMessage(message);
      setDisplayName("");
      setEmail("");
      setPassword("");
      setPasswordRepeat("");
    } catch (submitError) {
      if (submitError instanceof ApiError) {
        setError(submitError.message);
      } else {
        setError("Kayit sirasinda beklenmeyen bir hata olustu.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Hesap Olustur"
      description="Hayallerini kaleme dokmeye basla."
      footer={
        <p className="mx-auto max-w-sm text-center text-xs leading-relaxed text-base-content/55">
          Kayit olarak topluluk kurallarimizi ve yazarlik sozlesmemizi kabul etmis olursunuz.
        </p>
      }
    >
      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="auth-form-fields">
          <label className="form-control w-full">
            <span className="mb-2 block label-text text-xs font-semibold uppercase tracking-[0.08em] text-base-content/55">
              Gorunen Ad
            </span>
            <input
              type="text"
              placeholder="Epik Okur"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              autoComplete="nickname"
              required
              className="input input-bordered h-14 w-full rounded-2xl border-base-content/24 bg-base-100/26 px-4"
            />
          </label>

          <label className="form-control w-full">
            <span className="mb-2 block label-text text-xs font-semibold uppercase tracking-[0.08em] text-base-content/55">
              E-Posta
            </span>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-base-content/45" />
              <input
                type="email"
                placeholder="yazar@epiknovel.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
                className="input input-bordered h-14 w-full rounded-2xl border-base-content/24 bg-base-100/26 pl-11"
              />
            </div>
          </label>

          <label className="form-control w-full">
            <span className="mb-2 block label-text text-xs font-semibold uppercase tracking-[0.08em] text-base-content/55">
              Sifre
            </span>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-base-content/45" />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
                required
                className="input input-bordered h-14 w-full rounded-2xl border-base-content/24 bg-base-100/26 pl-11"
              />
            </div>
          </label>

          <label className="form-control w-full">
            <span className="mb-2 block label-text text-xs font-semibold uppercase tracking-[0.08em] text-base-content/55">
              Sifre Tekrar
            </span>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-base-content/45" />
              <input
                type="password"
                placeholder="••••••••"
                value={passwordRepeat}
                onChange={(event) => setPasswordRepeat(event.target.value)}
                autoComplete="new-password"
                required
                className="input input-bordered h-14 w-full rounded-2xl border-base-content/24 bg-base-100/26 pl-11"
              />
            </div>
          </label>
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-base-content/10 bg-base-100/16 px-3.5 py-3.5">
          <input type="checkbox" required className="checkbox checkbox-sm mt-0.5 border-primary/60" />
          <span className="label-text text-sm leading-relaxed">
            <span className="font-semibold text-primary">Kullanim Kosullari</span> okudum ve kabul ediyorum.
          </span>
        </label>

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-base-content/10 bg-base-100/16 px-3.5 py-3.5">
          <input type="checkbox" required className="checkbox checkbox-sm mt-0.5 border-primary/60" />
          <span className="label-text text-sm leading-relaxed">
            <span className="font-semibold text-primary">KVKK Aydinlatma Metni</span> kapsaminda verilerimin
            islenmesini onayliyorum.
          </span>
        </label>

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
          className="btn btn-primary mt-2 h-14 w-full rounded-2xl text-xl font-black"
        >
          {isSubmitting ? "Kayit Olusturuluyor" : "Kayit Ol"}
        </button>
      </form>

      <p className="mt-9 text-center text-[1.45rem] font-semibold text-base-content/70">
        Zaten hesabin var mi?{" "}
        <Link href="/login" className="font-black text-primary no-underline hover:underline">
          Giris Yap
        </Link>
      </p>
    </AuthShell>
  );
}

