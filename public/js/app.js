const API_BASE = '/api';

const COLORS = [
    '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316',
    '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6'
];

const THEME_KEY = 'gem-dashboard-theme';

let gems = [];
let editingGem = null;
let uploadedFile = null;

const gemContainer = document.getElementById('gem-container');
const emptyState = document.getElementById('empty-state');
const modal = document.getElementById('modal');
const toast = document.getElementById('toast');

document.getElementById('sync-btn').addEventListener('click', syncFromGemini);
document.getElementById('modal-close').addEventListener('click', closeModal);
document.getElementById('cancel-btn').addEventListener('click', closeModal);
document.getElementById('save-btn').addEventListener('click', saveGem);
document.getElementById('upload-btn').addEventListener('click', () => document.getElementById('icon-input').click());
document.getElementById('icon-input').addEventListener('change', handleIconUpload);
document.getElementById('remove-icon-btn').addEventListener('click', removeIcon);
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
    gemContainer.innerHTML = gems.map(gem => createGemCard(gem)).join('');
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

function createGemCard(gem) {
    const color = gem.color || COLORS[Math.floor(Math.random() * COLORS.length)];
    const iconHtml = gem.icon
        ? `<img src="${gem.icon}" alt="${gem.name}">`
        : `<span>${gem.name.charAt(0).toUpperCase()}</span>`;

    return `
        <div class="gem-card" data-url="${gem.url}" data-id="${gem.id}" data-panel="${gem.name.substring(0, 10).toUpperCase()}">
            <div class="gem-actions">
                <button class="gem-action-btn edit-btn" data-id="${gem.id}" title="Edit">✎</button>
                <button class="gem-action-btn delete-btn" data-id="${gem.id}" title="Delete">×</button>
            </div>
            <div class="gem-card-header">
                <div class="gem-icon-wrapper" style="background-color: ${color}">
                    ${iconHtml}
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

    const preview = document.getElementById('icon-preview');
    if (editingGem.icon) {
        preview.innerHTML = `<img src="${editingGem.icon}" alt="icon">`;
        document.getElementById('remove-icon-btn').style.display = 'block';
    } else {
        preview.innerHTML = `<span class="placeholder-text">NO_ICON</span>`;
        document.getElementById('remove-icon-btn').style.display = 'none';
    }
    uploadedFile = null;
    modal.classList.add('show');
}

function closeModal() {
    modal.classList.remove('show');
    editingGem = null;
    uploadedFile = null;
}

function handleIconUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    uploadedFile = file;
    const preview = document.getElementById('icon-preview');
    const reader = new FileReader();
    reader.onload = () => {
        preview.innerHTML = `<img src="${reader.result}" alt="icon">`;
    };
    reader.readAsDataURL(file);
    document.getElementById('remove-icon-btn').style.display = 'block';
}

function removeIcon() {
    uploadedFile = null;
    document.getElementById('icon-input').value = '';
    const preview = document.getElementById('icon-preview');
    if (editingGem && editingGem.icon) {
        preview.innerHTML = `<img src="${editingGem.icon}" alt="icon">`;
        document.getElementById('remove-icon-btn').style.display = 'block';
    } else {
        preview.innerHTML = `<span class="placeholder-text">NO_ICON</span>`;
        document.getElementById('remove-icon-btn').style.display = 'none';
    }
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
            if (uploadedFile) {
                const formData = new FormData();
                formData.append('image', uploadedFile);
                await fetch(`${API_BASE}/upload/${id}`, {
                    method: 'POST',
                    body: formData
                });
            }
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