// ─── State ────────────────────────────────────────────────────────────────────

const state = {
  recipes: [],
  evergreen: [],
  history: [],
  slots: [],
  evergreenToggles: {}, // { [id]: boolean }
  _slotCounter: 0,
};

// ─── Utilities ────────────────────────────────────────────────────────────────

function uid() {
  return 'slot-' + (++state._slotCounter);
}

function getWeekRange() {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const diffToMon = (day === 0) ? -6 : 1 - day;
  const mon = new Date(now);
  mon.setDate(now.getDate() + diffToMon);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  const fmt = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${fmt(mon)} – ${fmt(sun)}`;
}

function showToast(msg, duration = 2800) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('visible');
  setTimeout(() => toast.classList.remove('visible'), duration);
}

// ─── Boot ─────────────────────────────────────────────────────────────────────

async function init() {
  try {
    const [recipes, evergreen] = await Promise.all([
      fetch('recipes.json').then(r => r.json()),
      fetch('evergreen.json').then(r => r.json()),
    ]);
    const history = JSON.parse(localStorage.getItem('mealPrepHistory') || '[]');

    state.recipes = recipes;
    state.evergreen = evergreen;
    state.history = history;

    // Default all evergreen toggles ON
    evergreen.forEach(item => {
      state.evergreenToggles[item.id] = true;
    });

    renderEvergreen();
    addSlot(); // start with one empty slot
    renderSlots();
    renderHistory();
    bindUI();
  } catch (err) {
    console.error('Init failed:', err);
    showToast('Could not load data. Is the server running?');
  }
}

// ─── Evergreen ────────────────────────────────────────────────────────────────

function renderEvergreen() {
  const container = document.getElementById('evergreen-list');
  container.innerHTML = '';
  state.evergreen.forEach(item => {
    const isOn = state.evergreenToggles[item.id] !== false;
    const row = document.createElement('div');
    row.className = 'evergreen-row';
    row.innerHTML = `
      <span class="evergreen-name">${item.name}</span>
      <label class="toggle-switch" aria-label="Toggle ${item.name}">
        <input type="checkbox" class="toggle-input" data-ev-id="${item.id}" ${isOn ? 'checked' : ''} />
        <span class="toggle-track">
          <span class="toggle-thumb"></span>
        </span>
      </label>
    `;
    container.appendChild(row);
  });

  container.querySelectorAll('.toggle-input').forEach(input => {
    input.addEventListener('change', e => {
      const id = e.target.dataset.evId;
      state.evergreenToggles[id] = e.target.checked;
    });
  });
}

// ─── Slots ────────────────────────────────────────────────────────────────────

function addSlot() {
  state.slots.push({
    id: uid(),
    categoryFilter: 'wild-card',
    selectedRecipeId: null,
    lockedRecipeId: null,
    isLocked: false,
  });
}

const CATEGORIES = [
  { value: 'basic-base',      label: 'Basic Base' },
  { value: 'pasta',           label: 'Pasta' },
  { value: 'soups',           label: 'Soups' },
  { value: 'burgers',         label: 'Burgers' },
  { value: 'freezer-section', label: 'Freezer Section' },
  { value: 'entrees',         label: 'Entrees' },
  { value: 'evergreen',       label: 'Evergreen' },
];

function getFilteredRecipes(categoryFilter) {
  if (categoryFilter === 'wild-card') return state.recipes;
  return state.recipes.filter(r => (r.tags || []).includes(categoryFilter));
}

function renderSlots() {
  const container = document.getElementById('dish-slots');
  container.innerHTML = '';

  state.slots.forEach((slot, idx) => {
    const filtered = getFilteredRecipes(slot.categoryFilter);

    const row = document.createElement('div');
    row.className = `slot-row${slot.isLocked ? ' slot-locked' : ''}`;
    row.dataset.slotId = slot.id;

    // Category filter dropdown
    const catOptions = [
      `<option value="wild-card" ${slot.categoryFilter === 'wild-card' ? 'selected' : ''}>Wild Card (any)</option>`,
      ...CATEGORIES.map(cat =>
        `<option value="${cat.value}" ${slot.categoryFilter === cat.value ? 'selected' : ''}>${cat.label}</option>`
      ),
    ].join('');

    // Recipe selection dropdown
    const recipeOptions = [
      `<option value="" ${!slot.selectedRecipeId ? 'selected' : ''}>— Select recipe —</option>`,
      ...filtered.map(r => `<option value="${r.id}" ${slot.selectedRecipeId === r.id ? 'selected' : ''}>${r.title}</option>`),
    ].join('');

    row.innerHTML = `
      <span class="slot-number">${idx + 1}</span>
      <select class="slot-category-select" data-slot-id="${slot.id}" aria-label="Category filter">
        ${catOptions}
      </select>
      <select class="slot-recipe-select" data-slot-id="${slot.id}" aria-label="Recipe selection">
        ${recipeOptions}
      </select>
      <button class="btn-icon btn-lock ${slot.isLocked ? 'locked' : ''}" data-slot-id="${slot.id}" title="${slot.isLocked ? 'Unlock slot' : 'Lock slot'}">
        ${slot.isLocked ? '🔒' : '🔓'}
      </button>
      <button class="btn-icon btn-spin" data-slot-id="${slot.id}" title="Re-roll this slot">
        ↻
      </button>
      <button class="btn-icon btn-remove" data-slot-id="${slot.id}" title="Remove slot">
        ×
      </button>
    `;

    container.appendChild(row);
  });

  // Bind slot events
  container.querySelectorAll('.slot-category-select').forEach(sel => {
    sel.addEventListener('change', e => {
      const slot = getSlot(e.target.dataset.slotId);
      if (slot) {
        slot.categoryFilter = e.target.value;
        slot.selectedRecipeId = null; // reset recipe when filter changes
        renderSlots();
      }
    });
  });

  container.querySelectorAll('.slot-recipe-select').forEach(sel => {
    sel.addEventListener('change', e => {
      const slot = getSlot(e.target.dataset.slotId);
      if (slot) {
        slot.selectedRecipeId = e.target.value || null;
        if (slot.isLocked) slot.lockedRecipeId = slot.selectedRecipeId;
      }
    });
  });

  container.querySelectorAll('.btn-lock').forEach(btn => {
    btn.addEventListener('click', e => {
      const slot = getSlot(e.currentTarget.dataset.slotId);
      if (slot) {
        slot.isLocked = !slot.isLocked;
        slot.lockedRecipeId = slot.isLocked ? slot.selectedRecipeId : null;
        renderSlots();
      }
    });
  });

  container.querySelectorAll('.btn-spin').forEach(btn => {
    btn.addEventListener('click', e => {
      const btn = e.currentTarget;
      btn.classList.add('spinning');
      setTimeout(() => btn.classList.remove('spinning'), 600);
      const slot = getSlot(btn.dataset.slotId);
      if (slot && !slot.isLocked) {
        const usedIds = state.slots
          .filter(s => s.id !== slot.id && s.selectedRecipeId)
          .map(s => s.selectedRecipeId);
        const pool = getFilteredRecipes(slot.categoryFilter).filter(r => !usedIds.includes(r.id));
        if (pool.length > 0) {
          slot.selectedRecipeId = pool[Math.floor(Math.random() * pool.length)].id;
        } else {
          const fallbackPool = state.recipes.filter(r => !usedIds.includes(r.id));
          slot.selectedRecipeId = fallbackPool.length > 0
            ? fallbackPool[Math.floor(Math.random() * fallbackPool.length)].id
            : null;
        }
        renderSlots();
      }
    });
  });

  container.querySelectorAll('.btn-remove').forEach(btn => {
    btn.addEventListener('click', e => {
      const id = e.currentTarget.dataset.slotId;
      state.slots = state.slots.filter(s => s.id !== id);
      renderSlots();
    });
  });
}

function getSlot(id) {
  return state.slots.find(s => s.id === id) || null;
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ─── Pick Menu ────────────────────────────────────────────────────────────────

function pickMenu() {
  const usedIds = new Set(
    state.slots.filter(s => s.isLocked && s.selectedRecipeId).map(s => s.selectedRecipeId)
  );

  // Build tag buckets
  const byTag = {};
  state.recipes.forEach(r => {
    (r.tags || []).forEach(tag => {
      if (!byTag[tag]) byTag[tag] = [];
      byTag[tag].push(r);
    });
  });

  let fallbackIdx = 1;

  state.slots.forEach(slot => {
    if (slot.isLocked) return;

    const pool = getFilteredRecipes(slot.categoryFilter).filter(r => !usedIds.has(r.id));
    if (pool.length > 0) {
      const pick = pool[Math.floor(Math.random() * pool.length)];
      slot.selectedRecipeId = pick.id;
      usedIds.add(pick.id);
    } else {
      // Try full pool minus used
      const fallbackPool = state.recipes.filter(r => !usedIds.has(r.id));
      if (fallbackPool.length > 0) {
        const pick = fallbackPool[Math.floor(Math.random() * fallbackPool.length)];
        slot.selectedRecipeId = pick.id;
        usedIds.add(pick.id);
      } else {
        // Inject a hardcoded fallback marker
        slot.selectedRecipeId = `__fallback-${fallbackIdx++}`;
      }
    }
  });

  renderSlots();
  showToast('Menu picked! Review your selections below.');
}

// ─── Generate Grocery List ────────────────────────────────────────────────────

function generateGroceryList() {
  // Map: normalized ingredient -> Set of dish names
  const ingredientMap = new Map();

  const addIngredient = (raw, dishName) => {
    const key = raw.trim().toLowerCase();
    if (!ingredientMap.has(key)) {
      ingredientMap.set(key, { display: raw.trim(), dishes: new Set() });
    }
    ingredientMap.get(key).dishes.add(dishName);
  };

  // From recipe slots
  state.slots.forEach(slot => {
    if (!slot.selectedRecipeId || slot.selectedRecipeId.startsWith('__fallback')) return;
    const recipe = state.recipes.find(r => r.id === slot.selectedRecipeId);
    if (!recipe) return;
    (recipe.ingredients || []).forEach(ing => addIngredient(ing, recipe.title));
  });

  // From evergreen items
  state.evergreen.forEach(item => {
    if (!state.evergreenToggles[item.id]) return;
    (item.ingredients || []).forEach(ing => addIngredient(ing, item.name));
  });

  // Sort alphabetically by display name
  const sorted = Array.from(ingredientMap.values()).sort((a, b) =>
    a.display.toLowerCase().localeCompare(b.display.toLowerCase())
  );

  const listEl = document.getElementById('grocery-list');
  const panel = document.getElementById('grocery-panel');

  if (sorted.length === 0) {
    listEl.innerHTML = '<p class="empty-state">No ingredients found. Add some dish slots and pick a menu first.</p>';
  } else {
    listEl.innerHTML = sorted.map(entry => {
      const dishes = Array.from(entry.dishes);
      const label = dishes.length > 1
        ? `${entry.display} <span class="ingredient-source">(${dishes.join(', ')})</span>`
        : entry.display;
      return `
        <label class="grocery-item">
          <input type="checkbox" class="grocery-check" />
          <span class="grocery-label">${label}</span>
        </label>
      `;
    }).join('');
  }

  panel.classList.remove('hidden');
  panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ─── Set Menu (commit to history) ────────────────────────────────────────────

async function setMenu() {
  const dishes = state.slots
    .filter(s => s.selectedRecipeId && !s.selectedRecipeId.startsWith('__fallback'))
    .map(s => {
      const r = state.recipes.find(r => r.id === s.selectedRecipeId);
      return r ? r.title : null;
    })
    .filter(Boolean);

  if (dishes.length === 0) {
    showToast('Pick a menu first before setting it.');
    return;
  }

  const entry = {
    timestamp: new Date().toISOString(),
    week: getWeekRange(),
    dishes,
  };

  state.history.push(entry);
  localStorage.setItem('mealPrepHistory', JSON.stringify(state.history));
  renderHistory();
  showToast('Menu saved to history.');
}

// ─── History ──────────────────────────────────────────────────────────────────

function renderHistory() {
  const container = document.getElementById('history-list');
  container.innerHTML = '';

  if (!state.history || state.history.length === 0) {
    container.innerHTML = '<p class="empty-state">No history yet.</p>';
    return;
  }

  const reversed = [...state.history].reverse();
  reversed.forEach(entry => {
    const card = document.createElement('div');
    card.className = 'history-entry';
    const date = new Date(entry.timestamp).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
    card.innerHTML = `
      <div class="history-meta">
        <span class="history-week">${entry.week || 'Unknown week'}</span>
        <span class="history-date">${date}</span>
      </div>
      <ul class="history-dishes">
        ${(entry.dishes || []).map(d => `<li>${d}</li>`).join('')}
      </ul>
    `;
    container.appendChild(card);
  });
}

// ─── Export ───────────────────────────────────────────────────────────────────

function exportHistory() {
  const blob = new Blob([JSON.stringify(state.history, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `meal-history-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Import ───────────────────────────────────────────────────────────────────

function handleImport(file) {
  const statusEl = document.getElementById('import-status');
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async e => {
    try {
      const parsed = JSON.parse(e.target.result);
      if (!Array.isArray(parsed)) {
        statusEl.textContent = 'Import failed: file must be a JSON array.';
        statusEl.className = 'import-status error';
        return;
      }

      localStorage.setItem('mealPrepHistory', JSON.stringify(parsed));
      state.history = parsed;
      renderHistory();
      statusEl.textContent = `Imported ${parsed.length} entr${parsed.length === 1 ? 'y' : 'ies'} successfully.`;
      statusEl.className = 'import-status success';
    } catch (err) {
      statusEl.textContent = 'Import failed: invalid JSON file.';
      statusEl.className = 'import-status error';
    }
  };
  reader.readAsText(file);
}

// ─── Tab switching ────────────────────────────────────────────────────────────

function bindTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('hidden'));

      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      const panel = document.getElementById(`tab-${btn.dataset.tab}`);
      if (panel) {
        panel.classList.remove('hidden');
        panel.classList.add('active');
      }
    });
  });
}

