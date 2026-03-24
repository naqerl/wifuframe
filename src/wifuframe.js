(() => {
    const DEVICES = {
        mobile: { name: 'Mobile', ratio: '9/16' },
        desktop: { name: 'Desktop', ratio: '16/9' },
    };

    const ELEMENTS = {
        title: { tag: 'h1', cls: 'wf-ti' },
        text: { tag: 'span', cls: 'wf-t' },
        button: { tag: 'button', cls: 'wf-b', click: true },
        image: { tag: 'div', cls: 'wf-img' },
        input: { tag: 'input', cls: 'wf-in', empty: true },
        block: { tag: 'div', cls: 'wf-card' },
        row: { tag: 'div', cls: 'wf-row' },
        col: { tag: 'div', cls: 'wf-col' },
        page: { tag: 'div', cls: 'wf-page' },
        spacer: { tag: 'div', cls: 'wf-sp' },
    };

    const idRegistry = new Map();

    function esc(s) {
        return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
    }
    function escJs(s) {
        return s.replace(/['"\\]/g, '\\$&').replace(/\n/g, '\\n');
    }

    function parseDevice(v) {
        const k = (v || '').toLowerCase().trim();
        return DEVICES[k] || DEVICES.mobile;
    }

    function renderElement(key, val) {
        const def = ELEMENTS[key];
        if (!def) return esc(String(val));

        let text = '';
        let children = '';
        const cls = [def.cls];
        const sty = [];
        let attrs = '';

        if (val === null || val === undefined) {
        } else if (typeof val === 'string') {
            text = val;
        } else if (Array.isArray(val)) {
            children = val
                .map((item) => {
                    if (typeof item === 'string') return esc(item);
                    if (typeof item === 'object' && item !== null) {
                        return Object.entries(item)
                            .map(([k, v]) => renderElement(k, v))
                            .join('');
                    }
                    return '';
                })
                .join('');
        } else if (typeof val === 'object') {
            const valKeys = Object.keys(val);
            const hasElementChild = valKeys.some((k) => ELEMENTS[k]);

            if (hasElementChild) {
                children = Object.entries(val)
                    .map(([k, v]) => renderElement(k, v))
                    .join('');
            } else {
                const { value, v, text: t, ...rest } = val;
                text = value || v || t || '';
                for (const [k, v] of Object.entries(rest)) {
                    if (k === 'type') cls.push('wf-b--' + v);
                    else if (k === 'color') cls.push('wf-t--' + v);
                    else if (k === 'align') sty.push('text-align:' + v);
                    else if (k === 'size') sty.push('width:' + (String(v).endsWith('%') ? v : v + 'px'));
                    else if (k === 'alert') attrs += ' onclick="alert(\'' + escJs(v) + '\')" role="button"';
                    else if (k === 'confirm')
                        attrs +=
                            ' onclick="if(confirm(\'' + escJs(v) + '\'))this.classList.add(\'active\')" role="button"';
                }
            }
        }

        attrs = ' class="' + cls.join(' ') + '"' + (sty.length ? ' style="' + sty.join(';') + '"' : '') + attrs;
        if (def.click && !attrs.includes('onclick')) attrs += ' onclick="void(0)" role="button"';

        if (def.empty) {
            return '<div' + attrs + '><input type="text" placeholder="' + esc(text) + '"/></div>';
        }

        let inner = children;
        if (!inner) {
            switch (key) {
                case 'image':
                case 'img':
                    inner =
                        '<div class="wf-img-ph"></div>' +
                        (text ? '<span class="wf-img-lb">' + esc(text) + '</span>' : '');
                    break;
                case 'qr':
                    inner =
                        '<div class="wf-qr-ph"></div>' +
                        (text ? '<span class="wf-qr-lb">' + esc(text) + '</span>' : '');
                    break;
                case 'barcode':
                    inner =
                        '<div class="wf-bc-ph"></div>' +
                        (text ? '<span class="wf-bc-lb">' + esc(text) + '</span>' : '');
                    break;
                case 'avatar':
                    inner = text || '';
                    break;
                case 'dropdown':
                case 'select':
                    inner = '<span>' + esc(text || 'Select...') + '</span><span>▼</span>';
                    break;
                case 'icon':
                    inner = text || '◆';
                    break;
                case 'spacer':
                    inner = '';
                    break;
                default:
                    inner = esc(text);
            }
        }

        return '<' + def.tag + attrs + '>' + inner + '</' + def.tag + '>';
    }

    function walk(node) {
        if (node === null || node === undefined) return '';
        if (typeof node === 'string') return esc(node);
        if (typeof node !== 'object') return String(node);

        let html = '';
        for (const [key, val] of Object.entries(node)) {
            if (key === 'device' || key === 'id' || key === 'ref') continue;
            html += renderElement(key, val);
        }
        return html;
    }

    function parseDocs(src) {
        const yaml = window.jsyaml || window.jsYAML || window.yaml;
        if (!yaml) {
            for (const k of Object.keys(window)) {
                if (k.toLowerCase().includes('yaml') && window[k] && window[k].loadAll) {
                    return parseDocs(src);
                }
            }
            throw new Error('js-yaml not loaded');
        }
        return yaml.loadAll(src);
    }

    function parseSingle(doc) {
        if (!doc || typeof doc !== 'object') return [{ dev: null, html: '', id: null, ref: null }];
        const dev = doc.device;
        const id = doc.id;
        const ref = doc.ref;
        delete doc.device;
        delete doc.id;
        delete doc.ref;
        const html = walk(doc);
        if (Array.isArray(dev)) {
            return dev.map((d) => ({ dev: parseDevice(d), html, id, ref }));
        } else if (dev) {
            return [{ dev: parseDevice(dev), html, id, ref }];
        }
        return [{ dev: null, html, id, ref }];
    }

    function parse(src) {
        try {
            const docs = parseDocs(src);
            if (!docs || !docs.length) return [{ dev: null, html: '', id: null, ref: null }];
            const results = [];
            for (const doc of docs) {
                if (doc && typeof doc === 'object') {
                    const parsed = parseSingle(doc);
                    if (Array.isArray(parsed)) {
                        results.push(...parsed);
                    } else {
                        results.push(parsed);
                    }
                }
            }
            return results.length ? results : [{ dev: null, html: '', id: null, ref: null }];
        } catch (e) {
            console.error('YAML parse error:', e);
            return [{ dev: null, html: '<div class="wf-err">' + esc(e.message) + '</div>', id: null, ref: null }];
        }
    }

    function renderGroup(g) {
        if (!g.dev) return '<div class="wf-c">' + g.html + '</div>';
        const d = g.dev;
        return (
            '<div class="wf-dev" style="--r:' +
            d.ratio +
            '"><div class="wf-dev-sc">' +
            g.html +
            '</div><div class="wf-dev-lb">' +
            esc(d.name) +
            '</div></div>'
        );
    }

    function render(groups) {
        if (!groups || !groups.length) return '';
        const hasDev = groups.some((g) => g.dev);
        if (!hasDev) return renderGroup(groups[0]);
        return '<div class="wf-dev-g">' + groups.map(renderGroup).join('') + '</div>';
    }

    function wifuframe(src) {
        const groups = parse(src);

        for (const g of groups) {
            if (g.id) {
                idRegistry.set(g.id, g);
            }
        }

        for (const g of groups) {
            if (g.ref && idRegistry.has(g.ref)) {
                const ref = idRegistry.get(g.ref);
                g.dev = ref.dev;
                g.html = ref.html;
            }
        }

        return render(groups);
    }

    window.Wifuframe = { parse, render, wifuframe, idRegistry };

    document.addEventListener('DOMContentLoaded', () => {
        const blocks = [];
        document.querySelectorAll('pre.language-wifuframe, code.language-wifuframe').forEach((el) => {
            const src = el.tagName === 'CODE' ? (el.closest('pre') ? el.textContent : el.textContent) : el.textContent;
            const parsed = parse(src);
            for (const g of parsed) {
                if (g.id) idRegistry.set(g.id, g);
            }
            blocks.push({ el, src });
        });

        for (const { el, src } of blocks) {
            const groups = parse(src);

            for (const g of groups) {
                if (g.ref && idRegistry.has(g.ref)) {
                    const ref = idRegistry.get(g.ref);
                    g.dev = ref.dev;
                    g.html = ref.html;
                }
            }

            const div = document.createElement('div');
            div.className = 'wf';
            div.innerHTML = render(groups);

            if (el.tagName === 'CODE') {
                const p = el.closest('pre');
                if (p) p.replaceWith(div);
                else el.replaceWith(div);
            } else {
                el.replaceWith(div);
            }
        }
    });
})();
