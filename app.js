/* global APP_CONFIG */
const demoGifts = [
  { id: 'demo-1', name: 'Un petit lit douillet', description: 'Pour de longues siestes et de beaux rêves.', category: 'La chambre', priceCents: 24900, raisedCents: 8500, imageUrl: 'https://images.unsplash.com/photo-1540518614846-7eded433c457?auto=format&fit=crop&w=800&q=80', productUrl: '' },
  { id: 'demo-2', name: 'Le premier trousseau', description: 'De la douceur pour les tout premiers jours.', category: 'Les essentiels', priceCents: 6500, raisedCents: 0, imageUrl: 'https://images.unsplash.com/photo-1522771930-78848d9293e8?auto=format&fit=crop&w=800&q=80', productUrl: '' },
  { id: 'demo-3', name: 'Une jolie poussette', description: 'Pour partir à la découverte du monde, ensemble.', category: 'Les balades', priceCents: 39900, raisedCents: 17500, imageUrl: 'https://images.unsplash.com/photo-1522771753035-4a5e8cb3811a?auto=format&fit=crop&w=800&q=80', productUrl: '' },
  { id: 'demo-4', name: 'Le compagnon tout doux', description: 'Un ami à câliner à toute heure de la journée.', category: 'Les essentiels', priceCents: 3200, raisedCents: 0, imageUrl: 'https://images.unsplash.com/photo-1559454403-b8fb88521f11?auto=format&fit=crop&w=800&q=80', productUrl: '' },
  { id: 'demo-5', name: 'Un coin pour rêver', description: 'Un petit cocon pour les moments de calme.', category: 'La chambre', priceCents: 8900, raisedCents: 8900, imageUrl: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?auto=format&fit=crop&w=800&q=80', productUrl: '' },
  { id: 'demo-6', name: 'Le sac des aventures', description: 'Tout le nécessaire pour les sorties en famille.', category: 'Les balades', priceCents: 7900, raisedCents: 2000, imageUrl: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=800&q=80', productUrl: '' }
];
const state = { gifts: [], categories: [], category: '', search: '', password: '', admin: null };
const demo = !APP_CONFIG.apiUrl;
const grid = document.querySelector('#gift-grid');
const status = document.querySelector('#status');
const modal = document.querySelector('#modal');
const modalContent = document.querySelector('#modal-content');
const money = cents => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100);
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const safeUrl = value => /^https?:\/\/[^\s]+$/i.test(value || '') ? value : '';

async function api(action, data = {}) {
  if (!/^https:\/\//i.test(APP_CONFIG.apiUrl)) throw new Error('L’URL du service doit utiliser HTTPS.');
  const options = action ? { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action, ...data }) } : {};
  const response = await fetch(APP_CONFIG.apiUrl, options);
  if (!response.ok) throw new Error('Le service est momentanément indisponible.');
  const result = await response.json();
  if (!result.ok) throw new Error(result.error || 'Une erreur est survenue.');
  return result.data;
}

async function loadGifts() {
  status.textContent = 'Chargement de la liste…';
  try {
    const data = demo ? { gifts: structuredClone(demoGifts), categories: [...new Set(demoGifts.map(gift => gift.category))].map((name, index) => ({ id: `demo-category-${index}`, name })) } : await api();
    state.gifts = data.gifts;
    state.categories = data.categories;
    if (data.settings) {
      document.querySelector('#welcome-title').textContent = data.settings.welcomeTitle;
      document.querySelector('#welcome-text').textContent = data.settings.welcomeText;
    }
    status.textContent = '';
    render();
  } catch (error) { status.textContent = 'Impossible de charger la liste. Vérifiez la connexion et la configuration du service.'; }
}

