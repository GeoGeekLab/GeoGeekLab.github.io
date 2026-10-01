#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');

const exitCss = String.raw`
/* Origin → GeoGeek handoff. This is intentionally outside the 00–08 scene system. */
.origin-exit{position:relative;min-height:150svh;overflow:hidden;padding:0 max(28px,7vw);isolation:isolate}
.origin-exit::before,.origin-exit::after{content:"";position:absolute;z-index:0;background:rgba(242,240,233,.115);pointer-events:none}
.origin-exit::before{left:max(24px,10vw);right:max(24px,10vw);top:50%;height:1px}
.origin-exit::after{top:14%;bottom:14%;left:50%;width:1px}
.origin-exit-reticle{position:absolute;z-index:1;left:50%;top:50%;width:126px;height:126px;transform:translate(-50%,-50%);border:1px solid rgba(242,240,233,.17);border-radius:50%;pointer-events:none}
.origin-exit-reticle::before,.origin-exit-reticle::after{content:"";position:absolute;left:50%;top:50%;background:rgba(242,240,233,.42);transform:translate(-50%,-50%)}
.origin-exit-reticle::before{width:19px;height:1px}.origin-exit-reticle::after{width:1px;height:19px}
.origin-exit-reticle i{position:absolute;left:50%;top:50%;width:6px;height:6px;border-radius:50%;background:var(--signal);transform:translate(-50%,-50%);box-shadow:0 0 22px rgba(166,70,36,.38)}
.origin-exit-copy{position:absolute;z-index:2;left:50%;top:50%;width:min(1020px,88vw);transform:translate(-50%,-50%);text-align:center;text-shadow:0 1px 18px rgba(0,0,0,.9)}
.origin-exit-kicker{margin:0 0 42px;font:650 11px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.15em;color:var(--muted);text-transform:uppercase}
.origin-exit-title{margin:0;font-family:"Songti SC","STSong","Noto Serif SC",serif;font-size:clamp(58px,9.2vw,138px);font-weight:400;line-height:.96;letter-spacing:-.055em;color:var(--fg);text-wrap:balance}
.origin-exit-body{margin:34px auto 0;max-width:680px;font-family:"Songti SC","STSong","Noto Serif SC",serif;font-size:clamp(18px,1.55vw,24px);line-height:1.75;letter-spacing:.025em;color:var(--soft)}
.origin-exit-link{display:inline-flex;align-items:center;gap:13px;min-height:46px;margin-top:58px;padding:0 6px;color:rgba(242,240,233,.86);text-decoration:none;font:650 11px/1.2 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.14em;text-transform:uppercase}
.origin-exit-link::before{content:"";width:34px;height:1px;background:rgba(242,240,233,.42);transition:width .35s var(--ease),background-color .35s ease}
.origin-exit-link::after{content:"→";color:var(--fg);transition:transform .35s var(--ease)}
.origin-exit-link:hover::before,.origin-exit-link:focus-visible::before{width:52px;background:rgba(242,240,233,.82)}
.origin-exit-link:hover::after,.origin-exit-link:focus-visible::after{transform:translateX(4px)}
.origin-exit-link:focus-visible{outline:1px solid rgba(255,255,255,.72);outline-offset:6px}
.origin-exit-axis{position:absolute;z-index:1;margin:0;font:650 9px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.14em;color:rgba(242,240,233,.34);text-transform:uppercase;pointer-events:none}
.origin-exit-axis.top{left:50%;top:9%;transform:translateX(-50%)}
.origin-exit-axis.bottom{left:50%;bottom:9%;transform:translateX(-50%)}
.origin-exit-axis.left{left:max(26px,4vw);top:50%;transform:translateY(-50%)}
.origin-exit-axis.right{right:max(26px,4vw);top:50%;transform:translateY(-50%)}
.origin-exit-foot{position:absolute;z-index:2;left:50%;bottom:4.5%;transform:translateX(-50%);margin:0;white-space:nowrap;font:650 8px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.12em;color:rgba(242,240,233,.24);text-transform:uppercase}
@media(max-width:760px){
  .origin-exit{min-height:136svh;padding-inline:22px}
  .origin-exit::before{left:22px;right:22px}.origin-exit::after{top:10%;bottom:10%}
  .origin-exit-reticle{width:96px;height:96px}
  .origin-exit-copy{width:min(92vw,620px)}
  .origin-exit-kicker{margin-bottom:32px;font-size:9px}
  .origin-exit-title{font-size:clamp(48px,15vw,78px);letter-spacing:-.045em}
  .origin-exit-body{margin-top:26px;font-size:clamp(16px,4.4vw,20px);line-height:1.65}
  .origin-exit-link{margin-top:44px;font-size:10px}
  .origin-exit-axis.left,.origin-exit-axis.right{display:none}
  .origin-exit-foot{bottom:3.5%;max-width:88vw;white-space:normal;text-align:center;font-size:7px;line-height:1.7}
}
@media(prefers-reduced-motion:reduce){.origin-exit-link::before,.origin-exit-link::after{transition:none}}
`;

const copyByLocale = {
  en: {
    lang: 'en',
    kicker: 'HOMECOMING / COMPLETE',
    title: 'YOU ARE HERE.',
    body: 'The journey ends where attention begins.',
    cta: 'ENTER GEOGEEK',
    aria: 'Enter the GeoGeek home page',
    top: 'ORIGIN · 00',
    bottom: 'HOME · HERE',
    left: 'STAR-STUFF',
    right: 'GEOGEEK',
    foot: 'FROM ORIGIN TO POSITION · FROM POSITION TO SEEING',
  },
  zh: {
    lang: 'zh-CN',
    kicker: '归途 / 完成',
    title: '你在这里。',
    body: '旅程止于此处，观看由此开始。',
    cta: '进入 GEOGEEK',
    aria: '进入 GeoGeek 首页',
    top: '来处 · 00',
    bottom: '归途 · 此处',
    left: '星尘',
    right: 'GEOGEEK',
    foot: '从来处到位置 · 从位置到观看',
  },
};

