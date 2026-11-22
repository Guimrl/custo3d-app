import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import PhotoCameraOutlinedIcon from "@mui/icons-material/PhotoCameraOutlined";
import {
  Avatar,
  Box,
  Button,
  CardMedia,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { api, errorMessage } from "../api";

interface PhotoProps {
  url?: string | null;
  alt: string;
  /** Lado da miniatura em px (padrão 40). */
  size?: number;
  /** Foto larga, 4:3, no topo de um card. */
  cover?: boolean;
}

/** Mostra a foto (abre em nova aba ao clicar); link vazio ou quebrado não mostra nada. */
export const Photo = ({ url, alt, size = 40, cover }: PhotoProps) => {
  const [brokenUrl, setBrokenUrl] = useState<string | null>(null);

  if (!url || brokenUrl === url) {
    return null;
  }

  if (cover) {
    return (
      <a href={url} target="_blank" rel="noreferrer" title="Abrir foto">
        <CardMedia
          component="img"
          image={url}
          alt={alt}
          loading="lazy"
          onError={() => setBrokenUrl(url)}
          sx={{ aspectRatio: "4 / 3", objectFit: "cover" }}
        />
      </a>
    );
  }

  return (
    <Avatar
      component="a"
      href={url}
      target="_blank"
      rel="noreferrer"
      title="Abrir foto"
      variant="rounded"
      src={url}
      alt={alt}
      slotProps={{ img: { onError: () => setBrokenUrl(url), loading: "lazy" } }}
      sx={{ width: size, height: size }}
    />
  );
};

/** Upload habilitado na API? Buscado uma vez e reaproveitado. */
let uploadEnabled: Promise<boolean> | null = null;

const isUploadEnabled = () => {
  uploadEnabled ??= api
    .get<{ enabled: boolean }>("/uploads/status")
    .then((status) => status.enabled)
    .catch(() => false);

  return uploadEnabled;
};

/** Reduz a imagem (lado maior até 1600 px) e devolve como data URL JPEG. */
const shrinkImage = async (file: File, maxSide = 1600, quality = 0.85) => {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Seu navegador não conseguiu processar a imagem.");
  }

  // PNG com transparência fica com fundo branco no JPEG.
  context.fillStyle = "#fff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

  return canvas.toDataURL("image/jpeg", quality);
};

interface PhotoFieldProps {
  value?: string;
  onChange: (url: string) => void;
}

/** Link da foto: colar uma URL ou enviar do PC (ImgBB, via API). */
export const PhotoField = ({ value, onChange }: PhotoFieldProps) => {
  const [canUpload, setCanUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    isUploadEnabled().then(setCanUpload);
  }, []);

  const upload = async (file?: File) => {
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Escolha um arquivo de imagem.");

      return;
    }

    setUploading(true);
    setError("");
    try {
      const image = await shrinkImage(file);
      const result = await api.post<{ url: string }>("/uploads/image", {
        image,
        name: file.name,
      });
      onChange(result.url);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setUploading(false);
      if (fileInput.current) {
        fileInput.current.value = "";
      }
    }
  };

  return (
    <Stack direction="row" spacing={2} sx={{ alignItems: "flex-start" }}>
      <Box
        sx={{
          width: 96,
          height: 96,
          flexShrink: 0,
          display: "grid",
          placeItems: "center",
          border: 1,
          borderStyle: "dashed",
          borderColor: "divider",
          borderRadius: 2,
          color: "text.disabled",
          overflow: "hidden",
        }}
      >
        {value ? <Photo url={value} alt="Prévia da foto" size={94} /> : <ImageOutlinedIcon />}
      </Box>
      <Stack spacing={1} sx={{ flex: 1 }}>
        <TextField
          type="url"
          placeholder="Cole o link da imagem (https://…)"
          value={value ?? ""}
          onChange={(event) => onChange(event.target.value.trim())}
          error={Boolean(error)}
          helperText={error || (canUpload ? undefined : "Para enviar do PC, configure o ImgBB na API.")}
        />
        <Stack direction="row" spacing={1}>
          {canUpload && (
            <>
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                hidden
                onChange={(event) => upload(event.target.files?.[0])}
              />
              <Button
                size="small"
                variant="outlined"
                startIcon={<PhotoCameraOutlinedIcon />}
                disabled={uploading}
                onClick={() => fileInput.current?.click()}
              >
                {uploading ? "Enviando…" : "Enviar do PC"}
              </Button>
            </>
          )}
          {value && (
            <Button size="small" color="error" onClick={() => onChange("")}>
              Remover foto
            </Button>
          )}
        </Stack>
        {uploading && (
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            Reduzindo e enviando a imagem…
          </Typography>
        )}
      </Stack>
    </Stack>
  );
};
