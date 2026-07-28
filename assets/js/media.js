/*
 * media.js — everything to do with an exercise's demonstration.
 *
 * Three sources are supported:
 *   1. animation — generated locally by anim.js, no network needed
 *   2. link      — a YouTube/Vimeo URL, a direct .gif/.mp4/.webm, or an image
 *   3. upload    — a small file the user picked, kept as a data URL
 *
 * Plus helpers to build "find me a demo" search URLs, which open the relevant
 * site in a new tab with a sensible query already filled in.
 */
(function (global) {
  'use strict';

  function classify(url) {
    var u = String(url || '').trim();
    if (!u) return { kind: 'none' };
    if (u.indexOf('data:') === 0) {
      if (u.indexOf('data:video') === 0) return { kind: 'video', src: u };
      return { kind: 'image', src: u };
    }

    var yt = u.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{6,})/);
    if (yt) return { kind: 'youtube', id: yt[1], src: 'https://www.youtube.com/embed/' + yt[1] + '?rel=0&modestbranding=1' };

    var vimeo = u.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    if (vimeo) return { kind: 'vimeo', id: vimeo[1], src: 'https://player.vimeo.com/video/' + vimeo[1] };

    // Giphy page links (…/gifs/slug-ID) can be turned into a direct GIF.
    var giphy = u.match(/giphy\.com\/(?:gifs|clips)\/(?:[\w-]*-)?(\w{8,})/);
    if (giphy) return { kind: 'image', src: 'https://media.giphy.com/media/' + giphy[1] + '/giphy.gif' };

    var path = u.split('?')[0].split('#')[0].toLowerCase();
    if (/\.(mp4|webm|ogv|ogg|mov)$/.test(path)) return { kind: 'video', src: u };
    if (/\.(gif|png|jpe?g|webp|avif|svg)$/.test(path)) return { kind: 'image', src: u };

    return { kind: 'link', src: u };
  }

  function searchQuery(name) {
    return String(name || 'exercise').trim() + ' exercise how to proper form';
  }

  function searchLinks(name) {
    var q = encodeURIComponent(searchQuery(name));
    var gq = encodeURIComponent(String(name || 'exercise').trim() + ' exercise');
    return [
      { label: 'YouTube', hint: 'Full video demos and coaching cues', url: 'https://www.youtube.com/results?search_query=' + q },
      { label: 'Google Images', hint: 'Photos and animated GIFs', url: 'https://www.google.com/search?tbm=isch&q=' + q },
      { label: 'GIPHY', hint: 'Looping GIFs — right-click to copy the GIF address', url: 'https://giphy.com/search/' + gq },
      { label: 'Tenor', hint: 'Another good source of exercise GIFs', url: 'https://tenor.com/search/' + gq + '-gifs' }
    ];
  }

  /* Build the DOM node that shows a demo. Animations return a live canvas with
   * an anim.js player attached at node._player so callers can stop it. */
  function render(exercise, opts) {
    opts = opts || {};
    var media = exercise.media || { type: 'animation', preset: 'auto' };
    var wrap = document.createElement('div');
    wrap.className = 'media' + (opts.large ? ' media-lg' : '');

    if (media.type === 'animation' || media.type === undefined) {
      var canvas = document.createElement('canvas');
      canvas.className = 'anim-canvas';
      wrap.appendChild(canvas);
      var preset = presetFor(exercise);
      // The canvas needs a measured size before the player scales itself, so
      // set up on the next frame once it is in the document.
      requestAnimationFrame(function () {
        // The wrapper may already have been torn down while we waited a frame.
        if (wrap._stopped || !document.body.contains(canvas)) return;
        var player = new Anim.Player(canvas, { motion: preset, tempo: media.tempo || 2.4 });
        wrap._player = player;
        if (opts.autoplay !== false) player.start(); else player.render();
      });
      wrap.dataset.kind = 'animation';
      return wrap;
    }

    var src = media.type === 'upload' ? media.dataUrl : media.url;
    var info = classify(src);

    if (info.kind === 'youtube' || info.kind === 'vimeo') {
      var frame = document.createElement('iframe');
      frame.src = info.src;
      frame.title = exercise.name + ' demonstration';
      frame.allow = 'accelerometer; encrypted-media; picture-in-picture; fullscreen';
      frame.allowFullscreen = true;
      frame.loading = 'lazy';
      frame.referrerPolicy = 'strict-origin-when-cross-origin';
      wrap.appendChild(frame);
    } else if (info.kind === 'video') {
      var vid = document.createElement('video');
      vid.src = info.src;
      vid.autoplay = opts.autoplay !== false;
      vid.loop = true;
      vid.muted = true;
      vid.playsInline = true;
      vid.controls = !!opts.large;
      wrap.appendChild(vid);
    } else if (info.kind === 'image') {
      var img = document.createElement('img');
      img.src = info.src;
      img.alt = exercise.name + ' demonstration';
      img.loading = 'lazy';
      img.onerror = function () {
        wrap.innerHTML = '';
        wrap.appendChild(fallback('That image could not be loaded.', src));
      };
      wrap.appendChild(img);
    } else if (info.kind === 'link') {
      wrap.appendChild(fallback('This link cannot be embedded — open it in a new tab.', src));
    } else {
      wrap.appendChild(fallback('No demonstration set for this exercise yet.', ''));
    }

    wrap.dataset.kind = info.kind;
    return wrap;
  }

  function fallback(message, url) {
    var box = document.createElement('div');
    box.className = 'media-fallback';
    var p = document.createElement('p');
    p.textContent = message;
    box.appendChild(p);
    if (url) {
      var a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.className = 'btn btn-ghost btn-sm';
      a.textContent = 'Open link';
      box.appendChild(a);
    }
    return box;
  }

  function presetFor(exercise) {
    var m = exercise.media || {};
    if (m.preset && m.preset !== 'auto') return m.preset;
    return Anim.detect(exercise.name);
  }

  function describe(exercise) {
    var m = exercise.media || {};
    if (!m.type || m.type === 'animation') {
      var key = presetFor(exercise);
      return 'Animated · ' + Anim.get(key).label;
    }
    if (m.type === 'upload') return 'Uploaded file' + (m.title ? ' · ' + m.title : '');
    var info = classify(m.url);
    if (info.kind === 'youtube') return 'YouTube video';
    if (info.kind === 'vimeo') return 'Vimeo video';
    if (info.kind === 'image') return 'GIF / image';
    if (info.kind === 'video') return 'Video file';
    if (info.kind === 'link') return 'External link';
    return 'No demo';
  }

  /* Shut down anything still running inside `node` — animation loops, videos
   * and embeds. Called before a view or modal is torn down; without it the
   * requestAnimationFrame loops would keep drawing to detached canvases. */
  function stop(node) {
    if (!node) return;
    node._stopped = true;
    if (node._player) node._player.stop();
    var nested = node.querySelectorAll ? node.querySelectorAll('.media') : [];
    Array.prototype.forEach.call(nested, function (m) {
      m._stopped = true;
      if (m._player) m._player.stop();
    });
    var vids = node.querySelectorAll ? node.querySelectorAll('video') : [];
    Array.prototype.forEach.call(vids, function (v) { try { v.pause(); } catch (e) {} });
    // Detaching the iframe src stops YouTube playback.
    var frames = node.querySelectorAll ? node.querySelectorAll('iframe') : [];
    Array.prototype.forEach.call(frames, function (f) { f.src = 'about:blank'; });
  }

  global.Media = {
    classify: classify,
    searchLinks: searchLinks,
    searchQuery: searchQuery,
    render: render,
    describe: describe,
    presetFor: presetFor,
    stop: stop
  };
})(window);
