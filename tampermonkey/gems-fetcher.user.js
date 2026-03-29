// ==UserScript==
// @name         Gemini GEM Fetcher
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Fetch GEMs from Gemini website and sync to dashboard
// @author       Your Name
// @match        https://gemini.google.com/*
// @grant        GM_xmlhttpRequest
// @connect      localhost
// @connect      127.0.0.1
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    const API_ENDPOINT = 'http://localhost:3000/api/gems/batch';

    const GEM_MODAL_SELECTOR = '[data-testid="gem-modal"], .modal, [role="dialog"]';
    const GEM_CARD_SELECTOR = '[data-testid="gem-card"], [data-gem-item], .gem-item';

    let fetchedGems = [];
    let isSyncing = false;

    function extractGemId(url) {
        const match = url.match(/\/gem\/([a-zA-Z0-9]+)/);
        return match ? match[1] : null;
    }

    function extractGemsFromPage() {
        const gems = [];

        const gemElements = document.querySelectorAll(GEM_CARD_SELECTOR);
        gemElements.forEach(el => {
            const linkEl = el.querySelector('a[href*="/gem/"]');
            const nameEl = el.querySelector('h1, h2, h3, [data-testid="gem-name"], .gem-name');
            const descEl = el.querySelector('p, [data-testid="gem-description"], .gem-description');
            const imgEl = el.querySelector('img[src*="gemini"], img[src*="google"], .gem-icon img');

            if (linkEl) {
                const url = linkEl.href;
                const id = extractGemId(url);
                if (id) {
                    gems.push({
                        id: id,
                        name: nameEl ? nameEl.textContent.trim() : 'Unnamed GEM',
                        url: url,
                        description: descEl ? descEl.textContent.trim() : '',
                        icon: imgEl ? imgEl.src : null
                    });
                }
            }
        });

        const detailMatch = window.location.href.match(/\/gem\/([a-zA-Z0-9]+)/);
        if (detailMatch) {
            const id = detailMatch[1];
            const nameEl = document.querySelector('h1, [data-testid="gem-title"]');
            const descEl = document.querySelector('[data-testid="gem-description"], .description');
            const imgEl = document.querySelector('[data-testid="gem-image"], .gem-image img, header img');

            const gem = {
                id: id,
                name: nameEl ? nameEl.textContent.trim() : document.title.replace(' - Gemini', '').trim(),
                url: window.location.href,
                description: descEl ? descEl.textContent.trim() : ''
            };

            if (imgEl && imgEl.src) {
                gem.icon = imgEl.src;
            }

            const existing = gems.find(g => g.id === id);
            if (!existing) {
                gems.push(gem);
            }
        }

        return gems;
    }

    function findGemsInAST() {
        const gems = [];
        const scripts = document.querySelectorAll('script[type="application/json"], script[id*="init"]');

        scripts.forEach(script => {
            try {
                let data;
                if (script.tagName === 'SCRIPT' && script.type === 'application/json') {
                    data = JSON.parse(script.textContent);
                }

                if (data && typeof data === 'object') {
                    traverseObject(data, gems);
                }
            } catch (e) {}
        });

        return gems;
    }

    function traverseObject(obj, gems, depth = 0) {
        if (depth > 10 || !obj) return;

        if (Array.isArray(obj)) {
            obj.forEach(item => traverseObject(item, gems, depth + 1));
            return;
        }

        if (typeof obj === 'object') {
            if (obj.url && obj.id && obj.name && obj.url.includes('/gem/')) {
                const gem = {
                    id: obj.id,
                    name: obj.name,
                    url: obj.url,
                    description: obj.description || ''
                };
                if (obj.image || obj.icon || obj.avatar) {
                    gem.icon = obj.image || obj.icon || obj.avatar;
                }
                if (!gems.find(g => g.id === gem.id)) {
                    gems.push(gem);
                }
            }

            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    traverseObject(obj[key], gems, depth + 1);
                }
            }
        }
    }

    function syncGemsToServer(gems) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'POST',
                url: API_ENDPOINT,
                headers: {
                    'Content-Type': 'application/json'
                },
                data: JSON.stringify({ gems: gems }),
                onload: function(response) {
                    try {
                        const data = JSON.parse(response.responseText);
                        resolve(data);
                    } catch (e) {
                        reject(e);
                    }
                },
                onerror: function(error) {
                    reject(error);
                }
            });
        });
    }

    function showNotification(message, type = 'info') {
        const colors = {
            success: '#22c55e',
            error: '#ef4444',
            info: '#6366f1'
        };

        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 24px;
            background: ${colors[type]};
            color: white;
            border-radius: 8px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
            z-index: 999999;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            animation: slideIn 0.3s ease;
        `;
        notification.textContent = message;

        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideIn 0.3s ease reverse';
            setTimeout(() => {
                notification.remove();
                style.remove();
            }, 300);
        }, 3000);
    }

    async function performSync() {
        if (isSyncing) return;

        isSyncing = true;
        showNotification('Syncing GEMS...', 'info');

        try {
            let gems = extractGemsFromPage();

            if (gems.length === 0) {
                gems = findGemsInAST();
            }

            if (gems.length === 0) {
                showNotification('No GEMS found on this page', 'error');
                isSyncing = false;
                return;
            }

            await syncGemsToServer(gems);
            showNotification(`Synced ${gems.length} GEMS successfully!`, 'success');
        } catch (error) {
            console.error('Sync error:', error);
            showNotification('Sync failed: ' + error.message, 'error');
        } finally {
            isSyncing = false;
        }
    }

    function createSyncButton() {
        const button = document.createElement('button');
        button.id = 'gem-sync-button';
        button.textContent = '⟳ Sync GEMS';
        button.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 12px 20px;
            background: linear-gradient(135deg, #6366f1 0%, #818cf8 100%);
            color: white;
            border: none;
            border-radius: 8px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            z-index: 999999;
            box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
            transition: all 0.2s ease;
        `;

        button.addEventListener('mouseenter', () => {
            button.style.transform = 'translateY(-2px)';
            button.style.boxShadow = '0 6px 16px rgba(99, 102, 241, 0.5)';
        });

        button.addEventListener('mouseleave', () => {
            button.style.transform = 'translateY(0)';
            button.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.4)';
        });

        button.addEventListener('click', performSync);

        document.body.appendChild(button);
    }

    function init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', createSyncButton);
        } else {
            createSyncButton();
        }

        let debounceTimer;
        const observer = new MutationObserver(() => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                const newGems = extractGemsFromPage();
                if (newGems.length > fetchedGems.length) {
                    fetchedGems = newGems;
                }
            }, 1000);
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    init();
})();