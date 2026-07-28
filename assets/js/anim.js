/*
 * anim.js — procedural exercise animation engine.
 *
 * Renders a 2D skeletal stick figure to a <canvas> and drives it through a
 * keyframed motion so any exercise can have a generated demonstration without
 * needing a video file or a network connection.
 *
 * Model: every segment is stored as an ABSOLUTE angle in degrees measured in
 * the figure's local frame.
 *   - torso: 0 = straight up, positive = leaning forward (towards +x / screen right)
 *   - limbs: 0 = straight down, positive = swinging forward (towards +x)
 * The whole figure can then be rotated about the hip with `rot` (clockwise
 * degrees), which is how lying/horizontal moves such as push-ups and planks are
 * authored: they are written as an upright figure and tipped over 90 degrees.
 */
(function (global) {
  'use strict';

  var RAD = Math.PI / 180;

  // Segment lengths, in figure units. Total standing height is roughly 100.
  var L = {
    torso: 34,
    neck: 9,
    headR: 7,
    upperArm: 18,
    foreArm: 17,
    thigh: 24,
    shin: 24,
    foot: 9
  };

  // Every pose is a sparse override of this neutral standing pose.
  var BASE = {
    rot: 0,        // whole-body rotation about the hip, clockwise degrees
    lift: 0,       // extra height above the ground, figure units (for jumps)
    torso: 5,
    head: -3,
    armN: 8, foreN: 10,   // near-side arm (drawn solid)
    armF: 8, foreF: 10,   // far-side arm (drawn faded, gives a sense of depth)
    thighN: 2, shinN: 0, footN: 88,
    thighF: 2, shinF: 0, footF: 88
  };

  function dirUp(a) { return [Math.sin(a * RAD), -Math.cos(a * RAD)]; }
  function dirDown(a) { return [Math.sin(a * RAD), Math.cos(a * RAD)]; }
  function add(p, d, len) { return [p[0] + d[0] * len, p[1] + d[1] * len]; }

  /* Solve forward kinematics for a pose. Returns named points in local space
   * with the hip at the origin, already rotated by pose.rot. */
  function solve(pose) {
    var hip = [0, 0];
    var neck = add(hip, dirUp(pose.torso), L.torso);
    var headBase = add(neck, dirUp(pose.torso + pose.head), L.neck);
    // The shoulders sit a touch below the neck joint.
    var shoulder = add(hip, dirUp(pose.torso), L.torso * 0.94);

    function arm(a, f) {
      var elbow = add(shoulder, dirDown(a), L.upperArm);
      return { elbow: elbow, hand: add(elbow, dirDown(f), L.foreArm) };
    }
    function leg(t, s, ft) {
      var knee = add(hip, dirDown(t), L.thigh);
      var ankle = add(knee, dirDown(s), L.shin);
      return { knee: knee, ankle: ankle, toe: add(ankle, dirDown(ft), L.foot) };
    }

    var pts = {
      hip: hip,
      neck: neck,
      shoulder: shoulder,
      head: headBase,
      armN: arm(pose.armN, pose.foreN),
      armF: arm(pose.armF, pose.foreF),
      legN: leg(pose.thighN, pose.shinN, pose.footN),
      legF: leg(pose.thighF, pose.shinF, pose.footF)
    };

    if (pose.rot) {
      var c = Math.cos(pose.rot * RAD), s = Math.sin(pose.rot * RAD);
      var rotate = function (p) { return [p[0] * c - p[1] * s, p[0] * s + p[1] * c]; };
      pts.neck = rotate(pts.neck);
      pts.shoulder = rotate(pts.shoulder);
      pts.head = rotate(pts.head);
      ['armN', 'armF'].forEach(function (k) {
        pts[k] = { elbow: rotate(pts[k].elbow), hand: rotate(pts[k].hand) };
      });
      ['legN', 'legF'].forEach(function (k) {
        pts[k] = { knee: rotate(pts[k].knee), ankle: rotate(pts[k].ankle), toe: rotate(pts[k].toe) };
      });
    }
    return pts;
  }

  function eachPoint(pts, fn) {
    fn(pts.hip); fn(pts.neck); fn(pts.shoulder); fn(pts.head);
    ['armN', 'armF'].forEach(function (k) { fn(pts[k].elbow); fn(pts[k].hand); });
    ['legN', 'legF'].forEach(function (k) { fn(pts[k].knee); fn(pts[k].ankle); fn(pts[k].toe); });
  }

  /* ---------------------------------------------------------------- motions */

  function kf(t, pose) { return { t: t, pose: pose }; }

  /* Each motion is a list of keyframes over one normalised rep (t: 0 -> 1).
   * `anchor` is where the feet are planted horizontally, as a fraction of the
   * canvas width; `prop` draws optional scenery (a pull-up bar, a bench). */
  var MOTIONS = {
    squat: {
      label: 'Squat',
      keywords: ['squat', 'air squat', 'goblet', 'sumo'],
      cue: 'Chest up, knees tracking over the toes, hips back and down.',
      frames: [
        kf(0.00, { torso: 6, armN: 66, foreN: 74, armF: 66, foreF: 74, thighN: 2, shinN: -2, thighF: 2, shinF: -2 }),
        kf(0.45, { torso: 32, armN: 84, foreN: 80, armF: 84, foreF: 80, thighN: 68, shinN: -34, footN: 92, thighF: 66, shinF: -32, footF: 92 }),
        kf(0.60, { torso: 32, armN: 84, foreN: 80, armF: 84, foreF: 80, thighN: 68, shinN: -34, footN: 92, thighF: 66, shinF: -32, footF: 92 }),
        kf(1.00, { torso: 6, armN: 66, foreN: 74, armF: 66, foreF: 74, thighN: 2, shinN: -2, thighF: 2, shinF: -2 })
      ]
    },

    jumpsquat: {
      label: 'Jump squat',
      keywords: ['jump squat', 'squat jump', 'box jump'],
      cue: 'Load the hips, then drive through the floor and land soft.',
      frames: [
        kf(0.00, { torso: 6, armN: 10, foreN: 12, armF: 10, foreF: 12 }),
        kf(0.30, { torso: 40, armN: -30, foreN: -20, armF: -30, foreF: -20, thighN: 66, shinN: -32, thighF: 66, shinF: -32 }),
        kf(0.50, { lift: 26, torso: 8, armN: 150, foreN: 160, armF: 150, foreF: 160, thighN: 0, shinN: 6, footN: 120, thighF: 0, shinF: 6, footF: 120 }),
        kf(0.70, { torso: 26, armN: 40, foreN: 50, armF: 40, foreF: 50, thighN: 40, shinN: -18, thighF: 40, shinF: -18 }),
        kf(1.00, { torso: 6, armN: 10, foreN: 12, armF: 10, foreF: 12 })
      ]
    },

    pushup: {
      label: 'Push-up',
      keywords: ['push up', 'pushup', 'push-up', 'press up', 'pressup'],
      cue: 'Body in one line from head to heels, elbows about 45 degrees.',
      anchor: 0.5, floor: 0.72, zoom: 1.12, anchorOn: 'bbox',
      frames: [
        kf(0.00, { rot: 90, torso: 0, head: 14, armN: 90, foreN: 90, armF: 90, foreF: 90, thighN: 0, shinN: 0, footN: 74, thighF: 0, shinF: 0, footF: 74 }),
        kf(0.45, { rot: 90, torso: 0, head: 14, armN: 142, foreN: 44, armF: 142, foreF: 44, thighN: 0, shinN: 0, footN: 74, thighF: 0, shinF: 0, footF: 74 }),
        kf(0.58, { rot: 90, torso: 0, head: 14, armN: 142, foreN: 44, armF: 142, foreF: 44, thighN: 0, shinN: 0, footN: 74, thighF: 0, shinF: 0, footF: 74 }),
        kf(1.00, { rot: 90, torso: 0, head: 14, armN: 90, foreN: 90, armF: 90, foreF: 90, thighN: 0, shinN: 0, footN: 74, thighF: 0, shinF: 0, footF: 74 })
      ]
    },

    plank: {
      label: 'Plank (hold)',
      keywords: ['plank', 'hollow hold', 'hold'],
      cue: 'Squeeze the glutes, brace the ribs down, breathe.',
      // Forearm plank: upper arm straight down to the floor (90) and the
      // forearm lying flat along it towards the head (180).
      anchor: 0.5, floor: 0.72, zoom: 1.12, anchorOn: 'bbox',
      frames: [
        kf(0.00, { rot: 90, torso: 0, head: 12, armN: 90, foreN: 180, armF: 90, foreF: 180, thighN: 0, shinN: 0, footN: 74, thighF: 0, shinF: 0, footF: 74 }),
        kf(0.50, { rot: 90, torso: -2, head: 14, armN: 90, foreN: 180, armF: 90, foreF: 180, thighN: 1, shinN: 0, footN: 74, thighF: 1, shinF: 0, footF: 74 }),
        kf(1.00, { rot: 90, torso: 0, head: 12, armN: 90, foreN: 180, armF: 90, foreF: 180, thighN: 0, shinN: 0, footN: 74, thighF: 0, shinF: 0, footF: 74 })
      ]
    },

    mountainclimber: {
      label: 'Mountain climber',
      keywords: ['mountain climber', 'climber'],
      cue: 'Hips low and still, drive one knee at a time to the chest.',
      // With rot 90 the head points screen-right, so a knee driven towards the
      // chest needs a large positive thigh angle (towards local "up").
      anchor: 0.5, floor: 0.72, zoom: 1.12, anchorOn: 'bbox',
      frames: [
        kf(0.00, { rot: 90, torso: 0, head: 14, armN: 90, foreN: 90, armF: 90, foreF: 90, thighN: 0, shinN: 0, footN: 74, thighF: 150, shinF: 60, footF: 74 }),
        kf(0.50, { rot: 90, torso: 0, head: 14, armN: 90, foreN: 90, armF: 90, foreF: 90, thighN: 150, shinN: 60, footN: 74, thighF: 0, shinF: 0, footF: 74 }),
        kf(1.00, { rot: 90, torso: 0, head: 14, armN: 90, foreN: 90, armF: 90, foreF: 90, thighN: 0, shinN: 0, footN: 74, thighF: 150, shinF: 60, footF: 74 })
      ]
    },

    lunge: {
      label: 'Lunge',
      keywords: ['lunge', 'split squat', 'step up', 'stepup'],
      cue: 'Step out, drop the back knee, keep the torso tall.',
      frames: [
        kf(0.00, { torso: 5 }),
        kf(0.45, { torso: 8, armN: 24, foreN: 26, armF: -18, foreF: -14, thighN: 45, shinN: -15, footN: 92, thighF: -20, shinF: -60, footF: 58 }),
        kf(0.60, { torso: 8, armN: 24, foreN: 26, armF: -18, foreF: -14, thighN: 45, shinN: -15, footN: 92, thighF: -20, shinF: -60, footF: 58 }),
        kf(1.00, { torso: 5 })
      ]
    },

    jumpingjack: {
      label: 'Jumping jack',
      keywords: ['jumping jack', 'star jump', 'jack'],
      cue: 'Arms all the way overhead, land through the whole foot.',
      frames: [
        kf(0.00, { armN: 6, foreN: 6, armF: 6, foreF: 6, thighN: 2, thighF: 2 }),
        kf(0.25, { lift: 10, armN: 96, foreN: 110, armF: 96, foreF: 110, thighN: 18, shinN: 6, thighF: -16, shinF: -6 }),
        kf(0.50, { armN: 168, foreN: 172, armF: 168, foreF: 172, thighN: 26, shinN: 8, footN: 96, thighF: -24, shinF: -8, footF: 80 }),
        kf(0.75, { lift: 10, armN: 96, foreN: 110, armF: 96, foreF: 110, thighN: 18, shinN: 6, thighF: -16, shinF: -6 }),
        kf(1.00, { armN: 6, foreN: 6, armF: 6, foreF: 6, thighN: 2, thighF: 2 })
      ]
    },

    highknees: {
      label: 'High knees / run',
      keywords: ['high knee', 'running', 'run', 'jog', 'sprint', 'march', 'cardio'],
      cue: 'Tall posture, quick feet, drive the knees to hip height.',
      frames: [
        kf(0.00, { torso: 10, armN: -34, foreN: -60, armF: 40, foreF: 78, thighN: -28, shinN: 10, thighF: 78, shinF: -66, footF: 74 }),
        kf(0.50, { torso: 10, armN: 40, foreN: 78, armF: -34, foreF: -60, thighN: 78, shinN: -66, footN: 74, thighF: -28, shinF: 10 }),
        kf(1.00, { torso: 10, armN: -34, foreN: -60, armF: 40, foreF: 78, thighN: -28, shinN: 10, thighF: 78, shinF: -66, footF: 74 })
      ]
    },

    bicepcurl: {
      label: 'Biceps curl',
      keywords: ['curl', 'bicep', 'biceps'],
      cue: 'Elbows pinned to the ribs, no swinging.',
      frames: [
        kf(0.00, { armN: 6, foreN: 8, armF: 6, foreF: 8 }),
        kf(0.45, { armN: 12, foreN: 128, armF: 12, foreF: 128 }),
        kf(0.58, { armN: 12, foreN: 128, armF: 12, foreF: 128 }),
        kf(1.00, { armN: 6, foreN: 8, armF: 6, foreF: 8 })
      ]
    },

    overheadpress: {
      label: 'Overhead press',
      keywords: ['overhead press', 'shoulder press', 'military press', 'push press', 'ohp'],
      cue: 'Ribs down, press straight up until the arms lock out.',
      frames: [
        kf(0.00, { torso: 3, armN: 34, foreN: 148, armF: 34, foreF: 148 }),
        kf(0.45, { torso: 2, armN: 172, foreN: 176, armF: 172, foreF: 176 }),
        kf(0.58, { torso: 2, armN: 172, foreN: 176, armF: 172, foreF: 176 }),
        kf(1.00, { torso: 3, armN: 34, foreN: 148, armF: 34, foreF: 148 })
      ]
    },

    lateralraise: {
      label: 'Lateral raise',
      keywords: ['lateral raise', 'side raise', 'fly', 'flye', 'reverse fly'],
      cue: 'Lead with the elbows, stop at shoulder height.',
      frames: [
        kf(0.00, { armN: 8, foreN: 10, armF: 8, foreF: 10 }),
        kf(0.45, { armN: 88, foreN: 92, armF: 84, foreF: 88 }),
        kf(0.58, { armN: 88, foreN: 92, armF: 84, foreF: 88 }),
        kf(1.00, { armN: 8, foreN: 10, armF: 8, foreF: 10 })
      ]
    },

    deadlift: {
      label: 'Hip hinge / deadlift',
      keywords: ['deadlift', 'hinge', 'good morning', 'rdl', 'romanian', 'kettlebell swing', 'swing'],
      cue: 'Push the hips back, flat back, bar close to the legs.',
      frames: [
        kf(0.00, { torso: 4, armN: 6, foreN: 8, armF: 6, foreF: 8 }),
        kf(0.45, { torso: 74, armN: -60, foreN: -62, armF: -60, foreF: -62, thighN: -12, shinN: 10, thighF: -12, shinF: 10 }),
        kf(0.58, { torso: 74, armN: -60, foreN: -62, armF: -60, foreF: -62, thighN: -12, shinN: 10, thighF: -12, shinF: 10 }),
        kf(1.00, { torso: 4, armN: 6, foreN: 8, armF: 6, foreF: 8 })
      ]
    },

    bentoverrow: {
      label: 'Bent-over row',
      keywords: ['row', 'bent over', 'bent-over', 'pendlay'],
      cue: 'Hinge to about 45 degrees, pull the elbows past the ribs.',
      frames: [
        kf(0.00, { torso: 62, armN: -50, foreN: -54, armF: -50, foreF: -54, thighN: -10, shinN: 8, thighF: -10, shinF: 8 }),
        kf(0.45, { torso: 62, armN: -104, foreN: -20, armF: -104, foreF: -20, thighN: -10, shinN: 8, thighF: -10, shinF: 8 }),
        kf(0.58, { torso: 62, armN: -104, foreN: -20, armF: -104, foreF: -20, thighN: -10, shinN: 8, thighF: -10, shinF: 8 }),
        kf(1.00, { torso: 62, armN: -50, foreN: -54, armF: -50, foreF: -54, thighN: -10, shinN: 8, thighF: -10, shinF: 8 })
      ]
    },

    crunch: {
      label: 'Crunch / sit-up',
      keywords: ['crunch', 'sit up', 'situp', 'sit-up', 'abs', 'ab ', 'core', 'leg raise'],
      cue: 'Peel the shoulders off the floor, do not yank on the neck.',
      anchor: 0.5, floor: 0.72, zoom: 1.12, anchorOn: 'bbox',
      frames: [
        kf(0.00, { rot: -90, torso: 0, head: 14, armN: 150, foreN: 200, armF: 150, foreF: 200, thighN: 56, shinN: -36, footN: 60, thighF: 56, shinF: -36, footF: 60 }),
        kf(0.45, { rot: -90, torso: 38, head: 22, armN: 150, foreN: 200, armF: 150, foreF: 200, thighN: 56, shinN: -36, footN: 60, thighF: 56, shinF: -36, footF: 60 }),
        kf(0.58, { rot: -90, torso: 38, head: 22, armN: 150, foreN: 200, armF: 150, foreF: 200, thighN: 56, shinN: -36, footN: 60, thighF: 56, shinF: -36, footF: 60 }),
        kf(1.00, { rot: -90, torso: 0, head: 14, armN: 150, foreN: 200, armF: 150, foreF: 200, thighN: 56, shinN: -36, footN: 60, thighF: 56, shinF: -36, footF: 60 })
      ]
    },

    glutebridge: {
      label: 'Glute bridge',
      keywords: ['glute bridge', 'bridge', 'hip thrust'],
      cue: 'Drive through the heels, squeeze at the top, ribs down.',
      // Arms at 0 lie flat on the floor beside the hips once rotated.
      anchor: 0.5, floor: 0.72, zoom: 1.12, anchorOn: 'bbox',
      frames: [
        kf(0.00, { rot: -90, torso: 0, head: 10, armN: 0, foreN: 0, armF: 0, foreF: 0, thighN: 62, shinN: -44, footN: 56, thighF: 62, shinF: -44, footF: 56 }),
        kf(0.45, { rot: -90, torso: -34, head: 6, armN: 0, foreN: 0, armF: 0, foreF: 0, thighN: 28, shinN: -14, footN: 56, thighF: 28, shinF: -14, footF: 56 }),
        kf(0.58, { rot: -90, torso: -34, head: 6, armN: 0, foreN: 0, armF: 0, foreF: 0, thighN: 28, shinN: -14, footN: 56, thighF: 28, shinF: -14, footF: 56 }),
        kf(1.00, { rot: -90, torso: 0, head: 10, armN: 0, foreN: 0, armF: 0, foreF: 0, thighN: 62, shinN: -44, footN: 56, thighF: 62, shinF: -44, footF: 56 })
      ]
    },

    pullup: {
      label: 'Pull-up',
      keywords: ['pull up', 'pullup', 'pull-up', 'chin up', 'chinup', 'lat pulldown', 'pulldown'],
      cue: 'Start from a dead hang, pull the elbows down to the ribs.',
      prop: 'bar',
      hang: true,
      anchorOn: 'hands',
      frames: [
        kf(0.00, { torso: 0, head: 4, armN: 176, foreN: 178, armF: 176, foreF: 178, thighN: -8, shinN: 30, footN: 110, thighF: -8, shinF: 30, footF: 110 }),
        // Elbows out front and folded hard: that is what actually lifts the
        // body, since the hands stay pinned to the bar.
        kf(0.45, { torso: -4, head: 6, armN: 116, foreN: 252, armF: 116, foreF: 252, thighN: -14, shinN: 44, footN: 110, thighF: -14, shinF: 44, footF: 110 }),
        kf(0.58, { torso: -4, head: 6, armN: 116, foreN: 252, armF: 116, foreF: 252, thighN: -14, shinN: 44, footN: 110, thighF: -14, shinF: 44, footF: 110 }),
        kf(1.00, { torso: 0, head: 4, armN: 176, foreN: 178, armF: 176, foreF: 178, thighN: -8, shinN: 30, footN: 110, thighF: -8, shinF: 30, footF: 110 })
      ]
    },

    tricepdip: {
      label: 'Dip',
      keywords: ['dip', 'tricep', 'triceps'],
      cue: 'Lower under control, elbows back rather than flared.',
      prop: 'dipbar',
      frames: [
        kf(0.00, { torso: 12, armN: -14, foreN: -12, armF: -14, foreF: -12, thighN: 60, shinN: 30, footN: 110, thighF: 60, shinF: 30, footF: 110 }),
        kf(0.45, { torso: 16, armN: -34, foreN: 26, armF: -34, foreF: 26, thighN: 62, shinN: 34, footN: 110, thighF: 62, shinF: 34, footF: 110 }),
        kf(0.58, { torso: 16, armN: -34, foreN: 26, armF: -34, foreF: 26, thighN: 62, shinN: 34, footN: 110, thighF: 62, shinF: 34, footF: 110 }),
        kf(1.00, { torso: 12, armN: -14, foreN: -12, armF: -14, foreF: -12, thighN: 60, shinN: 30, footN: 110, thighF: 60, shinF: 30, footF: 110 })
      ]
    },

    calfraise: {
      label: 'Calf raise',
      keywords: ['calf raise', 'calf', 'heel raise'],
      cue: 'Full stretch at the bottom, pause at the top.',
      frames: [
        kf(0.00, { footN: 88, footF: 88 }),
        kf(0.45, { lift: 9, shinN: 12, shinF: 12, footN: 126, footF: 126, torso: 3 }),
        kf(0.58, { lift: 9, shinN: 12, shinF: 12, footN: 126, footF: 126, torso: 3 }),
        kf(1.00, { footN: 88, footF: 88 })
      ]
    },

    burpee: {
      label: 'Burpee',
      keywords: ['burpee'],
      cue: 'Squat, kick back, push-up, jump the feet in, jump up.',
      anchor: 0.5, floor: 0.82, anchorOn: 'bbox',
      frames: [
        kf(0.00, { torso: 6 }),
        kf(0.16, { torso: 44, armN: 70, foreN: 96, armF: 70, foreF: 96, thighN: 74, shinN: -40, footN: 92, thighF: 74, shinF: -40, footF: 92 }),
        kf(0.34, { rot: 90, torso: 0, head: 14, armN: 90, foreN: 90, armF: 90, foreF: 90, footN: 74, footF: 74 }),
        kf(0.46, { rot: 90, torso: 0, head: 14, armN: 142, foreN: 44, armF: 142, foreF: 44, footN: 74, footF: 74 }),
        kf(0.58, { rot: 90, torso: 0, head: 14, armN: 90, foreN: 90, armF: 90, foreF: 90, footN: 74, footF: 74 }),
        kf(0.72, { torso: 44, armN: 70, foreN: 96, armF: 70, foreF: 96, thighN: 74, shinN: -40, footN: 92, thighF: 74, shinF: -40, footF: 92 }),
        kf(0.86, { lift: 22, torso: 6, armN: 166, foreN: 172, armF: 166, foreF: 172, footN: 118, footF: 118 }),
        kf(1.00, { torso: 6 })
      ]
    },

    stretch: {
      label: 'Stretch / mobility',
      keywords: ['stretch', 'mobility', 'reach', 'cat cow', 'warm up', 'warmup', 'cool down', 'cooldown'],
      cue: 'Move slowly to the end of the range and breathe into it.',
      frames: [
        kf(0.00, { torso: 4, armN: 8, foreN: 10, armF: 8, foreF: 10 }),
        kf(0.35, { torso: -4, armN: 172, foreN: 178, armF: 168, foreF: 174, shinN: -4, shinF: -4 }),
        kf(0.70, { torso: 68, armN: -58, foreN: -60, armF: -58, foreF: -60, thighN: -8, shinN: 6, thighF: -8, shinF: 6 }),
        kf(1.00, { torso: 4, armN: 8, foreN: 10, armF: 8, foreF: 10 })
      ]
    },

    generic: {
      label: 'Generic (breathing idle)',
      keywords: [],
      cue: 'No motion preset matched this exercise — pick one manually if you like.',
      frames: [
        kf(0.00, { torso: 5, armN: 8, foreN: 12, armF: 8, foreF: 12 }),
        kf(0.50, { torso: 2, armN: 16, foreN: 22, armF: 14, foreF: 20, shinN: -3, shinF: -3 }),
        kf(1.00, { torso: 5, armN: 8, foreN: 12, armF: 8, foreF: 12 })
      ]
    }
  };

  var ORDER = Object.keys(MOTIONS);

  /* Pick a motion from an exercise name. Longer keywords win so that
   * "jump squat" beats "squat" and "shoulder press" beats "press up". */
  function detect(name) {
    var n = ' ' + String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ') + ' ';
    var best = null, bestLen = 0;
    ORDER.forEach(function (key) {
      MOTIONS[key].keywords.forEach(function (word) {
        var w = word.trim();
        if (w && n.indexOf(w) !== -1 && w.length > bestLen) { best = key; bestLen = w.length; }
      });
    });
    return best || 'generic';
  }

  function list() {
    return ORDER.map(function (k) { return { key: k, label: MOTIONS[k].label }; });
  }

  function get(key) { return MOTIONS[key] || MOTIONS.generic; }

  /* ------------------------------------------------------------ interpolate */

  function smooth(x) { return x * x * (3 - 2 * x); }

  function poseAt(motion, t) {
    var frames = motion.frames;
    t = ((t % 1) + 1) % 1;
    var i = 0;
    while (i < frames.length - 2 && frames[i + 1].t <= t) i++;
    var a = frames[i], b = frames[i + 1] || frames[frames.length - 1];
    var span = b.t - a.t;
    var k = span > 0 ? smooth((t - a.t) / span) : 0;
    var out = {};
    Object.keys(BASE).forEach(function (key) {
      var av = a.pose[key] !== undefined ? a.pose[key] : BASE[key];
      var bv = b.pose[key] !== undefined ? b.pose[key] : BASE[key];
      out[key] = av + (bv - av) * k;
    });
    return out;
  }

  /* ---------------------------------------------------------------- renderer */

  function cssVar(name, fallback) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name);
    return (v && v.trim()) || fallback;
  }

  function drawFrame(ctx, w, h, motion, t, opts) {
    var pose = poseAt(motion, t);
    var pts = solve(pose);

    var ink = opts.ink || cssVar('--fg', '#e8ecf4');
    var faded = opts.faded || cssVar('--muted', '#7c879b');
    var accent = opts.accent || cssVar('--accent', '#4ade80');

    // Scale so a standing figure fills most of the frame. Motions that lie
    // down use a higher floor and a little extra zoom so they are not squashed
    // into the bottom of the canvas.
    var scale = Math.min(w, h) / 128 * (motion.zoom || 1);
    var groundY = h * (motion.floor || 0.9);
    var anchorX = w * (motion.anchor || 0.5);

    // Ground the figure: the lowest point rests on the floor line, then `lift`
    // raises it for jumps. Hanging moves (pull-ups) instead hang from a bar.
    var minY = Infinity, maxY = -Infinity;
    eachPoint(pts, function (p) { minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]); });

    var oy;
    if (motion.hang) {
      var handY = Math.min(pts.armN.hand[1], pts.armF.hand[1]);
      oy = h * 0.14 - handY * scale;
    } else {
      oy = groundY - maxY * scale - (pose.lift || 0) * scale;
    }
    // Hold the figure still horizontally. Upright motions pin the planted
    // feet; motions performed lying down centre their bounding box instead,
    // which keeps a long horizontal body inside the frame.
    var refX;
    if (motion.anchorOn === 'bbox') {
      var minX = Infinity, maxX = -Infinity;
      eachPoint(pts, function (p) { minX = Math.min(minX, p[0]); maxX = Math.max(maxX, p[0]); });
      refX = (minX + maxX) / 2;
    } else if (motion.anchorOn === 'hands') {
      refX = (pts.armN.hand[0] + pts.armF.hand[0]) / 2;
    } else {
      refX = (pts.legN.ankle[0] + pts.legF.ankle[0]) / 2;
    }
    var ox = anchorX - refX * scale;

    function P(p) { return [ox + p[0] * scale, oy + p[1] * scale]; }

    ctx.clearRect(0, 0, w, h);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Floor
    if (!motion.hang) {
      ctx.strokeStyle = faded;
      ctx.globalAlpha = 0.45;
      ctx.lineWidth = Math.max(1, scale * 0.6);
      ctx.beginPath();
      ctx.moveTo(w * 0.06, groundY);
      ctx.lineTo(w * 0.94, groundY);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Props
    if (motion.prop === 'bar') {
      var barY = P(pts.armN.hand)[1];
      ctx.strokeStyle = faded;
      ctx.lineWidth = Math.max(2, scale * 1.1);
      ctx.beginPath();
      ctx.moveTo(w * 0.2, barY);
      ctx.lineTo(w * 0.8, barY);
      ctx.moveTo(w * 0.24, barY);
      ctx.lineTo(w * 0.24, h * 0.06);
      ctx.moveTo(w * 0.76, barY);
      ctx.lineTo(w * 0.76, h * 0.06);
      ctx.stroke();
    } else if (motion.prop === 'dipbar') {
      // The parallel bar the hands are resting on, so the pose reads as a dip
      // rather than someone sitting in mid-air.
      var hand = P(pts.armN.hand);
      ctx.strokeStyle = faded;
      ctx.lineWidth = Math.max(2, scale * 1.1);
      ctx.beginPath();
      ctx.moveTo(hand[0] - 22 * scale, hand[1]);
      ctx.lineTo(hand[0] + 22 * scale, hand[1]);
      ctx.moveTo(hand[0] + 18 * scale, hand[1]);
      ctx.lineTo(hand[0] + 18 * scale, groundY);
      ctx.stroke();
    }

    function chain(points, color, width, alpha) {
      ctx.strokeStyle = color;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = width;
      ctx.beginPath();
      points.forEach(function (p, i) {
        var q = P(p);
        if (i === 0) ctx.moveTo(q[0], q[1]); else ctx.lineTo(q[0], q[1]);
      });
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    var limbW = Math.max(2, scale * 2.4);
    var torsoW = Math.max(3, scale * 3.4);

    // Far side first so the near side reads as being in front.
    chain([pts.shoulder, pts.armF.elbow, pts.armF.hand], faded, limbW, 0.55);
    chain([pts.hip, pts.legF.knee, pts.legF.ankle, pts.legF.toe], faded, limbW, 0.55);

    chain([pts.hip, pts.neck], accent, torsoW, 1);
    chain([pts.shoulder, pts.armN.elbow, pts.armN.hand], ink, limbW, 1);
    chain([pts.hip, pts.legN.knee, pts.legN.ankle, pts.legN.toe], ink, limbW, 1);

    // Head
    var hc = P(pts.head);
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(hc[0], hc[1], L.headR * scale, 0, Math.PI * 2);
    ctx.fill();
  }

  /* A live, looping animation bound to a canvas element. */
  function Player(canvas, options) {
    var opts = options || {};
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.motion = get(opts.motion);
    this.duration = opts.tempo || 2.4;   // seconds per rep
    this.t = 0;
    this.raf = null;
    this.paused = false;
    this.opts = opts;
    this.resize();
  }

  Player.prototype.resize = function () {
    var dpr = global.devicePixelRatio || 1;
    var rect = this.canvas.getBoundingClientRect();
    var w = rect.width || this.canvas.width || 280;
    var h = rect.height || this.canvas.height || 280;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.w = w;
    this.h = h;
    this.render();
  };

  Player.prototype.setMotion = function (key) {
    this.motion = get(key);
    this.t = 0;
    this.render();
  };

  Player.prototype.setTempo = function (seconds) {
    this.duration = Math.max(0.4, seconds);
  };

  Player.prototype.render = function () {
    if (!this.w) return;
    drawFrame(this.ctx, this.w, this.h, this.motion, this.t, this.opts);
  };

  Player.prototype.start = function () {
    if (this.raf) return;
    var self = this;
    var last = null;
    this.paused = false;
    var step = function (now) {
      if (last === null) last = now;
      var dt = (now - last) / 1000;
      last = now;
      if (!self.paused) {
        self.t = (self.t + dt / self.duration) % 1;
        self.render();
      }
      self.raf = global.requestAnimationFrame(step);
    };
    this.raf = global.requestAnimationFrame(step);
  };

  Player.prototype.stop = function () {
    if (this.raf) global.cancelAnimationFrame(this.raf);
    this.raf = null;
  };

  Player.prototype.toggle = function () {
    this.paused = !this.paused;
    return !this.paused;
  };

  /* Render a single still frame — used for exercise card thumbnails. */
  function thumbnail(canvas, motionKey, t) {
    var p = new Player(canvas, { motion: motionKey });
    p.t = t === undefined ? 0.45 : t;
    p.render();
    return p;
  }

  global.Anim = {
    MOTIONS: MOTIONS,
    detect: detect,
    list: list,
    get: get,
    Player: Player,
    thumbnail: thumbnail,
    poseAt: poseAt
  };
})(window);
