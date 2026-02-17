# Recette & Technique

Application orientée cuisine pro pour:
- écrire très vite des recettes pendant test/service,
- retrouver ensuite une fiche technique claire pour la mise en place,
- travailler en thème sombre contrasté doré.

## Correctifs de publication (GitHub Pages)
- Ajout de fichiers racine `styles.css` et `app.js` pour éviter les 404 (`/styles.css`, `/app.js`).
- Ajout d'un `favicon.svg` pour supprimer l'erreur 404 favicon.
- `index.html` charge maintenant des chemins stables (`./styles.css`, `./app.js`) et script en `type="module"`.

## Fonctionnalités
- Saisie express (nom, type, portions, temps, prix vente optionnel, note brute).
- Liste + recherche recettes.
- Fiche technique: instructions, coût, marge, rentabilité, ingrédients.
- Impression de fiche.
- Raccourci `Ctrl+Entrée`.
- Fallback local: si l'API est indisponible, l'app passe en mode localStorage.

## Démarrage local (avec API)
```bash
npm install
cp .env.example .env
npm run db:push
npm run dev
```

Puis ouvrir `http://localhost:3000`.

## Démarrage statique (sans API)
Ouvrir `index.html` (ou publier le repo en pages statiques).
L'app fonctionne alors en mode localStorage.
