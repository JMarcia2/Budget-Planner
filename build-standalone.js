// Bundle the app into ONE self-contained HTML file: no server, no network, opens from disk.
const fs = require('fs'), path = require('path');
const dir = '/home/user/kinsenas-budget';
let html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(dir, 'styles.css'), 'utf8');
const js  = fs.readFileSync(path.join(dir, 'app.js'), 'utf8');

// inline the stylesheet
html = html.replace('<link rel="stylesheet" href="styles.css">',
  '<style>\n' + css + '\n</style>');

// inline the app script; guard against any </script> inside template strings
const safe = js.replace(/<\/script>/gi, '<\\/script>');
html = html.replace('<script src="app.js"></script>',
  '<script>\n' + safe + '\n</script>');

// service worker + manifest need HTTP; drop them so file:// throws nothing
html = html.replace(/<link rel="manifest"[^>]*>\n?/, '');
html = html.replace(/<script>\s*if \('serviceWorker'[\s\S]*?<\/script>\n?/,
  '<!-- service worker omitted: single-file build runs from disk, where SW is unavailable -->\n');

fs.writeFileSync('/home/user/Kinsenas-Budget-standalone.html', html);
const kb = (Buffer.byteLength(html) / 1024).toFixed(0);
console.log('wrote Kinsenas-Budget-standalone.html (' + kb + ' KB, single file)');
// sanity: nothing left pointing at a relative asset
const left = (html.match(/(?:href|src)="(?!data:|#)[^"]+"/g) || []).filter(s => !/^src="icon.svg"|apple-touch-icon/.test(s));
console.log('external refs remaining:', left.length ? left : 'none');
