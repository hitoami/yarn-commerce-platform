const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const section = fs.readFileSync('sections/yarn-season-page.liquid', 'utf8');
const css = fs.readFileSync('assets/yarn-season-page.css', 'utf8');
const js = fs.readFileSync('assets/yarn-season-lightbox.js', 'utf8');

test('season photos are buttons that open the full-screen viewer with a high-res source (#181)', () => {
  // Every photo slot renders as a button carrying the full-size URL; the gallery is no longer a link to the product.
  assert.match(section, /<button type="button" class="yx-season-page__shot" data-full="\{\{ sp_full \}\}"/);
  assert.doesNotMatch(section, /yx-season-page__media[^"]*" href=/);
  assert.match(section, /data-season-gallery data-caption=/);
  // Count placeholder is replaced with the real number of photos, and the fallback image never leaks between yarns.
  assert.match(section, /replace: '__SHOTS__', sp_shots/);
  assert.match(section, /assign sp_fallback = blank/);
  assert.match(section, /<yarn-season-lightbox>\s*<dialog class="yx-lightbox"/);
  assert.match(section, /'accessibility\.close' \| t/);
});

test('viewer opens on the tapped photo, steps, closes and returns focus (#181)', () => {
  assert.match(js, /this\.go\(shots\.indexOf\(shot\), 'instant'\)/);
  assert.match(js, /showModal\(\)/);
  assert.match(js, /ArrowLeft/);
  assert.match(js, /ArrowRight/);
  assert.match(js, /dy > 90/);
  assert.match(js, /this\.opener\.focus/);
  assert.match(js, /prefers-reduced-motion/);
});

test('phone gallery is edge to edge at 260px with the big photo alternating sides (#181)', () => {
  const phone = css.slice(0, css.indexOf('@media (min-width: 750px)'));
  assert.match(phone, /\.yx-season-page__media \{[^}]*height: 260px/);
  assert.match(phone, /\.yx-season-page__list \{[^}]*padding: 0;/);
  assert.match(phone, /\.yx-season-page__yarn--flip \.yx-season-page__media \.yx-season-page__shot:first-child \{ grid-column: 2; \}/);
  assert.match(phone, /\.yx-season-page__copy \{[^}]*padding: 0 var\(--yarn-gutter\)/);
});

test('viewer copy exists in every storefront locale (#181)', () => {
  for (const file of fs.readdirSync('locales').filter(f => f.endsWith('.json') && !f.includes('schema'))) {
    const raw = fs.readFileSync(`locales/${file}`, 'utf8');
    const strings = JSON.parse(raw.slice(raw.indexOf('{'))).yarn_project;
    for (const key of ['season_photo_open', 'season_photo_prev', 'season_photo_next', 'season_photo_viewer']) assert.ok(strings[key], `${file}: ${key}`);
    assert.match(strings.season_photo_open, /\{\{ index \}\}[\s\S]*\{\{ total \}\}|\{\{ total \}\}[\s\S]*\{\{ index \}\}/);
  }
});
