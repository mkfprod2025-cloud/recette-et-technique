# Recette & Technique

Mini application pour:
- prendre des notes très vite pendant un test/service,
- retrouver les notes en fiches techniques simples pour la mise en place,
- enregistrer les ingrédients un par un,
- maintenir les prix matières premières à jour,
- calculer automatiquement le coût marchandise de chaque recette.

## État actuel
- API Express + Prisma (SQLite).
- Saisie rapide (`nom`, `type`, `portions`, `temps`, `ingrédients`, `note brute`).
- Recherche dans les fiches par recette **ou** par ingrédient.
- Onglet "Mise à jour prix matière première" avec mise à jour instantanée des coûts recettes.
- Logo d'entête + métadonnées de partage + favicon/raccourci.
- UI sombre dorée pensée mobile-first.

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
