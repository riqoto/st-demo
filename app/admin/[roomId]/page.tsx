"use client";

import { useState, useEffect, use } from "react";
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

  // Get the origin for QR code
  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  // Subscribe to room state
  useEffect(() => {
    const unsubscribe = subscribeToRoom(roomId, (r) => {
      if (r) setRoom(r);
    });
    return () => unsubscribe();
  }, [roomId]);

  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

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

  const handleNextRound = async () => {
    // First set waiting, then advance
    await updateRoomState(roomId, "waiting");
    setTimeout(async () => {
      await advanceRound(roomId);
    }, 500);
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
                <Badge variant="secondary" className="text-[10px] uppercase font-bold">Click to Enlarge</Badge>
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
              Round {room.currentRound} of {totalRounds}
            </p>
            <p className="text-2xl font-bold">&ldquo;{currentItem}&rdquo;</p>
            {isDrawing && (
              <p className="text-sm text-muted-foreground animate-pulse-gentle">
                Drawing in progress…
              </p>
            )}
          </motion.div>
        )}

        {/* Participants */}
        <div className="w-full max-w-md space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>
              {room.participants.length === 0
                ? "Waiting for players…"
                : `${room.participants.length} participant${room.participants.length !== 1 ? "s" : ""}`}
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
              Drawings received:{" "}
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
            Start Drawing Session
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
              ? "End Round & Next"
              : "End Round & Synthesize"}
          </Button>
        )}
        {isWaiting && (
          <div className="text-center text-sm text-muted-foreground animate-pulse-gentle py-3">
            Transitioning to next round…
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
                  <p className="text-2xl font-black tracking-tighter uppercase">Scan to Join</p>
                  <p className="text-muted-foreground font-mono text-sm">{participantUrl}</p>
                </div>

                <Button
                  onClick={() => setIsQrModalOpen(false)}
                  variant="outline"
                  className="rounded-full px-8 h-12 font-bold uppercase tracking-widest border-2 hover:bg-gray-50"
                >
                  Close
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
