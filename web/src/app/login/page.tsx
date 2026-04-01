"use client";

import Link from "next/link";
import { Lock, Mail } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/components/providers/auth-provider";

export default function LoginPage() {
  const router = useRouter();
  const { profile, isLoading, loginWithPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
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
    setIsSubmitting(true);

    try {
      await loginWithPassword({
        email: email.trim(),
        password,
      });
      router.push("/");
    } catch (submitError) {
      if (submitError instanceof ApiError) {
        setError(submitError.message);
      } else {
        setError("Giris sirasinda beklenmeyen bir hata olustu.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Giris Yap"
      description="Kaldigin yerden devam et."
      footer={
        <p className="mx-auto max-w-sm text-center text-xs leading-relaxed text-base-content/55">
          Giris yaparak <span className="font-semibold">Kullanim Kosullarini</span> ve{" "}
          <span className="font-semibold">Gizlilik Politikamizi</span> kabul etmis olursunuz.
        </p>
      }
    >
      <form className="space-y-9" onSubmit={handleSubmit}>
        <div className="auth-form-fields">
          <label className="form-control w-full">
            <span className="mb-2 block label-text text-xs font-semibold uppercase tracking-[0.08em] text-base-content/55">
              E-Posta
            </span>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-base-content/45" />
              <input
                type="email"
                placeholder="ornek@mail.com"
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
                placeholder="Sifren"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
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

        <button
          type="submit"
          disabled={isSubmitting}
          className="btn btn-primary mt-5 h-14 w-full rounded-2xl text-xl font-black"
        >
          {isSubmitting ? "Giris Yapiliyor" : "Giris Yap"}
        </button>
      </form>

      <Link
        href="/forgot-password"
        className="mt-6 block text-center text-xl font-semibold text-primary no-underline hover:underline"
      >
        Sifreni mi unuttun?
      </Link>

      <div className="my-8 flex items-center gap-3">
        <span className="h-px flex-1 bg-base-content/16" />
        <span className="text-xs font-bold uppercase tracking-[0.12em] text-base-content/40">Veya</span>
        <span className="h-px flex-1 bg-base-content/16" />
      </div>

      <p className="text-center text-[1.45rem] font-semibold text-base-content/70">
        Hesabin yok mu?{" "}
        <Link href="/register" className="font-black text-primary no-underline hover:underline">
          Hemen Kayit Ol
        </Link>
      </p>
    </AuthShell>
  );
}

