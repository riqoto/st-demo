import {
  ref,
  set,
  get,
  push,
  update,
  onValue,
  serverTimestamp,
  type Unsubscribe,
} from "firebase/database";
import { db } from "./firebase";
import { DRAWING_ITEMS, type Room, type Drawing, type RoomState } from "./types";

// ============================================================
// Helpers
// ============================================================

function generateRoomId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let id = "";
  for (let i = 0; i < 6; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

/** Convert a Firebase snapshot of a room to our Room type */
function snapshotToRoom(roomId: string, data: Record<string, unknown>): Room {
  const participants = data.participants
    ? Object.entries(data.participants as Record<string, { joinedAt: number }>).map(
      ([name, val]) => ({
        name,
        joinedAt: val.joinedAt ?? 0,
      })
    )
    : [];

  const drawings = data.drawings
    ? Object.values(data.drawings as Record<string, Drawing>)
    : [];

  return {
    id: roomId,
    adminEmail: (data.adminEmail as string) ?? "",
    state: (data.state as RoomState) ?? "lobby",
    currentRound: (data.currentRound as number) ?? 0,
    items: (data.items as string[]) ?? [...DRAWING_ITEMS],
    participants,
    drawings,
  };
}

// ============================================================
// Admin / Auth helpers
// ============================================================

/** Check if an email is in the /admins list */
export async function isAdminEmail(email: string): Promise<boolean> {
  const snapshot = await get(ref(db, "admins"));
  if (!snapshot.exists()) return false;
  const admins = snapshot.val() as Record<string, string>;
  const normalized = email.toLowerCase().trim();
  return Object.values(admins).some((e) => e.toLowerCase().trim() === normalized);
}

/** Store an OTP for an email */
export async function storeOtp(email: string, code: string): Promise<void> {
  const key = email.toLowerCase().trim().replace(/\./g, "_dot_").replace(/@/g, "_at_");
  await set(ref(db, `otps/${key}`), {
    code,
    email: email.toLowerCase().trim(),
    createdAt: Date.now(),
    expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
  });
}

/** Verify an OTP and delete it on success */
export async function verifyOtp(
  email: string,
  code: string
): Promise<{ valid: boolean; error?: string }> {
  const key = email.toLowerCase().trim().replace(/\./g, "_dot_").replace(/@/g, "_at_");
  const snapshot = await get(ref(db, `otps/${key}`));
  if (!snapshot.exists()) return { valid: false, error: "No OTP found. Request a new one." };

  const data = snapshot.val() as { code: string; expiresAt: number };
  if (Date.now() > data.expiresAt) {
    await set(ref(db, `otps/${key}`), null); // cleanup
    return { valid: false, error: "OTP expired. Request a new one." };
  }
  if (data.code !== code) {
    return { valid: false, error: "Invalid code." };
  }

  // Success — delete OTP
  await set(ref(db, `otps/${key}`), null);
  return { valid: true };
}

/** Generate a session token and store it */
export async function createSession(email: string): Promise<string> {
  const token = crypto.randomUUID();
  const key = email.toLowerCase().trim().replace(/\./g, "_dot_").replace(/@/g, "_at_");
  await set(ref(db, `sessions/${token}`), {
    email: email.toLowerCase().trim(),
    createdAt: Date.now(),
    expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
  });
  return token;
}

/** Validate a session token */
export async function validateSession(
  token: string
): Promise<{ valid: boolean; email?: string }> {
  const snapshot = await get(ref(db, `sessions/${token}`));
  if (!snapshot.exists()) return { valid: false };
  const data = snapshot.val() as { email: string; expiresAt: number };
  if (Date.now() > data.expiresAt) return { valid: false };
  return { valid: true, email: data.email };
}

// ============================================================
// Room operations
// ============================================================

/** Create a new room */
export async function createRoom(adminEmail: string): Promise<Room> {
  const id = generateRoomId();
  const roomData = {
    adminEmail,
    state: "lobby" as RoomState,
    currentRound: 0,
    items: [...DRAWING_ITEMS],
    createdAt: serverTimestamp(),
  };
  await set(ref(db, `rooms/${id}`), roomData);

  return {
    id,
    adminEmail,
    state: "lobby",
    currentRound: 0,
    items: [...DRAWING_ITEMS],
    participants: [],
    drawings: [],
  };
}

/** Get a room snapshot (one-time read) */
export async function getRoom(roomId: string): Promise<Room | null> {
  const snapshot = await get(ref(db, `rooms/${roomId.toUpperCase()}`));
  if (!snapshot.exists()) return null;
  return snapshotToRoom(roomId.toUpperCase(), snapshot.val());
}

/** Subscribe to real-time room updates */
export function subscribeToRoom(
  roomId: string,
  callback: (room: Room | null) => void
): Unsubscribe {
  const roomRef = ref(db, `rooms/${roomId.toUpperCase()}`);
  return onValue(roomRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback(null);
      return;
    }
    callback(snapshotToRoom(roomId.toUpperCase(), snapshot.val()));
  });
}

