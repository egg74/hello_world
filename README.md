# FitForge

A fitness app for building exercise routines and following them rep by rep — and,
its main feature, giving **every exercise a demonstration of how to do it**.

Open `index.html` in a browser. There is no build step, no dependencies and no
server: it is plain HTML, CSS and JavaScript, and all your data stays in the
browser's local storage.

## What it does

- **Exercise library** — name, category, muscles, equipment, form notes, and
  defaults for sets / reps / time / rest. Search and filter by category.
- **Routine builder** — pick exercises from the library, reorder them, and set
  sets, reps or duration and rest per exercise. It estimates how long a routine
  will take.
- **Workout player** — runs the routine one set at a time with a countdown ring
  for timed sets, automatic rest periods, an audible cue on the last three
  seconds, and the exercise's demonstration playing next to the timer.
  Space pauses, arrow keys move, Escape ends the workout.
- **History** — finished (and partly finished) workouts are logged, with export
  and import of all your data as JSON.

## The demonstration feature

When you add or edit an exercise, the "How to do it" panel offers four ways to
answer *how does this movement actually go?*

1. **Generate animation** — the app draws the movement itself. No network, no
   account, nothing to download. It reads the exercise name, picks a matching
   motion, and animates a stick figure through it. You can override the motion
   and set the tempo.
2. **Search the web** — opens YouTube, Google Images, GIPHY or Tenor in a new
   tab with a sensible query already filled in, then you paste back the address
   of whatever you found.
3. **Paste a link** — YouTube and Vimeo links embed; GIPHY links, direct `.gif`
   files and `.mp4` / `.webm` files play inline and loop.
4. **Upload a file** — keeps a small GIF or clip with the exercise. Browser
   storage is about 5MB in total, so uploads are capped at 2MB.

### How the generated animation works

`assets/js/anim.js` is a small skeletal animation engine. A figure is described
by the absolute angle of each segment:

- `torso`: 0 is upright, positive leans forward (towards screen right)
- limbs: 0 points straight down, positive swings forward

A motion is a list of keyframes over one normalised rep (`t` from 0 to 1); poses
are interpolated with a smoothstep ease and looped. Exercises performed lying
down are authored as an upright figure and tipped over with `rot`, so a push-up
is "a straight body rotated 90°, with the arms bending".

Each frame is grounded automatically — the lowest point is placed on the floor
line — so jumps and squats need no hand-tuned vertical offsets. `anchorOn`
decides what stays still horizontally (planted feet, planted hands, or the
bounding box for horizontal poses).

Motions carry keywords, and the longest matching keyword in the exercise name
wins, so "Bulgarian split squat" resolves to the lunge motion rather than the
squat one. If nothing matches, a neutral idle is used and you can pick a motion
by hand.

**To add a new motion**, add an entry to `MOTIONS` in `assets/js/anim.js` with a
label, keywords, a coaching cue and a few keyframes. It then appears in the
motion dropdown and in auto-detection automatically.

## Layout

```
index.html            app shell
assets/styles.css     styles (dark and light)
assets/js/anim.js     stick-figure animation engine and motion library
assets/js/store.js    localStorage persistence, seed data, import/export
assets/js/media.js    demo sources: animation, link, upload, search links
assets/js/ui.js       DOM helpers, modals, toasts
assets/js/exercises.js exercise library and editor (incl. the demo picker)
assets/js/routines.js routine list and builder
assets/js/player.js   the workout runner
assets/js/app.js      routing, home dashboard, history, settings
```

`hello-world.html` is the page that used to live at `index.html`.
