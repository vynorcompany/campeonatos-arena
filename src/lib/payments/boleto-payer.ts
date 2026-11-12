export type BoletoPayerAddress = { addressZipCode: string; addressStreet: string; addressNumber: string; addressNeighborhood: string; addressCity: string; addressState: string };

export type BoletoPayerIdentity = {personType?:string;email?:string;cpf?:string;cnpj?:string};
export function boletoPayerDocument(payer:BoletoPayerIdentity) {return (payer.personType==="PJ"?payer.cnpj:payer.cpf)?.replace(/[.\/\-\s]/g,"").toUpperCase()??"";}
export function getMissingBoletoPayerFields(payer: Partial<BoletoPayerAddress> & BoletoPayerIdentity) {
  return [
    !payer.email ? "e-mail" : "",
    payer.personType==="PJ" && /[A-Z]/.test(boletoPayerDocument(payer)) ? "emissor de boletos compatível com CNPJ alfanumérico (a integração atual aceita CNPJ numérico)" : "",
    !(payer.personType==="PJ"?/^[A-Z0-9]{12}\d{2}$/:/^\d{11}$/).test(boletoPayerDocument(payer)) ? payer.personType==="PJ"?"CNPJ com 14 posições":"CPF com 11 dígitos" : "",
    !/^\d{8}$/.test((payer.addressZipCode ?? "").replace(/\D/g, "")) ? "CEP" : "",
    !payer.addressStreet?.trim() ? "rua" : "",
    !payer.addressNumber?.trim() ? "número" : "",
    !payer.addressNeighborhood?.trim() ? "bairro" : "",
    !payer.addressCity?.trim() ? "cidade" : "",
    !/^[A-Za-z]{2}$/.test(payer.addressState?.trim() ?? "") ? "UF" : ""
  ].filter(Boolean);
}
