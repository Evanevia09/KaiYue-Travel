import { parse, serialize } from "parse5";
import { translateCopy } from "./i18n-copy.ts";
import { localePath, type Locale } from "./i18n.ts";

type Node = {
  nodeName: string;
  tagName?: string;
  value?: string;
  attrs?: { name: string; value: string }[];
  childNodes?: Node[];
};

const TEXT_ATTRS = new Set(["alt", "aria-label", "placeholder", "title"]);
const PUBLIC_PATH =
  /^(\/(?:about|contact|corporate|faq|privacy|terms|booking\/confirmation|business\/|services\/)|\/$)/;

function localLink(value: string, locale: Locale) {
  if (!value.startsWith("/") || value.startsWith("//")) return value;
  const [, path = "", suffix = ""] = value.match(/^([^?#]*)(.*)$/) ?? [];
  if (!path || !PUBLIC_PATH.test(path)) return value;
  if (
    path.startsWith("/pt/") ||
    path === "/pt" ||
    path.startsWith("/zh-Hant/") ||
    path === "/zh-Hant"
  )
    return value;
  return localePath(path, locale) + suffix;
}

function visit(node: Node, locale: Exclude<Locale, "en">, inIsland = false): void {
  const island = inIsland || node.tagName === "astro-island";
  if (node.nodeName === "#text" && node.value && !inIsland) {
    node.value = translateCopy(node.value, locale);
  }
  if (node.attrs) {
    const meta =
      node.tagName === "meta" &&
      node.attrs.some(
        (attr) =>
          (attr.name === "name" && attr.value === "description") ||
          (attr.name === "property" &&
            (attr.value === "og:title" || attr.value === "og:description")),
      );
    for (const attr of node.attrs) {
      if (
        attr.name === "href" &&
        node.tagName === "a" &&
        !node.attrs.some((item) => item.name === "hreflang")
      ) {
        attr.value = localLink(attr.value, locale);
      } else if (!island && (TEXT_ATTRS.has(attr.name) || (meta && attr.name === "content"))) {
        attr.value = translateCopy(attr.value, locale);
      }
    }
  }
  if (
    node.tagName === "script" &&
    node.attrs?.some((attr) => attr.name === "type" && attr.value === "application/ld+json")
  ) {
    const child = node.childNodes?.[0];
    if (child?.value) {
      try {
        const localizeJson = (value: unknown): unknown => {
          if (typeof value === "string") {
            const translated = translateCopy(value, locale);
            if (translated !== value) return translated;
            if (value.startsWith("http")) {
              const url = new URL(value);
              if (PUBLIC_PATH.test(url.pathname)) {
                url.pathname = localLink(url.pathname, locale);
                return url.toString();
              }
            }
            return value;
          }
          if (Array.isArray(value)) return value.map(localizeJson);
          if (value && typeof value === "object") {
            return Object.fromEntries(
              Object.entries(value).map(([key, part]) => [key, localizeJson(part)]),
            );
          }
          return value;
        };
        child.value = JSON.stringify(localizeJson(JSON.parse(child.value))).replace(
          /</g,
          "\\u003c",
        );
      } catch {
        // Preserve malformed structured data unchanged.
      }
    }
    return;
  }
  if (node.tagName === "script" || node.tagName === "style") return;
  for (const child of node.childNodes ?? []) visit(child, locale, island);
}

export function localizeHtml(html: string, locale: Locale): string {
  if (locale === "en") return html;
  const document = parse(html);
  visit(document as unknown as Node, locale);
  return serialize(document);
}
