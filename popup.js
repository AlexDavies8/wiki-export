// Once the DOM is ready...
window.addEventListener('load', () => {
    // ...query for the active tab...
    chrome.tabs.query({
        active: true,
        currentWindow: true
    }, tabs => {
        chrome.tabs.sendMessage(tabs[0].id, {
            sender: 'popup',
            action: 'getSelectedData'
        }, data => {
            if (data) {
                const newEl = document.createElement('code');
                newEl.innerText = data.text;
                document.body.appendChild(newEl);
            }
        });
        chrome.pageAction.show(tabs[0].id);
    });
});

const selectButton = document.querySelector('.select-button');
selectButton.addEventListener('click', () => {
    chrome.tabs.query({
        active: true,
        currentWindow: true
    }, tabs => {
        chrome.tabs.sendMessage(tabs[0].id, {
            sender: 'popup',
            action: 'startSelection'
        });
        selectButton.style.color = '#3366cc';
        close();
    });
});