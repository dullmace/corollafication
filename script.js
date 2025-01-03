// ==UserScript==
// @name         Corollafication: A Visual Upgrade
// @namespace    https://github.com/dullmace/corollafication
// @version      0.2
// @description  Transform your mundane 5x5 Friday grids into masterpieces with Corollafication, the only script bold enough to fix your musical missteps. This revolutionary tool scans for your questionable taste on Twitter/X.com and overlays the only album that matters: *any* release by 95COROLLA.
// @author       dullmace
// @match        https://twitter.com/*
// @match        https://x.com/*
// @grant        GM_getValue
// @grant        GM_setValue
// @run-at       document-idle
// @license      MIT
// @homepageURL  https://github.com/dullmace/corollafication
// @supportURL   https://github.com/YourUsername/corollafication/issues
// ==/UserScript==
 
(function() {
    'use strict';

    const DEBUG = true;
    const log = (...args) => DEBUG && console.log('[Corollafication]', ...args);

    const CONFIG = {
        overlays: [
            { url: 'https://i.imgur.com/qABSUFh.png', opacity: 0.8 },
            { url: 'https://i.imgur.com/w6EZQjx.png', opacity: 0.6 }
        ],
        postRegex: /\/status\/\d+$/
    };

    const imageCache = new Map();

    async function preloadImages() {
        log('Preloading images...');
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
                log(`Preloaded: ${overlay.url}`);
            } catch (error) {
                console.error(`Failed to load overlay image: ${overlay.url}`, error);
            }
        }
    }

    function matchesPostCriteria(postText) {
        const text = postText.toLowerCase();
        log('Checking post text:', text);
        if (text.includes('5x5') || text.includes('music friday')) {
            log('Matched: 5x5 or music friday');
            return true;
        }
        if (text.includes('friday') && (text.includes('x5') || text.includes('x 5'))) {
            log('Matched: friday with x5');
            return true;
        }
        return false;
    }

    function addOverlay(mediaElement) {
        if (mediaElement.getAttribute('data-overlay-added')) {
            log('Overlay already added, skipping');
            return;
        }
        
        log('Adding overlay to media element:', mediaElement);
        mediaElement.setAttribute('data-overlay-added', 'true');

        const container = document.createElement('div');
        container.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
        `;

        // Wait for image to load to get correct dimensions
        if (!mediaElement.complete) {
            mediaElement.addEventListener('load', () => processMediaElement());
        } else {
            processMediaElement();
        }

        function processMediaElement() {
            const originalWidth = mediaElement.naturalWidth || mediaElement.offsetWidth;
            const originalHeight = mediaElement.naturalHeight || mediaElement.offsetHeight;
            
            log('Media dimensions:', originalWidth, 'x', originalHeight);

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
                        z-index: ${1000 + index};
                        opacity: ${overlayConfig.opacity};
                        transform-origin: top left;
                        pointer-events: none;
                    `;

                    const updateOverlayScale = () => {
                        const scale = mediaElement.offsetWidth / originalWidth;
                        overlay.style.transform = `scale(${scale})`;
                        log('Updated scale:', scale);
                    };

                    updateOverlayScale();
                    new ResizeObserver(updateOverlayScale).observe(mediaElement);
                    
                    container.appendChild(overlay);
                } catch (error) {
                    console.error('Error adding overlay:', error);
                }
            });
        }

        const parentElement = mediaElement.parentElement;
        if (parentElement) {
            parentElement.style.position = 'relative';
            parentElement.appendChild(container);
        }
    }

    function processNewPosts(mutations) {
        const mediaSelectors = [
            'img[src*="media"]',
            'img[src*="pbs.twimg.com"]',
            'img[src*="tweet_video_thumb"]'
        ];
        
        mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    // Get the closest article or tweet container
                    const tweetContainer = node.closest('article') || node;
                    const isPostView = CONFIG.postRegex.test(window.location.pathname);
                    const articleText = tweetContainer.innerText || '';
                    
                    if (isPostView || matchesPostCriteria(articleText)) {
                        mediaSelectors.forEach(selector => {
                            const mediaElements = tweetContainer.querySelectorAll(selector);
                            log(`Found ${mediaElements.length} media elements with selector ${selector}`);
                            mediaElements.forEach(addOverlay);
                        });
                    }
                }
            });
        });
    }

    function processInitialPost() {
        log('Processing initial post');
        if (CONFIG.postRegex.test(window.location.pathname)) {
            const mediaSelectors = [
                'img[src*="media"]',
                'img[src*="pbs.twimg.com"]',
                'img[src*="tweet_video_thumb"]'
            ];
            
            mediaSelectors.forEach(selector => {
                const mediaElements = document.querySelectorAll(selector);
                log(`Found ${mediaElements.length} initial media elements with selector ${selector}`);
                mediaElements.forEach(addOverlay);
            });
        }
    }

    // Start processing after a short delay to ensure page is loaded
    setTimeout(() => {
        log('Initializing Corollafication');
        preloadImages().then(() => {
            processInitialPost();
            const observer = new MutationObserver(processNewPosts);
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
            log('Observer started');
        });
    }, 1500);
})();
