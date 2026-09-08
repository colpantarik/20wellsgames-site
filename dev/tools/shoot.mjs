// Screenshot helper over the Chrome DevTools Protocol (no npm deps; Node 22+).
// usage: node dev/tools/shoot.mjs out.png <url> <width> <height> [scrollToSelector|y] [settleMs] [skipIntro]
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const [out, url, w = '1280', h = '800', scroll = '', settle = '1500', skip = '1'] = process.argv.slice(2);
const port = 9222 + Math.floor(Math.random() * 500);
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
  '--headless=new', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${port}`,
  '--user-data-dir=/tmp/shoot-profile-' + port, `--window-size=${w},${h}`, 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let target;
for (let i = 0; i < 40 && !target; i++) { await sleep(250); try { const l = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); target = l.find(t => t.type === 'page'); } catch {} }
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise(r => ws.onopen = r);
let id = 0; const pending = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result || m.error); pending.delete(m.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const evalJs = expr => send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }).then(r => r.result && r.result.value);
await send('Page.enable'); await send('Runtime.enable');
const mobile = +w < 700;
await send('Emulation.setDeviceMetricsOverride', { width: +w, height: +h, deviceScaleFactor: 2, mobile });
await send('Page.navigate', { url: 'about:blank' });
await send('Page.navigate', { url });
await sleep(800);
if (skip === '1') await evalJs("sessionStorage.setItem('introSeen','1'); location.reload(); 1");
await sleep(1500);
await evalJs('document.fonts.ready.then(()=>1)');
if (scroll) {
  if (/^\d+$/.test(scroll)) await evalJs(`window.scrollTo({top:${scroll},behavior:'instant'}); 1`);
  else await evalJs(`(()=>{const el=document.querySelector(${JSON.stringify(scroll)}); if(el){el.scrollIntoView({block:'start',behavior:'instant'}); window.scrollBy(0,-40);} return scrollY;})()`);
  // fire a few scroll events so scroll-linked drawing catches up
  for (let i = 0; i < 6; i++) { await evalJs('window.dispatchEvent(new Event("scroll")); 1'); await sleep(100); }
}
await sleep(+settle);
const info = await evalJs('JSON.stringify({scrollY, h: document.documentElement.scrollHeight, errors: (window.__errs||[])})');
const shot = await send('Page.captureScreenshot', { format: 'png' });
writeFileSync(out, Buffer.from(shot.data, 'base64'));
console.log(out, info);
ws.close(); chrome.kill();
