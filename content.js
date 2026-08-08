window.GEOGEEK_DATA = {
  en: {
    ui: {
      localeName: 'English',
      switchLabel: '中文',
      skip: 'Skip to content',
      nav: {
        fieldNotes: 'Field Notes',
        lab: 'Lab',
        atlas: 'Atlas',
        elsewhere: 'Elsewhere',
        map: 'Map',
        close: 'Close'
      },
      sheet: {
        title: 'SHEET INDEX',
        origin: 'Origin',
        coordinates: 'Coordinates',
        fieldNotes: 'Field Notes',
        lab: 'Lab',
        atlas: 'Atlas',
        elsewhere: 'Elsewhere',
        homeFoot: 'ONE SCALE · FOUR FIELDS',
        globalFoot: 'COLLECTION · 1 : 25,000'
      },
      scale: {
        label: 'SCALE OF VIEW',
        levels: {
          SITE: 'SITE',
          POSITION: 'POSITION',
          COLLECTION: 'COLLECTION',
          RECORD: 'RECORD',
          DETAIL: 'DETAIL'
        }
      },
      cursorDatum: 'VIEWPORT DATUM',
      hero: {
        eyebrow: 'A PERSONAL ATLAS OF SPACE, TIME & TRACE',
        tagline: 'Geo to see. Geek to build.',
        lexicon: ['SPACE', 'TIME', 'PERSPECTIVE', 'TRACE'],
        left: 'DATUM / 00°00′00″',
        right: 'SCROLL / CHANGE SCALE ↓'
      },
      home: {
        now: {
          label: '01 / CURRENT COORDINATES',
          title: 'Every view begins somewhere.',
          subtitle: 'Position is not background; it belongs to what can be known.',
          cards: [
            { label: 'STUDYING', title: 'Space as relation, not container.', text: 'Distance, boundary, adjacency, and encounter make a place legible.' },
            { label: 'RESEARCHING', title: 'Time as process, not merely measure.', text: 'Change has succession, duration, rhythm, and irreversibility.' },
            { label: 'BUILDING', title: 'A model is a world with declared limits.', text: 'Good tools expose the choices by which a phenomenon becomes computable.' },
            { label: 'READING / THINKING', title: 'What changes when the observer moves?', text: 'Perspective belongs to the conditions under which evidence appears.' }
          ]
        },
        notes: {
          label: '02 / FIELD NOTES',
          title: 'Thought kept with its conditions.',
          subtitle: 'Before a claim hardens, keep its place, scale, source, and uncertainty.'
        },
        lab: {
          label: '03 / LAB',
          title: 'Build the conditions of seeing.',
          subtitle: 'Tools should make their scale, assumptions, and limits visible.',
          prototype: 'PROTOTYPE',
          prototypeTitle: 'The page as terrain',
          prototypeMeta: 'WEB · CARTOGRAPHY · INTERACTION',
          method: 'METHOD',
          methodTitle: 'The geography of evidence',
          methodMeta: 'GIS · REPRODUCIBILITY · SCALE'
        },
        atlas: {
          label: '04 / ATLAS',
          title: 'One archive, several orders.',
          subtitle: 'Space, time, type, and topic preserve different relations.',
          caption: 'ATLAS · REPROJECT THE ARCHIVE ↗'
        },
        elsewhere: {
          label: '05 / ELSEWHERE',
          title: 'Not everything that orients can be measured.',
          subtitle: 'A life exceeds its coordinates without leaving geography.'
        }
      },
      pages: {
        notes: {
          title: 'Field Notes — GeoGeek',
          eyebrow: 'OBSERVATION / CONDITION / REVISION',
          heading: 'Field Notes',
          intro: 'A note is a provisional coordinate: enough to return to a question, never enough to close it.'
        },
        lab: {
          title: 'Lab — GeoGeek',
          eyebrow: 'MODEL / INSTRUMENT / LIMIT',
          heading: 'Lab',
          intro: 'Build tools that expose their scale, assumptions, and limits.'
        },
        atlas: {
          title: 'Atlas — GeoGeek',
          eyebrow: 'SPACE / TIME / ORDER',
          heading: 'Atlas',
          intro: 'An archive has no neutral geometry. Every projection keeps one relation by letting another recede.'
        },
        elsewhere: {
          title: 'Elsewhere — GeoGeek',
          eyebrow: 'THE UNMEASURED FIELD',
          heading: 'Elsewhere',
          intro: 'Some things resist quantification and still alter orientation.'
        },
        home: { title: 'GeoGeek — Geo to see. Geek to build.' }
      },
      filters: {
        all: 'All',
        research: 'Research',
        reading: 'Reading',
        method: 'Methods',
        essay: 'Essay',
        fragment: 'Fragments'
      },
      reader: {
        close: 'Close',
        fallback: 'A field note should keep the conditions of its own making: source, scale, uncertainty, revision, and the place from which the claim was possible.'
      },
      lab: {
        enter: 'ENTER',
        groups: { studies: 'STUDIES', observatory: 'OBSERVATORY', play: 'PLAY / SPATIAL REASONING' },
        close: 'Close instrument',
        instrument: 'LIVE INSTRUMENT',
        principle: 'One instrument enters the foreground; the others recede.',
        boundary: 'LIVE DATA · CONDITIONS REMAIN VISIBLE',
        loadingOrbit: 'Reading the orbital field…',
        networkTitle: 'Live instrument unavailable.',
        networkHint: 'Serve this site over HTTPS and allow the external data sources listed below.',
        orbit: {
          panel: 'SELECTED OBJECT', satlas: 'OPEN SATLAS ↗', search: 'SEARCH CATALOG', all: 'ALL', leo: 'LEO', meo: 'MEO', geo: 'GEO', high: 'HIGH', count: '{visible} / {total} OBJECTS',
          waiting: 'Reading the active orbital field…', position: 'POSITION', altitude: 'ALTITUDE', inclination: 'INCLINATION', epoch: 'EPOCH',
          note: 'The globe is an instrument: select an object to expose its ground relation and orbital trace.',
          dataUnavailable: 'Live orbital data unavailable'
        },
        earth: {
          panel: 'TEMPORAL OBSERVATION', title: 'Earth is not the same image twice.', date: 'DATE', play: 'PLAY CHANGE', pause: 'PAUSE',
          note: 'Move through recent observations. Each frame is conditioned by sensor, orbit, atmosphere, and acquisition time.'
        },
        flow: { caption: 'WIND / FLOW', title: 'Circulation makes change visible.' },
        games: {
          rounds: 'ROUND {round} / {total}', score: 'SCORE', next: 'NEXT', replay: 'REPLAY', attempts: 'ATTEMPTS',
          locate: { title: 'Place is learned by relation.', prompt: 'Locate {target}', hint: 'Click the map. Distance and bearing return the error to you.', result: '{distance} km · {bearing}', done: 'A coordinate is not a place, but error has a direction.' },
          zone: { title: 'A boundary is a decision made visible.', prompt: 'Find {target}', hint: 'Three attempts. Read shape, adjacency, and position before naming.', correct: 'FOUND', wrong: 'Not this field.', done: 'Recognition grows from relation, not outline alone.' },
          path: { title: 'To cross a map is to read adjacency.', prompt: '{start} → {target}', hint: 'Move only across shared land borders. Reach the target in as few crossings as you can.', invalid: 'No shared land border.', done: 'Shortest path: {best} crossings · yours: {steps}.' }
        }
      },
      atlas: {
        projectionNames: { space: 'SPACE', time: 'TIME', type: 'TYPE', topic: 'TOPIC', trace: 'TRACE' },
        relationLabels: { space: 'FIELD', time: 'SUCCESSION', type: 'FORM', topic: 'AFFINITY', trace: 'TRAJECTORY' },
        typeLabels: { note: 'NOTE', lab: 'LAB', place: 'PLACE', photo: 'PHOTO' },
        status: 'PROJECTION / {projection} · EDGE / {relation}',
        tipKicker: 'ATLAS',
        tipDefault: 'Read the relations.',
        philosophy: 'No projection preserves everything.',
        explanations: {
          space: 'Space preserves co-presence within an authored field. Nearness here is a relation, not a proof.',
          time: 'Time preserves succession. Earlier and later become legible; causation does not.',
          type: 'Type preserves form. Like records are gathered, then ordered by time.',
          topic: 'Topic preserves affinity. Shared subjects pull traces together; other relations recede.',
          trace: 'Trace preserves derivation. Its links are authored intellectual continuities — what a question opened, what a method changed, and where one inquiry became another. It is not a timeline.'
        },
        traceStart: 'BEGIN',
        traceNow: 'NOW'
      },
      footer: {
        slogan: 'GEO TO SEE. GEEK TO BUILD.',
        meta: 'SITUATED IN SPACE · REVISED IN TIME · 2026'
      }
    },
    notes: [
      {
        id: 'n01', date: '2026.08.08', typeKey: 'essay', type: 'Essay',
        title: 'Scale changes the object before it changes the answer',
        tags: ['Geography', 'Scale', 'Representation'], read: '8 min',
        excerpt: 'Scale is not magnification. Change the support of observation and the object, its boundary, and its relevant relations change with it.',
        body: 'A watershed, a city, or a neighborhood is not simply the same object viewed from farther away. Every scale admits some relations and suppresses others. The task is not to find the one true scale, but to know what each scale permits us to claim.'
      },
      {
        id: 'n02', date: '2026.07.21', typeKey: 'research', type: 'Research Note',
        title: 'A sensor does not see the Earth',
        tags: ['Remote Sensing', 'Measurement', 'Sensors'], read: '11 min',
        excerpt: 'It receives traces of interaction through a particular orbit, band, resolution, and time; “Earth” arrives later, through interpretation.',
        body: 'Observation is always mediated. A sensor records a relation among surface, atmosphere, instrument, geometry, and time. Treating the measurement as the thing itself erases the very conditions that make the measurement meaningful.'
      },
      {
        id: 'n03', date: '2026.07.06', typeKey: 'reading', type: 'Reading Note',
        title: 'Every projection is a decision about loss',
        tags: ['Cartography', 'Projection', 'Uncertainty'], read: '6 min',
        excerpt: 'A map becomes precise by being explicit about what it cannot preserve at once.',
        body: 'Area, angle, distance, direction: representation gains rigor by choosing among incompatible goods. The interesting question is not whether distortion exists, but whether the chosen distortion matches the relation the map asks us to see.'
      },
      {
        id: 'n04', date: '2026.06.18', typeKey: 'fragment', type: 'Fragment',
        title: 'A model travels only as far as its assumptions',
        tags: ['Models', 'Domain', 'Inference'], read: '3 min',
        excerpt: 'Transfer expands faster than validity. Every inference has a geography, even when the raster has none drawn.',
        body: 'A model can cross administrative boundaries in a millisecond while its assumptions remain local. Generalization is therefore not only a statistical problem; it is a question of where the conditions that made an inference possible still hold.'
      },
      {
        id: 'n05', date: '2026.05.30', typeKey: 'method', type: 'Method',
        title: 'One watershed, three worlds',
        tags: ['Hydrology', 'Fieldwork', 'Scale'], read: '9 min',
        excerpt: 'Planet, basin, body: the water may be continuous, but the relations that matter are not.',
        body: 'At continental scale, flow belongs to climate and circulation. At basin scale, it belongs to terrain and network. At the body, it becomes depth, temperature, sound, and risk. One place can sustain several geographies without contradiction.'
      }
    ],
    lab: [
      {
        id: 'l01', group: 'studies', status: 'Prototype', title: 'The page as terrain',
        visual: 'terrain', featured: false,
        tags: ['Web', 'Cartography', 'Interaction'],
        description: 'A browser interface in which scale, contour, relation, and projection govern behavior. Geography becomes grammar, not ornament.',
        coord: '34.02 / −118.48'
      },
      {
        id: 'l02', group: 'studies', status: 'Method', title: 'The geography of evidence',
        visual: 'evidence', featured: false,
        tags: ['GIS', 'Reasoning', 'Reproducibility'],
        description: 'A protocol that asks where an inference holds, which scale supports it, and what must remain local before it can travel.',
        coord: 'Δx / Δt'
      },
      {
        id: 'l03', group: 'studies', status: 'Study', title: 'One place, many worlds',
        visual: 'worlds', featured: false,
        tags: ['GeoAI', 'Remote Sensing', 'Models'],
        description: 'A study of how sensor, grid, resolution, and representation make different objects from the same location without making any one of them the place itself.',
        coord: 'x → z'
      },
      {
        id: 'l04', group: 'observatory', status: 'Live', title: 'Orbital Commons',
        visual: 'orbit', featured: true,
        tags: ['Satlas', 'Orbit', 'Real-time'],
        description: 'The active satellite catalog as one navigable field: browser-worker propagation, instanced rendering, selection, orbit trace, and ground trace.',
        coord: 'LEO / MEO / GEO', instrument: 'orbit', instrumentKicker: 'ORBIT / CATALOG / GROUND', source: 'CelesTrak · satellite.js · Three.js'
      },
      {
        id: 'l05', group: 'observatory', status: 'Live', title: 'Earth in Change',
        visual: 'earth', featured: false,
        tags: ['Remote Sensing', 'Time', 'Observation'],
        description: 'Recent Earth observations become a temporal sequence rather than a fixed basemap: the date is part of the image, not metadata outside it.',
        coord: 't → image', instrument: 'earth', instrumentKicker: 'EARTH / CHANGE / TIME', source: 'NASA GIBS · MODIS Terra'
      },
      {
        id: 'l06', group: 'observatory', status: 'Live', title: 'Wind Field',
        visual: 'flow', featured: false,
        tags: ['Atmosphere', 'Wind', 'Circulation'],
        description: 'A live wind field makes circulation visible. What appears as a stable surface becomes legible as process, direction, and change.',
        coord: 'u / v', instrument: 'flow', instrumentKicker: 'WIND / FLOW / RHYTHM', source: 'Windy Embed · ECMWF'
      },
      {
        id: 'l10', group: 'observatory', status: 'Live', title: 'Earth Pulse',
        visual: 'pulse', featured: true,
        tags: ['Seismicity', 'Live Feed', 'USGS'],
        description: 'A live earthquake field rendered on a self-owned world view. Magnitude, depth, and recency become a changing pulse rather than a generic alert map.',
        coord: 'M / km / t', instrument: 'pulse', instrumentKicker: 'EARTH / PULSE / EVENT', source: 'USGS Earthquake GeoJSON'
      },
      {
        id: 'l11', group: 'studies', status: 'Instrument', title: 'Image → Trace',
        visual: 'figure', featured: true,
        tags: ['Raster', 'Abstraction', 'Vector'],
        description: 'A small figure engine that turns a field-like image into contours, regions, and traces. It asks when an image begins to act like a map.',
        coord: 'image → trace', instrument: 'figure', instrumentKicker: 'IMAGE / TRACE / ABSTRACTION', source: 'Browser Canvas / SVG'
      },
      {
        id: 'l12', group: 'studies', status: 'Atlas Base', title: 'World as Relation',
        visual: 'world', featured: true,
        tags: ['World', 'Geometry', 'Scale'],
        description: 'A world field treated as authored geometry rather than a borrowed basemap. Projection changes the visible relation; geography begins where the choice becomes explicit.',
        coord: 'world / relation', instrument: 'world', instrumentKicker: 'WORLD / PROJECTION / RELATION', source: 'Natural Earth GeoJSON · CC0 · D3 runtime'
      },
      {
        id: 'l07', group: 'play', status: 'Game', title: 'Locate',
        visual: 'locate', featured: false,
        tags: ['Distance', 'Bearing', 'Cities'],
        description: 'A location exercise that returns error as distance and direction. The aim is not recall alone, but calibration: where did your mental map bend?',
        coord: 'φ / λ', instrument: 'locate', instrumentKicker: 'PLACE / DISTANCE / BEARING', source: 'Natural Earth / world-atlas'
      },
      {
        id: 'l08', group: 'play', status: 'Game', title: 'Zone',
        visual: 'zone', featured: false,
        tags: ['Boundary', 'Shape', 'Adjacency'],
        description: 'Find a named country from its position among neighbors. Shape matters, but relation to the surrounding field matters more.',
        coord: '∂A', instrument: 'zone', instrumentKicker: 'BOUNDARY / REGION / RECOGNITION', source: 'Natural Earth / world-atlas'
      },
      {
        id: 'l09', group: 'play', status: 'Game', title: 'Trace',
        visual: 'path', featured: false,
        tags: ['Adjacency', 'Route', 'Topology'],
        description: 'Cross the world by shared land borders. A route is not a line drawn over space; it is a sequence allowed by topology.',
        coord: 'A ↔ B', instrument: 'path', instrumentKicker: 'ADJACENCY / PATH / TOPOLOGY', source: 'Natural Earth / world-atlas'
      }
    ],
    elsewhere: [
      {
        id: 'e01', kind: 'Place', title: 'After rain',
        subtitle: 'A wet street doubles the sky. A familiar route becomes another surface.',
        meta: 'walk / photographs / notes'
      },
      {
        id: 'e02', kind: 'Reading', title: 'Books that moved the horizon',
        subtitle: 'Some books do not add facts; they change the distance from which facts are seen.',
        meta: 'books / margins / memory'
      },
      {
        id: 'e03', kind: 'Listening', title: 'Sound as landscape',
        subtitle: 'What has no coordinate can still give direction.',
        meta: 'music / movement / atmosphere'
      }
    ],
    atlas: [
      { id: 'a01', type: 'note', title: 'Scale changes the object', year: 2024, x: .18, y: .28, topic: 'Cartography', place: 'Conceptual', spatialField: 'representation', traceX: 0.12, traceY: 0.50, traceLinks: ['a06', 'a03'] },
      { id: 'a02', type: 'note', title: 'A sensor does not see the Earth', year: 2025, x: .36, y: .19, topic: 'Remote Sensing', place: 'Orbit', spatialField: 'remote field', traceX: 0.43, traceY: 0.28, traceLinks: ['a08'] },
      { id: 'a03', type: 'lab', title: 'The page as terrain', year: 2025, x: .68, y: .34, topic: 'Interface', place: 'Web', spatialField: 'constructed field', traceX: 0.30, traceY: 0.70, traceLinks: ['a04'] },
      { id: 'a04', type: 'lab', title: 'The geography of evidence', year: 2026, x: .52, y: .62, topic: 'Methods', place: 'Lab', spatialField: 'constructed field', traceX: 0.68, traceY: 0.52, traceLinks: ['a05'] },
      { id: 'a05', type: 'place', title: 'After rain', year: 2026, x: .78, y: .72, topic: 'Life', place: 'Elsewhere', spatialField: 'lived field', traceX: 0.82, traceY: 0.66, traceLinks: ['a07'] },
      { id: 'a06', type: 'note', title: 'Every projection is a decision about loss', year: 2025, x: .29, y: .76, topic: 'Cartography', place: 'Conceptual', spatialField: 'representation', traceX: 0.27, traceY: 0.34, traceLinks: ['a02'] },
      { id: 'a07', type: 'photo', title: 'Light on wet pavement', year: 2026, x: .87, y: .47, topic: 'Life', place: 'Elsewhere', spatialField: 'lived field', traceX: 0.91, traceY: 0.47, traceLinks: [] },
      { id: 'a08', type: 'lab', title: 'One place, many worlds', year: 2026, x: .57, y: .15, topic: 'Remote Sensing', place: 'Lab', spatialField: 'remote field', traceX: 0.56, traceY: 0.32, traceLinks: ['a04'] }
    ]
  },

  zh: {
    ui: {
      localeName: '中文',
      switchLabel: 'EN',
      skip: '跳至正文',
      nav: {
        fieldNotes: '地记',
        lab: '作器',
        atlas: '图志',
        elsewhere: '方外',
        map: '导航',
        close: '收起'
      },
      sheet: {
        title: '图幅索引',
        origin: '原点',
        coordinates: '所在',
        fieldNotes: '地记',
        lab: '作器',
        atlas: '图志',
        elsewhere: '方外',
        homeFoot: '一尺度 · 四方域',
        globalFoot: '类域 · 1 : 25,000'
      },
      scale: {
        label: '观测尺度',
        levels: {
          SITE: '全域',
          POSITION: '所在',
          COLLECTION: '类域',
          RECORD: '条目',
          DETAIL: '细察'
        }
      },
      cursorDatum: '视域坐标',
      hero: {
        eyebrow: '往古来今谓之宙 · 四方上下谓之宇',
        tagline: '以地观世，以器明理。',
        lexicon: ['宇', '宙', '观', '迹'],
        left: '原点 / 00°00′00″',
        right: '下行 / 易其尺度 ↓'
      },
      home: {
        now: {
          label: '01 / 今之所在',
          title: '观必有所自。',
          subtitle: '所处、所时、所依之器，皆在所见之中。',
          cards: [
            { label: '所学', title: '地非孤在，相待而成。', text: '远近、界域、邻接、相遇，皆使一地得其形。' },
            { label: '所究', title: '时非钟刻，见于迁流。', text: '往古来今，不止有先后，亦有久暂、节律与不可复。' },
            { label: '所作', title: '作器，亦当明其限。', text: '尺度、假设、误差不隐，术始可托；所能与所不能，皆应可察。' },
            { label: '所思', title: '一观不可尽物。', text: '彼此异位，则所显亦异；知其所见，亦知其所不见。' }
          ]
        },
        notes: {
          label: '02 / 地记',
          title: '随地而记，因变而思。',
          subtitle: '未成定论，先存其时、其地、其所以然。'
        },
        lab: {
          label: '03 / 作器',
          title: '作器以明理。',
          subtitle: '器非饰也；使所见之由、所失之处，皆可复察。',
          prototype: '试作',
          prototypeTitle: '页面即地形',
          prototypeMeta: '网页 · 制图 · 交互',
          method: '方法',
          methodTitle: '证据自有其地理',
          methodMeta: 'GIS · 可复现 · 尺度'
        },
        atlas: {
          label: '04 / 图志',
          title: '一藏多序。',
          subtitle: '宇、宙、类、题各有所存，故各成其图。',
          caption: '图志 · 易序而观 ↗'
        },
        elsewhere: {
          label: '05 / 方外',
          title: '有不可度，亦有所向。',
          subtitle: '行、读、听、望，皆可迁人之观，而不必尽入于数。'
        }
      },
      pages: {
        notes: {
          title: '地记 — GeoGeek',
          eyebrow: '察 / 记 / 复观',
          heading: '地记',
          intro: '所见系于所处；记其时地与由来，不急于定论。'
        },
        lab: {
          title: '作器 — GeoGeek',
          eyebrow: '器 / 法 / 界',
          heading: '作器',
          intro: '器成一观，亦立一限；善作器者，使所见与所失皆可复察。'
        },
        atlas: {
          title: '图志 — GeoGeek',
          eyebrow: '宇 / 宙 / 类 / 题',
          heading: '图志',
          intro: '所藏本无定序；所存之关系不同，则其图亦异。'
        },
        elsewhere: {
          title: '方外 — GeoGeek',
          eyebrow: '不可度之域',
          heading: '方外',
          intro: '有不可度，亦有所向；不入尺度者，未必无所指。'
        },
        home: { title: 'GeoGeek — 以地观世，以器明理。' }
      },
      filters: {
        all: '皆',
        research: '研记',
        reading: '读记',
        method: '方法',
        essay: '论',
        fragment: '片言'
      },
      reader: {
        close: '合卷',
        fallback: '札记贵在存其所以成：出处、尺度、不确定、修订与所处之地。记其条件，方可复观。'
      },
      lab: {
        enter: '入器',
        groups: { studies: '研习', observatory: '观象', play: '游艺 · 地理推演' },
        close: '退出此器',
        instrument: '实时之器',
        principle: '一观显，则余观暂退。',
        boundary: '实时之数 · 所据之限仍在其间',
        loadingOrbit: '正在读取天行之场…',
        networkTitle: '实时之器暂不可用。',
        networkHint: '请以 HTTPS 部署，并允许下列外部数据源访问。',
        orbit: {
          panel: '所观之星', satlas: '启 Satlas ↗', search: '检索星目', all: '皆', leo: '近地', meo: '中轨', geo: '地静', high: '高轨', count: '{visible} / {total} 星体',
          waiting: '正在读取活动轨道场…', position: '所在', altitude: '离地', inclination: '轨倾', epoch: '历元',
          note: '地球在此不是装饰，而是一件器：择一星，可见其地面关系与轨迹。',
          dataUnavailable: '实时轨道数据暂不可达'
        },
        earth: {
          panel: '以时观地', title: '地非一幅不变之图。', date: '观测日', play: '演其变', pause: '止',
          note: '移其日期，则所见随之迁流；每一帧皆系于传感器、轨道、大气与成像之时。'
        },
        flow: { caption: '风 / 流行', title: '借风见势，静亦在变。' },
        games: {
          rounds: '第 {round} / {total} 局', score: '得分', next: '次局', replay: '复局', attempts: '余试',
          locate: { title: '知地，在其相待。', prompt: '定 {target} 之所在', hint: '点其所处。误差以里程与方位返之，使心中之图自校。', result: '相去 {distance} 千米 · 方位 {bearing}', done: '坐标可定其点，误差却显其所观。' },
          zone: { title: '界者，分而见之。', prompt: '识 {target}', hint: '三试而止。先观其形，复察其邻与所处。', correct: '得之', wrong: '非此域。', done: '识域不独在轮廓，亦在相邻与方位。' },
          path: { title: '通达之理，在相邻。', prompt: '{start} → {target}', hint: '惟越共界而行。以最少越界至其地。', invalid: '此二域不共界。', done: '最短 {best} 越 · 此行 {steps} 越。' }
        }
      },
      atlas: {
        projectionNames: { space: '宇', time: '宙', type: '类', topic: '题', trace: '迹' },
        relationLabels: { space: '同域', time: '次第', type: '同类', topic: '相亲', trace: '行迹' },
        typeLabels: { note: '记', lab: '器', place: '地', photo: '影' },
        status: '投影 / {projection} · 关系 / {relation}',
        tipKicker: '图志',
        tipDefault: '观其所系。',
        philosophy: '一图有所存，亦有所舍。',
        explanations: {
          space: '宇存其共域。同处一场者因所处而相连；近者可相涉，未必相因。',
          time: '宙存其次第。先后由此可见，因果却不可由先后强定。',
          type: '类存其形制。同类相属，再以年次序之；所守者为形，所略者为异。',
          topic: '题存其所共。题同则相亲，异则各散；一义显，而余义暂退。',
          trace: '迹存其承转。所连者非年序，而是明定的思想承接：一问所启、一法所变、一念所转。迹可相续，而不以先后冒充因果。'
        },
        traceStart: '所始',
        traceNow: '今'
      },
      footer: {
        slogan: '以地观世 · 以器明理',
        meta: '因地而记 · 随时而改 · 二〇二六'
      }
    },
    notes: [
      {
        id: 'n01', date: '2026.08.08', typeKey: 'essay', type: '论',
        title: '尺度一变，所问已非故问',
        tags: ['地理', '尺度', '表征'], read: '8 分钟',
        excerpt: '尺度非镜片之远近。观测所据一变，对象之边界、关系与可问之事，亦随之而变。',
        body: '一流域、一城、一街，并非同一物之远近缩放。尺度一易，所显之关系与所隐之关系随之迁移。故不求唯一之真尺度，只问此尺度容我说到何处。'
      },
      {
        id: 'n02', date: '2026.07.21', typeKey: 'research', type: '研记',
        title: '卫星所见，非地本身',
        tags: ['遥感', '测量', '传感'], read: '11 分钟',
        excerpt: '传感器所得，是地表、气氛、轨道、波段与时刻相遇之迹；其后，我们方名之曰“地”。',
        body: '所测者常经媒介而来。数值之成，系于仪器、几何、时刻与环境。若执所得之数为物本身，便先忘了使此数得以成立的条件。'
      },
      {
        id: 'n03', date: '2026.07.06', typeKey: 'reading', type: '读记',
        title: '一图有所存，亦有所舍',
        tags: ['制图', '投影', '不确定'], read: '6 分钟',
        excerpt: '投影之精，不在尽存，而在明其所守、知其所失。',
        body: '面积、角度、距离、方向，不可一图而尽全。图之可信，不在无失，而在失之有据、守之有意。先问欲存何种关系，方可论何种投影。'
      },
      {
        id: 'n04', date: '2026.06.18', typeKey: 'fragment', type: '片言',
        title: '模型之行，止于假设之界',
        tags: ['模型', '适域', '推断'], read: '3 分钟',
        excerpt: '模型可顷刻越界，假设却未必同行。推断虽无疆界线，其成立自有其地理。',
        body: '算法之可迁，不等于知识之可迁。凡一推断，皆赖某地、某时、某尺度之条件而生。故问“能否泛化”之前，先问“何处仍与其所以成立者相似”。'
      },
      {
        id: 'n05', date: '2026.05.30', typeKey: 'method', type: '方法',
        title: '一水三境',
        tags: ['水文', '田野', '尺度'], read: '9 分钟',
        excerpt: '同一水脉，置于天下、流域与身体之前，各成一境。水未必异，关系先异。',
        body: '观于大域，则见气候与循环；观于流域，则见地形与网络；临水而立，则见深浅、温度、声响与风险。一地可有数境，并不相悖。'
      }
    ],
    lab: [
      {
        id: 'l01', group: 'studies', status: '试作', title: '页面即地形',
        visual: 'terrain', featured: false,
        tags: ['网页', '制图', '交互'],
        description: '使尺度、等高、关系与投影进入操作本身；地理不作装饰，而作界面之法。',
        coord: '34.02 / −118.48'
      },
      {
        id: 'l02', group: 'studies', status: '方法', title: '证据自有其地理',
        visual: 'evidence', featured: false,
        tags: ['GIS', '推理', '可复现'],
        description: '先问推断在何处成立、由何尺度托住，再问它能行多远；可复现亦应包含边界。',
        coord: 'Δx / Δt'
      },
      {
        id: 'l03', group: 'studies', status: '研习', title: '一地，多观',
        visual: 'worlds', featured: false,
        tags: ['GeoAI', '遥感', '模型'],
        description: '同一所在，随传感、网格、分辨率与表征而异其形；不执任何一观为地本身。',
        coord: 'x → z'
      },
      {
        id: 'l04', group: 'observatory', status: '实时', title: '天行 · 星图',
        visual: 'orbit', featured: true,
        tags: ['Satlas', '轨道', '实时'],
        description: '将活动卫星星目置于同一可操作场中：Worker 推演、实例化绘制、择星、天之迹与地之迹。',
        coord: '近地 / 中轨 / 地静', instrument: 'orbit', instrumentKicker: '天 / 轨 / 星目', source: 'CelesTrak · satellite.js · Three.js'
      },
      {
        id: 'l05', group: 'observatory', status: '实时', title: '地变',
        visual: 'earth', featured: false,
        tags: ['遥感', '时间', '观测'],
        description: '不以地球为一幅固定底图，而使近日观测依时而列；日期不是图外注记，而是图像成立的条件。',
        coord: '宙 → 象', instrument: 'earth', instrumentKicker: '地 / 易 / 宙', source: 'NASA GIBS · MODIS Terra'
      },
      {
        id: 'l06', group: 'observatory', status: '实时', title: '风行',
        visual: 'flow', featured: false,
        tags: ['大气', '风场', '流行'],
        description: '借实时风场见其势。所见非一静面，而是方向、强弱与迁流暂成之象。',
        coord: '风 / 流', instrument: 'flow', instrumentKicker: '风 / 行 / 势', source: 'Windy Embed · ECMWF'
      },
      {
        id: 'l10', group: 'observatory', status: '实时', title: '地脉',
        visual: 'pulse', featured: true,
        tags: ['地震', '实时', 'USGS'],
        description: '以自有世界视图承接实时震讯；震级、深度与新近性不作警报色块，而作地球脉动之象。',
        coord: '震级 / 深度 / 时', instrument: 'pulse', instrumentKicker: '地 / 脉 / 事件', source: 'USGS Earthquake GeoJSON'
      },
      {
        id: 'l11', group: 'studies', status: '器', title: '由象成迹',
        visual: 'figure', featured: true,
        tags: ['栅格', '抽象', '矢量'],
        description: '以一小器试图像如何化为边界、区域与线迹。问其何时不复只是图像，而渐成可图之象。',
        coord: '象 → 迹', instrument: 'figure', instrumentKicker: '象 / 迹 / 抽象', source: 'Browser Canvas / SVG'
      },
      {
        id: 'l12', group: 'studies', status: '图基', title: '世界即关系',
        visual: 'world', featured: true,
        tags: ['世界', '几何', '尺度'],
        description: '不借底图之习见，而以自定之线、面与投影重观世界；图法一变，所显之关系亦随之而变。',
        coord: 'world / relation', instrument: 'world', instrumentKicker: '宇 / 图 / 关系', source: 'Natural Earth GeoJSON · CC0 · D3 运行依赖'
      },
      {
        id: 'l07', group: 'play', status: '游艺', title: '定位',
        visual: 'locate', featured: false,
        tags: ['远近', '方位', '城市'],
        description: '不独问“知其名否”，而问心中之图偏向何处。每一次误点，都以距离与方位返照其误。',
        coord: '纬 / 经', instrument: 'locate', instrumentKicker: '地 / 距 / 向', source: 'Natural Earth / world-atlas'
      },
      {
        id: 'l08', group: 'play', status: '游艺', title: '识域',
        visual: 'zone', featured: false,
        tags: ['界', '形', '邻'],
        description: '按名识其国域。轮廓固可辨，然其邻接、方位与所处之场，更能成其地理。',
        coord: '界域', instrument: 'zone', instrumentKicker: '界 / 域 / 识', source: 'Natural Earth / world-atlas'
      },
      {
        id: 'l09', group: 'play', status: '游艺', title: '通达',
        visual: 'path', featured: false,
        tags: ['邻接', '路径', '拓扑'],
        description: '惟由共界而行，自一国至一国。路不是覆在地图上的线，而是由相邻关系所允许的次第。',
        coord: '甲 ↔ 乙', instrument: 'path', instrumentKicker: '邻 / 行 / 通', source: 'Natural Earth / world-atlas'
      }
    ],
    elsewhere: [
      {
        id: 'e01', kind: '行', title: '雨后',
        subtitle: '水光覆路，熟径忽成异境；城有一日之形。',
        meta: '行路 / 摄影 / 随记'
      },
      {
        id: 'e02', kind: '读', title: '移其远近之书',
        subtitle: '有些书不添一条知识，只改你与世界之间的距离。',
        meta: '书 / 批注 / 记忆'
      },
      {
        id: 'e03', kind: '听', title: '声亦成境',
        subtitle: '无坐标者，亦可使人知所向。',
        meta: '音乐 / 行动 / 气息'
      }
    ],
    atlas: [
      { id: 'a01', type: 'note', title: '尺度一变，所问已非故问', year: 2024, x: .18, y: .28, topic: '制图', place: '义域', spatialField: '表征之域', traceX: 0.12, traceY: 0.50, traceLinks: ['a06', 'a03'] },
      { id: 'a02', type: 'note', title: '卫星所见，非地本身', year: 2025, x: .36, y: .19, topic: '遥感', place: '轨道', spatialField: '遥察之域', traceX: 0.43, traceY: 0.28, traceLinks: ['a08'] },
      { id: 'a03', type: 'lab', title: '页面即地形', year: 2025, x: .68, y: .34, topic: '界面', place: '网页', spatialField: '所作之域', traceX: 0.30, traceY: 0.70, traceLinks: ['a04'] },
      { id: 'a04', type: 'lab', title: '证据自有其地理', year: 2026, x: .52, y: .62, topic: '方法', place: '作器', spatialField: '所作之域', traceX: 0.68, traceY: 0.52, traceLinks: ['a05'] },
      { id: 'a05', type: 'place', title: '雨后', year: 2026, x: .78, y: .72, topic: '方外', place: '他方', spatialField: '所行之域', traceX: 0.82, traceY: 0.66, traceLinks: ['a07'] },
      { id: 'a06', type: 'note', title: '一图有所存，亦有所舍', year: 2025, x: .29, y: .76, topic: '制图', place: '义域', spatialField: '表征之域', traceX: 0.27, traceY: 0.34, traceLinks: ['a02'] },
      { id: 'a07', type: 'photo', title: '湿地之光', year: 2026, x: .87, y: .47, topic: '方外', place: '他方', spatialField: '所行之域', traceX: 0.91, traceY: 0.47, traceLinks: [] },
      { id: 'a08', type: 'lab', title: '一地，多观', year: 2026, x: .57, y: .15, topic: '遥感', place: '作器', spatialField: '遥察之域', traceX: 0.56, traceY: 0.32, traceLinks: ['a04'] }
    ]
  }
};
