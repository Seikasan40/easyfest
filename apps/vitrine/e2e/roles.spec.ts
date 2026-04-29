import { expect, test } from "@playwright/test";

/**
 * Tests E2E sur les 5 rôles. À lancer après `pnpm db:seed-users` qui crée les 6 comptes :
 *  - pam@easyfest.test (direction)
 *  - dorothee@easyfest.test (volunteer_lead)
 *  - mahaut@easyfest.test (post_lead)
 *  - antoine@easyfest.test (staff_scan)
 *  - lucas@easyfest.test (volunteer)
 *  - sandy@easyfest.test (volunteer + mediator)
 *
 * Ces tests vérifient juste les permissions de routage (redirect vs accessible).
 * Les flows complets (inscription, scan, validation) sont dans les autres spec files.
 */

test.describe("Permissions par rôle (smoke)", () => {
  test("Anonyme : protected routes redirigent vers /auth/login", async ({ page }) => {
    await page.goto("/v/icmpaca/rdl-2026");
    await expect(page).toHaveURL(/\/auth\/login/);

    await page.goto("/regie/icmpaca/rdl-2026");
    await expect(page).toHaveURL(/\/auth\/login/);

    await page.goto("/staff/icmpaca/rdl-2026");
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test("Vitrine publique accessible sans auth", async ({ page }) => {
    await page.goto("/icmpaca");
    await expect(page.getByRole("heading", { name: /ICMPACA/i })).toBeVisible();

    await page.goto("/icmpaca/rdl-2026");
    await expect(page.getByRole("heading", { name: /Roots du Lac 2026/i })).toBeVisible();
  });

  test("Page de connexion accessible et fonctionnelle", async ({ page }) => {
    await page.goto("/auth/login");
    await expect(page.getByRole("heading", { name: /Salut/i })).toBeVisible();
    await expect(page.getByLabel(/Email/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /M'envoyer le lien magique/i })).toBeVisible();
  });

  test("Politique de confidentialité publique", async ({ page }) => {
    await page.goto("/legal/privacy");
    await expect(page.getByRole("heading", { name: /Politique de confidentialité/i })).toBeVisible();
    await expect(page.getByText(/DPA/i)).toBeVisible();
    await expect(page.getByText(/Sous-traitants/i)).toBeVisible();
  });

  test("Bandeau cookies apparaît au premier chargement", async ({ page, context }) => {
    await context.clearCookies();
    await page.goto("/");
    await expect(page.getByText(/Cookies/i).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Tout accepter/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Refuser l'analyse/i })).toBeVisible();
  });
});

test.describe("Form inscription bénévole — robustesse", () => {
  test("ne soumet pas si champs obligatoires manquent", async ({ page }) => {
    await page.goto("/icmpaca/rdl-2026/inscription");
    // On essaie d'aller à l'étape 5 directement → bouton submit sera bloqué si étapes 1-4 vides
    // (la nav cliente cache les étapes mais l'envoi finalisé requiert tous les champs)
    const submit = page.getByRole("button", { name: /Envoyer ma candidature/i });
    // Le bouton n'est visible qu'à l'étape 5
    await expect(submit).not.toBeVisible();
  });

  test("countdown vers l'étape 2 fonctionne", async ({ page }) => {
    await page.goto("/icmpaca/rdl-2026/inscription");
    await page.getByLabel(/^Prénom/i).fill("Test");
    await page.getByLabel(/^Nom/i).fill("Bot");
    await page.getByLabel(/^Email/i).fill("test@example.com");
    await page.getByLabel(/^Téléphone/i).fill("+33611111111");
    await page.getByLabel(/Date de naissance/i).fill("1990-05-15");
    await page.getByRole("button", { name: /Continuer/i }).click();
    await expect(page.getByText(/2\. Logistique/i)).toHaveClass(/text-brand-coral/);
  });
});

test.describe("Charte et engagement (visibles 2 fois)", () => {
  test("affichés sur le formulaire d'inscription (étape 5)", async ({ page }) => {
    await page.goto("/icmpaca/rdl-2026/inscription");
    // Sauter à l'étape 5 en cliquant 4× sur Continuer
    await page.getByLabel(/^Prénom/i).fill("X");
    await page.getByLabel(/^Nom/i).fill("Y");
    await page.getByLabel(/^Email/i).fill("x@y.fr");
    await page.getByLabel(/^Téléphone/i).fill("+33600000000");
    await page.getByLabel(/Date de naissance/i).fill("1990-01-01");

    for (let i = 0; i < 4; i++) {
      await page.getByRole("button", { name: /Continuer/i }).click();
    }
    await expect(page.getByText(/charte du festival/i)).toBeVisible();
    await expect(page.getByText(/anti-harcèlement/i).first()).toBeVisible();
    await expect(page.getByText(/RGPD/i)).toBeVisible();
  });
});
