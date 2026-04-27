"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  Search,
  UserPlus,
  MoreVertical,
  Shield,
  ShieldOff,
  ExternalLink,
  History,
  Wallet,
  BookOpen,
  MessageCircle,
  ChevronRight,
  Loader2,
  Filter,
  Ban,
  Unlock,
  Calendar,
  Mail,
  Coins,
  ShoppingBag,
  ArrowLeft
} from "lucide-react";
import { apiRequest } from "@/lib/api";
import { showToast } from "@/lib/toast";
import Link from "next/link";

export default function UserManagementPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userDetails, setUserDetails] = useState<any>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);

  async function loadUsers(initial = true) {
    if (initial) setIsLoading(true);
    try {
      const url = `/management/users?take=20${initial ? "" : cursor ? `&cursor=${cursor}` : ""}${searchQuery ? `&search=${searchQuery}` : ""}`;
      const data = await apiRequest<any[]>(url);

      if (initial) {
        setUsers(data);
      } else {
        setUsers(prev => [...prev, ...data]);
      }

      if (data.length > 0) {
        setCursor(data[data.length - 1].createdAt);
      } else {
        setCursor(null);
      }
    } catch (err) {
      console.error("Kullanıcı listesi yuklenirken hata:", err);
      showToast({ title: "Hata", description: "Kullanıcı listesi yüklenemedi.", tone: "error" });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      loadUsers(true);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  async function loadUserDetails(userId: string) {
    setIsLoadingDetails(true);
    try {
      const data = await apiRequest<any>(`/management/users/${userId}`);
      setUserDetails(data);
    } catch (err) {
      console.error("Kullanıcı detaylari yuklenirken hata:", err);
      showToast({ title: "Hata", description: "Kullanıcı detayları yüklenemedi.", tone: "error" });
    } finally {
      setIsLoadingDetails(false);
    }
  }

  async function handleBan(userId: string) {
    const reason = prompt("Banlama sebebi giriniz:");
    if (!reason) return;

    try {
      await apiRequest(`/management/users/${userId}/ban`, {
        method: "POST",
        body: JSON.stringify({ targetUserId: userId, reason })
      });
      showToast({ title: "Başarılı", description: "Kullanıcı yasaklandı.", tone: "success" });
      loadUsers(true);
      if (userDetails?.id === userId) loadUserDetails(userId);
    } catch (err) {
      showToast({ title: "Hata", description: "İşlem başarısız (Yetki yetersiz olabilir).", tone: "error" });
    }
  }

  async function handleUnban(userId: string) {
    if (!confirm("Kullanıcının yasağını kaldırmak istediğinize emin misiniz?")) return;

    try {
      await apiRequest(`/management/users/${userId}/unban`, {
        method: "POST",
        body: JSON.stringify({ targetUserId: userId })
      });
      showToast({ title: "Başarılı", description: "Yasak kaldırıldı.", tone: "success" });
      loadUsers(true);
      if (userDetails?.id === userId) loadUserDetails(userId);
    } catch (err) {
      showToast({ title: "Hata", description: "İşlem başarısız.", tone: "error" });
    }
  }

  async function handleToggleRole(userId: string, role: string) {
    const currentRoles = userDetails?.roles || selectedUser?.roles || [];
    const isRemoving = currentRoles.includes(role);

    if (role === "User" && isRemoving) {
      showToast({ title: "Bilgi", description: "Temel kullanıcı rolü kaldırılamaz.", tone: "info" });
      return;
    }

    const actionText = isRemoving ? "kaldırmak" : "atamak";
    if (!confirm(`Kullanıcıya "${role}" rolünü ${actionText} istediğinize emin misiniz?`)) return;

    try {
      const nextRoles = isRemoving
        ? currentRoles.filter((r: string) => r !== role)
        : [...currentRoles, role];

      await apiRequest(`/management/users/${userId}/role`, {
        method: "POST",
        body: JSON.stringify({ targetUserId: userId, roles: nextRoles })
      });
      showToast({ title: "Başarılı", description: "Yetkiler güncellendi.", tone: "success" });
      loadUsers(true);
      if (userDetails?.id === userId) loadUserDetails(userId);
    } catch (err) {
      showToast({ title: "Hata", description: "Yetki güncellenemedi.", tone: "error" });
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role.toLowerCase()) {
      case "superadmin": return "bg-red-500 text-white";
      case "admin": return "bg-orange-500 text-white";
      case "mod": return "bg-purple-500 text-white";
      case "author": return "bg-blue-500 text-white";
      default: return "bg-base-content/10 text-base-content/60";
    }
  };

  return (
    <div className="flex h-full lg:h-[calc(100vh-120px)] flex-col gap-4 lg:gap-6 p-2 md:p-4 lg:p-0">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-black uppercase italic tracking-tight text-base-content/80">User Management</h1>
          <p className="text-[10px] md:text-sm font-medium text-base-content/40 mt-0.5 md:mt-1">Platformdaki tüm kullanıcıları yönetin ve izleyin.</p>
        </div>
      </div>

      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        {/* User Table Card */}
        <div className={`flex flex-col flex-1 rounded-3xl md:rounded-[2.5rem] border border-base-content/5 bg-base-100/50 backdrop-blur-md overflow-hidden ${selectedUser ? "hidden" : "flex"}`}>
          <div className="p-4 md:p-6 border-b border-base-content/5 flex flex-col md:flex-row items-stretch md:items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-base-content/20" />
              <input
                type="text"
                placeholder="E-posta, isim veya ID ara..."
                className="h-11 w-full rounded-xl border border-base-content/10 bg-base-100 pl-12 pr-4 text-sm font-bold outline-none transition focus:border-primary/30"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button className="btn btn-ghost btn-sm rounded-xl">
              <Filter className="h-4 w-4 mr-2" /> Filter
            </button>
          </div>

          <div className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-base-100/80 backdrop-blur-md z-10">
                <tr className="border-b border-base-content/5">
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-base-content/40">Kullanıcı</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-base-content/40">Yetkiler</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-base-content/40">Durum</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-base-content/40 text-right">Eylemler</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="p-12 text-center">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-12 text-center opacity-20 italic font-bold">Kullanıcı bulunamadı.</td>
                  </tr>
                ) : (
                  users.map(user => (
                    <tr
                      key={user.id}
                      className={`border-b border-base-content/5 transition hover:bg-base-content/5 cursor-pointer ${selectedUser?.id === user.id ? "bg-primary/5" : ""}`}
                      onClick={() => {
                        setSelectedUser(user);
                        loadUserDetails(user.id);
                      }}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-black text-primary">
                            {user.displayName.slice(0, 1)}
                          </div>
                          <div>
                            <div className="text-sm font-black">{user.displayName}</div>
                            <div className="text-[10px] font-medium text-base-content/40 lowercase">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {user.roles.map((role: string) => (
                            <span key={role} className={`rounded-md px-1.5 py-0.5 text-[8px] font-black uppercase tracking-tighter ${getRoleBadgeColor(role)}`}>
                              {role}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {user.isBanned ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-error/10 px-2 py-0.5 text-[9px] font-black text-error italic">
                            <Ban className="h-3 w-3" /> YASAKLI
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[9px] font-black text-success">
                            <CheckCircle2 className="h-3 w-3" /> AKTİF
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {user.isBanned ? (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleUnban(user.id); }}
                              className="p-2 hover:bg-success/10 text-success/60 hover:text-success transition rounded-xl"
                              title="Yasağı Kaldır"
                            >
                              <Unlock className="h-4 w-4" />
                            </button>
                          ) : (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleBan(user.id); }}
                              className="p-2 hover:bg-error/10 text-error/60 hover:text-error transition rounded-xl"
                              title="Yasakla"
                            >
                              <Ban className="h-4 w-4" />
                            </button>
                          )}
                          <Link
                            href={`/community/${user.slug}`}
                            className="p-2 hover:bg-info/10 text-info/60 hover:text-info transition rounded-xl"
                            onClick={(e) => e.stopPropagation()}
                            title="Profilli Gör"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* User Detail Info Panel */}
        <div className={`flex-1 flex-col gap-6 overflow-y-auto no-scrollbar ${selectedUser ? "flex" : "hidden"}`}>
          {selectedUser ? (
            <div className="flex flex-col gap-6 pb-20 max-w-5xl mx-auto w-full">
              {/* Back Button */}
              <button
                onClick={() => setSelectedUser(null)}
                className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-primary mb-2 hover:translate-x-1 transition-transform w-fit"
              >
                <ArrowLeft className="h-4 w-4" /> Listeye Geri Dön
              </button>

              {/* Profile Overview */}
              <div className="rounded-[2.5rem] border border-base-content/5 bg-base-100/50 p-6 flex flex-col items-center text-center">
                <div className="h-24 w-24 rounded-3xl bg-primary/10 flex items-center justify-center font-black text-4xl text-primary mb-4 relative overflow-hidden group">
                  {selectedUser.displayName.slice(0, 1)}
                  <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                    <Users className="h-8 w-8 text-primary" />
                  </div>
                </div>
                <h2 className="text-2xl font-black italic">{selectedUser.displayName}</h2>
                <div className="flex flex-col gap-0.5 mb-4">
                  <span className="text-xs font-medium text-base-content/30 lowercase">{selectedUser.email}</span>
                  <span className="text-[10px] font-black tracking-widest text-primary/40 uppercase">@{selectedUser.slug}</span>
                </div>

                <div className="flex gap-2 mb-6">
                  {selectedUser.roles.map((role: string) => (
                    <span key={role} className={`rounded-xl px-3 py-1 text-[9px] font-black uppercase tracking-widest ${getRoleBadgeColor(role)} shadow-sm`}>
                      {role}
                    </span>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3 w-full mb-6">
                  <div className="rounded-2xl bg-base-content/5 p-3 text-left border border-base-content/5">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-base-content/30 mb-1">
                      <Calendar className="h-3 w-3" /> Katılım
                    </div>
                    <div className="text-xs font-bold">{new Date(selectedUser.createdAt).toLocaleDateString("tr-TR")}</div>
                  </div>
                  <div className="rounded-2xl bg-base-content/5 p-3 text-left border border-base-content/5">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-base-content/30 mb-1">
                      <Shield className="h-3 w-3" /> Durum
                    </div>
                    <div className={`text-xs font-bold ${selectedUser.isBanned ? "text-error italic" : "text-success"}`}>
                      {selectedUser.isBanned ? "YASAKLI" : "AKTİF"}
                    </div>
                  </div>
                </div>

                {/* Role Assignment Section */}
                <div className="w-full pt-6 border-t border-base-content/5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-base-content/30 mb-4 text-left">YETKİ SEVİYESİNİ GÜNCELLE</p>
                  <div className="flex flex-wrap gap-2">
                    {["User", "Author", "Mod", "Admin", "SuperAdmin"].map((r) => {
                      const roles = userDetails?.roles || selectedUser?.roles || [];
                      const isActive = roles.includes(r);
                      return (
                        <button
                          key={r}
                          onClick={() => handleToggleRole(selectedUser.id, r)}
                          className={`flex-1 min-w-[80px] px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-tighter transition-all border ${isActive
                            ? `${getRoleBadgeColor(r)} border-transparent shadow-lg shadow-primary/20`
                            : "bg-base-content/5 border-base-content/5 hover:bg-base-content/10 text-base-content/40"
                            }`}
                        >
                          {r}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Economic History */}
              <div className="rounded-[2.5rem] border border-base-content/5 bg-base-100/50 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-black uppercase tracking-widest text-base-content/40 flex items-center gap-2">
                    <Wallet className="h-4 w-4" /> EKONOMİK DURUM
                  </h3>
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-warning/10 text-warning border border-warning/10">
                    <Coins className="h-3.5 w-3.5" />
                    <span className="text-sm font-black">{isLoadingDetails ? "..." : userDetails?.tokenBalance?.toLocaleString() || "0"}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  {isLoadingDetails ? (
                    <div className="flex justify-center p-6"><Loader2 className="h-5 w-5 animate-spin opacity-20" /></div>
                  ) : userDetails?.recentTransactions?.length === 0 ? (
                    <div className="text-center py-6 text-[10px] font-medium opacity-20 italic uppercase tracking-widest">İşlem geçmişi yok.</div>
                  ) : (
                    userDetails?.recentTransactions?.map((tx: any) => (
                      <div key={tx.id} className="flex items-center justify-between p-3 rounded-2xl bg-base-content/2 border border-base-content/5 hover:bg-base-content/5 transition-colors">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black uppercase tracking-tight line-clamp-1">{tx.description}</span>
                          <span className="text-[8px] font-medium text-base-content/30">{new Date(tx.createdAt).toLocaleString("tr-TR")}</span>
                        </div>
                        <span className={`text-xs font-black p-1.5 rounded-lg ${tx.amount > 0 ? "bg-success/10 text-success" : "bg-error/10 text-error"}`}>
                          {tx.amount > 0 ? "+" : ""}{tx.amount}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Work History (Grouped by Book) */}
              <div className="rounded-[2.5rem] border border-base-content/5 bg-base-100/50 p-6">
                <h3 className="text-xs font-black uppercase tracking-widest text-base-content/40 mb-4 flex items-center gap-2">
                  <BookOpen className="h-4 w-4" /> YAYINLANAN ESERLER ({userDetails?.totalChapters || 0} Bölüm)
                </h3>

                <div className="flex flex-col gap-4">
                  {isLoadingDetails ? (
                    <div className="flex justify-center p-6"><Loader2 className="h-5 w-5 animate-spin opacity-20" /></div>
                  ) : userDetails?.books?.length === 0 ? (
                    <div className="text-center py-6 text-[10px] font-medium opacity-20 italic uppercase tracking-widest">Yayınlanan kitap yok.</div>
                  ) : (
                    userDetails?.books?.map((book: any) => (
                      <div key={book.id} className="rounded-3xl border border-base-content/5 bg-base-content/2 overflow-hidden">
                        <div className="bg-base-content/5 p-4">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="text-xs font-black italic uppercase tracking-tight text-primary">{book.title}</h4>
                            <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-primary/10 text-primary uppercase">{book.status}</span>
                          </div>
                          <div className="text-[9px] font-bold text-base-content/30 uppercase tracking-widest">{book.chapterCount} BÖLÜM YAYINDA</div>
                        </div>

                        {book.chapters?.length > 0 && (
                          <div className="p-2 space-y-1">
                            {book.chapters.slice(0, 5).map((chap: any) => (
                              <div key={chap.id} className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-primary/5 transition-colors group">
                                <span className="text-[10px] font-medium text-base-content/60 group-hover:text-base-content transition italic line-clamp-1">{chap.title}</span>
                                <div className="flex items-center gap-2">
                                  {chap.isFree ? (
                                    <span className="text-[8px] font-black text-success/50 uppercase">Free</span>
                                  ) : (
                                    <span className="text-[8px] font-black text-warning/50 uppercase">{chap.price} C</span>
                                  )}
                                  <span className="text-[8px] font-medium text-base-content/20">{new Date(chap.createdAt).toLocaleDateString("tr-TR")}</span>
                                </div>
                              </div>
                            ))}
                            {book.chapters.length > 5 && (
                              <div className="text-center p-1 text-[8px] font-black text-base-content/20 uppercase tracking-tighter">
                                + {book.chapters.length - 5} Diğer Bölüm
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Purchased Chapters */}
              <div className="rounded-[2.5rem] border border-base-content/5 bg-base-100/50 p-6">
                <h3 className="text-xs font-black uppercase tracking-widest text-base-content/40 mb-4 flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4" /> SATIN ALINAN BÖLÜMLER ({userDetails?.purchasedChapters?.length || 0})
                </h3>

                <div className="flex flex-col gap-3">
                  {isLoadingDetails ? (
                    <div className="flex justify-center p-6"><Loader2 className="h-5 w-5 animate-spin opacity-20" /></div>
                  ) : userDetails?.purchasedChapters?.length === 0 ? (
                    <div className="text-center py-6 text-[10px] font-medium opacity-20 italic uppercase tracking-widest">Henüz bir satın alım yok.</div>
                  ) : (
                    userDetails?.purchasedChapters?.map((purchase: any) => (
                      <div key={purchase.chapterId} className="p-4 rounded-3xl bg-base-content/2 border border-base-content/5 hover:bg-base-content/5 transition-colors">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[8px] font-black uppercase text-primary/60 tracking-widest truncate max-w-[150px]">{purchase.bookTitle}</span>
                          <span className="text-[8px] font-medium text-base-content/20">{new Date(purchase.purchasedAt).toLocaleDateString("tr-TR")}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-black italic uppercase truncate pr-4">{purchase.chapterTitle}</h4>
                          <span className="text-[10px] font-black p-1.5 rounded-lg bg-warning/10 text-warning">
                            {purchase.price} C
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center opacity-10 text-center px-12">
              <Users className="h-24 w-24 mb-6" />
              <p className="text-xl font-black uppercase italic tracking-widest">Kullanıcı seçin</p>
              <p className="text-[10px] font-bold uppercase mt-2">Detayları görmek ve yönetmek için listeden bir kullanıcıya tıklayın.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const CheckCircle2 = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
);
