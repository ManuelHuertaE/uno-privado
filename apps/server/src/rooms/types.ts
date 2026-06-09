import type { GameEvent, GameState } from "@uno/shared";

export type RoomPlayer = {
  id: string;
  name: string;
  socketId: string;
};

export type Room = {
  id: string;
  hostId: string;
  players: RoomPlayer[];
  started: boolean;
  game: GameState | null;
  paused: boolean;
  pauseReason?: string;
  pauseType?: "manual" | "disconnect";
  disconnectedPlayerIds: string[];
  events: GameEvent[];
};
