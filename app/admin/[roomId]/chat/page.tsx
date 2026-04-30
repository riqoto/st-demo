"use client";

import { use, useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp, Sparkles, Settings2, SlidersHorizontal, User, X, PenTool, Image, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import RoomHeader from "@/components/RoomHeader";
import { DotLottieReact } from '@lottiefiles/dotlottie-react';


interface Message {
  id: string;
  role: "user" | "ai";
  text: string;
}

export default function ChatPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = use(params);

  // Core states
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSettings, setShowSettings] = useState(false); // Mobile sheet
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // Desktop sidebar

  // Setting states
  const [creativity, setCreativity] = useState([50]);
  const [temperature, setTemperature] = useState([7]);

  // Generation status text rotation
  const generationSteps = [
    "Analyzing your drawings...",
    "Synthesizing creative insights...",
    "Comparing artistic styles...",
    "Generating the final masterpiece...",
    "Applying the last touches...",
    "Visualizing your collective imagination..."
  ];
  const [stepIndex, setStepIndex] = useState(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  // Scroll to bottom when generating or new messages arrive
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isGenerating]);

  // Handle text rotation during generation
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isGenerating) {
      setStepIndex(0);
      interval = setInterval(() => {
        setStepIndex((prev) => (prev + 1) % generationSteps.length);
      }, 1800);
    }
    return () => clearInterval(interval);
  }, [isGenerating, generationSteps.length]);

  const handleSubmit = () => {
    if (!input.trim() || isGenerating) return;

    const userMsg: Message = { id: Date.now().toString(), role: "user", text: input.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsGenerating(true);

    // Simulate generation delay and dummy AI response
    setTimeout(() => {
      setIsGenerating(false);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "ai",
          text: "I've analyzed your context alongside the model parameters. The drawings look incredibly imaginative, representing a strong synthesis across the participants."
        }
      ]);
    }, 4000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const SettingsContent = () => (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-bold flex items-center gap-2">
          <SlidersHorizontal className="h-5 w-5 text-muted-foreground" />
          Model Settings
        </h3>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          Fine-tune the behavior of the AI when synthesizing the drawing sessions.
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Creativity Level</label>
          <div className="relative flex items-center">
            <input
              type="number"
              value={Array.isArray(creativity) ? creativity[0] : creativity}
              onChange={(e) => {
                const val = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                setCreativity([val]);
              }}
              className="w-16 text-right text-xs font-mono bg-secondary hover:bg-secondary/80 focus:bg-white border-transparent focus:border-gray-300 focus:ring-0 px-2 py-1 rounded-md tabular-nums transition-all outline-none"
            />
            <span className="absolute right-2.5 text-[10px] text-muted-foreground pointer-events-none">%</span>
          </div>
        </div>
        <Slider value={Array.isArray(creativity) ? creativity : [creativity]} onValueChange={setCreativity} min={0} max={100} step={1} />
        <div className="flex justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
          <span>Literal</span>
          <span>Abstract</span>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Temperature</label>
          <div className="flex items-center">
            <input
              type="number"
              step="0.1"
              value={((Array.isArray(temperature) ? temperature[0] : temperature) / 10).toFixed(1)}
              onChange={(e) => {
                const val = Math.min(1.0, Math.max(0, parseFloat(e.target.value) || 0));
                setTemperature([Math.round(val * 10)]);
              }}
              className="w-16 text-center text-xs font-mono bg-secondary hover:bg-secondary/80 focus:bg-white border-transparent focus:border-gray-300 focus:ring-0 px-2 py-1 rounded-md tabular-nums transition-all outline-none"
            />
          </div>
        </div>
        <Slider value={Array.isArray(temperature) ? temperature : [temperature]} onValueChange={setTemperature} min={0} max={10} step={1} />
        <div className="flex justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
          <span>Precise</span>
          <span>Random</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col bg-white h-screen overflow-hidden">

      {/* Header spanning exactly across top */}
      <div className="grid grid-cols-3 items-center border-b border-border bg-white py-3 px-6 shrink-0 z-20">
        <div className="flex justify-start">
          <RoomHeader roomId={roomId} />
        </div>

        <div className="flex justify-center items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
            <PenTool className="h-4 w-4 text-white" />
          </div>
          <span className="text-xl  tracking-tighter ">Sketch</span>
        </div>

        <div className="flex justify-end items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setShowSettings(!showSettings); // Mobile
              setIsSidebarOpen(!isSidebarOpen); // Desktop
            }}
            className="flex items-center gap-2 h-9 rounded-xl px-4 text-xs font-semibold border-border transition-all"
          >
            <Settings2 className="h-4 w-4" />
            <span className="hidden sm:inline">Settings</span>
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">

        {/* Left Area: Main Chat Window */}
        <div className="flex-1 flex flex-col relative w-full h-full">
          <div className="flex-1 overflow-y-auto w-full px-4 sm:px-6">

            <div className="max-w-3xl mx-auto w-full pt-8 pb-32 flex flex-col gap-6">

              {/* Empty state when no messages exist */}
              {messages.length === 0 && !isGenerating && (
                <div className="flex flex-col items-center justify-center flex-1 text-center opacity-50 space-y-4 my-auto mt-24">
                  <Sparkles className="h-12 w-12 text-muted-foreground" />
                  <p className="text-sm max-w-sm">Use the prompt box to ask the AI assistant for insights or generations based on your room's drawings!</p>
                </div>
              )}

              {/* Chat Message Timeline */}
              {messages.map((msg) => (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={msg.id}
                  className={`flex items-start gap-4 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                >
                  <div className={`h-8 w-8 shrink-0 rounded-full flex items-center justify-center ${msg.role === "ai" ? "bg-secondary" : "bg-black"}`}>
                    {msg.role === "ai" ? (
                      <PenTool className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <User className="h-4 w-4 text-white" />
                    )}
                  </div>

                  <div className={`flex flex-col gap-1.5 ${msg.role === "user" ? "items-end" : "items-start"}`}>
                    <span className="text-xs font-semibold text-muted-foreground px-1">
                      {msg.role === "ai" ? "Sketch AI" : "You"}
                    </span>
                    <div className={`px-4 py-2.5 rounded-xl max-w-xl text-sm leading-relaxed ${msg.role === "user"
                      ? "bg-white border border-border text-foreground"
                      : "bg-transparent text-foreground font-medium"
                      }`}>
                      {msg.text}
                    </div>
                  </div>
                </motion.div>
              ))}

              {/* Claude-style Generating State */}
              <AnimatePresence>
                {isGenerating && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex items-start gap-4 mt-2"
                  >
                    <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                    </div>
                    <div className="flex flex-col gap-4 pt-1">
                      <div className="flex items-center gap-3">

                        {/* // ====================================
                            // LOTTIE ANIMATION PLACEHOLDER 
                            // ==================================== */}
                        <DotLottieReact
                          src="/drawing.lottie" // Path from the public folder
                          loop
                          autoplay
                          className="h-6"
                        />

                        <div className="h-5 overflow-hidden">
                          <AnimatePresence mode="wait">
                            <motion.span
                              key={stepIndex}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              transition={{ duration: 0.3 }}
                              className="text-sm text-muted-foreground font-medium block"
                            >
                              {generationSteps[stepIndex]}
                            </motion.span>
                          </AnimatePresence>
                        </div>
                      </div>

                      {/* Square Image Skeleton */}
                      <div className="w-[240px] h-[240px] max-w-full bg-secondary/50 rounded-lg animate-pulse flex items-center justify-center border-2 border-border shrink-0">
                        <Image className="h-10 w-10 text-muted-foreground opacity-20" />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div ref={chatBottomRef} className="h-4 opacity-0 w-full" />
            </div>
          </div>

          {/* Floating Input Area (Perplexity Style wrapper) */}
          <div className="absolute bottom-4 left-0 right-0 px-4 sm:px-6 pointer-events-none">
            <div className="max-w-3xl mx-auto w-full pointer-events-auto">
              <div className="relative flex items-end bg-white border-2 border-border rounded-xl p-[6px] transition-all focus-within:border-primary">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Message SketchSync AI..."
                  className="flex-1 max-h-[200px] min-h-[44px] bg-transparent resize-none outline-none py-3 px-4 text-sm disabled:opacity-50"
                  disabled={isGenerating}
                  rows={1}
                />

                <Button
                  size="icon"
                  disabled={!input.trim() || isGenerating}
                  onClick={handleSubmit}
                  className={`h-10 w-10 shrink-0 rounded-full transition-all duration-200 mb-[2px] mr-[2px] ${input.trim() && !isGenerating
                    ? "bg-primary hover:bg-primary/90 text-white shadow-sm"
                    : "bg-secondary text-muted-foreground opacity-50 hover:bg-secondary"
                    }`}
                >
                  <ArrowUp className="h-5 w-5" />
                </Button>
              </div>
              <div className="text-center mt-2.5">

              </div>
            </div>
          </div>
        </div>

        {/* Right Area: Model Settings (Desktop) */}
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="hidden md:flex bg-white border-l border-border flex-col shrink-0 z-10 overflow-hidden"
            >
              <div className="w-[320px] p-6">
                <SettingsContent />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* Settings Bottom Sheet (Mobile) */}
      <AnimatePresence>
        {showSettings && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-40 md:hidden backdrop-blur-sm"
              onClick={() => setShowSettings(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-50 p-6 shadow-lg md:hidden border-t border-gray-300"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="w-12 h-1.5 bg-secondary rounded-full mx-auto" />
                <Button variant="ghost" size="icon" className="absolute right-4 top-4 h-8 w-8 rounded-full" onClick={() => setShowSettings(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <SettingsContent />
              <div className="h-6" />{/* Safe area spacer */}
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}
