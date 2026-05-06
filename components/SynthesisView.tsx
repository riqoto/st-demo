import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Image as ImageIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Drawing } from "@/lib/types";
import { updateRoomState } from "@/lib/firebaseService";

interface SynthesisViewProps {
  roomId: string;
  drawings: Drawing[];
}

export default function SynthesisView({ roomId, drawings }: SynthesisViewProps) {
  const router = useRouter();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const handleGenerate = async () => {
    await updateRoomState(roomId, "ended");
    router.push(`/admin/${roomId}/chat`);
  };

  // Derive columns (items) and rows (users) dynamically
  const items = Array.from(new Set(drawings.map((d) => d.item)));
  const users = Array.from(new Set(drawings.map((d) => d.participantName)));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col gap-6 p-4 sm:p-6 max-w-4xl mx-auto w-full"
    >
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-bold tracking-tight">Nihai Sentez</h2>
        <p className="text-sm text-muted-foreground">
          Yapay zekaya göndermeden önce tüm çizimleri inceleyin.
        </p>
      </div>

      {drawings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <ImageIcon className="h-12 w-12 mb-3" />
          <p className="text-sm">Henüz hiçbir çizim gelmedi.</p>
        </div>
      ) : (
        <div className="w-full overflow-x-auto rounded-xl border border-gray-300 bg-white shadow-soft font-bold">
          <table className="w-full text-sm text-center border-collapse">
            <thead>
              <tr className="border-b border-gray-300 bg-secondary/30">
                <th className="p-4 font-black tracking-tight text-left align-middle border-r border-gray-300">
                  Katılımcı
                </th>
                {items.map((item) => (
                  <th
                    key={item}
                    className="p-4 font-black uppercase tracking-wider text-xs border-r border-gray-300 last:border-r-0"
                  >
                    {item}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((user, rowIdx) => (
                <tr
                  key={user}
                  className={
                    rowIdx !== users.length - 1
                      ? "border-b border-gray-300"
                      : ""
                  }
                >
                  <td className="p-4 font-black text-left align-middle border-r border-gray-300">
                    {user}
                  </td>
                  {items.map((item) => {
                    const d = drawings.find(
                      (x) => x.participantName === user && x.item === item
                    );
                    return (
                      <td
                        key={`${user}-${item}`}
                        className="p-3 align-middle border-r border-gray-300 last:border-r-0"
                      >
                        <div
                          onClick={() => d?.base64 && setSelectedImage(d.base64)}
                          className={`mx-auto h-[80px] w-[80px] rounded-lg border border-gray-300 bg-secondary/10 flex items-center justify-center overflow-hidden shadow-sm transition-all ${d?.base64 ? 'cursor-zoom-in hover:border-primary hover:shadow-md active:scale-95' : ''}`}
                        >
                          {d?.base64 ? (
                            <img
                              src={d.base64}
                              alt={item}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <ImageIcon className="h-6 w-6 text-muted-foreground/20" />
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Generate Button */}
      <Button
        onClick={handleGenerate}
        className="w-full h-14 rounded-xl text-sm font-bold uppercase tracking-wide mt-4"
      >
        <Sparkles className="h-5 w-5 mr-2" />
        Yapay Zeka Sohbetine Gönder
      </Button>

      {/* Image Modal */}
      <AnimatePresence>
        {selectedImage && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/90 backdrop-blur-sm"
              onClick={() => setSelectedImage(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="relative max-w-full max-h-full bg-white p-4 rounded-3xl border-4 border-primary shadow-bold"
            >
              <Button
                variant="ghost"
                size="icon"
                className="absolute -top-12 right-0 text-white hover:bg-white/20 rounded-full h-10 w-10"
                onClick={() => setSelectedImage(null)}
              >
                <X className="h-6 w-6" />
              </Button>
              <div className="bg-white rounded-xl overflow-hidden border border-gray-200">
                <img
                  src={selectedImage}
                  alt="Full preview"
                  className="max-w-[90vw] max-h-[80vh] object-contain"
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
