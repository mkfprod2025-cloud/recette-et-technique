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

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" })
})

app.post("/api/recettes/quick", async (req, res) => {
  const { nom, typePlat, note, portions, tempsPreparation } = req.body

  if (!nom || !typePlat || !note) {
    return res.status(400).json({ error: "nom, typePlat et note sont obligatoires" })
  }

  const recette = await prisma.recette.create({
    data: {
      nom: nom.trim(),
      typePlat: typePlat.trim(),
      description: note.trim(),
      instructions: note.trim(),
      portions: Number(portions) > 0 ? Number(portions) : 1,
      tempsPreparation: Number(tempsPreparation) >= 0 ? Number(tempsPreparation) : 0,
    },
  })

  res.status(201).json(recette)
})

app.get("/api/recettes", async (req, res) => {
  const recettes = await prisma.recette.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      ingredients: {
        include: {
          ingredient: true,
        },
      },
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

  const coutIngredients = recette.ingredients.reduce(
    (sum, item) => sum + item.quantite * item.ingredient.prixUnitaire,
    0,
  )

  const fiche = {
    id: recette.id,
    nom: recette.nom,
    typePlat: recette.typePlat,
    portions: recette.portions,
    tempsPreparation: recette.tempsPreparation,
    description: recette.description,
    instructions: recette.instructions,
    coutIngredients,
    createdAt: recette.createdAt,
    ingredients: recette.ingredients.map((item) => ({
      nom: item.ingredient.nom,
      quantite: item.quantite,
      unite: item.ingredient.unite,
      coutLigne: item.quantite * item.ingredient.prixUnitaire,
    })),
  }

  res.json(fiche)
})

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"))
})

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000")
})
