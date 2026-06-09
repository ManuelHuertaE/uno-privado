import { CenterPile } from "./CenterPile";
import { GameActions } from "./GameActions";
import type {
  Card,
  GameEvent,
  GamePlayer,
  GameState,
  Room,
  RoomPlayer,
} from "./gameTypes";
import { getCardCount } from "./gameTypes";
import { PlayerSeat } from "./PlayerSeat";
import { UnoCard } from "./UnoCard";

type SeatPosition = "top" | "right" | "bottom" | "left";

type GameTableProps = {
  room: Room;
  gameState: GameState;
  currentPlayer?: RoomPlayer;
  localGamePlayer?: GamePlayer;
  gameEvents: GameEvent[];
  isHost: boolean;
  isRoomPaused: boolean;
  canDrawCard: boolean;
  canResumeGame: boolean;
  pauseReason: string;
  disconnectedPlayers: RoomPlayer[];
  onPlayCard: (card: Card) => void;
  onDrawCard: () => void;
  onResolveDrawStack: () => void;
  onSayUno: () => void;
  onChallengeUno: (targetPlayerId: string) => void;
  onPauseGame: () => void;
  onResumeGame: () => void;
};

function formatEventTime(createdAt: string): string {
  return new Intl.DateTimeFormat("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(createdAt));
}

function getOpponentPositions(count: number): SeatPosition[] {
  if (count <= 1) {
    return ["top"];
  }

  if (count === 2) {
    return ["left", "right"];
  }

  return ["right", "top", "left"];
}

function getSeats(
  players: GamePlayer[],
  localPlayerId: string | undefined,
): Array<{ player: GamePlayer; position: SeatPosition; isLocal: boolean }> {
  const localIndex = players.findIndex((player) => player.id === localPlayerId);
  const safeLocalIndex = localIndex >= 0 ? localIndex : 0;
  const orderedPlayers = [
    ...players.slice(safeLocalIndex),
    ...players.slice(0, safeLocalIndex),
  ].slice(0, 4);
  const [localPlayer, ...opponents] = orderedPlayers;

  if (!localPlayer) {
    return [];
  }

  const opponentPositions = getOpponentPositions(opponents.length);

  const seats: Array<{
    player: GamePlayer;
    position: SeatPosition;
    isLocal: boolean;
  }> = [
    { player: localPlayer, position: "bottom", isLocal: true },
    ...opponents.map((player, index) => ({
      player,
      position: opponentPositions[index],
      isLocal: false,
    })),
  ];

  return seats;
}

export function GameTable({
  room,
  gameState,
  currentPlayer,
  localGamePlayer,
  gameEvents,
  isHost,
  isRoomPaused,
  canDrawCard,
  canResumeGame,
  pauseReason,
  disconnectedPlayers,
  onPlayCard,
  onDrawCard,
  onResolveDrawStack,
  onSayUno,
  onChallengeUno,
  onPauseGame,
  onResumeGame,
}: GameTableProps) {
  const currentGamePlayer = gameState.players[gameState.currentPlayerIndex];
  const localPlayerId = currentPlayer?.id;
  const seats = getSeats(gameState.players, localPlayerId);
  const disconnectedPlayerIds = room.disconnectedPlayerIds ?? [];
  const topDiscard = gameState.discardPile.at(-1);
  const isFinished = gameState.status === "finished";
  const isLocalTurn = Boolean(
    currentGamePlayer && currentGamePlayer.id === localGamePlayer?.id,
  );
  const canResolveDrawStack =
    isLocalTurn && gameState.drawStack > 0 && !isRoomPaused && !isFinished;

  return (
    <section className="uno-table-screen" aria-label="Mesa de juego">
      <div className="table-topbar">
        <div className="room-code table-room-code">
          <span>Código de sala</span>
          <strong>{room.id}</strong>
        </div>
        <GameActions
          drawStack={gameState.drawStack}
          isHost={isHost}
          isPaused={isRoomPaused}
          isFinished={isFinished}
          canDrawCard={canDrawCard}
          canResolveDrawStack={canResolveDrawStack}
          canResumeGame={canResumeGame}
          onDrawCard={onDrawCard}
          onResolveDrawStack={onResolveDrawStack}
          onPauseGame={onPauseGame}
          onResumeGame={onResumeGame}
        />
      </div>

      <div className="uno-table-layout">
        <div className="uno-table">
          <CenterPile
            topCard={topDiscard}
            drawPileCount={gameState.drawPile.length}
            currentColor={gameState.currentColor}
            currentPlayerName={currentGamePlayer?.name ?? "Sin jugador"}
            direction={gameState.direction}
            drawStack={gameState.drawStack}
            canDrawCard={canDrawCard}
            onDrawCard={onDrawCard}
          />

          {seats.map(({ player, position, isLocal }) => (
            <PlayerSeat
              key={player.id}
              player={player}
              position={position}
              isLocal={isLocal}
              isHost={player.id === room.hostId}
              isCurrentTurn={player.id === currentGamePlayer?.id}
              isDisconnected={disconnectedPlayerIds.includes(player.id)}
              canSayUno={
                isLocal &&
                getCardCount(player) === 2 &&
                !isRoomPaused &&
                !isFinished
              }
              canChallengeUno={
                !isLocal &&
                getCardCount(player) === 1 &&
                !isRoomPaused &&
                !isFinished
              }
              onSayUno={onSayUno}
              onChallengeUno={() => onChallengeUno(player.id)}
            />
          ))}

          {isRoomPaused && (
            <section className="table-pause-overlay" aria-labelledby="pause-title">
              <h3 id="pause-title">Partida pausada</h3>
              <p>{pauseReason}</p>
              {disconnectedPlayers.length > 0 && (
                <div className="disconnected-players">
                  <span>Jugadores desconectados</span>
                  <ul>
                    {disconnectedPlayers.map((player) => (
                      <li key={player.id}>{player.name}</li>
                    ))}
                  </ul>
                </div>
              )}
              {!isHost && <p>Esperando a que el anfitrión reanude la partida.</p>}
              {isHost && !canResumeGame && (
                <p>
                  La partida no puede reanudarse hasta que todos los jugadores
                  estén conectados.
                </p>
              )}
            </section>
          )}
        </div>

        <aside className="event-history table-event-history" aria-labelledby="events-title">
          <h3 id="events-title">Eventos de la partida</h3>
          {gameEvents.length > 0 ? (
            <ol>
              {gameEvents.map((event) => (
                <li key={event.id}>
                  <time dateTime={event.createdAt}>
                    {formatEventTime(event.createdAt)}
                  </time>
                  <span>{event.message}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p>No hay eventos todavía.</p>
          )}
        </aside>
      </div>

      <section className="local-hand-section" aria-label="Tu mano">
        <div className="local-hand-header">
          <h3>Tu mano</h3>
          <span>
            {localGamePlayer ? getCardCount(localGamePlayer) : 0} cartas
          </span>
        </div>
        <div className="local-hand">
          {localGamePlayer?.hand.length ? (
            localGamePlayer.hand.map((card) => (
              <UnoCard
                card={card}
                key={card.id}
                playable={isLocalTurn && !isRoomPaused && !isFinished}
                onClick={() => onPlayCard(card)}
              />
            ))
          ) : (
            <p className="empty-state">No hay cartas para mostrar.</p>
          )}
        </div>
      </section>
    </section>
  );
}
