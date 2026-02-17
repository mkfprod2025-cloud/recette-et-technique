# Recette & Technique

Mini application pour:
- prendre des notes très vite pendant un test/service,
- retrouver les notes en fiches techniques simples pour la mise en place,
- utiliser une interface sombre à contraste doré.

## État actuel
- API Express + Prisma (SQLite).
- Saisie rapide (`nom`, `type`, `portions`, `temps`, `note brute`).
- Liste des fiches enregistrées.
- Endpoint fiche détaillée (`/api/recettes/:id/fiche`) avec calcul de coût ingrédients (si ingrédients liés).
- UI sombre + accents dorés.

## Démarrage
```bash
npm install
cp .env.example .env
npm run db:push
npm run dev
```

Puis ouvrir `http://localhost:3000`.

## Scripts
- `npm run dev` : démarre le serveur
- `npm run db:push` : pousse le schéma Prisma vers SQLite
- `npm run migrate` : migration Prisma nommée

## Prochaine étape recommandée
- Ajouter une vue "Mise en place" (checklist/quantités par poste).
- Structurer la note brute en sections (ingrédients, étapes, points critiques).
- Ajouter un mode "gants" (grosses zones tactiles + raccourcis clavier).
