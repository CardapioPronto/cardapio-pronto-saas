/** Converte markdown simples (títulos #/## e parágrafos) em blocos para exibição. */
export function formatReferralTermsBlocks(content: string): Array<{ type: "h1" | "h2" | "p"; text: string }> {
  const blocks: Array<{ type: "h1" | "h2" | "p"; text: string }> = [];
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  let paragraph: string[] = [];

  const flushParagraph = () => {
    const text = paragraph.join(" ").trim();
    if (text) blocks.push({ type: "p", text });
    paragraph = [];
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flushParagraph();
      continue;
    }
    if (line.startsWith("## ")) {
      flushParagraph();
      blocks.push({ type: "h2", text: line.slice(3).trim() });
      continue;
    }
    if (line.startsWith("# ")) {
      flushParagraph();
      blocks.push({ type: "h1", text: line.slice(2).trim() });
      continue;
    }
    paragraph.push(line.replace(/^\*\*|\*\*$/g, "").replace(/\*\*/g, ""));
  }

  flushParagraph();
  return blocks;
}
