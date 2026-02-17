const form = document.querySelector('#quick-form')
const recettesEl = document.querySelector('#recettes')
const ingredientsPrixEl = document.querySelector('#ingredients-prix')
const addIngredientBtn = document.querySelector('#add-ingredient')
const ingredientsListEl = document.querySelector('#ingredients-list')
const ingredientRowTemplate = document.querySelector('#ingredient-row-template')
const tagsDatalist = document.querySelector('#ingredient-tags')
const searchInput = document.querySelector('#search-input')
const searchMode = document.querySelector('#search-mode')
const priceForm = document.querySelector('#price-form')
const syncHelpEl = document.querySelector('#sync-help')

let recettesCache = []
let ingredientsCache = []

function apiBase() {
  return window.location.hostname.includes('github.io') ? '' : ''
}

function recipeCost(recette) {
  return (recette.ingredients || []).reduce(
    (sum, item) => sum + (Number(item.quantite) || 0) * (Number(item.ingredient?.prixUnitaire) || 0),
    0,
  )
}

function ingredientTags(recette) {
  const names = (recette.ingredients || []).map((i) => i.ingredient?.nom).filter(Boolean)
  return [...new Set(names)]
}

function normalize(value) {
  return String(value || '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
}

function filterRecettes(recettes) {
  const query = normalize(searchInput.value)
  const mode = searchMode.value

  if (!query) return recettes

  if (mode === 'ingredient') {
    return recettes.filter((r) => ingredientTags(r).some((tag) => normalize(tag).includes(query)))
  }

  return recettes.filter((r) => normalize(r.nom).includes(query) || normalize(r.typePlat).includes(query))
}

function updateTagSuggestions() {
  const tags = [...new Set(ingredientsCache.map((i) => i.nom).filter(Boolean))]
  tagsDatalist.innerHTML = tags.map((tag) => `<option value="${tag}"></option>`).join('')
}

function renderRecettes(recettes) {
  if (!recettes.length) {
    recettesEl.innerHTML = '<p>Aucune fiche pour le moment.</p>'
    return
  }

  recettesEl.innerHTML = recettes
    .map((r) => {
      const tags = ingredientTags(r)
      const total = recipeCost(r)

      return `
      <article class="recette">
        <h3>${r.nom}</h3>
        <p class="meta">${r.typePlat} • ${r.portions} portions • ${r.tempsPreparation} min</p>
        <div class="tag-list">
          ${tags.map((tag) => `<span class="tag">${tag}</span>`).join('') || '<span class="hint">Aucun ingrédient lié</span>'}
        </div>
        <pre>${r.instructions ?? ''}</pre>
        <p class="total">Total coût marchandise: ${total.toFixed(2)} €</p>
      </article>
    `
    })
    .join('')
}

async function fetchJSON(url, options = {}) {
  const res = await fetch(`${apiBase()}${url}`, options)
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText}`)
  }
  return res.json()
}

async function loadRecettes() {
  try {
    recettesCache = await fetchJSON('/api/recettes')
    renderRecettes(filterRecettes(recettesCache))
  } catch {
    recettesEl.innerHTML = '<p class="hint">API indisponible en mode statique. Lance le serveur Node pour enregistrer/synchroniser les données.</p>'
  }
}

function addIngredientRow(values = { nom: '', quantite: '', unite: 'kg' }) {
  const fragment = ingredientRowTemplate.content.cloneNode(true)
  const row = fragment.querySelector('.ingredient-row')
  row.querySelector('[data-field="nom"]').value = values.nom
  row.querySelector('[data-field="quantite"]').value = values.quantite
  row.querySelector('[data-field="unite"]').value = values.unite
  row.querySelector('[data-remove]').addEventListener('click', () => row.remove())
  ingredientsListEl.appendChild(fragment)
}

function collectIngredientsFromForm() {
  return [...ingredientsListEl.querySelectorAll('.ingredient-row')]
    .map((row) => ({
      nom: row.querySelector('[data-field="nom"]').value.trim(),
      quantite: Number(row.querySelector('[data-field="quantite"]').value),
      unite: row.querySelector('[data-field="unite"]').value.trim() || 'kg',
    }))
    .filter((item) => item.nom)
}

function renderPrixList() {
  if (!ingredientsCache.length) {
    ingredientsPrixEl.innerHTML = '<p class="hint">Aucun produit enregistré.</p>'
    return
  }

  ingredientsPrixEl.innerHTML = ingredientsCache
    .map(
      (item) => `
      <form class="price-item" data-id="${item.id}">
        <input name="nom" value="${item.nom}" required />
        <input name="unite" value="${item.unite}" required />
        <input name="prixUnitaire" type="number" min="0" step="0.01" value="${item.prixUnitaire}" required />
        <button type="submit" class="secondary">Mettre à jour</button>
      </form>
    `,
    )
    .join('')

  ingredientsPrixEl.querySelectorAll('form').forEach((formEl) => {
    formEl.addEventListener('submit', async (event) => {
      event.preventDefault()
      const id = Number(formEl.dataset.id)
      const payload = Object.fromEntries(new FormData(formEl).entries())
      payload.prixUnitaire = Number(payload.prixUnitaire)

      try {
        await fetchJSON(`/api/ingredients/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        await Promise.all([loadIngredients(), loadRecettes()])
      } catch {
        alert('Mise à jour impossible (API indisponible).')
      }
    })
  })
}

async function loadIngredients() {
  try {
    ingredientsCache = await fetchJSON('/api/ingredients')
    updateTagSuggestions()
    renderPrixList()
  } catch {
    ingredientsPrixEl.innerHTML = '<p class="hint">API indisponible en mode statique.</p>'
  }
}

addIngredientBtn.addEventListener('click', () => addIngredientRow())
searchInput.addEventListener('input', () => renderRecettes(filterRecettes(recettesCache)))
searchMode.addEventListener('change', () => renderRecettes(filterRecettes(recettesCache)))

form.addEventListener('submit', async (event) => {
  event.preventDefault()
  const formData = new FormData(form)
  const payload = Object.fromEntries(formData.entries())
  payload.ingredients = collectIngredientsFromForm()

  try {
    await fetchJSON('/api/recettes/quick', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    form.reset()
    form.portions.value = 1
    form.tempsPreparation.value = 0
    ingredientsListEl.innerHTML = ''
    addIngredientRow()
    await Promise.all([loadRecettes(), loadIngredients()])
  } catch {
    alert('Erreur lors de l\'enregistrement')
  }
})

priceForm.addEventListener('submit', async (event) => {
  event.preventDefault()
  const payload = Object.fromEntries(new FormData(priceForm).entries())
  payload.prixUnitaire = Number(payload.prixUnitaire)

  try {
    await fetchJSON('/api/ingredients/upsert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    priceForm.reset()
    priceForm.unite.value = 'kg'
    await Promise.all([loadIngredients(), loadRecettes()])
  } catch {
    alert('Enregistrement du prix impossible (API indisponible).')
  }
})

syncHelpEl.textContent = 'Pour synchroniser entre devices (Drive/cloud), il faut une base distante + authentification + sauvegarde chiffrée. Je peux te préparer ça au prochain passage.'

addIngredientRow()
loadRecettes()
loadIngredients()
