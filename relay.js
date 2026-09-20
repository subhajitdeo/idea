(function () {
    "use strict";

    console.log("[nuvama-pyodide] relay active");

    chrome.runtime.onMessage.addListener((msg) => {
        if (msg.type === "NUVAMA_DATA") {
            window.postMessage(
                { source: "nuvama-extension", type: "NUVAMA_DATA", payload: msg.payload },
                "*"
            );
        }
    });

    window.postMessage({ source: "nuvama-extension", type: "RELAY_READY" }, "*");
})();
