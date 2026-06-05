import type { GameState } from "@uno/shared";

interface SayUnoParams {
  game: GameState;
  playerId: string;
}

export function sayUno({ game, playerId }: SayUnoParams): GameState {
  const player = game.players.find((player) => player.id === playerId);

  if (!player) {
    throw new Error("El jugador no existe en la partida.");
  }

  if (player.hand.length !== 1) {
    throw new Error("El jugador debe tener exactamente una carta para decir UNO.");
  }

  return {
    ...game,
    unoDeclaredPlayerIds: game.unoDeclaredPlayerIds.includes(playerId)
      ? game.unoDeclaredPlayerIds
      : [...game.unoDeclaredPlayerIds, playerId],
    unoPenaltyPlayerIds: game.unoPenaltyPlayerIds.filter(
      (penaltyPlayerId) => penaltyPlayerId !== playerId
    ),
  };
}
