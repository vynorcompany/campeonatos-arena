import { z } from "zod";

// Plain text only: policy contents are rendered as React text, never HTML.
export const cancellationPolicySchema = z.object({
  cancellationPolicy: z.string().trim().max(12000, "A política deve ter até 12.000 caracteres."),
  cancellationPolicyPublished: z.boolean(),
}).superRefine((value, context) => {
  if (value.cancellationPolicyPublished && value.cancellationPolicy.length < 30) {
    context.addIssue({ code: "custom", path: ["cancellationPolicy"], message: "Escreva as condições antes de publicar (mínimo de 30 caracteres)." });
  }
});
