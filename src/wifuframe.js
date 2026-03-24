(() => {
    const DEVICES = {
        mobile: { name: 'Mobile', ratio: '9/16' },
        desktop: { name: 'Desktop', ratio: '16/9' },
    };

    const ELEMENTS = {
        title: { tag: 'h1' },
        text: { tag: 'span' },
        button: { tag: 'button', click: true },
        image: { tag: 'div' },
        input: { tag: 'input', empty: true },
        block: { tag: 'div' },
        row: { tag: 'div' },
        col: { tag: 'div' },
        page: { tag: 'div' },
        spacer: { tag: 'div' },
    };

    const HTML_ESCAPE_MAP = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
    };

    function esc(s) {
        return s.replace(/[&<>"]/g, (c) => HTML_ESCAPE_MAP[c]);
    }

    function escJs(s) {
        return s.replace(/['"\\]/g, '\\$&').replace(/\n/g, '\\n');
    }

    function parseDevice(v) {
        const k = String(v).toLowerCase().trim();
        return DEVICES[k] || DEVICES.mobile;
    }

    function renderChildren(val) {
        return val
            .map((item) => {
                if (typeof item === 'string') {
                    return esc(item);
                }
                if (item && typeof item === 'object') {
                    return Object.entries(item)
                        .map(([k, v]) => renderElement(k, v))
                        .join('');
                }
                return '';
            })
            .join('');
    }

    function buildAttrs(cls, sty, extraAttrs, hasClick) {
        const classes = cls.join(' ');
        const style = sty.length > 0 ? ` style="${sty.join(';')}"` : '';
        const clickAttr = hasClick && !extraAttrs.includes('onclick') ? ' onclick="void(0)" role="button"' : '';
        return ` class="${classes}"${style}${extraAttrs}${clickAttr}`;
    }

    function processProps(rest, cls, sty, attrs) {
        for (const [k, v] of Object.entries(rest)) {
            switch (k) {
                case 'type':
                    cls.push(`wf-button--${v}`);
                    break;
                case 'color':
                    cls.push(`wf-text--${v}`);
                    break;
                case 'align':
                    sty.push(`text-align:${v}`);
                    break;
                case 'size':
                    sty.push(`width:${String(v).endsWith('%') ? v : `${v}px`}`);
                    break;
                case 'alert':
                    attrs.push(` onclick="alert(\'${escJs(v)}\')" role="button"`);
                    break;
                case 'confirm':
                    attrs.push(` onclick="if(confirm(\'${escJs(v)}\'))this.classList.add(\'active\')" role="button"`);
                    break;
                default:
                    break;
            }
        }
        return attrs.join('');
    }

    function getInner(key, text) {
        if (key === 'image') {
            const svg =
                '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>';
            const label = text ? `<span>${esc(text)}</span>` : '';
            return `<div>${svg}${label}</div>`;
        }
        if (key === 'spacer') {
            return '';
        }
        return esc(text);
    }

    function renderElement(key, val) {
        const def = ELEMENTS[key];
        if (!def) {
            return esc(String(val));
        }

        let text = '';
        let children = '';
        const cls = [`wf-${key}`];
        const sty = [];
        const attrs = [];

        if (val === null || val === undefined) {
            // no-op
        } else if (typeof val === 'string') {
            text = val;
        } else if (Array.isArray(val)) {
            children = renderChildren(val);
        } else if (typeof val === 'object') {
            const { value, v, text: t, ...rest } = val;
            text = value || v || t || '';

            const hasElementChild = Object.keys(rest).some((k) => ELEMENTS[k]);

            if (hasElementChild) {
                children = Object.entries(rest)
                    .map(([k, v]) => renderElement(k, v))
                    .join('');
            } else {
                processProps(rest, cls, sty, attrs);
            }
        }

        const attrsStr = buildAttrs(cls, sty, attrs.join(''), def.click);

        if (def.empty) {
            return `<div${attrsStr}><input type="text" placeholder="${esc(text)}"/></div>`;
        }

        const inner = children || getInner(key, text);
        return `<${def.tag}${attrsStr}>${inner}</${def.tag}>`;
    }

    function walk(node) {
        if (node === null || node === undefined) {
            return '';
        }
        if (typeof node === 'string') {
            return esc(node);
        }
        if (typeof node !== 'object') {
            return String(node);
        }

        const skipKeys = new Set(['device', 'id', 'ref']);
        return Object.entries(node)
            .filter(([key]) => !skipKeys.has(key))
            .map(([key, val]) => renderElement(key, val))
            .join('');
    }

    function parseDocs(src) {
        const yaml = window.jsyaml || window.jsYAML || window.yaml;
        if (!yaml) {
            throw new Error('js-yaml not loaded');
        }
        return yaml.loadAll(src);
    }

    function parseSingle(doc) {
        if (!doc || typeof doc !== 'object') {
            return [{ dev: null, html: '', id: null, ref: null }];
        }

        const { device: dev, id, ref, ...restDoc } = doc;
        const html = walk(restDoc);

        if (Array.isArray(dev)) {
            return dev.map((d) => ({ dev: parseDevice(d), html, id, ref }));
        }
        if (dev) {
            return [{ dev: parseDevice(dev), html, id, ref }];
        }
        return [{ dev: null, html, id, ref }];
    }

    function parse(src) {
        try {
            const docs = parseDocs(src);
            if (!docs || docs.length === 0) {
                return [{ dev: null, html: '', id: null, ref: null }];
            }

            const results = docs.filter((doc) => doc && typeof doc === 'object').flatMap((doc) => parseSingle(doc));

            return results.length > 0 ? results : [{ dev: null, html: '', id: null, ref: null }];
        } catch (e) {
            console.error('YAML parse error:', e);
            return [{ dev: null, html: `<div class="wf-err">${esc(e.message)}</div>`, id: null, ref: null }];
        }
    }

    function renderGroup(g) {
        if (!g.dev) {
            return `<div class="wf-c">${g.html}</div>`;
        }
        const { ratio, name } = g.dev;
        return `<div class="wf-dev" style="--r:${ratio}"><div class="wf-dev-sc">${g.html}</div><div class="wf-dev-lb">${esc(name)}</div></div>`;
    }

    function render(groups) {
        if (!groups || groups.length === 0) {
            return '';
        }
        const hasDev = groups.some((g) => g.dev);
        if (!hasDev) {
            return renderGroup(groups[0]);
        }
        return `<div class="wf-dev-g">${groups.map(renderGroup).join('')}</div>`;
    }

    function resolveRefs(groups, registry) {
        for (const g of groups) {
            if (g.id) {
                registry.set(g.id, g);
            }
        }
        for (const g of groups) {
            if (g.ref && registry.has(g.ref)) {
                const ref = registry.get(g.ref);
                g.dev = ref.dev;
                g.html = ref.html;
            }
        }
    }

    function wifuframe(src, registry = new Map()) {
        const groups = parse(src);
        resolveRefs(groups, registry);
        return render(groups);
    }

    function processBlocks() {
        const registry = new Map();
        const blocks = [];

        for (const el of document.querySelectorAll('pre.language-wifuframe, code.language-wifuframe')) {
            const src = el.textContent;
            const parsed = parse(src);
            resolveRefs(parsed, registry);

            for (const g of parsed) {
                if (g.id) {
                    registry.set(g.id, g);
                }
            }
            blocks.push({ el, groups: parsed });
        }

        for (const { el, groups } of blocks) {
            const div = document.createElement('div');
            div.className = 'wf';
            div.innerHTML = render(groups);

            const pre = el.closest('pre');
            if (pre && el.tagName === 'CODE') {
                pre.replaceWith(div);
            } else {
                el.replaceWith(div);
            }
        }
    }

    window.Wifuframe = { parse, render, wifuframe, idRegistry: new Map() };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', processBlocks);
    } else {
        processBlocks();
    }
})();
