"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { ThemeSelector } from "@/components/layout/theme-selector";
import { canAccessAdminPanel } from "@/lib/auth";
import { 
  LayoutDashboard, 
  ShieldCheck, 
  Coins,
  Users, 
  MessageSquare, 
  Settings, 
  ArrowLeft,
  ChevronRight,
  Search,
  Bell,
  Menu,
  X
} from "lucide-react";
import Link from "next/link";
import { usePathname, redirect } from "next/navigation";
import { useState, useEffect } from "react";

export default function ManagementLayout({ children }: { children: React.ReactNode }) {
  const { profile, isLoading } = useAuth();
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    if (!isLoading && !canAccessAdminPanel(profile)) {
      redirect("/");
    }
  }, [profile, isLoading]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-base-100">
        <p className="text-sm font-black uppercase tracking-[0.2em] text-base-content/40 animate-slow-pulse">Panel Yetkilendiriliyor...</p>
      </div>
    );
  }

  if (!canAccessAdminPanel(profile)) return null;

  const menuItems = [
    { label: "Dashboard", href: "/management", icon: LayoutDashboard },
    { label: "Sistem Gunlukleri", href: "/management/audit", icon: ShieldCheck },
    { label: "Icerik Denetimi", href: "/management/compliance", icon: ShieldCheck },
    { label: "Ekonomi Yonetimi", href: "/management/economy", icon: Coins },
    { label: "Destek Talepleri", href: "/management/support", icon: MessageSquare },
    { label: "Kullanicilar", href: "/management/users", icon: Users },
    { label: "Sistem Ayarlari", href: "/management/settings", icon: Settings },
  ];

  return (
    <div className="flex min-h-screen bg-base-100/50">
      {/* Sidebar Overlay (Mobile) */}
      {!isSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-base-100/60 backdrop-blur-sm xl:hidden"
          onClick={() => setIsSidebarOpen(true)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-base-content/10 bg-base-100/80 backdrop-blur-xl transition-transform duration-300 transform xl:static xl:translate-x-0 ${
          isSidebarOpen ? "-translate-x-full" : "translate-x-0"
        }`}
      >
        {/* Sidebar Header */}
        <div className="flex h-20 items-center justify-between px-6 border-b border-base-content/5">
          <Link href="/" className="flex items-center gap-2 group no-underline">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-content shadow-lg shadow-primary/20">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-black italic tracking-tighter text-base-content">ADMIN</span>
              <span className="text-[10px] font-black uppercase tracking-widest text-primary/60 -mt-1">Control Panel</span>
            </div>
          </Link>
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="xl:hidden p-2 rounded-xl bg-base-content/5"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* User Badge */}
        <div className="px-6 py-6 font-medium">
           <div className="rounded-2xl bg-base-content/5 p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-black uppercase">
                 {profile?.displayName.charAt(0)}
              </div>
              <div className="min-w-0">
                 <p className="text-sm font-bold text-base-content truncate">{profile?.displayName}</p>
                 <p className="text-[10px] font-black uppercase tracking-wider text-base-content/40 truncate">
                    {profile?.permissions?.superAdminAccess ? 'Super Admin' : (profile?.permissions?.adminAccess ? 'Admin' : 'Moderator')}
                 </p>
              </div>
           </div>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 space-y-1.5 px-4 overflow-y-auto py-2">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3.5 rounded-2xl px-4 py-3.5 text-sm font-bold transition-all group no-underline ${
                  isActive
                    ? "bg-primary text-primary-content shadow-xl shadow-primary/25"
                    : "text-base-content/60 hover:bg-base-content/5 hover:text-base-content/90"
                }`}
              >
                <item.icon className={`h-5 w-5 transition-transform group-hover:scale-110 ${isActive ? "" : "text-base-content/30"}`} />
                {item.label}
                {isActive && <ChevronRight className="ml-auto h-4 w-4 opacity-50" />}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top Header */}
        <header className="flex h-20 items-center justify-between px-6 border-b border-base-content/5 bg-base-100/40 backdrop-blur-md sticky top-0 z-30 xl:z-auto">
          <div className="flex items-center gap-4">
             <button 
               onClick={() => setIsSidebarOpen(false)}
               className="p-2 rounded-xl bg-base-content/5 xl:hidden"
             >
                <Menu className="h-5 w-5" />
             </button>
             <div className="hidden sm:flex items-center gap-2 text-xs font-black uppercase tracking-widest text-base-content/30">
                <LayoutDashboard className="h-3 w-3" />
                <span>Control</span>
                <ChevronRight className="h-3 w-3" />
                <span className="text-base-content/60">{menuItems.find(m => m.href === pathname)?.label || 'System'}</span>
             </div>
          </div>

          <div className="flex items-center gap-4">
             <div className="hidden md:flex relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-base-content/30" />
                <input 
                  type="text" 
                  placeholder="Hizli ara..." 
                  className="h-10 w-64 rounded-xl border border-base-content/10 bg-base-content/5 pl-10 text-xs font-bold outline-none ring-primary/20 transition focus:border-primary/30 focus:ring-4"
                />
             </div>
             <button className="relative p-2 rounded-xl bg-base-content/5 text-base-content/40 transition hover:bg-primary/10 hover:text-primary">
                <Bell className="h-5 w-5" />
                <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary border-2 border-base-100" />
             </button>
             
             <ThemeSelector />
             
             <Link 
                href="/" 
                className="hidden sm:flex h-10 items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-4 text-[10px] font-black uppercase tracking-widest text-primary no-underline transition hover:bg-primary hover:text-primary-content"
             >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Siteye Don</span>
             </Link>
          </div>
        </header>

        {/* Content Region */}
        <div className="flex-1 overflow-x-hidden p-6 sm:p-8 lg:p-10">
          {children}
        </div>
      </div>
    </div>
  );
}
