"use client";

import { useState, useEffect, use, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { Users, Play, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import RoomHeader from "@/components/RoomHeader";
import SynthesisView from "@/components/SynthesisView";
import { subscribeToRoom, advanceRound, updateRoomState } from "@/lib/firebaseService";
import type { Room } from "@/lib/types";

export default function AdminDashboardPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = use(params);
  const [room, setRoom] = useState<Room | null>(null);
  const [origin, setOrigin] = useState("");

  const router = useRouter();

  // Get the origin for QR code
  useEffect(() => {
    setOrigin(window.location.origin);
    const adminEmail = localStorage.getItem("sketchsync_admin_email");
    if (!adminEmail) {
      router.push("/");
    }
  }, [router]);

  // Subscribe to room state
  useEffect(() => {
    const unsubscribe = subscribeToRoom(roomId, (r) => {
      if (r) setRoom(r);
    });
    return () => unsubscribe();
  }, [roomId]);

  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

  const advancingRef = useRef(false);
  const handleNextRound = async () => {
    if (advancingRef.current) return;
    advancingRef.current = true;
    // First set waiting, then advance
    await updateRoomState(roomId, "waiting");
    setTimeout(async () => {
      await advanceRound(roomId);
      advancingRef.current = false;
    }, 500);
  };

  // Auto-advance
  useEffect(() => {
    if (!room || room.state !== "drawing" || !room.roundEndsAt) return;
    
    const interval = setInterval(() => {
      if (Date.now() >= room.roundEndsAt!) {
        clearInterval(interval);
        handleNextRound();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [room]);

  if (!room) {
    return (
      <div className="flex flex-1 items-center justify-center bg-soft-gray">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const participantUrl = `${origin}/${room.id}`;
  const isLobby = room.state === "lobby";
  const isDrawing = room.state === "drawing";
  const isWaiting = room.state === "waiting";
  const isSynthesis = room.state === "synthesis";
  const currentItem = room.items[room.currentRound - 1] ?? "";
  const totalRounds = room.items.length;

  const handleStartSession = async () => {
    await advanceRound(roomId);
  };

  // Synthesis
  if (isSynthesis) {
    return (
      <div className="flex flex-col flex-1 bg-soft-gray">
        <div className="border-b border-gray-300 bg-white py-3 px-4 shadow-soft">
          <RoomHeader roomId={room.id} />
        </div>
        <div className="flex-1 overflow-y-auto">
          <SynthesisView roomId={room.id} drawings={room.drawings} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 bg-soft-gray">
      {/* Top bar */}
      <div className="border-b border-gray-200 bg-white py-3 px-4 shadow-soft">
        <RoomHeader roomId={room.id} />
      </div>

      <div className="flex flex-col flex-1 items-center gap-6 overflow-y-auto px-4 py-6">
        {/* QR Code */}
        {isLobby && origin && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="cursor-zoom-in"
            onClick={() => setIsQrModalOpen(true)}
          >
            <Card className="shadow-bold border-2 border-gray-300 hover:border-primary transition-colors">
              <CardContent className="p-6 flex flex-col items-center gap-4">
                <QRCodeSVG
                  value={participantUrl}
                  size={240}
                  bgColor="#ffffff"
                  fgColor="#1a43f0"
                  level="M"
                  includeMargin={false}
                />
                <p className="text-xs text-muted-foreground text-center max-w-[240px] break-all font-mono">
                  {participantUrl}
                </p>
                <Badge variant="secondary" className="text-[10px] uppercase font-bold">Büyütmek İçin Tıkla</Badge>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Drawing status */}
        {(isDrawing || isWaiting) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center space-y-2"
          >
            <p className="text-sm text-muted-foreground uppercase tracking-wider font-medium">
              Tur {room.currentRound} / {totalRounds}
            </p>
            <p className="text-2xl font-bold">&ldquo;{currentItem}&rdquo;</p>
            {isDrawing && (
              <div className="flex flex-col items-center justify-center space-y-1">
                <p className="text-sm font-bold text-red-600 animate-pulse">
                  Kalan Süre: {Math.max(0, Math.floor((room.roundEndsAt! - Date.now()) / 1000))}s
                </p>
                <p className="text-sm text-muted-foreground animate-pulse-gentle">
                  Çizim yapılıyor…
                </p>
              </div>
            )}
          </motion.div>
        )}

        {/* Participants */}
        <div className="w-full max-w-md space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>
              {room.participants.length === 0
                ? "Oyuncu bekleniyor…"
                : `${room.participants.length} katılımcı`}
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <AnimatePresence>
              {room.participants.map((p) => (
                <motion.div
                  key={p.name}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0 }}
                  layout
                >
                  <Badge
                    variant="outline"
                    className="px-3 py-1 text-xs font-medium border-gray-300 bg-white shadow-soft"
                  >
                    {p.name}
                  </Badge>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Drawings received (during active round) */}
        {isDrawing && (
          <div className="w-full max-w-md">
            <p className="text-xs text-muted-foreground mb-2">
              Gelen çizimler:{" "}
              {room.drawings.filter((d) => d.round === room.currentRound).length}{" "}
              / {room.participants.length}
            </p>
          </div>
        )}
      </div>

      {/* Bottom action */}
      <div className="flex items-center justify-center border-gray-300 bg-white p-4 shadow-soft">
        {isLobby && (
          <Button
            onClick={handleStartSession}
            disabled={room.participants.length === 0}
            className="w-full h-12 rounded-xl text-sm font-bold uppercase tracking-wide md:w-96"
          >
            <Play className="h-4 w-4 mr-2 " />
            Çizim Oturumunu Başlat
          </Button>
        )}
        {isDrawing && (
          <Button
            onClick={handleNextRound}
            variant="outline"
            className="w-full md:w-96 h-12 rounded-xl text-sm font-bold uppercase tracking-wide"
          >
            <ArrowRight className="h-4 w-4 mr-2" />
            {room.currentRound < totalRounds
              ? "Turu Bitir ve Sonrakine Geç"
              : "Turu Bitir ve Üret"}
          </Button>
        )}
        {isWaiting && (
          <div className="text-center text-sm text-muted-foreground animate-pulse-gentle py-3">
            Sonraki tura geçiliyor…
          </div>
        )}
      </div>
      {/* QR Large Modal */}
      <AnimatePresence>
        {isQrModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setIsQrModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative bg-white p-8 rounded-3xl shadow-bold border-4 border-primary max-w-full max-h-[95vh] overflow-y-auto"
            >
              <div className="flex flex-col items-center gap-8">
                <div className="bg-white p-4 rounded-xl shadow-inner border border-gray-200">
                  <QRCodeSVG
                    value={participantUrl}
                    size={Math.min(
                      500,
                      typeof window !== 'undefined' ? window.innerWidth - 120 : 300,
                      typeof window !== 'undefined' ? window.innerHeight - 300 : 300
                    )}
                    bgColor="#ffffff"
                    fgColor="#1a43f0"
                    level="H"
                    includeMargin={false}
                  />
                </div>

                <div className="text-center space-y-2">
                  <p className="text-2xl font-black tracking-tighter uppercase">Katılmak İçin Okut</p>
                  <p className="text-muted-foreground font-mono text-sm">{participantUrl}</p>
                </div>

                <Button
                  onClick={() => setIsQrModalOpen(false)}
                  variant="outline"
                  className="rounded-full px-8 h-12 font-bold uppercase tracking-widest border-2 hover:bg-gray-50"
                >
                  Kapat
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
