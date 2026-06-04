import type { GameState } from "@uno/shared";

interface NextTurnParams {
  game: GameState;
  steps?: number;
}

export function nextTurn({ game, steps = 1 }: NextTurnParams): GameState {
  const totalPlayers = game.players.length;

  if (totalPlayers === 0) {
    throw new Error("No hay jugadores en la partida.");
  }

  const nextPlayerIndex =
    (game.currentPlayerIndex + steps * game.direction + totalPlayers) %
    totalPlayers;

  return {
    ...game,
    currentPlayerIndex: nextPlayerIndex,
  };
}