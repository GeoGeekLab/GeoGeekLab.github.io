window.GEOGEEK_ARCHIVE = {
  "locales": {
    "en": {
      "ui": {
        "localeName": "English",
        "skip": "Skip to content",
        "nav": {
          "fieldNotes": "Field Notes",
          "lab": "Lab",
          "atlas": "Atlas",
          "elsewhere": "Elsewhere",
          "map": "Map",
          "close": "Close"
        },
        "siteMap": {
          "title": "SITE MAP",
          "mode": "TOPOLOGY / SITE RELATION",
          "current": "CURRENT",
          "origin": "Origin",
          "coordinates": "Coordinates",
          "commons": "Commons",
          "fieldNotes": "Field Notes",
          "lab": "Lab",
          "atlas": "Atlas",
          "elsewhere": "Elsewhere",
          "hint": "Scale changes representation; open only when you choose to leave the field.",
          "close": "Close map"
        },
        "a11y": {
          "primary": "Primary navigation",
          "scale": "Relative information scale",
          "instrumentPrinciple": "Instrument principle",
          "recordConditions": "Record conditions",
          "worldMap": "Interactive world map",
          "earthObservation": "Global MODIS true-color observation in EPSG:4326",
          "earthImage": "NASA MODIS Terra corrected-reflectance true-color global observation",
          "windFrame": "Live wind field",
          "pulseMap": "Earthquake observation map",
          "worldProjectionMap": "Interactive world projection map"
        },
        "sheet": {
          "title": "SHEET INDEX",
          "origin": "Origin",
          "coordinates": "Coordinates",
          "commons": "Commons",
          "fieldNotes": "Field Notes",
          "lab": "Lab",
          "atlas": "Atlas",
          "elsewhere": "Elsewhere",
          "homeFoot": "SITE INDEX",
          "globalFoot": "COLLECTION · RELATIVE 1 : 25,000"
        },
        "scale": {
          "label": "INFORMATION SCALE",
          "mode": "RELATIVE",
          "levels": {
            "SITE": "SITE",
            "POSITION": "POSITION",
            "COLLECTION": "COLLECTION",
            "RECORD": "RECORD",
            "DETAIL": "DETAIL"
          }
        },
        "hero": {
          "tagline": "Geo to see. Geek to build.",
          "origin": "ORIGIN / WHY GeoGeek ↗",
          "originAria": "Enter GeoGeek Origin: Why GeoGeek",
          "right": "SCROLL / CHANGE SCALE ↓"
        },
        "pages": {
          "notes": {
            "title": "Field Notes — GeoGeek",
            "eyebrow": "OBSERVATION / CONDITION / REVISION",
            "heading": "Field Notes",
            "intro": "Notes, kept in their time."
          },
          "lab": {
            "title": "Lab — GeoGeek",
            "eyebrow": "FIELD / INSTRUMENT / LIMIT",
            "heading": "Lab",
            "intro": "Build tools that expose their scale, assumptions, and limits."
          },
          "atlas": {
            "title": "Atlas — GeoGeek",
            "eyebrow": "FIELD / TIME / RELATION",
            "heading": "Atlas",
            "intro": "An archive has no neutral geometry. Every projection keeps one relation by letting another recede."
          },
          "elsewhere": {
            "title": "Elsewhere — GeoGeek",
            "eyebrow": "THE UNMEASURED FIELD",
            "heading": "Elsewhere",
            "intro": "Some things resist quantification and still alter orientation."
          },
          "record": {
            "title": "Record — GeoGeek",
            "eyebrow": "RECORD / CONDITIONS / DETAIL",
            "heading": "Record",
            "intro": "A record keeps the conditions that make it legible."
          },
          "home": {
            "title": "GeoGeek — Geo to see. Geek to build."
          },
          "commons": {
            "title": "Commons — GeoGeek",
            "eyebrow": "SITUATION / RELATION / COEXISTENCE",
            "heading": "Commons",
            "intro": "No position is solitary. To be somewhere is to share a world."
          }
        },
        "filters": {
          "all": "All",
          "observation": "Observation & Proxies",
          "scale": "Scale & Extrapolation",
          "causality": "Attribution & Causality",
          "representation": "Earth Representation",
          "practice": "Research Practice"
        },
        "archivePortal": {
          "label": "SOURCE CHANNEL",
          "title": "GeoGeek on WeChat",
          "copy": "The Chinese essays were first published on the GeoGeek WeChat public account. Scan to follow the original channel.",
          "scan": "SCAN WITH WECHAT",
          "alt": "GeoGeek WeChat public account QR code"
        },
        "record": {
          "back": "← COLLECTION",
          "conditions": "RECORD CONDITIONS",
          "detail": "DETAIL",
          "labels": {
            "field": "FIELD",
            "object": "OBJECT",
            "method": "METHOD",
            "time": "TIME",
            "scale": "SCALE",
            "extent": "EXTENT",
            "source": "SOURCE",
            "status": "STATUS",
            "revision": "REVISION",
            "series": "SERIES",
            "published": "FIRST PUBLISHED",
            "webEdition": "WEB EDITION"
          },
          "values": {
            "noteStatus": "Working note",
            "livedField": "Lived geography",
            "open": "Open record",
            "scale": "Record"
          },
          "openInstrument": "OPEN INSTRUMENT ↗",
          "original": "ORIGINAL WECHAT ↗",
          "returnCollection": "RETURN TO COLLECTION ↗",
          "returnAtlas": "RETURN TO ATLAS ↗",
          "unavailable": "Record not found."
        },
        "lab": {
          "enter": "ENTER",
          "groups": {
            "studies": "STUDIES",
            "observatory": "OBSERVATORY",
            "play": "PLAY / SPATIAL REASONING"
          },
          "close": "Close instrument",
          "instrument": "LIVE INSTRUMENT",
          "principle": "Every instrument defines a field of view.",
          "principleLabel": "EXTENT / RESOLUTION / LIMIT",
          "boundary": "OBSERVATION CONDITIONS / DECLARED",
          "conditions": {
            "orbit": [["CATALOG","CelesTrak active"],["MODEL","SGP4 / SDP4"],["RENDER","Instanced WebGL"],["RADIAL SCALE","Compressed"]],
            "earth": [["SENSOR","MODIS / Terra"],["PRODUCT","Corrected Reflectance · True Color"],["CRS","EPSG:4326"],["SOURCE","NASA GIBS"]],
            "flow": [["MODEL","ECMWF"],["FIELD","Surface wind"],["VIEW","Windy Embed"],["TIME","Current"]],
            "pulse": [["FEED","USGS all_day"],["WINDOW","Past 24 h"],["ENCODING","Magnitude · depth · recency"],["COORDINATES","Geographic lon / lat"]],
            "figure": [["INPUT","Browser raster"],["OUTPUT","SVG isolines"],["CONTROL","Threshold · levels · simplify"],["SPACE","Image coordinates"]],
            "world": [["GEOMETRY","Natural Earth 1:110m"],["PROJECTION","Equal Earth · Mercator · Orthographic"],["DISTORTION","Tissot indicatrices"],["COORDINATES","Geographic lon / lat"]],
            "locate": [["GEOMETRY","Natural Earth"],["MEASURE","Great-circle distance"],["DIRECTION","Initial bearing"],["COORDINATES","Geographic lon / lat"]],
            "zone": [["GEOMETRY","Natural Earth"],["TASK","Region recognition"],["CUE","Shape · adjacency · position"],["COORDINATES","Geographic lon / lat"]],
            "path": [["GEOMETRY","Natural Earth"],["RELATION","Shared land border"],["MODEL","Adjacency graph"],["OUTPUT","Topological path"]]
          },
          "loadingOrbit": "Reading the orbital field…",
          "networkTitle": "Live instrument unavailable.",
          "networkHint": "Serve this site over HTTPS and allow the external data sources listed below.",
          "orbit": {
            "panel": "SELECTED OBJECT",
            "satlas": "OPEN SATLAS ↗",
            "search": "SEARCH CATALOG",
            "all": "ALL",
            "leo": "LEO",
            "meo": "MEO",
            "geo": "GEO",
            "high": "HIGH",
            "count": "{visible} / {total} OBJECTS",
            "waiting": "Reading the active orbital field…",
            "position": "POSITION",
            "altitude": "ALTITUDE",
            "inclination": "INCLINATION",
            "epoch": "EPOCH",
            "note": "The globe is an instrument: select an object to expose its ground relation and orbital trace.",
            "dataUnavailable": "Live orbital data unavailable"
          },
          "earth": {
            "panel": "TEMPORAL OBSERVATION",
            "title": "Earth is not the same image twice.",
            "date": "DATE",
            "play": "PLAY CHANGE",
            "pause": "PAUSE",
            "note": "Move through recent observations. Each frame is conditioned by sensor, orbit, atmosphere, and acquisition time."
          },
          "flow": {"caption":"WIND / FLOW","title":"Circulation makes change visible."},
          "games": {
            "rounds": "ROUND {round} / {total}",
            "score": "SCORE",
            "next": "NEXT",
            "replay": "REPLAY",
            "attempts": "ATTEMPTS",
            "locate": {"title":"Place is learned by relation.","prompt":"Locate {target}","hint":"Click the map. Distance and bearing return the error to you.","result":"{distance} km · {bearing}","done":"A coordinate is not a place, but error has a direction."},
            "zone": {"title":"A boundary is a decision made visible.","prompt":"Find {target}","hint":"Three attempts. Read shape, adjacency, and position before naming.","correct":"FOUND","wrong":"Not this field.","done":"Recognition grows from relation, not outline alone."},
            "path": {"title":"To cross a map is to read adjacency.","prompt":"{start} → {target}","hint":"Move only across shared land borders. Reach the target in as few crossings as you can.","invalid":"No shared land border.","done":"Shortest path: {best} crossings · yours: {steps}."}
          },
          "status": {"loading":"LOADING","live":"LIVE","stale":"STALE","demo":"DEMO","error":"ERROR","static":"DECLARED"},
          "statusLabel": "STATUS",
          "updatedLabel": "UPDATED"
        },
        "atlas": {
          "projectionNames": {"field":"FIELD","time":"TIME","type":"TYPE","topic":"TOPIC","trace":"TRACE","geographic":"GEOGRAPHIC"},
          "relationLabels": {"field":"FIELD","time":"SUCCESSION","type":"FORM","topic":"AFFINITY","trace":"DERIVATION","geographic":"GEOGRAPHIC REFERENCE"},
          "typeLabels": {"note":"NOTE","lab":"LAB","place":"PLACE","photo":"PHOTO"},
          "status": "PROJECTION / {projection} · RELATION / {relation}",
          "tipKicker": "ATLAS",
          "tipDefault": "Read the relations.",
          "philosophy": "No projection preserves everything.",
          "explanations": {
            "field": "Field preserves authored conceptual co-presence. Nearness here is relational, not geographic distance.",
            "time": "Time preserves succession. Earlier and later become legible; causation does not.",
            "type": "Type preserves form. Like records are gathered, then ordered by time.",
            "topic": "Topic preserves affinity. Shared subjects pull traces together; other relations recede.",
            "trace": "Trace preserves derivation. Its links are authored intellectual continuities — what a question opened, what a method changed, and where one inquiry became another. It is not a timeline.",
            "geographic": "Geographic projection accepts only records with a real geographic extent, geometry, or coordinate. Absence of location remains data."
          },
          "traceStart": "BEGIN",
          "traceNow": "NOW",
          "selection": "SELECTION",
          "closeSelection": "Close selection",
          "firstUse": "Select a record to inspect its current relation."
        },
        "footer": {"meta":"© 2026 GeoGeek"},
        "commons": {
          "title": "Commons",
          "statusDemo": "SIMULATED FIELD",
          "statusLive": "LIVE COMMONS",
          "statusError": "UNAVAILABLE",
          "metrics": {"visits":"VISITS","located":"LOCATED VISITS","places":"PLACES","observations":"OBSERVATIONS","active":"ACTIVE NOW"},
          "layers": {"visits":"VISITS","observations":"OBSERVATIONS","now":"NOW","relations":"RELATIONS"},
          "horizons": {"24h":"24H","7d":"7D","30d":"30D","all":"ALL"},
          "timeModes": {"accumulated":"ACCUMULATED","hourly":"HOURLY","daynight":"DAY / NIGHT"},
          "timeRefs": {"utc":"UTC","local":"LOCAL"},
          "map": {"loading":"READING RELATIONS…","demo":"SIMULATED FIELD · FIXED 5,280 VISITS","none":"No place stands alone; select one to reveal its relations.","locatedNote":""},
          "relation": {"title":"RELATION","host":"WUHAN / HOST","fromHost":"FROM WUHAN","fromSelected":"FROM SELECTED","km":"KM","bearing":"INITIAL BEARING","visits":"VISITS","observations":"OBSERVATIONS","updated":"LAST SEEN"},
          "you": {"host":"HOST","you":"YOU","distance":"DISTANCE","bearing":"INITIAL BEARING","notLocated":"NOT LOCATED","deviceOnly":"DEVICE ONLY","greatCircle":"GREAT-CIRCLE","toHost":"FROM YOU TO HOST","locate":"LOCATE ME","light":"LIGHT THIS PLACE","clear":"CLEAR LOCAL POSITION"},
          "observe": {"place":"PLACE","name":"NAME / OPTIONAL","observation":"OBSERVATION","locateFirst":"Locate first","submit":"ADD TO COMMONS","placeholder":"What appears from here?","success":"Observation received.","error":"Could not send this observation."},
          "privacy": {"title":"POSITION & DISCLOSURE","body":"Location enters Commons at coarse spatial resolution.","private":"Your precise location is kept in this browser only."},
          "definitions": "VISITS register presence · OBSERVATIONS leave traces · NOW marks co-presence · RELATIONS emerge between positions.",
          "source": "Natural Earth / world-atlas · anonymous coarse locations"
        }
      },
      "notes": window.GEOGEEK_ARCHIVE?.locales?.en?.notes || [],
      "lab": window.GEOGEEK_ARCHIVE?.locales?.en?.lab || [],
      "elsewhere": window.GEOGEEK_ARCHIVE?.locales?.en?.elsewhere || [],
      "atlasLayout": window.GEOGEEK_ARCHIVE?.locales?.en?.atlasLayout || []
    }
  }
};