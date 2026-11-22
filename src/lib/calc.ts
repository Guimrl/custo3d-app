/**
 * Motor de cálculo: mesma conta da custo3d-api (src/services/calc.ts), para o
 * resultado aparecer na hora enquanto o formulário é preenchido. Se a regra
 * mudar na API, copie para cá.
 */
import type {
  BundleResult,
  CostLine,
  CostResult,
  PriceAnalysis,
  PriceTier,
  Settings,
  Spool,
  Supply,
  TierKey,
} from "./types";

const DEFAULT_SETTINGS: Settings = {
  kwhPrice: 0.95,
  failureRatePct: 10,
  laborHourRate: 0,
  platformFeePct: 0,
  minMarginPct: 15,
  lowStockGrams: 150,
  tiers: { barato: 60, ideal: 120, caro: 200 },
};

export const TIER_LABELS: Record<TierKey, string> = {
  barato: "Barato",
  ideal: "Ideal",
  caro: "Caro",
};

/** '' e undefined viram 0 em vez de NaN. */
const toSafeNumber = (value: unknown): number => {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
};

const percentToFraction = (value: unknown): number => toSafeNumber(value) / 100;

export const round2 = (value: unknown): number =>
  Math.round((toSafeNumber(value) + Number.EPSILON) * 100) / 100;

const sum = <T>(list: T[], pick: (item: T) => number): number =>
  list.reduce((total, item) => total + pick(item), 0);

const withDefaults = (settings?: Partial<Settings> | null): Settings => ({
  ...DEFAULT_SETTINGS,
  ...settings,
  tiers: { ...DEFAULT_SETTINGS.tiers, ...settings?.tiers },
});

export const spoolPricePerGram = (
  spool?: Pick<Spool, "pricePaid" | "weightGrams"> | null,
): number => {
  const weight = toSafeNumber(spool?.weightGrams);

  return weight > 0 ? toSafeNumber(spool?.pricePaid) / weight : 0;
};

export const supplyUnitCost = (
  supply?: Pick<Supply, "pricePaid" | "quantityPurchased"> | null,
): number => {
  const quantityPurchased = toSafeNumber(supply?.quantityPurchased);

  return quantityPurchased > 0
    ? toSafeNumber(supply?.pricePaid) / quantityPurchased
    : 0;
};

export type EquipmentCostFields = Partial<
  Record<"price" | "lifespanHours" | "powerWatts", number>
> & {
  maintenancePerHour?: number | null;
};

export interface HourlyCost {
  depreciation: number;
  energyKwh: number;
  maintenance: number;
}

/** Depreciação (preço ÷ vida útil), kWh por hora e manutenção por hora. */
export const equipmentHourlyCost = (
  equipment?: EquipmentCostFields | null,
): HourlyCost => {
  if (!equipment) {
    return { depreciation: 0, energyKwh: 0, maintenance: 0 };
  }

  const lifespan = toSafeNumber(equipment.lifespanHours);

  return {
    depreciation: lifespan > 0 ? toSafeNumber(equipment.price) / lifespan : 0,
    energyKwh: toSafeNumber(equipment.powerWatts) / 1000,
    maintenance: toSafeNumber(equipment.maintenancePerHour),
  };
};

/** Preço para um markup, já compensando a taxa da plataforma. */
export const priceForMarkup = (
  unitCost: number,
  markupPct: number,
  platformFeePct = 0,
): number => {
  const feeFactor = 1 - percentToFraction(platformFeePct);

  if (feeFactor <= 0) {
    return 0;
  }

  return (
    (toSafeNumber(unitCost) * (1 + percentToFraction(markupPct))) / feeFactor
  );
};

