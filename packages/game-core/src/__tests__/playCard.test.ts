import type { Card } from "@uno/shared";
import { describe, expect, it } from "vitest";
import { createGame } from "../createGame";
import { playCard } from "../playCard";

const topCard: Card = {
  id: "test-top-red-0",
  color: "red",
  value: "0",
};

const playableCard: Card = {
  id: "test-red-5",
  color: "red",
  value: "5",
};

const remainingCard: Card = {
  id: "test-blue-7",
  color: "blue",
  value: "7",
};

const extraCard: Card = {
  id: "test-green-9",
  color: "green",
  value: "9",
};

describe("playCard", () => {
  it("should play a valid card and advance turn", () => {
    let game = createGame({
      players: [
        { id: "player-1", name: "Manuel" },
        { id: "player-2", name: "Jugador 2" },
      ],
    });

    const card = {
      id: "test-red-5",
      color: "red",
      value: "5",
    } as const;

    game = {
      ...game,
      currentColor: "red",
      players: game.players.map((player, index) =>
        index === 0 ? { ...player, hand: [card, ...player.hand] } : player
      ),
    };

    game = playCard({
      game,
      playerId: "player-1",
      cardId: card.id,
    });

    expect(game.players[0].hand.some((c) => c.id === card.id)).toBe(false);
    expect(game.discardPile.at(-1)).toEqual(card);
    expect(game.currentPlayerIndex).toBe(1);
    expect(game.currentColor).toBe("red");
  });

  it("should throw if it is not the player's turn", () => {
    const game = createGame({
      players: [
        { id: "player-1", name: "Manuel" },
        { id: "player-2", name: "Jugador 2" },
      ],
    });

    expect(() =>
      playCard({
        game,
        playerId: "player-2",
        cardId: game.players[1].hand[0].id,
      })
    ).toThrow("No es el turno de este jugador.");
  });

  it("should apply skip effect", () => {
    let game = createGame({
      players: [
        { id: "player-1", name: "A" },
        { id: "player-2", name: "B" },
        { id: "player-3", name: "C" },
      ],
    });

    const card = {
      id: "test-skip",
      color: "red",
      value: "skip",
    } as const;

    game = {
      ...game,
      currentColor: "red",
      players: game.players.map((player, index) =>
        index === 0 ? { ...player, hand: [card, ...player.hand] } : player
      ),
    };

    game = playCard({
      game,
      playerId: "player-1",
      cardId: card.id,
    });

    expect(game.currentPlayerIndex).toBe(2);
  });

  it("should apply reverse effect", () => {
    let game = createGame({
      players: [
        { id: "player-1", name: "A" },
        { id: "player-2", name: "B" },
        { id: "player-3", name: "C" },
      ],
    });

    const card = {
      id: "test-reverse",
      color: "blue",
      value: "reverse",
    } as const;

    game = {
      ...game,
      currentColor: "blue",
      players: game.players.map((player, index) =>
        index === 0 ? { ...player, hand: [card, ...player.hand] } : player
      ),
    };

    game = playCard({
      game,
      playerId: "player-1",
      cardId: card.id,
    });

    expect(game.direction).toBe(-1);
    expect(game.currentPlayerIndex).toBe(2);
  });

  it("should apply draw2 effect", () => {
    let game = createGame({
      players: [
        { id: "player-1", name: "A" },
        { id: "player-2", name: "B" },
      ],
    });

    const card = {
      id: "test-draw2",
      color: "yellow",
      value: "draw2",
    } as const;

    game = {
      ...game,
      currentColor: "yellow",
      players: game.players.map((player, index) =>
        index === 0 ? { ...player, hand: [card, ...player.hand] } : player
      ),
    };

    game = playCard({
      game,
      playerId: "player-1",
      cardId: card.id,
    });

    expect(game.drawStack).toBe(2);
    expect(game.currentPlayerIndex).toBe(1);
  });

  it("should apply wild chosen color", () => {
    let game = createGame({
      players: [
        { id: "player-1", name: "A" },
        { id: "player-2", name: "B" },
      ],
    });

    const card = {
      id: "test-wild",
      color: "wild",
      value: "wild",
    } as const;

    game = {
      ...game,
      players: game.players.map((player, index) =>
        index === 0 ? { ...player, hand: [card, ...player.hand] } : player
      ),
    };

    game = playCard({
      game,
      playerId: "player-1",
      cardId: card.id,
      chosenColor: "green",
    });

    expect(game.currentColor).toBe("green");
    expect(game.currentPlayerIndex).toBe(1);
  });

  it("should apply wildDraw4 effect", () => {
    let game = createGame({
      players: [
        { id: "player-1", name: "A" },
        { id: "player-2", name: "B" },
      ],
    });

    const card = {
      id: "test-wild-draw4",
      color: "wild",
      value: "wildDraw4",
    } as const;

    game = {
      ...game,
      players: game.players.map((player, index) =>
        index === 0 ? { ...player, hand: [card, ...player.hand] } : player
      ),
    };

    game = playCard({
      game,
      playerId: "player-1",
      cardId: card.id,
      chosenColor: "blue",
    });

    expect(game.currentColor).toBe("blue");
    expect(game.drawStack).toBe(4);
    expect(game.currentPlayerIndex).toBe(1);
  });

  it("should mark as penalizable when a player has one card without declaring UNO", () => {
    const game = {
      ...createGame({
        players: [
          { id: "player-1", name: "A" },
          { id: "player-2", name: "B" },
        ],
      }),
      players: [
        { id: "player-1", name: "A", hand: [playableCard, remainingCard] },
        { id: "player-2", name: "B", hand: [] },
      ],
      discardPile: [topCard],
      currentColor: "red" as const,
    };

    const updatedGame = playCard({
      game,
      playerId: "player-1",
      cardId: playableCard.id,
    });

    expect(updatedGame.unoPenaltyPlayerIds).toEqual(["player-1"]);
    expect(updatedGame.unoDeclaredPlayerIds).toEqual([]);
  });

  it("should not mark as penalizable if the player already declared UNO", () => {
    const game = {
      ...createGame({
        players: [
          { id: "player-1", name: "A" },
          { id: "player-2", name: "B" },
        ],
      }),
      players: [
        { id: "player-1", name: "A", hand: [playableCard, remainingCard] },
        { id: "player-2", name: "B", hand: [] },
      ],
      discardPile: [topCard],
      currentColor: "red" as const,
      unoDeclaredPlayerIds: ["player-1"],
    };

    const updatedGame = playCard({
      game,
      playerId: "player-1",
      cardId: playableCard.id,
    });

    expect(updatedGame.unoPenaltyPlayerIds).toEqual([]);
    expect(updatedGame.unoDeclaredPlayerIds).toEqual(["player-1"]);
  });

  it("should clear UNO state if the player has more than one card after playing", () => {
    const game = {
      ...createGame({
        players: [
          { id: "player-1", name: "A" },
          { id: "player-2", name: "B" },
        ],
      }),
      players: [
        {
          id: "player-1",
          name: "A",
          hand: [playableCard, remainingCard, extraCard],
        },
        { id: "player-2", name: "B", hand: [] },
      ],
      discardPile: [topCard],
      currentColor: "red" as const,
      unoDeclaredPlayerIds: ["player-1"],
      unoPenaltyPlayerIds: ["player-1"],
    };

    const updatedGame = playCard({
      game,
      playerId: "player-1",
      cardId: playableCard.id,
    });

    expect(updatedGame.unoPenaltyPlayerIds).toEqual([]);
    expect(updatedGame.unoDeclaredPlayerIds).toEqual([]);
  });

  it("should finish the game if the player has no cards after playing", () => {
    const game = {
      ...createGame({
        players: [
          { id: "player-1", name: "A" },
          { id: "player-2", name: "B" },
        ],
      }),
      players: [
        { id: "player-1", name: "A", hand: [playableCard] },
        { id: "player-2", name: "B", hand: [] },
      ],
      discardPile: [topCard],
      currentColor: "red" as const,
      unoDeclaredPlayerIds: ["player-1"],
      unoPenaltyPlayerIds: ["player-1"],
    };

    const updatedGame = playCard({
      game,
      playerId: "player-1",
      cardId: playableCard.id,
    });

    expect(updatedGame.status).toBe("finished");
    expect(updatedGame.currentPlayerIndex).toBe(0);
    expect(updatedGame.unoPenaltyPlayerIds).toEqual([]);
    expect(updatedGame.unoDeclaredPlayerIds).toEqual([]);
  });
});
