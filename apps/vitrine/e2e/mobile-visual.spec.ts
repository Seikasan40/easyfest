/**
 * Mobile-first visual & touch-target audit (Phase 4 V6).
 *
 * Pour chaque page critique × chaque viewport mobile/tablet, vérifie :
 *   1. Pas de scroll horizontal (document.scrollWidth ≤ viewport.width + 1px tolérance)
 *   2. Tous les boutons / liens d'action ≥ 44×44 px (WCAG 2.1 AA target size)
 *
 * Cible URL : NEXT_PUBLIC_APP_URL ou prod easyfest.app (auth-non requise pour pages publiques).
 * Pages auth-gated : on accède sans session pour tester le rendu de la page de login redirect
 * (le redirect est lui-même mobile-friendly et c'est ce qu'on veut auditer mobile).
 *
 * Lancer : pnpm --filter @easyfest/vitrine exec playwright test mobile-visual --project=chromium-mobile
 */
import { test, expect, type Page } from "@playwright/test";

const VIEWPORTS = [
  { name: "galaxy-s5", width: 360, height: 640 },
  { name: "iphone-14", width: 390, height: 844 },
  { name: "pixel-7", width: 412, height: 915 },
  { name: "ipad-portrait", width: 768, height: 1024 },
] as const;

const PUBLIC_PAGES = [
  "/",
  "/pricing",
  "/legal/privacy",
  "/legal/cgu",
  "/legal/mentions",
  "/auth/login",
  "/icmpaca",
  "/icmpaca/rdl-2026",
  "/icmpaca/rdl-2026/inscription",
  "/demande-festival",
];

// Pages auth-gated : redirigent vers /auth/login. On audite le rendu post-redirect (cf. middleware).
const AUTH_REDIRECTED_PAGES = [
  "/hub",
  "/v/icmpaca/rdl-2026",
  "/regie/icmpaca/rdl-2026",
  "/poste/icmpaca/rdl-2026",
];

const ALL_PAGES = [...PUBLIC_PAGES, ...AUTH_REDIRECTED_PAGES];

/**
 * Une zone tactile est exemptée des 44×44 si :
 *   - hidden / display:none (rect 0×0)
 *   - visually-hidden (sr-only)
 *   - ancres internes "#anchor" qui ne sont pas des CTA
 *   - éléments avec aria-hidden="true"
 *   - WCAG 2.5.5 clause "Inline" : liens inline (display:inline) à l'intérieur
 *     d'un bloc de texte (<p>, <li>, <span>...). Exemple : "contact dpo@x.fr"
 *     dans une mention légale. Ces liens héritent de la line-height du texte
 *     parent ; les agrandir à 44px les déforme visuellement et casse la lecture.
 *     WCAG exempte explicitement ce cas.
 *   - User Agent Control : checkboxes/radios natifs (taille forcée par OS)
 *
 * On teste uniquement les éléments visibles, agissants ET autonomes
 * (CTA, nav links display:block/inline-block, boutons avec padding).
 */
async function findUndersizedTouchTargets(page: Page) {
  return page.$$eval('button, a, [role="button"], [role="link"]', (els) => {
    return els
      .filter((el) => {
        const ariaHidden = el.getAttribute("aria-hidden") === "true";
        if (ariaHidden) return false;
        const style = window.getComputedStyle(el);
        if (style.display === "none" || style.visibility === "hidden") return false;
        // sr-only ?
        if (
          style.position === "absolute" &&
          style.width === "1px" &&
          style.height === "1px"
        ) {
          return false;
        }
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) return false;
        // Anchor "#xxx" interne, jamais clickable comme CTA
        const href = el.getAttribute("href");
        if (href && href.startsWith("#")) return false;

        // WCAG 2.5.5 "Inline" exception : si l'élément est en display:inline
        // ET que son parent direct est un élément de texte (p, li, span,
        // td, dd, summary, label, h1-h6), c'est un lien inline = exempté.
        const tag = el.tagName.toLowerCase();
        if (tag === "a" && style.display === "inline") {
          const parent = el.parentElement;
          const parentTag = parent?.tagName.toLowerCase() ?? "";
          const inlineTextContexts = new Set([
            "p",
            "li",
            "span",
            "td",
            "dd",
            "summary",
            "label",
            "h1",
            "h2",
            "h3",
            "h4",
            "h5",
            "h6",
            "strong",
            "em",
            "b",
            "i",
            "small",
            "code",
          ]);
          if (inlineTextContexts.has(parentTag)) return false;
        }

        return rect.width < 44 || rect.height < 44;
      })
      .map((el) => {
        const rect = el.getBoundingClientRect();
        return {
          tag: el.tagName.toLowerCase(),
          text: (el.textContent ?? "").trim().slice(0, 40),
          ariaLabel: el.getAttribute("aria-label") ?? null,
          href: el.getAttribute("href") ?? null,
          display: window.getComputedStyle(el).display,
          parentTag: el.parentElement?.tagName.toLowerCase() ?? null,
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        };
      });
  });
}

async function getDocumentWidth(page: Page): Promise<number> {
  return page.evaluate(() => document.documentElement.scrollWidth);
}

for (const viewport of VIEWPORTS) {
  test.describe(`mobile-visual @ ${viewport.name} (${viewport.width}×${viewport.height})`, () => {
    test.use({
      viewport: { width: viewport.width, height: viewport.height },
      // User-agent mobile pour que CSS mobile-first soit appliqué
      userAgent:
        viewport.width <= 768
          ? "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36"
          : "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    });

    for (const path of ALL_PAGES) {
      test(`${path} — pas de scroll horizontal`, async ({ page }) => {
        const response = await page.goto(path, { waitUntil: "domcontentloaded" });
        // Si la page est totalement KO (500), on échoue explicitement plutôt que via scroll-width
        expect(response?.status() ?? 0).toBeLessThan(500);
        // Attendre que le rendu soit stable avant de mesurer
        await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
        const docWidth = await getDocumentWidth(page);
        expect(docWidth, `${path}: docWidth=${docWidth} > viewport=${viewport.width}`).toBeLessThanOrEqual(
          viewport.width + 1,
        );
      });

      test(`${path} — tap targets ≥ 44×44`, async ({ page }) => {
        const response = await page.goto(path, { waitUntil: "domcontentloaded" });
        expect(response?.status() ?? 0).toBeLessThan(500);
        await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
        const undersized = await findUndersizedTouchTargets(page);
        // Tolérance : on accepte 0 elements undersized.
        expect(
          undersized,
          `${path}: ${undersized.length} undersized tap target(s):\n${JSON.stringify(undersized, null, 2)}`,
        ).toEqual([]);
      });
    }
  });
}
