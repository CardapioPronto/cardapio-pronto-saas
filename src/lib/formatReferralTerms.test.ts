import { describe, expect, it } from "vitest";
import { formatReferralTermsBlocks } from "./formatReferralTerms";

describe("formatReferralTermsBlocks", () => {
  it("parseia títulos e parágrafos", () => {
    const blocks = formatReferralTermsBlocks(
      "# Título\n\nParágrafo um.\n\n## Seção\n\nParágrafo dois.",
    );
    expect(blocks).toEqual([
      { type: "h1", text: "Título" },
      { type: "p", text: "Parágrafo um." },
      { type: "h2", text: "Seção" },
      { type: "p", text: "Parágrafo dois." },
    ]);
  });
});
