// hooks/useRoomChat.ts
import { useEffect, useState, useCallback } from "react";
import { db } from "@/lib/firebase";
import { ref, push, onValue, off, update } from "firebase/database";

export type Message = {
  id: string;
  userId: string;
  text: string;
  role: "user" | "assistant";
  timestamp: number;
  resultImage?: string;
};

export function useRoomChat(roomId: string, userId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // Mesajları dinle
  useEffect(() => {
    const msgRef = ref(db, `rooms/${roomId}/messages`);
    const unsubscribe = onValue(msgRef, (snap) => {
      const data = snap.val() || {};
      const list = Object.entries(data)
        .map(([id, val]: any) => ({ id, ...val }))
        .sort((a, b) => a.timestamp - b.timestamp);
      setMessages(list);
    });
    return () => off(msgRef, "value", unsubscribe);
  }, [roomId]);

  // Status dinle (generating spinner için)
  useEffect(() => {
    const statusRef = ref(db, `rooms/${roomId}/status`);
    const unsub = onValue(statusRef, (snap) => {
      setIsGenerating(snap.val() === "generating");
    });
    return () => off(statusRef, "value", unsub);
  }, [roomId]);

  // finalResult gelince son assistant mesajına ekle
  useEffect(() => {
    const resultRef = ref(db, `rooms/${roomId}/finalResult`);
    const unsub = onValue(resultRef, (snap) => {
      const base64 = snap.val();
      if (!base64) return;

      const msgRef = ref(db, `rooms/${roomId}/messages`);
      onValue(msgRef, (msgSnap) => {
        const msgs = msgSnap.val() || {};
        const keys = Object.keys(msgs);
        const lastAssistantKey = [...keys]
          .reverse()
          .find((k) => msgs[k].role === "assistant");

        if (lastAssistantKey) {
          update(ref(db, `rooms/${roomId}/messages/${lastAssistantKey}`), {
            text: "Harika eser tamamlandı!",
            resultImage: base64,
          });
        }
      }, { onlyOnce: true });
    });
    return () => off(resultRef, "value", unsub);
  }, [roomId]);

  // Mesaj gönder ve worker'ı tetikle
  const sendMessage = useCallback(
    async (text: string, aiSettings?: { strength: number; guidance_scale: number }) => {
      if (!text.trim() || isGenerating) return;

      const roomRef = ref(db, `rooms/${roomId}`);
      const msgListRef = ref(db, `rooms/${roomId}/messages`);

      // 1. Kullanıcı mesajı
      await push(msgListRef, {
        userId,
        text,
        role: "user",
        timestamp: Date.now(),
      });

      // 2. Placeholder assistant mesajı
      await push(msgListRef, {
        userId: "ai",
        text: "Vizyonunuz sentezleniyor...",
        role: "assistant",
        timestamp: Date.now() + 1,
      });

      // 3. Worker'ı tetikle
      await update(roomRef, {
        prompt: text,
        status: "generating",
        finalResult: null,
        aiSettings: aiSettings || { strength: 0.65, guidance_scale: 7.5 }
      });
    },
    [roomId, userId, isGenerating]
  );

  return { messages, isGenerating, sendMessage };
}
