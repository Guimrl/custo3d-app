import AddIcon from "@mui/icons-material/Add";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import {
  Alert,
  Box,
  Button,
  Divider,
  IconButton,
  LinearProgress,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, errorMessage } from "../api";
import { ColorSwatch } from "../components/ColorSwatch";
import { FieldGrid, Loading, NumberField, Section, TimeField } from "../components/common";
import { useFeedback } from "../components/FeedbackProvider";
import { PageHeader } from "../components/PageHeader";
import { PhotoField } from "../components/Photo";
import { PricingPanel } from "../components/PricingPanel";
import { calculateCost, spoolPricePerGram, supplyUnitCost } from "../lib/calc";
import { grams, money, percent } from "../lib/format";
import type {
  EquipmentDoc,
  PrintDoc,
  PrintFilament,
  PrintInput,
  PrintSupply,
  Settings,
  SpoolDoc,
  SupplyDoc,
} from "../lib/types";

interface LoadedData {
  settings: Settings;
  equipment: EquipmentDoc[];
  spools: SpoolDoc[];
  supplies: SupplyDoc[];
}

type FormState = PrintInput & { status?: PrintDoc["status"] };

const BLANK_FORM: FormState = {
  name: "",
  customer: "",
  printerId: "",
  dryerId: "",
  printHours: 0,
  dryHours: 0,
  laborMinutes: 0,
  quantity: 1,
  extraCost: 0,
  filaments: [{ spoolId: "", grams: 0 }],
  supplies: [],
  salePrice: "",
  photoUrl: "",
  notes: "",
};

const findById = <T extends { id: string }>(list: T[], id?: string | null) =>
  list.find((item) => item.id === id);

/** Uma linha de filamento/material: seletor, quantidade, custo e remover. */
const LineRow = ({ children }: { children: React.ReactNode }) => (
  <Box
    sx={{
      display: "grid",
      gridTemplateColumns: { xs: "minmax(0, 1fr) 110px auto", sm: "minmax(0, 1fr) 120px 90px auto" },
      gap: 1,
      alignItems: "center",
      mb: 1.5,
    }}
  >
    {children}
  </Box>
);

const LineCost = ({ value }: { value: number }) => (
  <Typography variant="body2" sx={{ textAlign: "right", fontWeight: 500, display: { xs: "none", sm: "block" } }}>
    {money(value)}
  </Typography>
);

/**
 * Nova impressão / editar impressão (/calcular e /calcular/:id).
 * O custo é recalculado localmente a cada alteração; salvar envia só ids e quantidades.
 */
