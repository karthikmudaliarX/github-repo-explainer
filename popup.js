// popup.js
document.addEventListener('DOMContentLoaded', () => {
    const apiKeyInput = document.getElementById('apiKey');
    const saveButton = document.getElementById('save');
    const status = document.getElementById('status');

    // Load saved key
    chrome.storage.sync.get(['geminiApiKey'], (result) => {
        if (result.geminiApiKey) {
            apiKeyInput.value = result.geminiApiKey;
        }
    });

    // Save key
    saveButton.addEventListener('click', () => {
        const apiKey = apiKeyInput.value.trim();
        chrome.storage.sync.set({ geminiApiKey: apiKey }, () => {
            status.textContent = 'Settings saved.';
            setTimeout(() => {
                status.textContent = '';
            }, 2000);
        });
    });
});
