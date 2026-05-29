/* parallel.js — Parallel Coordinates with brush + drag reorder */

const Parallel = (() => {
  let svg, g, data, axes, yScales, W, H;
  let brushSelections = {};
  const M = {top:28, right:20, bottom:10, left:20};

  function build(container, _data) {
    data = _data;
    axes = [...State.parallelAxes];
    d3.select(container).select('svg').remove();
    W = container.clientWidth; H = container.clientHeight;
    svg = d3.select(container).append('svg').attr('width',W).attr('height',H);
    g = svg.append('g').attr('transform',`translate(${M.left},${M.top})`);
    redraw();
  }

  function redraw() {
    if (!data || !svg) return;
    g.selectAll('*').remove();
    brushSelections = {};
    const w = W-M.left-M.right, h = H-M.top-M.bottom;
    const xSc = d3.scalePoint().domain(axes).range([0,w]).padding(0.15);
    yScales = {};
    axes.forEach(f => {
      yScales[f] = d3.scaleLinear().domain([0, f==='loudness'||f==='tempo' ? 1 : 1]).range([h,0]);
      // use normalized fields
      const ext = d3.extent(data, d => +(d[f+'_n']??d[f]));
      yScales[f].domain(ext).nice();
    });

    const colorFn = getColorScale(State.colorBy, data);

    // Lines
    function linePath(d) {
      return d3.line()(axes.map(f => [xSc(f), yScales[f](+(d[f+'_n']??d[f])||0)]));
    }
    const lines = g.append('g').selectAll('.pc-line').data(data, d=>d.genres)
      .join('path').attr('class','pc-line')
      .attr('d', linePath)
      .attr('stroke', d=>colorFn(d))
      .attr('opacity', 0.55)
      .on('mouseover', function(ev,d) {
        d3.select(this).raise().attr('opacity',1).classed('highlighted',true);
        Tooltip.show(makeHoverHtml(d), ev);
        State.brush([d.genres]);
      })
      .on('mousemove', ev=>Tooltip.move(ev))
      .on('mouseout', function(ev,d) {
        Tooltip.hide();
        d3.select(this).classed('highlighted',false);
        State.clearBrush();
        applyBrushFilter();
      });

    // Axes (draggable)
    let dragging = {};
    const axisGs = g.selectAll('.pc-axis-g').data(axes).join('g')
      .attr('class','pc-axis-g')
      .attr('transform', f=>`translate(${xSc(f)},0)`);

    axisGs.each(function(f) {
      const ag = d3.select(this);
      // axis line
      ag.append('line').attr('class','pc-axis-line').attr('y1',0).attr('y2',h);
      // ticks
      ag.append('g').attr('class','axis')
        .call(d3.axisLeft(yScales[f]).ticks(4).tickSize(3))
        .selectAll('text').attr('x',-4).attr('dy','0.32em');
      // label (draggable to reorder)
      ag.append('text')
        .attr('y',-12).attr('text-anchor','middle')
        .attr('font-size',11).attr('font-weight',600)
        .attr('fill', FEAT_COLORS[f]||'var(--text2)').attr('cursor','grab')
        .text(f)
        .call(d3.drag()
          .on('start', function() { dragging[f] = xSc(f); })
          .on('drag', function(ev) {
            dragging[f] = Math.max(0, Math.min(w, ev.x));
            axes.sort((a,b) => (dragging[a]??xSc(a)) - (dragging[b]??xSc(b)));
            axisGs.attr('transform', ff=>`translate(${dragging[ff]??xSc(ff)},0)`);
            lines.attr('d', linePath);
          })
          .on('end', function() {
            delete dragging[f];
            State.parallelAxes = [...axes];
            axisGs.transition().duration(200).attr('transform', ff=>`translate(${xSc(ff)},0)`);
            lines.transition().duration(200).attr('d', linePath);
          })
        );

      // Brush on axis
      const br = d3.brushY()
        .extent([[-10,0],[10,h]])
        .on('brush', ({selection}) => {
          if (selection) brushSelections[f] = selection.map(yScales[f].invert);
          else delete brushSelections[f];
          applyBrushFilter();
        })
        .on('end', ({selection}) => {
          if (!selection) {
            delete brushSelections[f];
            if (Object.keys(brushSelections).length===0) State.clearBrush();
            else applyBrushFilter();
          }
        });
      ag.append('g').attr('class','pc-brush').call(br);
    });

    function applyBrushFilter() {
      const hasBr = Object.keys(brushSelections).length > 0;
      if (!hasBr) { lines.classed('dimmed',false).attr('opacity',0.55); return; }
      const active = data.filter(d => Object.entries(brushSelections).every(([f,[lo,hi]]) => {
        const v = +(d[f+'_n']??d[f])||0;
        return v >= Math.min(lo,hi) && v <= Math.max(lo,hi);
      }));
      lines.classed('dimmed', d => !active.includes(d)).attr('opacity', d => active.includes(d)?0.9:0.03);
      State.brush(active.map(d=>d.genres));
    }

    applyBrushStateLines(lines);
  }

  function applyBrushStateLines(lines) {
    const sel = lines || svg.selectAll('.pc-line');
    if (State.brushedGenres.size === 0) {
      sel.classed('dimmed',false).classed('highlighted',false).attr('opacity',0.55);
    } else {
      sel.classed('dimmed', d => !State.brushedGenres.has(d.genres))
         .classed('highlighted', d => State.brushedGenres.has(d.genres))
         .attr('opacity', d => State.brushedGenres.has(d.genres) ? 1 : 0.03);
    }
  }

  State.on('brush', () => applyBrushStateLines());
  State.on('colorBy', () => { if (data) redraw(); });

  return { build, redraw };
})();
