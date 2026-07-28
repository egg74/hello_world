/*
 * exercises.js — the exercise library and the exercise editor.
 * The editor is where the "how do I do this?" demo gets attached, via the
 * demo picker: search the web, paste a link, upload a file, or generate an
 * animation locally.
 */
(function (global) {
  'use strict';

  var el = UI.el;
  var filter = { text: '', category: 'All' };

  function categories() {
    var set = {};
    Store.exercises().forEach(function (e) { if (e.category) set[e.category] = true; });
    return ['All'].concat(Object.keys(set).sort());
  }

  function matches(ex) {
    if (filter.category !== 'All' && ex.category !== filter.category) return false;
    if (!filter.text) return true;
    var hay = (ex.name + ' ' + ex.muscles + ' ' + ex.equipment + ' ' + ex.notes).toLowerCase();
    return hay.indexOf(filter.text.toLowerCase()) !== -1;
  }

  function render(root) {
    UI.clear(root);

    var list = el('div.grid');

    var search = el('input.input', {
      type: 'search', placeholder: 'Search exercises…', value: filter.text,
      oninput: function (e) { filter.text = e.target.value; paint(); }
    });

    var cats = el('div.chips');
    function paintChips() {
      UI.clear(cats);
      categories().forEach(function (c) {
        cats.appendChild(el('button.chip' + (filter.category === c ? '.chip-on' : ''), {
          type: 'button', text: c,
          onclick: function () { filter.category = c; paint(); }
        }));
      });
    }

    root.appendChild(el('div.page-head', [
      el('div', [
        el('h1', { text: 'Exercises' }),
        el('p.sub', { text: 'Your library. Every exercise can carry a video, GIF or generated animation.' })
      ]),
      el('button.btn.btn-primary', {
        type: 'button', onclick: function () { edit(null); }
      }, [UI.icon('plus'), 'New exercise'])
    ]));
    root.appendChild(el('div.toolbar', [search, cats]));
    root.appendChild(list);

    function paint() {
      paintChips();
      UI.clear(list);
      var items = Store.exercises().filter(matches);
      if (!items.length) {
        list.appendChild(UI.empty(
          'Nothing here yet',
          Store.exercises().length ? 'No exercise matches that filter.' : 'Add your first exercise to get started.',
          el('button.btn.btn-primary', { type: 'button', text: 'New exercise', onclick: function () { edit(null); } })
        ));
        return;
      }
      items.forEach(function (ex) { list.appendChild(card(ex)); });
    }

    paint();
    root._repaint = paint;
  }

  function card(ex) {
    var thumb = el('div.card-thumb');
    var preset = Media.presetFor(ex);
    var media = ex.media || {};
    var isAnim = !media.type || media.type === 'animation';

    if (isAnim) {
      var canvas = el('canvas.anim-canvas');
      thumb.appendChild(canvas);
      requestAnimationFrame(function () { Anim.thumbnail(canvas, preset, 0.45); });
    } else {
      var node = Media.render(ex, { autoplay: false });
      thumb.appendChild(node);
    }

    var node = el('article.card', [
      thumb,
      el('div.card-body', [
        el('h3', { text: ex.name }),
        el('p.card-meta', { text: [ex.category, ex.muscles].filter(Boolean).join(' · ') }),
        el('p.card-media', { text: Media.describe(ex) }),
        el('p.card-default', {
          text: ex.defaultMode === 'time'
            ? ex.defaultSets + ' × ' + ex.defaultSeconds + 's'
            : ex.defaultSets + ' × ' + ex.defaultReps + ' reps'
        })
      ]),
      el('div.card-actions', [
        el('button.btn.btn-ghost.btn-sm', { type: 'button', text: 'Demo', onclick: function () { preview(ex); } }),
        el('button.icon-btn', { type: 'button', 'aria-label': 'Edit', onclick: function () { edit(ex); } }, UI.icon('edit')),
        el('button.icon-btn.danger', {
          type: 'button', 'aria-label': 'Delete',
          onclick: function () {
            UI.confirmDialog('Delete "' + ex.name + '"? It will also be removed from any routines.', function () {
              Store.deleteExercise(ex.id);
              App.refresh();
              UI.toast('Exercise deleted');
            });
          }
        }, UI.icon('trash'))
      ])
    ]);
    return node;
  }

  /* Big demo view for a single exercise. */
  function preview(ex) {
    var media = Media.render(ex, { large: true, autoplay: true });
    var body = el('div', [
      media,
      el('p.demo-caption', { text: Media.describe(ex) }),
      (!ex.media || ex.media.type === 'animation')
        ? el('p.demo-cue', { text: Anim.get(Media.presetFor(ex)).cue })
        : null,
      ex.notes ? el('p.demo-notes', { text: ex.notes }) : null,
      el('dl.spec', [
        el('div', [el('dt', { text: 'Category' }), el('dd', { text: ex.category || '—' })]),
        el('div', [el('dt', { text: 'Muscles' }), el('dd', { text: ex.muscles || '—' })]),
        el('div', [el('dt', { text: 'Equipment' }), el('dd', { text: ex.equipment || '—' })])
      ])
    ]);
    var footer = el('div.row-end', [
      el('button.btn.btn-ghost', { type: 'button', text: 'Edit', onclick: function () { m.close(); edit(ex); } })
    ]);
    var m = UI.modal(ex.name, body, footer);
  }

  /* -------------------------------------------------------------- the editor */

  function edit(existing) {
    var ex = existing
      ? JSON.parse(JSON.stringify(existing))
      : Store.blankExercise();
    if (!ex.media) ex.media = { type: 'animation', preset: 'auto', tempo: 2.4, url: '', dataUrl: '', title: '' };

    var nameInput = el('input.input', {
      type: 'text', placeholder: 'e.g. Bulgarian split squat', value: ex.name,
      oninput: function (e) {
        ex.name = e.target.value;
        onNameChanged();
      }
    });

    var form = el('div.form', [
      UI.field('Exercise name', nameInput),
      el('div.form-row', [
        UI.field('Category', el('input.input', {
          type: 'text', list: 'category-list', value: ex.category,
          oninput: function (e) { ex.category = e.target.value; }
        })),
        UI.field('Equipment', el('input.input', {
          type: 'text', placeholder: 'None, dumbbells…', value: ex.equipment,
          oninput: function (e) { ex.equipment = e.target.value; }
        }))
      ]),
      UI.field('Muscles worked', el('input.input', {
        type: 'text', placeholder: 'Quads, glutes…', value: ex.muscles,
        oninput: function (e) { ex.muscles = e.target.value; }
      })),
      UI.field('Notes / form cues', el('textarea.input', {
        rows: 2, placeholder: 'Anything you want reminding of mid-set.',
        oninput: function (e) { ex.notes = e.target.value; }
      }, ex.notes)),
      el('div.form-row', [
        UI.field('Default tracking', UI.select(
          [{ value: 'reps', label: 'Reps' }, { value: 'time', label: 'Time' }],
          ex.defaultMode,
          function (e) { ex.defaultMode = e.target.value; paintDefaults(); }
        )),
        el('div.form-slot')
      ])
    ]);

    var defaults = el('div.form-row');
    function paintDefaults() {
      UI.clear(defaults);
      defaults.appendChild(UI.field('Sets', el('input.input', {
        type: 'number', min: 1, max: 20, value: ex.defaultSets,
        oninput: function (e) { ex.defaultSets = Math.max(1, +e.target.value || 1); }
      })));
      if (ex.defaultMode === 'time') {
        defaults.appendChild(UI.field('Seconds', el('input.input', {
          type: 'number', min: 5, max: 600, step: 5, value: ex.defaultSeconds,
          oninput: function (e) { ex.defaultSeconds = Math.max(5, +e.target.value || 5); }
        })));
      } else {
        defaults.appendChild(UI.field('Reps', el('input.input', {
          type: 'number', min: 1, max: 200, value: ex.defaultReps,
          oninput: function (e) { ex.defaultReps = Math.max(1, +e.target.value || 1); }
        })));
      }
      defaults.appendChild(UI.field('Rest (s)', el('input.input', {
        type: 'number', min: 0, max: 600, step: 5, value: ex.defaultRest,
        oninput: function (e) { ex.defaultRest = Math.max(0, +e.target.value || 0); }
      })));
    }
    paintDefaults();
    form.appendChild(defaults);

    var demo = demoPicker(ex, function () { /* name changes repaint search links */ });
    form.appendChild(demo.node);

    function onNameChanged() { demo.nameChanged(); }

    var footer = el('div.row-end', [
      el('button.btn.btn-ghost', { type: 'button', text: 'Cancel', onclick: function () { m.close(); } }),
      el('button.btn.btn-primary', {
        type: 'button', text: existing ? 'Save changes' : 'Add exercise',
        onclick: function () {
          if (!ex.name.trim()) {
            nameInput.focus();
            UI.toast('Give the exercise a name first');
            return;
          }
          Store.saveExercise(ex);
          m.close();
          App.refresh();
          UI.toast(existing ? 'Exercise updated' : 'Exercise added');
        }
      })
    ]);

    var m = UI.modal(existing ? 'Edit exercise' : 'New exercise', form, footer);
    setTimeout(function () { nameInput.focus(); }, 30);
  }

  /* ---------------------------------------------------------- demo picker */

  /* The headline feature: four ways to answer "how do I do this exercise?" */
  function demoPicker(ex, onchange) {
    var media = ex.media;
    var tabsWrap = el('div.tabs');
    var panel = el('div.tab-panel');
    var previewWrap = el('div.demo-preview');

    var TABS = [
      { key: 'animation', label: 'Generate animation' },
      { key: 'search', label: 'Search the web' },
      { key: 'link', label: 'Paste a link' },
      { key: 'upload', label: 'Upload a file' }
    ];
    // "search" is a way of getting to a link, so an exercise saved with a URL
    // reopens on the link tab.
    var active = media.type === 'upload' ? 'upload' : (media.type === 'link' ? 'link' : 'animation');

    function setActive(key) {
      active = key;
      paintTabs();
      paintPanel();
    }

    function paintTabs() {
      UI.clear(tabsWrap);
      TABS.forEach(function (t) {
        tabsWrap.appendChild(el('button.tab' + (active === t.key ? '.tab-on' : ''), {
          type: 'button', text: t.label,
          onclick: function () { setActive(t.key); }
        }));
      });
    }

    function refreshPreview() {
      Media.stop(previewWrap);
      UI.clear(previewWrap);
      previewWrap.appendChild(Media.render(ex, { autoplay: true }));
      previewWrap.appendChild(el('p.demo-caption', { text: Media.describe(ex) }));
    }

    function paintPanel() {
      UI.clear(panel);
      if (active === 'animation') panel.appendChild(animationPanel());
      else if (active === 'search') panel.appendChild(searchPanel());
      else if (active === 'link') panel.appendChild(linkPanel());
      else panel.appendChild(uploadPanel());
    }

    /* 1. Generate — build the demo locally with the stick-figure engine. */
    function animationPanel() {
      var detected = Anim.detect(ex.name);
      var presetOptions = [{ value: 'auto', label: 'Auto-detect from name (' + Anim.get(detected).label + ')' }]
        .concat(Anim.list().map(function (m) { return { value: m.key, label: m.label }; }));

      var presetSelect = UI.select(presetOptions, media.preset || 'auto', function (e) {
        media.type = 'animation';
        media.preset = e.target.value;
        refreshPreview();
        updateCue();
      });

      var tempo = el('input.range', {
        type: 'range', min: 0.8, max: 5, step: 0.2, value: media.tempo || 2.4,
        oninput: function (e) {
          media.tempo = +e.target.value;
          tempoLabel.textContent = (+e.target.value).toFixed(1) + 's per rep';
          if (previewWrap.querySelector('.media') && previewWrap.querySelector('.media')._player) {
            previewWrap.querySelector('.media')._player.setTempo(media.tempo);
          }
        }
      });
      var tempoLabel = el('span.field-hint', { text: (media.tempo || 2.4).toFixed(1) + 's per rep' });
      var cue = el('p.demo-cue');
      function updateCue() {
        cue.textContent = Anim.get(media.preset && media.preset !== 'auto' ? media.preset : Anim.detect(ex.name)).cue;
      }
      updateCue();

      media.type = 'animation';
      refreshPreview();

      return el('div', [
        el('p.panel-note', { text: 'The app draws the movement itself — no internet, no account, nothing to download. It picks a motion from the exercise name, and you can override it.' }),
        UI.field('Motion', presetSelect),
        UI.field('Tempo', el('div', [tempo, tempoLabel])),
        cue
      ]);
    }

    /* 2. Search — open a prefilled query on the sites worth searching. */
    function searchPanel() {
      var name = ex.name.trim();
      var links = el('div.search-links');
      function paintLinks() {
        UI.clear(links);
        if (!name) {
          links.appendChild(el('p.panel-note', { text: 'Type an exercise name above and the search links will appear here.' }));
          return;
        }
        Media.searchLinks(name).forEach(function (l) {
          links.appendChild(el('a.search-link', { href: l.url, target: '_blank', rel: 'noopener noreferrer' }, [
            UI.icon('search'),
            el('span', [el('strong', { text: l.label }), el('small', { text: l.hint })])
          ]));
        });
      }
      paintLinks();

      var paste = el('input.input', {
        type: 'url', placeholder: 'Paste the video or GIF address here',
        value: media.type === 'link' ? media.url : '',
        oninput: function (e) {
          media.type = 'link';
          media.url = e.target.value.trim();
          refreshPreview();
        }
      });

      return el('div', [
        el('p.panel-note', { text: 'Opens a new tab with the search already filled in. When you find one you like, copy its address and paste it below — for a GIF, right-click the image and choose "Copy image address".' }),
        links,
        UI.field('Found one? Paste it here', paste)
      ]);
    }

    /* 3. Link — YouTube, Vimeo, a direct GIF or an MP4. */
    function linkPanel() {
      var input = el('input.input', {
        type: 'url', placeholder: 'https://…',
        value: media.type === 'link' ? media.url : '',
        oninput: function (e) {
          media.type = 'link';
          media.url = e.target.value.trim();
          kind.textContent = describeUrl(media.url);
          refreshPreview();
        }
      });
      var kind = el('span.field-hint', { text: describeUrl(media.type === 'link' ? media.url : '') });
      if (media.type === 'link') refreshPreview();
      return el('div', [
        el('p.panel-note', { text: 'Works with YouTube and Vimeo links, GIPHY links, and direct .gif / .mp4 / .webm addresses.' }),
        UI.field('Demo URL', input),
        kind
      ]);
    }

    function describeUrl(url) {
      if (!url) return 'Nothing pasted yet.';
      var info = Media.classify(url);
      return {
        youtube: 'Recognised as a YouTube video — it will embed.',
        vimeo: 'Recognised as a Vimeo video — it will embed.',
        image: 'Recognised as an image or GIF — it will loop.',
        video: 'Recognised as a video file — it will loop, muted.',
        link: 'Not embeddable, so it will show as a link you can open.'
      }[info.kind] || 'Nothing pasted yet.';
    }

    /* 4. Upload — keep a small GIF/MP4 with the exercise. */
    function uploadPanel() {
      var status = el('p.field-hint', {
        text: media.type === 'upload' && media.dataUrl ? 'Stored: ' + (media.title || 'file') : 'No file chosen.'
      });
      var input = el('input.input', {
        type: 'file', accept: 'image/gif,image/*,video/mp4,video/webm',
        onchange: function (e) {
          var file = e.target.files && e.target.files[0];
          if (!file) return;
          // Browser storage is ~5MB total, so keep uploads well under that.
          if (file.size > 2 * 1024 * 1024) {
            status.textContent = 'That file is ' + Math.round(file.size / 1024 / 1024 * 10) / 10 +
              'MB. Please keep uploads under 2MB, or paste a link instead.';
            e.target.value = '';
            return;
          }
          var reader = new FileReader();
          reader.onload = function () {
            media.type = 'upload';
            media.dataUrl = reader.result;
            media.title = file.name;
            status.textContent = 'Stored: ' + file.name;
            refreshPreview();
          };
          reader.readAsDataURL(file);
        }
      });
      if (media.type === 'upload') refreshPreview();
      return el('div', [
        el('p.panel-note', { text: 'Kept inside this browser only. Best for short GIFs — anything over about 2MB will not fit in browser storage.' }),
        UI.field('Choose a GIF or video', input),
        status
      ]);
    }

    paintTabs();
    paintPanel();

    return {
      node: el('section.demo-picker', [
        el('div.demo-head', [
          el('h3', { text: 'How to do it' }),
          el('span.badge', { text: 'demo' })
        ]),
        tabsWrap,
        panel,
        previewWrap
      ]),
      nameChanged: function () {
        if (active === 'search') paintPanel();
        if (active === 'animation' && (!media.preset || media.preset === 'auto')) {
          paintPanel();
        }
      }
    };
  }

  global.Exercises = { render: render, edit: edit, preview: preview, card: card };
})(window);
