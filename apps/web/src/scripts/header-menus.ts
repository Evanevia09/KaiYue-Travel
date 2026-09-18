/**
 * Header menu behaviour, shared by the desktop nav dropdowns, the language
 * switch, and the mobile panel.
 *
 * These are all native `<details>` elements, which give us the open/close
 * mechanics and keyboard support for free. What they do not give us — and what
 * this module adds — is the behaviour people expect from a nav bar:
 *
 * - one menu open at a time: opening a dropdown collapses whichever was open
 * - a click anywhere outside the open menu closes it
 * - Escape closes it and hands focus back to the summary that owned the focus
 * - following a link closes it, so a menu never lingers behind the next page
 * - tabbing out of the header abandons a desktop dropdown
 * - the mobile panel always reopens collapsed
 *
 * Everything here is additive: with JS disabled the menus still open, close,
 * and expand through native `<details>` behaviour.
 */

const DESKTOP_MENU_SELECTOR = "details.nav-dropdown, details.lang-switch";
const MOBILE_MENU_SELECTOR = "details.mobile-nav";
const MOBILE_GROUP_SELECTOR = "details.mobile-nav__group";

function initHeaderMenus(): void {
  const header = document.querySelector<HTMLElement>("header.site-header");
  if (!header) return;

  const desktopMenus = Array.from(
    header.querySelectorAll<HTMLDetailsElement>(DESKTOP_MENU_SELECTOR),
  );
  const mobileMenu = header.querySelector<HTMLDetailsElement>(MOBILE_MENU_SELECTOR);
  const mobileGroups = mobileMenu
    ? Array.from(mobileMenu.querySelectorAll<HTMLDetailsElement>(MOBILE_GROUP_SELECTOR))
    : [];
  const mobileToggle = mobileMenu?.querySelector<HTMLElement>("summary");

  // Menus that are mutually exclusive: opening one closes every other. The
  // mobile panel is deliberately not in here — it is the container the groups
  // live in, so expanding a group must not collapse the panel around it.
  const peers: HTMLDetailsElement[] = [...desktopMenus, ...mobileGroups];

  const closePeers = (except: HTMLDetailsElement | null = null): void => {
    for (const menu of peers) {
      if (menu !== except && menu.open) menu.open = false;
    }
  };

  const closeMobilePanel = (restoreFocus = false): void => {
    if (!mobileMenu?.open) return;
    mobileMenu.open = false;
    for (const group of mobileGroups) group.open = false;
    if (restoreFocus) mobileToggle?.focus();
  };

  const isAnythingOpen = (): boolean =>
    Boolean(mobileMenu?.open) || peers.some((menu) => menu.open);

  for (const menu of peers) {
    menu.addEventListener("toggle", () => {
      if (menu.open) closePeers(menu);
    });
  }

  mobileMenu?.addEventListener("toggle", () => {
    if (mobileMenu.open) {
      closePeers();
      return;
    }
    // Collapse submenus on close so the panel always reopens in its short form.
    for (const group of mobileGroups) group.open = false;
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !isAnythingOpen()) return;
    if (mobileMenu?.open) {
      closeMobilePanel(true);
      return;
    }
    const owner =
      document.activeElement instanceof Element ? document.activeElement.closest("details") : null;
    const summary = owner?.querySelector("summary");
    closePeers();
    if (summary instanceof HTMLElement) summary.focus();
  });

  document.addEventListener("click", (event) => {
    if (!isAnythingOpen()) return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    const followedLink = Boolean(target.closest("a"));

    for (const menu of peers) {
      if (!menu.open) continue;
      // Close when the click landed outside this menu, or when it followed a
      // link inside it (the next page must not have a menu hanging open).
      if (!menu.contains(target) || followedLink) menu.open = false;
    }

    if (mobileMenu?.open && (!mobileMenu.contains(target) || followedLink)) {
      closeMobilePanel();
    }
  });

  // Tabbing out of the header abandons a desktop dropdown. The mobile panel is
  // dismissed by Escape, an outside tap, or following a link instead, so it is
  // left alone here.
  document.addEventListener("focusin", (event) => {
    const target = event.target;
    if (!(target instanceof Node) || header.contains(target)) return;
    for (const menu of desktopMenus) {
      if (menu.open) menu.open = false;
    }
  });

  const desktopQuery = window.matchMedia("(min-width: 880px)");
  desktopQuery.addEventListener("change", (event) => {
    if (event.matches) {
      closeMobilePanel();
      return;
    }
    closePeers();
  });
}

initHeaderMenus();
