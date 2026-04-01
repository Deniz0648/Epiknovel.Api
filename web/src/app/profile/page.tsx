import { ProfileDashboard } from "@/components/account/profile-dashboard";

export default function ProfilePage() {
  return (
    <main className="relative overflow-hidden">
      <div className="site-shell mx-auto flex min-h-screen flex-col gap-6 px-4 pb-8 pt-28 sm:px-8 sm:pb-10 sm:pt-32">
        <ProfileDashboard />
      </div>
    </main>
  );
}
