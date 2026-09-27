import { translateCopy } from "../lib/i18n-copy.ts";
import { localeFromPath } from "../lib/i18n.ts";

const locale = localeFromPath(window.location.pathname);
if (locale !== "en") {
  const attributes = ["aria-label", "placeholder", "title"];

  function localizeNode(node: Node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const current = node.textContent ?? "";
      const translated = translateCopy(current, locale);
      if (translated !== current) node.textContent = translated;
      return;
    }
    if (!(node instanceof Element)) return;
    if (node.tagName === "SCRIPT" || node.tagName === "STYLE") return;
    for (const name of attributes) {
      const current = node.getAttribute(name);
      if (!current) continue;
      const translated = translateCopy(current, locale);
      if (translated !== current) node.setAttribute(name, translated);
    }
    for (const child of node.childNodes) localizeNode(child);
  }

  function localizeIsland(island: Element) {
    if (island.hasAttribute("ssr")) return;
    localizeNode(island);
  }

  document.querySelectorAll("astro-island").forEach(localizeIsland);
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      const target =
        mutation.target instanceof Element ? mutation.target : mutation.target.parentElement;
      const island = target?.closest("astro-island");
      if (!island || island.hasAttribute("ssr")) continue;
      if (mutation.type === "characterData") localizeNode(mutation.target);
      if (mutation.type === "attributes") localizeNode(mutation.target);
      for (const node of mutation.addedNodes) localizeNode(node);
    }
  });
  observer.observe(document.body, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: ["ssr", ...attributes],
  });
}
