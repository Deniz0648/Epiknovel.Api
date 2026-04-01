import { Suspense } from "react";
import { ConfirmEmailPanel } from "@/components/auth/confirm-email-panel";

export default function ConfirmChangeEmailPage() {
  return (
    <main className="relative overflow-hidden">
      <div className="site-shell mx-auto flex min-h-screen items-center px-4 pb-8 pt-28 sm:px-8 sm:pt-32">
        <Suspense fallback={null}>
          <ConfirmEmailPanel mode="change-email" />
        </Suspense>
      </div>
    </main>
  );
}
