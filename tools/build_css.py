#!/usr/bin/env python3
"""CR-01 · builds the two stylesheets of Charmiss Operations Management from the original sources.

    tools/src/ops-style.css   the Ops prototype 7.0 stylesheet (unchanged copy)
    tools/src/scm-styles.css  the Supply Chain Dashboard v3.3 stylesheet (unchanged copy)
    tools/src/ops-extra.css   CR-01 additions for the Ops shell (Supply menu groups, theme switch, dataset dialog, print)
    tools/src/supply-extra.css CR-01 additions for the Supply pages (Ops look: tokens, radius, buttons, table, filter bar)

    → style.css          Ops rules isolated from the Supply pages + a generated Dark theme (Light / Dark / System)
    → supply/supply.css  the SCM rules scoped to .sup with the Ops tokens; status and chart colours unchanged

Why: both stylesheets use the same class names (.kpi, .card, .pagehead, .toolbar …) and both style bare elements
(button, table, th, h1 …). Every Ops selector gets :where(:not(.sup *)) on its subject — zero specificity, so the Ops cascade
is exactly as before — and every SCM selector is prefixed with .sup. Run: python tools/build_css.py
"""
import colorsys
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..'))
SRC = os.path.join(HERE, 'src')
ISO = ':where(:not(.sup *))'
DARK = ':where([data-theme="dark"])'


# ---------------------------------------------------------------- tiny CSS parser (enough for these two files)
def strip_comments(css):
    return re.sub(r'/\*.*?\*/', '', css, flags=re.S)


def parse(css):
    """→ list of nodes: ('rule', prelude, body) | ('at', prelude, [nodes]) | ('raw', text)"""
    out, i, n = [], 0, len(css)
    while i < n:
        j = i
        while j < n and css[j] not in '{};':
            if css[j] in '"\'':
                q = css[j]; j += 1
                while j < n and css[j] != q: j += 1
            j += 1
        if j >= n:
            break
        prelude = css[i:j].strip()
        if css[j] == ';':                     # @import … ;
            if prelude: out.append(('raw', prelude + ';'))
            i = j + 1; continue
        if css[j] == '}':
            i = j + 1; continue
        depth, k = 1, j + 1
        while k < n and depth:
            if css[k] == '{': depth += 1
            elif css[k] == '}': depth -= 1
            elif css[k] in '"\'':
                q = css[k]; k += 1
                while k < n and css[k] != q: k += 1
            k += 1
        body = css[j + 1:k - 1]
        if prelude.startswith('@media') or prelude.startswith('@supports'):
            out.append(('at', prelude, parse(body)))
        elif prelude.startswith('@'):
            out.append(('raw', prelude + '{' + body + '}'))
        else:
            out.append(('rule', prelude, body.strip()))
        i = k
    return out


def split_top(s, sep=','):
    parts, depth, cur = [], 0, ''
    for ch in s:
        if ch in '([': depth += 1
        elif ch in ')]': depth -= 1
        if ch == sep and depth == 0:
            parts.append(cur); cur = ''
        else:
            cur += ch
    parts.append(cur)
    return [p.strip() for p in parts if p.strip()]


def decls(body):
    return [(d.split(':', 1)[0].strip(), d.split(':', 1)[1].strip()) for d in split_top(body, ';') if ':' in d]


def emit(nodes, fn, indent=''):
    """fn(selector_list, body) → list of (selector_list, body) to write."""
    out = []
    for node in nodes:
        if node[0] == 'raw':
            out.append(node[1])
        elif node[0] == 'at':
            inner = emit(node[2], fn)
            if inner.strip():
                out.append(node[1] + '{\n' + inner + '\n}')
        else:
            for sel, body in fn(node[1], node[2]):
                if sel and body.strip():
                    out.append(sel + '{' + body + '}')
    return '\n'.join(out)


# ---------------------------------------------------------------- Ops: isolate from .sup
def subject_insert(sel, piece):
    """insert piece after the last compound selector (before a ::pseudo-element)."""
    depth, last = 0, 0
    for idx, ch in enumerate(sel):
        if ch in '([': depth += 1
        elif ch in ')]': depth -= 1
        elif depth == 0 and ch in ' >+~':
            last = idx + 1
    comp = sel[last:]
    m = re.search(r'::[a-zA-Z-]+(\(.*\))?$', comp)
    if m:
        return sel[:last] + comp[:m.start()] + piece + comp[m.start():]
    return sel + piece


def iso_sel(sel):
    s = sel.strip()
    if s in (':root', 'html', 'body') or s.startswith(':root') or re.match(r'^(html|body)\b', s) or s.startswith('dialog::backdrop'):
        return s
    return subject_insert(s, ISO)


# ---------------------------------------------------------------- Ops: generated Dark theme
SIDEBAR = re.compile(r'^(aside|nav\b|nav |\.sidebarfoot|\.brand|\.navlabel|\.loginart|aside )')
COLOR_PROPS = ('background', 'background-color', 'background-image', 'color', 'border', 'border-color', 'border-top', 'border-bottom',
               'border-left', 'border-right', 'border-top-color', 'border-bottom-color', 'border-left-color', 'border-right-color',
               'outline', 'outline-color', 'fill', 'stroke', 'caret-color', 'text-decoration-color', 'accent-color')
HEX = re.compile(r'#([0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b')
NAMED = {'white': 'ffffff', '#fff': 'ffffff'}


def hex_rgb(h):
    h = h.lstrip('#')
    if len(h) in (3, 4):
        h = ''.join(c * 2 for c in h)
    a = h[6:8] if len(h) == 8 else ''
    return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), a


def accent_like(r, g, b):
    h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
    return s > 0.45 and 0.33 <= l <= 0.68


