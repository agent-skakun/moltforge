const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUTDIR = path.join(process.env.HOME, 'Projects/moltforge/demo-assets/frames');
fs.mkdirSync(OUTDIR, { recursive: true });

const BASE = 'https://moltforge.cloud';
const AGENT = 'https://agent.moltforge.cloud';

// Scene config: [url, delay_ms, scroll_to_y, label]
const SCENES = [
  // Scene 1: Landing scroll (0:00-0:15) → 90 frames @6fps
  { url: `${BASE}`, scrollEnd: 2000, durationMs: 15000, fps: 6, label: 'scene1_landing' },
  // Scene 2: Marketplace (0:15-0:30)
  { url: `${BASE}/marketplace`, scrollEnd: 800, durationMs: 15000, fps: 6, label: 'scene2_marketplace' },
  // Scene 3: Getting started (0:30-0:45)
  { url: `${BASE}/getting-started`, scrollEnd: 1200, durationMs: 15000, fps: 6, label: 'scene3_getting_started' },
  // Scene 4: Register agent (0:45-1:00)
  { url: `${BASE}/register-agent`, scrollEnd: 1500, durationMs: 15000, fps: 6, label: 'scene4_register' },
  // Scene 5: Tasks + Create task (1:00-1:15)
  { url: `${BASE}/tasks`, scrollEnd: 800, durationMs: 15000, fps: 6, label: 'scene5_tasks' },
  // Scene 6: agent.json + health (1:15-1:30)
  { url: `${AGENT}/agent.json`, scrollEnd: 500, durationMs: 15000, fps: 6, label: 'scene6_agentjson' },
  // Scene 7: Docs ERC-8004 (1:30-1:45)
  { url: `${BASE}/docs`, scrollEnd: 2000, durationMs: 15000, fps: 6, label: 'scene7_docs' },
  // Scene 8: Dashboard (1:45-2:00)
  { url: `${BASE}/dashboard`, scrollEnd: 600, durationMs: 15000, fps: 6, label: 'scene8_dashboard' },
];

async function captureScene(page, scene, frameOffset) {
  console.log(`Capturing: ${scene.label} → ${scene.url}`);
  await page.goto(scene.url, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  const totalFrames = Math.floor((scene.durationMs / 1000) * scene.fps);
  const scrollStep = scene.scrollEnd / totalFrames;

  for (let i = 0; i < totalFrames; i++) {
    const globalFrame = frameOffset + i;
    const scrollY = Math.floor(scrollStep * i);
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'smooth' }), scrollY);
    await page.waitForTimeout(1000 / scene.fps);
    const framePath = path.join(OUTDIR, `frame_${String(globalFrame).padStart(5, '0')}.png`);
    await page.screenshot({ path: framePath, fullPage: false });
  }

  return frameOffset + totalFrames;
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  // Dark mode for better visuals
  await page.emulateMedia({ colorScheme: 'dark' });

  let frameOffset = 0;
  for (const scene of SCENES) {
    try {
      frameOffset = await captureScene(page, scene, frameOffset);
      console.log(`  ✓ ${scene.label}: ${frameOffset} total frames`);
    } catch (e) {
      console.error(`  ✗ ${scene.label}: ${e.message}`);
      // Fill with blank frames to keep timing
      const totalFrames = Math.floor((scene.durationMs / 1000) * scene.fps);
      frameOffset += totalFrames;
    }
  }

  await browser.close();
  console.log(`\nDone. Total frames: ${frameOffset}`);
  console.log(`Output: ${OUTDIR}`);
})();
