/**
 * Ad Manager — UTM persistence + propagation script
 * https://app.adseditor.com.br
 *
 * O que faz:
 *  1. Lê UTMs (utm_source/medium/campaign/content/term/id + src/sck/xcode/fbclid/gclid)
 *     da URL atual quando o visitante chega na sua landing.
 *  2. Salva em cookie (90 dias) + localStorage. Sobrescreve só se chegar com UTMs novos.
 *  3. Propaga automaticamente esses UTMs em TODOS os links (<a href>) que apontem
 *     pra domínios de checkout (Hotmart, Kiwify, Hubla, Assiny, +genéricos).
 *  4. Também propaga em formulários (input hidden) e em window.open.
 *
 * Atributos de configuração no <script>:
 *  - data-prevent-subids: se a URL atual JÁ tem UTMs, NÃO sobrescreve os salvos.
 *    Útil pra preservar atribuição de uma 1ª visita anterior.
 *  - data-domains="hotmart.com,kiwify.com.br,...": override dos domínios padrão.
 *  - data-debug: liga logs no console pra debug.
 *
 * Uso:
 *   <script src="https://app.adseditor.com.br/utms/latest.js" data-prevent-subids async defer></script>
 */
(function () {
  'use strict';

  var SCRIPT = document.currentScript || (function () {
    var s = document.getElementsByTagName('script');
    return s[s.length - 1];
  })();

  var PREVENT_SUBIDS = SCRIPT && SCRIPT.dataset && 'preventSubids' in SCRIPT.dataset;
  var DEBUG = SCRIPT && SCRIPT.dataset && 'debug' in SCRIPT.dataset;
  var CUSTOM_DOMAINS = SCRIPT && SCRIPT.dataset && SCRIPT.dataset.domains
    ? SCRIPT.dataset.domains.split(',').map(function (d) { return d.trim().toLowerCase(); })
    : null;

  var COOKIE_NAME = '__am_utms';
  var COOKIE_DAYS = 90;
  var STORAGE_KEY = '__am_utms';

  // Domínios de checkout que recebem propagação automática
  var DEFAULT_DOMAINS = [
    'hotmart.com', 'pay.hotmart.com',
    'kiwify.com', 'kiwify.com.br', 'pay.kiwify.com.br',
    'hub.la', 'hubla.com.br', 'pay.hubla.com.br',
    'assiny.com.br', 'pay.assiny.com.br',
    'pay.bemobi.com.br', 'sun.eduzz.com', 'monetizze.com.br',
    'go.hotmart.com', 'app-vlc.hotmart.com',
  ];

  var DOMAINS = CUSTOM_DOMAINS || DEFAULT_DOMAINS;

  var KEYS = [
    'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'utm_id',
    'src', 'sck', 'xcode',
    'fbclid', 'gclid', 'ttclid', 'msclkid',
  ];

  function log() {
    if (DEBUG && window.console) console.log.apply(console, ['[am-utms]'].concat([].slice.call(arguments)));
  }

  // ---- Cookie helpers ---------------------------------------------------
  function setCookie(name, value) {
    var d = new Date();
    d.setTime(d.getTime() + COOKIE_DAYS * 86400000);
    var domain = '';
    try {
      // Tenta gravar em domínio raiz (.example.com.br) pra subdomínios verem
      var parts = location.hostname.split('.');
      if (parts.length >= 2) {
        domain = '; domain=.' + parts.slice(-2).join('.');
      }
    } catch (e) {}
    document.cookie =
      name + '=' + encodeURIComponent(value) +
      '; expires=' + d.toUTCString() +
      '; path=/' +
      domain +
      '; SameSite=Lax' +
      (location.protocol === 'https:' ? '; Secure' : '');
  }

  function getCookie(name) {
    var match = document.cookie.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)'));
    return match ? decodeURIComponent(match[1]) : null;
  }

  // ---- Storage ----------------------------------------------------------
  function readStored() {
    try {
      var c = getCookie(COOKIE_NAME);
      if (c) return JSON.parse(c);
    } catch (e) {}
    try {
      var s = localStorage.getItem(STORAGE_KEY);
      if (s) return JSON.parse(s);
    } catch (e) {}
    return null;
  }

  function writeStored(obj) {
    var json = JSON.stringify(obj);
    try { setCookie(COOKIE_NAME, json); } catch (e) {}
    try { localStorage.setItem(STORAGE_KEY, json); } catch (e) {}
  }

  // ---- Capture from URL -------------------------------------------------
  function readFromURL() {
    var out = {};
    try {
      var qs = new URLSearchParams(window.location.search);
      KEYS.forEach(function (k) {
        var v = qs.get(k);
        if (v) out[k] = v;
      });
    } catch (e) {}
    return out;
  }

  function captureUTMs() {
    var fromURL = readFromURL();
    var hasNew = Object.keys(fromURL).length > 0;
    var existing = readStored();

    if (!hasNew && existing) { log('using existing', existing); return existing; }
    if (!hasNew) { log('no UTMs anywhere'); return null; }

    if (PREVENT_SUBIDS && existing) {
      log('preventSubids active, keeping existing', existing);
      return existing;
    }

    var merged = Object.assign({}, existing || {}, fromURL, {
      __captured_at: new Date().toISOString(),
      __captured_url: location.href,
    });
    writeStored(merged);
    log('captured', merged);
    return merged;
  }

  // ---- URL decoration ---------------------------------------------------
  function isCheckoutHost(hostname) {
    if (!hostname) return false;
    var h = hostname.toLowerCase();
    for (var i = 0; i < DOMAINS.length; i++) {
      if (h === DOMAINS[i] || h.endsWith('.' + DOMAINS[i])) return true;
    }
    return false;
  }

  function decorateUrl(rawUrl, utms) {
    try {
      var u = new URL(rawUrl, location.origin);
      if (!isCheckoutHost(u.hostname)) return rawUrl;

      KEYS.forEach(function (k) {
        if (utms[k] && !u.searchParams.has(k)) {
          u.searchParams.set(k, utms[k]);
        }
      });
      return u.toString();
    } catch (e) { return rawUrl; }
  }

  // ---- Propagation ------------------------------------------------------
  function decorateAllLinks(utms) {
    var links = document.querySelectorAll('a[href]');
    var count = 0;
    for (var i = 0; i < links.length; i++) {
      var a = links[i];
      var newHref = decorateUrl(a.getAttribute('href'), utms);
      if (newHref && newHref !== a.getAttribute('href')) {
        a.setAttribute('href', newHref);
        count++;
      }
    }
    if (count > 0) log('decorated ' + count + ' links');
  }

  function decorateForms(utms) {
    var forms = document.getElementsByTagName('form');
    for (var i = 0; i < forms.length; i++) {
      var f = forms[i];
      try {
        if (!f.action) continue;
        var u = new URL(f.action, location.origin);
        if (!isCheckoutHost(u.hostname)) continue;
        KEYS.forEach(function (k) {
          if (!utms[k]) return;
          if (f.querySelector('input[name="' + k + '"]')) return;
          var inp = document.createElement('input');
          inp.type = 'hidden';
          inp.name = k;
          inp.value = utms[k];
          f.appendChild(inp);
        });
      } catch (e) {}
    }
  }

  function patchWindowOpen(utms) {
    var orig = window.open;
    window.open = function (url) {
      var args = [].slice.call(arguments);
      if (typeof url === 'string') args[0] = decorateUrl(url, utms);
      return orig.apply(window, args);
    };
  }

  function observeMutations(utms) {
    if (!window.MutationObserver) return;
    var debounce;
    var mo = new MutationObserver(function () {
      clearTimeout(debounce);
      debounce = setTimeout(function () { decorateAllLinks(utms); }, 100);
    });
    try {
      mo.observe(document.body, { childList: true, subtree: true });
    } catch (e) {}
  }

  function run() {
    var utms = captureUTMs();
    if (!utms) return;

    decorateAllLinks(utms);
    decorateForms(utms);
    patchWindowOpen(utms);
    observeMutations(utms);

    // Re-roda na próxima frame pra pegar links que outros scripts injetaram
    setTimeout(function () { decorateAllLinks(utms); decorateForms(utms); }, 500);
    setTimeout(function () { decorateAllLinks(utms); decorateForms(utms); }, 2000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
