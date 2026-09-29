(() => {
  'use strict';

  const DAY = 86400000;
  const MINUTE = 60000;
  const TOTAL_VISITS = 5280;
  const LOCATED_VISITS = 4650;
  const UNLOCATED_VISITS = TOTAL_VISITS - LOCATED_VISITS;
  const OBSERVATION_COUNT = 36;

  const cities = [
    { id:'tokyo', label:'Tokyo, Japan', lat:35.68, lon:139.76, country:'JP', tz:'Asia/Tokyo', visits:938 },
    { id:'singapore', label:'Singapore', lat:1.29, lon:103.85, country:'SG', tz:'Asia/Singapore', visits:683 },
    { id:'helsinki', label:'Helsinki, Finland', lat:60.17, lon:24.94, country:'FI', tz:'Europe/Helsinki', visits:341 },
    { id:'london', label:'London, UK', lat:51.51, lon:-0.13, country:'GB', tz:'Europe/London', visits:597 },
    { id:'paris', label:'Paris, France', lat:48.86, lon:2.35, country:'FR', tz:'Europe/Paris', visits:384 },
    { id:'vancouver', label:'Vancouver, Canada', lat:49.28, lon:-123.12, country:'CA', tz:'America/Vancouver', visits:299 },
    { id:'newyork', label:'New York, USA', lat:40.71, lon:-74.01, country:'US', tz:'America/New_York', visits:512 },
    { id:'saopaulo', label:'São Paulo, Brazil', lat:-23.55, lon:-46.63, country:'BR', tz:'America/Sao_Paulo', visits:256 },
    { id:'nairobi', label:'Nairobi, Kenya', lat:-1.29, lon:36.82, country:'KE', tz:'Africa/Nairobi', visits:213 },
    { id:'sydney', label:'Sydney, Australia', lat:-33.87, lon:151.21, country:'AU', tz:'Australia/Sydney', visits:427 }
  ];

  const notes = [
    'Still bright after the rain.',
    'Clouds are moving east over the bay.',
    'Thunder after sunset.',
    'A brief clearing between showers.',
    'The afternoon wind has turned cool.',
    'Light changed before the temperature did.',
    'The horizon is clearer than it was an hour ago.',
    'A familiar route feels different at this hour.',
    'Wind makes the distance audible.',
    'The sky is carrying weather from elsewhere.',
    'The street is quieter than the map suggests.',
    'Cloud cover has flattened the sense of depth.',
    'The same place reads differently after rain.'
  ];

  function eventSeries(now, count, seed) {
    const windowMinutes = 29 * 24 * 60;
    return Array.from({ length:count }, (_, n) => {
      const minutesAgo = 3 + ((n * (37 + seed * 6) + seed * 83 + (n % 17) * 11) % windowMinutes);
      return new Date(now.getTime() - minutesAgo * MINUTE).toISOString();
    });
  }

  function build(now = new Date()) {
    const places = cities.map((city, index) => {
      const events = eventSeries(now, city.visits, index + 1);
      return {
        ...city,
        events,
        firstSeen:new Date(now.getTime() - 30 * DAY).toISOString(),
        lastSeen:events.reduce((latest, iso) => iso > latest ? iso : latest, events[0]),
        active:false,
        observations:0
      };
    });

    const observations = Array.from({ length:OBSERVATION_COUNT }, (_, index) => {
      const place = places[(index * 7 + 2) % places.length];
      place.observations += 1;
      const minutesAgo = 45 + ((index * 1171 + 233) % (28 * 24 * 60));
      return {
        id:`demo-o${index + 1}`,
        placeId:place.id,
        text:notes[index % notes.length],
        displayName:'',
        createdAt:new Date(now.getTime() - minutesAgo * MINUTE).toISOString(),
        status:'approved',
        synthetic:true
      };
    });

    const unlocatedEvents = eventSeries(now, UNLOCATED_VISITS, 19);

    return {
      mode:'demo',
      synthetic:true,
      generatedAt:now.toISOString(),
      baseline:{
        type:'fixed',
        totalVisits:TOTAL_VISITS,
        locatedVisits:LOCATED_VISITS,
        observations:OBSERVATION_COUNT
      },
      unlocatedEvents,
      totalVisits:TOTAL_VISITS,
      locatedVisits:LOCATED_VISITS,
      places,
      observations,
      activeCount:0
    };
  }

  window.GeoCommonsDemo = { build };
})();
