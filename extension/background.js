console.log("Background script is running.");
chrome.runtime.onInstalled.addListener(() => {
    console.log("[Background] Extension installed.");
});

chrome.action.onClicked.addListener(async (tab) => {
    console.log("[Background] Opening sidebar for tab:", tab.id);
    
    if (chrome.sidePanel) {
        try {
            await chrome.sidePanel.open({ tabId: tab.id });
            console.log("[Background] Sidebar opened.");
        } catch (error) {
            console.error("[Background] Failed to open sidebar:", error);
        }
    } else {
        console.error("[Background] SidePanel API not supported.");
    }
});

