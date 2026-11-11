import { parsePayslipText } from "./payslip-import";
export async function readPayslipFile(file: File) {
  if (!file.size || file.size > 5 * 1024 * 1024) throw new Error("Envie um holerite PDF ou TXT de até 5 MB.");
  const bytes = Buffer.from(await file.arrayBuffer());
  let text: string;
  if (bytes.subarray(0, 5).toString() === "%PDF-") {
    const { PDFParse } = await import("pdf-parse");
    const { getData } = await import("pdf-parse/worker");
    PDFParse.setWorker(getData());
    const parser = new PDFParse({ data: bytes, isEvalSupported: false, useSystemFonts: false });
    try {
      const info = await parser.getInfo();
      if (info.total > 5) throw new Error("Importe um holerite por vez, com até 5 páginas.");
      text = (await parser.getText()).text;
    } finally { await parser.destroy(); }
  } else if (/\.txt$/i.test(file.name) && !bytes.includes(0)) text = bytes.toString("utf8");
  else throw new Error("Formato inválido. Envie PDF com texto selecionável ou TXT.");
  return parsePayslipText(text);
}
