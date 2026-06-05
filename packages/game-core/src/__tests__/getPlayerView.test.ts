import { describe, expect, it } from "vitest";
import { createGame } from "../createGame";
import { getPlayerView } from "../getPlayerView";

describe("getPlayerView", () => {
  it("should expose that the current player can draw during a normal turn", () => {
    const game = createGame({
      players: [
        { id: "player-1", name: "A" },
        { id: "player-2", name: "B" },
      ],
    });

    const view = getPlayerView({
      game,
      playerId: "player-1",
    });

    expect(view.canDraw).toBe(true);
    expect(view.canResolveDrawStack).toBe(false);
  });

  it("should expose draw stack resolution for the current player", () => {
    const game = {
      ...createGame({
        players: [
          { id: "player-1", name: "A" },
          { id: "player-2", name: "B" },
        ],
      }),
      drawStack: 2,
    };

    const currentPlayerView = getPlayerView({
      game,
      playerId: "player-1",
    });
    const otherPlayerView = getPlayerView({
      game,
      playerId: "player-2",
    });

    expect(currentPlayerView.canDraw).toBe(false);
    expect(currentPlayerView.canResolveDrawStack).toBe(true);
    expect(otherPlayerView.canDraw).toBe(false);
    expect(otherPlayerView.canResolveDrawStack).toBe(false);
  });
});
