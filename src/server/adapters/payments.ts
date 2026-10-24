import "server-only";
import { env } from "../env";

/**
 * Abstração de provedor de pagamento. Permite trocar o provedor sem reescrever
 * o restante do produto.
 *
 * Estado atual (piloto): apenas o provedor "offline" existe. Ele NÃO processa
 * pagamentos: só registra que o cliente declarou ter pago diretamente ao
 * profissional. Nenhuma cobrança real acontece pela plataforma.
 *
 * Candidatos avaliados para a fase integrada: Asaas (subcontas + split),
 * Mercado Pago (OAuth + marketplace_fee) e Pagar.me. Ver docs/BUSINESS.md.
 */
export type PaymentProviderName = "offline";

export interface PaymentProvider {
  readonly name: PaymentProviderName;
  /** true quando o provedor movimenta dinheiro de fato. */
  readonly processesFunds: boolean;
  /** Status inicial do registro de pagamento quando o cliente confirma o serviço. */
  initialStatusOnConfirmation(declaredPaid: boolean): "declared_offline" | "pending";
}

const offline: PaymentProvider = {
  name: "offline",
  processesFunds: false,
  initialStatusOnConfirmation: (declaredPaid) => (declaredPaid ? "declared_offline" : "pending"),
};

export function paymentProvider(): PaymentProvider {
  switch (env().PAYMENT_PROVIDER) {
    case "offline":
      return offline;
  }
}
