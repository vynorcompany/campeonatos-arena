import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PortalBottomNav } from "../src/components/portal/portal-navigation";
import { portalMenu } from "../src/lib/portal/menu";
import { portalQuery } from "../src/lib/portal/navigation";

const visibility = { athletePortalShowBooking: false, athletePortalShowReservations: true, athletePortalShowLessons: true, athletePortalShowClasses: true, athletePortalShowLeagues: true, athletePortalShowDoublesRadar: true };
function render(bookingAvailable: boolean, showBooking = false) {
  return renderToStaticMarkup(createElement(PortalBottomNav, {
    items: portalMenu({ ...visibility, athletePortalShowBooking: showBooking }, true),
    current: "schedule", bookingAvailable, href: section => `/home${portalQuery(section)}`,
  }));
}

test("enabled online booking remains a single selected mobile shortcut despite an old menu preference", () => {
  for (const showBooking of [false, true]) {
    const html = render(true, showBooking);
    assert.equal((html.match(/aria-label="Reservas"/g) ?? []).length, 1);
    const shortcut = html.match(/<a\b[^>]*aria-label="Reservas"[^>]*>/)?.[0] ?? "";
    assert.match(shortcut, /href="\/home\?section=booking-direct/);
    assert.match(shortcut, /aria-current="page"/);
    assert.match(html, /Professor/);
  }
});

test("an unavailable booking feature is not forced into a hidden menu", () => {
  assert.doesNotMatch(render(false), /aria-label="Reservas"/);
});
