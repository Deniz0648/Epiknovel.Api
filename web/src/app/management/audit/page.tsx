"use client";

import React, { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import { 
  Search, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  Database, 
  User, 
  Activity,
  PlusCircle,
  Pencil,
  Trash2,
  Minimize2,
  Clock
} from "lucide-react";
const formatDate = (date: string) => {
   return new Intl.DateTimeFormat('tr-TR', {
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit'
   }).format(new Date(date));
};

type AuditLog = {
  id: string;
  userId?: string;
  module: string;
  action: string;
  entityName: string;
  primaryKeys?: string;
  state: number; // 0: None, 1: Added, 2: Modified, 3: Deleted
  oldValues?: string;
  newValues?: string;
  changedColumns?: string;
  ipAddress?: string;
  endpoint?: string;
  method?: string;
  traceId?: string;
  createdAt: string;
};

const STATE_CONFIG: Record<number, { label: string; color: string; icon: any }> = {
  0: { label: "None", color: "text-base-content/40", icon: Minimize2 },
  1: { label: "Ekleme", color: "text-emerald-500 bg-emerald-500/10", icon: PlusCircle },
  2: { label: "Duzenleme", color: "text-orange-500 bg-orange-500/10", icon: Pencil },
  3: { label: "Silme", color: "text-red-500 bg-red-500/10", icon: Trash2 },
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState<string | null>(null);
  const [take] = useState(25);
  
  // Filters
  const [moduleFilter, setModuleFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const fetchLogs = async (currentCursor: string | null = null) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("take", take.toString());
      if (currentCursor) params.append("cursor", currentCursor);
      if (moduleFilter) params.append("module", moduleFilter);
      if (actionFilter) params.append("action", actionFilter);
      if (searchQuery) params.append("traceId", searchQuery); // Simple mapping for now

      const response = await apiRequest<AuditLog[]>(`/management/audit-logs?${params.toString()}`);
      setLogs(response);
    } catch (error) {
      console.error("Audit logs error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [moduleFilter, actionFilter, take]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs();
  };

  const handleNextPage = () => {
    if (logs.length > 0) {
      const lastCreatedAt = logs[logs.length - 1].createdAt;
      fetchLogs(lastCreatedAt);
    }
  };

  const parseJson = (json?: string) => {
    if (!json) return null;
    try {
      return JSON.parse(json);
    } catch {
      return json;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Area */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
           <h1 className="text-2xl font-black uppercase italic tracking-tight text-base-content sm:text-3xl">Sistem Gunlukleri</h1>
           <p className="text-sm font-medium text-base-content/40">Sistem genelindeki tum degisiklik ve islemlerin kayitlari</p>
        </div>
        
        <div className="flex items-center gap-2">
           <button 
             onClick={() => fetchLogs()} 
             className="glass-frame flex h-10 w-10 items-center justify-center text-base-content/60 transition hover:bg-primary/10 hover:text-primary active:scale-95"
           >
              <Activity className="h-5 w-5" />
           </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
         <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-base-content/30 group-focus-within:text-primary transition-colors" />
            <form onSubmit={handleSearch}>
               <input 
                 type="text" 
                 placeholder="Trace ID veya Kullanici ara..." 
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 className="h-12 w-full rounded-2xl border border-base-content/10 bg-base-content/5 pl-10 text-sm font-bold outline-none ring-primary/20 transition focus:border-primary/30 focus:ring-4"
               />
            </form>
         </div>

         <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-base-content/30" />
            <select 
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
              className="h-12 w-full appearance-none rounded-2xl border border-base-content/10 bg-base-content/5 pl-10 text-sm font-bold outline-none transition focus:border-primary/30"
            >
               <option value="">Tum Moduller</option>
               <option value="Identity">Identity</option>
               <option value="Books">Books</option>
               <option value="Compliance">Compliance</option>
               <option value="Users">Users</option>
               <option value="Management">Management</option>
               <option value="Social">Social</option>
               <option value="Wallet">Wallet</option>
               <option value="Search">Search</option>
               <option value="Infrastructure">Infrastructure</option>
            </select>
         </div>

         <div className="relative">
            <Activity className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-base-content/30" />
            <select 
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="h-12 w-full appearance-none rounded-2xl border border-base-content/10 bg-base-content/5 pl-10 text-sm font-bold outline-none transition focus:border-primary/30"
            >
               <option value="">Tum Islemler</option>
               <option value="Added">Ekleme</option>
               <option value="Modified">Guncelleme</option>
               <option value="Deleted">Silme</option>
               <option value="Impersonate">Kimlik Degisimi</option>
            </select>
         </div>

         <div className="flex gap-2">
            <button 
              onClick={() => fetchLogs()}
              className="flex-1 rounded-2xl bg-primary px-4 text-sm font-black uppercase tracking-widest text-primary-content shadow-lg shadow-primary/20 transition hover:scale-105 active:scale-95"
            >
               Filtrele
            </button>
            <button 
              onClick={() => { setModuleFilter(""); setActionFilter(""); setSearchQuery(""); fetchLogs(); }}
              className="glass-frame flex h-12 w-12 items-center justify-center text-base-content/40 transition hover:bg-error/10 hover:text-error"
            >
               <Trash2 className="h-5 w-5" />
            </button>
         </div>
      </div>

      {/* Logs Table */}
      <div className="glass-frame overflow-hidden">
         <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
               <thead>
                  <tr className="border-b border-base-content/5 bg-base-content/2 text-[10px] font-black uppercase tracking-widest text-base-content/40">
                     <th className="px-6 py-4">Islem / Yonetici</th>
                     <th className="px-6 py-4">Varlik (Entity)</th>
                     <th className="px-6 py-4">Modul</th>
                     <th className="px-6 py-4 text-center">Durum</th>
                     <th className="px-6 py-4">Tarih</th>
                     <th className="px-6 py-4 text-right">Detay</th>
                  </tr>
               </thead>
               <tbody>
                  {loading && logs.length === 0 ? (
                     Array.from({ length: 5 }).map((_, i) => (
                       <tr key={i} className="animate-pulse border-b border-base-content/5">
                          <td colSpan={6} className="h-20 px-6">
                             <div className="flex items-center gap-4">
                                <div className="h-10 w-10 rounded-xl bg-base-content/5" />
                                <div className="space-y-2">
                                   <div className="h-4 w-32 rounded bg-base-content/5" />
                                   <div className="h-3 w-24 rounded bg-base-content/5" />
                                </div>
                             </div>
                          </td>
                       </tr>
                     ))
                  ) : logs.length === 0 ? (
                    <tr>
                       <td colSpan={6} className="py-20 text-center">
                          <Database className="mx-auto mb-4 h-12 w-12 opacity-10" />
                          <p className="text-sm font-bold text-base-content/20 uppercase tracking-widest">Kayıt Bulunamadı</p>
                       </td>
                    </tr>
                  ) : (
                    logs.map((log) => {
                       const config = STATE_CONFIG[log.state] || STATE_CONFIG[0];
                       const isExpanded = expandedRow === log.id;
                       
                       return (
                          <React.Fragment key={log.id}>
                             <tr className={`border-b border-base-content/5 transition-colors hover:bg-base-content/2 ${isExpanded ? 'bg-base-content/2' : ''}`}>
                                <td className="px-6 py-4">
                                   <div className="flex items-center gap-3">
                                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-base-content/5 text-base-content/40">
                                         <User className="h-5 w-5" />
                                      </div>
                                      <div>
                                         <p className="text-sm font-bold text-base-content">{log.action}</p>
                                         <p className="text-[10px] font-medium text-base-content/30">{log.userId ? `ID: ...${log.userId.slice(-6)}` : 'Sistem'}</p>
                                      </div>
                                   </div>
                                </td>
                                <td className="px-6 py-4">
                                   <p className="text-sm font-bold text-base-content/70">{log.entityName}</p>
                                   <p className="text-[10px] font-medium text-base-content/30">{log.primaryKeys || '-'}</p>
                                </td>
                                <td className="px-6 py-4">
                                   <span className="rounded-lg bg-base-content/5 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-base-content/50">
                                      {log.module}
                                   </span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                   <div className={`mx-auto flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${config.color} border border-current/10`}>
                                      <config.icon className="h-3 w-3" />
                                      {config.label}
                                   </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                   <div className="flex items-center gap-2 text-base-content/60">
                                      <Clock className="h-3 w-3 opacity-40" />
                                      <span className="text-xs font-bold">{formatDate(log.createdAt)}</span>
                                   </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                   <button 
                                     onClick={() => setExpandedRow(isExpanded ? null : log.id)}
                                     className={`p-2 rounded-xl transition-all ${isExpanded ? 'bg-primary text-primary-content rotate-180' : 'bg-base-content/5 text-base-content/40 hover:bg-primary/10 hover:text-primary'}`}
                                   >
                                      <Eye className="h-4 w-4" />
                                   </button>
                                </td>
                             </tr>
                             {isExpanded && (
                                <tr className="bg-base-content/2 border-b border-base-content/10">
                                   <td colSpan={6} className="px-6 py-8">
                                      <div className="grid gap-6 lg:grid-cols-2">
                                         <div className="space-y-3">
                                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-500">Eski Degerler</p>
                                            <div className="rounded-2xl border border-base-content/10 bg-base-100 p-4 font-mono text-[11px] leading-relaxed text-base-content/60 shadow-inner max-h-[300px] overflow-auto">
                                               <pre>{log.oldValues ? JSON.stringify(parseJson(log.oldValues), null, 2) : "// Degisiklik yok"}</pre>
                                            </div>
                                         </div>
                                         <div className="space-y-3">
                                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500">Yeni Degerler</p>
                                            <div className="rounded-2xl border border-emerald-500/10 bg-emerald-50/50 p-4 font-mono text-[11px] leading-relaxed text-emerald-800 shadow-inner max-h-[300px] overflow-auto">
                                               <pre>{log.newValues ? JSON.stringify(parseJson(log.newValues), null, 2) : "// Degisiklik yok"}</pre>
                                            </div>
                                         </div>
                                         
                                         <div className="lg:col-span-2 grid gap-4 sm:grid-cols-3">
                                            <div className="rounded-xl bg-base-content/5 p-3">
                                               <p className="text-[10px] font-black uppercase tracking-wider text-base-content/30 mb-1">IP Adresi</p>
                                               <p className="text-xs font-bold text-base-content">{log.ipAddress || '-'}</p>
                                            </div>
                                            <div className="rounded-xl bg-base-content/5 p-3">
                                               <p className="text-[10px] font-black uppercase tracking-wider text-base-content/30 mb-1">Trace ID</p>
                                               <p className="text-xs font-bold text-base-content">{log.traceId || '-'}</p>
                                            </div>
                                            <div className="rounded-xl bg-base-content/5 p-3">
                                               <p className="text-[10px] font-black uppercase tracking-wider text-base-content/30 mb-1">Cagri (Endpoint)</p>
                                               <p className="text-xs font-bold text-base-content">{log.method} {log.endpoint}</p>
                                            </div>
                                         </div>
                                      </div>
                                   </td>
                                </tr>
                             )}
                          </React.Fragment>
                       );
                    })
                  )}
               </tbody>
            </table>
         </div>

         {/* Pagination Bar */}
         <div className="flex h-16 items-center justify-between border-t border-base-content/5 bg-base-content/2 px-6">
            <p className="text-xs font-bold text-base-content/30">
               Gosterilen: <span className="text-base-content/60">{logs.length}</span> Kayit
            </p>
            <div className="flex items-center gap-2">
               <button 
                 onClick={() => fetchLogs()} 
                 className="flex h-10 px-4 items-center gap-2 rounded-xl bg-base-content/5 text-xs font-black uppercase tracking-widest text-base-content/40 transition hover:bg-base-content/10 active:scale-95"
               >
                  Basa Don
               </button>
               <button 
                 onClick={handleNextPage}
                 disabled={logs.length < take}
                 className="flex h-10 px-6 items-center gap-2 rounded-xl bg-primary text-xs font-black uppercase tracking-widest text-primary-content shadow-lg shadow-primary/20 transition hover:scale-105 active:scale-95 disabled:opacity-50 disabled:grayscale"
               >
                  Daha Fazla Yukle
                  <ChevronRight className="h-4 w-4" />
               </button>
            </div>
         </div>
      </div>
    </div>
  );
}

