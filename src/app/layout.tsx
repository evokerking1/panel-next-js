import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Airlink Panel',
  description: 'Game server management panel',
}

// Reads the 'theme' cookie before first paint — no flash.
// Falls back to dark when no cookie exists (dark is the default).
// window.toggleTheme() writes the cookie and flips the class live.
const themeScript = `
(function(){
  function getCookie(name){
    var m=document.cookie.match('(?:^|;)\\\\s*'+name+'=([^;]*)');
    return m?decodeURIComponent(m[1]):null;
  }
  var stored=getCookie('theme');
  if(!stored){
    stored='dark';
    document.cookie='theme=dark;path=/;max-age='+60*60*24*365+';samesite=strict';
  }
  if(stored==='dark'){
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }

  window.toggleTheme=function(){
    var isDark=document.documentElement.classList.contains('dark');
    var next=isDark?'light':'dark';
    document.cookie='theme='+next+';path=/;max-age='+60*60*24*365+';samesite=strict';
    if(next==='dark'){
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    window.dispatchEvent(new CustomEvent('theme-changed',{detail:{theme:next}}));
  };

  window.getTheme=function(){
    return document.documentElement.classList.contains('dark')?'dark':'light';
  };
})();
`

// FLIP animation engine — observes #page-content and #server-page-body.
// Siblings that shift when items are added/removed/reordered get a spring tween.
const flipScript = `
(function(){
  var MOVE_MS = 420;
  var EASE    = 'cubic-bezier(0.34, 1.56, 0.64, 1)'; // spring overshoot feel
  var animating = new WeakSet();

  var SKIP_TAGS  = new Set(['CANVAS','SVG','IMG','BUTTON','INPUT','SELECT','SCRIPT','STYLE','A']);
  var SKIP_FRAGS = ['mobile-top-bar','mobile-bottom-nav','mobile-more-sheet',
                    'animate-spin','nav-link','no-anim','collapsible-row'];
  var SKIP_IDS   = new Set(['pl-overlay','pl-bar','active-background']);

  function shouldSkip(el) {
    if (!el || el.nodeType !== 1) return true;
    if (SKIP_TAGS.has(el.tagName)) return true;
    var cls = el.className || '';
    for (var i = 0; i < SKIP_FRAGS.length; i++) {
      if (cls.indexOf(SKIP_FRAGS[i]) !== -1) return true;
    }
    if (SKIP_IDS.has(el.id)) return true;
    try { if (window.getComputedStyle(el).position === 'fixed') return true; } catch (_) {}
    return false;
  }

  function snapshot(parent) {
    if (!parent) return new Map();
    var m = new Map();
    // Snapshot all descendants, not just direct children, for richer coverage
    var els = parent.querySelectorAll(':scope > *');
    els.forEach(function(ch) {
      if (!shouldSkip(ch) && !animating.has(ch)) m.set(ch, ch.getBoundingClientRect());
    });
    return m;
  }

  function flip(snap) {
    snap.forEach(function(first, el) {
      if (animating.has(el)) return;
      var last = el.getBoundingClientRect();
      var dy = first.top - last.top;
      var dx = first.left - last.left;
      var dw = first.width - last.width;
      var dh = first.height - last.height;
      if (Math.abs(dy) < 1.5 && Math.abs(dx) < 1.5 && Math.abs(dw) < 2 && Math.abs(dh) < 2) return;

      animating.add(el);

      // Scale AND translate for a more dynamic feel
      var scaleX = last.width  > 0 ? first.width  / last.width  : 1;
      var scaleY = last.height > 0 ? first.height / last.height : 1;
      var fromTransform = 'translate(' + dx + 'px,' + dy + 'px) scale(' + scaleX + ',' + scaleY + ')';

      el.animate(
        [
          { transform: fromTransform, opacity: 0.85 },
          { transform: 'translate(0,0) scale(1)', opacity: 1 }
        ],
        { duration: MOVE_MS, easing: EASE, fill: 'both' }
      ).finished
        .then(function() { animating.delete(el); })
        .catch(function() { animating.delete(el); });
    });
  }

  var pendingFlips = new Map(); // target -> snap, deduplicated per frame

  function scheduleFlip(target) {
    if (!target || target.nodeType !== 1) return;
    if (!pendingFlips.has(target)) {
      pendingFlips.set(target, snapshot(target));
      requestAnimationFrame(function() {
        var snap = pendingFlips.get(target);
        pendingFlips.delete(target);
        if (snap) flip(snap);
      });
    }
  }

  var mo = new MutationObserver(function(mutations) {
    mutations.forEach(function(m) {
      if (m.type === 'childList') scheduleFlip(m.target);
      if (m.type === 'attributes') {
        var el = m.target;
        if (!shouldSkip(el) && !(el.closest && el.closest('.no-anim'))) {
          scheduleFlip(el.parentElement);
        }
      }
    });
  });

  var OBS = { childList: true, subtree: true, attributes: true,
               attributeFilter: ['class', 'style', 'hidden'] };

  function attach() {
    var pc  = document.getElementById('page-content');
    var spb = document.getElementById('server-page-body');
    if (pc)  mo.observe(pc,  OBS);
    if (spb) mo.observe(spb, OBS);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attach);
  } else {
    attach();
  }

  document.addEventListener('al:navigated', function() { setTimeout(attach, 60); });

  // Public helpers for imperative animations elsewhere
  window.airlinkAnimate = function(el, opts) {
    if (!el || el.nodeType !== 1) return;
    el.animate(
      [
        { opacity: 0, transform: 'translateY(10px) scale(0.97)' },
        { opacity: 1, transform: 'translateY(0)   scale(1)' }
      ],
      {
        duration: (opts && opts.duration) || 300,
        delay:    (opts && opts.delay)    || 0,
        easing:   'cubic-bezier(0.34, 1.56, 0.64, 1)',
        fill:     'backwards'
      }
    );
  };

  window.airlinkAnimateChildren = function(c, opts) {
    if (!c || c.nodeType !== 1) return;
    var base    = (opts && opts.baseDelay) || 0;
    var stagger = (opts && opts.stagger)   || 45;
    Array.from(c.children).forEach(function(ch, i) {
      window.airlinkAnimate(ch, {
        duration: (opts && opts.duration) || 300,
        delay:    base + i * stagger
      });
    });
  };
})();
`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://api.fontshare.com/v2/css?f[]=general-sans@500,300,600,400,700&display=swap"
          rel="stylesheet"
        />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        className="bg-neutral-50 dark:bg-[#141414] h-full text-neutral-800 dark:text-white"
        style={{ fontFamily: "'General Sans', system-ui, sans-serif" }}
      >
        {children}
        <script dangerouslySetInnerHTML={{ __html: flipScript }} />
      </body>
    </html>
  )
}
