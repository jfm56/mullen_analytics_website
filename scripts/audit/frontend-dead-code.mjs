#!/usr/bin/env node

/**
 * Conservative frontend dead-code inventory.
 *
 * All files under src/app are treated as Next.js entry points. The audit then
 * follows static imports into components, hooks, libraries, and data files.
 * A reported file is unreachable from those entry points; it is a review
 * candidate, not an instruction to delete it automatically.
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import ts from 'typescript';

const repoRoot = process.cwd();
const sourceRoot = path.join(repoRoot, 'src');
const appRoot = path.join(sourceRoot, 'app');
const extensions = ['.js', '.jsx', '.ts', '.tsx', '.json'];

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(target) : [target];
  });
}

function relative(file) {
  return path.relative(repoRoot, file).split(path.sep).join('/');
}

const files = walk(sourceRoot).filter((file) => extensions.includes(path.extname(file)));
const ignoredCodeArtifacts = walk(sourceRoot)
  .filter((file) => /(?:\.old|\.bak|~)$/.test(file))
  .sort((left, right) => relative(left).localeCompare(relative(right)));
const knownFiles = new Set(files.map((file) => path.normalize(file)));
const filesByBasename = new Map();
for (const file of files) {
  const basename = path.basename(file);
  const matches = filesByBasename.get(basename) ?? [];
  matches.push(file);
  filesByBasename.set(basename, matches);
}

function resolveImport(importer, specifier) {
  let base;
  if (specifier.startsWith('@/')) {
    base = path.join(sourceRoot, specifier.slice(2));
  } else if (specifier.startsWith('.')) {
    base = path.resolve(path.dirname(importer), specifier);
  } else {
    return null;
  }

  const candidates = [
    base,
    ...extensions.map((extension) => `${base}${extension}`),
    ...extensions.map((extension) => path.join(base, `index${extension}`)),
  ];
  return candidates.find((candidate) => knownFiles.has(path.normalize(candidate))) ?? null;
}

function externalPackage(specifier) {
  if (specifier.startsWith('@')) {
    return specifier.split('/').slice(0, 2).join('/');
  }
  return specifier.split('/')[0];
}

const graph = new Map();
const importsByFile = new Map();
for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');
  const imports = ts.preProcessFile(source, true, true).importedFiles.map((item) => item.fileName);
  importsByFile.set(file, imports);
  const literalFileReferences = [];
  for (const [basename, matches] of filesByBasename) {
    if (
      matches.length === 1 &&
      (source.includes(`'${basename}'`) || source.includes(`"${basename}"`) || source.includes(`\`${basename}\``))
    ) {
      literalFileReferences.push(matches[0]);
    }
  }
  graph.set(
    file,
    [
      ...imports.map((specifier) => resolveImport(file, specifier)).filter(Boolean),
      ...literalFileReferences,
    ],
  );
}

// Next.js discovers route and metadata modules by convention. Treating every
// src/app code/data file as a root deliberately favors false negatives over
// unsafe false positives.
const roots = files.filter((file) => file === appRoot || file.startsWith(`${appRoot}${path.sep}`));
const reachable = new Set();
const pending = [...roots];
while (pending.length) {
  const file = pending.pop();
  if (reachable.has(file)) continue;
  reachable.add(file);
  for (const dependency of graph.get(file) ?? []) pending.push(dependency);
}

const unreachable = files
  .filter((file) => !reachable.has(file))
  .sort((left, right) => relative(left).localeCompare(relative(right)));

const packageJson = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
const usedPackages = new Set();
for (const file of reachable) {
  for (const specifier of importsByFile.get(file) ?? []) {
    if (!specifier.startsWith('.') && !specifier.startsWith('@/') && !specifier.startsWith('node:')) {
      usedPackages.add(externalPackage(specifier));
    }
  }
}

// react-dom is consumed by Next.js even when application source does not
// import it directly.
const implicitRuntimeDependencies = new Set(['react-dom']);
const unusedDependencies = Object.keys(packageJson.dependencies ?? {})
  .filter((dependency) => !usedPackages.has(dependency) && !implicitRuntimeDependencies.has(dependency))
  .sort();

console.log('Frontend modules unreachable from src/app entry points:');
if (unreachable.length === 0) console.log('  (none)');
for (const file of unreachable) console.log(`  ${relative(file)}`);

console.log('\nDeclared runtime dependencies without reachable static imports:');
if (unusedDependencies.length === 0) console.log('  (none)');
for (const dependency of unusedDependencies) console.log(`  ${dependency}`);

console.log('\nCode-like backup artifacts ignored by the build:');
if (ignoredCodeArtifacts.length === 0) console.log('  (none)');
for (const file of ignoredCodeArtifacts) console.log(`  ${relative(file)}`);

console.log(
  `\nSummary: ${unreachable.length} unreachable frontend files; ` +
  `${unusedDependencies.length} dependency candidates; ` +
  `${ignoredCodeArtifacts.length} ignored backup artifacts. Review before removal.`,
);
