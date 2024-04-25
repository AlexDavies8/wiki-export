const defaultSettings = {
    lists: '2spaces',
    citations: 'superscript',
    links: 'external',
    styles: 'off'
};
let settings = defaultSettings;
chrome.storage.sync.get('settings', value => {
    try {
        settings = JSON.parse(value.settings);
    } catch {}
});
SETTINGS_LIST_STR_TABLE = {
    '2spaces': '  ',
    '4spaces': '    ',
    'tabs': '\t'
}

function updateSetting(key, value) {
    if (key) settings[key] = value;
    chrome.storage.sync.set({ 'settings': JSON.stringify(settings) });
}

let hoveredElement = null;
let selectedElement = null;
let highlightOverlay = null;

let selectionMode = 'markdown';

function fromHTML(html, trim = true) {
    // Process the HTML string.
    html = trim ? html.trim() : html;
    if (!html) return null;

    // Then set up a new template element.
    const template = document.createElement('template');
    template.innerHTML = html;
    const result = template.content.children;

    // Then return either an HTMLElement or HTMLCollection,
    // based on whether the input HTML had one or more roots.
    if (result.length === 1) return result[0];
    return result;
}

function transferComputedStyle(node) {
    let cs = getComputedStyle(node);
    for (let i = 0; i < cs.length; i++) {
        let s = cs[i] + "";
        node.style[s] = cs[s];
    }
}
function transferStyles(root) {
    let all = root.getElementsByTagName("*");
    for (let i = 0; i < all.length; i++) {
        transferComputedStyle(all[i]);
    }
}

function extractAllCss() {
    let rules = [];
    const stylesheets = document.styleSheets;
    for (let i = 0; i < stylesheets.length; i++) {
        const stylesheet = stylesheets[i];
        for (let j = 0; j < stylesheet.cssRules.length; j++) {
            rules.push(stylesheet.cssRules[j].cssText);
        }
    }
    const cssResetClass = crypto.randomUUID();
    return [cssResetClass, `<style>.${cssResetClass}, .${cssResetClass}:after, .${cssResetClass}:before, {\nall: revert;\n}\n${rules.join('\n')}\n</style>`];
}

function addToolAreaItem(item) {
    const li = document.createElement('li');
    li.append(item);
    const toolArea = document.getElementById('p-dock-bottom').querySelector('ul');
    toolArea.append(li);
    return item;
}

