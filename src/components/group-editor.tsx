"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { moveTournamentPairGroupAction } from "@/lib/actions/tournament";

type GroupEditorPair = {
  id: string;
  name: string;
  totalPoints: number;
  wins: number;
  gamesFor: number;
  gamesAgainst: number;
};

type GroupEditorMatch = {
  id: string;
  homePairName: string;
  awayPairName: string;
  scoreLabel: string;
};

type GroupEditorGroup = {
  id: string;
  name: string;
  pairs: GroupEditorPair[];
  matches: GroupEditorMatch[];
};

type GroupEditorProps = {
  groups: GroupEditorGroup[];
};

export function GroupEditor({ groups }: GroupEditorProps) {
  const router = useRouter();
  const [pendingTarget, setPendingTarget] = useState<string | null>(null);
  const [draggingPairId, setDraggingPairId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const pairGroupMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const group of groups) {
      for (const pair of group.pairs) {
        map.set(pair.id, group.id);
      }
    }
    return map;
  }, [groups]);

  function handleDrop(targetGroupId: string) {
    if (!draggingPairId) {
      return;
    }

    if (pairGroupMap.get(draggingPairId) === targetGroupId) {
      setDraggingPairId(null);
      return;
    }

    setPendingTarget(targetGroupId);

    startTransition(async () => {
      const formData = new FormData();
      formData.set("pairId", draggingPairId);
      formData.set("targetGroupId", targetGroupId);
      await moveTournamentPairGroupAction(formData);
      setDraggingPairId(null);
      setPendingTarget(null);
      router.refresh();
    });
  }

  return (
    <div className="group-grid">
      {groups.map((group) => {
        const isDropActive = pendingTarget === group.id && isPending;

        return (
          <section
            key={group.id}
            className={`section-card group-drop-zone${draggingPairId ? " group-drop-zone-ready" : ""}${isDropActive ? " group-drop-zone-pending" : ""}`}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              handleDrop(group.id);
            }}
          >
            <div className="section-card-header">
              <div>
                <h2>{group.name}</h2>
                <p>{group.pairs.length} duplas</p>
              </div>
            </div>

            <div className="group-drag-list">
              {group.pairs.map((pair) => (
                <article
                  key={pair.id}
                  className={`group-drag-card${draggingPairId === pair.id ? " group-drag-card-dragging" : ""}`}
                  draggable={!isPending}
                  onDragStart={() => setDraggingPairId(pair.id)}
                  onDragEnd={() => setDraggingPairId(null)}
                >
                  <div>
                    <strong>{pair.name}</strong>
                    <span>{pair.totalPoints} pts</span>
                  </div>
                  <small>{pair.wins} vitórias</small>
                </article>
              ))}
            </div>

            <div className="group-standings">
              <p className="group-results-title">Classificação</p>
              <table className="group-standings-table">
                <thead>
                  <tr>
                    <th>Dupla</th>
                    <th>Vitórias</th>
                    <th>Games pró</th>
                    <th>Games contra</th>
                  </tr>
                </thead>
                <tbody>
                  {group.pairs.map((pair) => (
                    <tr key={pair.id}>
                      <td>
                        <strong>{pair.name}</strong>
                        <span>{pair.totalPoints} pts</span>
                      </td>
                      <td>{pair.wins}</td>
                      <td>{pair.gamesFor}</td>
                      <td>{pair.gamesAgainst}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {group.matches.length ? (
              <div className="group-results">
                <p className="group-results-title">Resultados</p>
                {group.matches.map((match) => (
                  <div key={match.id} className="group-result-item">
                    <span>{match.homePairName}</span>
                    <strong>{match.scoreLabel}</strong>
                    <span>{match.awayPairName}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
