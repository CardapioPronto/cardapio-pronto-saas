import { describe, expect, it } from "vitest";
import {
  CUSTOMER_CSV_TEMPLATE,
  isValidEmail,
  normalizeCustomerPhone,
  parseBirthDate,
  parseCustomerCsv,
  parseOptIn,
} from "./customerCsvImport";

describe("normalizeCustomerPhone", () => {
  it("adiciona DDI 55 em numeros locais", () => {
    expect(normalizeCustomerPhone("(11) 98888-7777")).toBe("5511988887777");
    expect(normalizeCustomerPhone("1133334444")).toBe("551133334444");
  });

  it("mantem numeros ja com DDI", () => {
    expect(normalizeCustomerPhone("+55 11 98888-7777")).toBe("5511988887777");
  });

  it("rejeita vazio ou curto demais", () => {
    expect(normalizeCustomerPhone("")).toBeNull();
    expect(normalizeCustomerPhone("123")).toBeNull();
  });
});

describe("parseBirthDate", () => {
  it("aceita dd/mm/aaaa e ISO", () => {
    expect(parseBirthDate("12/03/1990")).toBe("1990-03-12");
    expect(parseBirthDate("1988-07-25")).toBe("1988-07-25");
  });

  it("retorna null quando vazio e invalid quando incorreto", () => {
    expect(parseBirthDate("")).toBeNull();
    expect(parseBirthDate("31/02/1990")).toBe("invalid");
    expect(parseBirthDate("ontem")).toBe("invalid");
  });
});

describe("parseOptIn / isValidEmail", () => {
  it("interpreta variacoes", () => {
    expect(parseOptIn("Sim")).toBe(true);
    expect(parseOptIn("não")).toBe(false);
    expect(parseOptIn("")).toBeNull();
  });

  it("valida email", () => {
    expect(isValidEmail("a@b.com")).toBe(true);
    expect(isValidEmail("a@b")).toBe(false);
  });
});

describe("parseCustomerCsv", () => {
  it("processa o modelo padrao", () => {
    const result = parseCustomerCsv(CUSTOMER_CSV_TEMPLATE);
    expect(result.headerErrors).toEqual([]);
    expect(result.validRows).toHaveLength(2);
    expect(result.validRows[0].tags).toEqual(["vip", "delivery"]);
    expect(result.validRows[0].aceita_marketing).toBe(true);
    expect(result.validRows[1].email).toBeNull();
  });

  it("exige a coluna telefone", () => {
    const result = parseCustomerCsv("nome;email\nMaria;a@b.com");
    expect(result.headerErrors).toHaveLength(1);
    expect(result.rows).toHaveLength(0);
  });

  it("aponta erros linha a linha", () => {
    const result = parseCustomerCsv(
      [
        "nome,telefone,email,data_nascimento",
        "Maria,11988887777,maria@email.com,12/03/1990",
        "Joao,11988887777,joao@email.com,01/01/1990",
        "Ana,123,ana#email,32/13/1990",
      ].join("\n"),
    );

    expect(result.validRows).toHaveLength(1);
    expect(result.invalidRows).toHaveLength(2);
    expect(result.rows[1].erros).toContain("Telefone duplicado dentro do arquivo.");
    expect(result.rows[2].erros).toEqual([
      "Telefone invalido.",
      "E-mail invalido.",
      "Data de nascimento invalida (use dd/mm/aaaa).",
    ]);
  });

  it("marca clientes existentes como atualizacao", () => {
    const result = parseCustomerCsv("telefone\n11988887777\n11977776666", {
      telefonesExistentes: ["5511988887777"],
    });
    expect(result.novos).toBe(1);
    expect(result.atualizacoes).toBe(1);
    expect(result.rows[0].atualizacao).toBe(true);
  });
});
