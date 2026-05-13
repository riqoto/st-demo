"use client";

import { useEffect, useState, useRef } from "react";
import { ref, onValue, off, set, query, limitToLast, update, remove } from "firebase/database";
import { db } from "@/lib/firebase";
import { motion, AnimatePresence } from "framer-motion";
import {
  RefreshCw, Zap, Activity, Loader2, X,
  Server, Trash2, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type WorkerState = "offline" | "loading_model" | "model_loaded" | "warming_up" | "ready" | "processing" | "error";

interface WorkerStatus {
  state: WorkerState;
  message: string;
  lastHeartbeat: number;
  startedAt: number;
  processedCount: number;
  currentRoom: string | null;
  lastError: string | null;
  lastErrorAt: number | null;
  progress: number;
}

interface LogEntry {
  id: string;
  msg: string;
  lvl: string;
  ts: number;
}

interface CommandResult {
  command: string;
  result: string;
  message: string;
  timestamp: number;
}

const STATE_MAP: Record<string, { label: string; dot: string; bg: string }> = {
  offline:       { label: "Çevrimdışı",       dot: "bg-red-500",     bg: "bg-red-500" },
  loading_model: { label: "Model Yükleniyor", dot: "bg-amber-500",   bg: "bg-amber-500" },
  model_loaded:  { label: "Model Yüklendi",   dot: "bg-blue-500",    bg: "bg-blue-500" },
  warming_up:    { label: "Isınıyor",         dot: "bg-amber-500",   bg: "bg-amber-500" },
  ready:         { label: "Hazır",            dot: "bg-emerald-500", bg: "bg-emerald-500" },
  processing:    { label: "İşliyor",          dot: "bg-blue-500",    bg: "bg-blue-500" },
  error:         { label: "Hata",             dot: "bg-red-500",     bg: "bg-red-500" },
};

export default function WorkerMonitor({ roomId }: { roomId?: string }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<WorkerStatus | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [cmdResult, setCmdResult] = useState<CommandResult | null>(null);
  const [isAlive, setIsAlive] = useState(false);
  const [sendingCmd, setSendingCmd] = useState<string | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Subscribe to worker status
  useEffect(() => {
    const statusRef = ref(db, "workerStatus");
    const unsubStatus = onValue(statusRef, (snap) => {
      setStatus(snap.exists() ? snap.val() : null);
    });
    const resultRef = ref(db, "workerCommandResult");
    const unsubResult = onValue(resultRef, (snap) => {
      if (snap.exists()) {
        setCmdResult(snap.val());
        setTimeout(() => setCmdResult(null), 4000);
      }
    });
    return () => { unsubStatus(); unsubResult(); };
  }, []);

  // Subscribe to logs
  useEffect(() => {
    const logsQuery = query(ref(db, "workerLogs"), limitToLast(60));
    const unsub = onValue(logsQuery, (snap) => {
      try {
        if (snap.exists()) {
          const data = snap.val();
          const list = Object.entries(data)
            .map(([id, val]: [string, any]) => ({ id, ...val }))
            .sort((a: LogEntry, b: LogEntry) => a.ts - b.ts);
          setLogs(list);
        } else {
          setLogs([]);
        }
      } catch (e) {
        console.error("Log parse error", e);
      }
    });
    return () => unsub();
  }, []);

  // Auto-scroll logs
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  // Heartbeat alive check
  useEffect(() => {
    const check = () => {
      if (status?.lastHeartbeat) {
        setIsAlive(Date.now() - status.lastHeartbeat < 15000);
      } else {
        setIsAlive(false);
      }
    };
    check();
    const iv = setInterval(check, 3000);
    return () => clearInterval(iv);
  }, [status?.lastHeartbeat]);

  const sendCommand = async (command: string) => {
    setSendingCmd(command);
    try {
      const cmdData: Record<string, string | number> = { command, timestamp: Date.now() };
      if (roomId) cmdData.roomId = roomId;
      await set(ref(db, "workerCommands"), cmdData);
    } catch (e) { console.error(e); }
    setTimeout(() => setSendingCmd(null), 3000);
  };

  const clearLogs = async () => {
    try { await remove(ref(db, "workerLogs")); } catch (e) { console.error(e); }
  };

  const cancelGeneration = async () => {
    if (!roomId) return;
    try {
      await update(ref(db, `rooms/${roomId}`), { status: "completed" });
    } catch (e) { console.error(e); }
  };

  const effectiveState = isAlive ? (status?.state || "offline") : "offline";
  const cfg = STATE_MAP[effectiveState] || STATE_MAP.offline;
  const progress = status?.progress ?? 0;
  const isProcessing = effectiveState === "processing";

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };

  return (
    <>
      {/* Floating Action Button — bottom right */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 h-12 w-12 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 active:scale-95 border-2 border-white bg-gray-900 text-white"
      >
        <Server className="h-5 w-5" />
        <span className={`absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-gray-900 ${cfg.dot} ${
          isProcessing ? "animate-pulse" : ""
        }`} />
        {isProcessing && progress > 0 && (
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[9px] font-mono font-bold bg-blue-500 text-white px-1.5 rounded-full">
            {progress}%
          </span>
        )}
      </button>

      {/* Right Drawer */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[60]"
              onClick={() => setOpen(false)}
            />
            {/* Drawer */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 350 }}
              className="fixed top-0 right-0 bottom-0 w-full max-w-[400px] bg-white z-[61] border-l border-gray-200 shadow-2xl flex flex-col"
            >
              {/* Header */}
              <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Server className="h-5 w-5 text-gray-600" />
                    <span className={`absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white ${cfg.dot}`} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold">GPU Worker</h3>
                    <p className="text-[11px] text-muted-foreground">{cfg.label}</p>
                  </div>
                </div>
                <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Progress bar */}
              {isProcessing && (
                <div className="px-5 py-3 border-b border-gray-100 shrink-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-medium text-muted-foreground">İlerleme</span>
                    <span className="text-[11px] font-bold font-mono">{progress}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-blue-500 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                  {status?.message && (
                    <p className="text-[10px] text-muted-foreground mt-1.5 truncate">{status.message}</p>
                  )}
                </div>
              )}

              {/* Status details */}
              <div className="px-5 py-3 border-b border-gray-100 shrink-0">
                <div className="grid grid-cols-3 gap-3 text-[11px]">
                  <div>
                    <p className="text-muted-foreground mb-0.5">Heartbeat</p>
                    <p className="font-bold font-mono">
                      {status?.lastHeartbeat
                        ? (() => { const s = Math.floor((Date.now() - status.lastHeartbeat) / 1000); return s < 60 ? `${s}s` : `${Math.floor(s/60)}dk`; })()
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-0.5">Üretim</p>
                    <p className="font-bold font-mono">{status?.processedCount ?? 0}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-0.5">Oda</p>
                    <p className="font-bold font-mono truncate">{status?.currentRoom || "—"}</p>
                  </div>
                </div>
                {status?.lastError && (
                  <div className="mt-2 p-2 bg-red-50 rounded-md border border-red-200">
                    <p className="text-[10px] text-red-600 font-mono break-all">{status.lastError}</p>
                  </div>
                )}
              </div>

              {/* Command result toast */}
              <AnimatePresence>
                {cmdResult && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="px-5 shrink-0"
                  >
                    <div className={`p-2.5 rounded-lg text-[11px] font-medium mt-2 ${
                      cmdResult.result === "error"
                        ? "bg-red-50 text-red-700 border border-red-200"
                        : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    }`}>
                      {cmdResult.message}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Live Logs */}
              <div className="flex-1 overflow-y-auto px-4 py-3 font-mono text-[11px] bg-white">
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-sans">
                    Canlı Loglar ({logs.length})
                  </span>
                  <button onClick={clearLogs} className="text-[10px] text-red-500 hover:text-red-700 font-sans font-medium">
                    Temizle
                  </button>
                </div>
                {logs.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8 text-xs font-sans">
                    Henüz log yok
                  </div>
                ) : (
                  <div className="flex flex-col">
                    {logs.map((log) => {
                      const rawText = typeof log?.msg === 'string' ? log.msg : "";
                      const cleanText = rawText.replace(/[\u{1F300}-\u{1F9FF}\u{2700}-\u{27BF}\u{2600}-\u{26FF}\uFE0F]/gu, '').trim();
                      let color = "text-gray-700";
                      if (log.lvl === 'error') color = "text-red-600 font-medium";
                      else if (cleanText.includes("Final prompt")) color = "text-purple-700 font-medium";
                      else if (cleanText.includes("Prompt")) color = "text-emerald-700";
                      else if (cleanText.includes("Ayarlar")) color = "text-amber-600";
                      else if (cleanText.includes("tamamlandı")) color = "text-blue-700 font-medium";
                      else if (cleanText.includes("işleniyor")) color = "text-gray-900 font-medium";
                      
                      return (
                        <div
                          key={log.id}
                          className="flex justify-between items-start py-2 border-b border-gray-100 last:border-0 hover:bg-gray-50/50 transition-colors"
                        >
                          <div className="flex gap-1.5 w-full pr-3 leading-snug">
                            <span className={`font-bold shrink-0 text-[10px] ${log.lvl === 'error' ? 'text-red-500' : 'text-blue-500'}`}>
                              [{log.lvl === 'error' ? 'ERROR' : 'INFO'}]
                            </span>
                            <span className={`break-words ${color}`}>{cleanText}</span>
                          </div>
                          <span className="text-gray-400 shrink-0 text-[9px] pt-0.5 whitespace-nowrap font-sans font-medium">
                            {formatTime(log.ts)}
                          </span>
                        </div>
                      );
                    })}
                    <div ref={logsEndRef} />
                  </div>
                )}
              </div>

              {/* Command buttons */}
              <div className="px-4 py-3 border-t border-gray-200 shrink-0 space-y-2 bg-white">
                <div className="grid grid-cols-2 gap-1.5">
                  <Button variant="outline" size="sm" onClick={() => sendCommand("ping")}
                    disabled={sendingCmd !== null} className="h-9 text-[11px] font-bold">
                    {sendingCmd === "ping"
                      ? <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      : <Activity className="h-3 w-3 mr-1" />}
                    Ping
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => sendCommand("reconnect")}
                    disabled={sendingCmd !== null} className="h-9 text-[11px] font-bold">
                    {sendingCmd === "reconnect"
                      ? <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      : <RefreshCw className="h-3 w-3 mr-1" />}
                    Yeniden Bağlan
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => sendCommand("clear_cache")}
                    disabled={sendingCmd !== null} className="h-9 text-[11px] font-bold">
                    {sendingCmd === "clear_cache"
                      ? <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      : <Trash2 className="h-3 w-3 mr-1" />}
                    Cache Temizle
                  </Button>
                  {roomId && (
                    <Button variant="outline" size="sm" onClick={() => sendCommand("force_process")}
                      disabled={sendingCmd !== null} className="h-9 text-[11px] font-bold">
                      {sendingCmd === "force_process"
                        ? <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        : <Zap className="h-3 w-3 mr-1" />}
                      Zorla Üret
                    </Button>
                  )}
                </div>
                {isProcessing && roomId && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={cancelGeneration}
                    className="w-full h-9 text-[11px] font-bold border-red-300 text-red-600 hover:bg-red-50"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Üretimi İptal Et
                  </Button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
