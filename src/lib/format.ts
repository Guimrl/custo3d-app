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

/**
 * Datas "só dia" (compra, orçamento, venda) chegam da API como meia-noite UTC
 * ("2026-11-02T00:00:00.000Z"). Exibidas no horário de Brasília virariam o dia
 * anterior (01/11 às 21h), então essas são lidas em UTC. Datas com hora
 * (createdAt, "Vendi" de outro cliente) seguem o horário local.
 */
const isDayOnly = (value: string) => /^\d{4}-\d{2}-\d{2}(T00:00:00(\.000)?Z)?$/.test(value);

const pad = (value: number) => String(value).padStart(2, "0");

/** ISO → "13/11/2026" */
export const date = (value?: string | null) => {
  if (!value) {
    return "—";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "—";
  }

  return parsed.toLocaleDateString("pt-BR", isDayOnly(value) ? { timeZone: "UTC" } : undefined);
};

/** ISO → "2026-11-13", o formato do input date (vazio → ""). */
export const toInputDate = (value?: string | null) => {
  if (!value) {
    return "";
  }

  if (isDayOnly(value)) {
    return value.slice(0, 10);
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}`;
};

/** Horas decimais → "1h30" */
export const hours = (value: unknown) => {
  const totalMinutes = Math.round(Number(value || 0) * 60);

  return `${Math.floor(totalMinutes / 60)}h${String(totalMinutes % 60).padStart(2, "0")}`;
};

/**
 * Data de hoje no formato do input date (AAAA-MM-DD), no horário local.
 * (toISOString daria a data em UTC: depois das 21h, já seria amanhã.)
 */
export const today = () => toInputDate(new Date().toISOString());
