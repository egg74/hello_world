/*
 * routines.js — build an ordered routine out of exercises from the library.
 */
(function (global) {
  'use strict';

  var el = UI.el;

  function render(root) {
    UI.clear(root);

    root.appendChild(el('div.page-head', [
      el('div', [
        el('h1', { text: 'Routines' }),
        el('p.sub', { text: 'Order your exercises, set the sets, reps and rest, then press play.' })
      ]),
      el('button.btn.btn-primary', {
        type: 'button', onclick: function () { edit(null); }
      }, [UI.icon('plus'), 'New routine'])
    ]));

    var list = el('div.routine-list');
    root.appendChild(list);

    var routines = Store.routines();
    if (!routines.length) {
      list.appendChild(UI.empty('No routines yet', 'A routine is just a list of exercises in the order you want to do them.',
        el('button.btn.btn-primary', { type: 'button', text: 'New routine', onclick: function () { edit(null); } })));
      return;
    }

    routines.forEach(function (r) { list.appendChild(routineCard(r)); });
  }

  function routineCard(r) {
    var names = r.items.map(function (it) {
      var ex = Store.getExercise(it.exerciseId);
      return ex ? ex.name : null;
    }).filter(Boolean);

    var strip = el('div.routine-strip');
    r.items.slice(0, 6).forEach(function (it) {
      var ex = Store.getExercise(it.exerciseId);
      if (!ex) return;
      var c = el('canvas.strip-thumb');
      strip.appendChild(c);
      requestAnimationFrame(function () { Anim.thumbnail(c, Media.presetFor(ex), 0.45); });
    });

    return el('article.routine-card', [
      el('div.routine-main', [
        el('h3', { text: r.name }),
        r.description ? el('p.sub', { text: r.description }) : null,
        el('p.routine-meta', {
          text: r.items.length + ' exercise' + (r.items.length === 1 ? '' : 's') +
            ' · about ' + UI.fmtDuration(Store.estimateSeconds(r))
        }),
        el('p.routine-names', { text: names.join(' → ') || 'Empty routine' }),
        strip
      ]),
      el('div.routine-actions', [
        el('button.btn.btn-primary', {
          type: 'button', disabled: !r.items.length,
          onclick: function () { Player.start(r); }
        }, [UI.icon('play'), 'Start']),
        el('button.btn.btn-ghost.btn-sm', { type: 'button', text: 'Edit', onclick: function () { edit(r); } }),
        el('button.icon-btn.danger', {
          type: 'button', 'aria-label': 'Delete routine',
          onclick: function () {
            UI.confirmDialog('Delete the routine "' + r.name + '"?', function () {
              Store.deleteRoutine(r.id);
              App.refresh();
              UI.toast('Routine deleted');
            });
          }
        }, UI.icon('trash'))
      ])
    ]);
  }

  /* ------------------------------------------------------------ the editor */

  function edit(existing) {
    var r = existing ? JSON.parse(JSON.stringify(existing)) : Store.blankRoutine();

    var nameInput = el('input.input', {
      type: 'text', placeholder: 'e.g. Monday — Push', value: r.name,
      oninput: function (e) { r.name = e.target.value; }
    });

    var itemList = el('div.builder-list');
    var summary = el('p.builder-summary');

    function paint() {
      UI.clear(itemList);
      if (!r.items.length) {
        itemList.appendChild(el('p.panel-note', { text: 'No exercises yet — add some from the picker below.' }));
      }
      r.items.forEach(function (it, index) {
        itemList.appendChild(itemRow(it, index));
      });
      summary.textContent = r.items.length + ' exercise' + (r.items.length === 1 ? '' : 's') +
        ' · roughly ' + UI.fmtDuration(Store.estimateSeconds(r));
    }

    function itemRow(it, index) {
      var ex = Store.getExercise(it.exerciseId);
      if (!ex) return el('div');

      var thumb = el('canvas.row-thumb');
      requestAnimationFrame(function () { Anim.thumbnail(thumb, Media.presetFor(ex), 0.45); });

      var amount = it.mode === 'time'
        ? UI.field('Seconds', el('input.input.input-sm', {
            type: 'number', min: 5, max: 900, step: 5, value: it.seconds,
            oninput: function (e) { it.seconds = Math.max(5, +e.target.value || 5); paintSummary(); }
          }))
        : UI.field('Reps', el('input.input.input-sm', {
            type: 'number', min: 1, max: 200, value: it.reps,
            oninput: function (e) { it.reps = Math.max(1, +e.target.value || 1); paintSummary(); }
          }));

      return el('div.builder-item', [
        el('div.builder-order', [
          el('button.icon-btn', {
            type: 'button', 'aria-label': 'Move up', disabled: index === 0,
            onclick: function () { move(index, -1); }
          }, UI.icon('up')),
          el('span.order-num', { text: String(index + 1) }),
          el('button.icon-btn', {
            type: 'button', 'aria-label': 'Move down', disabled: index === r.items.length - 1,
            onclick: function () { move(index, 1); }
          }, UI.icon('down'))
        ]),
        thumb,
        el('div.builder-info', [
          el('strong', { text: ex.name }),
          el('span.sub', { text: Media.describe(ex) })
        ]),
        el('div.builder-fields', [
          UI.field('Sets', el('input.input.input-sm', {
            type: 'number', min: 1, max: 20, value: it.sets,
            oninput: function (e) { it.sets = Math.max(1, +e.target.value || 1); paintSummary(); }
          })),
          UI.field('Type', UI.select(
            [{ value: 'reps', label: 'Reps' }, { value: 'time', label: 'Time' }],
            it.mode,
            function (e) { it.mode = e.target.value; paint(); }
          )),
          amount,
          UI.field('Rest (s)', el('input.input.input-sm', {
            type: 'number', min: 0, max: 600, step: 5, value: it.rest,
            oninput: function (e) { it.rest = Math.max(0, +e.target.value || 0); paintSummary(); }
          }))
        ]),
        el('button.icon-btn.danger', {
          type: 'button', 'aria-label': 'Remove',
          onclick: function () { r.items.splice(index, 1); paint(); }
        }, UI.icon('trash'))
      ]);
    }

    function paintSummary() {
      summary.textContent = r.items.length + ' exercise' + (r.items.length === 1 ? '' : 's') +
        ' · roughly ' + UI.fmtDuration(Store.estimateSeconds(r));
    }

    function move(index, delta) {
      var target = index + delta;
      if (target < 0 || target >= r.items.length) return;
      var tmp = r.items[index];
      r.items[index] = r.items[target];
      r.items[target] = tmp;
      paint();
    }

    /* Picker: search the library and add with one tap. */
    var pickerResults = el('div.picker-results');
    var pickerSearch = el('input.input', {
      type: 'search', placeholder: 'Search your exercises to add…',
      oninput: function (e) { paintPicker(e.target.value); }
    });

    function paintPicker(query) {
      UI.clear(pickerResults);
      var q = (query || '').toLowerCase();
      var found = Store.exercises().filter(function (ex) {
        return !q || (ex.name + ' ' + ex.muscles + ' ' + ex.category).toLowerCase().indexOf(q) !== -1;
      });
      if (!found.length) {
        pickerResults.appendChild(el('p.panel-note', { text: 'No matching exercise. Create it in the Exercises tab first.' }));
        return;
      }
      found.forEach(function (ex) {
        pickerResults.appendChild(el('button.picker-item', {
          type: 'button',
          onclick: function () {
            r.items.push(Store.newItem(ex.id));
            paint();
            UI.toast(ex.name + ' added');
          }
        }, [
          UI.icon('plus'),
          el('span', [el('strong', { text: ex.name }), el('small', { text: ex.category || '' })])
        ]));
      });
    }

    paint();
    paintPicker('');

    var body = el('div.form', [
      UI.field('Routine name', nameInput),
      UI.field('Description', el('input.input', {
        type: 'text', placeholder: 'Optional', value: r.description,
        oninput: function (e) { r.description = e.target.value; }
      })),
      el('h3.section-title', { text: 'Exercises in order' }),
      summary,
      itemList,
      el('h3.section-title', { text: 'Add an exercise' }),
      pickerSearch,
      pickerResults
    ]);

    var footer = el('div.row-end', [
      el('button.btn.btn-ghost', { type: 'button', text: 'Cancel', onclick: function () { m.close(); } }),
      el('button.btn.btn-primary', {
        type: 'button', text: existing ? 'Save routine' : 'Create routine',
        onclick: function () {
          if (!r.name.trim()) { nameInput.focus(); UI.toast('Name the routine first'); return; }
          Store.saveRoutine(r);
          m.close();
          App.refresh();
          UI.toast(existing ? 'Routine saved' : 'Routine created');
        }
      })
    ]);

    var m = UI.modal(existing ? 'Edit routine' : 'New routine', body, footer);
    setTimeout(function () { nameInput.focus(); }, 30);
  }

  global.Routines = { render: render, edit: edit };
})(window);
