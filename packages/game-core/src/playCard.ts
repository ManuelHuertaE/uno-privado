import type { CardColor, GameState } from "@uno/shared";
import { isValidMove } from "./isValidMove";
import { nextTurn } from "./nextTurn";

interface PlayCardParams {
  game: GameState;
  playerId: string;
  cardId: string;
  chosenColor?: Exclude<CardColor, "wild">;
}

function isWildCardValue(value: string): boolean {
  return value === "wild" || value === "wildDraw4";
}

export function playCard({
  game,
  playerId,
  cardId,
  chosenColor,
}: PlayCardParams): GameState {
  const currentPlayer = game.players[game.currentPlayerIndex];

  if (!currentPlayer) {
    throw new Error("No hay jugador actual.");
  }

  if (currentPlayer.id !== playerId) {
    throw new Error("No es el turno de este jugador.");
  }

  const cardToPlay = currentPlayer.hand.find((card) => card.id === cardId);

  if (!cardToPlay) {
    throw new Error("El jugador no tiene esa carta.");
  }

  const topCard = game.discardPile.at(-1);

  if (!topCard) {
    throw new Error("No hay carta superior en el descarte.");
  }

  const valid = isValidMove({
    card: cardToPlay,
    topCard,
    currentColor: game.currentColor,
    drawStack: game.drawStack,
  });

  if (!valid) {
    throw new Error("Movimiento inválido.");
  }

  if (isWildCardValue(cardToPlay.value) && !chosenColor) {
    throw new Error("Debes elegir un color para la carta comodín.");
  }

  const newPlayers = game.players.map((player) => {
    if (player.id !== playerId) {
      return player;
    }

    return {
      ...player,
      hand: player.hand.filter((card) => card.id !== cardId),
    };
  });

  const playerAfterMove = newPlayers.find((player) => player.id === playerId);

  if (!playerAfterMove) {
    throw new Error("No se encontró al jugador después de jugar.");
  }

  const updatedGame: GameState = {
    ...game,
    players: newPlayers,
    discardPile: [...game.discardPile, cardToPlay],
    currentColor: isWildCardValue(cardToPlay.value)
      ? chosenColor!
      : cardToPlay.color,
    status: playerAfterMove.hand.length === 0 ? "finished" : game.status,
  };

  if (updatedGame.status === "finished") {
    return updatedGame;
  }

  return nextTurn({ game: updatedGame });
}