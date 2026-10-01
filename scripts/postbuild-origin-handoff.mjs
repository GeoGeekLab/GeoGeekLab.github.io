#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');

const exitCss = String.raw`
/* Origin → GeoGeek handoff. Outside 00–08, but visually inside the same Origin instrument. */
.brand{min-height:32px}
.origin-exit{position:relative;min-height:188svh;padding:14vh max(28px,7vw);isolation:isolate}
.origin-exit-copy{position:sticky;z-index:6;top:50vh;width:min(980px,84vw);margin-inline:auto;transform:translateY(-50%);text-align:center;text-shadow:0 1px 16px rgba(0,0,0,.86)}
.origin-exit-kicker{margin:0 0 26px;font:650 12px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.14em;color:var(--muted);text-transform:uppercase}
.origin-exit-title{margin:0;font-family:"Songti SC","STSong","Noto Serif SC",serif;font-size:clamp(62px,9.3vw,142px);font-weight:400;line-height:.96;letter-spacing:-.055em;color:var(--fg);text-wrap:balance}
.origin-exit-body{margin:44px auto 0;max-width:760px;font-family:"Songti SC","STSong","Noto Serif SC",serif;font-size:clamp(20px,1.85vw,29px);line-height:1.8;letter-spacing:.06em;color:var(--soft);text-wrap:balance}
.origin-exit-link{display:inline-flex;align-items:center;gap:13px;min-height:46px;margin-top:62px;padding:0 6px;color:var(--muted);text-decoration:none;font:650 12px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.14em;text-transform:uppercase;text-shadow:0 1px 12px #000}
.origin-exit-link::before{content:"";width:28px;height:1px;background:var(--line);transition:width .35s var(--ease),background-color .35s ease}
.origin-exit-link::after{content:"↓";color:var(--fg);transition:transform .35s var(--ease)}
.origin-exit-link:hover,.origin-exit-link:focus-visible{color:var(--fg)}
.origin-exit-link:hover::before,.origin-exit-link:focus-visible::before{width:44px;background:rgba(242,240,233,.72)}
.origin-exit-link:hover::after,.origin-exit-link:focus-visible::after{transform:translateY(4px)}
.origin-exit-link:focus-visible{outline:1px solid rgba(255,255,255,.72);outline-offset:6px}
/* Scene 08 is allowed to fade to silence; the terminal page then restores the Origin chrome. */
body.origin-exit-active{--ending-fade:1!important;--grain-opacity:.027!important}
body.origin-exit-active .brand,body.origin-exit-active .origin-nav,body.origin-exit-active .count,body.origin-exit-active .rail,body.origin-exit-active .dots,body.origin-exit-active .sound{opacity:1!important}
body.origin-exit-active .rail i{transform:scaleY(1)!important}
body.origin-exit-active .hint{opacity:0!important}
body.origin-home-leaving .origin-exit-copy,body.origin-home-leaving .brand,body.origin-home-leaving .origin-nav,body.origin-home-leaving .count,body.origin-home-leaving .rail,body.origin-home-leaving .dots,body.origin-home-leaving .sound{opacity:0!important;transition:opacity .22s ease!important}
@media(max-width:760px){
  .brand{min-height:32px}
  .origin-exit{min-height:176svh;padding:14vh 22px}
  .origin-exit-copy{width:min(92vw,720px)}
  .origin-exit-kicker{margin-bottom:22px;font-size:10px}
  .origin-exit-title{font-size:clamp(50px,15vw,82px);letter-spacing:-.045em}
  .origin-exit-body{margin-top:30px;font-size:clamp(17px,4.8vw,22px);line-height:1.7}
  .origin-exit-link{margin-top:46px;font-size:10px}
}
@media(prefers-reduced-motion:reduce){.origin-exit-link::before,.origin-exit-link::after{transition:none}}
`;

const copyByLocale = {
  en: {
    kicker: 'HOMECOMING / COMPLETE',
    title: 'YOU ARE HERE.',
    body: 'The journey ends where attention begins.',
    cta: 'ENTER GEOGEEK',
    aria: 'Enter the GeoGeek home page',
  },
  zh: {
    kicker: '归途 / 已竟',
    title: '此刻为你',
    body: '行至水穷，坐看云起。',
    cta: '开始GeoGeek',
    aria: '开始 GeoGeek，进入首页',
  },
};

function portalMarkup(copy) {
  return `\n<section class="origin-exit" id="originExit" aria-labelledby="originExitTitle">\n  <div class="origin-exit-copy">\n    <p class="origin-exit-kicker">${copy.kicker}</p>\n    <h2 class="origin-exit-title" id="originExitTitle">${copy.title}</h2>\n    <p class="origin-exit-body">${copy.body}</p>\n    <a class="origin-exit-link" href="/index.html" aria-label="${copy.aria}">${copy.cta}</a>\n  </div>\n</section>\n`;
}

