# Wifuframe

YAML-based wireframe rendering library for UI mockups and prototypes.

**[Live Showcase](https://naqerl.github.io/wifuframe/)** - Interactive examples with live editor

## Installation

### Via CDN

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/wifuframe@latest/dist/wifuframe.css">
<script src="https://cdn.jsdelivr.net/npm/js-yaml@4/dist/js-yaml.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/wifuframe@latest/dist/wifuframe.js"></script>
```

### Via NPM

```bash
npm install wifuframe js-yaml
```

## Usage

### Auto-render from DOM

Add YAML code blocks with `language-wifuframe`:

```yaml
---
device: mobile
title: My App
button:
  text: Click Me
  type: primary
```

The library will automatically convert these blocks to rendered wireframes.

### Programmatic API

```javascript
const yaml = `
device: mobile
title: Hello World
button: Submit
`;

// Parse and render
const html = Wifuframe.wifuframe(yaml);
document.getElementById('container').innerHTML = html;
```

## Elements

- `title` - Heading text
- `text` - Plain text span
- `button` - Clickable button
- `image` / `img` - Image placeholder
- `input` - Text input field
- `block` - Card container
- `row` / `col` - Layout containers
- `page` - Page wrapper
- `spacer` - Empty spacing element

## Device Types

- `mobile` - 9:16 aspect ratio
- `desktop` - 16:9 aspect ratio

## License

MIT