/** Join a room as a participant */
export async function joinRoom(
  roomId: string,
  username: string
): Promise<{ success: boolean; error?: string }> {
  const id = roomId.toUpperCase();
  const snapshot = await get(ref(db, `rooms/${id}`));
  if (!snapshot.exists()) return { success: false, error: "Room not found" };

  // Check if name already taken
  const participantSnapshot = await get(ref(db, `rooms/${id}/participants/${username}`));
  if (participantSnapshot.exists()) {
    return { success: false, error: "Name already taken" };
  }

  await set(ref(db, `rooms/${id}/participants/${username}`), {
    joinedAt: Date.now(),
  });

  return { success: true };
}

/** Update room state */
export async function updateRoomState(
  roomId: string,
  state: RoomState
): Promise<void> {
  await update(ref(db, `rooms/${roomId.toUpperCase()}`), { state });
}

/** Advance to the next drawing round */
export async function advanceRound(roomId: string): Promise<void> {
  const id = roomId.toUpperCase();
  const snapshot = await get(ref(db, `rooms/${id}`));
  if (!snapshot.exists()) return;

  const data = snapshot.val();
  const currentRound = (data.currentRound as number) ?? 0;
  const items = (data.items as string[]) ?? [];

  if (currentRound < items.length) {
    await update(ref(db, `rooms/${id}`), {
      currentRound: currentRound + 1,
      state: "drawing",
    });
  } else {
    await update(ref(db, `rooms/${id}`), { state: "synthesis" });
  }
}

/** Restart an existing room, clearing drawings but keeping participants */
export async function restartRoom(roomId: string): Promise<void> {
  const id = roomId.toUpperCase();
  await update(ref(db, `rooms/${id}`), {
    state: "lobby",
    currentRound: 0,
    drawings: null, // Clear all drawings
  });
}


/** Submit a drawing */
export async function submitDrawing(
  roomId: string,
  drawing: { participantName: string; base64: string }
): Promise<void> {
  const id = roomId.toUpperCase();
  const snapshot = await get(ref(db, `rooms/${id}`));
  if (!snapshot.exists()) return;

  const data = snapshot.val();
  const currentRound = (data.currentRound as number) ?? 0;
  const items = (data.items as string[]) ?? [];

  const fullDrawing: Drawing = {
    ...drawing,
    round: currentRound,
    item: items[currentRound - 1] ?? "unknown",
  };

  await push(ref(db, `rooms/${id}/drawings`), fullDrawing);
}

/** Save synthesis data */
export async function generateResult(
  roomId: string,
  prompt: string,
  creativity: number
): Promise<void> {
  const id = roomId.toUpperCase();
  await set(ref(db, `rooms/${id}/synthesis`), {
    prompt,
    creativity,
    createdAt: Date.now(),
  });
}
