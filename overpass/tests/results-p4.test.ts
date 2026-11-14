import { describe, expect, it } from 'vitest'
import { panSharpUrl } from '@/imagery/panUrl'
import { hiResUrl, cardUrl, filterCounts, filterPhotos } from '@/ui/results/lib/photos'
import { waterlooReport } from '@/ui/results/__fixtures__/waterloo'
import { buildResultsModel } from '@/ui/results/model'
import { deepLink } from '@/ui/share/links'

describe('GeoGeek /overpass/ static Results: real provenance, correct paths', () => {
  it('does not ask missing server-side /api/pan; preserves high-resolution Landsat fallback', async () => {
    const report = await waterlooReport({ withTracks: false })
    const landsat = report.captures.find(c => c.collection === 'landsat-c2-l2' && /^landsat-[89]$/.test(c.platform))
    expect(landsat).toBeDefined()
    const hi = hiResUrl(landsat!)
    expect(hi).toBeDefined()
    expect(hi!.startsWith('https://planetarycomputer.microsoft.com/')).toBe(true)
    expect(hi).not.toContain('pansharp:')
    expect(hi).not.toContain('/api/pan')
    expect(panSharpUrl(cardUrl(landsat!), landsat!.datetime, hi!)).toBeUndefined()
  })

  it('leaves canonical filtering, capture provenance, photo counts and timeline intact', async () => {
    const report = await waterlooReport({ withTracks: false })
    const model = buildResultsModel(report)
    expect(model.photos.length).toBeGreaterThan(0)
    expect(model.windowDays).toBeGreaterThan(6.99)
    expect(model.windowDays).toBeLessThan(7.01)
    const counts = filterCounts(model.photos)
    expect(counts.all).toBe(model.photos.length)
    expect(counts.detailed + counts.weather + counts.radar).toBe(counts.all)
    expect(filterPhotos(model.photos,'detailed').every(p => p.kind === 'detailed')).toBe(true)
    expect(filterPhotos(model.photos,'radar').every(p => p.kind === 'radar')).toBe(true)
    expect(model.photos.some(p => p.capture.collection === 'sentinel-2-l2a')).toBe(true)
    for (const photo of model.photos) {
      expect(photo.capture.id).toBeTruthy()
      expect(Number.isFinite(photo.capture.datetime)).toBe(true)
      expect(photo.capture.collection).toBeTruthy()
    }
    expect(report.passes.length).toBeGreaterThan(model.photos.length)
    expect(new Set(model.photos.map(p => p.key)).size).toBe(model.photos.length)
  })

  it('a full pass deep link keeps the instrument path, coordinates, NORAD and time', () => {
    const link = deepLink('https://geogeeklab.github.io/overpass','Waterloo',43.4723,-80.5449,'pass:1',{
      norad:40697,satName:'Sentinel-2A',verdict:'imaged',tClosest:1762800000000
    })
    const url=new URL(link)
    expect(url.pathname).toBe('/overpass/')
    expect(url.searchParams.get('q')).toContain('43.47')
    expect(url.searchParams.get('norad')).toBe('40697')
    expect(url.searchParams.get('t')).toBe('1762800000000')
  })
})
