// import { DRAWING_ITEMS, type Drawing, type Room, type RoomState } from "./types";

// // ============================================================
// // In-memory store
// // ============================================================

// const rooms = new Map<string, Room>();

// // ============================================================
// // Helpers
// // ============================================================

// function generateRoomId(): string {
//   const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
//   let id = "";
//   for (let i = 0; i < 6; i++) {
//     id += chars[Math.floor(Math.random() * chars.length)];
//   }
//   return id;
// }

// // ============================================================
// // Public API
// // ============================================================

// export function createRoom(adminKey: string): Room {
//   const id = generateRoomId();
//   const room: Room = {
//     id,
//     adminKey,
//     participants: [],
//     state: "lobby",
//     currentRound: 0,
//     drawings: [],
//     items: [...DRAWING_ITEMS],
//   };
//   rooms.set(id, room);
//   console.log("[mockFirebase] Room created:", room);
//   return room;
// }

// export function getRoom(roomId: string): Room | undefined {
//   return rooms.get(roomId.toUpperCase());
// }

// export function joinRoom(
//   roomId: string,
//   username: string
// ): { success: boolean; room?: Room; error?: string } {
//   const room = rooms.get(roomId.toUpperCase());
//   if (!room) return { success: false, error: "Room not found" };

//   const exists = room.participants.some(
//     (p) => p.name.toLowerCase() === username.toLowerCase()
//   );
//   if (exists) return { success: false, error: "Name already taken" };

//   room.participants.push({ name: username, joinedAt: Date.now() });
//   console.log(`[mockFirebase] ${username} joined room ${roomId}`);
//   return { success: true, room };
// }

// export function updateRoomState(roomId: string, state: RoomState): Room | undefined {
//   const room = rooms.get(roomId.toUpperCase());
//   if (!room) return undefined;
//   room.state = state;
//   console.log(`[mockFirebase] Room ${roomId} state → ${state}`);
//   return room;
// }

// export function advanceRound(roomId: string): Room | undefined {
//   const room = rooms.get(roomId.toUpperCase());
//   if (!room) return undefined;

//   if (room.currentRound < room.items.length) {
//     room.currentRound += 1;
//     room.state = "drawing";
//     console.log(
//       `[mockFirebase] Room ${roomId} round ${room.currentRound}: "${room.items[room.currentRound - 1]}"`
//     );
//   } else {
//     room.state = "synthesis";
//     console.log(`[mockFirebase] Room ${roomId} → synthesis`);
//   }
//   return room;
// }

// export function submitDrawing(
//   roomId: string,
//   drawing: Omit<Drawing, "round" | "item">
// ): Room | undefined {
//   const room = rooms.get(roomId.toUpperCase());
//   if (!room) return undefined;

//   const fullDrawing: Drawing = {
//     ...drawing,
//     round: room.currentRound,
//     item: room.items[room.currentRound - 1] ?? "unknown",
//   };
//   room.drawings.push(fullDrawing);
//   console.log(
//     `[mockFirebase] Drawing submitted by ${drawing.participantName} (round ${fullDrawing.round}, item "${fullDrawing.item}")`
//   );
//   return room;
// }

// export function generateResult(
//   roomId: string,
//   prompt: string,
//   creativity: number
// ): void {
//   const room = rooms.get(roomId.toUpperCase());
//   if (!room) {
//     console.error("[mockFirebase] Room not found for generation");
//     return;
//   }
//   console.log("[mockFirebase] ===== GENERATE FINAL RESULT =====");
//   console.log("[mockFirebase] Room:", roomId);
//   console.log("[mockFirebase] Prompt:", prompt);
//   console.log("[mockFirebase] Creativity:", creativity);
//   console.log("[mockFirebase] Total drawings:", room.drawings.length);
//   console.log(
//     "[mockFirebase] Participants:",
//     room.participants.map((p) => p.name)
//   );
//   console.log("[mockFirebase] ================================");
// }
