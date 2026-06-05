import type { GameState } from "@uno/shared";
import { shuffleDeck } from "./shuffleDeck";

export function refillDrawPile(game: GameState): GameState {
  if (game.drawPile.length > 0) {
    return game;
  }

  if (game.discardPile.length <= 1) {
    throw new Error("No hay suficientes cartas para rellenar el mazo.");
  }

  const topCard = game.discardPile.at(-1);

  if (!topCard) {
    throw new Error("No hay carta superior en el descarte.");
  }

  const cardsToRecycle = game.discardPile.slice(0, -1);

  return {
    ...game,
    drawPile: shuffleDeck(cardsToRecycle),
    discardPile: [topCard],
  };
}