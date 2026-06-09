import { describe, expect, it } from "vitest";
import { createGame } from "../createGame";

describe("createGame", () => {
  it("should not start with a wild card on the discard pile", () => {
    for (let index = 0; index < 100; index++) {
      const game = createGame({
        players: [
          { id: "player-1", name: "A" },
          { id: "player-2", name: "B" },
        ],
      });

      expect(game.discardPile[0].value).not.toBe("wild");
      expect(game.discardPile[0].value).not.toBe("wildDraw4");
      expect(game.currentColor).not.toBe("wild");
    }
  });
});
