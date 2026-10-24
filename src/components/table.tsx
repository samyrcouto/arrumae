import type { ReactNode } from "react";

/** Tabela responsiva: rola horizontalmente dentro do cartão no celular, sem quebrar a página. */
export function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-card border border-line bg-card">
      <table className="w-full min-w-[40rem] text-left text-[0.95rem]">
        <thead className="border-b border-line bg-paper text-sm text-ink-soft">
          <tr>{head.map((h) => <th key={h} className="px-4 py-2.5 font-semibold">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
    </div>
  );
}

export const Td = ({ children, className }: { children?: ReactNode; className?: string }) => (
  <td className={`px-4 py-2.5 align-top ${className ?? ""}`}>{children}</td>
);
