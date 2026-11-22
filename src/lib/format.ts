/** Formatação no padrão brasileiro. Valores vazios ou inválidos viram "—". */
const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const isNumber = (value: unknown): boolean =>
  value !== "" &&
  value !== null &&
  value !== undefined &&
  Number.isFinite(Number(value));

/** 12.5 → "R$ 12,50" */
export const money = (value: unknown) =>
  isNumber(value) ? currencyFormatter.format(Number(value)) : "—";

/** 1234.567 → "1.234,57" */
export const decimal = (value: unknown, digits = 2) =>
  isNumber(value)
    ? new Intl.NumberFormat("pt-BR", { maximumFractionDigits: digits }).format(
      Number(value),
    )
    : "—";

/** 37.5 → "37,5%" */
export const percent = (value: unknown) =>
  isNumber(value) ? `${decimal(value)}%` : "—";

/** 850 → "850 g" · 1250 → "1,25 kg" */
export const grams = (value: unknown) =>
  Number(value) >= 1000
    ? `${decimal(Number(value) / 1000)} kg`
    : `${decimal(value, 0)} g`;

/** ISO → "13/11/2026" */
export const date = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString("pt-BR") : "—";

/** Horas decimais → "1h30" */
export const hours = (value: unknown) => {
  const totalMinutes = Math.round(Number(value || 0) * 60);

  return `${Math.floor(totalMinutes / 60)}h${String(totalMinutes % 60).padStart(2, "0")}`;
};

/** Data de hoje no formato do input date (AAAA-MM-DD). */
export const today = () => new Date().toISOString().slice(0, 10);