const SETTINGS_POPUP_HTML = '<div class="extension-settings"><div class="backdrop"></div><div class="panel"><h3>Settings</h3><hr><div class="row"><div class="column"><h3>Markdown</h3><h4>Include Links</h4><label>None<input type="radio" name="extension-settings-links" value="none"/></label><label>External<input type="radio" name="extension-settings-links" value="external"/></label><label>Internal<input type="radio" name="extension-settings-links" value="internal"/></label><label>All<input type="radio" name="extension-settings-links" value="all"/></label><h4>Citations</h4><label>Off<input type="radio" name="extension-settings-citations" value="off"/></label><label>Inline<input type="radio" name="extension-settings-citations" value="inline"/></label><label>Superscript<input type="radio" name="extension-settings-citations" value="superscript"/></label><h4>List Indents</h4><label>2 Spaces<input type="radio" name="extension-settings-lists" value="2spaces"/></label><label>4 Spaces<input type="radio" name="extension-settings-lists" value="4spaces"/></label><label>Tabs<input type="radio" name="extension-settings-lists" value="tabs"/></label></div><div style="width: 1px;background-color: rgb(162, 169, 177);"></div><div class="column"><h3>HTML</h3><h4>Export Styles</h4><label>Off<input type="radio" name="extension-settings-styles" value="off"/></label><label>Inline<input type="radio" name="extension-settings-styles" value="inline"/></label><label>Style Block<input type="radio" name="extension-settings-styles" value="block"/></label></div></div><div class="row"><button class="reset-button cdx-button">Reset</button><button class="close-button cdx-button">Close</button></div></div></div>';
const TOOLS_BUTTON_HTML = '<button class="cdx-button cdx-button--icon-only vector-limited-width-toggle extension-tool-button"><svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24"><path d="M686-132 444-376q-20 8-40.5 12t-43.5 4q-100 0-170-70t-70-170q0-36 10-68.5t28-61.5l146 146 72-72-146-146q29-18 61.5-28t68.5-10q100 0 170 70t70 170q0 23-4 43.5T584-516l244 242q12 12 12 29t-12 29l-84 84q-12 12-29 12t-29-12Z"/></svg></button>';
const CLOSE_BUTTON_HTML = '<button class="cdx-button cdx-button--icon-only vector-limited-width-toggle extension-tool-button"><svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24"><path d="m321-80-71-71 329-329-329-329 71-71 400 400L321-80Z"/></svg></button>';
const SETTINGS_BUTTON_HTML = '<button class="cdx-button cdx-button--icon-only vector-limited-width-toggle extension-tool-button"><svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24"><path d="m370-80-16-128q-13-5-24.5-12T307-235l-119 50L78-375l103-78q-1-7-1-13.5v-27q0-6.5 1-13.5L78-585l110-190 119 50q11-8 23-15t24-12l16-128h220l16 128q13 5 24.5 12t22.5 15l119-50 110 190-103 78q1 7 1 13.5v27q0 6.5-2 13.5l103 78-110 190-118-50q-11 8-23 15t-24 12L590-80H370Zm112-260q58 0 99-41t41-99q0-58-41-99t-99-41q-59 0-99.5 41T342-480q0 58 40.5 99t99.5 41Z"/></svg></button>';
const MD_BUTTON_HTML = '<button class="cdx-button cdx-button--icon-only vector-limited-width-toggle extension-tool-button"><svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24"><path d="m640-360 120-120-42-43-48 48v-125h-60v125l-48-48-42 43 120 120ZM160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h640q33 0 56.5 23.5T880-720v480q0 33-23.5 56.5T800-160H160Zm60-200h60v-180h40v120h60v-120h40v180h60v-200q0-17-11.5-28.5T440-600H260q-17 0-28.5 11.5T220-560v200Z"/></svg></button>';
const HTML_BUTTON_HTML = '<button class="cdx-button cdx-button--icon-only vector-limited-width-toggle extension-tool-button"><svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24"><path d="M320-240 80-480l240-240 57 57-184 184 183 183-56 56Zm320 0-57-57 184-184-183-183 56-56 240 240-240 240Z"/></svg></button>';
const TOOLS_HTML = `<div class="extra-toolbar"></div>`
const toolsEl = addToolAreaItem(fromHTML(TOOLS_HTML));
closeTools();

function openTools() {
    clearToolButtons();
    const mdButton = addToolButton(MD_BUTTON_HTML);
    const htmlButton = addToolButton(HTML_BUTTON_HTML);
    const settingsButton = addToolButton(SETTINGS_BUTTON_HTML);
    const closeButton = addToolButton(CLOSE_BUTTON_HTML);

    mdButton.addEventListener('click', e => {
        selectionMode = 'markdown';
        startSelection();
        e.stopPropagation();
        e.preventDefault();
    });
    htmlButton.addEventListener('click', e => {
        selectionMode = 'html';
        startSelection();
        e.stopPropagation();
        e.preventDefault();
    });
    settingsButton.addEventListener('click', () => {
        settingsButton.blur();
        const settingsPopup = fromHTML(SETTINGS_POPUP_HTML);
        settingsPopup.querySelector('.backdrop').addEventListener('click', () => settingsPopup.remove());
        settingsPopup.querySelector('.close-button').addEventListener('click', () => settingsPopup.remove());

        const readSettings = () => {
            for (const key in settings) {
                [...settingsPopup.querySelectorAll(`[name="extension-settings-${key}"]`)].forEach(el => el.checked = (el.value === settings[key]));
            }
        }

        settingsPopup.querySelector('.reset-button').addEventListener('click', () => {
            settings = defaultSettings;
            updateSetting();
            readSettings();
        });

        const addChangeEvent = key => el => el.addEventListener('change', e => updateSetting(key, e.target.value));
        for (const key in settings) {
            [...settingsPopup.querySelectorAll(`[name="extension-settings-${key}"]`)].map(addChangeEvent(key));
        }
        readSettings();

        document.body.append(settingsPopup);
    })
    closeButton.addEventListener('click', closeTools);
}

function closeTools() {
    clearToolButtons();
    const openButton = addToolButton(TOOLS_BUTTON_HTML);

    openButton.addEventListener('click', openTools);
}