function render() {
  document.querySelector('#gift-count').textContent = String(state.gifts.length).padStart(2, '0');
  const categories = [{ id: '', name: 'Tous' }, ...state.categories];
  if (!categories.some(category => category.id === state.category)) state.category = '';
  document.querySelector('#filters').innerHTML = categories.map(category => `<button class="filter${category.id === state.category ? ' active' : ''}" type="button" data-category="${escapeHtml(category.id)}" aria-pressed="${category.id === state.category}">${escapeHtml(category.name)}</button>`).join('');
  const selected = state.categories.find(category => category.id === state.category);
  const gifts = state.gifts.filter(gift => (!selected || gift.category === selected.name) && `${gift.name} ${gift.description} ${gift.category}`.toLocaleLowerCase('fr').includes(state.search.toLocaleLowerCase('fr')));
  grid.innerHTML = gifts.map(gift => {
    const remaining = Math.max(0, gift.priceCents - gift.raisedCents);
    const complete = gift.reserved || remaining === 0;
    const image = safeUrl(gift.imageUrl);
    const product = safeUrl(gift.productUrl);
    return `<article class="gift-card"><div class="gift-image">${image ? `<img src="${escapeHtml(image)}" alt="" loading="lazy" onerror="this.hidden=true">` : '<div class="image-fallback" aria-hidden="true">✳</div>'}<span class="badge${complete ? ' complete' : ''}">${complete ? 'Complet' : gift.raisedCents > 0 ? 'En cours' : 'À offrir'}</span></div><div class="gift-body"><div class="gift-category">${escapeHtml(gift.category || 'Pour bébé')}</div><h3 class="gift-title">${escapeHtml(gift.name)}</h3><p class="gift-description">${escapeHtml(gift.description || 'Une petite attention pour bébé.')}</p><div class="gift-meta"><span class="gift-price">${money(gift.priceCents)}</span><span class="gift-remaining">${complete ? 'Merci !' : `${money(remaining)} restants`}</span></div><div class="progress" role="progressbar" aria-label="Financement" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.min(100, Math.round(gift.raisedCents / gift.priceCents * 100))}"><span style="width:${Math.min(100, gift.raisedCents / gift.priceCents * 100)}%"></span></div><div class="gift-actions"><button class="gift-action" data-gift="${escapeHtml(gift.id)}" ${complete ? 'disabled' : ''}>${complete ? 'Déjà offert' : 'Participer ou offrir'} <span aria-hidden="true">↗</span></button>${product ? `<a class="product-link" href="${escapeHtml(product)}" target="_blank" rel="noopener noreferrer">Voir le cadeau ↗</a>` : ''}</div></div></article>`;
  }).join('');
  status.textContent = gifts.length ? '' : 'Aucun cadeau ne correspond à votre recherche.';
}

function showModal(content) { modalContent.innerHTML = content; if (!modal.open) modal.showModal(); }
function showError(form, error) { form.querySelector('.form-error').textContent = error.message || 'Une erreur est survenue.'; }
function cents(value) { const number = Number(String(value).replace(',', '.')); return Number.isFinite(number) ? Math.round(number * 100) : NaN; }

