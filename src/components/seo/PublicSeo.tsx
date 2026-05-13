import { Helmet } from "react-helmet-async";
import { absoluteUrl } from "@/lib/site";

function resolveOgImage(ogImagePath?: string): string {
  const fallback = "/favicon-pubfy.png";
  const raw = (ogImagePath ?? fallback).trim() || fallback;
  if (/^https?:\/\//i.test(raw)) return raw;
  const path = raw.startsWith("/") ? raw : `/${raw}`;
  return absoluteUrl(path);
}

type PublicSeoProps = {
  title: string;
  description: string;
  path: string;
  /** Páginas autenticadas ou rascunho */
  noIndex?: boolean;
  /** OG/Twitter preview (fallback: favicon) */
  ogImagePath?: string;
};

/**
 * Meta tags PT-BR para páginas públicas (landing, institucional, blog).
 */
export function PublicSeo({
  title,
  description,
  path,
  noIndex,
  ogImagePath = "/favicon-pubfy.png",
}: PublicSeoProps) {
  const url = absoluteUrl(path);
  const image = resolveOgImage(ogImagePath);

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      {noIndex ? (
        <meta name="robots" content="noindex,nofollow" />
      ) : (
        <meta name="robots" content="index,follow" />
      )}
      <link rel="canonical" href={url} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:locale" content="pt_BR" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
    </Helmet>
  );
}
