/** Cópia de src/types/index.ts da custo3d-api: se um campo mudar lá, copie para cá. */
export interface DbFields {
  id: string;
  createdAt?: string;
  updatedAt?: string;
}

// Configurações
export type TierKey = "barato" | "ideal" | "caro";

/** Markup (% somado sobre o custo) de cada faixa. */
export type Tiers = Record<TierKey, number>;

export interface Settings {
  /** R$ por kWh (conta de luz ÷ kWh consumidos, já com impostos). */
  kwhPrice: number;
  /** % somado sobre material/energia/desgaste para cobrir impressões que falham. */
  failureRatePct: number;
  /** R$ por hora do seu trabalho manual (pós-processo, pintura, montagem). */
  laborHourRate: number;
  /** % que a plataforma/maquininha retém da venda. */
  platformFeePct: number;
  /** Margem de lucro mínima aceitável — base do "desconto seguro". */
  minMarginPct: number;
  /** Markup de cada faixa de preço. */
  tiers: Tiers;
  /** Abaixo de quantos gramas um carretel aparece como "acabando" no painel. */
  lowStockGrams?: number;
  currency?: string;
}

// Equipamentos
export type EquipmentType = "printer" | "dryer";

export interface Equipment {
  type: EquipmentType;
  name: string;
  brand?: string;
  /** Quanto foi pago */
  price: number;
  /** Em quantas horas de uso o equipamento "se paga" (vida útil estimada). */
  lifespanHours: number;
  /** Consumo médio real durante o uso, em watts. */
  powerWatts: number;
  /** Custo de manutenção rateado por hora (bicos, correias, PEI…). Só impressoras. */
  maintenancePerHour?: number;
  active?: boolean;
  /** Link da foto (http/https): de qualquer site ou enviada pelo ImgBB. */
  photoUrl?: string;
  notes?: string;
}
export type EquipmentDoc = Equipment & DbFields;

// Carretéis de filamento
export type ColorMode = "solid" | "stripes" | "gradient";

export interface Spool {
  material: string;
  brand?: string;
  /** Nome da cor (ex.: "Azul + Roxo"). */
  color: string;
  /** Primeira cor em hexadecimal. Mantida por compatibilidade: é sempre igual a colors[0]. */
  colorHex?: string;
  /** Todas as cores do filamento em hexadecimal (1 para cor sólida, 2+ para multicolor). */
  colors?: string[];
  /** Como desenhar a amostra quando há mais de uma cor. */
  colorMode?: ColorMode;
  /** Ids dos acabamentos (Silk, Matte, Duo Color…), cadastrados em /finishes. */
  finishIds?: string[];
  /** Link da foto do carretel. */
  photoUrl?: string;
  diameter?: number;
  /** Peso líquido de filamento que veio no carretel (g). */
  weightGrams: number;
  /** Quanto ainda resta (g). É descontado quando uma impressão é concluída. */
  remainingGrams: number;
  /** Peso do carretel vazio (tara), para conferir o restante pesando na balança. */
  emptySpoolGrams?: number;
  /** Quanto você pagou pelo carretel inteiro. */
  pricePaid: number;
  purchaseDate?: string;
  supplier?: string;
  archived?: boolean;
  notes?: string;
}
export type SpoolDoc = Spool & DbFields;

// Acabamentos de filamento
export interface Finish {
  name: string;
  order?: number;
}
export type FinishDoc = Finish & DbFields;

// Outros materiais
/**
 * Qualquer coisa que entra na peça além do filamento: argola de chaveiro, ímã,
 * parafuso, tinta, embalagem… O custo unitário é `pricePaid / quantityPurchased`,
 * ou seja, a média de tudo que você já comprou daquele item.
 */
export interface Supply {
  name: string;
  category?: string;
  /** Link da foto do material. */
  photoUrl?: string;
  /** Unidade de medida: un, par, g, ml, m… */
  unit: string;
  /** Total já comprado (soma de todas as reposições). */
  quantityPurchased: number;
  /** Total já pago por esse total comprado. */
  pricePaid: number;
  /** Quanto ainda há em estoque. */
  quantityRemaining: number;
  supplier?: string;
  purchaseDate?: string;
  archived?: boolean;
  notes?: string;
}
export type SupplyDoc = Supply & DbFields;

// Impressões / orçamentos
/** Orçamento não mexe no estoque; concluída já teve o material descontado. */
export type PrintStatus = "orcamento" | "concluida";

