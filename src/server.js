import express from "express"
import { PrismaClient } from "@prisma/client"
import path from "path"
import { fileURLToPath } from "url"

const app = express()
const prisma = new PrismaClient()
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

app.use(express.json())
app.use(express.static(path.join(__dirname, "../public")))

function parseSteps(note) {
  return note
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
}

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" })
})

app.post("/api/recettes/quick", async (req, res) => {
  const { nom, typePlat, note, portions, tempsPreparation, prixVente } = req.body

  if (!nom?.trim() || !typePlat?.trim() || !note?.trim()) {
    return res.status(400).json({ error: "nom, typePlat et note sont obligatoires" })
  }

  const cleanPortions = Number(portions) > 0 ? Number(portions) : 1
  const cleanTemps = Number(tempsPreparation) >= 0 ? Number(tempsPreparation) : 0
  const cleanPrixVente = Number(prixVente) > 0 ? Number(prixVente) : null

  const recette = await prisma.recette.create({
    data: {
      nom: nom.trim(),
      typePlat: typePlat.trim(),
      description: note.trim(),
      instructions: parseSteps(note).join("\n"),
      portions: cleanPortions,
      tempsPreparation: cleanTemps,
      prixVente: cleanPrixVente,
    },
  })

  res.status(201).json(recette)
})

app.get("/api/recettes", async (req, res) => {
  const search = req.query.search?.toString().trim()
  const recettes = await prisma.recette.findMany({
    where: search
      ? {
          OR: [
            { nom: { contains: search } },
            { typePlat: { contains: search } },
            { description: { contains: search } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      nom: true,
      typePlat: true,
      portions: true,
      tempsPreparation: true,
      createdAt: true,
    },
  })

  res.json(recettes)
})

app.get("/api/recettes/:id/fiche", async (req, res) => {
  const recetteId = Number(req.params.id)

  if (!Number.isInteger(recetteId)) {
    return res.status(400).json({ error: "id invalide" })
  }

  const recette = await prisma.recette.findUnique({
    where: { id: recetteId },
    include: {
      ingredients: {
        include: {
          ingredient: true,
        },
      },
    },
  })

  if (!recette) {
    return res.status(404).json({ error: "Recette non trouvée" })
  }

  const ingredients = recette.ingredients.map((item) => {
    const coutLigne = item.quantite * item.ingredient.prixUnitaire
    return {
      nom: item.ingredient.nom,
      quantite: item.quantite,
      unite: item.ingredient.unite,
      prixUnitaire: item.ingredient.prixUnitaire,
      coutLigne,
    }
  })

  const coutIngredients = ingredients.reduce((sum, line) => sum + line.coutLigne, 0)
  const coutTotal = recette.coutTotal ?? coutIngredients
  const prixVente = recette.prixVente ?? null
  const margeBrute = prixVente ? prixVente - coutTotal : null
  const tauxRentabilite = prixVente ? (margeBrute / prixVente) * 100 : null

  res.json({
    id: recette.id,
    nom: recette.nom,
    typePlat: recette.typePlat,
    portions: recette.portions,
    tempsPreparation: recette.tempsPreparation,
    noteBrute: recette.description,
    instructions: recette.instructions,
    createdAt: recette.createdAt,
    coutTotal,
    prixVente,
    margeBrute,
    tauxRentabilite,
    ingredients,
  })
})

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"))
})

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000")
})
