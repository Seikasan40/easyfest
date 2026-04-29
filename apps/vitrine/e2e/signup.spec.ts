import { expect, test } from "@playwright/test";

test.describe("Vitrine ICMPACA — parcours public", () => {
  test("Home redirige vers ICMPACA et liste les festivals", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /Le festival pro/i })).toBeVisible();
    await page.getByRole("link", { name: /Découvrir RDL 2026/i }).click();
    await expect(page).toHaveURL(/\/icmpaca/);
    await expect(page.getByRole("heading", { name: /ICMPACA/i })).toBeVisible();
  });

  test("Page festival RDL 2026 affiche descriptif + CTA inscription", async ({ page }) => {
    await page.goto("/icmpaca/rdl-2026");
    await expect(page.getByRole("heading", { name: /Roots du Lac 2026/i })).toBeVisible();
    await expect(page.getByText(/Postes ouverts/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /S'inscrire comme bénévole/i })).toBeVisible();
  });

  test("Formulaire d'inscription : 5 étapes navigables", async ({ page }) => {
    await page.goto("/icmpaca/rdl-2026/inscription");
    await expect(page.getByText(/1. Identité/i)).toBeVisible();

    // Remplir étape 1
    await page.getByLabel(/Prénom/i).fill("Pam");
    await page.getByLabel(/^Nom/i).fill("Test");
    await page.getByLabel(/Email/i).fill("pam.test@example.com");
    await page.getByLabel(/Téléphone/i).fill("+33612345678");
    await page.getByLabel(/Date de naissance/i).fill("1990-05-15");

    await page.getByRole("button", { name: /Continuer/i }).click();
    await expect(page.getByText(/2\. Logistique/i)).toHaveClass(/text-brand-coral/);
  });
});
