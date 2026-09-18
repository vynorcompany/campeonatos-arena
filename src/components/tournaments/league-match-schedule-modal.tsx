"use client";

import { useMemo, useState, useTransition } from "react";
import { createLeagueChallengeAction } from "@/lib/actions/league-challenges";

type Slot = {
  value: string;
  courtId: string;
  courtName: string;
  courtColor: string;
  startsAt: string;
  durationMinutes: number;
  label: string;
};

type Opponent = { id: string; name: string; block: number | null };

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  })
    .format(new Date(value))
    .replace(".", "");
}

function timeLabel(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function durationLabel(minutes: number) {
  return minutes % 60
    ? `${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, "0")}`
    : `${minutes / 60}h`;
}

export function LeagueMatchScheduleModal({
  arenaSlug,
  proposerPairId,
  proposerName,
  opponents,
  slots,
  onMessage,
}: {
  arenaSlug: string;
  proposerPairId: string;
  proposerName: string;
  opponents: Opponent[];
  slots: Slot[];
  onMessage: (message: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [opponentPairId, setOpponentPairId] = useState(opponents[0]?.id ?? "");
  const [courtId, setCourtId] = useState(slots[0]?.courtId ?? "");
  const dates = useMemo(
    () => Array.from(new Set(slots.map((slot) => slot.startsAt.slice(0, 10)))),
    [slots],
  );
  const [date, setDate] = useState(dates[0] ?? "");
  const courts = useMemo(
    () =>
      Array.from(
        new Map(
          slots.map((slot) => [
            slot.courtId,
            { id: slot.courtId, name: slot.courtName, color: slot.courtColor },
          ]),
        ).values(),
      ),
    [slots],
  );
  const availableSlots = useMemo(
    () =>
      slots.filter(
        (slot) => slot.courtId === courtId && slot.startsAt.startsWith(date),
      ),
    [courtId, date, slots],
  );
  const [slotValue, setSlotValue] = useState("");
  const selectedSlot =
    availableSlots.find((slot) => slot.value === slotValue) ??
    availableSlots[0];
  const [pending, startTransition] = useTransition();

  const chooseCourt = (nextCourtId: string) => {
    setCourtId(nextCourtId);
    setSlotValue("");
  };
  const chooseDate = (nextDate: string) => {
    setDate(nextDate);
    setSlotValue("");
  };
  const submit = () => {
    if (!selectedSlot || !opponentPairId) return;
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("arenaSlug", arenaSlug);
        formData.set("proposerPairId", proposerPairId);
        formData.set("opponentPairId", opponentPairId);
        formData.set("courtId", selectedSlot.courtId);
        formData.set("startsAt", selectedSlot.startsAt);
        formData.set("durationMinutes", String(selectedSlot.durationMinutes));
        await createLeagueChallengeAction(formData);
        setOpen(false);
        onMessage("Sugestão enviada para a dupla.");
      } catch (error) {
        onMessage(
          error instanceof Error
            ? error.message
            : "Não foi possível enviar a sugestão.",
        );
      }
    });
  };

  return (
    <>
      <button
        type="button"
        className="button button-primary public-league-schedule-trigger"
        onClick={() => setOpen(true)}
        disabled={!slots.length}
      >
        Sugerir horário
      </button>
      {open ? (
        <div
          className="public-league-schedule-modal-backdrop"
          role="presentation"
          onMouseDown={() => !pending && setOpen(false)}
        >
          <section
            className="public-league-schedule-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`league-schedule-${proposerPairId}`}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header>
              <div>
                <span>JOGO DA LIGA</span>
                <h3 id={`league-schedule-${proposerPairId}`}>
                  Sugerir horário
                </h3>
                <p>
                  Escolha uma quadra e um horário disponível para {proposerName}
                  .
                </p>
              </div>
              <button
                type="button"
                className="button button-small"
                onClick={() => setOpen(false)}
                disabled={pending}
              >
                Fechar
              </button>
            </header>
            <label className="field">
              <span>Confronto mandante</span>
              <select
                value={opponentPairId}
                onChange={(event) => setOpponentPairId(event.target.value)}
              >
                {opponents.map((opponent) => (
                  <option value={opponent.id} key={opponent.id}>
                    Semana {opponent.block ?? "—"} · {opponent.name}
                  </option>
                ))}
              </select>
            </label>
            <section
              className="public-booking-court-picker"
              aria-label="Quadra"
            >
              <strong>Quadra</strong>
              <div>
                {courts.map((court) => (
                  <button
                    type="button"
                    key={court.id}
                    className={`public-booking-court-card${court.id === courtId ? " is-active" : ""}`}
                    onClick={() => chooseCourt(court.id)}
                    style={{ borderLeftColor: court.color }}
                    aria-pressed={court.id === courtId}
                  >
                    <i
                      style={{ backgroundColor: court.color }}
                      aria-hidden="true"
                    />
                    <span>{court.name}</span>
                    <small>
                      {court.id === courtId ? "Selecionada" : "Selecionar"}
                    </small>
                  </button>
                ))}
              </div>
            </section>
            <section className="public-league-schedule-dates" aria-label="Data">
              <strong>Data</strong>
              <div>
                {dates.map((item) => (
                  <button
                    type="button"
                    className={item === date ? "is-active" : ""}
                    onClick={() => chooseDate(item)}
                    key={item}
                  >
                    {dateLabel(`${item}T12:00:00`)}
                  </button>
                ))}
              </div>
            </section>
            <section
              className="public-booking-slot-blocks"
              aria-label="Horários disponíveis"
            >
              <strong>Horários disponíveis</strong>
              <div>
                {availableSlots.length ? (
                  availableSlots.map((slot) => (
                    <button
                      type="button"
                      className={`public-booking-slot-block${selectedSlot?.value === slot.value ? " public-booking-slot-block-active" : ""}`}
                      onClick={() => setSlotValue(slot.value)}
                      key={slot.value}
                    >
                      <b>{timeLabel(slot.startsAt)}</b>
                      <small>{durationLabel(slot.durationMinutes)}</small>
                    </button>
                  ))
                ) : (
                  <p>Não há horários disponíveis nesta combinação.</p>
                )}
              </div>
            </section>
            {selectedSlot ? (
              <footer>
                <div>
                  <span>SELECIONADO</span>
                  <strong>
                    {selectedSlot.courtName} ·{" "}
                    {dateLabel(selectedSlot.startsAt)} às{" "}
                    {timeLabel(selectedSlot.startsAt)}
                  </strong>
                  <small>
                    Duração de {durationLabel(selectedSlot.durationMinutes)}
                  </small>
                </div>
                <button
                  type="button"
                  className="button button-primary"
                  onClick={submit}
                  disabled={pending}
                >
                  {pending ? "Enviando..." : "Enviar sugestão"}
                </button>
              </footer>
            ) : null}
          </section>
        </div>
      ) : null}
    </>
  );
}
