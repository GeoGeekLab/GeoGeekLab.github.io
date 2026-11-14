import { test, expect } from '@playwright/test'
import { writeFileSync } from 'node:fs'

const LOCAL='http://127.0.0.1:4173'
const ARCHIVE_HOSTS=['planetarycomputer.microsoft.com','earth-search.aws.element84.com','gibs.earthdata.nasa.gov','view.eumetsat.int']
test('real Waterloo query computes Results and timeline on /overpass/', async ({page},info)=>{
  test.setTimeout(145_000)
  const localErrors=[],archive=[]
  const exceptions=[]
  page.on('pageerror',e=>exceptions.push(e.message))
  page.on('response',r=>{
    const u=new URL(r.url())
    if(u.origin===LOCAL&&r.status()>=400)localErrors.push({status:r.status(),path:u.pathname})
    if(ARCHIVE_HOSTS.includes(u.hostname)&&archive.length<150)
      archive.push({host:u.hostname,status:r.status(),path:u.pathname.slice(0,150)})
  })
  await page.goto('/overpass/?q=43.4723,-80.5449&n=Waterloo',{waitUntil:'domcontentloaded'})
  await expect(page).toHaveTitle(/OVERPASS/)
  // Report calculation uses the real pinned CelesTrak orbit catalog. Archive
  // services may be down; the original Results shows a scientific outage note.
  await expect(page.getByRole('heading',{name:/satellites? watched/i}).first()).toBeVisible({timeout:120_000})
  await expect(page.locator('section[aria-label="Summary"]').first()).toBeAttached()
  await expect(page.locator('[role="group"][aria-label^="Timeline,"]').first()).toBeAttached({timeout:30000})
  // Original carousel and filters exist when an archive actually returns photos.
  const gallery=page.getByRole('group',{name:'Show photos'}).first()
  const hasGallery=await gallery.count()>0
  if(hasGallery){
    await expect(gallery.getByRole('button',{name:'All'})).toBeVisible()
    const detailed=gallery.getByRole('button',{name:'Detailed'})
    await expect(detailed).toBeVisible()
    if(await detailed.isEnabled()){
      await detailed.click()
      await gallery.getByRole('button',{name:'All'}).click()
    }
  }
  const out={
    observedAt:new Date().toISOString(),query:'Waterloo 43.4723,-80.5449',
    evidenceMode:hasGallery?'archive imagery shown':'geometry and archive-outage/lag fallback',
    archiveResponses:archive,localErrors,uncaughtExceptions:exceptions
  }
  writeFileSync(info.outputPath('archive-observation.json'),JSON.stringify(out,null,2))
  await page.screenshot({path:info.outputPath('results.png'),fullPage:true})
  expect(localErrors,'Missing /overpass/ local assets').toEqual([])
  expect(exceptions,'App runtime exception').toEqual([])
})
