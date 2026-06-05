import type { GameState } from "@uno/shared";
import { drawCards } from "./drawCards";

interface ResolveDrawStackParams {
  game: GameState;
  playerId: string;
}

export function resolveDrawStack({
  game,
  playerId,
}: ResolveDrawStackParams): GameState {
  if (game.drawStack <= 0) {
    throw new Error("No hay acumulación de cartas por resolver.");
  }

  const currentPlayer = game.players[game.currentPlayerIndex];

  if (!currentPlayer) {
    throw new Error("No hay jugador actual.");
  }

  if (currentPlayer.id !== playerId) {
    throw new Error("No es el turno de este jugador.");
  }

  return drawCards({
    game,
    playerId,
    amount: game.drawStack,
    clearDrawStack: true,
    advanceTurn: true,
  });
}