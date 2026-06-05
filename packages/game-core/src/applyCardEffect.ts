import type { Card, GameState } from "@uno/shared";
import { nextTurn } from "./nextTurn";

interface ApplyCardEffectParams {
  game: GameState;
  card: Card;
}

export function applyCardEffect({
  game,
  card,
}: ApplyCardEffectParams): GameState {
  switch (card.value) {
    case "skip": {
      return nextTurn({
        game,
        steps: 2,
      });
    }

    case "reverse": {
      const reversedGame: GameState = {
        ...game,
        direction: game.direction === 1 ? -1 : 1,
      };

      return nextTurn({
        game: reversedGame,
      });
    }

    case "draw2": {
      const updatedGame: GameState = {
        ...game,
        drawStack: game.drawStack + 2,
      };

      return nextTurn({
        game: updatedGame,
      });
    }

    case "wildDraw4": {
      const updatedGame: GameState = {
        ...game,
        drawStack: game.drawStack + 4,
      };

      return nextTurn({
        game: updatedGame,
      });
    }

    case "wild": {
      return nextTurn({
        game,
      });
    }

    default: {
      return nextTurn({
        game,
      });
    }
  }
}