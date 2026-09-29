(() => {
  'use strict';

  const DAY = 86400000;
  const GROWTH_EPOCH = Date.UTC(2026, 8, 29);
  const cities = [
    { id:'tokyo', label:'Tokyo, Japan', lat:35.68, lon:139.76, country:'JP', tz:'Asia/Tokyo', base:22 },
    { id:'singapore', label:'Singapore', lat:1.29, lon:103.85, country:'SG', tz:'Asia/Singapore', base:16 },
    { id:'helsinki', label:'Helsinki, Finland', lat:60.17, lon:24.94, country:'FI', tz:'Europe/Helsinki', base:8 },
    { id:'london', label:'London, UK', lat:51.51, lon:-0.13, country:'GB', tz:'Europe/London', base:14 },
    { id:'paris', label:'Paris, France', lat:48.86, lon:2.35, country:'FR', tz:'Europe/Paris', base:9 },
    { id:'vancouver', label:'Vancouver, Canada', lat:49.28, lon:-123.12, country:'CA', tz:'America/Vancouver', base:7 },
    { id:'newyork', label:'New York, USA', lat:40.71, lon:-74.01, country:'US', tz:'America/New_York', base:12 },
    { id:'saopaulo', label:'São Paulo, Brazil', lat:-23.55, lon:-46.63, country:'BR', tz:'America/Sao_Paulo', base:6 },
    { id:'nairobi', label:'Nairobi, Kenya', lat:-1.29, lon:36.82, country:'KE', tz:'Africa/Nairobi', base:5 },
    { id:'sydney', label:'Sydney, Australia', lat:-33.87, lon:151.21, country:'AU', tz:'Australia/Sydney', base:10 }
  ];

  const samples = [
    { place:'helsinki', en:'Still bright after the rain.', age:3 },
    { place:'tokyo', en:'Clouds are moving east over the bay.', age:11 },
    { place:'singapore', en:'Thunder after sunset.', age:28 },
    { place:'london', en:'A brief clearing between showers.', age:63 },
    { place:'nairobi', en:'The afternoon wind has turned cool.', age:120 }
  ];

  const syntheticNotes = [
    'Light changed before the temperature did.',
    'The horizon is clearer than it was an hour ago.',
    'A familiar route feels different at this hour.',
    'Wind makes the distance audible.',
    'The sky is carrying weather from elsewhere.',
    'The street is quieter than the map suggests.',
    'Cloud cover has flattened the sense of depth.',
    'The same place reads differently after rain.'
  ];

  function hash32(value) {
    let h = 2166136261;
    const s = String(value);
    for (let i = 0; i < s.length; i += 1) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function dailyTarget(dayIndex) {
    return 100 + (hash32('visits:' + dayIndex) % 101);
  }

  function locatedShare(dayIndex) {
    return 0.82 + (hash32('located:' + dayIndex) % 10) / 100;
  }

  function distribute(total, dayIndex) {
    const weightSum = cities.reduce((sum, city) => sum + city.base, 0);
    const raw = cities.map(city => total * city.base / weightSum);
    const counts = raw.map(Math.floor);
    let remainder = total - counts.reduce((sum, n) => sum + n, 0);
    const order = raw
      .map((value, index) => ({ index, fraction:value - Math.floor(value), tie:hash32('dist:' + dayIndex + ':' + index) }))
      .sort((a,b) => b.fraction - a.fraction || a.tie - b.tie);
    for (let i = 0; i < remainder; i += 1) counts[order[i % order.length].index] += 1;
    return counts;
  }

  function eventTime(dayStart, elapsed, key) {
    const span = Math.max(1, Math.min(DAY - 1, elapsed));
    return new Date(dayStart + (hash32(key) % span)).toISOString();
  }

  function build(now = new Date()) {
    const places = cities.map((c, i) => ({
      ...c,
      visits: c.base * 3 + (i % 4) * 2,
      events: Array.from({ length:c.base * 3 + (i % 4) * 2 }, (_, n) => {
        const hoursAgo = ((n * (7 + i * 3) + i * 5) % (24 * 58)) + ((n + i) % 6) * 0.17;
        return new Date(now.getTime() - hoursAgo * 3600000).toISOString();
      }),
      hourly: Array.from({ length:24 }, (_, h) => Math.max(0, Math.round((Math.sin((h - i) / 24 * Math.PI * 2) + 1.25) * c.base / 5))),
      firstSeen: new Date(now.getTime() - (32 + i * 3) * DAY).toISOString(),
      lastSeen: new Date(now.getTime() - ((i * 7 + 2) % 44) * 3600000).toISOString(),
      active: false,
      observations: 0
    }));

    const observations = samples.map((o, index) => {
      const place = places.find(p => p.id === o.place);
      if (place) place.observations += 1;
      return { id:`demo-o${index+1}`, placeId:o.place, text:o.en, displayName:'', createdAt:new Date(now.getTime() - o.age * 3600000).toISOString(), status:'approved', synthetic:true };
    });

    const unlocatedEvents = Array.from({ length:83 }, (_, n) =>
      new Date(now.getTime() - (((n * 17 + 9) % (24 * 58)) + (n % 5) * .13) * 3600000).toISOString()
    );

    const nowMs = now.getTime();
    const currentDay = Math.floor((nowMs - GROWTH_EPOCH) / DAY);

    if (currentDay >= 0) {
      for (let dayIndex = 0; dayIndex <= currentDay; dayIndex += 1) {
        const dayStart = GROWTH_EPOCH + dayIndex * DAY;
        const elapsed = Math.max(0, Math.min(DAY, nowMs - dayStart));
        if (!elapsed) continue;

        const target = dailyTarget(dayIndex);
        const realized = dayIndex < currentDay ? target : Math.floor(target * elapsed / DAY);
        if (!realized) continue;

        const located = Math.min(realized, Math.round(realized * locatedShare(dayIndex)));
        const unlocated = realized - located;
        const counts = distribute(located, dayIndex);

        counts.forEach((count, cityIndex) => {
          if (!count) return;
          const place = places[cityIndex];
          place.visits += count;
          for (let n = 0; n < count; n += 1) {
            const iso = eventTime(dayStart, elapsed, `located:${dayIndex}:${cityIndex}:${n}`);
            place.events.push(iso);
            if (new Date(iso) > new Date(place.lastSeen)) place.lastSeen = iso;
          }
        });

        for (let n = 0; n < unlocated; n += 1) {
          unlocatedEvents.push(eventTime(dayStart, elapsed, `unlocated:${dayIndex}:${n}`));
        }

        const observationCount = Math.floor(located / 52);
        for (let n = 0; n < observationCount; n += 1) {
          const cityIndex = hash32(`observation-place:${dayIndex}:${n}`) % cities.length;
          const place = places[cityIndex];
          const iso = eventTime(dayStart, elapsed, `observation-time:${dayIndex}:${n}`);
          observations.push({
            id:`synthetic-${dayIndex}-${n}`,
            placeId:place.id,
            text:syntheticNotes[hash32(`observation-text:${dayIndex}:${n}`) % syntheticNotes.length],
            displayName:'',
            createdAt:iso,
            status:'approved',
            synthetic:true
          });
          place.observations += 1;
        }
      }
    }

    // NOW is a small simulated subset of the same located field, not a separate population.
    const bucket = Math.floor(nowMs / (10 * 60 * 1000));
    const activeCount = currentDay >= 0 ? hash32('active:' + bucket) % 3 : 0;
    for (let i = 0; i < activeCount; i += 1) {
      const index = (hash32('active-place:' + bucket + ':' + i) + i) % places.length;
      places[index].active = true;
    }

    const locatedVisits = places.reduce((sum,p) => sum + Number(p.visits || 0), 0);
    const totalVisits = locatedVisits + unlocatedEvents.length;

    return {
      mode:'demo',
      synthetic:true,
      generatedAt: now.toISOString(),
      growth: {
        type:'synthetic',
        dailyMin:100,
        dailyMax:200,
        epoch:new Date(GROWTH_EPOCH).toISOString()
      },
      unlocatedEvents,
      totalVisits,
      locatedVisits,
      places,
      observations,
      activeCount
    };
  }

  window.GeoCommonsDemo = { build };
})();
