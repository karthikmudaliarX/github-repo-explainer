// content.js

console.log("GitHub Repo Explainer: Content script LOADED (v3).");

let currentUrl = location.href;

function init() {
    console.log("GitHub Repo Explainer: init() called for " + location.href);

    // Check if we are on a repo root page
    const pathParts = window.location.pathname.split('/').filter(p => p);
    if (pathParts.length < 2 || pathParts.length > 2) {
        console.log("GitHub Repo Explainer: Not a repo root page (path parts: " + pathParts.length + ")");
        return;
    }

    // Already injected?
    if (document.getElementById('repo-explainer-box')) {
        console.log("GitHub Repo Explainer: Box already exists, skipping.");
        return;
    }

    const owner = pathParts[0];
    const repo = pathParts[1];
    console.log("GitHub Repo Explainer: Detected repo " + owner + "/" + repo);

    // Inject placeholder immediately
    injectUI("🔄 Thinking...");

    // Strategy: Try DOM first, fallback to GitHub API
    const readmeText = findReadmeInDOM();
    if (readmeText && readmeText.length > 50) {
        console.log("GitHub Repo Explainer: Found README in DOM (" + readmeText.length + " chars)");
        requestSummary(readmeText);
    } else {
        console.log("GitHub Repo Explainer: README not found in DOM, fetching via GitHub API...");
        fetchReadmeFromAPI(owner, repo);
    }
}

function findReadmeInDOM() {
    // Try multiple selectors - GitHub changes their DOM frequently
    const selectors = [
        '#readme .markdown-body',
        '#readme article',
        '.markdown-body.entry-content',
        'article.markdown-body',
        '[data-testid="readme"] .markdown-body',
        '[itemprop="text"]',
        '.Box-body .markdown-body',
        '.markdown-body'
    ];

    for (const selector of selectors) {
        const el = document.querySelector(selector);
        if (el && el.innerText.trim().length > 50) {
            console.log("GitHub Repo Explainer: Matched selector: " + selector);
            return el.innerText.substring(0, 5000);
        }
    }
    return null;
}

function fetchReadmeFromAPI(owner, repo) {
    // Use GitHub's public API to fetch README (no auth needed for public repos)
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/readme`;
    fetch(apiUrl, {
        headers: { 'Accept': 'application/vnd.github.v3.raw' }
    })
        .then(response => {
            if (!response.ok) throw new Error("GitHub API returned " + response.status);
            return response.text();
        })
        .then(readmeText => {
            console.log("GitHub Repo Explainer: Got README from API (" + readmeText.length + " chars)");
            requestSummary(readmeText.substring(0, 5000));
        })
        .catch(error => {
            console.error("GitHub Repo Explainer: Failed to fetch README from API:", error);
            updateUI("Could not find README for this repository.", true);
        });
}

function requestSummary(readmeText) {
    chrome.runtime.sendMessage(
        { action: "summarizeRepo", readmeContent: readmeText },
        (response) => {
            if (chrome.runtime.lastError) {
                console.error("GitHub Repo Explainer: Runtime error:", chrome.runtime.lastError);
                updateUI("Error: " + chrome.runtime.lastError.message, true);
                return;
            }
            if (response && response.error) {
                console.error("GitHub Repo Explainer: API error:", response.error);
                updateUI("Error: " + response.error, true);
                if (response.error.includes("API Key")) {
                    addSettingsLink();
                }
            } else if (response && response.summary) {
                console.log("GitHub Repo Explainer: Summary received!");
                updateUI(response.summary, false);
            }
        }
    );
}

function injectUI(text) {
    if (document.getElementById('repo-explainer-box')) return;

    const container = document.createElement('div');
    container.id = 'repo-explainer-box';
    container.className = 'repo-explainer-container';

    const header = document.createElement('div');
    header.className = 'repo-explainer-header';
    header.innerText = '🤖 Repo Explanation';

    const content = document.createElement('div');
    content.id = 'repo-explainer-content';
    content.className = 'repo-explainer-content';
    content.innerText = text;

    container.appendChild(header);
    container.appendChild(content);

    // Try multiple injection points
    const targets = [
        document.querySelector('.file-navigation'),
        document.querySelector('.Layout-main'),
        document.querySelector('[data-testid="repository-content"]'),
        document.querySelector('main'),
        document.querySelector('.container-xl'),
        document.querySelector('#repo-content-pjax-container'),
        document.querySelector('.repository-content')
    ];

    for (const target of targets) {
        if (target) {
            console.log("GitHub Repo Explainer: Injecting before/into:", target.tagName, target.className);
            target.insertBefore(container, target.firstChild);
            return;
        }
    }

    // Ultimate fallback
    console.warn("GitHub Repo Explainer: Using body fallback for injection.");
    document.body.prepend(container);
}

function updateUI(text, isError) {
    const content = document.getElementById('repo-explainer-content');
    if (content) {
        content.innerText = text;
        if (isError) {
            content.style.color = '#cf222e';
        } else {
            content.style.color = '';
        }
    }
}

function addSettingsLink() {
    const content = document.getElementById('repo-explainer-content');
    if (content) {
        const link = document.createElement('a');
        link.href = '#';
        link.innerText = '→ Click here to set your API Key';
        link.style.display = 'block';
        link.style.marginTop = '8px';
        link.onclick = function (e) {
            e.preventDefault();
            if (chrome.runtime.openOptionsPage) {
                chrome.runtime.openOptionsPage();
            } else {
                alert("Right-click the extension icon → Options to set your API Key.");
            }
        };
        content.appendChild(link);
    }
}

// Run init with a small delay to let GitHub finish rendering
setTimeout(init, 1500);

// Navigation observer for SPA changes
const observer = new MutationObserver(() => {
    if (location.href !== currentUrl) {
        currentUrl = location.href;
        console.log("GitHub Repo Explainer: URL changed to " + currentUrl);
        // Remove old box if navigating to a new page
        const oldBox = document.getElementById('repo-explainer-box');
        if (oldBox) oldBox.remove();
        setTimeout(init, 1500);
    }
});
observer.observe(document.body, { childList: true, subtree: true });
