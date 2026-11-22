import MoreVertIcon from "@mui/icons-material/MoreVert";
import { IconButton, ListItemIcon, ListItemText, Menu, MenuItem } from "@mui/material";
import { useState, type ReactNode } from "react";

export interface RowAction {
  label: string;
  icon?: ReactNode;
  danger?: boolean;
  onClick: () => void;
}

/** Ações de uma linha/card num menu "⋮", para a lista ficar limpa. */
export const RowActions = ({ actions }: { actions: RowAction[] }) => {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  return (
    <>
      <IconButton size="small" onClick={(event) => setAnchor(event.currentTarget)} aria-label="Ações">
        <MoreVertIcon fontSize="small" />
      </IconButton>
      <Menu anchorEl={anchor} open={anchor !== null} onClose={() => setAnchor(null)}>
        {actions.map((action) => (
          <MenuItem
            key={action.label}
            onClick={() => {
              setAnchor(null);
              action.onClick();
            }}
            sx={action.danger ? { color: "error.main" } : undefined}
          >
            {action.icon && (
              <ListItemIcon sx={action.danger ? { color: "error.main" } : undefined}>
                {action.icon}
              </ListItemIcon>
            )}
            <ListItemText>{action.label}</ListItemText>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};
