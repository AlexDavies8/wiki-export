chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.sender === 'content' && message.action === "load") {
        chrome.pageAction.show(sender.tab.id);
    }
});