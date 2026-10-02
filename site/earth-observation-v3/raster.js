import { bboxArray, requestDimensions, viewportBounds, wmsUrl } from './model.js';

export function createImageLoader(signal) {
  const foreground = new Set();

  function cancelForeground() {
    [...foreground].forEach(record => record.cancel?.());
  }

  function preload(src, { timeout=15000 } = {}) {
    return new Promise(resolve => {
      if (signal?.aborted) return resolve({ ok:false, src, image:null, aborted:true });
      const image = new Image();
      let settled = false;
      let timer = 0;
      let record = null;
      const finish = (ok, extra = {}) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (record) foreground.delete(record);
        signal?.removeEventListener?.('abort', onAbort);
        image.onload = null;
        image.onerror = null;
        resolve({ ok, src, image:ok ? image : null, ...extra });
      };
      const cancel = () => {
        try { image.src = ''; } catch {}
        finish(false, { aborted:true });
      };
      const onAbort = cancel;
      record = { cancel };
      foreground.add(record);
      image.referrerPolicy = 'no-referrer';
      image.decoding = 'async';
      image.onload = () => finish(true);
      image.onerror = () => finish(false);
      signal?.addEventListener?.('abort', onAbort, { once:true });
      timer = setTimeout(() => {
        try { image.src = ''; } catch {}
        finish(false, { timeout:true });
      }, timeout);
      image.src = src;
    });
  }

  return {
    preload,
    cancelForeground,
    cancelAll:cancelForeground
  };
}

export function frameEntries({ endpoint, layer, contextLayer, state, frame, dateValue }) {
  const { width, height } = requestDimensions(frame);
  const bbox = bboxArray(viewportBounds(state));
  const common = { width, height, bbox };
  if (layer.renderMode === 'overlay') {
    return [
      {
        role:'context',
        src:wmsUrl(endpoint, contextLayer.layer, dateValue, { ...common, format:contextLayer.format, transparent:false }),
        opacity:1
      },
      {
        role:'observation',
        src:wmsUrl(endpoint, layer.layer, dateValue, { ...common, format:layer.format, transparent:true }),
        opacity:state.overlayOpacity
      }
    ];
  }
  return [{
    role:'observation',
    src:wmsUrl(endpoint, layer.layer, dateValue, { ...common, format:layer.format, transparent:false }),
    opacity:1
  }];
}

export function commitLoadedStack(container, entries, results, altPrefix) {
  const fragment = document.createDocumentFragment();
  entries.forEach((entry, index) => {
    const image = results[index]?.image;
    if (!image) return;
    image.dataset.eoRole = entry.role;
    image.alt = `${altPrefix}${index ? ' overlay' : ''}`;
    image.referrerPolicy = 'no-referrer';
    image.draggable = false;
    image.style.opacity = String(entry.opacity);
    fragment.appendChild(image);
  });
  container.replaceChildren(fragment);
  return [...container.querySelectorAll('img')];
}
