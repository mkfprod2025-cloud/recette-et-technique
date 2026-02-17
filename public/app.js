const form = document.querySelector('#quick-form')
const recettesEl = document.querySelector('#recettes')

async function loadRecettes() {
  const res = await fetch('/api/recettes')
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
  loadRecettes()
})

loadRecettes()
