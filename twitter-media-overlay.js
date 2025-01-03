// ==UserScript==
// @name         Corollafication: A Visual Upgrade
// @namespace    http://tampermonkey.net/
// @version      0.3
// @description  Transform your mundane 5x5 Friday grids into masterpieces with Corollafication, the only script bold enough to fix your musical missteps.
// @author       dullmace
// @match        https://twitter.com/*
// @match        https://x.com/*
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

(function() {
    'use strict';

    const CONFIG = {
        overlays: [
            { url: 'https://i.imgur.com/qABSUFh.png', opacity: 0.8 },
            { url: 'https://i.imgur.com/w6EZQjx.png', opacity: 0.6 }
        ],
        postRegex: /\/status\/\d+$/
    };

    const imageCache = new Map();

    async function preloadImages() {
        for (const overlay of CONFIG.overlays) {
            try {
                const img = new Image();
                const loadPromise = new Promise((resolve, reject) => {
                    img.onload = resolve;
                    img.onerror = reject;
                });
                img.src = overlay.url;
                await loadPromise;
                imageCache.set(overlay.url, img);
            } catch (error) {
                console.error(`Failed to load overlay image: ${overlay.url}`, error);
            }
        }
    }

    function matchesPostCriteria(postText) {
        const text = postText.toLowerCase();
        if (text.includes('5x5') || text.includes('music friday')) return true;
        if (text.includes('friday') && (text.includes('x5') || text.includes('x 5'))) return true;
        return false;
    }

    function addOverlay(mediaElement) {
        if (mediaElement.getAttribute('data-overlay-added')) return;
        mediaElement.setAttribute('data-overlay-added', 'true');

        const container = document.createElement('div');
        container.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; height: 100%;';

        const originalWidth = mediaElement.naturalWidth;
        const originalHeight = mediaElement.naturalHeight;

        CONFIG.overlays.forEach((overlayConfig, index) => {
            try {
                const overlay = document.createElement('img');
                const cachedImage = imageCache.get(overlayConfig.url);
                
                if (cachedImage) {
                    overlay.src = cachedImage.src;
                } else {
                    overlay.src = overlayConfig.url;
                    overlay.onerror = (e) => {
                        console.error(`Failed to load overlay: ${overlayConfig.url}`, e);
                        overlay.style.display = 'none';
                    };
                }

                overlay.style.cssText = `
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: ${originalWidth}px;
                    height: ${originalHeight}px;
                    object-fit: contain;
                    z-index: ${10 + index};
                    opacity: ${overlayConfig.opacity};
                    transform-origin: top left;
                `;

                const updateOverlayScale = () => {
                    const scale = mediaElement.offsetWidth / originalWidth;
                    overlay.style.transform = `scale(${scale})`;
                };

                updateOverlayScale();
                new ResizeObserver(updateOverlayScale).observe(mediaElement);
                
                container.appendChild(overlay);
            } catch (error) {
                console.error('Error adding overlay:', error);
            }
        });

        mediaElement.style.position = 'relative';
        mediaElement.appendChild(container);
    }

    function processNewPosts(mutations) {
        const mediaSelector = 'img[src*="media"]';
        
        mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    const isPostView = CONFIG.postRegex.test(window.location.pathname);
                    const articleText = node.innerText || '';
                    
                    if (isPostView || matchesPostCriteria(articleText)) {
                        const mediaElements = node.querySelectorAll(mediaSelector);
                        mediaElements.forEach(addOverlay);
                    }
                }
            });
        });
    }

    function processInitialPost() {
        if (CONFIG.postRegex.test(window.location.pathname)) {
            const mediaElements = document.querySelectorAll('img[src*="media"]');
            mediaElements.forEach(addOverlay);
        }
    }

    preloadImages().then(() => {
        processInitialPost();
        const observer = new MutationObserver(processNewPosts);
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    });
})();
