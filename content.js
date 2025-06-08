

try {
    const injectScript = () => {
        console.log("[content.js] Injecting script");
        const script = document.createElement("script");
        script.src = chrome.runtime.getURL("inject.js");
        script.onload = () => {
            console.log("[content.js] Script injected successfully");
        };
        (document.head || document.documentElement).appendChild(script);
    };

    injectScript();

    if (window.onurlchange === null) {
        window.addEventListener('urlchange', (info) => {
            console.log("[content.js] URL changed, re-injecting script");
            injectScript();
        });
    }

    window.addEventListener("message", (event) => {
        if (event.source !== window) return;
        if (event.data.type && event.data.type === "FROM_INJECT") {
            console.log("[content.js] Message from inject.js:", event.data.message);
        }
    });
} catch (error) {
    
}
