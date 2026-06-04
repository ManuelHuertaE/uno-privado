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