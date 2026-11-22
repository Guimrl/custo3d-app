import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Snackbar,
  type AlertColor,
} from "@mui/material";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface FeedbackContextValue {
  /** Abre um diálogo de confirmação; resolve true se o usuário confirmar. */
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  /** Mostra uma mensagem rápida no rodapé. */
  notify: (message: string, severity?: AlertColor) => void;
}

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

interface PendingConfirm extends ConfirmOptions {
  resolve: (confirmed: boolean) => void;
}

interface Notice {
  message: string;
  severity: AlertColor;
}

/** Diálogo de confirmação e snackbar compartilhados por todas as telas. */
export const FeedbackProvider = ({ children }: { children: ReactNode }) => {
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  const confirm = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => setPending({ ...options, resolve })),
    [],
  );

  const notify = useCallback(
    (message: string, severity: AlertColor = "success") =>
      setNotice({ message, severity }),
    [],
  );

  const close = (confirmed: boolean) => {
    pending?.resolve(confirmed);
    setPending(null);
  };

  const value = useMemo(() => ({ confirm, notify }), [confirm, notify]);

  return (
    <FeedbackContext.Provider value={value}>
      {children}

      <Dialog open={pending !== null} onClose={() => close(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{pending?.title}</DialogTitle>
        {pending?.message && (
          <DialogContent>
            <DialogContentText>{pending.message}</DialogContentText>
          </DialogContent>
        )}
        <DialogActions>
          <Button onClick={() => close(false)}>
            {pending?.cancelLabel ?? "Cancelar"}
          </Button>
          <Button
            variant="contained"
            color={pending?.danger ? "error" : "primary"}
            onClick={() => close(true)}
            autoFocus
          >
            {pending?.confirmLabel ?? "Confirmar"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={notice !== null}
        autoHideDuration={5000}
        onClose={() => setNotice(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity={notice?.severity}
          variant="filled"
          onClose={() => setNotice(null)}
        >
          {notice?.message}
        </Alert>
      </Snackbar>
    </FeedbackContext.Provider>
  );
};

export const useFeedback = () => {
  const context = useContext(FeedbackContext);

  if (!context) {
    throw new Error("useFeedback precisa estar dentro do FeedbackProvider.");
  }

  return context;
};
