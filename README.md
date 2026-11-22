# Custo 3D Front

Front-end da calculadora de custo de impressão 3D: carretéis de filamento, outros materiais, equipamentos, impressões/orçamentos e precificação. Consome a [custo3d-api](https://github.com/Guimrl/custo3d-api).

React 19 + TypeScript + Vite, com componentes do [Material UI](https://mui.com/material-ui/) (customizações com o `styled` do MUI).

## Rodar localmente

1. Suba a custo3d-api em http://localhost:3333 (`npm run dev` lá).
2. `npm install`
3. `npm run dev`. O front abre em http://localhost:5173 e repassa `/api/...` para a API (proxy do Vite).

## Scripts

| Comando             | O que faz                                      |
| ------------------- | ---------------------------------------------- |
| `npm run dev`       | Servidor de desenvolvimento com recarregamento |
| `npm run build`     | Verifica tipos e gera `dist/`                  |
| `npm run preview`   | Serve o `dist/` localmente                     |
| `npm run typecheck` | Verifica os tipos                              |
| `npm run lint`      | ESLint com correção automática                 |

## Estrutura

    src/
    ├── main.tsx              tema, providers e roteador
    ├── App.tsx               layout (menu lateral + barra) e rotas
    ├── api.ts                cliente HTTP + sessão (token no localStorage)
    ├── theme.ts              tema claro/escuro do MUI
    ├── auth/                 login e sessão
    ├── hooks/                useResource (listas da API) e useFilters
    ├── lib/                  tipos, cálculo (cópia do da API) e formatação
    ├── components/           peças reutilizáveis (formulário, filtros, fotos, cores, preços…)
    └── pages/                uma tela por arquivo

`src/lib/types.ts` e `src/lib/calc.ts` são cópias da API: se um campo ou uma regra de cálculo mudar lá, copie para cá.

## Deploy (Vercel)

O workflow `.github/workflows/deploy-vercel.yml` publica em produção quando um PR de `dev` é mergeado na `main`.
Configure no GitHub os secrets `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` e `VERCEL_TOKEN`, e no projeto da Vercel a variável `API_URL` com o endereço da API (veja `.env.example`).
O `vercel.json` faz todas as rotas caírem no `index.html` (necessário para o roteamento do React).

## Autor

- **Guilherme Amaral**: [Perfil](https://github.com/Guimrl)
