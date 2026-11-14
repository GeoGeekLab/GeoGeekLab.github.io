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
      limit:'Mechanism ablation outside natural-water states. The baseline Rrs comes from the idealized, numerically tested Water as Spectrum model, not from field observations.'
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
      equation:'TWO DISTINCT PATHS / SURFACE REFLECTION ≠ WATER-LEAVING SIGNAL',
      limit:'Surface path uses a fixed-angle Fresnel teaching model. It is not a sunglint or rough-surface BRDF solver.'
    }),
    Object.freeze({
      id:'sunset-long-path',
      index:'04',
      title:'WHY DOES THE SETTING SUN LOOK RED?',
      question:'As the direct sunlight travels through more atmosphere, which visible wavelengths are reduced most strongly?',
      choices:Object.freeze([
        Object.freeze({id:'short',label:'BLUE LIGHT WEAKENS MOST'}),
        Object.freeze({id:'long',label:'RED LIGHT WEAKENS MOST'}),
        Object.freeze({id:'equal',label:'ALL COLORS WEAKEN EQUALLY'})
      ]),
      correct:'short',
      action:'LOWER THE SUN',
      intervention:Object.freeze({id:'sunset',min:1,max:8,step:0.2,baseline:1.2,defaultValue:6,unit:'×',label:'RELATIVE AIR MASS'}),
      chartMode:'sunset',
      chartLabel:'DIRECT SUNLIGHT TRANSMISSION / FRACTION',
      revealTitle:'THE DIRECT BEAM LOSES MORE BLUE.',
      reveal:'A longer atmospheric path scatters more short-wavelength light out of the direct beam. The surviving direct sunlight becomes relatively richer in red light.',
      equation:'T(λ) = exp[−m τ₅₅₀ (550/λ)⁴]',
      limit:'Rayleigh-only direct-beam teaching model with τ₅₅₀ = 0.12 and relative air mass m. No aerosols, ozone, multiple scattering, or calibrated solar colors.'
    }),
    Object.freeze({
      id:'water-depth-absorption',
      index:'05',
      title:'WHY DOES RED LIGHT FADE UNDERWATER?',
      question:'If light travels through five metres of the same water, which spectral part does absorption remove most strongly?',
      choices:Object.freeze([
        Object.freeze({id:'red',label:'RED LIGHT WEAKENS FASTER'}),
        Object.freeze({id:'blue',label:'BLUE LIGHT WEAKENS FASTER'}),
        Object.freeze({id:'equal',label:'THE WHOLE SPECTRUM IS UNCHANGED'})
      ]),
      correct:'red',
      action:'SEND LIGHT 5 M DOWN',
      intervention:Object.freeze({id:'depth',min:0,max:8,step:0.25,baseline:0,defaultValue:5,unit:'m',label:'WATER PATH LENGTH'}),
      chartMode:'depth',
      chartLabel:'ABSORPTION-ONLY TRANSMISSION / FRACTION',
      revealTitle:'RED LIGHT IS ABSORBED MORE RAPIDLY.',
      reveal:'For this fixed water state, the absorption-only survival fraction falls rapidly at red wavelengths as path length increases.',
      equation:'T(λ,z) = exp[−a(λ) · z]',
      limit:'Uses Water as Spectrum total absorption a(λ). This is an absorption-only Beer–Lambert thought experiment, not Kd, underwater irradiance, or a full scattering solution.'
    }),
    Object.freeze({
      id:'surface-grazing-angle',
      index:'06',
      title:'WHY DOES A GLANCING VIEW REFLECT MORE LIGHT?',
      question:'For a smooth air–water interface, what happens to unpolarized reflection as the incidence angle increases toward grazing?',
      choices:Object.freeze([
        Object.freeze({id:'more',label:'REFLECTION INCREASES'}),
        Object.freeze({id:'less',label:'REFLECTION DECREASES'}),
        Object.freeze({id:'same',label:'REFLECTION IS UNCHANGED'})
      ]),
      correct:'more',
      action:'INCREASE INCIDENCE ANGLE',
      intervention:Object.freeze({id:'grazing',min:0,max:85,step:1,baseline:40,defaultValue:75,unit:'°',label:'INCIDENCE FROM NORMAL'}),
      chartMode:'grazing',
      chartLabel:'SMOOTH-SURFACE FRESNEL / FRACTION',
      revealTitle:'THE SMOOTH SURFACE REFLECTS MORE.',
      reveal:'Unpolarized Fresnel reflectance rises as the incoming ray approaches a grazing angle. Surface reflection and the water-leaving signal remain distinct.',
      equation:'R_F = (R_s + R_p) / 2',
      limit:'Flat, smooth interface with fixed refractive indices n_air = 1.00 and n_water = 1.34. Wavelength-independent Fresnel fraction; no rough sea, wave glint, or polarized imaging.'
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
