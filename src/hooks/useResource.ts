import { useCallback, useEffect, useState } from "react";
import { api, errorMessage } from "../api";

/** Carrega uma lista da API ao montar, quando a url muda e a cada `reload()`. */
export const useResource = <T>(url: string) => {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let active = true;

    api
      .get<T[]>(url)
      .then((result) => {
        if (active) {
          setItems(result);
          setError("");
        }
      })
      .catch((caught) => {
        if (active) {
          setError(errorMessage(caught));
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [url, version]);

  const reload = useCallback(() => setVersion((current) => current + 1), []);

  return { items, loading, error, reload };
};
