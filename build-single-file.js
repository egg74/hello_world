#!/usr/bin/env node
/*
 * Bundles the app into one self-contained HTML file with the CSS and every
 * script inlined, so it can be hosted anywhere that takes a single file (or
 * emailed, or opened straight off a USB stick).
 *
 *   node build-single-file.js [output-path]
 *
 * The output omits the <html>/<head>/<body> wrapper, which is what hosts that
 * supply their own document skeleton expect. Browsers are happy with it either
 * way — a bare fragment still renders as a full page.
 */
const fs = require('fs');
const path = require('path');

const root = __dirname;
const out = process.argv[2] || path.join(root, 'dist', 'fitforge.html');

const SCRIPTS = ['anim', 'store', 'media', 'ui', 'exercises', 'routines', 'player', 'app'];

const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

// Guard against a literal </script> inside any source ending the block early.
const safe = (js) => js.replace(/<\/script>/gi, '<\\/script>');

const css = read('assets/styles.css');
const js = SCRIPTS
  .map((name) => '/* ===== assets/js/' + name + '.js ===== */\n' + safe(read('assets/js/' + name + '.js')))
  .join('\n\n');

const html = `<title>FitForge — build your routine</title>
<meta name="description" content="Build workout routines and see how every exercise is done.">
<style>
${css}
</style>

<div class="app">
  <header class="topbar">
    <a class="brand" href="#home">
      <span class="brand-mark" aria-hidden="true">FF</span>
      <span class="brand-name">FitForge</span>
    </a>
    <nav id="nav" class="nav" aria-label="Main"></nav>
  </header>

  <main id="view" class="view"></main>

  <footer class="footer">
    <span>Saved in this browser only — nothing is uploaded.</span>
  </footer>
</div>

<datalist id="category-list"></datalist>

<script>
${js}
</script>
`;

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);
console.log('Wrote ' + out + ' (' + (html.length / 1024).toFixed(1) + ' KB)');
