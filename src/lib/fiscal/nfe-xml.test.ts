import assert from "node:assert/strict";
import test from "node:test";
import { parseNfeXml } from "./nfe-xml";

const sample = `<?xml version="1.0"?><nfeProc><NFe><infNFe Id="NFe35260912345678000199550010000000011000000010"><ide><nNF>1</nNF><serie>1</serie><dhEmi>2026-09-17T10:00:00-03:00</dhEmi></ide><emit><CNPJ>12345678000199</CNPJ><xNome>Fornecedor Teste</xNome></emit><det nItem="1"><prod><cProd>AGUA-500</cProd><cEAN>7890000000001</cEAN><xProd>Água 500 ml</xProd><NCM>22011000</NCM><CFOP>5102</CFOP><uCom>UN</uCom><qCom>12.0000</qCom><vUnCom>2.50</vUnCom><vProd>30.00</vProd></prod></det><total><ICMSTot><vNF>30.00</vNF></ICMSTot></total></infNFe></NFe><protNFe><infProt><chNFe>35260912345678000199550010000000011000000010</chNFe></infProt></protNFe></nfeProc>`;

test("parses a standard NFe product item", () => {
  const nfe = parseNfeXml(sample);
  assert.equal(nfe.number, "1");
  assert.equal(nfe.supplierName, "Fornecedor Teste");
  assert.equal(nfe.totalCents, 3000);
  assert.deepEqual(nfe.items[0], { code: "AGUA-500", barcode: "7890000000001", description: "Água 500 ml", ncm: "22011000", cfop: "5102", unit: "UN", quantity: 12, unitCostCents: 250, totalCents: 3000 });
});