/** Lucro, margem, markup, preço de empate e quanto de desconto ainda cabe. */
export const analyzePrice = (
  unitCost: number,
  price: number,
  settings: Partial<Settings> = {},
): PriceAnalysis => {
  const fullSettings = withDefaults(settings);
  const cost = toSafeNumber(unitCost);
  const salePrice = toSafeNumber(price);
  const feeFactor = 1 - percentToFraction(fullSettings.platformFeePct);
  const net = salePrice * feeFactor;
  const profit = net - cost;
  const breakEvenPrice = feeFactor > 0 ? cost / feeFactor : Infinity;
  const minMarginFactor =
    feeFactor - percentToFraction(fullSettings.minMarginPct);
  const minMarginPrice =
    minMarginFactor > 0 ? cost / minMarginFactor : Infinity;

  const discountTo = (target: number) =>
    salePrice > 0 && Number.isFinite(target)
      ? Math.max(0, (1 - target / salePrice) * 100)
      : 0;

  return {
    price: round2(salePrice),
    fee: round2(salePrice - net),
    net: round2(net),
    profit: round2(profit),
    marginPct: round2(salePrice > 0 ? (profit / salePrice) * 100 : 0),
    markupPct: round2(cost > 0 ? (profit / cost) * 100 : 0),
    breakEvenPrice: round2(breakEvenPrice),
    minMarginPrice: round2(minMarginPrice),
    maxDiscountPct: round2(discountTo(breakEvenPrice)),
    maxDiscountKeepingMarginPct: round2(discountTo(minMarginPrice)),
  };
};

/** Faixas Barato / Ideal / Caro a partir do custo por peça. */
export const priceTiers = (
  unitCost: number,
  settings: Partial<Settings> = {},
): PriceTier[] => {
  const fullSettings = withDefaults(settings);

  return (Object.entries(fullSettings.tiers) as [TierKey, number][]).map(
    ([key, markupPct]) => ({
      key,
      label: TIER_LABELS[key] || key,
      targetMarkupPct: toSafeNumber(markupPct),
      ...analyzePrice(
        unitCost,
        priceForMarkup(unitCost, markupPct, fullSettings.platformFeePct),
        fullSettings,
      ),
    }),
  );
};

export interface CostInput {
  settings?: Partial<Settings> | null;
  printer?: EquipmentCostFields | null;
  dryer?: EquipmentCostFields | null;
  printHours?: number | string;
  dryHours?: number | string;
  laborMinutes?: number | string;
  quantity?: number | string;
  filaments?: { grams?: number | string; pricePerGram?: number }[];
  supplies?: { qty?: number | string; unitCost?: number }[];
  extraCost?: number | string;
}

/** Custo de um lote: filamento, materiais, energia, desgaste, mão de obra, extras e falha. */
export const calculateCost = (input: CostInput): CostResult => {
  const settings = withDefaults(input.settings);
  const printHours = toSafeNumber(input.printHours);
  const dryHours = toSafeNumber(input.dryHours);
  const quantity = Math.max(1, Math.floor(toSafeNumber(input.quantity) || 1));
  const printer = equipmentHourlyCost(input.printer);
  const dryer = equipmentHourlyCost(input.dryer);
  const filaments = input.filaments || [];
  const supplies = input.supplies || [];

  const filamentGrams = sum(filaments, (filament) =>
    toSafeNumber(filament.grams),
  );
  const filament = sum(
    filaments,
    (usedFilament) =>
      toSafeNumber(usedFilament.grams) *
      toSafeNumber(usedFilament.pricePerGram),
  );
  const suppliesCost = sum(
    supplies,
    (usedSupply) =>
      toSafeNumber(usedSupply.qty) * toSafeNumber(usedSupply.unitCost),
  );
  const energyKwh = printer.energyKwh * printHours + dryer.energyKwh * dryHours;
  const energy = energyKwh * toSafeNumber(settings.kwhPrice);
  const printerWear = (printer.depreciation + printer.maintenance) * printHours;
  const dryerWear = dryer.depreciation * dryHours;
  const labor =
    (toSafeNumber(input.laborMinutes) / 60) *
    toSafeNumber(settings.laborHourRate);
  const extra = toSafeNumber(input.extraCost);
  const failure =
    (filament + energy + printerWear + dryerWear) *
    percentToFraction(settings.failureRatePct);

  const total =
    filament +
    suppliesCost +
    energy +
    printerWear +
    dryerWear +
    labor +
    extra +
    failure;
  const unitCost = total / quantity;

  const breakdown: CostLine[] = (
    [
      { key: "filament", label: "Filamento", value: filament },
      { key: "supplies", label: "Outros materiais", value: suppliesCost },
      { key: "energy", label: "Energia", value: energy },
      {
        key: "printerWear",
        label: "Desgaste da impressora",
        value: printerWear,
      },
      { key: "dryerWear", label: "Desgaste da secadora", value: dryerWear },
      { key: "labor", label: "Mão de obra", value: labor },
      { key: "extra", label: "Custos extras", value: extra },
      {
        key: "failure",
        label: `Margem de falha (${toSafeNumber(settings.failureRatePct)}%)`,
        value: failure,
      },
    ] satisfies CostLine[]
  ).map((line) => ({ ...line, value: round2(line.value) }));

  return {
    quantity,
    filamentGrams: round2(filamentGrams),
    energyKwh: round2(energyKwh),
    breakdown,
    totalCost: round2(total),
    unitCost: round2(unitCost),
    pricing: priceTiers(unitCost, settings),
  };
};

