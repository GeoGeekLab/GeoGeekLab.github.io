#!/usr/bin/env node
/** Capture a REAL P5 browser view for the new Lab instrument card. No stock art. */
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {mkdirSync,writeFileSync} from 'node:fs'
import {dirname,resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {chromium} from '@playwright/test'
import sharp from 'sharp'
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..')
const port=4276
const base='http://127.0.0.1:'+port
const server=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1',
 '--directory','overpass/preview-root'],{cwd:root,stdio:'ignore'})
let browser
try{
 let ready=false
 for(let attempt=0;attempt<60;attempt++){
  try{const r=await fetch(base+'/overpass/',{signal:AbortSignal.timeout(1200)});if(r.ok){ready=true;break}}catch{}
  await new Promise(done=>setTimeout(done,250))
 }
 assert(ready,'P6 preview webserver did not start')
 browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader',
  '--enable-unsafe-swiftshader']})
 const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1,
  reducedMotion:'reduce'})
 const errors=[]
 page.on('pageerror',e=>errors.push(e.message))
 await page.goto(base+'/overpass/?q=43.4723,-80.5449&n=Waterloo',
  {waitUntil:'domcontentloaded',timeout:45000})
 await page.locator('canvas').first().waitFor({state:'attached',timeout:30000})
 let mode='landing'
 try{
  await page.getByRole('heading',{name:/satellites? watched/i}).first()
   .waitFor({state:'visible',timeout:90000})
  mode='results'
 }catch{
  // A delayed imagery archive must not be represented as a confirmed image.
  // We may use the original live Landing render as the honest preview instead.
 }
 const screenshot=await page.screenshot({type:'png',animations:'disabled',timeout:30000})
 const buffer=await sharp(screenshot)
  .resize({width:1200,height:675,fit:'cover',position:'centre'})
  .jpeg({quality:82,mozjpeg:true}).toBuffer()
 assert(buffer.length>8000,'Captured image is too small')
 const stats=await sharp(buffer).stats()
 const variation=stats.channels.slice(0,3).reduce((sum,c)=>sum+c.stdev,0)
 assert(variation>12,'Refuse a blank instrument preview')
 const dest=resolve(root,'dist/assets/lab/previews/overpass.jpg')
 mkdirSync(dirname(dest),{recursive:true})
 writeFileSync(dest,buffer)
 const report={capturedAt:new Date().toISOString(),source:'actual headless Chromium OVERPASS',
   route:'/overpass/?q=43.4723,-80.5449&n=Waterloo',mode,
   width:1200,height:675,bytes:buffer.length,channelStdevTotal:variation,
   pageExceptions:errors}
 const reportPath=resolve(root,'overpass/reports/p6-preview-capture.json')
 mkdirSync(dirname(reportPath),{recursive:true})
 writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n')
 console.log(JSON.stringify(report,null,2))
 assert(errors.length===0,'OVERPASS capture encountered uncaught runtime exceptions')
} finally {
 if(browser) await browser.close()
 server.kill('SIGTERM')
}
