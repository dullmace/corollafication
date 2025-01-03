// ==UserScript==
// @name         Corollafication: A Visual Upgrade
// @namespace    https://github.com/dullmace/corollafication
// @version      0.3
// @description  Transform your mundane 5x5 Friday grids into masterpieces with Corollafication, the only script bold enough to fix your musical missteps. This revolutionary tool scans for your questionable taste on Twitter/X.com and overlays the only album that matters: *any* release by 95COROLLA.
// @author       
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

        if (!mediaElement.closest('[data-testid="tweetPhoto"]')) {
            log('Media element is not in a tweet photo, skipping');
            return;
        }

        log('Adding overlay to media element:', mediaElement);
        mediaElement.setAttribute('data-overlay-added', 'true');

        const parentElement = mediaElement.parentElement;
        parentElement.style.position = 'relative';

        // Ensure mediaElement stays on top
        mediaElement.style.position = 'relative';
        mediaElement.style.zIndex = '1';

        CONFIG.overlays.forEach((overlayConfig, index) => {
            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-image: url(${overlayConfig.url});
                background-size: cover;
                background-position: center;
                opacity: ${overlayConfig.opacity};
                pointer-events: none;
                z-index: 0;
            `;
            parentElement.appendChild(overlay);
        });
    }

    function processNewPosts(mutations) {
        const mediaSelectors = [
            '[data-testid="tweetPhoto"] img'
        ];

        mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                if (node.nodeType === Node.ELEMENT_NODE) {
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
                '[data-testid="tweetPhoto"] img'
            ];

            mediaSelectors.forEach(selector => {
                const mediaElements = document.querySelectorAll(selector);
                log(`Found ${mediaElements.length} initial media elements with selector ${selector}`);
                mediaElements.forEach(addOverlay);
            });
        }
    }

    setTimeout(() => {
        log('Initializing Corollafication');
        processInitialPost();
        const observer = new MutationObserver(processNewPosts);
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        log('Observer started');
    }, 1500);
})();
