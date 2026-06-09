import type { Card, CardColor } from "./gameTypes";
import { UnoCard } from "./UnoCard";

type CenterPileProps = {
  topCard?: Card;
  drawPileCount: number;
  currentColor: CardColor;
  currentPlayerName: string;
  direction: 1 | -1;
  drawStack: number;
  canDrawCard: boolean;
  onDrawCard: () => void;
};

export function CenterPile({
  topCard,
  drawPileCount,
  currentColor,
  currentPlayerName,
  direction,
  drawStack,
  canDrawCard,
  onDrawCard,
}: CenterPileProps) {
  return (
    <section className="center-pile" aria-label="Centro de la mesa">
      <div className="pile-cards">
        <div className="pile-card-group">
          <span>Mazo</span>
          <UnoCard hidden playable={canDrawCard} onClick={onDrawCard} />
          <small>{drawPileCount} cartas</small>
        </div>

        <div className="pile-card-group discard">
          <span>Descarte</span>
          <UnoCard card={topCard} />
          <small>Carta superior</small>
        </div>
      </div>

      <div className="table-status">
        <div>
          <span>Color actual</span>
          <strong className={`current-color current-color-${currentColor}`}>
            {currentColor}
          </strong>
        </div>
        <div>
          <span>Turno</span>
          <strong>{currentPlayerName}</strong>
        </div>
        <div>
          <span>Dirección</span>
          <strong>{direction === 1 ? "Horario ↻" : "Antihorario ↺"}</strong>
        </div>
        {drawStack > 0 && (
          <div className="draw-stack-status">
            <span>Acumulado</span>
            <strong>+{drawStack}</strong>
          </div>
        )}
      </div>
    </section>
  );
}
