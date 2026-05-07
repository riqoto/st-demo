// ============================================================
// CONFIGURATION — Edit these values to customize the session
// ============================================================

export const DRAWING_ITEMS = [
  "cat",
  "house",
  "sun",
  "tree",
  "fish",
];

export const ITEM_TRANSLATIONS: Record<string, string> = {
  "cat": "Kedi",
  "house": "Ev",
  "sun": "Güneş",
  "tree": "Ağaç",
  "fish": "Balık",
};

/** Seconds each drawing round lasts */
export const ROUND_DURATION_SECONDS = 90;

// ============================================================
// Types
// ============================================================

export type RoomState = "lobby" | "drawing" | "waiting" | "synthesis" | "chat" | "ended";

export interface Participant {
  name: string;
  joinedAt: number; // Date.now()
}

export interface Drawing {
  participantName: string;
  base64: string;
  round: number;
  item: string;
}

export interface Room {
  id: string;
  adminEmail: string;
  participants: Participant[];
  state: RoomState;
  currentRound: number;
  drawings: Drawing[];
  items: string[];
  roundEndsAt?: number;
}