function showContribution(id) {
  const gift = state.gifts.find(item => item.id === id);
  if (!gift) return;
  const remaining = gift.priceCents - gift.raisedCents;
  showModal(`<p class="eyebrow">UNE PETITE ATTENTION</p><h2>${escapeHtml(gift.name)}</h2><p>Il reste ${money(remaining)} à financer. Votre engagement n’effectue aucun paiement en ligne.</p><form id="contribution-form" class="form-grid"><label>Votre prénom ou nom<input name="name" required maxlength="100" autocomplete="name"></label><label>Je souhaite<select name="type"><option value="participation">Participer à ce cadeau</option>${gift.raisedCents === 0 ? '<option value="reservation">Offrir ce cadeau en entier</option>' : ''}</select></label><label id="amount-label">Montant de la participation (€)<input name="amount" type="number" min="0.01" max="${remaining / 100}" step="0.01" required></label><div class="form-error" role="alert"></div><button class="primary" type="submit">Confirmer mon engagement ↗</button></form>`);
  const form = document.querySelector('#contribution-form');
  form.type.addEventListener('change', () => { const isReservation = form.type.value === 'reservation'; document.querySelector('#amount-label').hidden = isReservation; form.amount.required = !isReservation; });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const button = form.querySelector('button'); button.disabled = true;
    try {
      const reservation = form.type.value === 'reservation';
      const amountCents = reservation ? remaining : cents(form.amount.value);
      if (!Number.isSafeInteger(amountCents) || amountCents < 1 || amountCents > remaining) throw new Error('Veuillez saisir un montant valide.');
      let productUrl = '';
      if (demo) { gift.raisedCents += amountCents; gift.reserved = reservation; render(); }
      else { const result = await api('contribute', { giftId: id, name: form.elements.namedItem('name').value, type: form.type.value, amountCents }); productUrl = reservation ? safeUrl(result.productUrl) : ''; await loadGifts(); }
      showModal(`<p class="eyebrow">MERCI BEAUCOUP</p><h2>Votre attention nous touche<span class="heading-dot">.</span></h2><p>${demo ? 'Ceci est une démonstration : aucun engagement n’a été enregistré.' : 'Votre engagement a bien été enregistré. Aucun paiement n’a été effectué ; rapprochez-vous des parents pour les modalités pratiques.'}</p>${productUrl ? `<p><a class="product-link" href="${escapeHtml(productUrl)}" target="_blank" rel="noopener noreferrer">Acheter ce cadeau chez le vendeur ↗</a></p>` : ''}<button class="primary" id="done" type="button">Terminer</button>`);
      document.querySelector('#done').addEventListener('click', () => modal.close());
    } catch (error) { showError(form, error); button.disabled = false; }
  });
}

function showLogin() {
  if (demo) { showModal('<h2>Espace parents</h2><p>Connectez le service Apps Script pour gérer votre liste.</p>'); return; }
  showModal('<p class="eyebrow">POUR LES PARENTS</p><h2>Espace parents<span class="heading-dot">.</span></h2><p>Connectez-vous pour gérer la liste et consulter les engagements.</p><form id="login-form" class="form-grid"><label>Mot de passe<input name="password" type="password" required autocomplete="current-password" maxlength="256"></label><div class="form-error" role="alert"></div><button class="primary" type="submit">Se connecter ↗</button></form>');
  const form = document.querySelector('#login-form');
  form.addEventListener('submit', async event => {
    event.preventDefault(); const button = form.querySelector('button'); button.disabled = true;
    try { const password = form.password.value; await api('login', { password }); state.password = password; form.password.value = ''; await showAdmin(); } catch (error) { state.password = ''; showError(form, error); button.disabled = false; }
  });
}

async function showAdmin() {
  state.admin = await api('adminData', { password: state.password });
  const { gifts, contributions } = state.admin;
  showModal(`<p class="eyebrow">ESPACE PARENTS</p><h2>Votre liste<span class="heading-dot">.</span></h2><div class="admin-toolbar"><button class="primary" id="add-gift" type="button">+ Ajouter un cadeau</button><button class="secondary" id="logout" type="button">Se déconnecter</button></div><h3>Cadeaux (${gifts.length})</h3>${gifts.length ? gifts.map(gift => `<div class="admin-row"><div><strong>${escapeHtml(gift.name)}</strong><small>${money(gift.priceCents)} · ${money(gift.raisedCents)} engagés</small></div><div class="row-actions"><button class="secondary" data-edit="${escapeHtml(gift.id)}" type="button">Modifier</button><button class="danger" data-delete-gift="${escapeHtml(gift.id)}" type="button">Supprimer</button></div></div>`).join('') : '<p>Aucun cadeau pour le moment.</p>'}<h3>Engagements (${contributions.length})</h3>${contributions.length ? contributions.map(entry => `<div class="admin-row"><div><strong>${escapeHtml(entry.name)}</strong><small>${escapeHtml(gifts.find(gift => gift.id === entry.giftId)?.name || 'Cadeau supprimé')} · ${entry.type === 'reservation' ? 'Cadeau entier' : 'Participation'} · ${money(entry.amountCents)}</small></div><div class="row-actions"><button class="danger" data-delete-entry="${escapeHtml(entry.id)}" type="button">Supprimer</button></div></div>`).join('') : '<p>Aucun engagement pour le moment.</p>'}<div id="admin-error" class="form-error" role="alert"></div>`);
  const settingsButton = document.createElement('button');
  settingsButton.className = 'secondary'; settingsButton.type = 'button'; settingsButton.textContent = 'Personnaliser';
  settingsButton.addEventListener('click', () => showSettings().catch(error => { document.querySelector('#admin-error').textContent = error.message; }));
  document.querySelector('.admin-toolbar').prepend(settingsButton);
  document.querySelector('#add-gift').addEventListener('click', () => showGiftForm());
  document.querySelector('#logout').addEventListener('click', () => { state.password = ''; state.admin = null; modal.close(); });
  modalContent.querySelectorAll('[data-edit]').forEach(button => button.addEventListener('click', () => showGiftForm(gifts.find(gift => gift.id === button.dataset.edit))));
  modalContent.querySelectorAll('[data-delete-gift], [data-delete-entry]').forEach(button => button.addEventListener('click', async () => {
    if (!confirm('Confirmer la suppression ?')) return;
    button.disabled = true;
    try { await api(button.dataset.deleteGift ? 'deleteGift' : 'deleteContribution', { password: state.password, id: button.dataset.deleteGift || button.dataset.deleteEntry }); await loadGifts(); await showAdmin(); } catch (error) { document.querySelector('#admin-error').textContent = error.message; button.disabled = false; }
  }));
}

