import { env } from "@/lib/env";

type CreatePixPaymentInput = {
  amountCents: number;
  description: string;
  payerEmail: string;
  externalReference: string;
};

type CreateCardCheckoutInput = {
  amountCents: number;
  description: string;
  payerEmail: string;
  externalReference: string;
};

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
  if (!env.mercadoPagoAccessToken) {
    return {
      provider: "PIX_MOCK",
      reference: `mock_${input.externalReference}`,
      paymentId: "",
      qrCode: `PIX-MOCK-${input.externalReference}`,
      qrCodeBase64: "",
      checkoutUrl: "",
      expiresAt: null
    };
  }

  const dateOfExpiration = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  const response = await fetch("https://api.mercadopago.com/v1/payments", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.mercadoPagoAccessToken}`,
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
  if (!env.mercadoPagoAccessToken) {
    return {
      provider: "PIX_MOCK",
      reference: `mock_${input.externalReference}`,
      paymentId: "",
      qrCode: "",
      qrCodeBase64: "",
      checkoutUrl: "",
      expiresAt: null
    };
  }

  const baseUrl = env.appUrl ?? "http://localhost:3000";
  const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.mercadoPagoAccessToken}`,
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

export async function getMercadoPagoPayment(paymentId: string) {
  if (!env.mercadoPagoAccessToken) {
    throw new Error("MERCADO_PAGO_ACCESS_TOKEN não configurado.");
  }

  const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: {
      Authorization: `Bearer ${env.mercadoPagoAccessToken}`
    },
    cache: "no-store"
  });

  if (!response.ok) {
    const payload = await response.text();
    throw new Error(`Falha ao consultar pagamento no Mercado Pago: ${payload}`);
  }

  return response.json();
}
