"use client";

import { useState, useEffect, use } from "react";
import { motion } from "framer-motion";
import { Wifi, Loader2, Sparkles, PenTool } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import RoomHeader from "@/components/RoomHeader";
import DrawingCanvas from "@/components/DrawingCanvas";
import { subscribeToRoom, joinRoom, submitDrawing } from "@/lib/firebaseService";
import type { Room } from "@/lib/types";

type ParticipantState = "join" | "lobby" | "drawing" | "waiting" | "ended";

export default function ParticipantPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = use(params);
  const [username, setUsername] = useState("");
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState("");
  const [room, setRoom] = useState<Room | null>(null);
  const [localState, setLocalState] = useState<ParticipantState>("join");

  // On mount, restore username if available
  useEffect(() => {
    const storedUser = localStorage.getItem("sketchsync_user");
    if (storedUser) setUsername(storedUser);
  }, []);

  // Subscribe to real-time room state
  useEffect(() => {
    if (!roomId) return;
    const unsubscribe = subscribeToRoom(roomId, (r) => {
      if (r) {
        setRoom(r);

        // Check auto-join persistence
        let isParticipant = joined;
        if (!isParticipant && username) {
          if (r.participants.some((p) => p.name === username.trim())) {
            isParticipant = true;
            setJoined(true);
          }
        }

        // If not joined, remain on join screen
        if (!isParticipant) return;

        // Check if the current user has already submitted a drawing for this round
        const hasDrawnCurrentRound = r.drawings?.some(
          (d) => d.participantName === username.trim() && d.round === r.currentRound
        );

        // Transition states based on room state
        if (r.state === "lobby") {
          setLocalState("lobby");
        } else if (r.state === "drawing" && !hasDrawnCurrentRound) {
          setLocalState("drawing");
        } else if (r.state === "drawing" && hasDrawnCurrentRound) {
          setLocalState("waiting");
        } else if (r.state === "waiting" || r.state === "synthesis" || r.state === "chat") {
          setLocalState("waiting");
        } else if (r.state === "ended") {
          setLocalState("ended");
        }
      }
    });
    return () => unsubscribe();
  }, [joined, roomId, username]);

  const handleJoin = async () => {
    const name = username.trim();
    if (!name) return;
    setError("");

    const result = await joinRoom(roomId, name);
    if (result.success) {
      localStorage.setItem("sketchsync_user", name);
      setJoined(true);
      setLocalState("lobby");
    } else {
      setError(result.error ?? "Failed to join room");
    }
  };

  const handleDrawingSubmit = async (base64: string) => {
    await submitDrawing(roomId, {
      participantName: username.trim(),
      base64,
    });
    // The immediate local fallback. Real state resolves via Firebase listener above.
    setLocalState("waiting");
  };

  const currentItem = room?.items[(room?.currentRound ?? 1) - 1] ?? "";

  // ── Join screen ──
  if (localState === "join") {
    return (
      <div className="flex flex-1 items-center justify-center bg-soft-gray px-4">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-sm"
        >
          <Card className="shadow-soft-xl border border-gray-300">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-xl font-bold">Join Room</CardTitle>
              <div className="mt-2">
                <RoomHeader roomId={roomId.toUpperCase()} />
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleJoin();
                }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <label
                    htmlFor="username"
                    className="text-sm font-medium leading-none flex mb-4"
                  >
                    What is your name?
                  </label>
                  <Input
                    id="username"
                    placeholder="Enter your name"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="h-14"
                    autoFocus
                  />
                  {error && (
                    <p className="text-xs text-red-600">{error}</p>
                  )}
                </div>
                <Button
                  type="submit"
                  disabled={!username.trim()}
                  className="w-full h-14 rounded-xl text-sm font-bold uppercase tracking-wide"
                >
                  Join
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // ── Lobby ──
  if (localState === "lobby") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-soft-gray px-4 gap-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center space-y-4"
        >
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-secondary shadow-soft animate-pulse-gentle">
            <Wifi className="h-7 w-7 text-foreground" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold">Connected!</h2>
            <p className="text-sm text-muted-foreground">
              Waiting for admin to start the session…
            </p>
          </div>
          <RoomHeader roomId={roomId.toUpperCase()} />
        </motion.div>
      </div>
    );
  }

  // ── Drawing ──
  if (localState === "drawing") {
    return (
      <div className="flex flex-col flex-1 bg-soft-gray">
        <DrawingCanvas item={currentItem} onSubmit={handleDrawingSubmit} />
      </div>
    );
  }

  // ── Ended ──
  if (localState === "ended") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-soft-gray px-4 gap-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-6 max-w-sm"
        >
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-primary shadow-bold rotate-3">
            <PenTool className="h-10 w-10 text-white" />
          </div>
          <div className="space-y-3">
            <h2 className="text-3xl font-black tracking-tighter uppercase">All Rounds Ended!</h2>
            <p className="text-base text-muted-foreground font-medium leading-relaxed">
              The creative session is now complete. Great work! You can safely close this tab now.
            </p>
          </div>
          <div className="pt-4">
            <RoomHeader roomId={roomId.toUpperCase()} />
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Waiting ──
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-soft-gray px-4 gap-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center space-y-4"
      >
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-secondary shadow-soft">
          <Loader2 className="h-7 w-7 text-foreground animate-spin" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-bold">Drawing sent!</h2>
          <p className="text-sm text-muted-foreground">
            Please wait for the next round.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
