import type { GameState } from "@uno/shared";

interface DrawCardsParams {
  game: GameState;
  playerId: string;
  amount?: number;
}

export function drawCards({
  game,
  playerId,
  amount = 1,
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

  return {
    ...game,
    players: newPlayers,
    drawPile: newDrawPile,
  };
}