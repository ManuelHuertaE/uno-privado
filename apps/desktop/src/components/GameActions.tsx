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
            type="button"
            onClick={onResolveDrawStack}
            disabled={!canResolveDrawStack || actionsDisabled}
          >
            Robar +{drawStack}
          </button>
        ) : (
          <button type="button" onClick={onDrawCard} disabled={!canDrawCard}>
            Robar carta
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
