# Recette & Technique

Application de cuisine orientée service:
- saisie ultra-rapide de notes de recette pendant test/service,
- consultation en fiche technique claire pour la mise en place,
- interface sombre avec contraste doré pour confort visuel.

## Fonctionnalités
- **Saisie express**: nom, type, portions, temps, prix de vente (optionnel), note brute.
- **Liste et recherche** des recettes enregistrées.
- **Fiche technique détaillée** par recette:
  - instructions,
  - ingrédients liés,
  - coût total,
  - marge brute,
  - taux de rentabilité.
- **Impression** de la fiche technique.
- **Raccourci service**: `Ctrl + Entrée` pour enregistrer rapidement.

## Stack
- Node.js + Express
- Prisma + SQLite
- Front statique (HTML/CSS/JS)

## Installation
```bash
npm install
cp .env.example .env
npm run db:push
npm run dev
```

Ouvrir ensuite: `http://localhost:3000`

## API principale
- `GET /api/health`
- `POST /api/recettes/quick`
- `GET /api/recettes?search=...`
- `GET /api/recettes/:id/fiche`

## Objectif produit couvert
Cette version couvre le flux demandé:
1. **écrire vite** pendant le service,
2. **retrouver facilement** une fiche exploitable,
3. travailler avec un **thème sombre doré**.
