import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import {
  Alert,
  Button,
  Chip,
  IconButton,
  Stack,
  TextField,
  Tooltip,
} from "@mui/material";
import { useEffect, useState, type FormEvent } from "react";
import { api, errorMessage } from "../api";
import { FieldGrid, Loading, NumberField, Section } from "../components/common";
import { useFeedback } from "../components/FeedbackProvider";
import { useFinishes } from "../components/Finishes";
import { PageHeader } from "../components/PageHeader";
import type { FinishDoc, Settings as SettingsType, TierKey } from "../lib/types";

type GeneralKey = Exclude<keyof SettingsType, "tiers" | "currency">;

const GENERAL_FIELDS: { name: GeneralKey; label: string; suffix: string; help?: string }[] = [
  { name: "kwhPrice", label: "Preço do kWh", suffix: "R$", help: "Valor da conta ÷ kWh consumidos (com impostos e bandeira)." },
  { name: "failureRatePct", label: "Taxa de falha", suffix: "%", help: "Somada sobre material, energia e desgaste para cobrir impressões que dão errado." },
  { name: "laborHourRate", label: "Sua hora de trabalho", suffix: "R$/h", help: "Pós-processo, montagem, pintura. 0 = não cobrar." },
  { name: "platformFeePct", label: "Taxa de venda", suffix: "%", help: "Marketplace, maquininha… O preço sugerido já compensa." },
  { name: "minMarginPct", label: "Margem mínima aceitável", suffix: "%", help: "Base do desconto máximo \"seguro\"." },
  { name: "lowStockGrams", label: "Alerta de carretel acabando", suffix: "g" },
];

const TIER_FIELDS: { name: TierKey; label: string }[] = [
  { name: "barato", label: "Barato" },
  { name: "ideal", label: "Ideal" },
  { name: "caro", label: "Caro" },
];

/** Acabamentos de filamento: cada alteração vai direto para a API. */
const FinishesManager = () => {
  const { items, error, reload } = useFinishes();
  const { confirm } = useFeedback();
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [message, setMessage] = useState("");

  const run = async (action: () => Promise<unknown>) => {
    setMessage("");
    try {
      await action();
      await reload();

      return true;
    } catch (caught) {
      setMessage(errorMessage(caught));

      return false;
    }
  };

  const add = async (event: FormEvent) => {
    event.preventDefault();
    if (!newName.trim()) {
      return;
    }

    if (await run(() => api.post("/finishes", { name: newName.trim() }))) {
      setNewName("");
    }
  };

  const rename = async (finish: FinishDoc) => {
    if (await run(() => api.put(`/finishes/${finish.id}`, { name: editingName.trim() }))) {
      setEditingId(null);
    }
  };

  const remove = async (finish: FinishDoc) => {
    const confirmed = await confirm({
      title: `Excluir "${finish.name}"?`,
      message: "Ele será removido de todos os carretéis que o usam.",
      confirmLabel: "Excluir",
      danger: true,
    });

    if (confirmed) {
      await run(() => api.delete(`/finishes/${finish.id}`));
    }
  };

  return (
    <Section
      title="Acabamentos de filamento"
      subtitle="Aparecem no cadastro e no filtro de carretéis. Renomear não afeta os carretéis."
    >
      {(error || message) && <Alert severity="error" sx={{ mb: 2 }}>{error || message}</Alert>}
      <Stack spacing={1} sx={{ mb: 2 }}>
        {items.map((finish) =>
          editingId === finish.id ? (
            <Stack key={finish.id} direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <TextField
                value={editingName}
                onChange={(event) => setEditingName(event.target.value)}
                autoFocus
                sx={{ maxWidth: 260 }}
                slotProps={{ htmlInput: { "aria-label": "Novo nome" } }}
              />
              <Button size="small" variant="contained" disabled={!editingName.trim()} onClick={() => rename(finish)}>
                Salvar
              </Button>
              <Button size="small" onClick={() => setEditingId(null)}>
                Cancelar
              </Button>
            </Stack>
          ) : (
            <Stack key={finish.id} direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
              <Chip label={finish.name} sx={{ minWidth: 140, justifyContent: "flex-start" }} />
              <Tooltip title="Renomear">
                <IconButton
                  size="small"
                  onClick={() => {
                    setEditingId(finish.id);
                    setEditingName(finish.name);
                  }}
                >
                  <EditOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Excluir">
                <IconButton size="small" color="error" onClick={() => remove(finish)}>
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          ),
        )}
      </Stack>
      <Stack component="form" onSubmit={add} direction="row" spacing={1}>
        <TextField
          placeholder="Novo acabamento (ex.: Metálico)"
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
          sx={{ maxWidth: 320 }}
        />
        <Button type="submit" variant="outlined" startIcon={<AddIcon />} disabled={!newName.trim()}>
          Adicionar
        </Button>
      </Stack>
    </Section>
  );
};

/** Parâmetros usados em todo cálculo. Impressões já salvas mantêm o resultado até serem editadas. */
export const Settings = () => {
  const { notify } = useFeedback();
  const [form, setForm] = useState<SettingsType | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .get<SettingsType>("/settings")
      .then(setForm)
      .catch((caught) => setError(errorMessage(caught)));
  }, []);

  if (error && !form) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (!form) {
    return <Loading />;
  }

  const setField = (name: GeneralKey, value: number | "") =>
    setForm((current) => current && { ...current, [name]: value });

  const setTier = (name: TierKey, value: number | "") =>
    setForm((current) => current && { ...current, tiers: { ...current.tiers, [name]: value } });

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      setForm(await api.put<SettingsType>("/settings", form));
      setError("");
      notify("Configurações salvas.");
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <form onSubmit={save}>
        <PageHeader
          title="Configurações"
          subtitle="Valores usados em todos os cálculos."
          actions={
            <Button type="submit" variant="contained" disabled={saving}>
              {saving ? "Salvando…" : "Salvar"}
            </Button>
          }
        />
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Section title="Custos e taxas">
          <FieldGrid minWidth={260}>
            {GENERAL_FIELDS.map((field) => (
              <NumberField
                key={field.name}
                label={field.label}
                suffix={field.suffix}
                helperText={field.help}
                value={form[field.name]}
                onChange={(value) => setField(field.name, value)}
              />
            ))}
          </FieldGrid>
        </Section>
        <Section
          title="Faixas de preço (markup)"
          subtitle="Quanto somar sobre o custo. Ex.: 100% = vender pelo dobro do custo."
        >
          <FieldGrid>
            {TIER_FIELDS.map((tier) => (
              <NumberField
                key={tier.name}
                label={tier.label}
                suffix="% sobre o custo"
                value={form.tiers[tier.name]}
                onChange={(value) => setTier(tier.name, value)}
              />
            ))}
          </FieldGrid>
        </Section>
      </form>
      <FinishesManager />
    </>
  );
};
