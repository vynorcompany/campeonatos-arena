import assert from "node:assert/strict";
import test from "node:test";
import { createPublicRegistrationSchema } from "../src/lib/validators/public-registration";

const registration = {
  tournamentSlug: "torneio-goal",
  categoryId: "categoria-goal",
  paymentMethod: "PIX",
  leadName: "Atleta Um",
  leadEmail: "atleta@example.test",
  leadPhone: "559999999999",
  leadCpf: "11111111111",
  leadBirthDate: "1990-01-01",
  partnerName: "Atleta Dois",
  partnerPhone: "558888888888",
  partnerCpf: "22222222222",
  partnerBirthDate: "1991-01-01",
};

test("inscrição pública impede a mesma pessoa nos dois lados da dupla", () => {
  assert.equal(createPublicRegistrationSchema.safeParse(registration).success, true);
  const repeated = createPublicRegistrationSchema.safeParse({ ...registration, partnerCpf: registration.leadCpf });
  assert.equal(repeated.success, false);
  if (!repeated.success) assert.match(repeated.error.issues[0].message, /CPFs diferentes/);
});
