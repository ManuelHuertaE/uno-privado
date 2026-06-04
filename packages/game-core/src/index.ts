import type { Card, CardColor, CardValue } from "@uno/shared";

const COLORS: CardColor[] = ["red", "blue", "green", "yellow"];

export function createDeck(): Card[] {
  const deck: Card[] = [];

  for (const color of COLORS) {
    deck.push({
      id: `${color}-0`,
      color,
      value: "0",
    });

    const values: CardValue[] = [
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
      "skip",
      "reverse",
      "draw2",
    ];

    for (const value of values) {
      deck.push({
        id: `${color}-${value}-1`,
        color,
        value,
      });

      deck.push({
        id: `${color}-${value}-2`,
        color,
        value,
      });
    }
  }

  for (let i = 1; i <= 4; i++) {
    deck.push({
      id: `wild-${i}`,
      color: "wild",
      value: "wild",
    });

    deck.push({
      id: `wild-draw4-${i}`,
      color: "wild",
      value: "wildDraw4",
    });
  }

  return deck;
}