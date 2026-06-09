export type CardColor = "red" | "blue" | "green" | "yellow" | "wild";

export type CardValue =
  | "0"
  | "1"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "skip"
  | "reverse"
  | "draw2"
  | "wild"
  | "wildDraw4";

export interface Card {
  id: string;
  color: CardColor;
  value: CardValue;
}

export interface Player {
  id: string;
  name: string;
  hand: Card[];
}

export interface GameEvent {
  id: string;
  type: string;
  message: string;
  createdAt: string;
}

export interface GameState {
  id: string;
  players: Player[];
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
}

export interface PublicPlayer {
  id: string;
  name: string;
  cardCount: number;
  isCurrentTurn: boolean;
  isUnoPenaltyRisk: boolean;
}

export interface PlayerGameView {
  id: string;
  players: PublicPlayer[];
  myHand: Card[];
  drawPileCount: number;
  discardPile: Card[];
  topCard: Card | undefined;
  currentPlayerId: string;
  currentColor: CardColor;
  direction: 1 | -1;
  drawStack: number;
  canDraw: boolean;
  canResolveDrawStack: boolean;
  hasDeclaredUno: boolean;
  status: "waiting" | "playing" | "finished";
  winnerId?: string;
}
