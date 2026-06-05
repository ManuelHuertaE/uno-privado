import type { CardColor, GameState } from "@uno/shared";
import { isValidMove } from "./isValidMove";
import { applyCardEffect } from "./applyCardEffect";

interface PlayCardParams {
  game: GameState;
  playerId: string;
  cardId: string;
  chosenColor?: Exclude<CardColor, "wild">;
}

function isWildCardValue(value: string): boolean {
  return value === "wild" || value === "wildDraw4";
}

function updateUnoStateAfterPlay(game: GameState, playerId: string): GameState {
  const player = game.players.find((player) => player.id === playerId);

  if (!player) {
    throw new Error("No se encontro al jugador despues de jugar.");
  }

  const declaredUno = game.unoDeclaredPlayerIds.includes(playerId);
  const unoDeclaredPlayerIds =
    player.hand.length === 1 && declaredUno
      ? game.unoDeclaredPlayerIds
      : game.unoDeclaredPlayerIds.filter(
          (declaredPlayerId) => declaredPlayerId !== playerId
        );

  const shouldBePenalized = player.hand.length === 1 && !declaredUno;
  const unoPenaltyPlayerIds = shouldBePenalized
    ? game.unoPenaltyPlayerIds.includes(playerId)
      ? game.unoPenaltyPlayerIds
      : [...game.unoPenaltyPlayerIds, playerId]
    : game.unoPenaltyPlayerIds.filter(
        (penaltyPlayerId) => penaltyPlayerId !== playerId
      );

  return {
    ...game,
    unoDeclaredPlayerIds,
    unoPenaltyPlayerIds,
  };
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

  const updatedGame = updateUnoStateAfterPlay(
    {
      ...game,
      players: newPlayers,
      discardPile: [...game.discardPile, cardToPlay],
      currentColor: isWildCardValue(cardToPlay.value)
        ? chosenColor!
        : cardToPlay.color,
      status: playerAfterMove.hand.length === 0 ? "finished" : game.status,
    },
    playerId
  );

  if (updatedGame.status === "finished") {
    return updatedGame;
  }

  return applyCardEffect({
    game: updatedGame,
    card: cardToPlay,
  });
}
