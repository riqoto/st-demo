"use client";

import { useState, useEffect, use } from "react";
import { motion } from "framer-motion";
import { Wifi, Loader2 } from "lucide-react";
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

type ParticipantState = "join" | "lobby" | "drawing" | "waiting";

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
  const [lastDrawnRound, setLastDrawnRound] = useState(0);

  // Subscribe to real-time room state after joining
  useEffect(() => {
    if (!joined) return;
    const unsubscribe = subscribeToRoom(roomId, (r) => {
      if (r) {
        setRoom(r);

        // Transition states based on room state
        if (r.state === "lobby") {
          setLocalState("lobby");
        } else if (r.state === "drawing" && r.currentRound > lastDrawnRound) {
          setLocalState("drawing");
        } else if (r.state === "drawing" && r.currentRound <= lastDrawnRound) {
          setLocalState("waiting");
        } else if (r.state === "waiting") {
          setLocalState("waiting");
        } else if (r.state === "synthesis") {
          setLocalState("waiting");
        }
      }
    });
    return () => unsubscribe();
  }, [joined, roomId, lastDrawnRound]);

  const handleJoin = async () => {
    const name = username.trim();
    if (!name) return;
    setError("");

    const result = await joinRoom(roomId, name);
    if (result.success) {
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
    setLastDrawnRound(room?.currentRound ?? 0);
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
