import type { ReactNode } from "react";
import { PopularBooksSlider } from "@/components/auth/popular-books-slider";
import { HeaderIsland } from "@/components/layout/header-island";

type AuthShellProps = {
  title: string;
  description: string;
  preHeader?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
};

export function AuthShell({
  title,
  description,
  preHeader,
  footer,
  children,
}: AuthShellProps) {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="fixed inset-x-0 top-0 z-50">
        <div className="mx-auto w-full max-w-7xl px-4 pt-3 sm:px-8 sm:pt-4">
          <HeaderIsland />
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pb-10 pt-24 sm:px-8 sm:pb-12 sm:pt-28">
        <section className="min-h-[calc(100vh-9.5rem)] lg:glass-frame lg:p-5 xl:p-7">
          <div className="grid items-stretch gap-6 lg:grid-cols-[minmax(0,0.54fr)_minmax(0,0.46fr)]">
            <div className="hidden h-full lg:block">
              <PopularBooksSlider className="min-h-[44rem]" />
            </div>

            <article className="glass-frame flex h-full min-h-[44rem] flex-col p-6 sm:p-8">
              {preHeader ? <div className="mb-6">{preHeader}</div> : null}

              <div className="space-y-3">
                <h1 className="text-[clamp(2rem,4.2vw,3rem)] font-black leading-[1.04]">{title}</h1>
                <p className="text-[1rem] leading-relaxed text-base-content/70">{description}</p>
              </div>

              <div className="mt-8 flex-1 min-h-0">{children}</div>

              {footer ? <div className="mt-8">{footer}</div> : null}
            </article>
          </div>
        </section>
      </div>
    </main>
  );
}