export const simulateDiscount = (
  unitCost: number,
  price: number,
  discountPct: number,
  settings: Partial<Settings> = {},
): PriceAnalysis & { discountPct: number } => ({
  discountPct: toSafeNumber(discountPct),
  ...analyzePrice(
    unitCost,
    toSafeNumber(price) * (1 - percentToFraction(discountPct)),
    settings,
  ),
});

/** Promoção "leve X, pague Y". */
export const simulateBundle = (
  unitCost: number,
  unitPrice: number,
  take: number,
  pay: number,
  settings: Partial<Settings> = {},
): BundleResult => {
  const fullSettings = withDefaults(settings);
  const takeQuantity = Math.max(1, Math.floor(toSafeNumber(take)));
  const payQuantity = Math.min(
    Math.max(0, Math.floor(toSafeNumber(pay))),
    takeQuantity,
  );
  const bundlePrice = toSafeNumber(unitPrice) * payQuantity;
  const bundleCost = toSafeNumber(unitCost) * takeQuantity;
  const analysis = analyzePrice(bundleCost, bundlePrice, fullSettings);

  return {
    take: takeQuantity,
    pay: payQuantity,
    bundlePrice: round2(bundlePrice),
    bundleCost: round2(bundleCost),
    effectiveUnitPrice: round2(bundlePrice / takeQuantity),
    effectiveDiscountPct: round2((1 - payQuantity / takeQuantity) * 100),
    profit: analysis.profit,
    marginPct: analysis.marginPct,
    viable: analysis.profit > 0,
    meetsMinMargin:
      analysis.marginPct >= toSafeNumber(fullSettings.minMarginPct),
  };
};

/** Preço unitário mínimo para a promoção empatar ou manter a margem mínima. */
export const minUnitPriceForBundle = (
  unitCost: number,
  take: number,
  pay: number,
  settings: Partial<Settings> = {},
): { breakEven: number; keepingMinMargin: number } => {
  const fullSettings = withDefaults(settings);
  const takeQuantity = Math.max(1, toSafeNumber(take));
  const payQuantity = Math.max(1, toSafeNumber(pay));
  const feeFactor = 1 - percentToFraction(fullSettings.platformFeePct);
  const minMarginFactor =
    feeFactor - percentToFraction(fullSettings.minMarginPct);
  const costPerPaidPiece =
    (toSafeNumber(unitCost) * takeQuantity) / payQuantity;

  return {
    breakEven: feeFactor > 0 ? round2(costPerPaidPiece / feeFactor) : Infinity,
    keepingMinMargin:
      minMarginFactor > 0
        ? round2(costPerPaidPiece / minMarginFactor)
        : Infinity,
  };
};
