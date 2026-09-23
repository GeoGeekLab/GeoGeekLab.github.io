(() => {
  'use strict';
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

  function build(now = new Date()) {
    const places = cities.map((c, i) => ({
      ...c,
      visits: c.base * 3 + (i % 4) * 2,
      events: Array.from({ length:c.base * 3 + (i % 4) * 2 }, (_, n) => {
        const hoursAgo = ((n * (7 + i * 3) + i * 5) % (24 * 58)) + ((n + i) % 6) * 0.17;
        return new Date(now.getTime() - hoursAgo * 3600000).toISOString();
      }),
      hourly: Array.from({ length:24 }, (_, h) => Math.max(0, Math.round((Math.sin((h - i) / 24 * Math.PI * 2) + 1.25) * c.base / 5))),
      firstSeen: new Date(now.getTime() - (32 + i * 3) * 86400000).toISOString(),
      lastSeen: new Date(now.getTime() - ((i * 7 + 2) % 44) * 3600000).toISOString(),
      active: false,
      observations: 0
    }));
    const observations = samples.map((o, index) => {
      const place = places.find(p => p.id === o.place);
      if (place) place.observations += 1;
      return { id:`demo-o${index+1}`, placeId:o.place, text:o.en, displayName:'', createdAt:new Date(now.getTime() - o.age * 3600000).toISOString(), status:'approved' };
    });
    return {
      mode:'demo',
      generatedAt: now.toISOString(),
      unlocatedEvents: Array.from({ length:83 }, (_, n) => new Date(now.getTime() - (((n * 17 + 9) % (24 * 58)) + (n % 5) * .13) * 3600000).toISOString()),
      totalVisits: places.reduce((sum,p)=>sum+p.visits,0) + 83,
      locatedVisits: places.reduce((sum,p)=>sum+p.visits,0),
      places,
      observations,
      activeCount:0
    };
  }
  window.GeoCommonsDemo = { build };
})();
