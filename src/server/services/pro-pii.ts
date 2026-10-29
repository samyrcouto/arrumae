import "server-only";
import type { proProfiles } from "../db/schema";
import { blindIndex, decryptField, encryptField } from "../security/field-crypto";

/** Contextos da criptografia (dado autenticado): um valor não pode trocar de coluna. */
export const CPF_CONTEXT = "pro_profiles.cpf";
export const CNPJ_CONTEXT = "pro_profiles.cnpj";

type ProRow = typeof proProfiles.$inferSelect;

/** Colunas a gravar para um CPF/CNPJ informado (só dígitos; vazio = remover). */
export function sealProDocuments(cpf: string, cnpj: string) {
  return {
    cpf: cpf ? encryptField(cpf, CPF_CONTEXT) : null,
    cpfHash: cpf ? blindIndex(cpf, CPF_CONTEXT) : null,
    cnpj: cnpj ? encryptField(cnpj, CNPJ_CONTEXT) : null,
  };
}

/** Perfil com CPF/CNPJ decifrados, sem o índice cego (que não interessa a ninguém fora do banco). */
export function openProProfile<T extends Pick<ProRow, "cpf" | "cnpj" | "cpfHash">>(row: T): Omit<T, "cpfHash"> {
  const { cpfHash: _hash, ...rest } = row;
  void _hash;
  return { ...rest, cpf: decryptField(row.cpf, CPF_CONTEXT), cnpj: decryptField(row.cnpj, CNPJ_CONTEXT) };
}
