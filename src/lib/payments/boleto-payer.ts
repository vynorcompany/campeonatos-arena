export type BoletoPayerAddress = { addressZipCode: string; addressStreet: string; addressNumber: string; addressNeighborhood: string; addressCity: string; addressState: string };

export function getMissingBoletoPayerFields(payer: Partial<BoletoPayerAddress> & { email?: string; cpf?: string }) {
  return [
    !payer.email ? "e-mail" : "",
    !/^\d{11}$/.test(payer.cpf ?? "") ? "CPF com 11 dígitos" : "",
    !/^\d{8}$/.test((payer.addressZipCode ?? "").replace(/\D/g, "")) ? "CEP" : "",
    !payer.addressStreet?.trim() ? "rua" : "",
    !payer.addressNumber?.trim() ? "número" : "",
    !payer.addressNeighborhood?.trim() ? "bairro" : "",
    !payer.addressCity?.trim() ? "cidade" : "",
    !/^[A-Za-z]{2}$/.test(payer.addressState?.trim() ?? "") ? "UF" : ""
  ].filter(Boolean);
}
