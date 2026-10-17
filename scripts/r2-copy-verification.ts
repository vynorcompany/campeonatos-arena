export async function verifyPublicCopy(url: string, source: Buffer, request: typeof fetch = fetch) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await request(url, { signal: AbortSignal.timeout(10_000), cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      if (source.equals(Buffer.from(await response.arrayBuffer()))) return;
      throw new Error("O conteúdo público difere do arquivo original.");
    } catch (error) {
      if (attempt === 3) throw new Error(`O arquivo migrado não passou na validação pública: ${url}`, { cause: error });
      await new Promise((resolve) => setTimeout(resolve, attempt * 500));
    }
  }
}
