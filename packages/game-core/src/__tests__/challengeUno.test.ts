import type { Card, GameState } from "@uno/shared";
import { describe, expect, it } from "vitest";
import { challengeUno } from "../challengeUno";
import { createGame } from "../createGame";

const targetCard: Card = {
  id: "target-red-5",
  color: "red",
  value: "5",
};

const extraTargetCard: Card = {
  id: "target-blue-7",
  color: "blue",
  value: "7",
};

const penaltyCards: Card[] = [
  {
    id: "penalty-yellow-1",
    color: "yellow",
    value: "1",
  },
  {
    id: "penalty-green-2",
    color: "green",
    value: "2",
  },
];

function createChallengeGame(): GameState {
  const game = createGame({
    players: [
      { id: "player-1", name: "A" },
      { id: "player-2", name: "B" },
    ],
  });

  return {
    ...game,
    drawPile: [...penaltyCards, ...game.drawPile],
    currentPlayerIndex: 0,
    players: [
      { id: "player-1", name: "A", hand: [] },
      { id: "player-2", name: "B", hand: [targetCard] },
    ],
    unoPenaltyPlayerIds: ["player-2"],
  };
}

describe("challengeUno", () => {
  it("should allow penalizing a player with one card who did not say UNO", () => {
    const game = createChallengeGame();

    const updatedGame = challengeUno({
      game,
      challengerPlayerId: "player-1",
      targetPlayerId: "player-2",
    });

    expect(updatedGame).not.toBe(game);
    expect(updatedGame.players[1].hand).toHaveLength(3);
  });

  it("should make the accused player draw 2 cards", () => {
    const game = createChallengeGame();

    const updatedGame = challengeUno({
      game,
      challengerPlayerId: "player-1",
      targetPlayerId: "player-2",
    });

    expect(updatedGame.players[1].hand).toEqual([
      targetCard,
      ...penaltyCards,
    ]);
    expect(updatedGame.drawPile[0].id).not.toBe(penaltyCards[0].id);
    expect(game.players[1].hand).toEqual([targetCard]);
  });

  it("should clear the accused player's UNO penalty state", () => {
    const game = {
      ...createChallengeGame(),
      unoDeclaredPlayerIds: ["player-2"],
      unoPenaltyPlayerIds: ["player-2"],
    };

    const updatedGame = challengeUno({
      game,
      challengerPlayerId: "player-1",
      targetPlayerId: "player-2",
    });

    expect(updatedGame.unoPenaltyPlayerIds).toEqual([]);
    expect(updatedGame.unoDeclaredPlayerIds).toEqual([]);
    expect(game.unoPenaltyPlayerIds).toEqual(["player-2"]);
    expect(game.unoDeclaredPlayerIds).toEqual(["player-2"]);
  });

  it("should not advance the turn", () => {
    const game = {
      ...createChallengeGame(),
      currentPlayerIndex: 1,
    };

    const updatedGame = challengeUno({
      game,
      challengerPlayerId: "player-1",
      targetPlayerId: "player-2",
    });

    expect(updatedGame.currentPlayerIndex).toBe(1);
  });

  it("should throw if the challenger does not exist", () => {
    const game = createChallengeGame();

    expect(() =>
      challengeUno({
        game,
        challengerPlayerId: "missing-player",
        targetPlayerId: "player-2",
      })
    ).toThrow("El acusador no existe en la partida.");
  });

  it("should throw if the accused player does not exist", () => {
    const game = createChallengeGame();

    expect(() =>
      challengeUno({
        game,
        challengerPlayerId: "player-1",
        targetPlayerId: "missing-player",
      })
    ).toThrow("El acusado no existe en la partida.");
  });

  it("should throw if the challenger accuses themselves", () => {
    const game = createChallengeGame();

    expect(() =>
      challengeUno({
        game,
        challengerPlayerId: "player-2",
        targetPlayerId: "player-2",
      })
    ).toThrow("Un jugador no puede acusarse a si mismo.");
  });

  it("should throw if the accused player does not have exactly one card", () => {
    const game = {
      ...createChallengeGame(),
      players: [
        { id: "player-1", name: "A", hand: [] },
        {
          id: "player-2",
          name: "B",
          hand: [targetCard, extraTargetCard],
        },
      ],
    };

    expect(() =>
      challengeUno({
        game,
        challengerPlayerId: "player-1",
        targetPlayerId: "player-2",
      })
    ).toThrow("El acusado debe tener exactamente una carta.");
  });

  it("should throw if the accused player is not in UNO penalty state", () => {
    const game = {
      ...createChallengeGame(),
      unoPenaltyPlayerIds: [],
    };

    expect(() =>
      challengeUno({
        game,
        challengerPlayerId: "player-1",
        targetPlayerId: "player-2",
      })
    ).toThrow("El acusado no es penalizable por UNO.");
  });

  it("should throw if the accused player already declared UNO", () => {
    const game = {
      ...createChallengeGame(),
      unoDeclaredPlayerIds: ["player-2"],
      unoPenaltyPlayerIds: [],
    };

    expect(() =>
      challengeUno({
        game,
        challengerPlayerId: "player-1",
        targetPlayerId: "player-2",
      })
    ).toThrow("El acusado ya declaro UNO.");
  });
});
