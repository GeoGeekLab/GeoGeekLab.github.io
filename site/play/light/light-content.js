(() => {
  'use strict';

  const EXPERIMENTS = Object.freeze([
    Object.freeze({
      id:'sky-no-scattering',
      index:'01',
      title:'WHY IS THE SKY BLUE?',
      question:'If the atmosphere stopped scattering sunlight, what would the sky away from the Sun look like?',
      choices:Object.freeze([
        Object.freeze({id:'white',label:'WHITE'}),
        Object.freeze({id:'black',label:'BLACK'}),
        Object.freeze({id:'red',label:'RED'})
      ]),
      correct:'black',
      mechanism:'atmosphericScattering',
      action:'REMOVE SCATTERING',
      chartMode:'sky',
      chartLabel:'SKY SCATTER / RELATIVE',
      revealTitle:'THE SKY GOES DARK.',
      reveal:'Without atmospheric scattering, sunlight from other directions no longer enters your sight line. The Sun remains bright; the background sky approaches black.',
      equation:'RAYLEIGH / RELATIVE STRENGTH ∝ λ⁻⁴',
      limit:'Teaching single-scatter spectral shape. This is not a solved TOA radiance field.'
    }),
    Object.freeze({
      id:'water-no-backscatter',
      index:'02',
      title:'WHAT MAKES WATER VISIBLE?',
      question:'If water could absorb light but could not backscatter any light toward you, what happens to the water-leaving signal?',
      choices:Object.freeze([
        Object.freeze({id:'same',label:'IT STAYS BLUE'}),
        Object.freeze({id:'collapse',label:'THE SIGNAL COLLAPSES'}),
        Object.freeze({id:'white',label:'IT TURNS WHITE'})
      ]),
      correct:'collapse',
      mechanism:'waterBackscatter',
      action:'REMOVE BACKSCATTER',
      chartMode:'water',
      chartLabel:'WATER-LEAVING Rrs / sr⁻¹',
      revealTitle:'THE WATER SIGNAL COLLAPSES.',
      reveal:'The water still exists and still absorbs light. But with bb forced to zero as a thought experiment, no modeled water-leaving reflectance returns toward the observer.',
      equation:'u = bb / (a + bb)  →  bb = 0  →  Rrs = 0',
      limit:'Mechanism ablation outside natural-water states. The baseline Rrs comes from the validated Water as Spectrum engine.'
    }),
    Object.freeze({
      id:'surface-no-reflection',
      index:'03',
      title:'IS THE OCEAN JUST REFLECTED SKY?',
      question:'If the air–water surface stopped reflecting the sky, would the water-leaving signal also disappear?',
      choices:Object.freeze([
        Object.freeze({id:'disappear',label:'YES · ALL BLUE DISAPPEARS'}),
        Object.freeze({id:'remains',label:'NO · WATER SIGNAL REMAINS'}),
        Object.freeze({id:'brighter',label:'THE WATER GETS BRIGHTER'})
      ]),
      correct:'remains',
      mechanism:'surfaceReflection',
      action:'REMOVE SURFACE REFLECTION',
      chartMode:'surface',
      chartLabel:'SKY-REFLECTION PATH / RELATIVE',
      revealTitle:'REFLECTION DISAPPEARS. WATER REMAINS.',
      reveal:'Surface reflection and water-leaving radiance are different paths. Turning off the reflected-sky path removes that contribution without deleting the modeled water signal.',
      equation:'OBSERVED WATER VIEW = SURFACE PATH + WATER-LEAVING PATH',
      limit:'Surface path uses a fixed-angle Fresnel teaching model. It is not a sunglint or rough-surface BRDF solver.'
    })
  ]);

  window.GeoPlayLightContent = Object.freeze({
    EXPERIMENTS,
    WATER_STATE:Object.freeze({chl:0.10,ag440:0.02,aNap443:0.005,bbp443:0.0007,eta:1}),
    MODEL_LIMITS:Object.freeze([
      'WATER / 400–700 NM · 1 NM',
      'WATER / OPTICALLY DEEP · HOMOGENEOUS',
      'ATMOSPHERE / CONCEPTUAL RAYLEIGH SHAPE',
      'SURFACE / FIXED-ANGLE FRESNEL',
      'TOA / NOT MODELED'
    ])
  });
})();
