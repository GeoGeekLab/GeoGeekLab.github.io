import {defineConfig,devices} from '@playwright/test'
export default defineConfig({
 testDir:'tests/overpass-p8',testMatch:'timelapse-real-mp4.spec.mjs',
 timeout:650000,expect:{timeout:20000},workers:1,retries:0,reporter:[['list']],
 use:{baseURL:'http://127.0.0.1:4173',acceptDownloads:true,trace:'retain-on-failure',screenshot:'only-on-failure',
  launchOptions:{args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}},
 projects:[{name:'chromium-real-mp4',use:{...devices['Desktop Chrome'],viewport:{width:390,height:844},isMobile:true,hasTouch:true}}],
 webServer:{command:'python3 -m http.server 4173 --bind 127.0.0.1 --directory overpass/preview-root',
 url:'http://127.0.0.1:4173/overpass/',timeout:30000,reuseExistingServer:false},
 outputDir:'test-results/overpass-p8'
})
