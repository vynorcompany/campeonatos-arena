import assert from "node:assert/strict";
import test from "node:test";
import { cancellationPolicySchema } from "../src/lib/legal/cancellation-policy";

test("a cancellation draft may be empty but an empty or short policy cannot be published", () => {
  assert.equal(cancellationPolicySchema.safeParse({ cancellationPolicy: "  ", cancellationPolicyPublished: false }).success, true);
  for (const text of ["", "   ", "Consulte a recepção"]) {
    assert.equal(cancellationPolicySchema.safeParse({ cancellationPolicy: text, cancellationPolicyPublished: true }).success, false);
  }
});
test("each arena supplies its conditions without a fixed cancellation window", () => {
  for (const text of ["Reservas podem ser canceladas com oito horas de antecedência.", "Aulas podem ser remarcadas até doze horas antes do início."]) {
    const result = cancellationPolicySchema.parse({ cancellationPolicy: `  ${text}  `, cancellationPolicyPublished: true, arenaId: "foreign" });
    assert.equal(result.cancellationPolicy, text);
    assert.equal("arenaId" in result, false);
  }
  assert.equal(cancellationPolicySchema.safeParse({ cancellationPolicy: "x".repeat(12001), cancellationPolicyPublished: false }).success, false);
});