function addToolButton(html) {
    const el = fromHTML(html);
    toolsEl.append(el);
    return el;
}

function clearToolButtons() {
    toolsEl.innerHTML = "";
}

addEventListener('load', () => {
    highlightOverlay = document.createElement('div');
    highlightOverlay.style.cursor = 'crosshair';
    highlightOverlay.style.outlineColor = '#3366cc';
    highlightOverlay.style.outlineWidth = '2px';
    highlightOverlay.style.outlineStyle = 'solid';
    highlightOverlay.style.position = 'absolute';
    highlightOverlay.style.boxSizing = 'border-box';
    highlightOverlay.style.zIndex = 999999;
    document.body.appendChild(highlightOverlay);
    hoverElement(null);
});

function hoverElement(el) {
    if (hoveredElement) {
        highlightOverlay.style.display = 'none';
    }
    hoveredElement = el;
    if (hoveredElement) {
        highlightOverlay.style.display = 'block';
        const rect = el.getBoundingClientRect();
        highlightOverlay.style.left = `${rect.left}px`;
        highlightOverlay.style.top = `${rect.top + window.scrollY}px`;
        highlightOverlay.style.width = `${rect.width}px`;
        highlightOverlay.style.height = `${rect.height}px`;
    }
}

function writeToClipboard(text) {
    var copyFrom = document.createElement("textarea");

    copyFrom.textContent = text;
    document.body.appendChild(copyFrom);

    copyFrom.select();
    document.execCommand(`copy`);

    copyFrom.blur();
    document.body.removeChild(copyFrom);
}

function createNotification(text, anchorElement) {
    const toastEl = fromHTML(`<button class="cdx-button cdx-button--icon-only vector-limited-width-toggle notification">${text}</button>`);
    const bounds = anchorElement.getBoundingClientRect();
    toastEl.style.top = `${bounds.top}px`;
    toastEl.style.height = `${bounds.height}px`;
    toastEl.style.right = `${document.body.clientWidth - bounds.left + 8}px`;
    document.body.append(toastEl);
    setTimeout(() => {
        toastEl.remove();
    }, 3000);
}

function startSelection() {
    async function clickCallback(e) {
        selectedElement = hoveredElement;
        hoverElement(null);
        e.stopPropagation();
        e.preventDefault();
        document.removeEventListener('click', clickCallback);
        document.removeEventListener('mousemove', moveCallback);
        if (selectedElement) {
            closeTools();
            if (selectionMode === 'markdown') {
                const parsed = parseInfobox(selectedElement);
                writeToClipboard(parsed);
                createNotification("Saved Markdown to Clipboard", toolsEl);
            } else if (selectionMode === 'html') {
                let parsed = "";
                if (settings.styles === 'inline') {
                    const cloned = selectedElement.cloneNode(true);
                    document.body.append(cloned);
                    transferStyles(cloned);
                    parsed = cloned.outerHTML;
                    cloned.remove();
                } else if (settings.styles === 'block') {
                    const [id, css] = extractAllCss();
                    selectedElement.classList.add(id);
                    parsed = selectedElement.outerHTML + '\n' + css;
                    selectedElement.classList.remove(id);
                } else {
                    parsed = selectedElement.outerHTML;
                }
                writeToClipboard(parsed);
                createNotification("Saved HTML to Clipboard", toolsEl);
            }
        }
    }
    function moveCallback(e) {
        for (const target of document.elementsFromPoint(e.clientX, e.clientY)) {
            if (!target) continue;
            if (!target.classList) continue;
            if (!target.classList.contains('infobox')) continue;
            hoverElement(target);
        }
        if (!document.elementsFromPoint(e.clientX, e.clientY).includes(hoveredElement)) hoverElement(null);
    }
    document.addEventListener('click', clickCallback);
    document.addEventListener('mousemove', moveCallback);
}



const origin = window.location.origin;
const page = window.location.href;
const protocol = window.location.protocol;

function closestCount(el, selector) {
    let curr = el.parentNode;
    let count = 0;
    while (curr) {
        curr = curr.closest(selector)?.parentNode;
        count++;
    }
    return count;
}

function trimNewlines(str) {
    return str.replace(/(^\n+)|(\n+$)/, '');
}

