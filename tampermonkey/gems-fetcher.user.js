// ==UserScript==
// @name         Gemini GEM Fetcher
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Fetch GEMs from Gemini website and sync to dashboard
// @author       Your Name
// @match        https://gemini.google.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM_log
// @connect      localhost
// @connect      127.0.0.1
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    const API_ENDPOINT = 'http://localhost:3000/api/gems/batch';

    let isSyncing = false;

    function extractGemId(url) {
        const match = url.match(/\/gem\/([a-zA-Z0-9]+)/);
        return match ? match[1] : null;
    }

    function log(msg) {
        console.log('[GEM Fetcher]', msg);
    }

    function extractGemsFromDOM() {
        const gems = [];
        const seenIds = new Set();

        const gemLinks = document.querySelectorAll('a.bot-row[href*="/gem/"]');
        log(`Found ${gemLinks.length} gem links`);

        gemLinks.forEach(link => {
            const url = link.href;
            const id = extractGemId(url);
            if (!id || seenIds.has(id)) return;
            seenIds.add(id);

            const titleEl = link.querySelector('.gds-title-m.title');
            const descEl = link.querySelector('.bot-desc');
            const logoEl = link.querySelector('bot-logo');

            let name = 'Unnamed GEM';
            let description = '';
            let color = null;

            if (titleEl) {
                name = titleEl.textContent.trim();
            }

            if (descEl) {
                description = descEl.textContent.trim();
            }

            if (logoEl) {
                const style = logoEl.getAttribute('style') || '';
                const bgMatch = style.match(/--bot-logo-bg:\s*([^;]+)/);
                const textMatch = style.match(/--bot-logo-text:\s*([^;]+)/);
                if (bgMatch) {
                    color = bgMatch[1].trim();
                }
            }

            gems.push({
                id: id,
                name: name,
                url: `https://gemini.google.com/gem/${id}`,
                description: description,
                color: color
            });
        });

        return gems;
    }

    async function syncGemsToServer(gems) {
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
            info: '#6366f1',
            warning: '#f59e0b'
        };

        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 24px;
            background: ${colors[type] || colors.info};
            color: white;
            border-radius: 8px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
            z-index: 999999;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            animation: slideIn 0.3s ease;
            max-width: 300px;
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
        }, 4000);
    }

    async function performSync() {
        if (isSyncing) return;

        isSyncing = true;
        showNotification('Syncing GEMS...', 'info');

        try {
            const gems = extractGemsFromDOM();
            log(`Found ${gems.length} gems`);

            if (gems.length === 0) {
                showNotification('No GEMS found. Make sure you are on the GEMS list page.', 'warning');
                isSyncing = false;
                return;
            }

            await syncGemsToServer(gems);
            showNotification(`Synced ${gems.length} GEMS successfully!`, 'success');
        } catch (error) {
            log(`Sync error: ${error.message}`);
            showNotification('Sync failed: ' + error.message, 'error');
        } finally {
            isSyncing = false;
        }
    }

    function createSyncButton() {
        if (document.getElementById('gem-sync-button')) return;

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
        log('Sync button created');
    }

    function init() {
        log('GEM Fetcher initialized');
        log(`Current URL: ${window.location.href}`);

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', createSyncButton);
        } else {
            createSyncButton();
        }

        let lastUrl = window.location.href;
        const observer = new MutationObserver(() => {
            if (window.location.href !== lastUrl) {
                lastUrl = window.location.href;
                log(`URL changed to: ${window.location.href}`);
                setTimeout(createSyncButton, 2000);
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

    init();
})();