/* star.js — Star Coordinates with draggable axes and feature toggles */

const Star = (() => {
  let svg, g, data, W, H, R, cx, cy;
  let axisAngles = {};

  function build(container, _data) {
    data = _data;
    d3.select(container).select('svg').remove();
    W = container.clientWidth; H = container.clientHeight;
    R = Math.min(W, H)/2 - 48;
    cx = W/2; cy = H/2;

    svg = d3.select(container).append('svg').attr('width',W).attr('height',H);
    g = svg.append('g').attr('transform',`translate(${cx},${cy})`);

    initAxes();
    buildToggles();
    drawAxes();
    drawPoints();
  }

  function initAxes() {
    const feats = FEATS;
    feats.forEach((f,i) => {
      if (axisAngles[f] === undefined)
        axisAngles[f] = (2*Math.PI*i/feats.length) - Math.PI/2;
    });
  }

  function computePos(d) {
    let px=0, py=0;
    FEATS.forEach(f => {
      if (!State.activeFeats.has(f)) return;
      const v = +(d[f+'_n']??0);
      const a = axisAngles[f] ?? 0;
      px += v * Math.cos(a) * R;
      py += v * Math.sin(a) * R;
    });
    return [px, py];
  }

  function drawAxes() {
    g.selectAll('.sc-axis-g').remove();
    const activeFeats = FEATS.filter(f=>State.activeFeats.has(f));
    activeFeats.forEach(f => {
      const a = axisAngles[f];
      const ex = Math.cos(a)*R, ey = Math.sin(a)*R;
      const ag = g.append('g').attr('class','sc-axis-g');

      // Concentric rings
      [0.25,0.5,0.75,1].forEach(fr => {
        ag.append('circle').attr('r',R*fr).attr('fill','none').attr('stroke','var(--border)').attr('stroke-dasharray','3,3').attr('opacity',0.4);
      });

      ag.append('line').attr('class','sc-axis')
        .attr('x1',0).attr('y1',0).attr('x2',ex).attr('y2',ey)
        .attr('stroke', FEAT_COLORS[f]).attr('stroke-opacity',0.8);

      const lr = R+20;
      ag.append('text').attr('x',Math.cos(a)*lr).attr('y',Math.sin(a)*lr+4)
        .attr('text-anchor','middle').attr('font-size',10).attr('fill',FEAT_COLORS[f]).text(f.slice(0,6));

      // Draggable cap
      const drag = d3.drag()
        .on('drag', function(ev) {
          axisAngles[f] = Math.atan2(ev.y, ev.x);
          drawAxes();
          updatePoints();
        });
      ag.append('circle').attr('class','sc-axis-cap')
        .attr('cx',ex).attr('cy',ey).attr('r',8)
        .attr('fill',FEAT_COLORS[f]).attr('stroke','var(--surface)').attr('stroke-width',1.5)
        .call(drag)
        .on('mouseover', ev => Tooltip.show(`<strong>${f}</strong>Drag to rotate axis`, ev))
        .on('mousemove', ev=>Tooltip.move(ev)).on('mouseout',()=>Tooltip.hide());
    });
  }

  function drawPoints() {
    g.selectAll('.sc-point').remove();
    const colorFn = getColorScale(State.colorBy, data);
    const pts = data.map(d => { const [px,py]=computePos(d); return {...d,px,py}; });

    g.selectAll('.sc-point').data(pts, d=>d.genres)
      .join('circle').attr('class','sc-point')
      .attr('cx',d=>d.px).attr('cy',d=>d.py)
      .attr('r', d=>Math.sqrt(d.popularity)*0.4+2)
      .attr('fill', d=>colorFn(d)).attr('opacity',.85)
      .on('mouseover', function(ev,d) {
        d3.select(this).raise().attr('r', d=>Math.sqrt(d.popularity)*0.4+5);
        Tooltip.show(makeHoverHtml(d), ev);
        makeHoverCard(document.getElementById('starInfo'), d);
        State.brush([d.genres]);
      })
      .on('mousemove', ev=>Tooltip.move(ev))
      .on('mouseout', function(ev,d) {
        d3.select(this).attr('r', d=>Math.sqrt(d.popularity)*0.4+2);
        Tooltip.hide(); State.clearBrush();
      })
      .on('click', (ev,d) => { ev.stopPropagation(); State.brush([d.genres]); });

    applyBrushState();
  }

  function updatePoints() {
    const colorFn = getColorScale(State.colorBy, data);
    g.selectAll('.sc-point').each(function(d) {
      const [px,py] = computePos(d);
      d3.select(this).attr('cx',px).attr('cy',py).attr('fill',colorFn(d));
    });
  }

  function buildToggles() {
    const el = document.getElementById('starToggles');
    el.innerHTML = '';
    FEATS.forEach(f => {
      const btn = document.createElement('button');
      btn.className = 'feat-toggle-btn' + (State.activeFeats.has(f)?'':' off');
      btn.innerHTML = `<div class="ft-dot" style="background:${FEAT_COLORS[f]}"></div>${f}`;
      btn.addEventListener('click', () => {
        if (State.activeFeats.has(f)) State.activeFeats.delete(f);
        else State.activeFeats.add(f);
        btn.classList.toggle('off');
        // also sync sidebar feature list
        document.querySelectorAll(`.feat-item[data-feat="${f}"]`).forEach(el=>{
          el.classList.toggle('off', !State.activeFeats.has(f));
          el.querySelector('.feat-check').checked = State.activeFeats.has(f);
        });
        drawAxes(); updatePoints();
        State.emit('feats', null);
      });
      el.appendChild(btn);
    });
  }

  function applyBrushState() {
    applyBrushOpacity(g.selectAll('.sc-point'));
  }

  State.on('brush', applyBrushState);
  State.on('colorBy', () => { if (data) drawPoints(); });

  return { build };
})();
