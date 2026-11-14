import {describe,it,expect} from 'vitest'
import {waterlooReport} from '@/ui/results/__fixtures__/waterloo'
import {buildResultsModel} from '@/ui/results/model'
import {replayWindow,windowFraction,replayDone,REPLAY_RATES} from '@/ui/results/lib/replay'
import {motionVector,revealProgress,sweepRange,scannedPolygon} from '@/ui/results/lib/pushbroom'
import {hasTimelapse} from '@/ui/results/TimelapseEntry'
import {timelapseLink} from '@/ui/timelapse/link'
import {timelapseParam} from '@/state/timelapse'
import {planVideo,videoFileName} from '@/ui/timelapse/video'

describe('P5 replay, time-lapse and static provenance',()=>{
 it('replay bounds enclose the verified pass; scrub fractions clamp',async()=>{
   const r=await waterlooReport({withTracks:false})
   const p=r.passes.find(p=>p.verdict==='imaged'&&Number.isFinite(p.tClosest))
   expect(p).toBeDefined()
   const window=replayWindow(p!)
   expect(window[0]).toBeLessThanOrEqual(p!.tClosest-90_000)
   expect(window[1]).toBeGreaterThanOrEqual(p!.tClosest+90_000)
   expect(windowFraction(window[0]-1000,window)).toBe(0)
   expect(windowFraction(window[1]+1000,window)).toBe(1)
   expect(replayDone(window[1],window)).toBe(true)
   expect(REPLAY_RATES).toEqual([1,10,30,60])
 })
 it('pushbroom scans along motion heading with bounded progress',()=>{
   const d=motionVector(90),w=1000,h=1000
   expect(d.x).toBeCloseTo(1,8)
   expect(d.y).toBeCloseTo(0,8)
   const [start,end]=sweepRange(w,h,d)
   expect(end).toBeGreaterThan(start)
   expect(scannedPolygon(w,h,d,(start+end)/2)).toHaveLength(4)
   expect(revealProgress(-10)).toBe(0)
   expect(revealProgress(800)).toBe(.5)
   expect(revealProgress(10000)).toBe(1)
 })
 it('Time-lapse remains gated on Sentinel-2 real captures',async()=>{
   const r=await waterlooReport({withTracks:false})
   const model=buildResultsModel(r)
   expect(hasTimelapse(model)).toBe(true)
   expect(model.photos.length).toBeGreaterThan(0)
   expect(hasTimelapse({report:{captures:[]}} as any)).toBe(false)
 })
 it('Time-lapse sharing includes the GeoGeek subpath and rounded coordinates',()=>{
   const url=new URL(timelapseLink('https://geogeeklab.github.io/overpass',{label:'Waterloo',lat:43.4723,lon:-80.5449}))
   expect(url.pathname).toBe('/overpass/')
   expect(url.searchParams.get('q')).toBe('43.47,-80.54')
   expect(url.searchParams.get('tl')).toBe('1')
   expect(timelapseParam(url.search)).toBe(true)
 })
 it('MP4 export keeps real frame sequencing and OVERPASS filename',()=>{
   const frames=[{date:'2016-06-01'},{date:'2024-11-01'}]
   expect(videoFileName('Waterloo',frames)).toBe('overpass-waterloo-2016-2024.mp4')
   const p=planVideo(3)
   expect(p.steps[0]).toEqual({base:0,alpha:0})
   expect(p.steps.at(-1)?.base).toBe(2)
   expect(p.steps.some(s=>s.over!==undefined)).toBe(true)
 })
})
