import type { GameState } from "@uno/shared";
import { nextTurn } from "./nextTurn";
import { refillDrawPile } from "./refillDrawPile";

interface DrawCardsParams {
  game: GameState;
  playerId: string;
  amount?: number;
  clearDrawStack?: boolean;
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

  let workingGame = game;

  if (workingGame.drawPile.length < amount) {
    workingGame = refillDrawPile(workingGame);
  }

  if (workingGame.drawPile.length < amount) {
    throw new Error("No hay suficientes cartas disponibles para robar.");
  }

  const drawnCards = workingGame.drawPile.slice(0, amount);
  const newDrawPile = workingGame.drawPile.slice(amount);

  const newPlayers = workingGame.players.map((player, index) => {
    if (index !== playerIndex) {
      return player;
    }

    return {
      ...player,
      hand: [...player.hand, ...drawnCards],
    };
  });

  const updatedGame: GameState = {
    ...workingGame,
    players: newPlayers,
    drawPile: newDrawPile,
    drawStack: clearDrawStack ? 0 : workingGame.drawStack,
  };

  if (advanceTurn) {
    return nextTurn({ game: updatedGame });
  }

  return updatedGame;
}