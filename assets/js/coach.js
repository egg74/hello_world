/*
 * coach.js — generates a *custom* animation for an exercise the app has never
 * seen, by asking Claude to work out how the movement is performed (searching
 * the web when it isn't sure) and to express it as keyframes for anim.js.
 *
 * The keyword presets in anim.js are a fallback: they can only ever return the
 * nearest stock movement, which for something like "Thoracic Extension &
 * Rotation" is confidently wrong. This path produces a motion built for that
 * specific exercise instead.
 *
 * This is the only part of the app that talks to a network service. It needs an
 * Anthropic API key, which the user supplies and which is kept in this browser.
 * Without a key everything else still works — exercises just fall back to the
 * keyword-matched preset.
 */
(function (global) {
  'use strict';

  var API_URL = 'https://api.anthropic.com/v1/messages';
  var MODEL = 'claude-opus-5';
  var KEY_STORAGE = 'fitforge.v1.apiKey';

  /* The key lives outside the main app state on purpose, so that exporting a
   * backup of exercises and routines never carries the credential with it. */
  function getKey() {
    try { return global.localStorage.getItem(KEY_STORAGE) || ''; } catch (e) { return ''; }
  }
  function setKey(value) {
    try {
      if (value) global.localStorage.setItem(KEY_STORAGE, value.trim());
      else global.localStorage.removeItem(KEY_STORAGE);
      return true;
    } catch (e) { return false; }
  }
  function hasKey() { return !!getKey(); }

  /* ------------------------------------------------------------- the schema */

  // Every joint the figure has. Requiring all of them in the tool schema means
  // the model states each angle explicitly rather than leaving gaps we'd have
  // to guess at.
  var JOINTS = [
    'torso', 'head',
    'armN', 'foreN', 'armF', 'foreF',
    'thighN', 'shinN', 'footN',
    'thighF', 'shinF', 'footF'
  ];

  var ORIENTATIONS = ['standing', 'lying_face_down', 'lying_face_up', 'hanging'];

  function frameSchema() {
    var props = {
      t: { type: 'number', description: 'Position in the rep, 0 to 1. The first frame must be 0 and the last must be 1, and the last frame should return to the same pose as the first so the loop is seamless.' },
      lift: { type: 'number', description: 'Height above the floor in figure units, for jumps. 0 unless both feet leave the ground.' }
    };
    JOINTS.forEach(function (j) { props[j] = { type: 'number' }; });
    props.torso.description = 'Torso angle. 0 = upright, positive = leaning forward (towards the direction the figure faces), negative = leaning back.';
    props.head.description = 'Head angle relative to the torso. Negative looks up, positive looks down. Keep between -30 and 30.';
    props.armN.description = 'Near upper arm, shoulder to elbow. 0 = hanging straight down, 90 = pointing forward horizontally, 180 = straight overhead, negative = behind the body.';
    props.foreN.description = 'Near forearm, elbow to hand. Same convention as the upper arm and measured the same absolute way, NOT relative to the upper arm. Equal to armN means a straight arm.';
    props.armF.description = 'Far upper arm. Same convention as armN. Usually mirrors it, except in alternating movements.';
    props.foreF.description = 'Far forearm. Same convention as foreN.';
    props.thighN.description = 'Near thigh, hip to knee. 0 = straight down, positive = knee forward, negative = knee behind the body.';
    props.shinN.description = 'Near shin, knee to ankle. Same absolute convention, NOT relative to the thigh. Equal to thighN means a straight leg.';
    props.footN.description = 'Near foot, ankle to toe. About 90 puts the sole flat on the floor when standing; larger raises the heel.';
    props.thighF.description = 'Far thigh. Same convention as thighN.';
    props.shinF.description = 'Far shin. Same convention as shinN.';
    props.footF.description = 'Far foot. Same convention as footN.';
    return {
      type: 'object',
      properties: props,
      required: ['t', 'lift'].concat(JOINTS),
      additionalProperties: false
    };
  }

  function toolSchema() {
    return {
      type: 'object',
      properties: {
        label: { type: 'string', description: 'Short name of the movement, e.g. "Thoracic extension and rotation".' },
        howTo: { type: 'string', description: 'Two or three sentences telling the user how to perform the exercise: the start position, the movement, and what to avoid.' },
        cue: { type: 'string', description: 'One short coaching cue shown under the animation while training.' },
        orientation: {
          type: 'string',
          enum: ORIENTATIONS,
          description: 'The body position. "standing" covers anything performed upright, seated or kneeling. "lying_face_down" covers prone and all-fours positions (push-up, plank, bird dog). "lying_face_up" covers supine positions (crunch, glute bridge, dead bug). "hanging" is for movements hanging from a bar.'
        },
        secondsPerRep: { type: 'number', description: 'How long one full repetition should take, in seconds. Typically 2 to 5; slower for mobility work.' },
        confidence: {
          type: 'string',
          enum: ['high', 'medium', 'low'],
          description: 'How confident you are that this depicts the named exercise correctly. Use "low" if you had to guess at what the exercise is.'
        },
        frames: {
          // No minItems — strict mode rejects array constraints, so the
          // minimum is enforced when the result comes back instead.
          type: 'array',
          items: frameSchema(),
          description: 'Keyframes in order of t. Use 4 to 7 frames. Hold the end position by repeating it at two nearby t values so the pause is visible.'
        }
      },
      required: ['label', 'howTo', 'cue', 'orientation', 'secondsPerRep', 'confidence', 'frames'],
      additionalProperties: false
    };
  }

  /* ------------------------------------------------------------ the prompt */

  /* Two worked examples, taken from the hand-authored presets, so the model can
   * calibrate the angle conventions against movements whose shape it knows. */
  var EXAMPLES = [
    'Example — Bodyweight squat (orientation "standing"):',
    '  t 0.00  torso 6   armN 66  foreN 74  thighN 2   shinN -2   footN 88   (stood tall, arms forward)',
    '  t 0.45  torso 32  armN 84  foreN 80  thighN 68  shinN -34  footN 92   (hips back and down, knee bent',
    '          because thigh 68 and shin -34 differ by ~100 degrees, torso leaning forward to balance)',
    '  t 1.00  back to the t 0 pose',
    '',
    'Example — Push-up (orientation "lying_face_down"):',
    '  t 0.00  torso 0  head 14  armN 90   foreN 90  thighN 0  shinN 0  footN 74   (body one straight line,',
    '          arms straight and perpendicular to it)',
    '  t 0.45  torso 0  head 14  armN 142  foreN 44  thighN 0  shinN 0  footN 74   (elbows bent, so the body',
    '          lowers; the body stays straight because torso, thigh and shin are unchanged)',
    '  t 1.00  back to the t 0 pose'
  ].join('\n');

  var SYSTEM = [
    'You turn a named exercise into a keyframe animation of a 2D stick figure, so someone can see how the movement is performed.',
    '',
    'THE FIGURE. It is drawn from the side and faces to the right. It has a head, a torso, two arms (upper arm and forearm) and two legs (thigh, shin and foot). "Near" limbs are the ones closest to the viewer; "far" limbs are drawn faded behind. Every joint angle is ABSOLUTE — measured against the world, never against the parent bone. A straight arm therefore has the same value for the upper arm and the forearm. This is the single most common mistake: if you write the forearm angle as if it were a relative elbow bend, the arm will come out folded the wrong way.',
    '',
    'Segment lengths, if you need to reason about where a joint ends up: torso 34, upper arm 18, forearm 17, thigh 24, shin 24, foot 9. The figure is about 100 units tall standing.',
    '',
    'THE FLOOR is handled for you: whatever pose you describe, the lowest point of the figure is placed on the ground automatically, and the figure is kept centred. So you never need to translate the body — only pose it. Use "lift" only when the figure genuinely jumps off the ground.',
    '',
    'ORIENTATION. Pose the figure as if it were upright, in its own frame, and pick the orientation that says how the whole body is then tipped over. For "lying_face_down" and "lying_face_up", think of the body as standing and then rotated: a push-up is "a straight standing body, tipped face down, with the arms bending". For "hanging", the hands are pinned to a bar drawn above the figure.',
    '',
    EXAMPLES,
    '',
    'HOW TO WORK.',
    '1. Establish what the exercise actually is. You must be sure — many exercises have similar names and very different movements. If the name is one you cannot place with certainty, if it might be a regional or brand-specific name, or if you are inferring the movement from the words alone, use the web_search tool before answering. Searching is cheap and a wrong animation is worse than a slow one. Do not search for movements you genuinely know.',
    '2. Work out the start position, the end position, and what moves between them.',
    '3. Write the keyframes. Change only the joints that actually move; keep everything else steady so the movement reads clearly.',
    '4. Sanity-check each frame by asking where the joints land. If a knee should be forward of the hip, is the thigh angle positive? If the arm should be straight, do the upper arm and forearm match? If the exercise has a pause, is it held across two keyframes?',
    '',
    'Then call define_motion exactly once. Do not describe the animation in prose — the tool call is the entire answer.'
  ].join('\n');

  function userPrompt(name, extra) {
    var lines = ['Exercise: ' + name];
    if (extra && extra.trim()) {
      lines.push('');
      lines.push("The person who added this exercise describes it as: " + extra.trim());
      lines.push('Treat that description as authoritative if it conflicts with what you know by this name.');
    }
    lines.push('');
    lines.push('Animate one repetition of this exercise.');
    return lines.join('\n');
  }

  /* ------------------------------------------------------------- the call */

  function tools() {
    return [
      {
        type: 'web_search_20260209',
        name: 'web_search',
        max_uses: 4
      },
      {
        name: 'define_motion',
        description: 'Supply the finished animation for the exercise. Call this exactly once, as the final step.',
        strict: true,
        input_schema: toolSchema()
      }
    ];
  }

  function request(key, messages) {
    return fetch(API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        // Required for the API to allow a cross-origin call from a browser.
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 16000,
        system: SYSTEM,
        tools: tools(),
        messages: messages
      })
    }).then(function (res) {
      return res.json().then(function (body) {
        if (!res.ok) throw new Error(friendlyError(res.status, body));
        return body;
      }, function () {
        throw new Error('The server returned an unreadable response (HTTP ' + res.status + ').');
      });
    }, function () {
      throw new Error('Could not reach the Claude API. Check your internet connection.');
    });
  }

  function friendlyError(status, body) {
    var msg = (body && body.error && body.error.message) || '';
    if (status === 401) return 'That API key was rejected. Check it in Settings.';
    if (status === 403) return 'That API key does not have permission to use this model.';
    if (status === 429) return 'Rate limited by the API. Wait a moment and try again.';
    if (status === 400 && /credit|billing/i.test(msg)) return 'The API account has no credit available.';
    if (status >= 500) return 'The API is having trouble right now. Try again shortly.';
    return msg || ('The API returned an error (HTTP ' + status + ').');
  }

  function findToolUse(content) {
    for (var i = 0; i < content.length; i++) {
      if (content[i].type === 'tool_use' && content[i].name === 'define_motion') return content[i];
    }
    return null;
  }

  function usedSearch(content) {
    for (var i = 0; i < content.length; i++) {
      if (content[i].type === 'server_tool_use' && content[i].name === 'web_search') return true;
    }
    return false;
  }

  /* Generate a motion for `name`. `extra` is the user's own description, if any.
   * `onProgress` is called with short status strings so the UI can show what is
   * happening — a search can take a while. */
  function generate(name, extra, onProgress) {
    var key = getKey();
    if (!key) return Promise.reject(new Error('No API key set. Add one in Settings to generate custom animations.'));
    if (!name || !name.trim()) return Promise.reject(new Error('Give the exercise a name first.'));

    var messages = [{ role: 'user', content: userPrompt(name, extra) }];
    var searched = false;
    var step = 0;
    var report = onProgress || function () {};

    report('Working out how this exercise is performed…');

    function turn() {
      return request(key, messages).then(function (body) {
        if (body.stop_reason === 'refusal') {
          throw new Error('Claude declined to answer this one. Try rewording the exercise name.');
        }
        if (usedSearch(body.content) && !searched) {
          searched = true;
          report('Looking it up on the web…');
        }

        var call = findToolUse(body.content);
        if (call) {
          report('Building the animation…');
          return { spec: call.input, searched: searched };
        }

        // A server-side tool run can pause before it is finished; re-send the
        // conversation as-is and the API picks up where it left off.
        if (body.stop_reason === 'pause_turn' && step < 4) {
          step++;
          messages = messages.concat([{ role: 'assistant', content: body.content }]);
          return turn();
        }

        var text = (body.content || []).filter(function (b) { return b.type === 'text'; })
          .map(function (b) { return b.text; }).join(' ').trim();
        throw new Error(text
          ? 'Claude answered without building an animation: ' + text.slice(0, 200)
          : 'Claude did not return an animation. Try again.');
      });
    }

    return turn().then(function (result) {
      return { motion: normalise(result.spec), searched: result.searched, raw: result.spec };
    });
  }

  /* ------------------------------------------------------------ validation */

  /* Never hand model output straight to the renderer. Clamp everything into a
   * range the engine can draw, drop anything malformed, and fill the gaps. */
  function num(value, fallback, min, max) {
    var n = typeof value === 'number' ? value : parseFloat(value);
    if (!isFinite(n)) return fallback;
    return Math.max(min, Math.min(max, n));
  }

  function normalise(spec) {
    if (!spec || !Array.isArray(spec.frames) || spec.frames.length < 2) {
      throw new Error('The generated animation was incomplete. Try again.');
    }

    var orientation = ORIENTATIONS.indexOf(spec.orientation) !== -1 ? spec.orientation : 'standing';

    var frames = spec.frames.slice(0, 12).map(function (f) {
      var pose = {
        lift: num(f.lift, 0, 0, 60)
      };
      JOINTS.forEach(function (j) { pose[j] = num(f[j], 0, -360, 360); });
      return { t: num(f.t, 0, 0, 1), pose: pose };
    });

    frames.sort(function (a, b) { return a.t - b.t; });
    frames[0].t = 0;
    if (frames[frames.length - 1].t < 1) {
      // Close the loop so the animation doesn't snap at the end.
      frames.push({ t: 1, pose: JSON.parse(JSON.stringify(frames[0].pose)) });
    } else {
      frames[frames.length - 1].t = 1;
    }
    // Strictly increasing t, otherwise interpolation divides by zero.
    for (var i = 1; i < frames.length; i++) {
      if (frames[i].t <= frames[i - 1].t) frames[i].t = Math.min(1, frames[i - 1].t + 0.001);
    }

    return {
      label: String(spec.label || 'Custom motion').slice(0, 80),
      howTo: String(spec.howTo || '').slice(0, 600),
      cue: String(spec.cue || '').slice(0, 200),
      confidence: ['high', 'medium', 'low'].indexOf(spec.confidence) !== -1 ? spec.confidence : 'medium',
      orientation: orientation,
      secondsPerRep: num(spec.secondsPerRep, 3, 0.8, 12),
      frames: frames,
      generatedAt: Date.now(),
      model: MODEL
    };
  }

  /* --------------------------------------------------------- key checking */

  function testKey(key) {
    return fetch(API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1,
        messages: [{ role: 'user', content: 'Hi' }]
      })
    }).then(function (res) {
      // A key that is accepted but truncated at 1 token is still a working key.
      if (res.ok) return true;
      return res.json().catch(function () { return {}; }).then(function (body) {
        throw new Error(friendlyError(res.status, body));
      });
    }, function () {
      throw new Error('Could not reach the Claude API. Check your internet connection.');
    });
  }

  global.Coach = {
    getKey: getKey,
    setKey: setKey,
    hasKey: hasKey,
    generate: generate,
    testKey: testKey,
    normalise: normalise,
    MODEL: MODEL
  };
})(window);
