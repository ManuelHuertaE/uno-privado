import { describe, expect, it } from "vitest";
import type { Card, GameState } from "@uno/shared";
import { createGame } from "../createGame";
import { drawCards } from "../drawCards";

function card(id: string, color: Card["color"], value: Card["value"]): Card {
  return { id, color, value };
}

describe("drawCards", () => {
  it("should draw one card by default", () => {
    let game = createGame({
      players: [
        { id: "player-1", name: "Manuel" },
        { id: "player-2", name: "Jugador 2" },
      ],
    });

    game = drawCards({
      game,
      playerId: "player-1",
    });

    expect(game.players[0].hand).toHaveLength(8);
    expect(game.drawPile).toHaveLength(92);
  });

  it("should draw multiple cards", () => {
    let game = createGame({
      players: [
        { id: "player-1", name: "Manuel" },
        { id: "player-2", name: "Jugador 2" },
      ],
    });

    game = drawCards({
      game,
      playerId: "player-1",
      amount: 4,
    });

    expect(game.players[0].hand).toHaveLength(11);
    expect(game.drawPile).toHaveLength(89);
  });

  it("should clear drawStack when requested", () => {
    let game = createGame({
      players: [
        { id: "player-1", name: "Manuel" },
        { id: "player-2", name: "Jugador 2" },
      ],
    });

    game = {
      ...game,
      drawStack: 4,
    };

    game = drawCards({
      game,
      playerId: "player-1",
      amount: game.drawStack,
      clearDrawStack: true,
    });

    expect(game.players[0].hand).toHaveLength(11);
    expect(game.drawStack).toBe(0);
  });

  it("should draw from a refilled empty drawPile", () => {
    const game = {
      ...createGame({
        players: [
          { id: "player-1", name: "Manuel" },
          { id: "player-2", name: "Jugador 2" },
        ],
      }),
      drawPile: [],
      discardPile: [
        card("discard-1", "blue", "1"),
        card("discard-2", "green", "2"),
        card("top-card", "red", "5"),
      ],
    } satisfies GameState;

    const updatedGame = drawCards({
      game,
      playerId: "player-1",
      amount: 2,
    });

    const drawnCardIds = updatedGame.players[0].hand
      .slice(-2)
      .map((drawnCard) => drawnCard.id)
      .sort();

    expect(drawnCardIds).toEqual(["discard-1", "discard-2"]);
    expect(updatedGame.drawPile).toHaveLength(0);
    expect(updatedGame.discardPile).toEqual([card("top-card", "red", "5")]);
  });

  it("should complete a draw by recycling discardPile when drawPile has too few cards", () => {
    const remainingDrawCard = card("draw-1", "yellow", "9");
    const topCard = card("top-card", "red", "5");
    const game = {
      ...createGame({
        players: [
          { id: "player-1", name: "Manuel" },
          { id: "player-2", name: "Jugador 2" },
        ],
      }),
      drawPile: [remainingDrawCard],
      discardPile: [
        card("discard-1", "blue", "1"),
        card("discard-2", "green", "2"),
        card("discard-3", "yellow", "3"),
        card("discard-4", "red", "4"),
        topCard,
      ],
    } satisfies GameState;

    const updatedGame = drawCards({
      game,
      playerId: "player-1",
      amount: 2,
    });

    const drawnCards = updatedGame.players[0].hand.slice(-2);
    const remainingDrawPileIds = updatedGame.drawPile
      .map((drawPileCard) => drawPileCard.id)
      .sort();

    expect(drawnCards[0]).toEqual(remainingDrawCard);
    expect(drawnCards[1].id).toMatch(/^discard-/);
    expect(updatedGame.discardPile).toEqual([topCard]);
    expect(remainingDrawPileIds).toHaveLength(3);
    expect([
      ...drawnCards.map((drawnCard) => drawnCard.id),
      ...remainingDrawPileIds,
    ].sort()).toEqual([
      "discard-1",
      "discard-2",
      "discard-3",
      "discard-4",
      "draw-1",
    ]);
  });

  it("should not recycle discardPile when drawPile has enough cards", () => {
    const drawPile = [
      card("draw-1", "yellow", "9"),
      card("draw-2", "blue", "6"),
      card("draw-3", "green", "7"),
    ];
    const discardPile = [
      card("discard-1", "blue", "1"),
      card("top-card", "red", "5"),
    ];
    const game = {
      ...createGame({
        players: [
          { id: "player-1", name: "Manuel" },
          { id: "player-2", name: "Jugador 2" },
        ],
      }),
      drawPile,
      discardPile,
    } satisfies GameState;

    const updatedGame = drawCards({
      game,
      playerId: "player-1",
      amount: 2,
    });

    expect(updatedGame.players[0].hand.slice(-2)).toEqual(
      drawPile.slice(0, 2)
    );
    expect(updatedGame.drawPile).toEqual([drawPile[2]]);
    expect(updatedGame.discardPile).toEqual(discardPile);
  });

  it("should throw when drawPile and recycled discardPile still cannot satisfy the draw", () => {
    const game = {
      ...createGame({
        players: [
          { id: "player-1", name: "Manuel" },
          { id: "player-2", name: "Jugador 2" },
        ],
      }),
      drawPile: [card("draw-1", "yellow", "9")],
      discardPile: [
        card("discard-1", "blue", "1"),
        card("top-card", "red", "5"),
      ],
    } satisfies GameState;

    expect(() =>
      drawCards({
        game,
        playerId: "player-1",
        amount: 3,
      })
    ).toThrow("No hay suficientes cartas disponibles para robar.");
  });

  it("should always preserve the top discard card when recycling", () => {
    const topCard = card("top-card", "red", "5");
    const game = {
      ...createGame({
        players: [
          { id: "player-1", name: "Manuel" },
          { id: "player-2", name: "Jugador 2" },
        ],
      }),
      drawPile: [card("draw-1", "yellow", "9")],
      discardPile: [
        card("discard-1", "blue", "1"),
        card("discard-2", "green", "2"),
        topCard,
      ],
    } satisfies GameState;

    const updatedGame = drawCards({
      game,
      playerId: "player-1",
      amount: 2,
    });

    expect(updatedGame.discardPile).toEqual([topCard]);
    expect(
      updatedGame.players[0].hand.map((handCard) => handCard.id)
    ).not.toContain(topCard.id);
    expect(
      updatedGame.drawPile.map((drawPileCard) => drawPileCard.id)
    ).not.toContain(topCard.id);
  });
});
