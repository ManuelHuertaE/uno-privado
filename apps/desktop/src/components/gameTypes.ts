export type CardColor = "red" | "blue" | "green" | "yellow" | "wild";
export type PlayableColor = Exclude<CardColor, "wild">;

export type Card = {
  id: string;
  color: CardColor;
  value: string;
};

export type GamePlayer = {
  id: string;
  name: string;
  hand: Card[];
  handCount?: number;
};

export type GameState = {
  id: string;
  players: GamePlayer[];
  drawPile: Card[];
  discardPile: Card[];
  currentPlayerIndex: number;
  direction: 1 | -1;
  currentColor: CardColor;
  status: "waiting" | "playing" | "finished";
  drawStack: number;
  unoDeclaredPlayerIds: string[];
  unoPenaltyPlayerIds: string[];
  winnerId?: string;
};

export type RoomPlayer = {
  id: string;
  name: string;
  socketId?: string;
};

export type Room = {
  id: string;
  hostId: string;
  players: RoomPlayer[];
  started?: boolean;
  paused?: boolean;
  pauseReason?: string;
  pauseType?: "manual" | "disconnect";
  disconnectedPlayerIds?: string[];
};

export type GameEvent = {
  id: string;
  type: string;
  message: string;
  createdAt: string;
};

export function getCardCount(player: GamePlayer): number {
  return player.handCount ?? player.hand.length;
}
