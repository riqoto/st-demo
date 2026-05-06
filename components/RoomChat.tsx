"use client";

import { useRoomChat } from "@/hooks/useRoomChat";
import { useState, useRef, useEffect } from "react";
import { Send, Loader2 } from "lucide-react";

export function RoomChat({ roomId, userId }: { roomId: string; userId: string }) {
  const { messages, isGenerating, sendMessage } = useRoomChat(roomId, userId);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || isGenerating) return;
    sendMessage(input);
    setInput("");
  };

  return (
    <div className="flex flex-col h-[500px] border border-black/10 rounded-2xl bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-black/5 bg-gray-50/50">
        <h3 className="font-semibold text-sm uppercase tracking-wider text-black/60">Sınıf Sohbeti & Yapay Zeka</h3>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !isGenerating && (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-2 opacity-40">
            <p className="text-sm">Henüz mesaj yok.</p>
            <p className="text-xs">Herkesin ne çizeceğini yazarak belirleyin!</p>
          </div>
        )}
        
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm shadow-sm border
              ${msg.role === "user" 
                ? "bg-black text-white border-black" 
                : "bg-white text-black border-black/10"}`}>
              <p className="leading-relaxed">{msg.text}</p>
              {msg.resultImage && (
                <div className="mt-3 overflow-hidden rounded-xl border border-black/5 bg-gray-50">
                  <img
                    src={msg.resultImage}
                    alt="AI sketch"
                    className="w-full h-auto block"
                  />
                </div>
              )}
              <span className={`text-[10px] mt-1 block opacity-50 ${msg.role === "user" ? "text-right" : "text-left"}`}>
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}
        
        {isGenerating && (
          <div className="flex justify-start">
            <div className="bg-white border border-black/10 rounded-2xl px-4 py-3 text-sm text-black/60 shadow-sm flex items-center gap-3 animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Yapay zeka çiziyor...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-black/5 bg-white">
        <div className="relative flex items-center">
            <input
              className="w-full border border-black/10 rounded-full pl-4 pr-12 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-black/20 transition-all placeholder:text-black/30"
              placeholder="Örn: 'küçük bir evde oturan bir kedi'..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              disabled={isGenerating}
            />
            <button
              onClick={handleSend}
              disabled={isGenerating || !input.trim()}
              className="absolute right-2 p-2 bg-black text-white rounded-full disabled:opacity-20 transition-opacity hover:opacity-80"
            >
              <Send className="w-4 h-4" />
            </button>
        </div>
      </div>
    </div>
  );
}
