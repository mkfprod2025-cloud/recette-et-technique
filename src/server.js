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

function buildRecetteWithCosts(recette) {
  const ingredients = recette.ingredients ?? []
  const coutIngredients = ingredients.reduce(
    (sum, item) => sum + item.quantite * (item.ingredient?.prixUnitaire ?? 0),
    0,
  )

  return {
    ...recette,
    coutIngredients,
  }
}

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" })
})

app.post("/api/recettes/quick", async (req, res) => {
  const { nom, typePlat, note, portions, tempsPreparation, ingredients = [] } = req.body

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

  const cleanIngredients = Array.isArray(ingredients)
    ? ingredients
        .filter((item) => item?.nom)
        .map((item) => ({
          nom: String(item.nom).trim(),
          unite: String(item.unite || "kg").trim() || "kg",
          quantite: Number(item.quantite) > 0 ? Number(item.quantite) : 0,
        }))
    : []

  for (const item of cleanIngredients) {
    const ingredient = await prisma.ingredient.upsert({
      where: { nom: item.nom },
      update: { unite: item.unite || "kg" },
      create: {
        nom: item.nom,
        unite: item.unite || "kg",
        prixUnitaire: 0,
      },
    })

    await prisma.ingredientRecette.upsert({
      where: {
        recetteId_ingredientId: {
          recetteId: recette.id,
          ingredientId: ingredient.id,
        },
      },
      update: { quantite: item.quantite },
      create: {
        recetteId: recette.id,
        ingredientId: ingredient.id,
        quantite: item.quantite,
      },
    })
  }

  res.status(201).json(recette)
})

app.get("/api/ingredients", async (req, res) => {
  const ingredients = await prisma.ingredient.findMany({
    orderBy: [{ nom: "asc" }],
  })

  res.json(ingredients)
})

app.post("/api/ingredients/upsert", async (req, res) => {
  const { nom, unite, prixUnitaire } = req.body

  if (!nom || !unite || Number(prixUnitaire) < 0) {
    return res.status(400).json({ error: "nom, unite et prixUnitaire sont obligatoires" })
  }

  const ingredient = await prisma.ingredient.upsert({
    where: { nom: String(nom).trim() },
    update: {
      unite: String(unite).trim(),
      prixUnitaire: Number(prixUnitaire),
    },
    create: {
      nom: String(nom).trim(),
      unite: String(unite).trim(),
      prixUnitaire: Number(prixUnitaire),
    },
  })

  res.status(201).json(ingredient)
})

app.patch("/api/ingredients/:id", async (req, res) => {
  const id = Number(req.params.id)

  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: "id invalide" })
  }

  const { nom, unite, prixUnitaire } = req.body

  const ingredient = await prisma.ingredient.update({
    where: { id },
    data: {
      nom: String(nom).trim(),
      unite: String(unite).trim(),
      prixUnitaire: Number(prixUnitaire),
    },
  })

  res.json(ingredient)
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

  res.json(recettes.map(buildRecetteWithCosts))
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

  const withCosts = buildRecetteWithCosts(recette)

  const fiche = {
    id: withCosts.id,
    nom: withCosts.nom,
    typePlat: withCosts.typePlat,
    portions: withCosts.portions,
    tempsPreparation: withCosts.tempsPreparation,
    description: withCosts.description,
    instructions: withCosts.instructions,
    coutIngredients: withCosts.coutIngredients,
    createdAt: withCosts.createdAt,
    ingredients: withCosts.ingredients.map((item) => ({
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
