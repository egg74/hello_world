/*
 * store.js — persistence for exercises, routines and workout history.
 * Everything lives in localStorage; there is no server and nothing leaves the
 * browser. Export/import gives the user a way to move or back up their data.
 */
(function (global) {
  'use strict';

  var KEY = 'fitforge.v1';

  var DEFAULT_STATE = {
    exercises: [],
    routines: [],
    history: [],
    seeded: false
  };

  var state = null;
  var listeners = [];

  function uid(prefix) {
    return (prefix || 'id') + '_' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
  }

  function load() {
    if (state) return state;
    try {
      var raw = global.localStorage.getItem(KEY);
      state = raw ? JSON.parse(raw) : null;
    } catch (e) {
      state = null;
    }
    if (!state || typeof state !== 'object') state = JSON.parse(JSON.stringify(DEFAULT_STATE));
    Object.keys(DEFAULT_STATE).forEach(function (k) {
      if (state[k] === undefined) state[k] = JSON.parse(JSON.stringify(DEFAULT_STATE[k]));
    });
    if (!state.seeded && state.exercises.length === 0) {
      state.exercises = seedExercises();
      state.routines = seedRoutines(state.exercises);
      state.seeded = true;
      save();
    }
    return state;
  }

  function save() {
    try {
      global.localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      // Most likely the 5MB quota, which uploaded GIFs can eat quickly.
      global.alert('Could not save: browser storage is full. Try removing a large uploaded GIF or video from an exercise.');
      return false;
    }
    listeners.forEach(function (fn) { fn(state); });
    return true;
  }

  function subscribe(fn) { listeners.push(fn); }

  /* ------------------------------------------------------------- exercises */

  function exercises() { return load().exercises; }

  function getExercise(id) {
    return load().exercises.filter(function (e) { return e.id === id; })[0] || null;
  }

  function blankExercise() {
    return {
      id: null,
      name: '',
      category: 'Strength',
      muscles: '',
      equipment: '',
      notes: '',
      defaultMode: 'reps',
      defaultReps: 10,
      defaultSets: 3,
      defaultSeconds: 40,
      defaultRest: 60,
      media: { type: 'animation', preset: 'auto', tempo: 2.4, url: '', dataUrl: '', title: '' }
    };
  }

  function saveExercise(ex) {
    var st = load();
    if (!ex.id) {
      ex.id = uid('ex');
      ex.createdAt = Date.now();
      st.exercises.push(ex);
    } else {
      for (var i = 0; i < st.exercises.length; i++) {
        if (st.exercises[i].id === ex.id) { st.exercises[i] = ex; break; }
      }
    }
    save();
    return ex;
  }

  function deleteExercise(id) {
    var st = load();
    st.exercises = st.exercises.filter(function (e) { return e.id !== id; });
    st.routines.forEach(function (r) {
      r.items = r.items.filter(function (it) { return it.exerciseId !== id; });
    });
    save();
  }

  /* --------------------------------------------------------------- routines */

  function routines() { return load().routines; }

  function getRoutine(id) {
    return load().routines.filter(function (r) { return r.id === id; })[0] || null;
  }

  function blankRoutine() {
    return { id: null, name: '', description: '', items: [] };
  }

  function saveRoutine(r) {
    var st = load();
    if (!r.id) {
      r.id = uid('rt');
      r.createdAt = Date.now();
      st.routines.push(r);
    } else {
      for (var i = 0; i < st.routines.length; i++) {
        if (st.routines[i].id === r.id) { st.routines[i] = r; break; }
      }
    }
    save();
    return r;
  }

  function deleteRoutine(id) {
    var st = load();
    st.routines = st.routines.filter(function (r) { return r.id !== id; });
    save();
  }

  function newItem(exerciseId) {
    var ex = getExercise(exerciseId);
    return {
      uid: uid('it'),
      exerciseId: exerciseId,
      mode: ex ? ex.defaultMode : 'reps',
      sets: ex ? ex.defaultSets : 3,
      reps: ex ? ex.defaultReps : 10,
      seconds: ex ? ex.defaultSeconds : 40,
      rest: ex ? ex.defaultRest : 60
    };
  }

  /* Rough time estimate for a routine, in seconds. Rep-based sets are costed
   * at ~3.5s per rep, which is close enough for planning. */
  function estimateSeconds(routine) {
    var total = 0;
    routine.items.forEach(function (it) {
      var work = it.mode === 'time' ? it.seconds : it.reps * 3.5;
      total += it.sets * work + it.sets * it.rest;
    });
    return Math.round(total);
  }

  /* ---------------------------------------------------------------- history */

  function history() { return load().history; }

  function logSession(entry) {
    var st = load();
    st.history.unshift({
      id: uid('h'),
      routineId: entry.routineId,
      routineName: entry.routineName,
      finishedAt: Date.now(),
      seconds: entry.seconds,
      completed: entry.completed,
      total: entry.total
    });
    st.history = st.history.slice(0, 200);
    save();
  }

  function clearHistory() {
    load().history = [];
    save();
  }

  /* ------------------------------------------------------------ import/export */

  function exportJSON() {
    return JSON.stringify(load(), null, 2);
  }

  function importJSON(text) {
    var parsed = JSON.parse(text);
    if (!parsed || !Array.isArray(parsed.exercises) || !Array.isArray(parsed.routines)) {
      throw new Error('That file does not look like a FitForge backup.');
    }
    state = {
      exercises: parsed.exercises,
      routines: parsed.routines,
      history: Array.isArray(parsed.history) ? parsed.history : [],
      seeded: true
    };
    save();
  }

  function resetAll() {
    state = JSON.parse(JSON.stringify(DEFAULT_STATE));
    save();
    state = null;
    load();
  }

  /* ------------------------------------------------------------------ seed */

  function mk(name, category, muscles, equipment, mode, opts) {
    var e = blankExercise();
    e.id = uid('ex');
    e.createdAt = Date.now();
    e.name = name;
    e.category = category;
    e.muscles = muscles;
    e.equipment = equipment;
    e.defaultMode = mode;
    Object.keys(opts || {}).forEach(function (k) { e[k] = opts[k]; });
    return e;
  }

  function seedExercises() {
    return [
      mk('Bodyweight Squat', 'Strength', 'Quads, glutes', 'None', 'reps', { defaultReps: 15 }),
      mk('Push-up', 'Strength', 'Chest, triceps', 'None', 'reps', { defaultReps: 12 }),
      mk('Forward Lunge', 'Strength', 'Quads, glutes', 'None', 'reps', { defaultReps: 10 }),
      mk('Plank', 'Core', 'Core', 'None', 'time', { defaultSeconds: 45, defaultSets: 3 }),
      mk('Glute Bridge', 'Strength', 'Glutes, hamstrings', 'None', 'reps', { defaultReps: 15 }),
      mk('Jumping Jacks', 'Cardio', 'Full body', 'None', 'time', { defaultSeconds: 40, defaultSets: 2 }),
      mk('Mountain Climbers', 'Cardio', 'Core, shoulders', 'None', 'time', { defaultSeconds: 30, defaultSets: 3 }),
      mk('Crunch', 'Core', 'Abs', 'None', 'reps', { defaultReps: 20 }),
      mk('Dumbbell Biceps Curl', 'Strength', 'Biceps', 'Dumbbells', 'reps', { defaultReps: 12 }),
      mk('Overhead Press', 'Strength', 'Shoulders', 'Dumbbells', 'reps', { defaultReps: 10 }),
      mk('Bent-Over Row', 'Strength', 'Back, biceps', 'Dumbbells', 'reps', { defaultReps: 12 }),
      mk('Romanian Deadlift', 'Strength', 'Hamstrings, glutes', 'Barbell', 'reps', { defaultReps: 10 }),
      mk('Pull-up', 'Strength', 'Back, biceps', 'Bar', 'reps', { defaultReps: 6 }),
      mk('High Knees', 'Cardio', 'Legs, core', 'None', 'time', { defaultSeconds: 30, defaultSets: 3 }),
      mk('Burpee', 'Cardio', 'Full body', 'None', 'reps', { defaultReps: 10 }),
      mk('Standing Calf Raise', 'Strength', 'Calves', 'None', 'reps', { defaultReps: 20 }),
      mk('Full Body Stretch', 'Mobility', 'Full body', 'None', 'time', { defaultSeconds: 60, defaultSets: 1, defaultRest: 15 })
    ];
  }

  function seedRoutines(exs) {
    function idOf(name) {
      var m = exs.filter(function (e) { return e.name === name; })[0];
      return m ? m.id : null;
    }
    function items(names) {
      return names.map(function (n) {
        var it = { uid: uid('it'), exerciseId: idOf(n) };
        var ex = exs.filter(function (e) { return e.id === it.exerciseId; })[0];
        it.mode = ex.defaultMode;
        it.sets = ex.defaultSets;
        it.reps = ex.defaultReps;
        it.seconds = ex.defaultSeconds;
        it.rest = ex.defaultRest;
        return it;
      }).filter(function (it) { return it.exerciseId; });
    }
    return [
      {
        id: uid('rt'),
        createdAt: Date.now(),
        name: 'Full Body Starter',
        description: 'Three rounds of the basics. No equipment needed.',
        items: items(['Jumping Jacks', 'Bodyweight Squat', 'Push-up', 'Bent-Over Row', 'Plank', 'Full Body Stretch'])
      },
      {
        id: uid('rt'),
        createdAt: Date.now(),
        name: 'Core & Cardio Blast',
        description: 'Short, sharp and sweaty — about 20 minutes.',
        items: items(['High Knees', 'Mountain Climbers', 'Crunch', 'Glute Bridge', 'Burpee', 'Plank'])
      }
    ];
  }

  global.Store = {
    uid: uid,
    load: load,
    save: save,
    subscribe: subscribe,
    exercises: exercises,
    getExercise: getExercise,
    blankExercise: blankExercise,
    saveExercise: saveExercise,
    deleteExercise: deleteExercise,
    routines: routines,
    getRoutine: getRoutine,
    blankRoutine: blankRoutine,
    saveRoutine: saveRoutine,
    deleteRoutine: deleteRoutine,
    newItem: newItem,
    estimateSeconds: estimateSeconds,
    history: history,
    logSession: logSession,
    clearHistory: clearHistory,
    exportJSON: exportJSON,
    importJSON: importJSON,
    resetAll: resetAll
  };
})(window);
