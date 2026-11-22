import CalculateOutlinedIcon from "@mui/icons-material/CalculateOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import LogoutIcon from "@mui/icons-material/Logout";
import MenuIcon from "@mui/icons-material/Menu";
import PrintOutlinedIcon from "@mui/icons-material/PrintOutlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import SpaceDashboardOutlinedIcon from "@mui/icons-material/SpaceDashboardOutlined";
import ViewInArOutlinedIcon from "@mui/icons-material/ViewInArOutlined";
import WidgetsOutlinedIcon from "@mui/icons-material/WidgetsOutlined";
import {
  AppBar,
  Box,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { useState, type ReactNode } from "react";
import { NavLink, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "./auth/AuthProvider";
import { Loading } from "./components/common";
import { ThemeToggle } from "./components/ThemeToggle";
import { Calculator } from "./pages/Calculator";
import { Dashboard } from "./pages/Dashboard";
import { Equipment } from "./pages/Equipment";
import { Login } from "./pages/Login";
import { Prints } from "./pages/Prints";
import { Settings } from "./pages/Settings";
import { Spools } from "./pages/Spools";
import { Supplies } from "./pages/Supplies";

const DRAWER_WIDTH = 248;

interface Page {
  path: string;
  label: string;
  icon: ReactNode;
  element: ReactNode;
}

/** Menu, títulos e rotas. Tela nova = arquivo em pages/ + uma linha aqui. */
const PAGES: Page[] = [
  { path: "/", label: "Painel", icon: <SpaceDashboardOutlinedIcon />, element: <Dashboard /> },
  { path: "/calcular", label: "Nova impressão", icon: <CalculateOutlinedIcon />, element: <Calculator /> },
  { path: "/impressoes", label: "Impressões", icon: <ReceiptLongOutlinedIcon />, element: <Prints /> },
  { path: "/carreteis", label: "Carretéis", icon: <WidgetsOutlinedIcon />, element: <Spools /> },
  { path: "/materiais", label: "Outros materiais", icon: <Inventory2OutlinedIcon />, element: <Supplies /> },
  { path: "/equipamentos", label: "Equipamentos", icon: <PrintOutlinedIcon />, element: <Equipment /> },
  { path: "/configuracoes", label: "Configurações", icon: <SettingsOutlinedIcon />, element: <Settings /> },
];

const Brand = () => (
  <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", color: "primary.main" }}>
    <ViewInArOutlinedIcon />
    <Typography variant="h6" component="span" sx={{ color: "text.primary" }}>
      Custo 3D
    </Typography>
  </Stack>
);

const Navigation = ({ onNavigate }: { onNavigate: () => void }) => (
  <>
    <Toolbar>
      <Brand />
    </Toolbar>
    <List sx={{ px: 1.5 }}>
      {PAGES.map((page) => (
        <ListItemButton
          key={page.path}
          component={NavLink}
          to={page.path}
          end={page.path === "/"}
          onClick={onNavigate}
          sx={{
            borderRadius: 2,
            mb: 0.5,
            "&.active": {
              bgcolor: "action.selected",
              color: "primary.main",
              "& .MuiListItemIcon-root": { color: "primary.main" },
            },
          }}
        >
          <ListItemIcon sx={{ minWidth: 40 }}>{page.icon}</ListItemIcon>
          <ListItemText primary={page.label} />
        </ListItemButton>
      ))}
    </List>
  </>
);

const AppShell = () => {
  const { user, logout } = useAuth();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const currentPage = PAGES.find((page) =>
    page.path === "/"
      ? location.pathname === "/"
      : location.pathname.startsWith(page.path),
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <Drawer
        variant={isDesktop ? "permanent" : "temporary"}
        open={isDesktop || mobileOpen}
        onClose={() => setMobileOpen(false)}
        sx={{
          width: { md: DRAWER_WIDTH },
          flexShrink: 0,
          "& .MuiDrawer-paper": { width: DRAWER_WIDTH, borderRight: 1, borderColor: "divider" },
        }}
      >
        <Navigation onNavigate={() => setMobileOpen(false)} />
      </Drawer>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <AppBar
          position="sticky"
          elevation={0}
          color="inherit"
          sx={{ bgcolor: "background.default", borderBottom: 1, borderColor: "divider" }}
        >
          <Toolbar sx={{ gap: 1 }}>
            {!isDesktop && (
              <IconButton edge="start" onClick={() => setMobileOpen(true)} aria-label="Abrir menu">
                <MenuIcon />
              </IconButton>
            )}
            <Typography variant="subtitle1" sx={{ flex: 1, fontWeight: 500 }} noWrap>
              {currentPage?.label ?? "Custo 3D"}
            </Typography>
            <ThemeToggle />
            <Typography variant="body2" sx={{ color: "text.secondary", display: { xs: "none", sm: "block" } }}>
              {user?.name}
            </Typography>
            <Tooltip title="Sair">
              <IconButton onClick={logout}>
                <LogoutIcon />
              </IconButton>
            </Tooltip>
          </Toolbar>
        </AppBar>

        <Box component="main" sx={{ p: { xs: 2, sm: 3 }, maxWidth: 1280, mx: "auto" }}>
          <Routes>
            {PAGES.map((page) => (
              <Route key={page.path} path={page.path} element={page.element} />
            ))}
            {/* Mesma calculadora, carregando uma impressão existente para editar. */}
            <Route path="/calcular/:id" element={<Calculator />} />
          </Routes>
        </Box>
      </Box>
    </Box>
  );
};

/** Sem sessão mostra o login; com sessão, o app. */
export const App = () => {
  const { user, checking } = useAuth();

  if (checking) {
    return <Loading />;
  }

  return user ? <AppShell /> : <Login />;
};
