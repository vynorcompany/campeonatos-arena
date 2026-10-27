import { arenaDatabase } from "@/lib/arena-database";

export async function getArenaDashboard(arenaId: string, selectedTournamentId?: string) {
  const activeWhere = {
    arenaId,
    status: {
      not: "FINISHED"
    }
  } as const;

  const activeTournaments = await arenaDatabase(arenaId).tournament.findMany({
    where: activeWhere,
    orderBy: {
      createdAt: "desc"
    },
    select: {
      id: true,
      name: true,
      registrationPhase: true,
      status: true
    }
  });

  const activeTournament = await arenaDatabase(arenaId).tournament.findFirst({
    where: {
      ...activeWhere,
      ...(selectedTournamentId ? { id: selectedTournamentId } : {})
    },
    orderBy: {
      createdAt: "desc"
    },
    include: {
      ranking: true,
      entries: {
        include: {
          player: true
        },
        orderBy: {
          seedPoints: "desc"
        }
      },
      pairs: {
        include: {
          players: {
            include: {
              player: true
            },
            orderBy: {
              slot: "asc"
            }
          },
          group: true
        },
        orderBy: {
          totalPoints: "desc"
        }
      },
      groups: {
        include: {
          pairs: {
            orderBy: {
              totalPoints: "desc"
            }
          }
        },
        orderBy: {
          drawOrder: "asc"
        }
      },
      matches: {
        include: {
          group: true,
          homePair: {
            include: {
              players: {
                include: {
                  player: true
                },
                orderBy: {
                  slot: "asc"
                }
              }
            }
          },
          awayPair: {
            include: {
              players: {
                include: {
                  player: true
                },
                orderBy: {
                  slot: "asc"
                }
              }
            }
          },
          winnerPair: true
        },
        orderBy: [
          { stage: "asc" },
          { roundOrder: "asc" }
        ]
      }
      ,
      categories: {
        where: {
          active: true
        },
        orderBy: {
          level: "asc"
        }
      },
      publicRegistrations: {
        select: {
          id: true,
          paymentStatus: true,
          status: true
        }
      }
    }
  });

  const players = await arenaDatabase(arenaId).player.findMany({
    where: { arenaId },
    orderBy: {
      points: "desc"
    },
    include: {
      _count: {
        select: {
          entries: true,
          pairPlayers: true,
          categoryPairPlayers: true
        }
      }
    }
  });

  const tournamentHistory = await arenaDatabase(arenaId).tournament.findMany({
    where: {
      arenaId,
      status: "FINISHED"
    },
    orderBy: {
      updatedAt: "desc"
    },
    include: {
      _count: {
        select: {
          entries: true,
          pairs: true,
          groups: true,
          matches: true
        }
      }
    }
  });

  return {
    players,
    activeTournaments,
    activeTournament,
    tournamentHistory
  };
}

export async function getFinishedTournamentDetails(tournamentId: string, arenaId: string) {
  const tournament = await arenaDatabase(arenaId).tournament.findFirst({
    where: {
      id: tournamentId,
      arenaId,
      status: "FINISHED"
    },
    include: {
      entries: {
        include: {
          player: true
        },
        orderBy: {
          seedPoints: "desc"
        }
      },
      pairs: {
        include: {
          players: {
            include: {
              player: true
            },
            orderBy: {
              slot: "asc"
            }
          },
          group: true
        },
        orderBy: [
          { totalPoints: "desc" },
          { drawOrder: "asc" }
        ]
      },
      groups: {
        include: {
          pairs: {
            orderBy: {
              totalPoints: "desc"
            }
          }
        },
        orderBy: {
          drawOrder: "asc"
        }
      },
      matches: {
        include: {
          group: true,
          homePair: {
            include: {
              players: {
                include: {
                  player: true
                },
                orderBy: {
                  slot: "asc"
                }
              }
            }
          },
          awayPair: {
            include: {
              players: {
                include: {
                  player: true
                },
                orderBy: {
                  slot: "asc"
                }
              }
            }
          },
          winnerPair: true
        },
        orderBy: [
          { stage: "asc" },
          { roundOrder: "asc" }
        ]
      }
    }
  });

  return tournament;
}

export async function getTournamentDetailsById(tournamentId: string, arenaId: string) {
  return arenaDatabase(arenaId).tournament.findFirst({
    where: {
      id: tournamentId,
      arenaId
    },
    include: {
      arena: {
        include: {
          players: {
            where: { active: true },
            orderBy: { points: "desc" }
          }
        }
      },
      ranking: true,
      categories: {
        where: { active: true },
        orderBy: { level: "asc" }
      },
      entries: {
        include: { player: true },
        orderBy: { seedPoints: "desc" }
      },
      pairs: {
        include: {
          players: {
            include: { player: true },
            orderBy: { slot: "asc" }
          },
          group: true
        },
        orderBy: [{ totalPoints: "desc" }, { drawOrder: "asc" }]
      },
      groups: {
        include: {
          pairs: {
            orderBy: { totalPoints: "desc" }
          }
        },
        orderBy: { drawOrder: "asc" }
      },
      matches: {
        include: {
          group: true,
          homePair: true,
          awayPair: true,
          winnerPair: true
        },
        orderBy: [{ stage: "asc" }, { roundOrder: "asc" }]
      },
      publicRegistrations: {
        include: {
          category: true
        },
        orderBy: [{ createdAt: "desc" }]
      }
    }
  });
}

export async function getTournamentScheduleConflicts(tournamentId: string, arenaId: string) {
  const matches = await arenaDatabase(arenaId).match.findMany({
    where: {
      tournamentId,
      tournament: {
        arenaId
      },
      scheduledTime: {
        not: null
      }
    },
    include: {
      homePair: {
        include: {
          players: true
        }
      },
      awayPair: {
        include: {
          players: true
        }
      }
    }
  });

  const conflicts: Array<{
    scheduledTime: string;
    playerId: string;
    matchIds: string[];
    labels: string[];
  }> = [];

  const slotByPlayer = new Map<string, Map<string, { matchId: string; label: string }[]>>();
  for (const match of matches) {
    if (!match.scheduledTime) continue;
    const playerIds = [
      ...(match.homePair?.players.map((pairPlayer) => pairPlayer.playerId) ?? []),
      ...(match.awayPair?.players.map((pairPlayer) => pairPlayer.playerId) ?? [])
    ];

    for (const playerId of playerIds) {
      const perPlayer = slotByPlayer.get(playerId) ?? new Map<string, { matchId: string; label: string }[]>();
      const list = perPlayer.get(match.scheduledTime) ?? [];
      list.push({ matchId: match.id, label: match.label });
      perPlayer.set(match.scheduledTime, list);
      slotByPlayer.set(playerId, perPlayer);
    }
  }

  for (const [playerId, slots] of slotByPlayer.entries()) {
    for (const [scheduledTime, items] of slots.entries()) {
      if (items.length > 1) {
        conflicts.push({
          playerId,
          scheduledTime,
          matchIds: items.map((item) => item.matchId),
          labels: items.map((item) => item.label)
        });
      }
    }
  }

  return conflicts;
}
