// popup.js
document.addEventListener('DOMContentLoaded', () => {
    const homeView = document.getElementById('home-view');
    const settingsView = document.getElementById('settings-view');
    const apiKeyInput = document.getElementById('apiKey');
    const saveButton = document.getElementById('save');
    const cancelButton = document.getElementById('cancel');
    const goToSettingsButton = document.getElementById('go-to-settings');
    const status = document.getElementById('status');

    function showView(viewName) {
        if (viewName === 'home') {
            homeView.classList.add('active');
            settingsView.classList.remove('active');
        } else {
            homeView.classList.remove('active');
            settingsView.classList.add('active');
        }
    }

    // Load saved key and determine initial view
    chrome.storage.sync.get(['geminiApiKey'], (result) => {
        if (result.geminiApiKey) {
            apiKeyInput.value = result.geminiApiKey;
            showView('home');
        } else {
            showView('settings');
        }
    });

    // Save key
    saveButton.addEventListener('click', () => {
        const apiKey = apiKeyInput.value.trim();
        if (!apiKey) {
            status.textContent = 'Please enter a valid key.';
            status.style.color = '#cf222e';
            return;
        }

        chrome.storage.sync.set({ geminiApiKey: apiKey }, () => {
            status.textContent = 'Settings saved!';
            status.style.color = '#1a7f37';
            
            setTimeout(() => {
                status.textContent = '';
                showView('home');
            }, 1000);
        });
    });

    // Cancel editing
    cancelButton.addEventListener('click', () => {
        chrome.storage.sync.get(['geminiApiKey'], (result) => {
            if (result.geminiApiKey) {
                apiKeyInput.value = result.geminiApiKey;
                showView('home');
            } else {
                status.textContent = 'API Key is required to use the extension.';
                status.style.color = '#cf222e';
            }
        });
    });

    // Go to settings from home
    goToSettingsButton.addEventListener('click', () => {
        showView('settings');
    });
});
