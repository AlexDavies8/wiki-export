# Wiki-export

This chrome extension allows you to export wikipedia elements as text.
Current formats:
- Markdown
- HTML

Currently Supported Elements:
- Infoboxes
- Tables
- Figures

Limitations:
- Tables with subcolumns/subrows aren't supported by markdown tables, so aren't supported for markdown export
- Figures with multiple images are classified differently so aren't currently supported
- Complex layouts inside of the infobox such as collapsable tables have issues
- Slim Inline Styles can be broken by external CSS 

Feel free to suggest additional features/elements to support via Github Issues.

Once installed, a tools button will appear in the bottom right on any wikipedia page.
This will allow you to change settings or export an element. Once you've clicked a format,
simply select the element on the page you wish to copy.

## Installation
1. Clone or download and unzip this repository.

Make sure you save it to somewhere save - the browser won't copy the extension so if the folder is deleted, the extension will break or disappear.

2. Go to `chrome://extensions` (in the address bar)
3. Enable Developer Mode.
4. Click 'Load Unpacked'
5. Select the cloned/unzipped extension folder.
<br>

Please feel free to donate if you found this extension useful.  

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/A0A8U5GAJ)
