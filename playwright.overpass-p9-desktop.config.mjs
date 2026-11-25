import {defineConfig,devices} from '@playwright/test'

// Real desktop Chromium encoder test. WebKit is not equivalent to iOS Safari.
export default defineConfig({
 testDir:'tests/overpass-p8',testMatch:'timelapse-real-mp4.spec.mjs',
 timeout:650000,expect:{timeout:20000},workers:1,retries:0,
 reporter:[['list']],
 use:{baseURL:'http://127.0.0.1:4173',acceptDownloads:true,
  trace:'retain-on-failure',screenshot:'only-on-failure',
  launchOptions:{args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}},
 projects:[{name:'chromium-desktop-real-1080-mp4',
  use:{...devices['Desktop Chrome'],viewport:{width:1920,height:1080}}}],
 webServer:{command:'python3 -m http.server 4173 --bind 127.0.0.1 --directory overpass/preview-root',
  url:'http://127.0.0.1:4173/overpass/',timeout:30000,reuseExistingServer:false},
 outputDir:'test-results/overpass-p9-desktop'
})