function convertLink(href) {
    if (href.startsWith('//')) return protocol + href;
    if (href[0] === '/') return origin + href;
    if (href[0] === '#') return page + href;
    return href;
}
function getLinkType(href) {
    if (href.startsWith('//')) return 'internal';
    if (href[0] === '/') return 'internal';
    if (href[0] === '#') return 'internal';
    return 'external';
}

function text(el) {
    return trimNewlines(el.textContent).replace('[', '\\[').replace(']', '\\]');
}

function parseBlock(elements) {
    return elements.map(el => {
        if (el.tagName === 'STYLE' || el.tagName === 'LINK') return '';
        if (el.tagName === 'BR') return '\n';
        if (el.tagName === 'HR') return '\n- - -\n';
        if (el.tagName === 'A') {
            if (settings.links !== 'all' && (settings.links === 'none' || getLinkType(el.getAttribute('href')) !== settings.links)) return parseBlock([...el.childNodes]);
            return `[${text(el)}](${convertLink(el.getAttribute('href'))})`;
        }
        if (el.tagName === 'B') return `**${parseBlock([...el.childNodes])}**`;
        if (el.tagName === 'I') return `*${parseBlock([...el.childNodes])}*`;
        if (el.tagName === 'SUP') {
            if (el.firstChild?.tagName === 'A') {
                if (settings.citations === 'off') return '';
                if (settings.citations === 'inline') return parseBlock([...el.childNodes]);
                return `<sup>${parseBlock([...el.childNodes]).replace('\\[', '[').replace('\\]', ']')}</sup>`;
            }
            return `<sup>${parseBlock([...el.childNodes])}</sup>`;
        }
        if (el.tagName === 'UL') {
            const indentStr = SETTINGS_LIST_STR_TABLE[settings.lists];
            const indentCount = closestCount(el, 'ul') - 1;
            return (indentCount ? '\n' : '') + parseList(el).map(str => `${indentStr.repeat(indentCount)}- ${str}`).join('\n');
        }
        if (el.tagName === 'SPAN' && el.getAttribute('typeof') != undefined) {
            const type = el.getAttribute('typeof');
            if (type.startsWith('mw:File')) return parseBlock([...el.firstChild.childNodes]);
            return '';
        }
        if (el.tagName === 'IMG') return `![Embedded Image|${el.getAttribute('width')}](${convertLink(el.getAttribute('src'))})\n`;
        if (el.tagName === 'SPAN' || el.tagName === 'DIV') {
            return parseBlock([...el.childNodes]);
        }
        if (el.tagName === 'P') {
            return parseBlock([...el.childNodes]) + '\n';
        }
        return text(el);
    }).join('');
}

function parseList(list) {
    const items = [...list.childNodes];
    return items.map(item => parseBlock([...item.childNodes])).filter(str => str.trim().length);
}

function parseTable(table) {
    const tbody = table.firstChild;
    const rows = [...tbody.childNodes];
    return rows.map(row => {
        const children = [...row.childNodes];
        if (children[0].tagName === 'TH' && children[1].tagName === 'TD') {
            return `## ${parseBlock([...children[0].childNodes]).replace('\n', ' ')}\n${parseBlock([...children[1].childNodes])}`;
        }
        return '';
    }).join('\n');
}

function parseTd(td) {
    const children = [...td.childNodes];
    const firstChild = children[0];
    if (firstChild.tagName === 'TABLE') {
        return parseTable(firstChild);
    }
    return parseBlock(children);
}

function parseInfobox(infobox) {
    const tbody = infobox.querySelector('tbody');
    const rows = [...tbody.childNodes];
    let parsed = "";
    let i = 0;
    while (i < rows.length) {
        const children = [...rows[i].childNodes];
        const firstChild = children[0];

        if (firstChild.tagName === 'TH') {
            if (children.length > 1 && children[1].tagName === 'TD') {
                parsed += `## ${parseBlock([...children[0].childNodes]).replace('\n', ' ')}\n${parseBlock([...children[1].childNodes])}`;
            } else {
                parsed += `\n> [!info] ${text(firstChild)}`;
                if (firstChild.classList.contains('summary')) {
                    parsed += `\n${parseBlock([...rows[++i].childNodes[0].childNodes])}`.replace('\n', '\n> ');
                }
                parsed += '\n';
            }
        } else if (firstChild.tagName === 'TD') {
            parsed += children.map(child => parseTd(child)).join('\n- - -\n');
        }

        parsed += '\n';
        i++;
    }
    return parsed;
}