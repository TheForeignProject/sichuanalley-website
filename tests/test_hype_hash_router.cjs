/* Optional dependency-free runtime checks: node tests/test_hype_hash_router.cjs */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function browser(hash = '', options = {}) {
  const tasks = [], events = {}, calls = [], order = [];
  let current = 'home', transitioning = false, scrolls = 0;
  const scenes = options.scenes || ['home', 'menu', 'our story', 'location', 'dh'];
  const attributes = {
    'data-hype-route-aliases': JSON.stringify(options.aliases || {}),
    'data-hype-route-exclude': JSON.stringify(options.exclude || []),
  };
  const document = {
    readyState: options.loading ? 'loading' : 'complete',
    currentScript: { getAttribute: name => attributes[name] || null },
    documentElement: { scrollTop: 200 }, body: { scrollTop: 200 },
    getElementById: id => options.elements && options.elements[id],
  };
  const window = {
    location: { hash }, HYPE_eventListeners: [],
    addEventListener(type, listener) { (events[type] ||= []).push(listener); },
    pageYOffset: 200,
    scrollTo(...args) { scrolls++; window.lastScroll = args; },
    setTimeout(fn) { tasks.push(fn); },
  };
  function lifecycle(type) {
    let result;
    for (const listener of window.HYPE_eventListeners) {
      if (listener.type === type) {
        result = listener.callback(api, {}, { type });
        if (result === false) break;
      }
    }
    return result;
  }
  const api = {
    sceneNames: () => scenes.slice(), currentSceneName: () => current,
    currentSceneId: () => 'current-scene',
    functions: () => options.functions || {},
    kSceneTransitionInstant: 0,
    kSceneTransitionCrossfade: 1,
    showSceneNamed(target) {
      if (transitioning || !scenes.includes(target)) return;
      calls.push(target); order.push('show:' + target);
      transitioning = true; lifecycle('HypeSceneUnload');
      current = target; transitioning = false;
      lifecycle('HypeSceneLoad'); order.push('designer:' + target);
    },
  };
  if (options.legacy) window.addEventListener('popstate', () => {
    const route = window.location.hash.slice(1);
    if (scenes.includes(route) && current !== route) api.showSceneNamed(route);
  });
  const source = fs.readFileSync(path.join(__dirname, '../site/hype-hash-router.js'), 'utf8');
  const context = vm.createContext({ window, document, console, setTimeout: window.setTimeout });
  vm.runInContext(source, context);
  function flush() {
    let limit = 100;
    while (tasks.length) {
      assert.ok(limit--, 'router must not poll while awaiting Hype');
      tasks.shift()();
    }
  }
  function event(type, fields = {}) {
    for (const listener of events[type] || []) listener(fields);
  }
  return {
    api, window, calls, order, flush, event,
    get current() { return current; }, get scrolls() { return scrolls; },
    start() { if (lifecycle('HypeDocumentLoad') !== false) api.showSceneNamed('home'); flush(); },
    navigate(next, type = 'popstate') { window.location.hash = next; event(type); },
    fade(target) {
      transitioning = true; lifecycle('HypeSceneUnload'); current = target;
    },
    settle() {
      transitioning = false; lifecycle('HypeSceneLoad'); order.push('designer:' + current);
    },
    reinstall() { vm.runInContext(source, context); },
  };
}

test('direct deep link displays its scene instead of loading home first', () => {
  const b = browser('#menu'); b.start();
  assert.deepEqual(b.calls, ['menu']); assert.equal(b.current, 'menu');
  assert.equal(b.scrolls, 1);
});

test('location links scroll within the active breakpoint rather than hidden desktop IDs', () => {
  for (const [name, label, classTarget] of [
    ['FarEast', 'FAR EAST SQUARE', true], ['Capitol', 'CAPITOL SINGAPORE', false],
  ]) {
    const target = { textContent: label + 'RESERVE NOW', getBoundingClientRect: () => ({ top: 600, width: 400, height: 400 }) };
    const button = { textContent: 'RESERVE NOW', parentElement: target };
    const scene = { querySelector: () => classTarget ? target : null, querySelectorAll: () => [button] };
    target.parentElement = scene;
    const functions = { ['scrollTo' + name]() {} };
    const b = browser('', { functions, elements: {
      'current-scene': scene,
      'section-fareast': { getBoundingClientRect: () => ({ top: 0 }) },
      'section-capitol': { getBoundingClientRect: () => ({ top: 0 }) },
    } });
    b.start(); let stopped = false;
    functions['scrollTo' + name](b.api, {}, { stopPropagation() { stopped = true; } });
    b.flush();
    assert.equal(b.current, 'location'); assert.equal(stopped, true);
    assert.equal(b.window.location.hash, '', 'section links retain designer scene-only navigation');
    assert.equal(b.window.lastScroll[0].top, 760);
  }
});

