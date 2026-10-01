#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');

function primeBody(html, pageKind, { inner = true } = {}) {
  return html.replace(/<body\b([^>]*)>/i, (match, attrs) => {
    const classMatch = attrs.match(/\bclass=(['"])([^'"]*)\1/i);
    const required = [...(inner ? ['ux-inner-page'] : []), 'ux-mobile-v5', `ux-page-${pageKind}`];
    if (classMatch) {
      const classes = new Set(classMatch[2].split(/\s+/).filter(Boolean));
      required.forEach(value => classes.add(value));
      attrs = attrs.replace(classMatch[0], `class=${classMatch[1]}${[...classes].join(' ')}${classMatch[1]}`);
    } else {
      attrs += ` class="${required.join(' ')}"`;
    }
    if (!/\bdata-page-kind=/.test(attrs)) attrs += ` data-page-kind="${pageKind}"`;
    return `<body${attrs}>`;
  });
}

for (const page of [
  { file: 'index.html', kind: 'home', inner: false },
  { file: 'lab.html', kind: 'lab', inner: true },
]) {
  const file = path.join(dist, page.file);
  const html = await fs.readFile(file, 'utf8');
  await fs.writeFile(file, primeBody(html, page.kind, { inner: page.inner }));
}

console.log('Primed first-response mobile layout state for Home and Lab.');
