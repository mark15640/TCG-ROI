// Builds a single self-contained HTML fragment (CSS and JS inlined, no service worker)
// for hosts that serve one page, e.g. a claude.ai artifact preview.
import { execSync } from 'node:child_process';
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';

execSync('npx vite build --mode single --outDir dist-single --emptyOutDir', { stdio: 'inherit' });
const dir = 'dist-single/assets';
const files = readdirSync(dir);
const css = files.filter((f) => f.endsWith('.css')).map((f) => readFileSync(`${dir}/${f}`, 'utf8')).join('\n');
const js = files.filter((f) => f.endsWith('.js')).map((f) => readFileSync(`${dir}/${f}`, 'utf8')).join('\n');
if (js.includes('</script')) throw new Error('Bundle contains </script and cannot be inlined safely.');

const html = `<title>TCG Grading ROI</title>
<meta name="description" content="Compare PSA, CGC, SGC, BGS and TAG grading against selling raw, after eBay fees, shipping and supplies." />
<meta name="theme-color" content="#f5f6f8" />
<script>
  try {
    var t = localStorage.getItem('tcg-roi:theme');
    if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
  } catch (e) {}
</script>
<style>
${css}
</style>
<div id="root"></div>
<script type="module">
${js}
</script>
`;
mkdirSync('dist-single', { recursive: true });
writeFileSync('dist-single/tcg-grading-roi.html', html);
console.log(`dist-single/tcg-grading-roi.html (${(html.length / 1024).toFixed(0)} KB)`);