function replaceOnce(html, needle, replacement, label) {
  if (!html.includes(needle)) throw new Error(`Origin handoff: missing ${label}`);
  return html.replace(needle, replacement);
}

function injectOriginHandoff(html, locale) {
  if (html.includes('id="originExit"')) return html;
  const copy = copyByLocale[locale];
  if (!copy) throw new Error(`Origin handoff: unknown locale ${locale}`);

  html = replaceOnce(html, '</style>', `${exitCss}\n</style>`, 'style terminator');
  html = replaceOnce(html, '</main>', `${portalMarkup(copy)}</main>`, 'main terminator');

  const interactionNeedle = "  const interactionStatus = document.getElementById('interactionStatus');";
  html = replaceOnce(
    html,
    interactionNeedle,
    `${interactionNeedle}\n  const originExit = document.getElementById('originExit');`,
    'interaction status binding',
  );

  const scrollerNeedle = '  const scroller={y:scrollY,startY:scrollY,target:scrollY,startT:0,duration:0,active:false,driving:false,targetScene:0};';
  html = replaceOnce(
    html,
    scrollerNeedle,
    '  const scroller={y:scrollY,startY:scrollY,target:scrollY,startT:0,duration:0,active:false,driving:false,targetScene:0,exit:false};',
    'scroller state',
  );

  const syncNeedle = '    scroller.y=scrollY;scroller.startY=scrollY;scroller.target=scrollY;scroller.active=false;scroller.driving=false;';
  html = replaceOnce(
    html,
    syncNeedle,
    `${syncNeedle}scroller.exit=false;`,
    'scroller sync',
  );

  const nearestNeedle = '  function nearestSceneByScroll(y=scrollY){';
  const exitHelpers = `  let homeCommitted=false,exitTouchY=null;\n  function exitScrollY(){\n    if(!originExit) return maxScroll();\n    return clamp(originExit.offsetTop+originExit.offsetHeight*.5-H*.5,0,maxScroll());\n  }\n  function inExitZone(y=scrollY){\n    return !!originExit && y>sceneScrollY(sections.length-1)+H*.35;\n  }\n  function syncExitChrome(){\n    document.body.classList.toggle('origin-exit-active',inExitZone());\n  }\n  function enterHome(){\n    if(homeCommitted) return;\n    homeCommitted=true;\n    document.body.classList.add('origin-home-leaving');\n    setTimeout(()=>location.assign('/index.html'),reduced?0:220);\n  }\n  function glideToExit(){\n    if(!originExit) return;\n    const dest=exitScrollY();\n    if(reduced){scrollTo(0,dest);syncScroller();updateScrollState(true);syncExitChrome();return}\n    const diff=Math.abs(dest-scrollY);\n    scroller.startY=scrollY;scroller.y=scrollY;scroller.target=dest;scroller.startT=performance.now();\n    scroller.duration=clamp(360+diff*.045,420,720);\n    scroller.active=true;scroller.driving=true;scroller.exit=true;scroller.targetScene=sections.length-1;\n  }\n  addEventListener('scroll',syncExitChrome,{passive:true});\n  addEventListener('resize',syncExitChrome,{passive:true});\n  addEventListener('touchstart',e=>{if(e.touches.length===1)exitTouchY=e.touches[0].clientY},{passive:true});\n  addEventListener('touchend',e=>{\n    if(exitTouchY===null) return;\n    const endY=e.changedTouches&&e.changedTouches[0]?e.changedTouches[0].clientY:exitTouchY;\n    const dy=endY-exitTouchY;exitTouchY=null;\n    if(inExitZone()&&scrollY>=maxScroll()-Math.max(8,H*.02)&&dy<-48) enterHome();\n  },{passive:true});\n  requestAnimationFrame(syncExitChrome);\n`;
  html = replaceOnce(html, nearestNeedle, `${exitHelpers}${nearestNeedle}`, 'nearest-scene function');

  const glideStateNeedle = '    scroller.active=true;scroller.driving=true;scroller.targetScene=index;';
  html = replaceOnce(
    html,
    glideStateNeedle,
    '    scroller.active=true;scroller.driving=true;scroller.exit=false;scroller.targetScene=index;',
    'scene glide state',
  );

  const settleNeedle = '      scrollTo(0,scroller.target);scroller.y=scroller.target;scroller.active=false;scroller.driving=false;updateScrollState();dockScene(scroller.targetScene);';
  html = replaceOnce(
    html,
    settleNeedle,
    '      const wasExit=scroller.exit;scrollTo(0,scroller.target);scroller.y=scroller.target;scroller.active=false;scroller.driving=false;scroller.exit=false;updateScrollState();syncExitChrome();if(!wasExit)dockScene(scroller.targetScene);',
    'smooth-scroll settle',
  );

  const nativeSnapNeedle = `    if(!scroller.driving){\n      scroller.y=scrollY;scroller.startY=scrollY;scroller.target=scrollY;\n      clearTimeout(nativeSnapTimer);\n      // Scrollbar drags and other native scroll sources still settle on a reading position.\n      nativeSnapTimer=setTimeout(()=>{if(!scroller.driving&&!mobile())glideToScene(nearestSceneByScroll(scrollY),false)},130);\n    }`;
  const nativeSnapReplacement = `    if(!scroller.driving&&!inExitZone()){\n      scroller.y=scrollY;scroller.startY=scrollY;scroller.target=scrollY;\n      clearTimeout(nativeSnapTimer);\n      // Scrollbar drags and other native scroll sources still settle on a reading position.\n      nativeSnapTimer=setTimeout(()=>{if(!scroller.driving&&!mobile()&&!inExitZone())glideToScene(nearestSceneByScroll(scrollY),false)},130);\n    }`;
  html = replaceOnce(html, nativeSnapNeedle, nativeSnapReplacement, 'native snap guard');

  const wheelGuardNeedle = `    if(reduced||mobile()||e.ctrlKey) return;\n    e.preventDefault();`;
  const wheelGuardReplacement = `    if(mobile()||e.ctrlKey) return;\n    if(reduced){\n      if(inExitZone()&&e.deltaY>0&&scrollY>=maxScroll()-8) enterHome();\n      return;\n    }\n    e.preventDefault();`;
  html = replaceOnce(html, wheelGuardNeedle, wheelGuardReplacement, 'wheel reduced-motion guard');

  const wheelNeedle = `    const direction=Math.sign(wheelGesture.sum||raw);\n    const target=clamp(nearest+direction,0,sections.length-1);\n    wheelGesture.locked=true;wheelGesture.sum=0;glideToScene(target,true);`;
  const wheelReplacement = `    const direction=Math.sign(wheelGesture.sum||raw);\n    if(inExitZone()){\n      wheelGesture.locked=true;wheelGesture.sum=0;\n      if(direction<0) glideToScene(sections.length-1,true);\n      else enterHome();\n      return;\n    }\n    if(nearest===sections.length-1&&direction>0){\n      wheelGesture.locked=true;wheelGesture.sum=0;glideToExit();return;\n    }\n    const target=clamp(nearest+direction,0,sections.length-1);\n    wheelGesture.locked=true;wheelGesture.sum=0;glideToScene(target,true);`;
  html = replaceOnce(html, wheelNeedle, wheelReplacement, 'wheel navigation');

  const keyNeedle = `    if(['ArrowDown','PageDown'].includes(e.key)){e.preventDefault();glideToScene(Math.min(activeScene+1,8),true)}\n    else if(['ArrowUp','PageUp'].includes(e.key)){e.preventDefault();glideToScene(Math.max(activeScene-1,0),true)}\n    else if(e.key==='Home'){e.preventDefault();glideToScene(0,true)}\n    else if(e.key==='End'){e.preventDefault();glideToScene(8,true)}`;
  const keyReplacement = `    if(['ArrowDown','PageDown'].includes(e.key)){\n      e.preventDefault();\n      if(inExitZone()){enterHome();return}\n      if(activeScene>=sections.length-1) glideToExit();\n      else glideToScene(activeScene+1,true);\n    }\n    else if(['ArrowUp','PageUp'].includes(e.key)){\n      e.preventDefault();\n      if(inExitZone()) glideToScene(sections.length-1,true);\n      else glideToScene(Math.max(activeScene-1,0),true);\n    }\n    else if(e.key==='Home'){e.preventDefault();glideToScene(0,true)}\n    else if(e.key==='End'){e.preventDefault();glideToExit()}`;
  html = replaceOnce(html, keyNeedle, keyReplacement, 'keyboard navigation');

  return html;
}

async function canonicalizeHome() {
  const file = path.join(dist, 'index.html');
  let html = await fs.readFile(file, 'utf8');
  if (html.includes('data-geogeek-home-canonical')) return;
  const marker = `<link rel="canonical" href="https://geogeeklab.github.io/index.html"/>\n<script data-geogeek-home-canonical>\n(() => {\n  if (location.pathname === '/') location.replace('/index.html' + location.search + location.hash);\n})();\n</script>`;
  html = replaceOnce(html, '<head>', `<head>\n${marker}`, 'home head');
  html = html.replace('/ux-preinit.js?v=20260930g', '/ux-preinit.js?v=20261001a');
  html = html.replace('href="index.html"', 'href="/index.html"');
  await fs.writeFile(file, html);
}

for (const page of [
  { file: 'origin/index.html', locale: 'en' },
  { file: 'origin/cn/index.html', locale: 'zh' },
]) {
  const file = path.join(dist, page.file);
  const html = await fs.readFile(file, 'utf8');
  await fs.writeFile(file, injectOriginHandoff(html, page.locale));
}

await canonicalizeHome();
console.log('Added integrated Origin → GeoGeek handoff and canonicalized / to /index.html.');
