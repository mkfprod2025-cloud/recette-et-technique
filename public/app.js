const form = document.querySelector('#quick-form')
const recettesEl = document.querySelector('#recettes')
const searchInput = document.querySelector('#search-input')
const searchButton = document.querySelector('#search-button')
const driveConfigEl = document.querySelector('#drive-config')

async function loadConfig() {
  const res = await fetch('/api/config')
  const config = await res.json()

  driveConfigEl.innerHTML = `Format choisi: <strong>${config.backupFormat}</strong> · Dossier Drive: <a href="${config.driveFolderUrl}" target="_blank" rel="noreferrer">ouvrir</a>`
}

async function loadRecettes(search = '') {
  const url = search ? `/api/recettes?search=${encodeURIComponent(search)}` : '/api/recettes'
  const res = await fetch(url)
  const recettes = await res.json()

  if (!recettes.length) {
    recettesEl.innerHTML = '<p>Aucune fiche pour le moment.</p>'
    return
  }

  recettesEl.innerHTML = recettes
    .map(
      (r) => `
      <article class="recette">
        <h3>${r.nom}</h3>
        <p class="meta">${r.typePlat} • ${r.portions} portions • ${r.tempsPreparation} min</p>
        <p class="meta">Prix/portion: ${Number(r.prixParPortion || 0).toFixed(2)} € • Poids/portion: ${r.poidsParPortionGrammes ? `${Math.round(r.poidsParPortionGrammes)} g` : 'N/A'}</p>
        <p class="tags">Tags: ${(r.tags || []).map((tag) => `#${tag}`).join(' ') || 'aucun'}</p>
        <pre>${r.instructions ?? ''}</pre>
      </article>
    `,
    )
    .join('')
}

form.addEventListener('submit', async (event) => {
  event.preventDefault()
  const formData = new FormData(form)
  const payload = Object.fromEntries(formData.entries())

  const res = await fetch('/api/recettes/quick', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    alert('Erreur lors de l\'enregistrement')
    return
  }

  form.reset()
  form.portions.value = 1
  form.tempsPreparation.value = 0
  loadRecettes(searchInput.value.trim())
})

searchButton.addEventListener('click', () => {
  loadRecettes(searchInput.value.trim())
})

searchInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault()
    loadRecettes(searchInput.value.trim())
  }
})

loadConfig()
loadRecettes()
