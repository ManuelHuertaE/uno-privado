import type { GameState } from "@uno/shared";
import { drawCards } from "./drawCards";

interface ChallengeUnoParams {
  game: GameState;
  challengerPlayerId: string;
  targetPlayerId: string;
}

export function challengeUno({
  game,
  challengerPlayerId,
  targetPlayerId,
}: ChallengeUnoParams): GameState {
  const challenger = game.players.find(
    (player) => player.id === challengerPlayerId
  );

  if (!challenger) {
    throw new Error("El acusador no existe en la partida.");
  }

  const target = game.players.find((player) => player.id === targetPlayerId);

  if (!target) {
    throw new Error("El acusado no existe en la partida.");
  }

  if (challengerPlayerId === targetPlayerId) {
    throw new Error("Un jugador no puede acusarse a si mismo.");
  }

  if (target.hand.length !== 1) {
    throw new Error("El acusado debe tener exactamente una carta.");
  }

  if (!game.unoPenaltyPlayerIds.includes(targetPlayerId)) {
    if (game.unoDeclaredPlayerIds.includes(targetPlayerId)) {
      throw new Error("El acusado ya declaro UNO.");
    }

    throw new Error("El acusado no es penalizable por UNO.");
  }

  const penalizedGame = drawCards({
    game,
    playerId: targetPlayerId,
    amount: 2,
    clearDrawStack: false,
    advanceTurn: false,
  });

  return {
    ...penalizedGame,
    unoDeclaredPlayerIds: penalizedGame.unoDeclaredPlayerIds.filter(
      (playerId) => playerId !== targetPlayerId
    ),
    unoPenaltyPlayerIds: penalizedGame.unoPenaltyPlayerIds.filter(
      (playerId) => playerId !== targetPlayerId
    ),
  };
}
