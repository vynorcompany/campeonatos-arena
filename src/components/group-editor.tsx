"use client";

import { cx } from "@/lib/ui/classes";
import { viewStyles } from "./group-editor.utilities";
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
    <div className={viewStyles.group_grid}>
      {groups.map((group) => {
        const isDropActive = pendingTarget === group.id && isPending;

        return (
          <section
            key={group.id}
            className={cx(`${viewStyles.section_card_group_drop_zone}${draggingPairId ? " " + viewStyles.group_drop_zone_ready : ""}${isDropActive ? " " + viewStyles.group_drop_zone_pending : ""}`)}
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

            <div className={viewStyles.group_drag_list}>
              {group.pairs.map((pair) => (
                <article
                  key={pair.id}
                  className={cx(`${viewStyles.group_drag_card}${draggingPairId === pair.id ? " " + viewStyles.group_drag_card_dragging : ""}`)}
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

            <div className={viewStyles.group_standings}>
              <p className={viewStyles.group_results_title}>Classificação</p>
              <table className={viewStyles.group_standings_table}>
                <thead>
                  <tr>
                    <th>Dupla</th>
                    <th>Vitórias</th>
                    <th>Games pró</th>
                    <th>Games contra</th>
                    <th>Saldo</th>
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
                      <td>{pair.gamesFor - pair.gamesAgainst}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {group.matches.length ? (
              <div className={viewStyles.group_results}>
                <p className={viewStyles.group_results_title}>Resultados</p>
                {group.matches.map((match) => (
                  <div key={match.id} className={viewStyles.group_result_item}>
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

