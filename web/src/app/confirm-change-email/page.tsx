import { Suspense } from "react";
import { ConfirmEmailPanel } from "@/components/auth/confirm-email-panel";
import { HeaderIsland } from "@/components/layout/header-island";

export default function ConfirmChangeEmailPage() {
  return (
    <main className="relative overflow-hidden">
      <div className="fixed inset-x-0 top-0 z-50">
        <div className="mx-auto w-full max-w-7xl px-4 pt-3 sm:px-8 sm:pt-4">
          <HeaderIsland />
        </div>
      </div>

      <div className="mx-auto flex min-h-screen w-full max-w-7xl items-center px-4 pb-8 pt-28 sm:px-8 sm:pt-32">
        <Suspense fallback={null}>
          <ConfirmEmailPanel mode="change-email" />
        </Suspense>
      </div>
    </main>
  );
}
