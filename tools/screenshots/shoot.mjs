// Takes the README screenshots with headless Chromium (run by ./dev screenshots).
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { extname, join } from "node:path";
import { chromium } from "playwright";

const ROOT = "/work/tools/screenshots";
const OUT = "/work/docs/images";
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json" };

const CARD = "/work/custom_components/hydraxoo/frontend";
const server = createServer(async (req, res) => {
  const url = new URL(req.url, "http://x").pathname;
  const path = url.startsWith("/card/") ? join(CARD, url.slice(6)) : join(ROOT, url);
  try {
    res.writeHead(200, { "content-type": TYPES[extname(path)] ?? "application/octet-stream" });
    res.end(await readFile(path));
  } catch {
    res.writeHead(404).end();
  }
}).listen(8800);

await mkdir(OUT, { recursive: true });
for (const lang of ["en", "fr"]) {
  const tag = lang === "fr" ? "fr-FR" : "en-GB";
  // Native time inputs follow the browser's own language.
  const browser = await chromium.launch({ args: [`--lang=${tag}`], env: { ...process.env, LANG: `${tag.replace("-", "_")}.UTF-8` } });
  // Native time inputs follow the browser's language: match the card's.
  const page = await browser.newPage({
    viewport: { width: 432, height: 900 },
    deviceScaleFactor: 2,
    locale: tag,
  });
  for (const view of ["dashboard", "zone", "new", "settings"]) {
    await page.goto(`http://localhost:8800/shots.html?lang=${lang}&view=${view}`);
    await page.waitForSelector("body[data-ready='1']");
    await page.locator("#shot").screenshot({ path: `${OUT}/${view}-${lang}.png` });
    console.log("saved", view, lang);
  }
  await page.close();
  await browser.close();
}
server.close();
