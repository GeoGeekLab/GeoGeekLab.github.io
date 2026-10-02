import { bboxArray, requestDimensions, viewportBounds, wmsUrl } from './model.js';

export function createImageLoader(signal) {
  const foreground = new Set();
  const background = new Set();

  function cancelBucket(bucket) {
    [...bucket].forEach(record => record.cancel?.());
  }

  function preload(src, { timeout=15000, bucket=foreground } = {}) {
    return new Promise(resolve => {
      if (signal?.aborted) return resolve({ ok:false, src, aborted:true });
      const image = new Image();
      let settled = false;
      let timer = 0;
      let record = null;
      const finish = (ok, extra = {}) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (record) bucket.delete(record);
        signal?.removeEventListener?.('abort', onAbort);
        image.onload = null;
        image.onerror = null;
        resolve({ ok, src, ...extra });
      };
      const cancel = () => {
        try { image.src = ''; } catch {}
        finish(false, { aborted:true });
      };
      const onAbort = cancel;
      record = { cancel };
      bucket.add(record);
      image.referrerPolicy = 'no-referrer';
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

  function prefetch(entries) {
    cancelBucket(background);
    entries.forEach(entry => preload(entry.src, { timeout:12000, bucket:background }).catch(() => {}));
  }

  return {
    foreground,
    background,
    preload,
    prefetch,
    cancelForeground:() => cancelBucket(foreground),
    cancelAll:() => { cancelBucket(foreground); cancelBucket(background); }
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

export function renderStack(container, entries, altPrefix, esc) {
  container.innerHTML = entries.map((entry, index) =>
    `<img data-eo-role="${entry.role}" alt="${esc(`${altPrefix}${index ? ' overlay' : ''}`)}" referrerpolicy="no-referrer" draggable="false" style="opacity:${entry.opacity}" />`
  ).join('');
  return [...container.querySelectorAll('img')];
}
