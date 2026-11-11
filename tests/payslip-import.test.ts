import assert from "node:assert/strict";
import test from "node:test";
import { parsePayslipText } from "../src/lib/finance/payslip-import";
import { readPayslipFile } from "../src/lib/finance/payslip-file";
import { calculateEmployeePayroll } from "../src/lib/finance/employee-payroll";
const slip = "Nome: Funcionario Exemplo\nCompetencia: 11/2026\nSalario Base 2.000,00\nTotal de Proventos 2.450,00\nTotal de Descontos 350,00\nValor Liquido 2.100,00";
test("holerite preenche proventos e descontos sem recalcular ou duplicar adicionais já pagos", () => {
  const draft = parsePayslipText(slip);
  assert.equal(draft.employeeName, "Funcionario Exemplo"); assert.equal(draft.referenceMonth, "2026-11");
  assert.equal(draft.amounts.fixedSalaryCents, 200000); assert.equal(draft.amounts.bonusCents, 45000);
  assert.equal(draft.amounts.nightMinutes, 0); assert.equal(draft.amounts.overtimeMinutes, 0);
  assert.equal(calculateEmployeePayroll(draft.amounts).totalCents, draft.netCents); assert.equal(draft.netCents, 210000);
});
test("resumo em colunas e competência por extenso preservam o valor líquido", () => {
  const draft = parsePayslipText("Novembro/2026\nTotal de Vencimentos Total de Descontos Liquido a Receber\n3.000,00 400,00 2.600,00");
  assert.equal(draft.netCents, 260000); assert.equal(draft.referenceMonth, "2026-11");
  assert.equal(draft.amounts.fixedSalaryCents, 0); assert.equal(calculateEmployeePayroll(draft.amounts).totalCents, 260000);
  assert.ok(draft.warnings.some(warning => warning.includes("Salário base não identificado")));
});
test("totais divergentes, PDF sem texto e múltiplos holerites são recusados", () => {
  assert.throws(() => parsePayslipText(slip.replace("2.100,00", "2.200,00")), /não conferem/);
  assert.throws(() => parsePayslipText(""), /sem texto/);
  assert.throws(() => parsePayslipText(slip+"\nTotal de Proventos 4.000,00"), /divergentes/);
});
function pdf(text: string) {
  const content = "BT /F1 12 Tf 40 750 Td " + text.split("\n").map((line,i) => `${i ? "0 -22 Td " : ""}(${line.replace(/[()\\]/g,"\\$&")}) Tj`).join("\n") + " ET";
  const objects = ["<< /Type /Catalog /Pages 2 0 R >>", "<< /Type /Pages /Kids [3 0 R] /Count 1 >>", "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>", "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>", `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`];
  let output = "%PDF-1.4\n"; const offsets=[0];
  objects.forEach((o,i)=>{offsets.push(Buffer.byteLength(output));output+=`${i+1} 0 obj\n${o}\nendobj\n`;});
  const start=Buffer.byteLength(output); output+=`xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(n=>String(n).padStart(10,"0")+" 00000 n \n").join("")}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${start}\n%%EOF`;
  return output;
}
test("importa um PDF real e um TXT sem dependência de serviço externo", async () => {
  for (const file of [new File([pdf(slip)], "holerite.pdf", {type:"application/pdf"}),new File([slip],"holerite.txt",{type:"text/plain"})]) {
    const result=await readPayslipFile(file); assert.equal(result.netCents,210000);assert.equal(result.amounts.fixedSalaryCents,200000);
  }
  await assert.rejects(readPayslipFile(new File(["not a PDF"], "holerite.pdf")),/Formato/);
  await assert.rejects(readPayslipFile(new File([new Uint8Array(5*1024*1024+1)], "grande.txt")),/5 MB/);
});

test("um arquivo com funcionários diferentes não é tratado como uma folha única", () => {
  assert.throws(() => parsePayslipText(slip + "\nNome: Outro Funcionario"), /mais de um funcionário/);
});
