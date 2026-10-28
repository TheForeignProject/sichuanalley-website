/* Production URL restoration. Kept outside the designer's Hype export. */
(function () {
  'use strict';
  if (window.__productionHypeHashRouter) return;
  window.__productionHypeHashRouter = true;

  var script = document.currentScript;
  var aliases = JSON.parse(script.getAttribute('data-hype-route-aliases') || '{}');
  var excluded = JSON.parse(script.getAttribute('data-hype-route-exclude') || '[]');
  var hype = null;
  var ready = false;
  var busy = false;
  var queued = false;
  var pending = null;
  var lastHash = window.location.hash;
  var pageShown = document.readyState === 'complete';

  function installLocationLinks(api) {
    if (typeof api.functions !== 'function') return;
    var functions = api.functions();
    var latestRequest = 0;
    [['FarEast', 'section-fareast', 'FAR EAST SQUARE'],
      ['Capitol', 'section-capitol', 'CAPITOL SINGAPORE']].forEach(function (route) {
      var name = 'scrollTo' + route[0];
      if (typeof functions[name] !== 'function') return;
      functions[name] = function (documentApi, element, event) {
        var requestId = ++latestRequest;
        if (event) event.stopPropagation();
        documentApi.showSceneNamed('location', documentApi.kSceneTransitionCrossfade, 0.3);
        window.setTimeout(function () {
          if (requestId !== latestRequest || documentApi.currentSceneName() !== 'location') return;
          var scene = document.getElementById(documentApi.currentSceneId());
          if (!scene) return;
          // The export assigns section IDs only to the desktop layout. Scope
          // lookup to the active scene, using the mobile class or location group.
          var target = scene.querySelector('#' + route[1] + ', .' + route[1]);
          if (!target) {
            var buttons = scene.querySelectorAll('[role="button"]');
            for (var i = 0; i < buttons.length && !target; i++) {
              if (buttons[i].textContent.trim() !== 'RESERVE NOW') continue;
              var parent = buttons[i].parentElement;
              while (parent && parent !== scene) {
                var other = route[0] === 'FarEast' ? 'CAPITOL SINGAPORE' : 'FAR EAST SQUARE';
                if (parent.textContent.indexOf(route[2]) >= 0 && parent.textContent.indexOf(other) < 0) {
                  target = parent; break;
                }
                parent = parent.parentElement;
              }
            }
          }
          var rect = target && target.getBoundingClientRect();
          if (rect && rect.width > 0 && rect.height > 0) window.scrollTo({
            top: rect.top + window.pageYOffset - 40,
            behavior: 'instant'
          });
        }, 320);
      };
    });
  }

  function sceneFor(rawHash) {
    var names = hype.sceneNames();
    var name;
    try { name = decodeURIComponent(rawHash.replace(/^#/, '')); }
    catch (error) { return null; }
    if (!name) return names[0];
    var key = name.toLowerCase();
    if (Object.prototype.hasOwnProperty.call(aliases, key)) name = aliases[key];
    for (var i = 0; i < names.length; i++) {
      if (names[i].toLowerCase() === name.toLowerCase() && excluded.indexOf(names[i]) < 0) {
        return names[i];
      }
    }
    return null;
  }

  function schedule() {
    if (queued) return;
    queued = true;
    window.setTimeout(reconcile, 0);
  }

  function request(top) {
    var hash = window.location.hash;
    if (!pending || pending.hash !== hash) {
      pending = { hash: hash, top: top, switched: false };
    } else if (top) {
      pending.top = true;
    }
    lastHash = hash;
    schedule();
  }

  function reconcile() {
    queued = false;
    if (!hype) return;
    // A designer pushState call emits no browser event. Observe it after the
    // scene settles, without enforcing the URL on scene-only interactions.
    if (window.location.hash !== lastHash) request(false);
    if (!pending) return;
    var target = sceneFor(pending.hash);
    if (!target) { pending = null; return; }
    if (!ready || busy) return;
    if (hype.currentSceneName() !== target) {
      pending.switched = true;
      hype.showSceneNamed(target, hype.kSceneTransitionInstant);
      return; // HypeSceneLoad will schedule the settled check.
    }
    if ((pending.top || pending.switched) && !pageShown) return;
    if (pending.top || pending.switched) {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      if (document.body) document.body.scrollTop = 0;
    }
    pending = null;
  }

  var listeners = window.HYPE_eventListeners = window.HYPE_eventListeners || [];
  listeners.push({ type: 'HypeDocumentLoad', callback: function (api) {
    // Each site contains one top-level Hype document; iframe widgets have
    // their own window. Bind the callback's API instead of a generated name.
    if (hype) return;
    hype = api;
    installLocationLinks(api);
    busy = true;
    var target = sceneFor(window.location.hash);
    if (target) request(true);
    if (target && target !== api.sceneNames()[0]) {
      api.showSceneNamed(target, api.kSceneTransitionInstant);
      return false; // Prevent Hype from subsequently displaying its first scene.
    }
  } });
  listeners.push({ type: 'HypeSceneUnload', callback: function (api) {
    if (api === hype) busy = true;
  } });
  listeners.push({ type: 'HypeSceneLoad', callback: function (api) {
    if (api !== hype) return;
    ready = true;
    busy = false;
    // Designer scene-load actions run after this callback. Avoid re-entering
    // Hype here or interrupting their carousel/section-scroll initialization.
    schedule();
  } });
  window.addEventListener('popstate', function () { request(true); });
  window.addEventListener('hashchange', function () { request(false); });
  window.addEventListener('pageshow', function (event) {
    pageShown = true;
    if (event.persisted) request(true);
    else schedule();
  });
})();
