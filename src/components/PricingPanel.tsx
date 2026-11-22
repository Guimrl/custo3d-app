import {
  Alert,
  Box,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Slider,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { useState } from "react";
import {
  analyzePrice,
  minUnitPriceForBundle,
  priceTiers,
  simulateBundle,
  simulateDiscount,
} from "../lib/calc";
import { money, percent } from "../lib/format";
import type { Settings, TierKey } from "../lib/types";
import { FieldGrid, NumberField, Section } from "./common";

const TIER_COLORS: Record<TierKey, string> = {
  barato: "success.main",
  ideal: "primary.main",
  caro: "warning.main",
};

type Tone = "success" | "warning" | "error";

/** Vermelho se prejuízo, amarelo se abaixo da margem mínima, verde se ok. */
const toneOf = (profit: number, marginPct: number, minMarginPct: number): Tone => {
  if (profit < 0) {
    return "error";
  }

  return marginPct < minMarginPct ? "warning" : "success";
};

const Stat = ({ label, value, tone }: { label: string; value: string; tone?: Tone }) => (
  <Box sx={{ px: 1.5, py: 1, borderRadius: 2, bgcolor: "action.hover", minWidth: 120 }}>
    <Typography variant="caption" sx={{ color: "text.secondary" }}>
      {label}
    </Typography>
    <Typography variant="body1" sx={{ fontWeight: 600, color: tone ? `${tone}.main` : undefined }}>
      {value}
    </Typography>
  </Box>
);

const StatRow = ({ children }: { children: React.ReactNode }) => (
  <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1 }}>
    {children}
  </Stack>
);

interface PricingPanelProps {
  unitCost: number;
  settings: Settings;
  /** Preço escolhido ('' = ainda não escolheu). */
  salePrice: number | "" | undefined;
  onSalePriceChange: (value: number | "") => void;
}

