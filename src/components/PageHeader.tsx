import { Box, Stack, Typography } from "@mui/material";
import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
}

export const PageHeader = ({ title, subtitle, actions }: PageHeaderProps) => (
  <Stack
    direction={{ xs: "column", sm: "row" }}
    spacing={2}
    sx={{ mb: 3, justifyContent: "space-between", alignItems: { sm: "flex-end" } }}
  >
    <Box>
      <Typography variant="h5" component="h1">
        {title}
      </Typography>
      {subtitle && (
        <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
          {subtitle}
        </Typography>
      )}
    </Box>
    {actions && (
      <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", rowGap: 1 }}>
        {actions}
      </Stack>
    )}
  </Stack>
);
