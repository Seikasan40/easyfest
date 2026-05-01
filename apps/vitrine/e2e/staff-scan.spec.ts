import { expect, test } from "@playwright/test";

/**
 * OC-06+07 — happy path #5 : staff scan terrain (lecture QR + insert scan_event).
 *
 * Niveau actuel : SMOKE (redirects + page de scan visible une fois loggué).
 * Niveau cible : full E2E avec storageState Antoine (staff_scan) + QR JWT pré-signé.
 *
 * TODO post tests fumée OC-04+05+01 :
 *  • Helper `e2e/fixtures/qr-token.ts` qui signe un JWT via QR_HMAC_SECRET de test
 *    (kid + ttl) reproduisant la logique de l'edge function qr_sign
 *  • Compléter les `test.fixme` ci-dessous
 */

test.describe("Staff scan — accès et redirects (smoke)", () => {
  test("/staff/icmpaca/rdl-2026 non-auth redirige vers /auth/login", async ({ page }) => {
    await page.goto("/staff/icmpaca/rdl-2026");
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});

test.describe("Staff scan — parcours scanner complet", () => {
  test.fixme("Antoine scanne le QR d'un bénévole → entrée enregistrée", async ({ page }) => {
    // PRÉ-REQUIS :
    //   • antoine@easyfest.test seedé avec role staff_scan + is_entry_scanner=true sur RDL 2026
    //   • lucas@easyfest.test seedé comme bénévole avec assignment validated
    //   • Helper qr-token.ts génère un JWT valide pour lucas (event_id + user_id + nonce + kid)
    //
    // PARCOURS :
    // 1. login as antoine via storageState
    // 2. page.goto("/staff/icmpaca/rdl-2026")
    // 3. injecter le QR token directement (page.evaluate pour appeler l'API de scan)
    //    OU simuler le scan via input form si UI le permet
    // 4. attendre confirmation visuelle "✓ Lucas Martin — entrée enregistrée"
    // 5. assert : 1 row dans scan_events avec scan_kind='arrival', volunteer_user_id=lucas
    // 6. tenter rescan du même token → assert is_replay=true (anti-rejouage)
  });

  test.fixme("scan d'un QR expiré renvoie une erreur claire", async ({ page }) => {
    // Generate token with TTL passé → assert message "QR expiré" + pas d'insert scan_events
  });

  test.fixme("scan d'un user banni est bloqué", async ({ page }) => {
    // PRÉ-REQUIS : un user banni (table public.bans actif)
    // ASSERT : message "Accès refusé — banni" + pas d'insert
  });
});