async function showSettings() {
  state.admin = await api('adminData', { password: state.password });
  const { settings, categories } = state.admin;
  showModal(`<p class="eyebrow">ESPACE PARENTS</p><h2>Personnaliser la liste<span class="heading-dot">.</span></h2><form id="settings-form" class="form-grid"><label>Titre d’accueil<input name="welcomeTitle" maxlength="120" required value="${escapeHtml(settings.welcomeTitle)}"></label><label>Texte d’accueil<textarea name="welcomeText" maxlength="500" required>${escapeHtml(settings.welcomeText)}</textarea></label><div class="form-error" role="alert"></div><div class="form-actions"><button class="primary" type="submit">Enregistrer les textes</button><button class="secondary" id="settings-back" type="button">Retour à la liste</button></div></form><h3>Catégories (${categories.length})</h3><button class="secondary" id="add-category" type="button">+ Ajouter une catégorie</button>${categories.map(category => `<div class="admin-row"><strong>${escapeHtml(category.name)}</strong><div class="row-actions"><button class="secondary" data-edit-category="${escapeHtml(category.id)}" type="button">Modifier</button><button class="danger" data-delete-category="${escapeHtml(category.id)}" type="button">Supprimer</button></div></div>`).join('')}<div id="settings-error" class="form-error" role="alert"></div>`);
  document.querySelector('#settings-back').addEventListener('click', () => showAdmin().catch(error => { document.querySelector('#settings-error').textContent = error.message; }));
  document.querySelector('#add-category').addEventListener('click', () => showCategoryForm());
  modalContent.querySelectorAll('[data-edit-category]').forEach(button => button.addEventListener('click', () => showCategoryForm(categories.find(category => category.id === button.dataset.editCategory))));
  modalContent.querySelectorAll('[data-delete-category]').forEach(button => button.addEventListener('click', async () => {
    if (!confirm('Supprimer cette catégorie ?')) return;
    button.disabled = true;
    try { await api('deleteCategory', { password: state.password, id: button.dataset.deleteCategory }); await loadGifts(); await showSettings(); } catch (error) { document.querySelector('#settings-error').textContent = error.message; button.disabled = false; }
  }));
  const form = document.querySelector('#settings-form');
  form.addEventListener('submit', async event => {
    event.preventDefault(); const button = form.querySelector('[type=submit]'); button.disabled = true;
    try { await api('saveSettings', { password: state.password, settings: { welcomeTitle: form.welcomeTitle.value, welcomeText: form.welcomeText.value } }); await loadGifts(); await showSettings(); } catch (error) { showError(form, error); button.disabled = false; }
  });
}

