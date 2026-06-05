import type { GameState, Player } from "@uno/shared";
import { createDeck } from "./createDeck";
import { shuffleDeck } from "./shuffleDeck";

interface CreateGameParams {
  players: Array<{
    id: string;
    name: string;
  }>;
}

export function createGame(params: CreateGameParams): GameState {
  const deck = shuffleDeck(createDeck());

  const players: Player[] = params.players.map((player) => ({
    ...player,
    hand: [],
  }));

  for (let round = 0; round < 7; round++) {
    for (const player of players) {
      const card = deck.shift();

      if (!card) {
        throw new Error("No hay suficientes cartas para repartir.");
      }

      player.hand.push(card);
    }
  }

  const firstDiscard = deck.shift();

  if (!firstDiscard) {
    throw new Error("No hay carta inicial para el descarte.");
  }

  return {
    id: crypto.randomUUID(),
    players,
    drawPile: deck,
    discardPile: [firstDiscard],
    currentPlayerIndex: 0,
    direction: 1,
    currentColor: firstDiscard.color,
    status: "playing",
    drawStack: 0,
    unoDeclaredPlayerIds: [],
    unoPenaltyPlayerIds: [],
  };
}
