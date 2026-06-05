import { describe, expect, it } from "vitest";
import { createGame } from "../createGame";
import { drawCards } from "../drawCards";

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
});