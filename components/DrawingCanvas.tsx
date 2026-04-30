"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Eraser, Send } from "lucide-react";
import { ReactSketchCanvas, type ReactSketchCanvasRef } from "react-sketch-canvas";
import { Button } from "@/components/ui/button";
import { ROUND_DURATION_SECONDS } from "@/lib/types";

interface DrawingCanvasProps {
  item: string;
  onSubmit: (base64: string) => void;
}

export default function DrawingCanvas({ item, onSubmit }: DrawingCanvasProps) {
  const canvasRef = useRef<ReactSketchCanvasRef | null>(null);
  const [timeLeft, setTimeLeft] = useState(ROUND_DURATION_SECONDS);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (submitted) return;
    setSubmitted(true);
    try {
      const data = await canvasRef.current?.exportImage("png");
      onSubmit(data ?? "");
    } catch {
      onSubmit("");
    }
  }, [submitted, onSubmit]);

  // Countdown timer
  useEffect(() => {
    if (submitted) return;
    if (timeLeft <= 0) {
      handleSubmit();
      return;
    }
    const timer = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, submitted, handleSubmit]);

  const handleClear = () => {
    canvasRef.current?.clearCanvas();
  };

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const urgentTime = timeLeft <= 10;

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-1 items-center justify-center"
      >
        <div className="text-center space-y-3">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-black">
            <Send className="h-7 w-7 text-white" />
          </div>
          <h2 className="text-xl font-bold">Drawing sent!</h2>
          <p className="text-muted-foreground text-sm">
            Please wait for the next round.
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col flex-1 gap-3 p-3 sm:p-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
            Task
          </span>
          <span className="text-sm font-bold bg-secondary rounded-md px-2 py-0.5">
            {item}
          </span>
        </div>
        <div
          className={`text-sm font-mono font-bold tabular-nums rounded-md px-2 py-0.5 transition-colors ${
            urgentTime
              ? "bg-red-50 text-red-600"
              : "bg-secondary text-foreground"
          }`}
        >
          {formatTime(timeLeft)}
        </div>
      </div>

      {/* Canvas */}
      <div className="relative w-full h-[65vh] md:h-[70vh] rounded-xl border border-gray-300 shadow-soft bg-white overflow-hidden">
        <ReactSketchCanvas
          ref={canvasRef}
          strokeWidth={3}
          strokeColor="#000000"
          canvasColor="#ffffff"
          style={{
            border: "none",
            borderRadius: "0.75rem",
            width: "100%",
            height: "100%",
          }}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={handleClear}
          className="flex-1 h-11 rounded-xl"
        >
          <Eraser className="h-4 w-4 mr-1.5" />
          Clear
        </Button>
        <Button
          onClick={handleSubmit}
          className="flex-1 h-11 rounded-xl font-bold"
        >
          <Send className="h-4 w-4 mr-1.5" />
          Confirm Drawing
        </Button>
      </div>
    </motion.div>
  );
}
