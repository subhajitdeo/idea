chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type !== "NUVAMA_DATA") return;

    chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
            if (!tab.url) return;
            const url = tab.url;
            const isTarget =
                url.startsWith("http://localhost") ||
                url.includes(".github.io") ||
                url.includes(".vercel.app") ||
                url.includes(".netlify.app");
            if (!isTarget) return;

            chrome.tabs.sendMessage(tab.id, msg, () => {
                if (chrome.runtime.lastError) { /* ignore */ }
            });
        });
    });
});

console.log("[nuvama-pyodide] background relay active");
