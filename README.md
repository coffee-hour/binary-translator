# binary-translator

A minimal single-page binary <-> text translator. Monochrome, monospace, no build step, no dependencies.

## Features

- Live bidirectional translation: type in either panel and the other updates instantly.
- Text is encoded as UTF-8, one byte per 8-bit group, separated by spaces.
- Binary input ignores whitespace (spaces, tabs, newlines are separators).
- Error highlighting: non 0/1 characters and trailing incomplete bytes are highlighted, with a message listing the problem.
- Optional byte table showing binary, decimal, hex, and character for each byte.
- Responsive layout.

## Usage

Open `index.html` in a browser. No server needed.

## Files

- `index.html` - markup
- `style.css` - monochrome styling on a #0a0a0a background
- `script.js` - translation and validation logic

## Notes

Binary input decodes to text only when every group is a complete, valid byte. Invalid byte sequences decode to the Unicode replacement character.