function showCategoryForm(category = {}) {
  showModal(`<p class="eyebrow">ESPACE PARENTS</p><h2>${category.id ? 'Modifier la catégorie' : 'Ajouter une catégorie'}</h2><form id="category-form" class="form-grid"><label>Nom de la catégorie<input name="name" maxlength="50" required value="${escapeHtml(category.name || '')}"></label><div class="form-error" role="alert"></div><div class="form-actions"><button class="primary" type="submit">Enregistrer</button><button class="secondary" id="cancel-category" type="button">Annuler</button></div></form>`);
  document.querySelector('#cancel-category').addEventListener('click', () => showSettings().catch(error => { document.querySelector('.form-error').textContent = error.message; }));
  const form = document.querySelector('#category-form');
  form.addEventListener('submit', async event => {
    event.preventDefault(); const button = form.querySelector('[type=submit]'); button.disabled = true;
    try { await api('saveCategory', { password: state.password, category: { id: category.id || '', name: form.elements.namedItem('name').value } }); await loadGifts(); await showSettings(); } catch (error) { showError(form, error); button.disabled = false; }
  });
}

function showGiftForm(gift = {}) {
  showModal(`<p class="eyebrow">ESPACE PARENTS</p><h2>${gift.id ? 'Modifier le cadeau' : 'Ajouter un cadeau'}</h2><form id="gift-form" class="form-grid"><label>Nom du cadeau<input name="name" maxlength="100" required value="${escapeHtml(gift.name || '')}"></label><label>Description<textarea name="description" maxlength="1000">${escapeHtml(gift.description || '')}</textarea></label><label>Catégorie<select name="category"><option value="">Sans catégorie</option>${state.admin.categories.map(category => `<option value="${escapeHtml(category.name)}"${category.name === gift.category ? ' selected' : ''}>${escapeHtml(category.name)}</option>`).join('')}</select></label><label>Prix (€)<input name="price" type="number" min="0.01" max="1000000" step="0.01" required value="${gift.priceCents ? gift.priceCents / 100 : ''}"></label><label>URL de l’image<input name="imageUrl" type="url" maxlength="2000" value="${escapeHtml(gift.imageUrl || '')}"></label><label>URL du cadeau<input name="productUrl" type="url" maxlength="2000" value="${escapeHtml(gift.productUrl || '')}"></label><div class="form-error" role="alert"></div><div class="form-actions"><button class="primary" type="submit">Enregistrer</button><button class="secondary" id="cancel-gift" type="button">Annuler</button></div></form>`);
  document.querySelector('#cancel-gift').addEventListener('click', () => showAdmin().catch(error => { document.querySelector('.form-error').textContent = error.message; }));
  const form = document.querySelector('#gift-form');
  form.addEventListener('submit', async event => {
    event.preventDefault(); const button = form.querySelector('[type=submit]'); button.disabled = true;
    try { await api('saveGift', { password: state.password, gift: { id: gift.id || '', name: form.elements.namedItem('name').value, description: form.description.value, category: form.category.value, priceCents: cents(form.price.value), imageUrl: form.imageUrl.value, productUrl: form.productUrl.value } }); await loadGifts(); await showAdmin(); } catch (error) { showError(form, error); button.disabled = false; }
  });
}

document.querySelector('#filters').addEventListener('click', event => { const button = event.target.closest('[data-category]'); if (button) { state.category = button.dataset.category; render(); } });
document.querySelector('#search').addEventListener('input', event => { state.search = event.target.value.trim(); render(); });
grid.addEventListener('click', event => { const button = event.target.closest('[data-gift]'); if (button) showContribution(button.dataset.gift); });
document.querySelector('#admin-open').addEventListener('click', () => state.password ? showAdmin().catch(() => { state.password = ''; showLogin(); }) : showLogin());
document.querySelector('#footer-admin').addEventListener('click', () => document.querySelector('#admin-open').click());
document.querySelector('#modal-close').addEventListener('click', () => modal.close());
document.querySelector('#demo-notice').hidden = !demo;
loadGifts();