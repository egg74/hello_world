/*
 * player.js — runs a routine: one step at a time, with the demo playing beside
 * the timer so you can check your form mid-set.
 */
(function (global) {
  'use strict';

  var el = UI.el;
  var session = null;

  /* Flatten a routine into the sequence actually performed:
   * work, rest, work, rest… with the trailing rest dropped. */
  function buildSteps(routine) {
    var steps = [];
    routine.items.forEach(function (it, itemIndex) {
      var ex = Store.getExercise(it.exerciseId);
      if (!ex) return;
      for (var s = 1; s <= it.sets; s++) {
        steps.push({
          type: 'work',
          exercise: ex,
          item: it,
          set: s,
          sets: it.sets,
          seconds: it.mode === 'time' ? it.seconds : null,
          label: it.mode === 'time' ? it.seconds + ' seconds' : it.reps + ' reps',
          itemIndex: itemIndex
        });
        if (it.rest > 0) {
          steps.push({ type: 'rest', seconds: it.rest, exercise: ex, item: it, set: s, sets: it.sets });
        }
      }
    });
    while (steps.length && steps[steps.length - 1].type === 'rest') steps.pop();
    return steps;
  }

  function start(routine) {
    var steps = buildSteps(routine);
    if (!steps.length) { UI.toast('This routine has no exercises yet'); return; }

    session = {
      routine: routine,
      steps: steps,
      index: 0,
      startedAt: Date.now(),
      remaining: 0,
      running: true,
      tick: null,
      completedWork: 0,
      totalWork: steps.filter(function (s) { return s.type === 'work'; }).length
    };

    var overlay = el('div.player-overlay');
    document.body.appendChild(overlay);
    document.body.classList.add('no-scroll');
    session.overlay = overlay;

    paint();
    session.tick = setInterval(onTick, 250);
    document.addEventListener('keydown', onKey);
  }

  function onKey(e) {
    if (!session) return;
    if (e.key === 'Escape') quit();
    else if (e.key === ' ') { e.preventDefault(); togglePause(); }
    else if (e.key === 'ArrowRight') next();
    else if (e.key === 'ArrowLeft') prev();
  }

  function currentStep() { return session.steps[session.index]; }

  function onTick() {
    if (!session || !session.running) return;
    var step = currentStep();
    if (!step || !step.seconds) return;
    session.remaining -= 0.25;
    if (session.remaining <= 0) {
      beep(step.type === 'rest' ? 660 : 440);
      next();
      return;
    }
    var t = session.overlay.querySelector('.timer-value');
    if (t) t.textContent = UI.clock(session.remaining);
    var ring = session.overlay.querySelector('.ring-progress');
    if (ring) {
      var frac = 1 - session.remaining / step.seconds;
      ring.style.strokeDashoffset = String(Math.max(0, 314 * (1 - frac)));
    }
    // Count down the last three seconds out loud-ish.
    if (Math.abs(session.remaining - Math.round(session.remaining)) < 0.13 &&
        session.remaining <= 3.1 && session.remaining > 0.4) {
      beep(880, 0.06, 0.05);
    }
  }

  function next() {
    if (!session) return;
    if (currentStep() && currentStep().type === 'work') session.completedWork++;
    if (session.index >= session.steps.length - 1) { finish(); return; }
    session.index++;
    paint();
  }

  function prev() {
    if (!session || session.index === 0) return;
    session.index--;
    if (currentStep().type === 'work' && session.completedWork > 0) session.completedWork--;
    paint();
  }

  function togglePause() {
    if (!session) return;
    session.running = !session.running;
    var btn = session.overlay.querySelector('.pause-btn');
    if (btn) btn.textContent = session.running ? 'Pause' : 'Resume';
    var media = session.overlay.querySelector('.media');
    if (media && media._player) media._player.paused = !session.running;
  }

  function paint() {
    var overlay = session.overlay;
    Media.stop(overlay);
    UI.clear(overlay);

    var step = currentStep();
    session.remaining = step.seconds || 0;

    var upcoming = session.steps.slice(session.index + 1)
      .filter(function (s) { return s.type === 'work'; })[0];
    // "Next: <same exercise>" is noise — only call it out when the exercise
    // actually changes.
    var nextIsNewExercise = upcoming && upcoming.exercise.id !== step.exercise.id;

    var progress = session.completedWork / session.totalWork;

    var head = el('header.player-head', [
      el('div', [
        el('p.player-routine', { text: session.routine.name }),
        el('p.player-progress-text', {
          text: Math.min(session.completedWork + 1, session.totalWork) + ' of ' + session.totalWork + ' sets overall'
        })
      ]),
      el('button.icon-btn', { type: 'button', 'aria-label': 'Close workout', onclick: quit }, UI.icon('close'))
    ]);

    var bar = el('div.player-bar', [el('div.player-bar-fill')]);
    bar.firstChild.style.width = (progress * 100).toFixed(1) + '%';

    var stage;
    if (step.type === 'rest') {
      stage = el('div.player-stage.rest-stage', [
        el('p.rest-label', { text: 'Rest' }),
        timerRing(step.seconds),
        upcoming
          ? el('p.next-up', { text: 'Next: ' + upcoming.exercise.name + ' · ' + upcoming.label })
          : el('p.next-up', { text: 'Last one done — nearly there.' })
      ]);
    } else {
      var media = Media.render(step.exercise, { large: true, autoplay: true });
      stage = el('div.player-stage', [
        el('div.player-media', [media]),
        el('div.player-info', [
          el('h2', { text: step.exercise.name }),
          el('p.player-target', { text: step.label }),
          el('p.player-set', { text: 'Set ' + step.set + ' of ' + step.sets }),
          step.seconds ? timerRing(step.seconds) : el('button.btn.btn-primary.btn-lg', {
            type: 'button', text: 'Done — next', onclick: next
          }),
          step.exercise.notes ? el('p.player-notes', { text: step.exercise.notes }) : null,
          (!step.exercise.media || step.exercise.media.type === 'animation')
            ? el('p.demo-cue', { text: Anim.get(Media.presetFor(step.exercise)).cue })
            : null,
          nextIsNewExercise
            ? el('p.next-up', { text: 'Next: ' + upcoming.exercise.name })
            : (upcoming ? el('p.next-up', { text: 'Then set ' + (step.set + 1) + ' of ' + step.sets }) : null)
        ])
      ]);
    }

    var controls = el('div.player-controls', [
      el('button.btn.btn-ghost', { type: 'button', text: 'Back', disabled: session.index === 0, onclick: prev }),
      el('button.btn.btn-ghost.pause-btn', { type: 'button', text: session.running ? 'Pause' : 'Resume', onclick: togglePause }),
      el('button.btn.btn-primary', { type: 'button', text: step.type === 'rest' ? 'Skip rest' : 'Next', onclick: next })
    ]);

    overlay.appendChild(el('div.player-inner', [head, bar, stage, controls,
      el('p.player-hint', { text: 'Space pauses · arrow keys move · Esc ends the workout' })]));
  }

  function timerRing(seconds) {
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 120 120');
    svg.setAttribute('class', 'ring');
    function circle(cls) {
      var c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      c.setAttribute('cx', '60'); c.setAttribute('cy', '60'); c.setAttribute('r', '50');
      c.setAttribute('class', cls);
      return c;
    }
    var track = circle('ring-track');
    var prog = circle('ring-progress');
    prog.setAttribute('stroke-dasharray', '314');
    prog.setAttribute('stroke-dashoffset', '314');
    svg.appendChild(track);
    svg.appendChild(prog);
    return el('div.timer', [svg, el('span.timer-value', { text: UI.clock(seconds) })]);
  }

  function finish() {
    if (!session) return;
    var elapsed = Math.round((Date.now() - session.startedAt) / 1000);
    Store.logSession({
      routineId: session.routine.id,
      routineName: session.routine.name,
      seconds: elapsed,
      completed: session.completedWork,
      total: session.totalWork
    });
    var routineName = session.routine.name;
    teardown();
    App.refresh();
    var footer = el('div.row-end', [
      el('button.btn.btn-primary', { type: 'button', text: 'Done', onclick: function () { doneModal.close(); } })
    ]);
    var doneModal = UI.modal('Workout complete', el('div.done', [
      el('p.done-big', { text: 'Nice work.' }),
      el('p', { text: routineName + ' · ' + UI.fmtDuration(elapsed) }),
      el('p.sub', { text: 'Logged to your history.' })
    ]), footer);
    beep(880, 0.25, 0.12);
  }

  function quit() {
    if (!session) return;
    var done = session.completedWork;
    var elapsed = Math.round((Date.now() - session.startedAt) / 1000);
    var name = session.routine.name;
    var id = session.routine.id;
    var total = session.totalWork;
    teardown();
    if (done > 0) {
      Store.logSession({ routineId: id, routineName: name, seconds: elapsed, completed: done, total: total });
      App.refresh();
      UI.toast('Workout saved — ' + done + ' of ' + total + ' sets');
    }
  }

  function teardown() {
    if (!session) return;
    clearInterval(session.tick);
    document.removeEventListener('keydown', onKey);
    Media.stop(session.overlay);
    session.overlay.remove();
    document.body.classList.remove('no-scroll');
    session = null;
  }

  /* A short tone for the end of a timed set. Uses WebAudio so there is no
   * audio file to ship; silently does nothing if the browser blocks it. */
  var audioCtx = null;
  function beep(freq, duration, volume) {
    try {
      if (!audioCtx) audioCtx = new (global.AudioContext || global.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      var osc = audioCtx.createOscillator();
      var gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq || 660;
      gain.gain.value = volume === undefined ? 0.1 : volume;
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      var now = audioCtx.currentTime;
      var dur = duration || 0.15;
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
      osc.start(now);
      osc.stop(now + dur);
    } catch (e) { /* audio is a nicety, never a blocker */ }
  }

  global.Player = { start: start, buildSteps: buildSteps };
})(window);
