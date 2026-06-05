import type { GameState } from "@uno/shared";
import { drawCards } from "./drawCards";

interface DrawForTurnParams {
  game: GameState;
  playerId: string;
}

export function drawForTurn({
  game,
  playerId,
}: DrawForTurnParams): GameState {
  const currentPlayer = game.players[game.currentPlayerIndex];

  if (!currentPlayer) {
    throw new Error("No hay jugador actual.");
  }

  if (currentPlayer.id !== playerId) {
    throw new Error("No es el turno de este jugador.");
  }

  if (game.status !== "playing") {
    throw new Error("La partida no esta en curso.");
  }

  if (game.drawStack > 0) {
    throw new Error("Hay acumulacion de cartas por resolver.");
  }

  return drawCards({
    game,
    playerId,
    amount: 1,
  });
}
