// background.js

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "summarizeRepo") {
        summarizeRepo(request.readmeContent)
            .then(summary => sendResponse({ summary: summary }))
            .catch(error => sendResponse({ error: error.message }));
        return true; // Indicates asynchronous response
    }
});

async function summarizeRepo(readmeContent) {
    const apiKey = await getApiKey();
    if (!apiKey) {
        throw new Error("API Key not found. Please set it in the extension options.");
    }

    const prompt = `You are a helpful assistant that explains GitHub repositories to developers.
  Here is the README content of a repository:
  
  ${readmeContent}
  
  Please provide a concise, high-level summary of what this repository does, its main features, and who it is for. Keep it under 3-4 sentences. Explain it in very simple terms.`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`;

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }]
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error.message || "Failed to fetch summary from Gemini.");
        }

        const data = await response.json();
        const summary = data.candidates[0].content.parts[0].text;
        return summary;
    } catch (error) {
        console.error("Gemini API Error:", error);
        throw error;
    }
}

function getApiKey() {
    return new Promise((resolve) => {
        chrome.storage.sync.get(['geminiApiKey'], (result) => {
            resolve(result.geminiApiKey);
        });
    });
}
