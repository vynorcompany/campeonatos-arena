import { createHash } from "node:crypto";

export type NfeXmlItem = {
  code: string;
  barcode: string;
  description: string;
  ncm: string;
  cfop: string;
  unit: string;
  quantity: number;
  unitCostCents: number;
  totalCents: number;
};

export type ParsedNfeXml = {
  accessKey: string;
  number: string;
  series: string;
  supplierName: string;
  supplierDocument: string;
  issuedAt: Date | null;
  totalCents: number;
  digest: string;
  items: NfeXmlItem[];
};

const MAX_XML_SIZE = 5 * 1024 * 1024;
const tagName = (name: string) => `(?:[A-Za-z0-9_-]+:)?${name}`;

function decodeXml(value: string) {
  return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").trim();
}

function valueOf(xml: string, name: string) {
  const match = xml.match(new RegExp(`<${tagName(name)}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tagName(name)}>`));
  return match ? decodeXml(match[1]) : "";
}

function blockOf(xml: string, name: string) {
  const match = xml.match(new RegExp(`<${tagName(name)}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tagName(name)}>`));
  return match?.[1] ?? "";
}

function cents(value: string) {
  const amount = Number(value.replace(",", "."));
  if (!Number.isFinite(amount) || amount < 0) throw new Error("O XML possui um valor de produto inválido.");
  return Math.round(amount * 100);
}

function quantity(value: string) {
  const amount = Number(value.replace(",", "."));
  if (!Number.isFinite(amount) || amount <= 0 || !Number.isInteger(amount)) throw new Error("O estoque atual aceita apenas quantidades inteiras. Ajuste itens fracionados manualmente.");
  return amount;
}

function parseDate(value: string) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function parseNfeXml(xml: string): ParsedNfeXml {
  if (!xml.trim()) throw new Error("Envie um arquivo XML de NF-e válido.");
  if (Buffer.byteLength(xml, "utf8") > MAX_XML_SIZE) throw new Error("O XML excede o limite de 5 MB.");
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error("O XML contém uma estrutura não permitida.");

  const infNfe = xml.match(new RegExp(`<${tagName("infNFe")}\\b[^>]*\\bId=["']([^"']+)["'][^>]*>`));
  const accessKey = valueOf(xml, "chNFe") || (infNfe?.[1] ?? "").replace(/^NFe/i, "");
  if (!/^\d{44}$/.test(accessKey)) throw new Error("Não foi possível identificar a chave de acesso de 44 dígitos da NF-e.");

  const ide = blockOf(xml, "ide");
  const emitter = blockOf(xml, "emit");
  const total = blockOf(xml, "ICMSTot");
  const details = Array.from(xml.matchAll(new RegExp(`<${tagName("det")}\\b[^>]*>([\\s\\S]*?)<\\/${tagName("det")}>`, "g")));
  if (!details.length) throw new Error("A NF-e não possui itens de produto para importar.");

  const items = details.map((detail) => {
    const product = blockOf(detail[1], "prod");
    const description = valueOf(product, "xProd");
    if (!description) throw new Error("Um item da NF-e não possui descrição.");
    return {
      code: valueOf(product, "cProd"),
      barcode: valueOf(product, "cEAN") === "SEM GTIN" ? "" : valueOf(product, "cEAN"),
      description,
      ncm: valueOf(product, "NCM"),
      cfop: valueOf(product, "CFOP"),
      unit: valueOf(product, "uCom"),
      quantity: quantity(valueOf(product, "qCom")),
      unitCostCents: cents(valueOf(product, "vUnCom")),
      totalCents: cents(valueOf(product, "vProd")),
    };
  });

  return {
    accessKey,
    number: valueOf(ide, "nNF"),
    series: valueOf(ide, "serie"),
    supplierName: valueOf(emitter, "xNome"),
    supplierDocument: valueOf(emitter, "CNPJ") || valueOf(emitter, "CPF"),
    issuedAt: parseDate(valueOf(ide, "dhEmi") || valueOf(ide, "dEmi")),
    totalCents: cents(valueOf(total, "vNF")),
    digest: createHash("sha256").update(xml).digest("hex"),
    items,
  };
}
