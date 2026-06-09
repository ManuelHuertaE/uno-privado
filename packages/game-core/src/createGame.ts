import type { GameState, Player } from "@uno/shared";
import { createDeck } from "./createDeck";
import { shuffleDeck } from "./shuffleDeck";

interface CreateGameParams {
  players: Array<{
    id: string;
    name: string;
  }>;
}

function createGameId(): string {
  return `game_${Math.random().toString(36).slice(2, 12)}`;
}

function canStartDiscard(value: string): boolean {
  return value !== "wild" && value !== "wildDraw4";
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

  const firstDiscardIndex = deck.findIndex((card) =>
    canStartDiscard(card.value),
  );

  if (firstDiscardIndex === -1) {
    throw new Error("No hay carta inicial valida para el descarte.");
  }

  const [firstDiscard] = deck.splice(firstDiscardIndex, 1);

  if (!firstDiscard) {
    throw new Error("No hay carta inicial para el descarte.");
  }

  return {
    id: createGameId(),
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
