type GameActionsProps = {
  drawStack: number;
  isHost: boolean;
  isPaused: boolean;
  isFinished: boolean;
  canDrawCard: boolean;
  canResolveDrawStack: boolean;
  canResumeGame: boolean;
  onDrawCard: () => void;
  onResolveDrawStack: () => void;
  onPauseGame: () => void;
  onResumeGame: () => void;
};

export function GameActions({
  drawStack,
  isHost,
  isPaused,
  isFinished,
  canDrawCard,
  canResolveDrawStack,
  canResumeGame,
  onDrawCard,
  onResolveDrawStack,
  onPauseGame,
  onResumeGame,
}: GameActionsProps) {
  const actionsDisabled = isPaused || isFinished;

  return (
    <section className="table-actions" aria-label="Acciones de juego">
      <div className="table-action-buttons">
        {drawStack > 0 ? (
          <button
            className="draw-action-button is-stack"
            type="button"
            onClick={onResolveDrawStack}
            disabled={!canResolveDrawStack || actionsDisabled}
          >
            <span>Robar cartas acumuladas</span>
            <strong>Acumulado actual: +{drawStack}</strong>
          </button>
        ) : (
          <button
            className="draw-action-button"
            type="button"
            onClick={onDrawCard}
            disabled={!canDrawCard}
          >
            <span>Mazo</span>
            <strong>Robar carta</strong>
          </button>
        )}

        {isHost &&
          (isPaused ? (
            <button
              type="button"
              onClick={onResumeGame}
              disabled={!canResumeGame || isFinished}
            >
              Reanudar partida
            </button>
          ) : (
            <button type="button" onClick={onPauseGame} disabled={isFinished}>
              Pausar partida
            </button>
          ))}
      </div>
    </section>
  );
}
