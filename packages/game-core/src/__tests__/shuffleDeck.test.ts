import { describe, expect, it } from "vitest";
import { createDeck } from "../createDeck";
import { shuffleDeck } from "../shuffleDeck";

describe("shuffleDeck", () => {
  it("should keep the same amount of cards", () => {
    const deck = createDeck();
    const shuffled = shuffleDeck(deck);

    expect(shuffled).toHaveLength(deck.length);
  });

  it("should not mutate the original deck", () => {
    const deck = createDeck();
    const originalFirstCard = deck[0];

    shuffleDeck(deck);

    expect(deck[0]).toEqual(originalFirstCard);
  });

  it("should keep the same cards", () => {
    const deck = createDeck();
    const shuffled = shuffleDeck(deck);

    const originalIds = deck.map((card) => card.id).sort();
    const shuffledIds = shuffled.map((card) => card.id).sort();

    expect(shuffledIds).toEqual(originalIds);
  });
});