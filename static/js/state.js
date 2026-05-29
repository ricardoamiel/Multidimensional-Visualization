/* ═══════════════════════════════════════════
   state.js — Global State & Shared Utilities
═══════════════════════════════════════════ */

const FEAT_COLORS = {
  danceability:'#1DB954', energy:'#ff6b6b', valence:'#ffd166',
  acousticness:'#06d6a0', speechiness:'#a29bfe',
  instrumentalness:'#fd79a8', liveness:'#fdcb6e'
};
const CLUSTER_COLORS = ['#1DB954','#3d91ff','#ff6b6b','#ffd166','#a29bfe','#fd79a8'];
const CLUSTER_NAMES  = {
  0:'Dance / Upbeat', 1:'Acoustic / Organic', 2:'Ambient / Instrumental',
  3:'Indie / Alternative', 4:'Experimental', 5:'Electronic / High Energy'
};
const FEATS = ['danceability','energy','valence','acousticness','speechiness','instrumentalness','liveness'];

/* ── GLOBAL STATE ── */
const State = {
  data: {},
  brushedGenres: new Set(),
  activeFeats: new Set(FEATS),
  colorBy: 'cluster',
  projMode: 'pca',
  selectedArtist: null,
  selectedFamily: null,
  parallelAxes: [...FEATS],
  starAngles: {},   // feature -> angle
  listeners: {},
};

/* ── EVENT BUS ── */
State.on = (evt, fn) => {
  if (!State.listeners[evt]) State.listeners[evt] = [];
  State.listeners[evt].push(fn);
};
State.emit = (evt, data) => {
  (State.listeners[evt] || []).forEach(fn => fn(data));
};

/* ── BRUSH SYSTEM ── */
State.brush = (genres) => {
  State.brushedGenres = new Set(genres);
  const n = genres.length;
  const sec = document.getElementById('brushStatus');
  if (n > 0) {
    sec.style.display = 'block';
    document.getElementById('brushCount').textContent = n + ' genre' + (n!==1?'s':'') + ' selected';
  } else {
    sec.style.display = 'none';
  }
  State.emit('brush', genres);
};
State.clearBrush = () => State.brush([]);

/* ── TOOLTIP ── */
const tt = document.getElementById('gTooltip');
const Tooltip = {
  show(html, event) {
    tt.innerHTML = html;
    tt.classList.add('show');
    this.move(event);
  },
  move(event) {
    let x = event.pageX + 14, y = event.pageY - 10;
    const w = tt.offsetWidth || 210;
    if (x + w > window.innerWidth) x = event.pageX - w - 10;
    tt.style.left = x + 'px';
    tt.style.top = y + 'px';
  },
  hide() { tt.classList.remove('show'); }
};

/* ── COLOR SCALE ── */
function getColorScale(key, data) {
  if (key === 'cluster') {
    return d => CLUSTER_COLORS[d.cluster] || '#888';
  }
  const ext = d3.extent(data, d => +d[key]);
  const scale = d3.scaleSequential(d3.interpolateTurbo).domain(ext);
  return d => scale(+d[key]);
}

/* ── HELPERS ── */
function fmtVal(v) { return (+v).toFixed(2); }

function makeHoverHtml(d, extra='') {
  return `<strong>${d.genres||d.artists||d.name||'?'}</strong>
    ${extra}
    <div class="tt-row"><span>popularity</span><span>${fmtVal(d.popularity)}</span></div>
    ${FEATS.filter(f=>d[f]!==undefined).map(f=>`<div class="tt-row"><span>${f}</span><span>${fmtVal(d[f])}</span></div>`).join('')}`;
}

function makeHoverCard(el, d) {
  const name = d.genres || d.artists || '';
  el.innerHTML = `<span class="hover-genre">${name}</span>` +
    FEATS.filter(f => d[f]!==undefined).map(f =>
      `<div class="hover-feat"><span>${f}</span><span>${fmtVal(d[f])}</span></div>
       <div class="hover-bar-wrap"><div class="hover-bar" style="width:${(d[f+'_n']??d[f])*100}%;background:${FEAT_COLORS[f]}"></div></div>`
    ).join('');
}

function isBrushed(d) {
  if (State.brushedGenres.size === 0) return true;
  return State.brushedGenres.has(d.genres || d.artists);
}

function applyBrushOpacity(selection, key='genres') {
  if (State.brushedGenres.size === 0) {
    selection.classed('dimmed', false).classed('highlighted', false);
  } else {
    selection.classed('dimmed', d => !State.brushedGenres.has(d[key]));
    selection.classed('highlighted', d => State.brushedGenres.has(d[key]));
  }
}
