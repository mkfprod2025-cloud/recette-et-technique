const form = document.querySelector('#quick-form')
const listEl = document.querySelector('#list')
const ficheEl = document.querySelector('#fiche')
const searchEl = document.querySelector('#search')
const printBtn = document.querySelector('#print-btn')

let searchDebounce

const euro = (value) => `${Number(value || 0).toFixed(2)} €`
const pct = (value) => `${Number(value || 0).toFixed(1)} %`

async function fetchRecettes() {
  const search = searchEl.value.trim()
  const query = search ? `?search=${encodeURIComponent(search)}` : ''
  const res = await fetch(`/api/recettes${query}`)
  return res.json()
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
  const res = await fetch(`/api/recettes/${id}/fiche`)
  if (!res.ok) {
    ficheEl.className = 'fiche-empty'
    ficheEl.textContent = 'Impossible de charger la fiche.'
    return
  }

  const f = await res.json()
  const ingredients = f.ingredients.length
    ? `<ul>${f.ingredients
        .map((i) => `<li>${i.nom}: ${i.quantite} ${i.unite} (${euro(i.coutLigne)})</li>`)
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
}

form.addEventListener('submit', async (event) => {
  event.preventDefault()
  const payload = Object.fromEntries(new FormData(form).entries())

  const res = await fetch('/api/recettes/quick', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    alert('Erreur: recette non enregistrée')
    return
  }

  const created = await res.json()
  form.reset()
  form.portions.value = 1
  form.tempsPreparation.value = 0
  await renderList()
  await renderFiche(created.id)
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

renderList()
