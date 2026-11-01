// The watchdog lives in the document, independently of the optional runtime.
export function bootPreinit(surface) {
  if (!['paper', 'dark'].includes(surface)) throw new Error('Unknown boot surface');
  return `(function(){var root=document.documentElement;root.dataset.geogeekBoot='loading';root.dataset.geogeekBootSurface='${surface}';function recover(){if(root.dataset.geogeekBoot!=='loading')return;root.dataset.geogeekBoot='ready';window.__GEOGEEK_VISUAL_READY__=true;window.__GEOGEEK_VISUAL_READY_AT__=performance.now();dispatchEvent(new CustomEvent('geogeek:visual-ready',{detail:{fallback:true}}));}window.__GEOGEEK_BOOT_WATCHDOG__=setTimeout(recover,3000);document.addEventListener('error',function(event){if(event.target&&event.target.tagName==='SCRIPT'&&/\\/visual-readiness\\.js(?:[?#]|$)/.test(event.target.src||''))recover();},true);})();`;
}
