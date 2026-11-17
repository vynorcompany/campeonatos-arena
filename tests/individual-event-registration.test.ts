import assert from "node:assert/strict";
import test from "node:test";
import { parseCategoryList } from "../src/lib/tournaments/inputs";
import { createManualTournamentRegistrationSchema, createPublicRegistrationSchema, updateManualTournamentRegistrationSchema } from "../src/lib/validators/public-registration";

const individual = { tournamentSlug: "day-use", tournamentId: "event", categoryId: "category", registrationType: "INDIVIDUAL", leadName: "Atleta Dayuse", leadEmail: "qa@example.test", leadPhone: "42999990000", leadCpf: "11111111111" };
test("individual event registration accepts exactly one athlete and preserves pair requirements", () => {
  const parsed = createPublicRegistrationSchema.parse(individual);
  assert.equal(parsed.partnerName, ""); assert.equal(parsed.partnerCpf, "");
  assert.equal(createPublicRegistrationSchema.safeParse({ ...individual, registrationType: "PAIR" }).success, false);
  assert.equal(createPublicRegistrationSchema.safeParse({ ...individual, partnerName: "Outro Atleta", partnerPhone: "42999990001", partnerCpf: "22222222222" }).success, false);
  assert.equal(createPublicRegistrationSchema.safeParse({ ...individual, thirdName: "Outro Atleta" }).success, false);
  assert.equal(createPublicRegistrationSchema.safeParse({ ...individual, registrationType: "SINGLES" }).success, false);
  const manual = { tournamentId: "event", categoryId: "category", registrationType: "INDIVIDUAL", leadPlayerId: "athlete", amountReais: "80,00" };
  assert.equal(createManualTournamentRegistrationSchema.safeParse(manual).success, true);
  assert.equal(createManualTournamentRegistrationSchema.safeParse({ ...manual, partnerPlayerId: "other" }).success, false);
  assert.equal(createManualTournamentRegistrationSchema.safeParse({ ...manual, registrationType: "PAIR" }).success, false);
  assert.equal(updateManualTournamentRegistrationSchema.safeParse({ ...individual, registrationId: "registration", amountReais: "80,00" }).success, true);
});

test("category input preserves individual type without changing legacy categories", () => {
  assert.equal(parseCategoryList(JSON.stringify([{ name: "Day use", registrationType: "INDIVIDUAL" }]), 0, 0, 0)[0].registrationType, "INDIVIDUAL");
  assert.throws(() => parseCategoryList(JSON.stringify([{ name: "Day use", registrationType: "SINGLES" }]), 0, 0, 0), /Tipo de inscrição inválido/);
});
