import type { PlayerGameView, GameState } from "@uno/shared";

interface GetPlayerViewParams {
  game: GameState;
  playerId: string;
}

export function getPlayerView({
  game,
  playerId,
}: GetPlayerViewParams): PlayerGameView {
  const player = game.players.find((player) => player.id === playerId);

  if (!player) {
    throw new Error("El jugador no existe en la partida.");
  }

  const currentPlayer = game.players[game.currentPlayerIndex];

  if (!currentPlayer) {
    throw new Error("No hay jugador actual.");
  }

  const isCurrentPlayer = currentPlayer.id === playerId;

  return {
    id: game.id,
    players: game.players.map((player, index) => ({
      id: player.id,
      name: player.name,
      cardCount: player.hand.length,
      isCurrentTurn: index === game.currentPlayerIndex,
      isUnoPenaltyRisk: game.unoPenaltyPlayerIds.includes(player.id),
    })),
    myHand: player.hand,
    drawPileCount: game.drawPile.length,
    discardPile: game.discardPile,
    topCard: game.discardPile.at(-1),
    currentPlayerId: currentPlayer.id,
    currentColor: game.currentColor,
    direction: game.direction,
    drawStack: game.drawStack,
    canDraw:
      isCurrentPlayer && game.drawStack === 0 && game.status === "playing",
    canResolveDrawStack: isCurrentPlayer && game.drawStack > 0,
    hasDeclaredUno: game.unoDeclaredPlayerIds.includes(playerId),
    status: game.status,
    winnerId: game.winnerId,
  };
}