/** Faixas de preço, análise do preço escolhido, simulador de desconto e "leve X, pague Y". */
export const PricingPanel = ({ unitCost, settings, salePrice, onSalePriceChange }: PricingPanelProps) => {
  const [discountPct, setDiscountPct] = useState(10);
  const [take, setTake] = useState(2);
  const [pay, setPay] = useState(1);

  if (unitCost <= 0) {
    return (
      <Section title="Preços">
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          Informe filamento, tempo ou materiais para ver os preços sugeridos e as simulações.
        </Typography>
      </Section>
    );
  }

  const tiers = priceTiers(unitCost, settings);
  const hasPrice = Number(salePrice) > 0;
  // Sem preço escolhido, as simulações usam o "Ideal".
  const chosenPrice = hasPrice
    ? Number(salePrice)
    : tiers.find((tier) => tier.key === "ideal")?.price || 0;
  const analysis = analyzePrice(unitCost, chosenPrice, settings);
  const discount = simulateDiscount(unitCost, chosenPrice, discountPct, settings);
  const bundleMinimum = minUnitPriceForBundle(unitCost, take, pay, settings);
  const bundleRows = [
    ...tiers.map((tier) => ({ label: tier.label, price: tier.price })),
    ...(hasPrice ? [{ label: "Seu preço", price: Number(salePrice) }] : []),
  ].map((row) => ({ ...row, ...simulateBundle(unitCost, row.price, take, pay, settings) }));

  const tone = (profit: number, marginPct: number) => toneOf(profit, marginPct, settings.minMarginPct);

  return (
    <>
      <Section title="Preço sugerido por peça" subtitle="Clique numa faixa para usá-la como preço de venda.">
        <FieldGrid minWidth={220}>
          {tiers.map((tier) => {
            const selected = Math.abs(chosenPrice - tier.price) < 0.005;

            return (
              <Card
                key={tier.key}
                sx={{ borderColor: selected ? "primary.main" : undefined, borderWidth: selected ? 2 : 1 }}
              >
                <CardActionArea onClick={() => onSalePriceChange(tier.price)} sx={{ height: "100%" }}>
                  <CardContent>
                    <Typography variant="overline" sx={{ color: TIER_COLORS[tier.key], fontWeight: 700 }}>
                      {tier.label}
                    </Typography>
                    <Typography variant="h5">{money(tier.price)}</Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                      +{tier.targetMarkupPct}% sobre o custo
                    </Typography>
                    <Stack spacing={0.5} sx={{ mt: 1.5 }}>
                      {[
                        ["Lucro", money(tier.profit)],
                        ["Margem", percent(tier.marginPct)],
                        ["Desc. máx. (empate)", percent(tier.maxDiscountPct)],
                        ["Desc. c/ margem mín.", percent(tier.maxDiscountKeepingMarginPct)],
                      ].map(([label, value]) => (
                        <Stack key={label} direction="row" sx={{ justifyContent: "space-between" }}>
                          <Typography variant="caption" sx={{ color: "text.secondary" }}>
                            {label}
                          </Typography>
                          <Typography variant="caption" sx={{ fontWeight: 600 }}>
                            {value}
                          </Typography>
                        </Stack>
                      ))}
                    </Stack>
                  </CardContent>
                </CardActionArea>
              </Card>
            );
          })}
        </FieldGrid>
      </Section>

      <Section title="Seu preço de venda">
        <Stack spacing={2}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ alignItems: { sm: "center" } }}>
            <Box sx={{ width: { sm: 200 } }}>
              <NumberField
                label="Preço unitário"
                suffix="R$"
                step={0.01}
                value={salePrice}
                placeholder={chosenPrice.toFixed(2)}
                onChange={onSalePriceChange}
              />
            </Box>
            <StatRow>
              <Stat label="Custo" value={money(unitCost)} />
              <Stat label="Taxa de venda" value={money(analysis.fee)} />
              <Stat label="Lucro" value={money(analysis.profit)} tone={tone(analysis.profit, analysis.marginPct)} />
              <Stat label="Margem" value={percent(analysis.marginPct)} />
              <Stat label="Markup" value={percent(analysis.markupPct)} />
            </StatRow>
          </Stack>
          <StatRow>
            <Stat label="Preço mínimo (empate)" value={money(analysis.breakEvenPrice)} />
            <Stat label={`Preço c/ margem mín. (${settings.minMarginPct}%)`} value={money(analysis.minMarginPrice)} />
            <Stat label="Desconto máximo" value={percent(analysis.maxDiscountPct)} />
            <Stat label="Desconto seguro" value={percent(analysis.maxDiscountKeepingMarginPct)} />
          </StatRow>
        </Stack>
      </Section>

      <Section title="Simular desconto">
        <Stack direction={{ xs: "column", sm: "row" }} spacing={3} sx={{ alignItems: { sm: "center" } }}>
          <Box sx={{ flex: 1, minWidth: 220 }}>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              Desconto de <b>{discountPct}%</b> sobre {money(chosenPrice)}
            </Typography>
            <Slider
              value={discountPct}
              min={0}
              max={90}
              onChange={(_, value) => setDiscountPct(value as number)}
              valueLabelDisplay="auto"
              valueLabelFormat={(value) => `${value}%`}
            />
          </Box>
          <StatRow>
            <Stat label="Preço final" value={money(discount.price)} />
            <Stat label="Lucro" value={money(discount.profit)} tone={tone(discount.profit, discount.marginPct)} />
            <Stat label="Margem" value={percent(discount.marginPct)} />
          </StatRow>
        </Stack>
        {discount.profit < 0 && (
          <Alert severity="error" sx={{ mt: 2 }}>Com esse desconto você paga para vender.</Alert>
        )}
        {discount.profit >= 0 && discount.marginPct < settings.minMarginPct && (
          <Alert severity="warning" sx={{ mt: 2 }}>Abaixo da sua margem mínima ({settings.minMarginPct}%).</Alert>
        )}
      </Section>

      <Section title="Promoção &quot;leve X, pague Y&quot;">
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ alignItems: { sm: "center" }, mb: 2 }}>
          <Stack direction="row" spacing={1}>
            <NumberField
              label="Leve"
              min={1}
              step={1}
              value={take}
              onChange={(value) => setTake(Math.max(1, Number(value) || 1))}
              sx={{ width: 100 }}
            />
            <NumberField
              label="Pague"
              min={1}
              max={take}
              step={1}
              value={pay}
              onChange={(value) => setPay(Math.max(1, Math.min(take, Number(value) || 1)))}
              sx={{ width: 100 }}
            />
          </Stack>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            Para empatar, a peça precisa custar no mínimo <b>{money(bundleMinimum.breakEven)}</b>; para manter a
            margem mínima, <b>{money(bundleMinimum.keepingMinMargin)}</b>.
          </Typography>
        </Stack>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Preço base</TableCell>
                <TableCell align="right">Cliente paga</TableCell>
                <TableCell align="right">Seu custo</TableCell>
                <TableCell align="right">Lucro</TableCell>
                <TableCell align="right">Margem</TableCell>
                <TableCell>Vale a pena?</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {bundleRows.map((row) => (
                <TableRow key={row.label}>
                  <TableCell>
                    {row.label}{" "}
                    <Typography component="span" variant="caption" sx={{ color: "text.secondary" }}>
                      ({money(row.price)})
                    </Typography>
                  </TableCell>
                  <TableCell align="right">{money(row.bundlePrice)}</TableCell>
                  <TableCell align="right">{money(row.bundleCost)}</TableCell>
                  <TableCell align="right" sx={{ color: row.profit < 0 ? "error.main" : undefined }}>
                    {money(row.profit)}
                  </TableCell>
                  <TableCell align="right">{percent(row.marginPct)}</TableCell>
                  <TableCell>
                    {!row.viable && <Chip size="small" color="error" label="Prejuízo" />}
                    {row.viable && row.meetsMinMargin && <Chip size="small" color="success" label="Sim" />}
                    {row.viable && !row.meetsMinMargin && <Chip size="small" color="warning" label="Margem baixa" />}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Section>
    </>
  );
};
