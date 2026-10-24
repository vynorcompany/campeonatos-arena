import type { PortalSection } from "./navigation";
export type PortalMenuIcon = "home" | "calendar" | "reservations" | "lessons" | "classes" | "events" | "radar" | "receipt" | "wallet" | "bell" | "profile" | "teacher";
export type PortalMenuItem = { section: PortalSection; label: string; description: string; icon: PortalMenuIcon; group: string };
export function portalMenu(visibility: { athletePortalShowBooking: boolean; athletePortalShowReservations: boolean; athletePortalShowLessons: boolean; athletePortalShowClasses: boolean; athletePortalShowLeagues: boolean; athletePortalShowDoublesRadar: boolean }, isTeacher: boolean): PortalMenuItem[] {
  return [
    { section: "home", label: "Início", description: "Seu dia na arena", icon: "home", group: "Principal" },
    ...(visibility.athletePortalShowBooking ? [{ section: "booking", label: "Reservar quadra", description: "Encontre seu próximo horário", icon: "calendar", group: "Jogar e aprender" } as const] : []),
    ...(visibility.athletePortalShowReservations ? [{ section: "reservations", label: "Minhas reservas", description: "Horários e detalhes dos jogos", icon: "reservations", group: "Jogar e aprender" } as const] : []),
    ...(visibility.athletePortalShowLessons ? [{ section: "lessons", label: "Minhas aulas", description: "Agenda, presenças e reposições", icon: "lessons", group: "Jogar e aprender" } as const] : []),
    ...(visibility.athletePortalShowClasses ? [{ section: "classes", label: "Turmas", description: "Conheça as turmas disponíveis", icon: "classes", group: "Jogar e aprender" } as const] : []),
    ...(visibility.athletePortalShowLeagues ? [{ section: "leagues", label: "Eventos", description: "Torneios, Liga e Super 12", icon: "events", group: "Competir e conectar" } as const] : []),
    ...(visibility.athletePortalShowDoublesRadar ? [{ section: "radar", label: "Radar de duplas", description: "Encontre seu parceiro de jogo", icon: "radar", group: "Competir e conectar" } as const] : []),
    { section: "comandas", label: "Minhas comandas", description: "Consumo e pedidos da arena", icon: "receipt", group: "Minha conta" },
    { section: "finance", label: "Finanças", description: "Pagamentos, saldo e histórico", icon: "wallet", group: "Minha conta" },
    { section: "announcements", label: "Avisos", description: "Novidades e recados da arena", icon: "bell", group: "Minha conta" },
    { section: "profile", label: "Meu perfil", description: "Dados e preferências do atleta", icon: "profile", group: "Minha conta" },
    ...(isTeacher ? [{ section: "teacher", label: "Área do professor", description: "Gerencie suas aulas e alunos", icon: "teacher", group: "Ensinar" } as const] : []),
  ];
}
