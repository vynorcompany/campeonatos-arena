import { fiscalProfileIssues, fiscalProfilePending, readProductFiscalProfile, type FiscalIssuer } from "./product-profile";
import { findNcm } from "./ncm-catalog";

export class FocusFiscalValidationError extends Error { readonly fiscalValidation = true; }

export function validFiscalCnpj(value: string) {
  if (!/^\d{14}$/.test(value) || /^(\d)\1+$/.test(value)) return false;
  for (let size = 12; size <= 13; size++) {
    let sum = 0, weight = size - 7;
    for (const digit of value.slice(0, size)) { sum += Number(digit) * weight--; if (weight === 1) weight = 9; }
    const remainder = sum % 11;
    if (Number(value[size]) !== (remainder < 2 ? 0 : 11 - remainder)) return false;
  }
  return true;
}
export function validFiscalCpf(value: string) {
  if (!/^\d{11}$/.test(value) || /^(\d)\1+$/.test(value)) return false;
  for (let size=9;size<=10;size++) {
    const sum = [...value.slice(0,size)].reduce((total,digit,index)=>total+Number(digit)*(size+1-index),0);
    const check = (sum*10)%11;
    if (Number(value[size]) !== (check===10?0:check)) return false;
  }
  return true;
}
const money = (cents: number) => (cents / 100).toFixed(2);
export type FocusSale = { customerDocument?: string; customerName?: string; totalCents: number; items: { productId: string; quantity: number; unitPriceCents: number; totalCents: number; fiscalProfile: unknown; product: { name: string; isService: boolean } }[]; payments: { paymentMethod: string; amountCents: number }[] };
export function focusPayment(method: string) {
  const normalized = method.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  const codes: Record<string, string> = { dinheiro: "01", cash: "01", cheque: "02", credito: "03", credit_card: "03", "cartao de credito": "03", debito: "04", debit_card: "04", "cartao de debito": "04", boleto: "15", "boleto bancario": "15", "pix estatico": "20", "pix chave": "20", "pix (estatico)": "20", "saldo do cliente": "21", "transferencia bancaria": "18", transferencia: "18" };
  if (normalized.includes("pix") && !codes[normalized]) throw new FocusFiscalValidationError("Pix: selecione uma forma identificada como Pix estático ou Pix chave, quando corresponder ao recebimento. Pix dinâmico exige integração com o identificador da transação antes de emitir.");
  if (!codes[normalized]) throw new FocusFiscalValidationError(`Forma de pagamento sem código fiscal: ${method}. Revise a forma antes de emitir.`);
  return codes[normalized];
}
/** Initial adapter deliberately refuses tax groups not represented completely by the stock profile. */
export function buildFocusNfce(sale: FocusSale, issuer: FiscalIssuer & { focusCnpj: string }, environment: string, now = new Date()) {
  if (!validFiscalCnpj(issuer.focusCnpj)) throw new FocusFiscalValidationError("Configure um CNPJ válido na integração fiscal.");
  if (!["1", "4"].includes(issuer.crt ?? "")) throw new FocusFiscalValidationError("Esta integração NFC-e requer Simples Nacional ou MEI. O regime informado exige revisão do adaptador fiscal.");
  if (Number(new Intl.DateTimeFormat("en", {year:"numeric",timeZone:"America/Sao_Paulo"}).format(now)) >= 2027) throw new FocusFiscalValidationError("Revise o tratamento IBS/CBS do Simples para 2027 antes de emitir.");
  if (!sale.items.length || sale.totalCents <= 0) throw new FocusFiscalValidationError("A NFC-e precisa de mercadorias com valor maior que zero.");
  if (/[A-Za-z]/.test(sale.customerDocument ?? "")) throw new FocusFiscalValidationError("Este fluxo atende CPF e CNPJ numéricos do consumidor. Documento alfanumérico exige atualização específica.");
  const customerDocument = (sale.customerDocument ?? "").replace(/\D/g, "");
  if (sale.totalCents >= 1000000) throw new FocusFiscalValidationError("Operações a partir de R$ 10.000 exigem o fluxo com identificação e endereço completos do destinatário, ainda não disponível nesta emissão simplificada.");
  if (customerDocument && !validFiscalCpf(customerDocument) && !validFiscalCnpj(customerDocument)) throw new FocusFiscalValidationError("Informe um CPF ou CNPJ válido para identificar o consumidor na nota.");
  if (customerDocument && !sale.customerName?.trim()) throw new FocusFiscalValidationError("Informe o nome do consumidor para identificá-lo na nota.");
  const items = sale.items.map((item, index) => {
    if (item.product.isService) throw new FocusFiscalValidationError(`${item.product.name}: serviço não pode ser emitido como mercadoria nesta NFC-e. Separe os serviços da comanda fiscal.`);
    const profile = readProductFiscalProfile(item.fiscalProfile);
    const problems = [...fiscalProfileIssues(profile, issuer), ...fiscalProfilePending(profile, issuer)];
    if (!findNcm(profile.ncm)) problems.push("NCM sem vigência confirmada");
    if (problems.length) throw new FocusFiscalValidationError(`${item.product.name}: ${problems.join("; ")}.`);
    if (!["102", "103", "300", "400", "500"].includes(profile.icmsCode) || [profile.icmsRate, profile.icmsReduction, profile.fcpRate].some(v => Number(v) > 0)) throw new FocusFiscalValidationError(`${item.product.name}: tributação de ICMS exige campos adicionais antes da emissão pela Focus.`);
    if (profile.ibsCbsCst || profile.cClassTrib || [profile.ibsUfRate,profile.ibsMunicipalRate,profile.cbsRate].some(v=>v!=="")) throw new FocusFiscalValidationError(`${item.product.name}: confira o grupo IBS/CBS com a contabilidade; esse grupo não está habilitado neste adaptador do Simples.`);
    if (profile.benefitCode) throw new FocusFiscalValidationError(`${item.product.name}: o benefício fiscal exige revisão específica antes de emitir.`);
    for (const [name,cst,rate,unitRate] of [["PIS",profile.pisCst,profile.pisRate,profile.pisUnitRate],["Cofins",profile.cofinsCst,profile.cofinsRate,profile.cofinsUnitRate]]) {
      if (!["04","05","06","07","08","09","49","99"].includes(cst) || Number(rate)>0 || Number(unitRate)>0 || (["49","99"].includes(cst) && (rate === "" || Number(rate)!==0))) throw new FocusFiscalValidationError(`${item.product.name}: informe ${name} compatível com saída sem destaque; em outras saídas/operações informe alíquota zero explicitamente ou revise a tributação.`);
    }
    if (!Number.isInteger(item.quantity) || item.quantity <= 0 || item.unitPriceCents * item.quantity !== item.totalCents) throw new FocusFiscalValidationError(`${item.product.name}: quantidade ou total divergente.`);
    const quantity = item.quantity * Number(profile.tributaryFactor);
    if (quantity < 0.0001 || !Number.isFinite(quantity)) throw new FocusFiscalValidationError(`${item.product.name}: quantidade tributável abaixo da precisão fiscal.`);
    return {
      numero_item: String(index+1), codigo_produto: item.productId,
      descricao: environment === "SANDBOX" && index === 0 ? "NOTA FISCAL EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL" : item.product.name,
      codigo_ncm: profile.ncm, ...(profile.cest?{cest:profile.cest}:{}), cfop: profile.cfop,
      unidade_comercial: profile.commercialUnit, unidade_tributavel: profile.tributaryUnit,
      quantidade_comercial: String(item.quantity), quantidade_tributavel: quantity.toFixed(4),
      valor_unitario_comercial: money(item.unitPriceCents), valor_unitario_tributavel: (item.totalCents/100/quantity).toFixed(10), valor_bruto: money(item.totalCents),
      codigo_barras_comercial: profile.gtin, codigo_barras_tributavel: profile.gtinTrib,
      icms_origem: profile.origin, icms_situacao_tributaria: profile.icmsCode,
      pis_situacao_tributaria: profile.pisCst, cofins_situacao_tributaria: profile.cofinsCst,
      ...(["49","99"].includes(profile.pisCst)?{pis_base_calculo:money(item.totalCents),pis_aliquota_porcentual:"0.00",pis_valor:"0.00"}:{}),
      ...(["49","99"].includes(profile.cofinsCst)?{cofins_base_calculo:money(item.totalCents),cofins_aliquota_porcentual:"0.00",cofins_valor:"0.00"}:{}),
      ...(profile.additionalInfo?{informacoes_adicionais_item:profile.additionalInfo}:{}),
    };
  });
  if (sale.items.reduce((total,item)=>total+item.totalCents,0)!==sale.totalCents) throw new FocusFiscalValidationError("Total fiscal difere dos itens da venda.");
  const paid = sale.payments.reduce((total,payment)=>total+payment.amountCents,0);
  if (paid!==sale.totalCents || sale.payments.some(p=>!Number.isInteger(p.amountCents)||p.amountCents<=0)) throw new FocusFiscalValidationError("Para emitir por este fluxo, quite integralmente apenas os itens da comanda. Débitos anteriores não entram na nota.");
  return { ...(customerDocument ? { nome_destinatario: environment === "SANDBOX" ? "NF-E EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL" : sale.customerName, ...(customerDocument.length===11?{cpf_destinatario:customerDocument}:{cnpj_destinatario:customerDocument}) } : {}), cnpj_emitente: issuer.focusCnpj, data_emissao: now.toISOString(), natureza_operacao:"VENDA AO CONSUMIDOR", indicador_inscricao_estadual_destinatario:"9", modalidade_frete:"9", local_destino:"1", presenca_comprador:"1", items,
    formas_pagamento: sale.payments.map(payment=>({forma_pagamento:focusPayment(payment.paymentMethod),valor_pagamento:money(payment.amountCents), ...(["03","04"].includes(focusPayment(payment.paymentMethod))?{tipo_integracao:"2"}:{})})) };
}
