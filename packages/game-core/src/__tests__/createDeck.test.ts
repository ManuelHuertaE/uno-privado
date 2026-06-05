import { describe, expect, it } from "vitest";
import { createDeck } from "../createDeck";

describe("createDeck", () => {
  it("should create 108 cards", () => {
    const deck = createDeck();

    expect(deck).toHaveLength(108);
  });
});