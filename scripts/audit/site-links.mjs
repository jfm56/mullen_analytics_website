// Static link/asset audit: never calls authenticated APIs or submits forms.
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

function files(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const name = path.join(dir, entry.name);
    return entry.isDirectory() ? files(name) : [name];
  });
}
const sourceFiles = files('src').filter((f) => /\.(mjs|jsx?|tsx?)$/.test(f));
const pages = files('src/app').filter((f) => /\/page\.(jsx?|tsx?)$/.test(f));
const endpoints = files('src/app').filter((f) => /\/route\.(jsx?|tsx?)$/.test(f));
const routes = [...pages, ...endpoints].map((file) => '/' + path.dirname(file).slice('src/app'.length + 1))
  .map((route) => route.split('/').filter((part) => !/^\(.*\)$/.test(part)).join('/'));
const services = new Set(JSON.parse(fs.readFileSync('src/data/services.json', 'utf8')).map((item) => item.slug));
function matches(url) {
  if (url.startsWith('/services/')) return services.has(url.split('/')[2]);
  return routes.some((route) => {
    const expression = route.split('/').map((part) => {
      if (/^\[\[\.\.\./.test(part)) return '.*';
      if (/^\[\.\.\./.test(part)) return '.+';
      if (/^\[/.test(part)) return '[^/]+';
      return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }).join('/');
    return new RegExp(`^${expression}/?$`).test(url);
  });
}
const failures = [];
let checked = 0;
for (const file of sourceFiles) {
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  function check(value, node) {
    if (!value.startsWith('/') || value.startsWith('//')) return;
    const url = decodeURIComponent(value.split(/[?#]/)[0]);
    if (!url || url.startsWith('/api/')) return;
    checked++;
    const present = fs.existsSync(path.join('public', url));
    if (!present && !matches(url)) {
      const line = source.getLineAndCharacterOfPosition(node.getStart()).line + 1;
      failures.push({ file, line, url });
    }
  }
  function visit(node) {
    if (ts.isJsxAttribute(node) && ['href', 'src', 'poster'].includes(node.name.text)) {
      const init = node.initializer;
      if (init && ts.isStringLiteral(init)) check(init.text, node);
      if (init && ts.isJsxExpression(init) && init.expression && ts.isStringLiteral(init.expression)) check(init.expression.text, node);
    }
    if (ts.isPropertyAssignment(node) && ['href', 'image', 'src'].includes(node.name.getText(source).replace(/["']/g, '')) && ts.isStringLiteral(node.initializer)) {
      check(node.initializer.text, node);
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
}
console.log(JSON.stringify({ pages: pages.length, modules: sourceFiles.length, checked, failures }, null, 2));
if (failures.length) process.exitCode = 1;
