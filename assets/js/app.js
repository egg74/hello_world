/* app.js — shell, routing, home dashboard, history and settings. */
(function (global) {
  'use strict';

  var el = UI.el;
  var root, current = 'home';

  var VIEWS = [
    { key: 'home', label: 'Home', icon: 'home' },
    { key: 'routines', label: 'Routines', icon: 'list' },
    { key: 'exercises', label: 'Exercises', icon: 'dumbbell' },
    { key: 'history', label: 'History', icon: 'chart' }
  ];

  function go(view) {
    current = view;
    if (global.location.hash !== '#' + view) global.location.hash = view;
    paintNav();
    render();
  }

  function paintNav() {
    var nav = document.getElementById('nav');
    UI.clear(nav);
    VIEWS.forEach(function (v) {
      nav.appendChild(el('button.nav-btn' + (current === v.key ? '.nav-on' : ''), {
        type: 'button', onclick: function () { go(v.key); }
      }, [UI.icon(v.icon), el('span', { text: v.label })]));
    });
  }

  function render() {
    Media.stop(root);
    if (current === 'exercises') Exercises.render(root);
    else if (current === 'routines') Routines.render(root);
    else if (current === 'history') history(root);
    else home(root);
    root.scrollTop = 0;
  }

  function refresh() { render(); }

  /* ------------------------------------------------------------------ home */

  function home(node) {
    UI.clear(node);

    var hist = Store.history();
    var routines = Store.routines();
    var thisWeek = hist.filter(function (h) { return Date.now() - h.finishedAt < 7 * 864e5; });
    var weekSeconds = thisWeek.reduce(function (a, h) { return a + h.seconds; }, 0);

    node.appendChild(el('div.hero', [
      el('div.hero-text', [
        el('p.eyebrow', { text: 'FitForge' }),
        el('h1', { text: greeting() }),
        el('p.sub', { text: 'Build a routine, then follow it rep by rep — with a demonstration for every exercise.' }),
        el('div.hero-actions', [
          routines.length
            ? el('button.btn.btn-primary.btn-lg', {
                type: 'button', onclick: function () { Player.start(routines[0]); }
              }, [UI.icon('play'), 'Start ' + routines[0].name])
            : el('button.btn.btn-primary.btn-lg', { type: 'button', text: 'Build your first routine', onclick: function () { Routines.edit(null); } }),
          el('button.btn.btn-ghost.btn-lg', { type: 'button', text: 'New exercise', onclick: function () { Exercises.edit(null); } })
        ])
      ]),
      heroAnimation()
    ]));

    node.appendChild(el('div.stats', [
      stat(String(Store.exercises().length), 'exercises'),
      stat(String(routines.length), 'routines'),
      stat(String(thisWeek.length), 'workouts this week'),
      stat(UI.fmtDuration(weekSeconds), 'trained this week')
    ]));

    node.appendChild(el('h2.section-title', { text: 'Your routines' }));
    var list = el('div.routine-list');
    if (!routines.length) {
      list.appendChild(UI.empty('No routines yet', 'Group your exercises into a routine you can follow start to finish.',
        el('button.btn.btn-primary', { type: 'button', text: 'New routine', onclick: function () { Routines.edit(null); } })));
    } else {
      routines.slice(0, 3).forEach(function (r) {
        list.appendChild(el('article.routine-card', [
          el('div.routine-main', [
            el('h3', { text: r.name }),
            el('p.routine-meta', {
              text: r.items.length + ' exercises · about ' + UI.fmtDuration(Store.estimateSeconds(r))
            })
          ]),
          el('div.routine-actions', [
            el('button.btn.btn-primary', {
              type: 'button', disabled: !r.items.length, onclick: function () { Player.start(r); }
            }, [UI.icon('play'), 'Start'])
          ])
        ]));
      });
      if (routines.length > 3) {
        list.appendChild(el('button.btn.btn-ghost', { type: 'button', text: 'See all routines', onclick: function () { go('routines'); } }));
      }
    }
    node.appendChild(list);

    if (hist.length) {
      node.appendChild(el('h2.section-title', { text: 'Recent' }));
      var recent = el('div.history-list');
      hist.slice(0, 3).forEach(function (h) { recent.appendChild(historyRow(h)); });
      node.appendChild(recent);
    }
  }

  function greeting() {
    var h = new Date().getHours();
    if (h < 12) return 'Good morning — ready to train?';
    if (h < 18) return 'Good afternoon — ready to train?';
    return 'Good evening — ready to train?';
  }

  function stat(value, label) {
    return el('div.stat', [el('strong', { text: value }), el('span', { text: label })]);
  }

  /* The hero shows off the generated-animation feature, cycling through the
   * motions the app knows how to draw. */
  function heroAnimation() {
    var canvas = el('canvas.anim-canvas');
    var caption = el('p.hero-caption');
    var wrap = el('div.hero-anim', [canvas, caption]);
    var keys = Anim.list().filter(function (m) { return m.key !== 'generic'; });
    var i = Math.floor(Math.random() * keys.length);

    requestAnimationFrame(function () {
      var player = new Anim.Player(canvas, { motion: keys[i].key, tempo: 2.2 });
      wrap._player = player;
      caption.textContent = keys[i].label;
      player.start();
      var timer = setInterval(function () {
        if (!document.body.contains(canvas)) { clearInterval(timer); player.stop(); return; }
        i = (i + 1) % keys.length;
        player.setMotion(keys[i].key);
        caption.textContent = keys[i].label;
      }, 6000);
    });
    return wrap;
  }

  /* --------------------------------------------------------------- history */

  function history(node) {
    UI.clear(node);
    var hist = Store.history();

    node.appendChild(el('div.page-head', [
      el('div', [
        el('h1', { text: 'History' }),
        el('p.sub', { text: 'Every workout you have finished or partly finished.' })
      ]),
      hist.length ? el('button.btn.btn-ghost', {
        type: 'button', text: 'Clear history',
        onclick: function () {
          UI.confirmDialog('Delete your whole workout history?', function () {
            Store.clearHistory(); refresh(); UI.toast('History cleared');
          });
        }
      }) : null
    ]));

    if (!hist.length) {
      node.appendChild(UI.empty('No workouts logged yet', 'Finish a routine and it will show up here.'));
    } else {
      var total = hist.reduce(function (a, h) { return a + h.seconds; }, 0);
      node.appendChild(el('div.stats', [
        stat(String(hist.length), 'workouts'),
        stat(UI.fmtDuration(total), 'total time'),
        stat(UI.fmtDuration(total / hist.length), 'average')
      ]));
      var list = el('div.history-list');
      hist.forEach(function (h) { list.appendChild(historyRow(h)); });
      node.appendChild(list);
    }

    node.appendChild(el('h2.section-title', { text: 'Your data' }));
    node.appendChild(el('div.settings', [
      el('p.panel-note', { text: 'Everything is stored in this browser only. Export a copy to move it to another device or keep a backup.' }),
      el('div.row', [
        el('button.btn.btn-ghost', { type: 'button', text: 'Export JSON', onclick: exportData }),
        el('label.btn.btn-ghost', [
          'Import JSON',
          el('input', {
            type: 'file', accept: 'application/json,.json', hidden: 'hidden', onchange: importData
          })
        ]),
        el('button.btn.btn-danger', {
          type: 'button', text: 'Reset everything',
          onclick: function () {
            UI.confirmDialog('This deletes all your exercises, routines and history, and restores the starter set.', function () {
              Store.resetAll(); refresh(); UI.toast('Reset to the starter library');
            });
          }
        })
      ])
    ]));
  }

  function historyRow(h) {
    return el('div.history-row', [
      el('div', [
        el('strong', { text: h.routineName }),
        el('span.sub', { text: UI.fmtDate(h.finishedAt) })
      ]),
      el('div.history-right', [
        el('span.pill', { text: UI.fmtDuration(h.seconds) }),
        el('span.sub', { text: h.completed + '/' + h.total + ' sets' })
      ])
    ]);
  }

  function exportData() {
    var blob = new Blob([Store.exportJSON()], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = el('a', { href: url, download: 'fitforge-backup-' + new Date().toISOString().slice(0, 10) + '.json' });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    UI.toast('Backup downloaded');
  }

  function importData(e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        Store.importJSON(reader.result);
        refresh();
        UI.toast('Data imported');
      } catch (err) {
        UI.toast(err.message || 'That file could not be imported');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  /* ------------------------------------------------------------------ boot */

  function init() {
    root = document.getElementById('view');
    Store.load();

    var hash = (global.location.hash || '').replace('#', '');
    if (VIEWS.some(function (v) { return v.key === hash; })) current = hash;

    global.addEventListener('hashchange', function () {
      var h = (global.location.hash || '').replace('#', '') || 'home';
      if (h !== current && VIEWS.some(function (v) { return v.key === h; })) {
        current = h;
        paintNav();
        render();
      }
    });

    // Canvas sizing depends on layout, so redraw on resize.
    var resizeTimer;
    global.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(render, 200);
    });

    // Keep the exercise datalist in sync for the category input.
    Store.subscribe(paintCategoryList);
    paintCategoryList();

    paintNav();
    render();
  }

  function paintCategoryList() {
    var dl = document.getElementById('category-list');
    if (!dl) return;
    UI.clear(dl);
    var seen = {};
    ['Strength', 'Cardio', 'Core', 'Mobility'].concat(
      Store.exercises().map(function (e) { return e.category; })
    ).forEach(function (c) {
      if (!c || seen[c]) return;
      seen[c] = true;
      dl.appendChild(el('option', { value: c }));
    });
  }

  global.App = { init: init, go: go, refresh: refresh };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);