def invert(r, g, b, prop):
    h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
    if s > 0.45 and 0.33 <= l <= 0.68:          # brand / accent colours keep their hue and weight
        if prop == 'color':
            l = min(0.78, l + 0.14)
        return colorsys.hls_to_rgb(h, l, s)
    if s < 0.18:                                # near-neutral greys take the navy tint of the Ops dark palette
        h, s = 0.625, max(s, 0.26)
    if l >= 0.5:
        l2, s2 = 0.135 + (1 - l) * 0.95, min(s, 0.45) * 0.8
    else:
        l2, s2 = 0.93 - l * 0.7, s * 0.7
    return colorsys.hls_to_rgb(h, max(0, min(1, l2)), max(0, min(1, s2)))


def dark_value(prop, val, keep_white):
    def rep(m):
        r, g, b, a = hex_rgb(m.group(0))
        if keep_white and (r, g, b) == (255, 255, 255):
            return m.group(0)
        rr, gg, bb = invert(r, g, b, prop)
        return '#%02x%02x%02x%s' % (round(rr * 255), round(gg * 255), round(bb * 255), a)
    v = HEX.sub(rep, val)
    v = re.sub(r'\bwhite\b', '#191e2e' if not keep_white else 'white', v)
    return v


def dark_rules(sel, body):
    if any(SIDEBAR.match(s.strip()) for s in split_top(sel)):
        return None
    ds = decls(body)
    bg_accent = False
    for p, v in ds:
        if p.startswith('background'):
            for m in HEX.finditer(v):
                if accent_like(*hex_rgb(m.group(0))[:3]): bg_accent = True
    out = []
    for p, v in ds:
        if p not in COLOR_PROPS or not (HEX.search(v) or re.search(r'\bwhite\b', v)):
            continue
        nv = dark_value(p, v, keep_white=bg_accent and p == 'color')
        if nv != v:
            out.append(p + ':' + nv)
    return ';'.join(out) if out else None


def build_ops():
    src = open(os.path.join(SRC, 'ops-style.css'), encoding='utf-8').read()
    marker = '/* GoSaaS-inspired commerce shell'
    cut = src.index(marker)
    head, tail = strip_comments(src[:cut]), strip_comments(src[cut:])
    nodes_head, nodes_tail = parse(head), parse(tail)

    def iso(prelude, body):
        return [(','.join(iso_sel(s) for s in split_top(prelude)), body)]

    def dark(prelude, body):
        if prelude.strip().startswith(':root'):
            return []
        b = dark_rules(prelude, body)
        if not b:
            return []
        return [(','.join(DARK + ' ' + iso_sel(s) if not s.strip().startswith(('html', 'body')) else DARK + ' ' + s.strip()
                          for s in split_top(prelude)), b)]

    extra = open(os.path.join(SRC, 'ops-extra.css'), encoding='utf-8').read()
    css = ['/* style.css — GENERATED by tools/build_css.py (CR-01). Edit tools/src/*.css and run the script. */',
           emit(nodes_head, iso), '/* ---- light shell (Ops 7.0) ---- */', emit(nodes_tail, iso),
           '/* ---- CR-01 · Dark theme (generated from the light rules; sidebar keeps its navy) ---- */',
           ':root[data-theme="dark"]{color-scheme:dark;--bg:#101321;--panel:#191e2e;--line:#30374b;--muted:#a2adc4;--text:#edf1fa;--accent:#8eabff;--green:#67d8b1;--pink:#dd9cbd}',
           emit(nodes_tail, dark),
           '/* ---- CR-01 · additions (tools/src/ops-extra.css) ---- */', extra]
    out = '\n'.join(css) + '\n'
    open(os.path.join(ROOT, 'style.css'), 'w', encoding='utf-8').write(out)
    return out


# ---------------------------------------------------------------- SCM: scope under .sup
def sup_sel(sel):
    s = sel.strip()
    if s == ':root':
        return '.sup'
    m = re.match(r'^:root\[data-theme="dark"\](.*)$', s)
    if m:
        return '[data-theme="dark"] .sup' + m.group(1)
    if s in ('html', 'body', 'html,body', '*', 'main'):
        return {'body': '.sup', '*': '.sup,.sup *,.sup *::before,.sup *::after'}.get(s, '')
    if s.startswith('html.lock'):
        return s
    if s.startswith('html') or s.startswith('body'):
        return ''
    m = re.match(r'^\[data-theme="dark"\]\s*(.*)$', s)
    if m:
        return '[data-theme="dark"] .sup ' + m.group(1)
    s = s.replace('#drawer', '#supDrawer').replace('#modal', '#supModal')
    return '.sup ' + s


def build_supply():
    src = strip_comments(open(os.path.join(SRC, 'scm-styles.css'), encoding='utf-8').read())
    nodes = parse(src)

    def scope(prelude, body):
        sels = [x for x in (sup_sel(s) for s in split_top(prelude)) if x]
        return [(','.join(sels), body)] if sels else []

    extra = open(os.path.join(SRC, 'supply-extra.css'), encoding='utf-8').read()
    out = '\n'.join(['/* supply/supply.css — GENERATED by tools/build_css.py (CR-01). The Supply Chain Dashboard v3.3 rules scoped to .sup;',
                     '   status / chart colours unchanged, neutral + brand tokens and component look from the Ops theme (tools/src/supply-extra.css). */',
                     emit(nodes, scope), '/* ---- CR-01 · Ops look ---- */', extra]) + '\n'
    open(os.path.join(ROOT, 'supply', 'supply.css'), 'w', encoding='utf-8').write(out)
    return out


if __name__ == '__main__':
    a, b = build_ops(), build_supply()
    print('style.css', len(a), 'bytes · supply/supply.css', len(b), 'bytes')
