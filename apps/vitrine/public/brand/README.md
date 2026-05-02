# Brand Easyfest — canonical v4 fmono

**Version courante** : `logos-v4-fmono/` (validée Pamela Giordanengo, 2 mai 2026).

## Comment utiliser

Toujours consommer via le composant React `<Logo />` (`apps/vitrine/components/Logo.tsx`)
plutôt que de référencer un SVG en dur dans le JSX. Le composant :
- choisit la bonne variante (horizontal / vertical / mark / mono / dark)
- gère ratio + accessibilité (alt + role)
- évite la double déclaration de tailles

```tsx
import { Logo } from "@/components/Logo";

// Header global
<Logo variant="horizontal" size={36} priority />

// Splash, poster, page d'erreur
<Logo variant="vertical" size={120} />

// Favicon haute densité, watermark
<Logo variant="mark" size={48} />
```

## Palette (locked v4)

| Token | Hex | Usage |
|---|---|---|
| `--easyfest-coral` | `#FF5E5B` | Container, signature, CTA primary |
| `--easyfest-amber` | `#F4B860` | Dot core, accents, badges chauds |
| `--easyfest-ink` | `#1A1A1A` | Texte body, dark mode bg |
| `--easyfest-cream` | `#FFF8F0` | Fond principal |
| `--easyfest-pine` | `#2D5F4F` | Success, écoresponsable |

## Versions archivées

- `_archived-v1-icons/` : favicon/og v1 monogramme E (texte)
- `_archived-v1-logos/` : ancien wordmark sans squircle
- `_archived-v2-pam/` : variantes intermédiaires explorées avec Pamela
- `_archived-v3-finalistes/` : 3 finalistes du 1er mai (onde solaire / F monogramme / cercles entrelacés)

**Ne pas réutiliser ces fichiers** — ils sont conservés uniquement pour traçabilité de la décision design.

Voir `logos-v4-fmono/README.md` pour les détails techniques (marges, tailles minimales, interdits).
