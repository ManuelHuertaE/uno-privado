import { describe, expect, it } from "vitest";
import type { Card, GameState } from "@uno/shared";
import { createGame } from "../createGame";
import { drawForTurn } from "../drawForTurn";
import { playCard } from "../playCard";
import { resolveDrawStack } from "../resolveDrawStack";

function createTestGame(): GameState {
  return createGame({
    players: [
      { id: "player-1", name: "A" },
      { id: "player-2", name: "B" },
    ],
  });
}

describe("drawForTurn", () => {
  it("should draw exactly one card", () => {
    const game = createTestGame();

    const updatedGame = drawForTurn({
      game,
      playerId: "player-1",
    });

    expect(updatedGame.players[0].hand).toHaveLength(
      game.players[0].hand.length + 1
    );
    expect(updatedGame.drawPile).toHaveLength(game.drawPile.length - 1);
  });

  it("should not advance the turn", () => {
    const game = createTestGame();

    const updatedGame = drawForTurn({
      game,
      playerId: "player-1",
    });

    expect(updatedGame.currentPlayerIndex).toBe(game.currentPlayerIndex);
  });

  it("should not mutate the original game", () => {
    const game = createTestGame();

    const updatedGame = drawForTurn({
      game,
      playerId: "player-1",
    });

    expect(game.players[0].hand).toHaveLength(7);
    expect(game.drawPile).toHaveLength(93);
    expect(updatedGame).not.toBe(game);
  });

  it("should throw if it is not the player's turn", () => {
    const game = createTestGame();

    expect(() =>
      drawForTurn({
        game,
        playerId: "player-2",
      })
    ).toThrow("No es el turno de este jugador.");
  });

  it("should throw if drawStack is active", () => {
    const game = {
      ...createTestGame(),
      drawStack: 2,
    };

    expect(() =>
      drawForTurn({
        game,
        playerId: "player-1",
      })
    ).toThrow("Hay acumulacion de cartas por resolver.");
  });

  it("should throw if the game is not playing", () => {
    const game = {
      ...createTestGame(),
      status: "finished",
    } as const;

    expect(() =>
      drawForTurn({
        game,
        playerId: "player-1",
      })
    ).toThrow("La partida no esta en curso.");
  });

  it("should allow drawing even when the player has a valid card", () => {
    const validCard: Card = {
      id: "valid-red-5",
      color: "red",
      value: "5",
    };

    const baseGame = createTestGame();
    const game = {
      ...baseGame,
      currentColor: "red",
      players: baseGame.players.map((player, index) =>
        index === 0 ? { ...player, hand: [validCard, ...player.hand] } : player
      ),
    };

    const updatedGame = drawForTurn({
      game,
      playerId: "player-1",
    });

    expect(updatedGame.players[0].hand).toHaveLength(
      game.players[0].hand.length + 1
    );
    expect(updatedGame.players[0].hand.some((card) => card.id === validCard.id))
      .toBe(true);
  });

  it("should allow playing any valid card after drawing multiple times", () => {
    const playableCard: Card = {
      id: "playable-blue-7",
      color: "blue",
      value: "7",
    };

    const drawnCards: Card[] = [
      { id: "drawn-blue-draw2", color: "blue", value: "draw2" },
      { id: "drawn-red-1", color: "red", value: "1" },
    ];

    let game = createTestGame();

    game = {
      ...game,
      currentColor: "blue",
      drawPile: [...drawnCards, ...game.drawPile],
      players: game.players.map((player, index) =>
        index === 0
          ? { ...player, hand: [playableCard, ...player.hand] }
          : player
      ),
    };

    game = drawForTurn({ game, playerId: "player-1" });
    game = drawForTurn({ game, playerId: "player-1" });

    game = playCard({
      game,
      playerId: "player-1",
      cardId: playableCard.id,
    });

    expect(game.discardPile.at(-1)).toEqual(playableCard);
    expect(game.players[0].hand.some((card) => card.id === playableCard.id))
      .toBe(false);
    expect(game.players[0].hand.some((card) => card.id === drawnCards[0].id))
      .toBe(true);
    expect(game.currentPlayerIndex).toBe(1);
  });

  it("should keep resolveDrawStack as the way to pay an active stack", () => {
    const game = {
      ...createTestGame(),
      drawStack: 2,
    };

    expect(() =>
      drawForTurn({
        game,
        playerId: "player-1",
      })
    ).toThrow("Hay acumulacion de cartas por resolver.");

    const updatedGame = resolveDrawStack({
      game,
      playerId: "player-1",
    });

    expect(updatedGame.players[0].hand).toHaveLength(9);
    expect(updatedGame.drawStack).toBe(0);
    expect(updatedGame.currentPlayerIndex).toBe(1);
  });
});