function portalMarkup(copy) {
  return `\n<section class="origin-exit" id="originExit" aria-labelledby="originExitTitle">\n  <p class="origin-exit-axis top">${copy.top}</p>\n  <p class="origin-exit-axis bottom">${copy.bottom}</p>\n  <p class="origin-exit-axis left">${copy.left}</p>\n  <p class="origin-exit-axis right">${copy.right}</p>\n  <div class="origin-exit-reticle" aria-hidden="true"><i></i></div>\n  <div class="origin-exit-copy">\n    <p class="origin-exit-kicker">${copy.kicker}</p>\n    <h2 class="origin-exit-title" id="originExitTitle">${copy.title}</h2>\n    <p class="origin-exit-body">${copy.body}</p>\n    <a class="origin-exit-link" href="/index.html" aria-label="${copy.aria}">${copy.cta}</a>\n  </div>\n  <p class="origin-exit-foot">${copy.foot}</p>\n</section>\n`;
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
  const exitHelpers = `  function exitScrollY(){\n    if(!originExit) return maxScroll();\n    return clamp(originExit.offsetTop+originExit.offsetHeight*.5-H*.5,0,maxScroll());\n  }\n  function inExitZone(y=scrollY){\n    return !!originExit && y>sceneScrollY(sections.length-1)+H*.35;\n  }\n  function glideToExit(){\n    if(!originExit) return;\n    const dest=exitScrollY();\n    if(reduced){scrollTo(0,dest);syncScroller();updateScrollState(true);return}\n    const diff=Math.abs(dest-scrollY);\n    scroller.startY=scrollY;scroller.y=scrollY;scroller.target=dest;scroller.startT=performance.now();\n    scroller.duration=clamp(360+diff*.045,420,720);\n    scroller.active=true;scroller.driving=true;scroller.exit=true;scroller.targetScene=sections.length-1;\n  }\n`;
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
    '      const wasExit=scroller.exit;scrollTo(0,scroller.target);scroller.y=scroller.target;scroller.active=false;scroller.driving=false;scroller.exit=false;updateScrollState();if(!wasExit)dockScene(scroller.targetScene);',
    'smooth-scroll settle',
  );

  const nativeSnapNeedle = `    if(!scroller.driving){\n      scroller.y=scrollY;scroller.startY=scrollY;scroller.target=scrollY;\n      clearTimeout(nativeSnapTimer);\n      // Scrollbar drags and other native scroll sources still settle on a reading position.\n      nativeSnapTimer=setTimeout(()=>{if(!scroller.driving&&!mobile())glideToScene(nearestSceneByScroll(scrollY),false)},130);\n    }`;
  const nativeSnapReplacement = `    if(!scroller.driving&&!inExitZone()){\n      scroller.y=scrollY;scroller.startY=scrollY;scroller.target=scrollY;\n      clearTimeout(nativeSnapTimer);\n      // Scrollbar drags and other native scroll sources still settle on a reading position.\n      nativeSnapTimer=setTimeout(()=>{if(!scroller.driving&&!mobile()&&!inExitZone())glideToScene(nearestSceneByScroll(scrollY),false)},130);\n    }`;
  html = replaceOnce(html, nativeSnapNeedle, nativeSnapReplacement, 'native snap guard');

  const wheelNeedle = `    const direction=Math.sign(wheelGesture.sum||raw);\n    const target=clamp(nearest+direction,0,sections.length-1);\n    wheelGesture.locked=true;wheelGesture.sum=0;glideToScene(target,true);`;
  const wheelReplacement = `    const direction=Math.sign(wheelGesture.sum||raw);\n    if(inExitZone()){\n      wheelGesture.locked=true;wheelGesture.sum=0;\n      if(direction<0) glideToScene(sections.length-1,true);\n      return;\n    }\n    if(nearest===sections.length-1&&direction>0){\n      wheelGesture.locked=true;wheelGesture.sum=0;glideToExit();return;\n    }\n    const target=clamp(nearest+direction,0,sections.length-1);\n    wheelGesture.locked=true;wheelGesture.sum=0;glideToScene(target,true);`;
  html = replaceOnce(html, wheelNeedle, wheelReplacement, 'wheel navigation');

  const keyNeedle = `    if(['ArrowDown','PageDown'].includes(e.key)){e.preventDefault();glideToScene(Math.min(activeScene+1,8),true)}\n    else if(['ArrowUp','PageUp'].includes(e.key)){e.preventDefault();glideToScene(Math.max(activeScene-1,0),true)}\n    else if(e.key==='Home'){e.preventDefault();glideToScene(0,true)}\n    else if(e.key==='End'){e.preventDefault();glideToScene(8,true)}`;
  const keyReplacement = `    if(['ArrowDown','PageDown'].includes(e.key)){\n      e.preventDefault();\n      if(inExitZone()) return;\n      if(activeScene>=sections.length-1) glideToExit();\n      else glideToScene(activeScene+1,true);\n    }\n    else if(['ArrowUp','PageUp'].includes(e.key)){\n      e.preventDefault();\n      if(inExitZone()) glideToScene(sections.length-1,true);\n      else glideToScene(Math.max(activeScene-1,0),true);\n    }\n    else if(e.key==='Home'){e.preventDefault();glideToScene(0,true)}\n    else if(e.key==='End'){e.preventDefault();glideToExit()}`;
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
console.log('Added Origin → GeoGeek handoff and canonicalized / to /index.html.');
