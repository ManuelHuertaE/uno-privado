import type { GameState } from "@uno/shared";

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
  disconnectedPlayerIds: string[];
};