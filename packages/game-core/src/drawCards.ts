import type { GameState } from "@uno/shared";
import { nextTurn } from "./nextTurn";

interface DrawCardsParams {
  game: GameState;
  playerId: string;
  amount?: number;

  /**
   * Si es true, significa que el jugador está pagando
   * una acumulación de +2 / +4.
   */
  clearDrawStack?: boolean;

  /**
   * Si es true, después de robar cartas pasa el turno.
   */
  advanceTurn?: boolean;
}

export function drawCards({
  game,
  playerId,
  amount = 1,
  clearDrawStack = false,
  advanceTurn = false,
}: DrawCardsParams): GameState {
  if (amount <= 0) {
    throw new Error("La cantidad de cartas a robar debe ser mayor a 0.");
  }

  const playerIndex = game.players.findIndex(
    (player) => player.id === playerId
  );

  if (playerIndex === -1) {
    throw new Error("El jugador no existe en la partida.");
  }

  if (game.drawPile.length < amount) {
    throw new Error("No hay suficientes cartas en el mazo para robar.");
  }

  const drawnCards = game.drawPile.slice(0, amount);
  const newDrawPile = game.drawPile.slice(amount);

  const newPlayers = game.players.map((player, index) => {
    if (index !== playerIndex) {
      return player;
    }

    return {
      ...player,
      hand: [...player.hand, ...drawnCards],
    };
  });

  const updatedGame: GameState = {
    ...game,
    players: newPlayers,
    drawPile: newDrawPile,
    drawStack: clearDrawStack ? 0 : game.drawStack,
  };

  if (advanceTurn) {
    return nextTurn({ game: updatedGame });
  }

  return updatedGame;
}