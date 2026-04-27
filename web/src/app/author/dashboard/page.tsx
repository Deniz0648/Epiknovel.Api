"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * /author/dashboard linkini /author?tab=stats adresine yönlendirir.
 * Bu sayede bildirimlerden gelen linkler kırılmaz.
 */
export default function AuthorDashboardRedirect() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace("/author?tab=stats");
  }, [router]);
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-base-100">
      <span className="loading loading-spinner loading-lg text-primary"></span>
    </div>
  );
}
