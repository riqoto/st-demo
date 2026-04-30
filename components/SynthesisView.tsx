"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Sparkles, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Drawing } from "@/lib/types";
import { updateRoomState } from "@/lib/firebaseService";

interface SynthesisViewProps {
  roomId: string;
  drawings: Drawing[];
}

export default function SynthesisView({ roomId, drawings }: SynthesisViewProps) {
  const router = useRouter();

  const handleGenerate = async () => {
    // Optionally we mark the room state as 'chat' instead of 'synthesis', 
    // but redirecting the admin is sufficient.
    await updateRoomState(roomId, "synthesis"); 
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
        <h2 className="text-2xl font-bold tracking-tight">Final Synthesis</h2>
        <p className="text-sm text-muted-foreground">
          Review all sketches before submitting them to the AI.
        </p>
      </div>

      {drawings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <ImageIcon className="h-12 w-12 mb-3" />
          <p className="text-sm">No drawings received yet.</p>
        </div>
      ) : (
        <div className="w-full overflow-x-auto rounded-xl border border-gray-300 bg-white shadow-soft">
          <table className="w-full text-sm text-center border-collapse">
            <thead>
              <tr className="border-b border-gray-300 bg-secondary/30">
                <th className="p-4 font-semibold text-muted-foreground text-left align-middle border-r border-gray-300">
                  Participant
                </th>
                {items.map((item) => (
                  <th
                    key={item}
                    className="p-4 font-bold uppercase tracking-wider text-xs border-r border-gray-300 last:border-r-0"
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
                  <td className="p-4 font-medium text-left align-middle border-r border-gray-300">
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
                        <div className="mx-auto h-[80px] w-[80px] rounded-lg border border-gray-300 bg-secondary/10 flex items-center justify-center overflow-hidden shadow-sm hover:shadow-md transition-shadow">
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

      {/* Lottie Animation Placeholder (Available for embedding your script) */}
      {/* 
        <!-- Lottie Animation Placeholder -->
        <div className="w-full h-32 my-4 rounded-xl border border-dashed flex items-center justify-center">
           <p className="text-xs text-muted-foreground">Lottie Animation Goes Here</p>
        </div>
      */}

      {/* Generate Button */}
      <Button
        onClick={handleGenerate}
        className="w-full h-14 rounded-xl text-sm font-bold uppercase tracking-wide mt-4"
      >
        <Sparkles className="h-5 w-5 mr-2" />
        Submit to AI Chat
      </Button>
    </motion.div>
  );
}
