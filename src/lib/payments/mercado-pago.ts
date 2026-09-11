import { env } from "@/lib/env";
import { decryptConnectionSecrets } from "@/lib/payments/connection-secrets";
import { withArenaTransaction } from "@/lib/rls";

type CreatePixPaymentInput = {
  arenaId: string;
  amountCents: number;
  description: string;
  payerEmail: string;
  externalReference: string;
};

type CreateCardCheckoutInput = {
  arenaId: string;
  amountCents: number;
  description: string;
  payerEmail: string;
  externalReference: string;
};

type CreateBoletoPaymentInput = CreatePixPaymentInput & { payerCpf: string; payerName: string; expiresAt?: Date };

async function mercadoPagoAccessTokenForArena(arenaId: string) {
  const connection = await withArenaTransaction(arenaId, (tx) =>
    tx.paymentConnection.findUnique({
      where: { arenaId_provider: { arenaId, provider: "MERCADO_PAGO" } },
      select: { status: true, encryptedSecrets: true }
    })
  );

  if (connection?.status !== "CONNECTED" || !connection.encryptedSecrets) {
    throw new Error("A arena não possui uma conta do Mercado Pago conectada para receber pagamentos.");
  }

  const accessToken = decryptConnectionSecrets(connection.encryptedSecrets).accessToken?.trim();
  if (!accessToken) throw new Error("A conexão do Mercado Pago da arena não possui um token de recebimento válido.");
  return accessToken;
}

type CreatePixPaymentResult = {
  provider: "MERCADO_PAGO" | "PIX_MOCK";
  reference: string;
  paymentId: string;
  qrCode: string;
  qrCodeBase64: string;
  checkoutUrl: string;
  expiresAt: Date | null;
};

export async function createPixPayment(input: CreatePixPaymentInput): Promise<CreatePixPaymentResult> {
  const accessToken = await mercadoPagoAccessTokenForArena(input.arenaId);

  const dateOfExpiration = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  const response = await fetch("https://api.mercadopago.com/v1/payments", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": `reg_${input.externalReference}`
    },
    body: JSON.stringify({
      transaction_amount: Number((input.amountCents / 100).toFixed(2)),
      description: input.description,
      payment_method_id: "pix",
      date_of_expiration: dateOfExpiration,
      external_reference: input.externalReference,
      payer: {
        email: input.payerEmail
      }
    })
  });

  if (!response.ok) {
    const payload = await response.text();
    throw new Error(`Falha ao criar cobrança PIX no Mercado Pago: ${payload}`);
  }

  const payload = await response.json();
  return {
    provider: "MERCADO_PAGO",
    reference: String(payload.id ?? input.externalReference),
    paymentId: String(payload.id ?? ""),
    qrCode: String(payload.point_of_interaction?.transaction_data?.qr_code ?? ""),
    qrCodeBase64: String(payload.point_of_interaction?.transaction_data?.qr_code_base64 ?? ""),
    checkoutUrl: String(payload.point_of_interaction?.transaction_data?.ticket_url ?? ""),
    expiresAt: payload.date_of_expiration ? new Date(payload.date_of_expiration) : null
  };
}

export async function createCardCheckout(input: CreateCardCheckoutInput): Promise<CreatePixPaymentResult> {
  const accessToken = await mercadoPagoAccessTokenForArena(input.arenaId);

  const baseUrl = env.appUrl ?? "http://localhost:3000";
  const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": `card_${input.externalReference}`
    },
    body: JSON.stringify({
      external_reference: input.externalReference,
      payer: {
        email: input.payerEmail
      },
      items: [
        {
          title: input.description,
          quantity: 1,
          currency_id: "BRL",
          unit_price: Number((input.amountCents / 100).toFixed(2))
        }
      ],
      payment_methods: {
        excluded_payment_types: [{ id: "ticket" }, { id: "atm" }],
        installments: 12
      },
      back_urls: {
        success: `${baseUrl}/inscricao/status`,
        pending: `${baseUrl}/inscricao/status`,
        failure: `${baseUrl}/inscricao/status`
      },
      auto_return: "approved"
    })
  });

  if (!response.ok) {
    const payload = await response.text();
    throw new Error(`Falha ao criar checkout de cartao no Mercado Pago: ${payload}`);
  }

  const payload = await response.json();
  return {
    provider: "MERCADO_PAGO",
    reference: String(payload.id ?? input.externalReference),
    paymentId: String(payload.id ?? ""),
    qrCode: "",
    qrCodeBase64: "",
    checkoutUrl: String(payload.init_point ?? ""),
    expiresAt: null
  };
}

export async function createBoletoPayment(input: CreateBoletoPaymentInput): Promise<CreatePixPaymentResult> {
  const accessToken = await mercadoPagoAccessTokenForArena(input.arenaId);
  const response = await fetch("https://api.mercadopago.com/v1/payments", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", "X-Idempotency-Key": `boleto_${input.externalReference}` },
    body: JSON.stringify({
      transaction_amount: Number((input.amountCents / 100).toFixed(2)), description: input.description, payment_method_id: "bolbradesco",
      date_of_expiration: (input.expiresAt ?? new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)).toISOString(), external_reference: input.externalReference,
      payer: { email: input.payerEmail, first_name: input.payerName.split(" ")[0], last_name: input.payerName.split(" ").slice(1).join(" "), identification: { type: "CPF", number: input.payerCpf } }
    })
  });
  if (!response.ok) throw new Error(`Falha ao gerar boleto no Mercado Pago: ${await response.text()}`);
  const payload = await response.json();
  return { provider: "MERCADO_PAGO", reference: String(payload.id ?? input.externalReference), paymentId: String(payload.id ?? ""), qrCode: String(payload.barcode?.content ?? ""), qrCodeBase64: "", checkoutUrl: String(payload.transaction_details?.external_resource_url ?? ""), expiresAt: payload.date_of_expiration ? new Date(payload.date_of_expiration) : null };
}

export async function getMercadoPagoPayment(arenaId: string, paymentId: string) {
  const accessToken = await mercadoPagoAccessTokenForArena(arenaId);

  const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    },
    cache: "no-store"
  });

  if (!response.ok) {
    const payload = await response.text();
    throw new Error(`Falha ao consultar pagamento no Mercado Pago: ${payload}`);
  }

  return response.json();
}
