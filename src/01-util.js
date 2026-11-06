import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { Brush, Evaluator, ADDITION, SUBTRACTION, INTERSECTION } from 'three-bvh-csg';

const V3 = THREE.Vector3;
const V2 = THREE.Vector2;
const DEG = Math.PI / 180;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
let _uidN = 1;
const uid = (p = 'e') => p + (_uidN++).toString(36) + Math.random().toString(36).slice(2, 6);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const fmt = (v, d = 3) => {
  if (!isFinite(v)) return '—';
  const s = Math.abs(v) < 1e-9 ? '0' : (+v.toFixed(d)).toString();
  return s;
};
const el = (tag, attrs = {}, ...kids) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'html') e.innerHTML = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const k of kids.flat()) if (k != null && k !== false) e.append(k.nodeType ? k : document.createTextNode(k));
  return e;
};
const deepClone = (o) => JSON.parse(JSON.stringify(o));
const v3 = (a) => new V3(a[0], a[1], a[2]);
const arr3 = (v) => [v.x, v.y, v.z];

/* ---------- Expressions with units ---------- */
const LEN_UNITS = { mm: 1, cm: 10, m: 1000, in: 25.4, inch: 25.4, ft: 304.8, um: 0.001 };
const ANG_UNITS = { deg: 1, rad: 180 / Math.PI };
const FUNCS = {
  sin: (a) => Math.sin(a * DEG), cos: (a) => Math.cos(a * DEG), tan: (a) => Math.tan(a * DEG),
  asin: (a) => Math.asin(a) / DEG, acos: (a) => Math.acos(a) / DEG, atan: (a) => Math.atan(a) / DEG,
  atan2: (a, b) => Math.atan2(a, b) / DEG, sqrt: Math.sqrt, abs: Math.abs, min: Math.min, max: Math.max,
  round: Math.round, floor: Math.floor, ceil: Math.ceil, pow: Math.pow,
};
function tokenize(s) {
  const t = []; let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/\s/.test(c)) { i++; continue; }
    if (/[0-9.]/.test(c)) {
      let j = i; while (j < s.length && /[0-9.eE]/.test(s[j])) { if ((s[j] === 'e' || s[j] === 'E') && /[+-]/.test(s[j + 1])) j++; j++; }
      t.push({ t: 'n', v: parseFloat(s.slice(i, j)) }); i = j; continue;
    }
    if (/[#A-Za-z_]/.test(c)) {
      let j = i + 1; while (j < s.length && /[A-Za-z0-9_]/.test(s[j])) j++;
      t.push({ t: 'id', v: s.slice(i, j).replace(/^#/, '') }); i = j; continue;
    }
    if ('+-*/^(),'.includes(c)) { t.push({ t: c }); i++; continue; }
    throw new Error(`Unexpected "${c}"`);
  }
  return t;
}
function evalExpr(src, vars = {}) {
  if (typeof src === 'number') return src;
  const toks = tokenize(String(src)); let i = 0;
  const peek = () => toks[i], eat = (t) => { if (!toks[i] || toks[i].t !== t) throw new Error(`Expected ${t}`); return toks[i++]; };
  function expr() { let v = term(); while (peek() && (peek().t === '+' || peek().t === '-')) { const o = toks[i++].t; const r = term(); v = o === '+' ? v + r : v - r; } return v; }
  function term() { let v = unary(); while (peek() && (peek().t === '*' || peek().t === '/')) { const o = toks[i++].t; const r = unary(); v = o === '*' ? v * r : v / r; } return v; }
  function unary() { if (peek() && peek().t === '-') { i++; return -unary(); } if (peek() && peek().t === '+') { i++; return unary(); } return pow(); }
  function pow() { const b = postfix(); if (peek() && peek().t === '^') { i++; return Math.pow(b, unary()); } return b; }
  function postfix() {
    let v = primary();
    const p = peek();
    if (p && p.t === 'id' && (p.v in LEN_UNITS || p.v in ANG_UNITS)) { i++; v *= LEN_UNITS[p.v] ?? ANG_UNITS[p.v]; }
    return v;
  }
  function primary() {
    const p = toks[i++];
    if (!p) throw new Error('Incomplete expression');
    if (p.t === 'n') return p.v;
    if (p.t === '(') { const v = expr(); eat(')'); return v; }
    if (p.t === 'id') {
      if (FUNCS[p.v] && peek() && peek().t === '(') {
        i++; const args = [];
        if (peek().t !== ')') { args.push(expr()); while (peek() && peek().t === ',') { i++; args.push(expr()); } }
        eat(')'); return FUNCS[p.v](...args);
      }
      if (p.v === 'pi' || p.v === 'PI') return Math.PI;
      if (p.v in vars) return vars[p.v];
      throw new Error(`Unknown variable #${p.v}`);
    }
    throw new Error('Syntax error');
  }
  const v = expr();
  if (i < toks.length) throw new Error('Syntax error');
  if (!isFinite(v)) throw new Error('Not a finite number');
  return v;
}

/* ---------- Toasts ---------- */
function toast(msg, kind = 'info') {
  const host = $('#toasts'); if (!host) return;
  const t = el('div', { class: 'toast ' + kind, role: 'status' }, msg);
  host.append(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, kind === 'error' ? 4200 : 2400);
}
