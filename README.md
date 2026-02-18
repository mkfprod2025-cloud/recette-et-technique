# Recette & Technique

Mini application pour:
- prendre des notes très vite pendant un test/service,
- retrouver les notes en fiches techniques simples pour la mise en place,
- utiliser une interface sombre à contraste doré.

## État actuel
- API Express + Prisma (SQLite).
- Saisie rapide (`nom`, `type`, `portions`, `temps`, `note brute`, `tags`).
- Recherche dans les fiches par nom de produit transformé (ex: `tartine campagnarde`) ou par tag ingrédient (ex: `jambon`, `poulet`).
- Colonnes calculées par portion (`prix/portion`, `poids/portion`) côté fiches enregistrées.
- Configuration de sauvegarde Drive en format `sheet` + export CSV compatible Google Sheets.
- UI sombre + accents dorés.

## Configuration Drive
Le dossier Drive est piloté via la variable d'environnement `DRIVE_FOLDER_URL`.

Exemple:
```bash
DRIVE_FOLDER_URL="https://drive.google.com/drive/folders/17WTq6otdy6e2YWQp0GkK0hkJcZK9qFxK?usp=sharing"
```

L'export se fait par `GET /api/recettes/export/sheet` (CSV importable dans Google Sheets).

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
