/* radviz.js — RadViz with draggable anchors */

const RadViz = (() => {
  let svg, g, data, W, H, R, cx, cy;
  let anchors = {};  // feature -> {x, y, angle}

  function build(container, _data) {
    data = _data;
    d3.select(container).select('svg').remove();
    W = container.clientWidth; H = container.clientHeight;
    R = Math.min(W, H)/2 - 50;
    cx = W/2; cy = H/2;

    svg = d3.select(container).append('svg').attr('width',W).attr('height',H);
    g = svg.append('g').attr('transform',`translate(${cx},${cy})`);

    initAnchors();
    drawStatic();
    drawPoints();
  }

  function initAnchors() {
    const feats = FEATS.filter(f => State.activeFeats.has(f));
    feats.forEach((f,i) => {
      const angle = (2*Math.PI*i/feats.length) - Math.PI/2;
      anchors[f] = { angle, x: Math.cos(angle)*R, y: Math.sin(angle)*R };
    });
  }

  function computePos(d) {
    let sx=0, sy=0, sw=0;
    FEATS.forEach(f => {
      if (!State.activeFeats.has(f) || !anchors[f]) return;
      const v = +(d[f+'_n']??0);
      sx += v * anchors[f].x;
      sy += v * anchors[f].y;
      sw += v;
    });
    return sw > 0 ? [sx/sw, sy/sw] : [0, 0];
  }

  function drawStatic() {
    g.selectAll('.rv-static').remove();
    // outer circle
    g.append('circle').attr('class','rv-circle rv-static').attr('r',R);
    // inner rings
    [0.25,0.5,0.75].forEach(fr =>
      g.append('circle').attr('class','rv-circle rv-static').attr('r',R*fr).style('opacity',0.3)
    );
    // spokes & anchors
    FEATS.filter(f=>State.activeFeats.has(f)).forEach(f => {
      const a = anchors[f]; if (!a) return;
      g.append('line').attr('class','rv-spoke rv-static')
        .attr('x1',0).attr('y1',0).attr('x2',a.x).attr('y2',a.y);
      // label
      const lr = R+20;
      g.append('text').attr('class','rv-static')
        .attr('x', Math.cos(a.angle)*lr).attr('y', Math.sin(a.angle)*lr+4)
        .attr('text-anchor','middle').attr('font-size',10).attr('fill', FEAT_COLORS[f])
        .text(f.slice(0,6));
      // draggable anchor dot
      const drag = d3.drag()
        .on('drag', function(ev) {
          const nx = ev.x, ny = ev.y;
          const ang = Math.atan2(ny, nx);
          anchors[f].angle = ang;
          anchors[f].x = Math.cos(ang)*R;
          anchors[f].y = Math.sin(ang)*R;
          drawStatic();
          updatePoints();
        });
      g.append('circle').attr('class','rv-anchor rv-static')
        .attr('cx',a.x).attr('cy',a.y).attr('r',7)
        .attr('fill', FEAT_COLORS[f]).attr('stroke','var(--surface)').attr('stroke-width',1.5)
        .call(drag)
        .on('mouseover', ev => Tooltip.show(`<strong>${f}</strong>Drag to reposition anchor`, ev))
        .on('mousemove', ev=>Tooltip.move(ev)).on('mouseout', ()=>Tooltip.hide());
    });
  }

  function drawPoints() {
    g.selectAll('.rv-point').remove();
    const colorFn = getColorScale(State.colorBy, data);
    const pts = data.map(d => { const [px,py]=computePos(d); return {...d, px, py}; });

    g.selectAll('.rv-point').data(pts, d=>d.genres)
      .join('circle').attr('class','rv-point')
      .attr('cx',d=>d.px).attr('cy',d=>d.py)
      .attr('r', d=>Math.sqrt(d.popularity)*0.4+2)
      .attr('fill', d=>colorFn(d)).attr('opacity',.85)
      .on('mouseover', function(ev,d) {
        d3.select(this).raise().attr('r', d=>Math.sqrt(d.popularity)*0.4+5);
        Tooltip.show(makeHoverHtml(d), ev);
        makeHoverCard(document.getElementById('radvizInfo'), d);
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
    g.selectAll('.rv-point').each(function(d) {
      const [px,py] = computePos(d);
      d3.select(this).attr('cx',px).attr('cy',py).attr('fill',colorFn(d));
    });
  }

  function applyBrushState() {
    applyBrushOpacity(g.selectAll('.rv-point'));
  }

  State.on('brush', applyBrushState);
  State.on('colorBy', () => { if (data) { drawPoints(); } });
  State.on('feats', () => { if (data) { initAnchors(); drawStatic(); drawPoints(); } });

  return { build };
})();
