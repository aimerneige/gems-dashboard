const API_BASE = '/api';

const THEME_COLORS = {
    acid: ['#ccff00', '#ff00cc', '#00ffff', '#e0e0e0'],
    anime: ['#ff5e94', '#00d2ff', '#ffee58', '#ff74a4'],
    minimal: ['#2563eb', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316']
};

const THEME_KEY = 'gem-dashboard-theme';

let gems = [];
let editingGem = null;

const gemContainer = document.getElementById('gem-container');
const emptyState = document.getElementById('empty-state');
const modal = document.getElementById('modal');
const toast = document.getElementById('toast');

document.getElementById('sync-btn').addEventListener('click', syncFromGemini);
document.getElementById('modal-close').addEventListener('click', closeModal);
document.getElementById('cancel-btn').addEventListener('click', closeModal);
document.getElementById('save-btn').addEventListener('click', saveGem);
modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const theme = btn.dataset.theme;
        setTheme(theme);
        localStorage.setItem(THEME_KEY, theme);
    });
});

function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
}

function getStoredTheme() {
    return localStorage.getItem(THEME_KEY);
}

function initTheme() {
    const stored = getStoredTheme();
    if (stored) {
        setTheme(stored);
    }
}

function getThemeColor(index) {
    const theme = document.documentElement.getAttribute('data-theme') || 'acid';
    const colors = THEME_COLORS[theme] || THEME_COLORS.acid;
    return colors[index % colors.length];
}

async function loadGems() {
    try {
        const res = await fetch(`${API_BASE}/gems`);
        const data = await res.json();
        if (data.success) {
            gems = data.data;
            renderGems();
        }
    } catch (err) {
        showToast('Failed to load gems', 'error');
    }
}

function renderGems() {
    if (gems.length === 0) {
        gemContainer.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }
    emptyState.style.display = 'none';
    gemContainer.innerHTML = gems.map((gem, index) => createGemCard(gem, index)).join('');
    document.querySelectorAll('.gem-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.closest('.gem-action-btn')) return;
            window.open(card.dataset.url, '_blank');
        });
    });
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            openEditModal(btn.dataset.id);
        });
    });
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteGem(btn.dataset.id);
        });
    });
}

function createGemCard(gem, index) {
    const color = getThemeColor(index);
    const initial = gem.name.charAt(0).toUpperCase();

    return `
        <div class="gem-card" data-url="${gem.url}" data-id="${gem.id}" data-panel="${gem.name.substring(0, 10).toUpperCase()}">
            <div class="gem-actions">
                <button class="gem-action-btn edit-btn" data-id="${gem.id}" title="Edit">✎</button>
                <button class="gem-action-btn delete-btn" data-id="${gem.id}" title="Delete">×</button>
            </div>
            <div class="gem-card-header">
                <div class="gem-icon-wrapper" style="background-color: ${color}">
                    <span>${initial}</span>
                </div>
                <div class="gem-info">
                    <h3 class="gem-name">${gem.name}</h3>
                    <p class="gem-description">${gem.description || ''}</p>
                </div>
            </div>
        </div>
    `;
}

async function syncFromGemini() {
    const btn = document.getElementById('sync-btn');
    btn.classList.add('syncing');
    btn.disabled = true;
    try {
        const res = await fetch(`${API_BASE}/gems/sync`, { method: 'POST' });
        const data = await res.json();
        if (data.success) {
            gems = data.data;
            renderGems();
            showToast('Sync completed', 'success');
        } else {
            showToast(data.message || 'Sync failed', 'error');
        }
    } catch (err) {
        showToast('Sync failed: ' + err.message, 'error');
    } finally {
        btn.classList.remove('syncing');
        btn.disabled = false;
    }
}

function openEditModal(id) {
    editingGem = gems.find(g => g.id === id);
    if (!editingGem) return;

    document.getElementById('modal-title').textContent = '> EDIT_GEM';
    document.getElementById('gem-id').value = editingGem.id;
    document.getElementById('gem-name').value = editingGem.name;
    document.getElementById('gem-url').value = editingGem.url;
    document.getElementById('gem-description').value = editingGem.description || '';

    modal.classList.add('show');
}

function closeModal() {
    modal.classList.remove('show');
    editingGem = null;
}

async function saveGem() {
    const id = document.getElementById('gem-id').value;
    const name = document.getElementById('gem-name').value.trim();
    const url = document.getElementById('gem-url').value.trim();
    const description = document.getElementById('gem-description').value.trim();

    if (!name || !url) {
        showToast('Name and URL are required', 'error');
        return;
    }

    const updates = { name, url, description };
    try {
        const res = await fetch(`${API_BASE}/gems/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
        });
        const data = await res.json();
        if (data.success) {
            await loadGems();
            closeModal();
            showToast('GEM updated', 'success');
        } else {
            showToast(data.message, 'error');
        }
    } catch (err) {
        showToast('Failed to save: ' + err.message, 'error');
    }
}

async function deleteGem(id) {
    if (!confirm('Delete this GEM?')) return;
    try {
        const res = await fetch(`${API_BASE}/gems/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
            gems = data.data;
            renderGems();
            showToast('GEM deleted', 'success');
        }
    } catch (err) {
        showToast('Failed to delete', 'error');
    }
}

function showToast(message, type = 'info') {
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    setTimeout(() => toast.classList.remove('show'), 3000);
}

initTheme();
loadGems();