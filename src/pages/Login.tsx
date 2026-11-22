import ViewInArOutlinedIcon from "@mui/icons-material/ViewInArOutlined";
import {
  Alert,
  Box,
  Button,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useState, type FormEvent } from "react";
import { errorMessage } from "../api";
import { useAuth } from "../auth/AuthProvider";
import { ThemeToggle } from "../components/ThemeToggle";

/** Não há cadastro nem "esqueci a senha": os usuários são criados direto no banco da API. */
export const Login = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await login(username.trim(), password);
    } catch (caught) {
      setError(errorMessage(caught));
      setBusy(false);
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", p: 2 }}>
      <Paper component="form" onSubmit={submit} sx={{ width: "min(400px, 100%)", p: 4 }}>
        <Stack spacing={2.5}>
          <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", color: "primary.main" }}>
              <ViewInArOutlinedIcon />
              <Typography variant="h6" sx={{ color: "text.primary" }}>
                Custo 3D
              </Typography>
            </Stack>
            <ThemeToggle />
          </Stack>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            Entre para acessar o sistema.
          </Typography>
          <TextField
            label="Usuário"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            autoFocus
            required
          />
          <TextField
            label="Senha"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
          {error && <Alert severity="error">{error}</Alert>}
          <Button type="submit" variant="contained" size="large" disabled={busy}>
            {busy ? "Entrando…" : "Entrar"}
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
};
