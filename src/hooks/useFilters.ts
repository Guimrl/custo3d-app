import { useEffect, useState } from "react";

/**
 * Filtros de uma tela, lembrados entre visitas (localStorage).
 * `setFilters(null)` volta aos valores iniciais.
 */
export const useFilters = <T extends Record<string, unknown>>(
  initial: T,
  storageKey: string,
) => {
  const [filters, setAllFilters] = useState<T>(() => {
    try {
      const saved = localStorage.getItem(storageKey);

      return saved ? { ...initial, ...JSON.parse(saved) } : initial;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(filters));
    } catch {
      // Lembrar filtros é só conveniência.
    }
  }, [filters, storageKey]);

  const setFilters = (patch: Partial<T> | null) =>
    setAllFilters((current) =>
      patch === null ? initial : { ...current, ...patch },
    );

  return [filters, setFilters] as const;
};

const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/** Busca ignorando maiúsculas e acentos ("Ímã" encontra "ima"). */
export const matches = (text: unknown, query: string): boolean =>
  !query || normalize(String(text ?? "")).includes(normalize(query.trim()));

/** Valores únicos e não vazios, em ordem alfabética. */
export const uniqueSorted = (values: (string | undefined | null)[]): string[] =>
  [...new Set(values.filter(Boolean) as string[])].sort((first, second) =>
    first.localeCompare(second, "pt-BR"),
  );
