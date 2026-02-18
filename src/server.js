import express from "express"
import { PrismaClient } from "@prisma/client"
import path from "path"
import { fileURLToPath } from "url"

const app = express()
const prisma = new PrismaClient()
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DRIVE_FOLDER_URL =
  process.env.DRIVE_FOLDER_URL ||
  "https://drive.google.com/drive/folders/17WTq6otdy6e2YWQp0GkK0hkJcZK9qFxK?usp=sharing"
const DRIVE_BACKUP_FORMAT = "sheet"

app.use(express.json())
app.use(express.static(path.join(__dirname, "../public")))

function splitTags(rawTags = "") {
  return [...new Set(
    rawTags
      .split(",")
      .map((tag) => tag.trim().toLowerCase())
      .filter((tag) => tag.length > 1),
  )]
}

function extractNameTags(name = "") {
  return [...new Set(
    name
      .toLowerCase()
      .split(/[^\p{L}\p{N}]+/u)
      .map((word) => word.trim())
      .filter((word) => word.length > 2),
  )]
}

function quantityToGrams(quantity, unit) {
  const normalizedUnit = (unit || "").toLowerCase()

  if (["kg", "kilo", "kilogramme"].includes(normalizedUnit)) {
    return quantity * 1000
  }

  if (["g", "gramme", "grammes"].includes(normalizedUnit)) {
    return quantity
  }

  if (["l", "litre", "litres"].includes(normalizedUnit)) {
    return quantity * 1000
  }

  if (["ml"].includes(normalizedUnit)) {
    return quantity
  }

  return null
}

function computeRecetteMetrics(recette) {
  const coutIngredients = recette.ingredients.reduce(
    (sum, item) => sum + item.quantite * item.ingredient.prixUnitaire,
    0,
  )

  const totalPoids = recette.ingredients.reduce((sum, item) => {
    const grams = quantityToGrams(item.quantite, item.ingredient.unite)
    return grams == null ? sum : sum + grams
  }, 0)

  const prixParPortion = recette.portions > 0 ? coutIngredients / recette.portions : 0
  const poidsParPortion = recette.portions > 0 && totalPoids > 0 ? totalPoids / recette.portions : null

  return {
    coutIngredients,
    poidsTotalGrammes: totalPoids > 0 ? totalPoids : null,
    prixParPortion,
    poidsParPortionGrammes: poidsParPortion,
  }
}

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" })
})

app.get("/api/config", (req, res) => {
  res.json({
    driveFolderUrl: DRIVE_FOLDER_URL,
    backupFormat: DRIVE_BACKUP_FORMAT,
  })
})

app.post("/api/recettes/quick", async (req, res) => {
  const { nom, typePlat, note, portions, tempsPreparation, tags } = req.body

  if (!nom || !typePlat || !note) {
    return res.status(400).json({ error: "nom, typePlat et note sont obligatoires" })
  }

  const mergedTags = [...new Set([...splitTags(tags), ...extractNameTags(nom)])]

  const recette = await prisma.recette.create({
    data: {
      nom: nom.trim(),
      typePlat: typePlat.trim(),
      description: note.trim(),
      instructions: note.trim(),
      portions: Number(portions) > 0 ? Number(portions) : 1,
      tempsPreparation: Number(tempsPreparation) >= 0 ? Number(tempsPreparation) : 0,
      tags: {
        create: mergedTags.map((tag) => ({
          tag: {
            connectOrCreate: {
              where: { label: tag },
              create: { label: tag },
            },
          },
        })),
      },
    },
    include: {
      tags: {
        include: {
          tag: true,
        },
      },
    },
  })

  res.status(201).json(recette)
})

app.get("/api/recettes", async (req, res) => {
  const search = (req.query.search || "").toString().trim().toLowerCase()

  const recettes = await prisma.recette.findMany({
    where: search
      ? {
          OR: [
            { nom: { contains: search } },
            { typePlat: { contains: search } },
            {
              tags: {
                some: {
                  tag: {
                    label: { contains: search },
                  },
                },
              },
            },
            {
              ingredients: {
                some: {
                  OR: [
                    {
                      ingredient: {
                        nom: { contains: search },
                      },
                    },
                    {
                      ingredient: {
                        tags: {
                          some: {
                            tag: {
                              label: { contains: search },
                            },
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      tags: {
        include: {
          tag: true,
        },
      },
      ingredients: {
        include: {
          ingredient: {
            include: {
              tags: {
                include: {
                  tag: true,
                },
              },
            },
          },
        },
      },
    },
  })

  res.json(
    recettes.map((recette) => {
      const metrics = computeRecetteMetrics(recette)
      return {
        ...recette,
        tags: recette.tags.map((item) => item.tag.label),
        ...metrics,
      }
    }),
  )
})

app.get("/api/recettes/export/sheet", async (req, res) => {
  const recettes = await prisma.recette.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      tags: { include: { tag: true } },
      ingredients: {
        include: {
          ingredient: true,
        },
      },
    },
  })

  const headers = [
    "Nom",
    "Type",
    "Portions",
    "TempsPreparation(min)",
    "Tags",
    "PrixParPortion",
    "PoidsParPortion(g)",
    "CoutIngredients",
  ]

  const rows = recettes.map((recette) => {
    const metrics = computeRecetteMetrics(recette)
    return [
      recette.nom,
      recette.typePlat,
      recette.portions,
      recette.tempsPreparation,
      recette.tags.map((item) => item.tag.label).join("|"),
      metrics.prixParPortion.toFixed(2),
      metrics.poidsParPortionGrammes?.toFixed(0) || "",
      metrics.coutIngredients.toFixed(2),
    ]
  })

  const toCsvCell = (value) => `"${String(value).replaceAll('"', '""')}"`
  const csv = [headers, ...rows].map((line) => line.map(toCsvCell).join(",")).join("\n")

  res.setHeader("Content-Type", "text/csv; charset=utf-8")
  res.setHeader("Content-Disposition", 'attachment; filename="recettes-drive-sheet.csv"')
  res.send(csv)
})

app.get("/api/recettes/:id/fiche", async (req, res) => {
  const recetteId = Number(req.params.id)

  if (!Number.isInteger(recetteId)) {
    return res.status(400).json({ error: "id invalide" })
  }

  const recette = await prisma.recette.findUnique({
    where: { id: recetteId },
    include: {
      tags: {
        include: {
          tag: true,
        },
      },
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

  const metrics = computeRecetteMetrics(recette)

  const fiche = {
    id: recette.id,
    nom: recette.nom,
    typePlat: recette.typePlat,
    portions: recette.portions,
    tempsPreparation: recette.tempsPreparation,
    description: recette.description,
    instructions: recette.instructions,
    tags: recette.tags.map((item) => item.tag.label),
    coutIngredients: metrics.coutIngredients,
    prixParPortion: metrics.prixParPortion,
    poidsParPortionGrammes: metrics.poidsParPortionGrammes,
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
