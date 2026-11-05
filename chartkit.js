/* chartkit.js: draws real candlestick charts and runs the "bullish or bearish" widget. No dependencies. */
(function () {
  var UP = '#22c55e', DN = '#ef5350';
  function css(name, fb) { var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim(); return v || fb; }

  // bars: [[o,h,l,c,v], ...] before-bars first. shown = how many bars to draw. fullFrac 0..1 widens the price range to include the future bars.
  function draw(canvas, bars, nBefore, shown, fullFrac, marker) {
    var dpr = window.devicePixelRatio || 1, w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    var ctx = canvas.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
    var padL = 8, padR = 62, padT = 12, volH = h * 0.2, pTop = padT, pBot = h - volH - 14, vTop = h - volH, vBot = h - 6;
    var lo0 = 1e18, hi0 = -1e18, lo1 = 1e18, hi1 = -1e18, vmax = 0, i;
    for (i = 0; i < bars.length; i++) { var b = bars[i]; if (i < nBefore) { lo0 = Math.min(lo0, b[2]); hi0 = Math.max(hi0, b[1]); } lo1 = Math.min(lo1, b[2]); hi1 = Math.max(hi1, b[1]); vmax = Math.max(vmax, b[4]); }
    var lo = lo0 + (lo1 - lo0) * fullFrac, hi = hi0 + (hi1 - hi0) * fullFrac, pad = (hi - lo) * 0.07; lo -= pad; hi += pad;
    var slot = (w - padL - padR) / (bars.length + 1), Y = function (v) { return pBot - (v - lo) / (hi - lo) * (pBot - pTop); };
    var grid = css('--line', 'rgba(255,255,255,.08)'), muted = css('--muted', '#98a2af');
    ctx.strokeStyle = grid; ctx.lineWidth = 1; ctx.font = '11px "IBM Plex Mono", monospace'; ctx.fillStyle = muted; ctx.textAlign = 'right';
    for (i = 0; i <= 4; i++) { var gy = pTop + i * (pBot - pTop) / 4, gv = hi - (hi - lo) * i / 4; ctx.beginPath(); ctx.moveTo(padL, gy); ctx.lineTo(w - padR, gy); ctx.stroke(); ctx.fillText(gv.toFixed(gv >= 100 ? 0 : 2), w - 6, gy + 4); }
    for (i = 0; i < shown && i < bars.length; i++) {
      var c = bars[i], x = padL + (i + 1) * slot, col = c[3] >= c[0] ? UP : DN;
      ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = Math.max(1, slot * 0.12);
      ctx.beginPath(); ctx.moveTo(x, Y(c[1])); ctx.lineTo(x, Y(c[2])); ctx.stroke();
      var top = Y(Math.max(c[0], c[3])), bh = Math.max(1.5, Math.abs(Y(c[0]) - Y(c[3])));
      ctx.fillRect(x - slot * 0.34, top, slot * 0.68, bh);
      ctx.globalAlpha = 0.5; var vh = (c[4] / (vmax || 1)) * (vBot - vTop); ctx.fillRect(x - slot * 0.34, vBot - vh, slot * 0.68, vh); ctx.globalAlpha = 1;
    }
    if (marker && shown > nBefore) { var mx = padL + (nBefore + 0.5) * slot + slot / 2; ctx.strokeStyle = '#facc15'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(mx, pTop); ctx.lineTo(mx, vBot); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = '#facc15'; ctx.textAlign = 'right'; ctx.fillText('TODAY', mx - 4, pTop + 10); }
  }

  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function money(v) { return '$' + v.toFixed(2); }

  // Mounts one chart question into `root`. opts: {onDone(correct), nextLabel, showBar:[i,n], autoHint}
  function mount(root, ch, opts) {
    opts = opts || {}; root.innerHTML = '';
    var all = ch.c.concat(ch.a), nB = ch.c.length, wrap = el('div', 'cw');
    if (opts.bar) wrap.appendChild(el('div', 'cw-bar', '<i style="width:' + Math.round(100 * opts.bar[0] / opts.bar[1]) + '%"></i>'));
    var head = el('div', 'cw-head', '<span class="cw-tick">' + ch.ticker + '</span><span class="cw-name">' + (ch.name || '') + '</span>');
    var canvas = el('canvas'); var hintWrap = el('div'); var btns = el('div', 'cw-btns');
    var bear = el('button', 'cw-bear', '&larr; Bearish'), bull = el('button', 'cw-bull', 'Bullish &rarr;');
    btns.appendChild(bear); btns.appendChild(bull);
    var hintBtn = el('button', 'cw-link', 'Show the hint'); hintBtn.type = 'button';
    hintBtn.onclick = function () { hintWrap.innerHTML = '<div class="cw-hint"><small>HINT</small>' + ch.hint + '</div>'; hintBtn.style.display = 'none'; };
    wrap.appendChild(head); wrap.appendChild(canvas); wrap.appendChild(hintBtn); wrap.appendChild(hintWrap); wrap.appendChild(btns);
    var res = el('div'); wrap.appendChild(res); root.appendChild(wrap);
    function render(shown, frac) { draw(canvas, all, nB, shown, frac, true); }
    render(nB, 0); var onResize = function () { render(state.shown, state.frac); }; var state = { shown: nB, frac: 0 };
    window.addEventListener('resize', onResize);
    var answered = false;
    function answer(a) {
      if (answered) return; answered = true; bear.disabled = bull.disabled = true; hintBtn.style.display = 'none'; hintWrap.innerHTML = '';
      var n = 0, t0 = null;
      (function step(ts) {
        if (t0 === null) t0 = ts; n = Math.min(ch.a.length, Math.floor((ts - t0) / 170) + 1);
        state.shown = nB + n; state.frac = Math.min(1, (ts - t0) / 700); render(state.shown, state.frac);
        if (n < ch.a.length || state.frac < 1) requestAnimationFrame(step); else finish();
      })(performance.now());
      function finish() {
        var ok = a === ch.answer, sign = ch.move > 0 ? '+' : '';
        res.innerHTML = '<div class="cw-res"><b class="big ' + (ok ? 'ok' : 'no') + '">' + (ok ? 'Correct' : 'Not this time') + '</b> &nbsp; ' +
          '<b>' + sign + ch.move + '%</b> over the next 10 trading days (' + (ch.answer === 'bullish' ? 'bullish' : 'bearish') + ')' +
          '<p><strong>The signal:</strong> ' + ch.signal + '</p><p>' + ch.lesson + '</p></div>';
        if (opts.onDone) { var nx = el('button', 'cw-next', opts.nextLabel || 'Next chart'); nx.onclick = function () { window.removeEventListener('resize', onResize); opts.onDone(ok); }; res.appendChild(nx); }
      }
    }
    bear.onclick = function () { answer('bearish'); }; bull.onclick = function () { answer('bullish'); };
    var key = function (e) { if (answered) return; if (e.key === 'ArrowLeft') answer('bearish'); if (e.key === 'ArrowRight') answer('bullish'); };
    if (opts.keys) document.addEventListener('keydown', key);
    // touch swipe
    var sx = null; canvas.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
    canvas.addEventListener('touchend', function (e) { if (sx === null) return; var dx = e.changedTouches[0].clientX - sx; sx = null; if (Math.abs(dx) > 60) answer(dx > 0 ? 'bullish' : 'bearish'); }, { passive: true });
  }
  window.ChartKit = { draw: draw, mount: mount };
})();
