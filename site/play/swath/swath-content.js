(() => {
  'use strict';
  const EXPERIMENTS=Object.freeze([
    Object.freeze({
      id:'widen-fov',index:'01',title:'SEE MORE OR SEE BETTER?',
      question:'Keep altitude and detector samples fixed. Widen the field of view from 10° to 30°. What changes?',
      choices:Object.freeze([
        Object.freeze({id:'more-same',label:'MORE GROUND · SAME PIXELS'}),
        Object.freeze({id:'more-coarser',label:'MORE GROUND · COARSER PIXELS'}),
        Object.freeze({id:'less-sharper',label:'LESS GROUND · SHARPER PIXELS'})
      ]),
      correct:'more-coarser',
      from:Object.freeze({altitudeKm:600,fovDeg:10,detectorPixels:6000}),
      to:Object.freeze({altitudeKm:600,fovDeg:30,detectorPixels:6000}),
      action:'WIDEN FOV',
      revealTitle:'THE SWATH WIDENS. EACH SAMPLE ALSO WIDENS.',
      reveal:'The detector still has the same number of cross-track samples. A wider angular field spreads those samples across more ground.',
      equation:'IFOV ≈ FOV / N  ·  GSD grows when FOV grows and N stays fixed.',
      limit:'Spherical Earth geometry. Nadir and edge sample widths are geometric footprints, not full optical MTF resolution.'
    }),
    Object.freeze({
      id:'raise-orbit',index:'02',title:'WHAT DOES ALTITUDE BUY?',
      question:'Keep the same sensor. Raise the orbit from 500 km to 900 km. What happens?',
      choices:Object.freeze([
        Object.freeze({id:'wider-coarser',label:'WIDER · COARSER'}),
        Object.freeze({id:'wider-sharper',label:'WIDER · SHARPER'}),
        Object.freeze({id:'same',label:'NOTHING CHANGES'})
      ]),
      correct:'wider-coarser',
      from:Object.freeze({altitudeKm:500,fovDeg:15,detectorPixels:6000}),
      to:Object.freeze({altitudeKm:900,fovDeg:15,detectorPixels:6000}),
      action:'RAISE ORBIT',
      revealTitle:'HEIGHT EXPANDS THE FOOTPRINT AND THE PIXEL.',
      reveal:'With the same angular field and detector sampling, a higher orbit spans more ground. Each detector sample also subtends a larger ground footprint.',
      equation:'same angular sample + greater range → larger ground sample',
      limit:'Circular-orbit period is computed. Revisit time is intentionally not modeled.'
    }),
    Object.freeze({
      id:'add-detectors',index:'03',title:'CAN YOU SHARPEN WITHOUT NARROWING?',
      question:'Keep altitude and FOV fixed. Increase cross-track detector samples from 1,500 to 12,000. What happens?',
      choices:Object.freeze([
        Object.freeze({id:'same-swath-sharper',label:'SAME SWATH · SHARPER'}),
        Object.freeze({id:'wider-same',label:'WIDER SWATH · SAME PIXELS'}),
        Object.freeze({id:'narrower',label:'NARROWER SWATH'})
      ]),
      correct:'same-swath-sharper',
      from:Object.freeze({altitudeKm:600,fovDeg:20,detectorPixels:1500}),
      to:Object.freeze({altitudeKm:600,fovDeg:20,detectorPixels:12000}),
      action:'ADD SAMPLES',
      revealTitle:'THE VIEW STAYS WIDE. THE SAMPLING GETS FINER.',
      reveal:'Swath is controlled by geometry. Detector count partitions that same angular field into smaller instantaneous samples.',
      equation:'SWATH ≈ fixed  ·  IFOV = FOV / N ↓  ·  GSD ↓',
      limit:'Detector sampling is not the same as optical resolving power. Diffraction, MTF, motion, SNR, and processing remain outside V1.'
    })
  ]);
  window.GeoPlaySwathContent=Object.freeze({
    EXPERIMENTS,
    FREE_DEFAULT:Object.freeze({altitudeKm:600,fovDeg:20,detectorPixels:6000}),
    MODEL_LIMITS:Object.freeze([
      'EARTH / SPHERE · R = 6371 KM',
      'ORBIT / CIRCULAR HEIGHT FOR PERIOD ONLY',
      'SENSOR / NADIR-POINTING · SYMMETRIC CROSS-TRACK FOV',
      'GSD / GEOMETRIC SAMPLE FOOTPRINT',
      'REVISIT / NOT MODELED',
      'OPTICS + SNR + MTF / NOT MODELED'
    ])
  });
})();