export interface PrintFilament {
  spoolId?: string | null;
  label?: string;
  colorHex?: string;
  colors?: string[];
  colorMode?: ColorMode;
  grams: number;
  pricePerGram?: number;
}

export interface PrintSupply {
  supplyId?: string | null;
  label?: string;
  unit?: string;
  qty: number;
  unitCost?: number;
}

/** O que o formulário da calculadora envia para a API. */
export interface PrintInput {
  name: string;
  customer?: string;
  status?: PrintStatus;
  printerId?: string | null;
  dryerId?: string | null;
  /** Tempo de impressão em horas decimais (1h30 = 1.5). */
  printHours: number;
  /** Tempo na secadora em horas decimais. */
  dryHours?: number;
  laborMinutes?: number;
  /** Quantas peças saem deste lote. O custo por peça é total ÷ quantity. */
  quantity: number;
  extraCost?: number;
  filaments: PrintFilament[];
  supplies: PrintSupply[];
  /** Preço unitário de venda escolhido (opcional). */
  salePrice?: number | "";
  /** Link da foto da peça pronta. */
  photoUrl?: string;
  notes?: string;
}

export interface PrintDoc extends PrintInput, DbFields {
  status: PrintStatus;
  /** true quando o material já foi descontado do estoque. */
  stockDeducted: boolean;
  result: CostResult;
  /** Avisos devolvidos pela API ao dar baixa (ex.: carretel ficou zerado). */
  warnings?: string[];
}

// Resultados de cálculo (produzidos por calc.ts)

export type CostKey =
  | "filament"
  | "supplies"
  | "energy"
  | "printerWear"
  | "dryerWear"
  | "labor"
  | "extra"
  | "failure";

/** Uma linha da composição do custo (ex.: "Energia: R$ 1,20"). */
export interface CostLine {
  key: CostKey;
  label: string;
  value: number;
}

/** Análise de um preço de venda: quanto sobra, margem e quanto de desconto cabe. */
export interface PriceAnalysis {
  price: number;
  /** Quanto a plataforma fica. */
  fee: number;
  /** O que entra no seu bolso (preço − taxa). */
  net: number;
  /** Líquido − custo. */
  profit: number;
  /** Lucro ÷ preço × 100. */
  marginPct: number;
  /** Lucro ÷ custo × 100. */
  markupPct: number;
  /** Menor preço possível sem prejuízo. */
  breakEvenPrice: number;
  /** Menor preço que ainda respeita a margem mínima. */
  minMarginPrice: number;
  /** Desconto (%) que leva o lucro a zero. */
  maxDiscountPct: number;
  /** Desconto (%) que leva a margem até a margem mínima. */
  maxDiscountKeepingMarginPct: number;
}

/** Uma faixa de preço (Barato/Ideal/Caro) já analisada. */
export interface PriceTier extends PriceAnalysis {
  key: TierKey;
  label: string;
  /** Markup configurado para a faixa (o `markupPct` herdado é o real, após a taxa). */
  targetMarkupPct: number;
}

/** Resultado completo de `calculateCost`. */
export interface CostResult {
  quantity: number;
  filamentGrams: number;
  energyKwh: number;
  breakdown: CostLine[];
  /** Custo do lote inteiro. */
  totalCost: number;
  /** Custo de cada peça (totalCost ÷ quantity). */
  unitCost: number;
  pricing: PriceTier[];
}

/** Resultado da simulação "leve X, pague Y". */
export interface BundleResult {
  take: number;
  pay: number;
  /** O que o cliente paga pelo pacote. */
  bundlePrice: number;
  /** Quanto custa para você produzir o pacote. */
  bundleCost: number;
  effectiveUnitPrice: number;
  effectiveDiscountPct: number;
  profit: number;
  marginPct: number;
  /** true se dá lucro. */
  viable: boolean;
  /** true se, além de lucro, respeita a margem mínima. */
  meetsMinMargin: boolean;
}

/** Resumo exibido no Painel (rota GET /api/summary). */
export interface Summary {
  spoolCount: number;
  filamentGrams: number;
  filamentValue: number;
  suppliesValue: number;
  lowSpools: SpoolDoc[];
  lowSupplies: SupplyDoc[];
  printsDone: number;
  printHours: number;
  gramsUsed: number;
  revenue: number;
  cost: number;
  profit: number;
}
