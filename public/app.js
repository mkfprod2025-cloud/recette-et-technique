const form = document.querySelector('#quick-form')
const listEl = document.querySelector('#list')
const ficheEl = document.querySelector('#fiche')
const searchEl = document.querySelector('#search')
const printBtn = document.querySelector('#print-btn')
const modeIndicator = document.querySelector('#mode-indicator')

let searchDebounce
let useLocalFallback = false

const STORAGE_KEY = 'recette-technique-local'
const euro = (value) => `${Number(value || 0).toFixed(2)} €`
const pct = (value) => `${Number(value || 0).toFixed(1)} %`

function readLocal() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

function writeLocal(recettes) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(recettes))
}

async function api(path, options) {
  const response = await fetch(path, options)
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }
  return response.json()
}

function ensureModeLabel() {
  modeIndicator.textContent = useLocalFallback
    ? 'Mode local (sans API)'
    : 'Mode API'
}

async function detectMode() {
  try {
    await api('/api/health')
    useLocalFallback = false
  } catch {
    useLocalFallback = true
  }
  ensureModeLabel()
}

function filterRecettes(recettes, search) {
  if (!search) return recettes
  const s = search.toLowerCase()
  return recettes.filter(
    (r) =>
      r.nom.toLowerCase().includes(s) ||
      r.typePlat.toLowerCase().includes(s) ||
      (r.description || '').toLowerCase().includes(s),
  )
}

async function fetchRecettes() {
  const search = searchEl.value.trim()
  if (useLocalFallback) {
    return filterRecettes(readLocal(), search)
  }

  const query = search ? `?search=${encodeURIComponent(search)}` : ''
  return api(`/api/recettes${query}`)
}

async function createRecette(payload) {
  if (useLocalFallback) {
    const recettes = readLocal()
    const id = recettes.length ? Math.max(...recettes.map((r) => r.id)) + 1 : 1
    const created = {
      id,
      nom: payload.nom.trim(),
      typePlat: payload.typePlat.trim(),
      description: payload.note.trim(),
      instructions: payload.note.trim(),
      portions: Number(payload.portions) > 0 ? Number(payload.portions) : 1,
      tempsPreparation: Number(payload.tempsPreparation) >= 0 ? Number(payload.tempsPreparation) : 0,
      prixVente: Number(payload.prixVente) > 0 ? Number(payload.prixVente) : null,
      createdAt: new Date().toISOString(),
      ingredients: [],
    }
    writeLocal([created, ...recettes])
    return created
  }

  return api('/api/recettes/quick', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

async function fetchFiche(id) {
  if (useLocalFallback) {
    const recette = readLocal().find((r) => Number(r.id) === Number(id))
    if (!recette) throw new Error('not found')
    const coutTotal = recette.coutTotal ?? 0
    const margeBrute = recette.prixVente ? recette.prixVente - coutTotal : null
    const tauxRentabilite = recette.prixVente ? (margeBrute / recette.prixVente) * 100 : null
    return {
      ...recette,
      noteBrute: recette.description,
      coutTotal,
      margeBrute,
      tauxRentabilite,
      ingredients: recette.ingredients || [],
    }
  }

  return api(`/api/recettes/${id}/fiche`)
}

async function renderList() {
  const recettes = await fetchRecettes()
  if (!recettes.length) {
    listEl.innerHTML = '<p class="meta">Aucune recette trouvée.</p>'
    return
  }

  listEl.innerHTML = recettes
    .map(
      (r) => `
      <button class="recette-item" data-id="${r.id}">
        <strong>${r.nom}</strong><br />
        <span class="meta">${r.typePlat} • ${r.portions} portions • ${r.tempsPreparation} min</span>
      </button>
    `,
    )
    .join('')
}

async function renderFiche(id) {
  try {
    const f = await fetchFiche(id)
    const ingredients = f.ingredients.length
      ? `<ul>${f.ingredients
          .map((i) => `<li>${i.nom}: ${i.quantite} ${i.unite} (${euro(i.coutLigne || 0)})</li>`)
          .join('')}</ul>`
      : '<p class="meta">Aucun ingrédient lié pour le moment.</p>'

    ficheEl.className = 'fiche'
    ficheEl.innerHTML = `
      <h3>${f.nom}</h3>
      <p class="meta">${f.typePlat} • ${f.portions} portions • ${f.tempsPreparation} min</p>
      <div class="kpi">
        <div><strong>Coût total</strong><br/>${euro(f.coutTotal)}</div>
        <div><strong>Prix vente</strong><br/>${f.prixVente ? euro(f.prixVente) : '—'}</div>
        <div><strong>Marge brute</strong><br/>${f.margeBrute !== null ? euro(f.margeBrute) : '—'}</div>
        <div><strong>Rentabilité</strong><br/>${f.tauxRentabilite !== null ? pct(f.tauxRentabilite) : '—'}</div>
      </div>
      <h4>Instructions</h4>
      <pre>${f.instructions || ''}</pre>
      <h4>Ingrédients</h4>
      ${ingredients}
    `
  } catch {
    ficheEl.className = 'fiche-empty'
    ficheEl.textContent = 'Impossible de charger la fiche.'
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault()
  const payload = Object.fromEntries(new FormData(form).entries())

  try {
    const created = await createRecette(payload)
    form.reset()
    form.portions.value = 1
    form.tempsPreparation.value = 0
    await renderList()
    await renderFiche(created.id)
  } catch {
    alert('Erreur: recette non enregistrée')
  }
})

form.addEventListener('keydown', (event) => {
  if (event.ctrlKey && event.key === 'Enter') {
    form.requestSubmit()
  }
})

listEl.addEventListener('click', (event) => {
  const target = event.target.closest('[data-id]')
  if (target) {
    renderFiche(target.dataset.id)
  }
})

searchEl.addEventListener('input', () => {
  clearTimeout(searchDebounce)
  searchDebounce = setTimeout(() => {
    renderList()
  }, 200)
})

printBtn.addEventListener('click', () => window.print())

await detectMode()
await renderList()
