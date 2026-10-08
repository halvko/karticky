// Smoke test of the built app in headless Chromium: old progress migrates, a round plays through,
// undo works, export/import round-trips, and the app reloads offline.
// Run after `python3 build.py`: node tests/e2e.mjs. In CI it uses the runner's preinstalled Chrome.
import { chromium } from "playwright-core";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

const DIST = path.join(path.dirname(new URL(import.meta.url).pathname), "..", "dist");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".webmanifest": "application/manifest+json", ".png": "image/png", ".woff2": "font/woff2", ".svg": "image/svg+xml" };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (p.endsWith("/")) p += "index.html";
  const f = path.join(DIST, p);
  if (!f.startsWith(DIST) || !fs.existsSync(f)) { res.writeHead(404).end(); return; }
  res.writeHead(200, { "content-type": TYPES[path.extname(f)] || "application/octet-stream" }).end(fs.readFileSync(f));
}).listen(0);
const url = `http://localhost:${server.address().port}/`;

const browser = await chromium.launch(process.env.CI ? { channel: "chrome" } : {});
const context = await browser.newContext({ acceptDownloads: true });
const page = await context.newPage();
const errors = [];
page.on("pageerror", e => errors.push(e.message));
page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
const ls = k => page.evaluate(k => JSON.parse(localStorage.getItem(k)), k);
let step = "";
const check = async (name, fn) => { step = name; await fn(); console.log("ok -", name); };

try {
  await check("old {b,n,w,t} progress migrates to FSRS", async () => {
    await page.goto(url);
    await page.evaluate(() => {
      localStorage.setItem("stats", JSON.stringify({ "l2|vlevo#r": { b: 3, n: 3, w: 0, t: Date.now() - 864e5 }, "l2|vpravo#r": { b: 1, n: 2, w: 1, t: Date.now() - 864e5 } }));
      localStorage.setItem("sel", JSON.stringify(["l2"]));
      localStorage.setItem("mode", JSON.stringify("mix"));
    });
    await page.reload();
    await page.locator("#go").waitFor();
    await page.locator("#card .stats").waitFor();
    assert.match(await page.locator("#card .stats").innerText(), /1\s*umím/);
    assert.match(await page.locator("#card .note").innerText(), /unlocked for 1 of/); // level 3 in CZ → EN still unlocks EN → CZ
    await page.locator("#go").click(); await page.locator("#end").click(); await page.locator("#end").click(); // play one answer-less round to trigger a save
    const st = await ls("stats");
    assert.ok(st["l2|vlevo#r"].s >= 5 && Number.isFinite(st["l2|vlevo#r"].due));
    assert.equal(st["l2|vlevo#r"].b, undefined);
  });

  await check("a round plays through to Hotovo, with a miss repeated in the round, and the card never changes size", async () => {
    await page.locator("[data-n='10']").click();
    const startHeight = (await page.locator("#card").boundingBox()).height;
    await page.locator("#go").click();
    assert.equal(await page.locator("#undo").isVisible(), true);
    assert.equal(await page.locator(".chip").first().isDisabled(), true); // decks are locked during a round
    let answers = 0, missed = false;
    const heights = new Set([startHeight]);
    while (await page.locator("#card .front").count()) {
      heights.add((await page.locator("#card").boundingBox()).height);
      await page.locator("#card").click();
      heights.add((await page.locator("#card").boundingBox()).height);
      if (!missed) { await page.locator("#again").click(); missed = true; } else await page.locator("#know").click();
      if (++answers > 30) throw new Error("round never ended");
    }
    assert.equal(await page.locator("#card b").innerText(), "Hotovo!");
    heights.add((await page.locator("#card").boundingBox()).height);
    assert.equal(heights.size, 1, `card height changed with its content: ${[...heights]}`);
    assert.equal(await page.locator(".missed li").count(), 1);
    assert.equal(await page.locator("#undo").isVisible(), true); // undo stays on the Hotovo screen
    const log = await ls("log");
    assert.equal(Object.values(log).flat().length, answers - 1); // the retry after a miss is not a scheduled review
  });

  await check("undo restores the round and the side's schedule", async () => {
    const before = await ls("log"), n = Object.values(before).flat().length;
    await page.locator("#undo").click();
    assert.ok(await page.locator("#card .answer").isVisible());
    assert.ok(Object.values(await ls("log")).flat().length <= n);
    await page.locator("#know").click();
    await page.locator("#home").click();
    assert.equal(await page.locator("#undo").isVisible(), false); // hidden on the start screen
  });

  let backup;
  await check("export downloads a backup", async () => {
    const [dl] = await Promise.all([page.waitForEvent("download"), page.locator("#export").click()]);
    assert.match(dl.suggestedFilename(), /^karticky-\d{4}-\d{2}-\d{2}\.json$/);
    backup = JSON.parse(fs.readFileSync(await dl.path(), "utf8"));
    assert.equal(backup.app, "karticky");
    assert.deepEqual(backup.stats, await ls("stats"));
  });

  await check("import replaces progress after a confirm", async () => {
    await page.evaluate(() => { localStorage.removeItem("stats"); localStorage.removeItem("log"); });
    await page.reload();
    page.once("dialog", d => d.dismiss());
    await page.locator("#file").setInputFiles({ name: "b.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(backup)) });
    await page.waitForTimeout(200);
    assert.equal(await ls("stats"), null); // cancelled: nothing changed
    page.once("dialog", d => d.accept());
    await page.locator("#file").setInputFiles({ name: "b.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(backup)) });
    await page.waitForFunction(() => localStorage.getItem("stats"));
    assert.deepEqual(await ls("stats"), backup.stats);
    assert.deepEqual(await ls("log"), backup.log);
    page.once("dialog", d => { assert.match(d.message(), /isn't a Kartičky backup/); d.accept(); });
    await page.locator("#file").setInputFiles({ name: "x.json", mimeType: "application/json", buffer: Buffer.from("{}") });
    await page.waitForTimeout(200);
    assert.deepEqual(await ls("stats"), backup.stats);
  });

  await check("works offline after the service worker takes over", async () => {
    await page.waitForFunction(() => navigator.serviceWorker.controller, null, { timeout: 10000 }).catch(async () => { await page.reload(); await page.waitForFunction(() => navigator.serviceWorker.controller, null, { timeout: 10000 }); });
    await context.setOffline(true);
    await page.reload();
    await page.locator("#go").click();
    await page.locator("#card").click();
    assert.ok(await page.locator("#card .answer").isVisible());
    await context.setOffline(false);
  });

  assert.deepEqual(errors, [], "no console errors");
  console.log("all e2e checks passed");
} catch (e) {
  console.error(`FAILED at "${step}":`, e.message);
  process.exitCode = 1;
} finally {
  await browser.close();
  server.close();
}
