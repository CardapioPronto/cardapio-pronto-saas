# Sprint 2 — SEO, marca, LGPD no browser, loaders e testes públicos

Documento complementar ao código entregue no Sprint 2 (identidade Pubfy sem PNG pesado no navbar, metadados públicos, `robots.txt`/`sitemap.xml`, barra de cookies, chunking de dependências pesadas, E2E de fluxos públicos, loader inicial unificado).

---

## Precisa de ação da sua parte?

| Ação | Obrigatório? | Quando |
|------|---------------|--------|
| Definir `VITE_PUBLIC_SITE_URL` no deploy **self-hosted** (URL canónica sem barra final) | Opcional se o domínio for sempre `https://pubfy.com.br` (fallback e estáticos já usam esse host); obrigatório se usares staging noutro host | Cada ambiente com URL diferente |
| Garantir que `public/robots.txt` e `public/sitemap.xml` são servidos em produção | Sim | Qualquer pipeline que já publica `dist/` — são copiados pelo Vite para a raiz do site |
| CI / máquinas locais rodarem **`npx playwright install chromium`** antes de `playwright test` | Sim para E2E | Ver secção 4 |
| Rever textos legais da barra de cookies com jurídico | Opcional | Se quiseres categorias de consentimento mais finas |

Nada disto exige migrações Supabase adicionais **por causa do Sprint 2** em si.

---

## 1. URL canónica do site (`VITE_PUBLIC_SITE_URL`)

Usada por `PublicSeo` e `absoluteUrl()` em `src/lib/site.ts` para `canonical`, Open Graph e Twitter.

- **Produção em `https://pubfy.com.br`:** sem variável, no browser usa `window.location.origin` (correto). O fallback só em contexto sem `window` é `https://pubfy.com.br` (alinha ao `sitemap.xml` / `robots.txt`).
- **Outro domínio ou CDN com host diferente:** define no ambiente de build:

```text
VITE_PUBLIC_SITE_URL=https://seudominio.com.br
```

Sem barra final. Volta a fazer publish/build após alterar.

---

## 2. `robots.txt` e `sitemap.xml`

Ficheiros em `public/`:

- **`robots.txt`:** `Disallow` das rotas internas (`/dashboard`, `/admin`, `/pdv`, etc.) + `Sitemap: https://pubfy.com.br/sitemap.xml`
- **`sitemap.xml`:** lista de URLs públicas institucionais/marketing.

**Tu deves:**

1. Confirmar que o **domínio** no campo `Sitemap:` e nas `<loc>` do XML é o mesmo que Google Search Console vai usar — se mudares domínio, edita ambos ou passa a gerar o sitemap dinamicamente noutro sprint.
2. Após o primeiro deploy, no Google Search Console → **Sitemaps** → enviar `https://<teu-dominio>/sitemap.xml`.

---

## 3. Barra de cookies (LGPD)

- Chave `localStorage`: `pubfy_cookie_consent_v1`
- Componente: `CookieConsentBar` (dentro de `BrowserRouter` para os `Link` funcionarem)
- Não substitui parecer jurídico nem CMP com granularidade por categoria; é transparência + aceite simples para o primeiro release.

---

## 4. Testes E2E (Playwright)

Script no `package.json`:

```bash
npm run test:e2e
```

Isto faz **`npm run build`** e depois `playwright test` contra `vite preview`.

**Tu deves** em cada ambiente onde corres E2E:

```bash
npx playwright install chromium
```

Ou no CI oficial (GitHub Actions, etc.), usar a action oficial do Playwright ou o passo equivalente antes dos testes. Sem browsers instalados, os testes falham com “Executable doesn't exist”.

Ficheiros: `e2e/app-shell.spec.ts`, `e2e/public-flows.spec.ts`; config em `playwright.config.ts`.

---

## 5. Loader inicial (identidade única)

- **`index.html`:** `#pubfy-initial-loader` — Pubfy + anel verde (alinhado à paleta `--pubfy-*`).
- **`AppBootstrapLoader`:** mesmo conceito quando o React aparece antes do router (Supabase) e no fallback lazy de rotas (`AppRoutes`).

A pizza emoji foi removida desse fluxo.

---

## 6. Frontend — outros entregáveis rápidos (referência)

- **`PublicSeo`** + `react-helmet-async` nas páginas públicas combinadas com o `sitemap` (incluindo marketing: funcionalidades, demonstração, carreiras, soluções, etc.).
- **`PubfyWordmark`** no navbar/sidebar em substituição do PNG grande.
- **`vite.config.ts`:** `manualChunks` para `jspdf`, `jspdf-autotable`, `html2canvas`, `recharts`.
- **`index.html`:** `lang="pt-BR"`.

---

## 7. Checklist final do Sprint 2

- [ ] `VITE_PUBLIC_SITE_URL` definido em staging/preview que não seja `https://pubfy.com.br` (produção apex pode omitir se o deploy for sempre nesse host)
- [ ] Build de produção a servir `robots.txt` e `sitemap.xml` na raiz
- [ ] Sitemap submetido no Search Console (quando aplicável)
- [ ] Pipeline com `playwright install chromium` (ou `playwright install --with-deps`) antes de `npm run test:e2e`
- [ ] `npm run test:e2e` verde após deploy de branch de release
- [ ] Smoke manual: primeira visita mostre loader Pubfy contínuo (sem pizza) e barra de cookies até aceitar

---

## 8. O que ficou para outro momento (opcional)

- Sitemap dinâmico incluindo posts do blog (`/blog/:slug`) por SSR ou endpoint.
- Centro de preferências de cookies por categoria (analíticos vs essenciais).
- Ampliar E2E a fluxos autenticados (login real com conta de teste).
