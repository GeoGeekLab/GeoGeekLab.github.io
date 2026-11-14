import {test,expect} from '@playwright/test'
import {spawnSync} from 'node:child_process'
import {readFileSync,statSync,mkdirSync,writeFileSync} from 'node:fs'
import {resolve} from 'node:path'
/** No mock scenes or network interception; fail on unavailable archive. */
test('Historical Sentinel-2 imagery exports a real browser-encoded MP4',async({page},info)=>{
 test.setTimeout(650000)
 const minWidth=Number(process.env.P9_MIN_MP4_WIDTH||640)
 const maxExportMs=Number(process.env.P9_MAX_EXPORT_MS||0)
 expect(Number.isInteger(minWidth)&&minWidth>=640&&minWidth<=4320).toBe(true)
 expect(Number.isFinite(maxExportMs)&&maxExportMs>=0).toBe(true)
 const responses=[],errors=[]
 page.on('response',r=>{try{
  const u=new URL(r.url())
  if(/planetarycomputer\.microsoft\.com|earth-search\.aws\.element84\.com/.test(u.hostname))
   responses.push({origin:u.origin,status:r.status(),resourceType:r.request().resourceType()})
 }catch{}})
 page.on('pageerror',e=>errors.push(e.message))
 await page.goto('/overpass/?q=1.3521,103.8198&n=Singapore&tl=1',{waitUntil:'domcontentloaded',timeout:60000})
 const overlay=page.getByRole('dialog',{name:/Time-lapse of Singapore/i})
 await expect(overlay).toBeVisible({timeout:150000})
 const make=overlay.getByRole('button',{name:'Video',exact:true})
 await expect(make).toBeVisible({timeout:300000})
 const summary=overlay.getByText(/\d+ clear looks · one a year/).first()
 await expect(summary).toBeVisible({timeout:300000})
 const count=Number((await summary.textContent())?.match(/(\d+) clear looks/)?.[1])
 expect(count,'Need at least eight historical Sentinel yearly captures').toBeGreaterThanOrEqual(8)
 expect(responses.filter(r=>r.status>=200&&r.status<300).length).toBeGreaterThan(0)
 const exportStarted=Date.now()
 await make.click()
 const save=overlay.getByRole('button',{name:'Save video'})
 await expect(save).toBeVisible({timeout:400000})
 const ready=page.waitForEvent('download',{timeout:25000})
 await save.click()
 const download=await ready
 const exportElapsedMs=Date.now()-exportStarted
 if(maxExportMs>0)expect(exportElapsedMs,'Actual browser encoding exceeded the configured budget').toBeLessThanOrEqual(maxExportMs)
 expect(download.suggestedFilename()).toMatch(/^overpass-.*\.mp4$/)
 const dir=info.outputPath('mp4')
 mkdirSync(dir,{recursive:true})
 const file=resolve(dir,download.suggestedFilename())
 await download.saveAs(file)
 const bytes=readFileSync(file)
 expect(bytes.length).toBeGreaterThan(100000)
 expect(bytes.subarray(4,8).toString()).toBe('ftyp')
 expect(bytes.includes(Buffer.from('moov'))).toBe(true)
 const probe=spawnSync('ffprobe',['-v','error','-show_entries','format=duration','-show_entries','stream=codec_name,width,height','-of','json',file],{encoding:'utf8',timeout:30000})
 expect(probe.status,'ffprobe error: '+probe.stderr).toBe(0)
 const meta=JSON.parse(probe.stdout)
 expect(Number(meta.format?.duration)).toBeGreaterThan(3)
 expect(Number(meta.streams?.[0]?.width),'Actual MP4 width must meet the test profile').toBeGreaterThanOrEqual(minWidth)
 expect(['h264','vp9','av1']).toContain(meta.streams?.[0]?.codec_name)
 expect(errors).toEqual([])
 const evidence={observedAt:new Date().toISOString(),archiveResponses:responses,
  realHistoricalFrames:count,filename:download.suggestedFilename(),
  bytes:statSync(file).size,ffprobe:meta,minimumRequiredWidth:minWidth,
  exportElapsedMs,maxExportMs,viewport:page.viewportSize(),h264Portable:meta.streams?.[0]?.codec_name==='h264',
  approvedForProduction:false}
 writeFileSync(info.outputPath('mp4-evidence.json'),JSON.stringify(evidence,null,2))
})
