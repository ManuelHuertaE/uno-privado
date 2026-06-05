import { describe, expect, it } from "vitest";
import { createGame } from "../createGame";
import { nextTurn } from "../nextTurn";

describe("nextTurn", () => {
  it("should advance to next player", () => {
    const game = createGame({
      players: [
        { id: "1", name: "A" },
        { id: "2", name: "B" },
        { id: "3", name: "C" },
      ],
    });

    const updatedGame = nextTurn({ game });

    expect(updatedGame.currentPlayerIndex).toBe(1);
  });
});