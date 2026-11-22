import AddIcon from "@mui/icons-material/Add";
import {
  Alert,
  Box,
  Button,
  Link,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { useEffect, useState, type ReactNode } from "react";
import { Link as RouterLink } from "react-router-dom";
import { api, errorMessage } from "../api";
import { colorsOf, ColorSwatch } from "../components/ColorSwatch";
import { EmptyState, FieldGrid, Loading, Section, StockBar } from "../components/common";
import { PageHeader } from "../components/PageHeader";
import { decimal, grams, money } from "../lib/format";
import type { Summary } from "../lib/types";

const Kpi = ({
  label,
  value,
  detail,
  color,
}: {
  label: string;
  value: string;
  detail: string;
  color?: string;
}) => (
  <Paper sx={{ p: 2.5 }}>
    <Typography variant="body2" sx={{ color: "text.secondary" }}>
      {label}
    </Typography>
    <Typography variant="h5" sx={{ my: 0.5, color }}>
      {value}
    </Typography>
    <Typography variant="caption" sx={{ color: "text.secondary" }}>
      {detail}
    </Typography>
  </Paper>
);

const LowStockItem = ({
  leading,
  title,
  subtitle,
  value,
  bar,
}: {
  leading?: ReactNode;
  title: string;
  subtitle?: string;
  value: string;
  bar: ReactNode;
}) => (
  <Stack
    direction="row"
    spacing={1.5}
    sx={{ alignItems: "center", py: 1, borderBottom: 1, borderColor: "divider" }}
  >
    {leading}
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Typography variant="body2" sx={{ fontWeight: 500 }} noWrap>
        {title}{" "}
        {subtitle && (
          <Typography component="span" variant="caption" sx={{ color: "text.secondary" }}>
            {subtitle}
          </Typography>
        )}
      </Typography>
      {bar}
    </Box>
    <Typography variant="body2" sx={{ fontWeight: 500 }}>
      {value}
    </Typography>
  </Stack>
);

export const Dashboard = () => {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get<Summary>("/summary")
      .then(setSummary)
      .catch((caught) => setError(errorMessage(caught)));
  }, []);

  if (error) {
    return (
      <Section title="Não consegui falar com a API">
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          Confira se a custo3d-api está rodando (npm run dev) e se o DB_CONNECTION do .env dela está certo (npm run db:check).
        </Typography>
      </Section>
    );
  }

  if (!summary) {
    return <Loading />;
  }

  return (
    <>
      <PageHeader
        title="Painel"
        subtitle="Visão geral do estoque e das vendas."
        actions={
          <Button variant="contained" startIcon={<AddIcon />} component={RouterLink} to="/calcular">
            Nova impressão
          </Button>
        }
      />

      <Box sx={{ mb: 3 }}>
        <FieldGrid minWidth={220}>
          <Kpi
            label="Filamento em estoque"
            value={grams(summary.filamentGrams)}
            detail={`${summary.spoolCount} carretéis · ${money(summary.filamentValue)}`}
          />
          <Kpi label="Outros materiais" value={money(summary.suppliesValue)} detail="valor em estoque" />
          <Kpi
            label="Impressões feitas"
            value={String(summary.printsDone)}
            detail={`${decimal(summary.printHours, 1)} h · ${grams(summary.gramsUsed)}`}
          />
          <Kpi
            label="Lucro registrado"
            value={money(summary.profit)}
            detail={`Vendas ${money(summary.revenue)} · custo ${money(summary.cost)}`}
            color={summary.profit < 0 ? "error.main" : "success.main"}
          />
        </FieldGrid>
      </Box>

      <FieldGrid minWidth={340}>
        <Section
          title="Carretéis acabando"
          action={<Link component={RouterLink} to="/carreteis" variant="body2">Ver todos</Link>}
        >
          {!summary.lowSpools.length && <EmptyState>Nenhum carretel abaixo do limite.</EmptyState>}
          {summary.lowSpools.map((spool) => (
            <LowStockItem
              key={spool.id}
              leading={<ColorSwatch item={spool} />}
              title={`${spool.material} ${spool.color}`}
              subtitle={spool.brand}
              value={grams(spool.remainingGrams)}
              bar={<StockBar value={spool.remainingGrams} max={spool.weightGrams} color={colorsOf(spool)[0]} />}
            />
          ))}
        </Section>
        <Section
          title="Materiais acabando"
          action={<Link component={RouterLink} to="/materiais" variant="body2">Ver todos</Link>}
        >
          {!summary.lowSupplies.length && <EmptyState>Tudo com estoque.</EmptyState>}
          {summary.lowSupplies.map((supply) => (
            <LowStockItem
              key={supply.id}
              title={supply.name}
              value={`${decimal(supply.quantityRemaining)} ${supply.unit}`}
              bar={<StockBar value={supply.quantityRemaining} max={supply.quantityPurchased} />}
            />
          ))}
        </Section>
      </FieldGrid>
    </>
  );
};
