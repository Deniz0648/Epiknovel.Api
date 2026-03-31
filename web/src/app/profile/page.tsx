import { HeaderIsland } from "@/components/layout/header-island";
import { ProfileDashboard } from "@/components/account/profile-dashboard";

export default function ProfilePage() {
  return (
    <main className="relative overflow-hidden">
      <div className="fixed inset-x-0 top-0 z-50">
        <div className="mx-auto w-full max-w-7xl px-4 pt-3 sm:px-8 sm:pt-4">
          <HeaderIsland />
        </div>
      </div>

      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 pb-8 pt-28 sm:px-8 sm:pb-10 sm:pt-32">
        <ProfileDashboard />
      </div>
    </main>
  );
}
