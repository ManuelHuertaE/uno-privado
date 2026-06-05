import { describe, expect, it } from "vitest";
import type { GameState } from "@uno/shared";
import { createGame } from "../createGame";
import { refillDrawPile } from "../refillDrawPile";

describe("refillDrawPile", () => {
  it("should refill drawPile using discardPile except the top card", () => {
    let game = createGame({
      players: [
        { id: "player-1", name: "A" },
        { id: "player-2", name: "B" },
      ],
    });

    const topCard = {
      id: "top-card",
      color: "red",
      value: "5",
    } as const;

    const recycledCards = [
      { id: "discard-1", color: "blue", value: "1" },
      { id: "discard-2", color: "green", value: "2" },
      { id: "discard-3", color: "yellow", value: "3" },
    ] as const;

    game = {
      ...game,
      drawPile: [],
      discardPile: [...recycledCards, topCard],
    } as GameState;

    const updatedGame = refillDrawPile(game);

    expect(updatedGame.drawPile).toHaveLength(3);
    expect(updatedGame.discardPile).toHaveLength(1);
    expect(updatedGame.discardPile[0]).toEqual(topCard);

    const drawPileIds = updatedGame.drawPile.map((card) => card.id).sort();

    expect(drawPileIds).toEqual(["discard-1", "discard-2", "discard-3"]);
  });

  it("should return the same game if drawPile still has cards", () => {
    const game = createGame({
      players: [
        { id: "player-1", name: "A" },
        { id: "player-2", name: "B" },
      ],
    });

    const updatedGame = refillDrawPile(game);

    expect(updatedGame).toBe(game);
  });

  it("should throw if there are no cards to recycle", () => {
    const game = createGame({
      players: [
        { id: "player-1", name: "A" },
        { id: "player-2", name: "B" },
      ],
    });

    const emptyGame = {
      ...game,
      drawPile: [],
      discardPile: [game.discardPile[0]],
    };

    expect(() => refillDrawPile(emptyGame)).toThrow(
      "No hay suficientes cartas para rellenar el mazo."
    );
  });
});