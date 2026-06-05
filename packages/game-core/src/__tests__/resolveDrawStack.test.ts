import { describe, expect, it } from "vitest";
import { createGame } from "../createGame";
import { playCard } from "../playCard";
import { resolveDrawStack } from "../resolveDrawStack";

describe("resolveDrawStack", () => {
  it("should make current player draw accumulated cards and clear drawStack", () => {
    let game = createGame({
      players: [
        { id: "player-1", name: "A" },
        { id: "player-2", name: "B" },
      ],
    });

    const card = {
      id: "test-draw2",
      color: "red",
      value: "draw2",
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

    expect(game.drawStack).toBe(2);
    expect(game.currentPlayerIndex).toBe(1);

    game = resolveDrawStack({
      game,
      playerId: "player-2",
    });

    expect(game.players[1].hand).toHaveLength(9);
    expect(game.drawStack).toBe(0);
    expect(game.currentPlayerIndex).toBe(0);
  });

    it("should handle accumulated +2 + +2", () => {
    let game = createGame({
        players: [
        { id: "player-1", name: "A" },
        { id: "player-2", name: "B" },
        ],
    });

    const player1Draw2 = {
        id: "test-draw2-a",
        color: "red",
        value: "draw2",
    } as const;

    const player2Draw2 = {
        id: "test-draw2-b",
        color: "red",
        value: "draw2",
    } as const;

    game = {
        ...game,
        currentColor: "red",
        players: game.players.map((player, index) => {
        if (index === 0) return { ...player, hand: [player1Draw2, ...player.hand] };
        if (index === 1) return { ...player, hand: [player2Draw2, ...player.hand] };
        return player;
        }),
    };

    game = playCard({
        game,
        playerId: "player-1",
        cardId: player1Draw2.id,
    });

    game = playCard({
        game,
        playerId: "player-2",
        cardId: player2Draw2.id,
    });

    expect(game.drawStack).toBe(4);
    expect(game.currentPlayerIndex).toBe(0);

    game = resolveDrawStack({
        game,
        playerId: "player-1",
    });

    expect(game.players[0].hand).toHaveLength(11);
    expect(game.drawStack).toBe(0);
    expect(game.currentPlayerIndex).toBe(1);
    });
});