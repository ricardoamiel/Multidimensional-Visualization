/* projection.js — PCA / t-SNE / UMAP scatterplot */

const Projection = (() => {
  let svg, g, zoom, xSc, ySc, colorFn, data, meta;
  let W, H;
  const M = {top:20, right:20, bottom:40, left:40};

  function getXY(d) {
    const m = State.projMode;
    return [d[m+'_x'], d[m+'_y']];
  }

  function build(container, _data, _meta) {
    data = _data; meta = _meta;
    d3.select(container).select('svg').remove();
    W = container.clientWidth; H = container.clientHeight;
    const w = W-M.left-M.right, h = H-M.top-M.bottom;

    svg = d3.select(container).append('svg').attr('width',W).attr('height',H);
    const defs = svg.append('defs');
    defs.append('clipPath').attr('id','proj-clip').append('rect').attr('width',w).attr('height',h);

    const root = svg.append('g').attr('transform',`translate(${M.left},${M.top})`);
    g = root.append('g').attr('clip-path','url(#proj-clip)');

    // Axes placeholders
    root.append('g').attr('class','axis x-axis').attr('transform',`translate(0,${h})`);
    root.append('g').attr('class','axis y-axis');
    // Axis labels
    root.append('text').attr('class','ax-label x-lbl').attr('x',w/2).attr('y',h+34).attr('text-anchor','middle').attr('font-size',10).attr('fill','var(--text3)');
    root.append('text').attr('class','ax-label y-lbl').attr('transform','rotate(-90)').attr('x',-h/2).attr('y',-28).attr('text-anchor','middle').attr('font-size',10).attr('fill','var(--text3)');

    zoom = d3.zoom().scaleExtent([0.3,12]).on('zoom', e => {
      g.attr('transform', e.transform);
    });
    svg.call(zoom);

    // Brush
    const brush = d3.brush()
      .extent([[0,0],[w,h]])
      .on('start', () => g.attr('pointer-events','none'))
      .on('end', ({selection}) => {
        g.attr('pointer-events','all');
        if (!selection) { State.clearBrush(); return; }
        const [[x0,y0],[x1,y1]] = selection;
        const sel = data.filter(d => {
          const [px,py] = getXY(d);
          return xSc(px)>=x0 && xSc(px)<=x1 && ySc(py)>=y0 && ySc(py)<=y1;
        });
        State.brush(sel.map(d=>d.genres));
        svg.select('.brush-layer').call(brush.move, null);
      });
    root.append('g').attr('class','brush-layer').call(brush);

    redraw();
    buildLegend();
  }

  function redraw() {
    if (!data) return;
    const m = State.projMode;
    const w = W-M.left-M.right, h = H-M.top-M.bottom;

    xSc = d3.scaleLinear().domain(d3.extent(data, d=>d[m+'_x'])).nice().range([0,w]);
    ySc = d3.scaleLinear().domain(d3.extent(data, d=>d[m+'_y'])).nice().range([h,0]);
    colorFn = getColorScale(State.colorBy, data);

    svg.select('.x-axis').transition().duration(400).call(d3.axisBottom(xSc).ticks(5).tickSize(-h)).select('.domain').remove();
    svg.select('.y-axis').transition().duration(400).call(d3.axisLeft(ySc).ticks(5).tickSize(-w)).select('.domain').remove();
    svg.selectAll('.x-axis .tick line, .y-axis .tick line').attr('stroke','var(--border)').attr('stroke-dasharray','3,3');

    // Axis labels
    svg.select('.x-lbl').text(m==='pca'?`PC1 (${(meta?.explained?.[0]*100||0).toFixed(1)}%)`:m.toUpperCase()+' 1');
    svg.select('.y-lbl').text(m==='pca'?`PC2 (${(meta?.explained?.[1]*100||0).toFixed(1)}%)`:m.toUpperCase()+' 2');

    const pts = g.selectAll('.proj-point').data(data, d=>d.genres);
    pts.enter().append('circle').attr('class','proj-point')
      .attr('cx', d=>xSc(d[m+'_x'])).attr('cy', d=>ySc(d[m+'_y']))
      .attr('r', 0).attr('fill', d=>colorFn(d)).attr('opacity',.85)
      .on('mouseover', function(ev,d) {
        d3.select(this).attr('r',8);
        Tooltip.show(makeHoverHtml(d), ev);
        State.brush([d.genres]);
      })
      .on('mousemove', ev=>Tooltip.move(ev))
      .on('mouseout', function(ev,d) {
        d3.select(this).attr('r',5);
        Tooltip.hide();
        State.clearBrush();
      })
      .on('click', (ev,d) => { ev.stopPropagation(); State.brush([d.genres]); })
      .transition().duration(500).attr('r', d=>Math.sqrt(d.popularity)*0.45+2.5);

    pts.transition().duration(500)
      .attr('cx', d=>xSc(d[m+'_x'])).attr('cy', d=>ySc(d[m+'_y']))
      .attr('fill', d=>colorFn(d)).attr('r', d=>Math.sqrt(d.popularity)*0.45+2.5);

    pts.exit().transition().duration(300).attr('r',0).remove();

    applyBrushState();
  }

  function applyBrushState() {
    applyBrushOpacity(g.selectAll('.proj-point'));
  }

  function buildLegend() {
    const el = document.getElementById('projLegend');
    el.innerHTML = '';
    if (State.colorBy === 'cluster') {
      Object.entries(CLUSTER_NAMES).forEach(([k,name]) => {
        const item = document.createElement('div');
        item.className = 'legend-item';
        item.innerHTML = `<div class="legend-dot" style="background:${CLUSTER_COLORS[k]}"></div>${name}`;
        item.addEventListener('click', () => {
          const genres = data.filter(d=>d.cluster==k).map(d=>d.genres);
          State.brush(genres);
        });
        el.appendChild(item);
      });
    } else {
      const ext = d3.extent(data, d=>d[State.colorBy]);
      const scale = d3.scaleSequential(d3.interpolateTurbo).domain(ext);
      const steps = 5;
      for (let i=0;i<=steps;i++) {
        const v = ext[0] + (ext[1]-ext[0])*(i/steps);
        const item = document.createElement('div');
        item.className = 'legend-item';
        item.innerHTML = `<div class="legend-dot" style="background:${scale(v)}"></div>${v.toFixed(2)}`;
        el.appendChild(item);
      }
    }
  }

  State.on('brush', () => applyBrushState());
  State.on('colorBy', () => { if (data) { redraw(); buildLegend(); } });
  State.on('projMode', () => {
    document.getElementById('projTitle').textContent =
      State.projMode==='pca' ? 'PCA · Genre space' :
      State.projMode==='tsne' ? 't-SNE · Genre space' : 'UMAP · Genre space';
    if (data) redraw();
  });

  return { build, redraw };
})();