// ─── Bind all UI ──────────────────────────────────────────────────────────────

function bindUI() {
  bindTabs();

  document.getElementById('btn-add-slot').addEventListener('click', () => {
    addSlot();
    renderSlots();
  });

  document.getElementById('btn-pick-menu').addEventListener('click', pickMenu);
  document.getElementById('btn-generate-grocery').addEventListener('click', generateGroceryList);
  document.getElementById('btn-set-menu').addEventListener('click', setMenu);
  document.getElementById('btn-export-history').addEventListener('click', exportHistory);

  document.getElementById('import-history-input').addEventListener('change', e => {
    handleImport(e.target.files[0]);
    e.target.value = '';
  });

  const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  if (!isLocal) document.getElementById('btn-stop-server').style.display = 'none';

  document.getElementById('btn-stop-server').addEventListener('click', async () => {
    if (!confirm('Stop the server? The app will become unavailable until you relaunch it.')) return;
    try {
      await fetch('/api/shutdown', { method: 'POST' });
    } catch (_) {
      // Expected — server closes the connection
    }
    document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:system-ui;color:#555;font-size:1.1rem;">Server stopped. Double-click <strong style="margin:0 6px">Start Meal Prep App.command</strong> to relaunch.</div>';
  });
}

// ─── Start ────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', init);