test('desktop section anchors keep their original offset', () => {
  const target = { getBoundingClientRect: () => ({ top: 350, width: 437, height: 437 }) };
  const functions = { scrollToFarEast() {} };
  const b = browser('', { functions, elements: { 'current-scene': { querySelector: () => target } } });
  b.start(); functions.scrollToFarEast(b.api, {}, null); b.flush();
  assert.equal(b.window.lastScroll[0].top, 510);
});

test('leaving location before its delayed section scroll prevents stale scrolling', () => {
  const functions = { scrollToFarEast() {} };
  const b = browser('', { functions }); b.start();
  functions.scrollToFarEast(b.api, {}, null); b.api.showSceneNamed('menu');
  const before = b.scrolls; b.flush(); assert.equal(b.scrolls, before);
});

test('rapid location requests scroll only to the latest section', () => {
  const functions = { scrollToFarEast() {}, scrollToCapitol() {} };
  const target = { getBoundingClientRect: () => ({ top: 600, width: 400, height: 400 }) };
  const b = browser('', { functions, elements: { 'current-scene': { querySelector: () => target } } });
  b.start(); const before = b.scrolls;
  functions.scrollToFarEast(b.api, {}, null); functions.scrollToCapitol(b.api, {}, null);
  b.flush(); assert.equal(b.scrolls, before + 1);
});

test('empty and explicit home addresses retain normal Hype initialization', () => {
  for (const hash of ['', '#home']) {
    const b = browser(hash); b.start(); assert.deepEqual(b.calls, ['home']);
  }
});

test('encoded scene names and existing Birds aliases are restored', () => {
  for (const hash of ['#our%20story', '#STORY']) {
    const b = browser(hash, { aliases: { story: 'our story' } }); b.start();
    assert.equal(b.current, 'our story');
  }
});

test('unknown, malformed and internal scene addresses keep normal startup', () => {
  for (const hash of ['#missing', '#%xx', '#dh']) {
    const b = browser(hash, { exclude: ['dh'] }); b.start();
    assert.deepEqual(b.calls, ['home']); assert.equal(b.window.location.hash, hash);
  }
});

test('Back to bare URL and Forward restore scenes without duplicate loads', () => {
  const b = browser('#menu', { legacy: true }); b.start();
  b.navigate(''); b.event('hashchange'); b.flush();
  assert.equal(b.current, 'home');
  b.navigate('#menu'); b.event('hashchange'); b.flush();
  assert.deepEqual(b.calls, ['menu', 'home', 'menu']);
  assert.equal(b.window.location.hash, '#menu');
});

test('designer tab fade finishes without a duplicate scene load or extra scrolling', () => {
  const b = browser(); b.start(); const before = b.scrolls;
  b.window.location.hash = '#menu'; b.fade('menu'); b.event('hashchange'); b.flush();
  assert.deepEqual(b.calls, ['home']);
  b.settle(); b.flush();
  assert.deepEqual(b.calls, ['home']); assert.equal(b.scrolls, before);
});

test('latest history request survives an active transition', () => {
  const b = browser(); b.start(); b.fade('menu');
  b.navigate('#our%20story'); b.flush(); b.navigate('#location'); b.flush();
  assert.deepEqual(b.calls, ['home']);
  b.settle(); b.flush();
  assert.equal(b.current, 'location');
  assert.ok(b.order.indexOf('designer:menu') < b.order.indexOf('show:location'));
});

test('Back to outgoing scene is retained until the fade actually finishes', () => {
  const b = browser(); b.start(); b.fade('menu');
  b.navigate(''); b.flush(); b.settle(); b.flush();
  assert.equal(b.current, 'home'); assert.deepEqual(b.calls, ['home', 'home']);
});

test('new invalid address cancels an older pending navigation', () => {
  const b = browser(); b.start(); b.fade('menu');
  b.navigate('#location'); b.flush(); b.navigate('#%xx'); b.flush();
  b.settle(); b.flush(); assert.equal(b.current, 'menu');
  assert.deepEqual(b.calls, ['home']);
});

test('pushState-style URL change during a fade is observed after it settles', () => {
  const b = browser(); b.start(); b.fade('menu');
  b.window.location.hash = '#location'; // pushState emits neither browser event
  b.settle(); b.flush(); assert.equal(b.current, 'location');
});

test('designer scene-only location navigation is not reversed', () => {
  const b = browser('#menu'); b.start(); const before = b.scrolls;
  b.api.showSceneNamed('location'); b.flush();
  assert.equal(b.current, 'location'); assert.equal(b.scrolls, before);
});

test('initial top correction waits for pageshow and installation is idempotent', () => {
  const b = browser('#menu', { loading: true }); b.reinstall(); b.start();
  assert.deepEqual(b.calls, ['menu']); assert.equal(b.scrolls, 0);
  b.event('pageshow', { persisted: false }); b.flush(); assert.equal(b.scrolls, 1);
  b.flush(); assert.equal(b.scrolls, 1);
});
