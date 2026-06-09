import type { GamePlayer } from "./gameTypes";
import { getCardCount } from "./gameTypes";
import { UnoCard } from "./UnoCard";

type PlayerSeatProps = {
  player: GamePlayer;
  position: "top" | "right" | "bottom" | "left";
  isLocal: boolean;
  isHost: boolean;
  isCurrentTurn: boolean;
  isDisconnected: boolean;
  canChallengeUno: boolean;
  canSayUno: boolean;
  onSayUno?: () => void;
  onChallengeUno?: () => void;
};

export function PlayerSeat({
  player,
  position,
  isLocal,
  isHost,
  isCurrentTurn,
  isDisconnected,
  canChallengeUno,
  canSayUno,
  onSayUno,
  onChallengeUno,
}: PlayerSeatProps) {
  const cardCount = getCardCount(player);
  const hiddenCards = Array.from({ length: Math.min(cardCount, 7) });

  return (
    <section
      className={[
        "player-seat",
        `seat-${position}`,
        isCurrentTurn ? "is-turn" : "",
        isDisconnected ? "is-disconnected" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={`Jugador ${player.name}`}
    >
      <div className="seat-info">
        <div className="seat-name-row">
          <strong>{player.name}</strong>
          {isLocal && <span className="seat-badge">Tu</span>}
          {isHost && <span className="seat-badge host">Anfitrion</span>}
          {isLocal && canSayUno && (
            <button className="seat-inline-action" type="button" onClick={onSayUno}>
              UNO
            </button>
          )}
          {!isLocal && canChallengeUno && (
            <button
              className="seat-inline-action challenge"
              type="button"
              onClick={onChallengeUno}
            >
              Retar UNO
            </button>
          )}
        </div>
        <div className="seat-meta">
          <span>{cardCount} cartas</span>
          <span>{isDisconnected ? "Desconectado" : "Conectado"}</span>
          {cardCount === 1 && <span>UNO</span>}
        </div>
      </div>

      {!isLocal && (
        <div className="opponent-hand" aria-hidden="true">
          {hiddenCards.map((_, index) => (
            <UnoCard compact hidden key={`${player.id}-hidden-${index}`} />
          ))}
        </div>
      )}
    </section>
  );
}