export const Calculator = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { notify } = useFeedback();
  const [data, setData] = useState<LoadedData | null>(null);
  const [form, setForm] = useState<FormState>(BLANK_FORM);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [settings, equipment, spools, supplies] = await Promise.all([
          api.get<Settings>("/settings"),
          api.get<EquipmentDoc[]>("/equipment"),
          api.get<SpoolDoc[]>("/spools"),
          api.get<SupplyDoc[]>("/supplies"),
        ]);
        setData({ settings, equipment, spools, supplies });

        if (id) {
          const print = await api.get<PrintDoc>(`/prints/${id}`);
          setForm({
            ...BLANK_FORM,
            ...print,
            printerId: print.printerId || "",
            dryerId: print.dryerId || "",
            salePrice: print.salePrice || "",
          });
        } else {
          // Impressão nova: já seleciona a primeira impressora ativa.
          const printer = equipment.find((item) => item.type === "printer" && item.active !== false);
          setForm({ ...BLANK_FORM, printerId: printer?.id || "" });
        }
        setError("");
      } catch (caught) {
        setError(errorMessage(caught));
      }
    };

    load();
  }, [id]);

  const result = useMemo(() => {
    if (!data) {
      return null;
    }

    return calculateCost({
      settings: data.settings,
      printer: findById(data.equipment, form.printerId),
      dryer: findById(data.equipment, form.dryerId),
      printHours: form.printHours,
      dryHours: form.dryerId ? form.dryHours : 0,
      laborMinutes: form.laborMinutes,
      quantity: form.quantity,
      extraCost: form.extraCost,
      // Carretel ainda existe: preço atual; senão, a "foto" salva na impressão.
      filaments: form.filaments.map((filament) => {
        const spool = findById(data.spools, filament.spoolId);

        return { grams: filament.grams, pricePerGram: spool ? spoolPricePerGram(spool) : filament.pricePerGram };
      }),
      supplies: form.supplies.map((usedSupply) => {
        const supply = findById(data.supplies, usedSupply.supplyId);

        return { qty: usedSupply.qty, unitCost: supply ? supplyUnitCost(supply) : usedSupply.unitCost };
      }),
    });
  }, [data, form]);

  if (!data || !result) {
    return error ? <Alert severity="error">{error}</Alert> : <Loading />;
  }

  const setField = <Key extends keyof FormState>(key: Key, value: FormState[Key]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const updateFilament = (position: number, patch: Partial<PrintFilament>) =>
    setField("filaments", form.filaments.map((filament, index) => (index === position ? { ...filament, ...patch } : filament)));

  const updateSupply = (position: number, patch: Partial<PrintSupply>) =>
    setField("supplies", form.supplies.map((usedSupply, index) => (index === position ? { ...usedSupply, ...patch } : usedSupply)));

  const printers = data.equipment.filter((equipment) => equipment.type === "printer");
  const dryers = data.equipment.filter((equipment) => equipment.type === "dryer");
  const isDone = form.status === "concluida";

  /** @param complete true = "Imprimi!" (dá baixa no estoque) */
  const save = async (complete: boolean) => {
    if (!form.name.trim()) {
      setError("Dê um nome para a peça.");

      return;
    }

    setSaving(true);
    try {
      const body = { ...form, status: complete || isDone ? "concluida" : "orcamento" };
      const saved = id
        ? await api.put<PrintDoc>(`/prints/${id}`, body)
        : await api.post<PrintDoc>("/prints", body);

      setError("");
      setForm((current) => ({ ...current, status: saved.status }));
      notify(
        [complete ? "Salvo e estoque atualizado." : "Salvo.", ...(saved.warnings ?? [])].join(" "),
        saved.warnings?.length ? "warning" : "success",
      );

      // Recarrega carretéis/materiais para o "resta X g" refletir a baixa.
      const [spools, supplies] = await Promise.all([
        api.get<SpoolDoc[]>("/spools"),
        api.get<SupplyDoc[]>("/supplies"),
      ]);
      setData((current) => current && { ...current, spools, supplies });

      // Impressão nova: muda a URL para o próximo salvar editar em vez de duplicar.
      if (!id) {
        navigate(`/calcular/${saved.id}`, { replace: true });
      }
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSaving(false);
    }
  };

  const costLines = result.breakdown.filter((line) => line.value > 0);

  return (
    <>
      <PageHeader
        title={id ? form.name || "Impressão" : "Nova impressão"}
        subtitle={isDone ? "Impressa: estoque já descontado (editar recalcula a baixa)." : "Preencha os dados; o custo é calculado na hora."}
        actions={
          <>
            <Button variant="outlined" disabled={saving} onClick={() => save(false)}>
              {isDone ? "Salvar alterações" : "Salvar orçamento"}
            </Button>
            {!isDone && (
              <Button variant="contained" startIcon={<CheckIcon />} disabled={saving} onClick={() => save(true)}>
                Imprimi! Dar baixa
              </Button>
            )}
          </>
        }
      />
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1fr) 340px" },
          alignItems: "start",
        }}
      >
        <Box>
          <Section title="Peça">
            <FieldGrid>
              <TextField
                label="Nome da peça"
                value={form.name}
                onChange={(event) => setField("name", event.target.value)}
                placeholder="Ex.: Chaveiro logo"
                required
              />
              <TextField
                label="Cliente (opcional)"
                value={form.customer ?? ""}
                onChange={(event) => setField("customer", event.target.value)}
              />
              <NumberField
                label="Peças neste lote"
                step={1}
                min={1}
                value={form.quantity}
                onChange={(value) => setField("quantity", Number(value) || 0)}
                helperText="Quantas peças saem desta impressão"
              />
            </FieldGrid>
          </Section>

          <Section title="Máquina e tempo">
            {!printers.length && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                Cadastre uma impressora em Equipamentos para incluir energia e desgaste.
              </Alert>
            )}
            <FieldGrid minWidth={260}>
              <TextField
                select
                label="Impressora"
                value={form.printerId ?? ""}
                onChange={(event) => setField("printerId", event.target.value)}
              >
                <MenuItem value="">Nenhuma</MenuItem>
                {printers.map((printer) => (
                  <MenuItem key={printer.id} value={printer.id}>{printer.name}</MenuItem>
                ))}
              </TextField>
              <TimeField label="Impressão" value={form.printHours} onChange={(value) => setField("printHours", value)} />
              <TextField
                select
                label="Secadora de filamento"
                value={form.dryerId ?? ""}
                onChange={(event) => setField("dryerId", event.target.value)}
              >
                <MenuItem value="">Não usei</MenuItem>
                {dryers.map((dryer) => (
                  <MenuItem key={dryer.id} value={dryer.id}>{dryer.name}</MenuItem>
                ))}
              </TextField>
              {form.dryerId && (
                <TimeField label="Secagem" value={form.dryHours} onChange={(value) => setField("dryHours", value)} />
              )}
              <NumberField
                label="Trabalho manual"
                suffix="min"
                value={form.laborMinutes}
                onChange={(value) => setField("laborMinutes", Number(value) || 0)}
                helperText="Pós-processo, montagem, pintura"
              />
              <NumberField
                label="Outros custos"
                suffix="R$"
                value={form.extraCost}
                onChange={(value) => setField("extraCost", Number(value) || 0)}
                helperText="Frete, avulsos…"
              />
            </FieldGrid>
          </Section>

          <Section
            title="Filamento usado"
            subtitle="O fatiador (Bambu Studio, Orca, Cura) mostra os gramas por cor. Some purga/torre na cor correspondente."
            action={
              <Button size="small" startIcon={<AddIcon />} onClick={() => setField("filaments", [...form.filaments, { spoolId: "", grams: 0 }])}>
                Carretel
              </Button>
            }
          >
            {!data.spools.length && <Alert severity="warning" sx={{ mb: 2 }}>Nenhum carretel cadastrado.</Alert>}
            {form.filaments.map((filament, index) => {
              const spool = findById(data.spools, filament.spoolId);
              const pricePerGram = spool ? spoolPricePerGram(spool) : filament.pricePerGram || 0;
              const isOverStock = spool !== undefined && Number(filament.grams) > spool.remainingGrams;

              return (
                <Box key={index}>
                  <LineRow>
                    <TextField
                      select
                      label="Carretel"
                      value={filament.spoolId ?? ""}
                      onChange={(event) => updateFilament(index, { spoolId: event.target.value })}
                    >
                      <MenuItem value="">
                        {filament.label ? `${filament.label} (carretel removido)` : "Escolha o carretel…"}
                      </MenuItem>
                      {data.spools.map((option) => (
                        <MenuItem key={option.id} value={option.id}>
                          <Stack direction="row" spacing={1} sx={{ alignItems: "center", minWidth: 0 }}>
                            <ColorSwatch item={option} />
                            <Typography variant="body2" noWrap>
                              {option.material} {option.color} {option.brand ? `· ${option.brand}` : ""} — resta{" "}
                              {grams(option.remainingGrams)} · {money(spoolPricePerGram(option) * 1000)}/kg
                            </Typography>
                          </Stack>
                        </MenuItem>
                      ))}
                    </TextField>
                    <NumberField
                      label="Gramas"
                      suffix="g"
                      value={filament.grams || ""}
                      onChange={(value) => updateFilament(index, { grams: Number(value) || 0 })}
                    />
                    <LineCost value={(Number(filament.grams) || 0) * pricePerGram} />
                    <IconButton
                      size="small"
                      aria-label="Remover"
                      onClick={() => setField("filaments", form.filaments.filter((_, position) => position !== index))}
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </LineRow>
                  {isOverStock && (
                    <Typography variant="caption" sx={{ color: "warning.main", display: "block", mt: -1, mb: 1.5 }}>
                      Só restam {grams(spool.remainingGrams)} nesse carretel.
                    </Typography>
                  )}
                </Box>
              );
            })}
          </Section>

          <Section
            title="Outros materiais"
            action={
              <Button
                size="small"
                startIcon={<AddIcon />}
                disabled={!data.supplies.length}
                onClick={() => setField("supplies", [...form.supplies, { supplyId: "", qty: 1 }])}
              >
                Material
              </Button>
            }
          >
            {!data.supplies.length && (
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                Cadastre argolas, ímãs, embalagens… em Outros materiais para usá-los aqui.
              </Typography>
            )}
            {form.supplies.map((usedSupply, index) => {
              const supply = findById(data.supplies, usedSupply.supplyId);
              const unitCost = supply ? supplyUnitCost(supply) : usedSupply.unitCost || 0;

              return (
                <LineRow key={index}>
                  <TextField
                    select
                    label="Material"
                    value={usedSupply.supplyId ?? ""}
                    onChange={(event) => updateSupply(index, { supplyId: event.target.value })}
                  >
                    <MenuItem value="">{usedSupply.label ? `${usedSupply.label} (removido)` : "Escolha…"}</MenuItem>
                    {data.supplies.map((option) => (
                      <MenuItem key={option.id} value={option.id}>
                        {option.name} — {money(supplyUnitCost(option))}/{option.unit} · resta {option.quantityRemaining}
                      </MenuItem>
                    ))}
                  </TextField>
                  <NumberField
                    label="Qtd"
                    suffix={supply?.unit || usedSupply.unit || "un"}
                    value={usedSupply.qty || ""}
                    onChange={(value) => updateSupply(index, { qty: Number(value) || 0 })}
                  />
                  <LineCost value={(Number(usedSupply.qty) || 0) * unitCost} />
                  <IconButton
                    size="small"
                    aria-label="Remover"
                    onClick={() => setField("supplies", form.supplies.filter((_, position) => position !== index))}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </LineRow>
              );
            })}
          </Section>

          <Section title="Foto da peça">
            <PhotoField value={form.photoUrl} onChange={(url) => setField("photoUrl", url)} />
          </Section>

          <Section title="Observações">
            <TextField
              multiline
              minRows={3}
              value={form.notes ?? ""}
              onChange={(event) => setField("notes", event.target.value)}
            />
          </Section>
        </Box>

        <Paper sx={{ p: 2.5, position: { lg: "sticky" }, top: { lg: 88 } }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Custo
          </Typography>
          <Stack spacing={1.5}>
            {costLines.map((line) => (
              <Box key={line.key}>
                <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                  <Typography variant="body2">{line.label}</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>{money(line.value)}</Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={result.totalCost ? (line.value / result.totalCost) * 100 : 0}
                  sx={{ height: 4, borderRadius: 99, mt: 0.5 }}
                />
              </Box>
            ))}
          </Stack>
          <Divider sx={{ my: 2 }} />
          <Stack direction="row" sx={{ justifyContent: "space-between", mb: 1 }}>
            <Typography variant="body2">Total do lote</Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>{money(result.totalCost)}</Typography>
          </Stack>
          <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "baseline" }}>
            <Typography variant="body2">Custo por peça</Typography>
            <Typography variant="h5" sx={{ color: "primary.main" }}>{money(result.unitCost)}</Typography>
          </Stack>
          <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 1.5 }}>
            {grams(result.filamentGrams)} de filamento · {result.energyKwh} kWh · falha {percent(data.settings.failureRatePct)}
          </Typography>
        </Paper>
      </Box>

      <Box sx={{ mt: 2 }}>
        <PricingPanel
          unitCost={result.unitCost}
          settings={data.settings}
          salePrice={form.salePrice}
          onSalePriceChange={(value) => setField("salePrice", value)}
        />
      </Box>
    </>
  );
};
