type Card = {
  id: string;
  color: string;
  value: string;
};

type FinalGamePlayer = {
  id: string;
  name: string;
  hand: Card[];
  handCount?: number;
};

type FinalGameState = {
  players: FinalGamePlayer[];
  winnerId?: string;
};

type RoomPlayer = {
  id: string;
  name: string;
};

type FinalGameScreenProps = {
  roomId: string;
  gameState: FinalGameState;
  roomPlayers?: RoomPlayer[];
  localPlayerId?: string;
  canBackToLobby: boolean;
  onBackToLobby: () => void;
};

function getCardCount(player: FinalGamePlayer): number {
  return player.handCount ?? player.hand.length;
}

function getDisplayName(
  gamePlayer: FinalGamePlayer,
  roomPlayers: RoomPlayer[] | undefined,
): string {
  return (
    roomPlayers?.find((roomPlayer) => roomPlayer.id === gamePlayer.id)?.name ??
    gamePlayer.name
  );
}

export function FinalGameScreen({
  roomId,
  gameState,
  roomPlayers,
  localPlayerId,
  canBackToLobby,
  onBackToLobby,
}: FinalGameScreenProps) {
  const winner = gameState.players.find(
    (player) => player.id === gameState.winnerId,
  );
  const winnerName = winner
    ? getDisplayName(winner, roomPlayers)
    : "Ganador desconocido";

  return (
    <section className="final-screen" aria-labelledby="final-game-title">
      <div className="final-hero">
        <span className="final-eyebrow">Resultado</span>
        <h2 id="final-game-title">Partida finalizada</h2>
        <p className="final-winner">{winnerName}</p>
        <p className="final-subtitle">El jugador se quedo sin cartas.</p>
      </div>

      <div className="final-room-code">
        <span>Codigo de sala</span>
        <strong>{roomId}</strong>
      </div>

      <div className="final-players">
        <h3>Cartas restantes</h3>
        <ul className="final-player-list">
          {gameState.players.map((player) => {
            const isWinner = player.id === gameState.winnerId;
            const isLocalPlayer = player.id === localPlayerId;

            return (
              <li
                className={isWinner ? "final-player winner" : "final-player"}
                key={player.id}
              >
                <div>
                  <span>{getDisplayName(player, roomPlayers)}</span>
                  {isLocalPlayer && <small>Tu</small>}
                </div>
                <strong>{getCardCount(player)} cartas</strong>
              </li>
            );
          })}
        </ul>
      </div>

      {canBackToLobby ? (
        <button className="primary-button" type="button" onClick={onBackToLobby}>
          Volver al lobby
        </button>
      ) : (
        <p className="final-waiting-host">
          Esperando a que el host vuelva al lobby.
        </p>
      )}
    </section>
  );
}
