"use client";

import { use, useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp, Sparkles, Settings2, SlidersHorizontal, User, X, PenTool, Image, Pencil, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import RoomHeader from "@/components/RoomHeader";
import WorkerMonitor from "@/components/WorkerMonitor";
import { restartRoom } from "@/lib/firebaseService";
import { useRoomChat, type Message } from "@/hooks/useRoomChat";

// Message type is now imported from useRoomChat



export default function ChatPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = use(params);
  const router = useRouter();

  // Core states from useRoomChat
  const { messages, isGenerating, sendMessage } = useRoomChat(roomId, "admin");
  const [input, setInput] = useState("");

  // Setting states removed

  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Generation status text rotation
  const generationSteps = [
    "Çizimleriniz analiz ediliyor...",
    "Yaratıcı fikirler sentezleniyor...",
    "Sanatsal stiller karşılaştırılıyor...",
    "Nihai şaheser oluşturuluyor...",
    "Son rötuşlar yapılıyor...",
    "Kolektif hayal gücünüz görselleştiriliyor..."
  ];
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const adminEmail = localStorage.getItem("sketch_admin_email");
    if (!adminEmail) {
      router.push("/");
    }
  }, [router]);

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
    let cancelTimer: NodeJS.Timeout;
    
    if (isGenerating) {
      setStepIndex(0);
      interval = setInterval(() => {
        setStepIndex((prev) => (prev + 1) % generationSteps.length);
      }, 1800);
    }
    
    return () => {
      clearInterval(interval);
    };
  }, [isGenerating, generationSteps.length]);


  const handleSubmit = () => {
    if (!input.trim() || isGenerating) return;

    sendMessage(input.trim(), { strength: 0.65, guidance_scale: 7.5 });
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex flex-col bg-white h-screen overflow-hidden">

      {/* Header spanning exactly across top */}
      <div className="border-b border-border bg-white py-3 px-6 shrink-0 z-20">
        <div className="grid grid-cols-3 items-center">
          <div className="flex justify-start">
            <RoomHeader roomId={roomId} />
          </div>

          <div className="flex justify-center items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
              <PenTool className="h-4 w-4 text-white" />
            </div>
            <span className="text-xl tracking-tighter">Sketch</span>
          </div>

          <div className="flex justify-end items-center gap-2">
            <Button
              variant="destructive"
              size="sm"
              onClick={async () => {
                if (confirm("Oturumu yeniden başlatmak istediğinizden emin misiniz? Tüm çizimler silinecek ve bekleme odasına döneceksiniz.")) {
                  await restartRoom(roomId);
                  router.push(`/admin/${roomId}`);
                }
              }}
              className="flex items-center gap-2 h-9 rounded-xl px-4 text-xs font-black uppercase tracking-wider transition-all"
            >
              <span className="hidden sm:inline">Odayı Sıfırla</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">

        {/* Left Area: Main Chat Window */}
        <div className="flex-1 flex flex-col relative w-full h-full">
          <div className="flex-1 overflow-y-auto w-full px-4 sm:px-6">

            <motion.div layout className="max-w-3xl mx-auto w-full pt-8 pb-32 flex flex-col gap-6">

              {/* Empty state when no messages exist */}
              {messages.length === 0 && !isGenerating && (
                <div className="flex flex-col items-center justify-center flex-1 text-center opacity-50 space-y-4 my-auto mt-24">
                  <Sparkles className="h-12 w-12 text-muted-foreground" />
                  <p className="text-sm max-w-sm">Odadaki çizimlerden yola çıkarak yapay zekadan yeni görseller üretmesini isteyin!</p>
                </div>
              )}

              {messages.map((msg, idx) => {
                const isLast = idx === messages.length - 1;
                const showLiveGeneration = isLast && isGenerating && msg.role === "assistant";

                return (
                  <motion.div
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={msg.id}
                    className={`flex items-start gap-4 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                  >
                    <motion.div
                      layout
                      className={`h-8 w-8 shrink-0 rounded-full flex items-center justify-center overflow-hidden transition-colors ${msg.role === "assistant" ? "bg-secondary" : "bg-black"}`}
                      animate={showLiveGeneration ? {
                        backgroundColor: ["#f3f4f6", "#e5e7eb", "#f3f4f6"],
                        scale: [1, 1.05, 1],
                      } : {
                        backgroundColor: msg.role === "assistant" ? "#f3f4f6" : "#000000",
                        scale: 1,
                      }}
                      transition={showLiveGeneration ? { repeat: Infinity, duration: 2, ease: "easeInOut" } : { duration: 0.3 }}
                    >
                      {msg.role === "assistant" ? (
                        <motion.div
                          animate={showLiveGeneration ? {
                            rotate: [0, -45, 0],
                          } : { rotate: 0 }}
                          transition={showLiveGeneration ? { repeat: Infinity, duration: 1.2, ease: "easeInOut" } : { duration: 0.3 }}
                        >
                          <PenTool className="h-4 w-4 text-muted-foreground" />
                        </motion.div>
                      ) : (
                        <User className="h-4 w-4 text-white" />
                      )}
                    </motion.div>

                    <div className={`flex flex-col gap-1.5 ${msg.role === "user" ? "items-end" : "items-start"}`}>
                      <span className="text-xs font-semibold text-muted-foreground px-1">
                        {msg.role === "assistant" ? "Sketch AI" : "Siz"}
                      </span>
                      <div className={`px-4 py-2.5 rounded-xl max-w-xl text-sm leading-relaxed ${msg.role === "user"
                        ? "bg-white border border-border text-foreground"
                        : "bg-transparent text-foreground font-medium"
                        }`}>

                        {showLiveGeneration ? (
                          <div className="flex flex-col gap-4">
                            <div className="flex items-center">

                              <div className="h-5 overflow-hidden min-w-[150px]">
                                <AnimatePresence mode="wait">
                                  <motion.span
                                    key={stepIndex}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.3 }}
                                    className="text-sm text-muted-foreground font-bold block whitespace-nowrap"
                                  >
                                    {generationSteps[stepIndex]}
                                  </motion.span>
                                </AnimatePresence>
                              </div>
                            </div>
                            <div className="w-[240px] h-[240px] bg-secondary/50 rounded-2xl animate-pulse flex items-center justify-center border-2 border-dashed border-border shrink-0 shadow-inner">
                              <Image className="h-10 w-10 text-muted-foreground opacity-20" />
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className={msg.role === "assistant" ? "text-muted-foreground italic" : ""}>{msg.text}</div>
                            {msg.resultImage && (
                              <div
                                className="mt-4 rounded-2xl overflow-hidden border-2 border-dashed border-border p-1.5 bg-secondary/20 w-[240px] h-[240px] shrink-0 cursor-zoom-in transition-transform hover:scale-[1.02] active:scale-[0.98]"
                                onClick={() => setSelectedImage(msg.resultImage!)}
                              >
                                <img
                                  src={msg.resultImage}
                                  alt="AI Result"
                                  className="w-full h-full object-cover rounded-xl shadow-lg"
                                />
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}


              <div ref={chatBottomRef} className="h-4 opacity-0 w-full" />
            </motion.div>
          </div>

          <div className="absolute bottom-4 left-0 right-0 px-4 sm:px-6 pointer-events-none">
            <div className="max-w-3xl mx-auto w-full pointer-events-auto">
              <div className="relative flex items-end bg-white border-1 border-border rounded-xl p-[6px] transition-all focus-within:border-primary">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Sketch AI'a mesaj gönder..."
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
            </div>
          </div>
        </div>
      </div>

      {/* Image Modal */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4 backdrop-blur-md"
            onClick={() => setSelectedImage(null)}
          >
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-6 right-6 text-white hover:bg-white/20 rounded-full h-12 w-12"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedImage(null);
              }}
            >
              <X className="h-6 w-6" />
            </Button>

            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative aspect-square w-full max-w-[512px] bg-secondary/10 rounded-3xl overflow-hidden border-4 border-primary"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={selectedImage}
                alt="AI Result Full"
                className="w-full h-full object-contain "
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <WorkerMonitor roomId={roomId} />
    </div>
  );
}
