import type { BrandDoc } from "./types";

/** Materiais oferecidos quando a marca ainda não tem nenhum cadastrado. */
export const MATERIALS = ["PLA", "PLA+", "PETG", "ABS", "ASA", "TPU", "Nylon", "PC", "Resina", "Outro"];

/** Sugestões de tipo no cadastro da marca (dá para digitar qualquer outro). */
export const TYPE_SUGGESTIONS = [
  "Basic",
  "Lite",
  "Matte",
  "Silk",
  "High Speed",
  "Rainbow",
  "Duo Color",
  "Tri Color",
  "Glitter",
  "Translúcido",
  "Brilha no escuro",
  "Madeira",
  "Mármore",
  "Fibra de carbono",
];

/** Materiais da marca; sem marca (ou marca sem materiais), a lista padrão. */
export const materialsOf = (brand?: BrandDoc) =>
  brand?.materials.length ? brand.materials.map((row) => row.material) : MATERIALS;

/** Tipos que a marca vende naquele material. */
export const typesOf = (brand: BrandDoc | undefined, material: string) =>
  brand?.materials.find((row) => row.material.toLowerCase() === material?.toLowerCase())?.types ?? [];

/** Garante que o valor atual aparece entre as opções (ex.: carretel antigo com outro material). */
export const withCurrent = (options: string[], current?: string) =>
  current && !options.includes(current) ? [...options, current] : options;
