import type { Card } from "@uno/shared";
import { describe, expect, it } from "vitest";
import { createGame } from "../createGame";
import { sayUno } from "../sayUno";

const card: Card = {
  id: "test-red-5",
  color: "red",
  value: "5",
};

describe("sayUno", () => {
  it("should allow a player with exactly one card to declare UNO", () => {
    const game = {
      ...createGame({
        players: [
          { id: "player-1", name: "A" },
          { id: "player-2", name: "B" },
        ],
      }),
      players: [
        { id: "player-1", name: "A", hand: [card] },
        { id: "player-2", name: "B", hand: [] },
      ],
      unoPenaltyPlayerIds: ["player-1"],
    };

    const updatedGame = sayUno({
      game,
      playerId: "player-1",
    });

    expect(updatedGame).not.toBe(game);
    expect(updatedGame.unoDeclaredPlayerIds).toEqual(["player-1"]);
    expect(updatedGame.unoPenaltyPlayerIds).toEqual([]);
    expect(game.unoDeclaredPlayerIds).toEqual([]);
    expect(game.unoPenaltyPlayerIds).toEqual(["player-1"]);
  });

  it("should throw if the player has more than one card", () => {
    const game = {
      ...createGame({
        players: [
          { id: "player-1", name: "A" },
          { id: "player-2", name: "B" },
        ],
      }),
      players: [
        { id: "player-1", name: "A", hand: [card, { ...card, id: "test-red-6" }] },
        { id: "player-2", name: "B", hand: [] },
      ],
    };

    expect(() =>
      sayUno({
        game,
        playerId: "player-1",
      })
    ).toThrow("El jugador debe tener exactamente una carta para decir UNO.");
  });

  it("should throw if the player does not exist", () => {
    const game = createGame({
      players: [
        { id: "player-1", name: "A" },
        { id: "player-2", name: "B" },
      ],
    });

    expect(() =>
      sayUno({
        game,
        playerId: "missing-player",
      })
    ).toThrow("El jugador no existe en la partida.");
  });

  it("should not advance turn", () => {
    const game = {
      ...createGame({
        players: [
          { id: "player-1", name: "A" },
          { id: "player-2", name: "B" },
        ],
      }),
      players: [
        { id: "player-1", name: "A", hand: [card] },
        { id: "player-2", name: "B", hand: [] },
      ],
      currentPlayerIndex: 1,
    };

    const updatedGame = sayUno({
      game,
      playerId: "player-1",
    });

    expect(updatedGame.currentPlayerIndex).toBe(1);
  });
});
