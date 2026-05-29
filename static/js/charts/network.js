/* network.js — Force-directed Artist Ego Network */

const Network = (() => {
  let svg, g, sim, nodeEls, linkEls, netData;
  let W, H;

  function build(container, _data) {
    netData = _data;
    d3.select(container).select('svg').remove();
    W = container.clientWidth; H = container.clientHeight;

    svg = d3.select(container).append('svg').attr('width',W).attr('height',H);
    svg.call(d3.zoom().scaleExtent([0.2,4]).on('zoom', e=>g.attr('transform',e.transform)));
    g = svg.append('g');

    const nodes = netData.nodes.map(d=>({...d}));
    const nodeMap = Object.fromEntries(nodes.map(n=>[n.artists,n]));
    const links = netData.edges
      .filter(e=>nodeMap[e.source]&&nodeMap[e.target])
      .map(e=>({...e, source:nodeMap[e.source], target:nodeMap[e.target]}));

    const colorFn = d3.scaleOrdinal(d3.schemeTableau10);

    linkEls = g.append('g').selectAll('.net-link').data(links).join('line')
      .attr('class','net-link')
      .attr('stroke-width', d=>Math.min(d.weight,4));

    nodeEls = g.append('g').selectAll('.net-node').data(nodes).join('g')
      .attr('class','net-node')
      .call(d3.drag()
        .on('start', (ev,d)=>{ if(!ev.active) sim.alphaTarget(0.3).restart(); d.fx=d.x; d.fy=d.y; })
        .on('drag',  (ev,d)=>{ d.fx=ev.x; d.fy=ev.y; })
        .on('end',   (ev,d)=>{ if(!ev.active) sim.alphaTarget(0); d.fx=null; d.fy=null; }));

    const rScale = d3.scaleSqrt().domain([0,100]).range([4,20]);

    nodeEls.append('circle')
      .attr('r', d=>rScale(d.popularity||0))
      .attr('fill', d=>colorFn(d.primary_genre||'unknown'))
      .attr('stroke', 'var(--surface)').attr('stroke-width',1.5).attr('opacity',.9)
      .on('mouseover', function(ev,d) {
        d3.select(this.parentNode).raise();
        showNodeHighlight(d, nodes, links, linkEls, nodeEls);
        Tooltip.show(`<strong>${d.artists}</strong>Popularity: ${(d.popularity||0).toFixed(0)}<br>Genre: ${d.primary_genre||'—'}<br>Tracks: ${d.count||'?'}`, ev);
      })
      .on('mousemove', ev=>Tooltip.move(ev))
      .on('mouseout', function() {
        Tooltip.hide();
        resetHighlight(linkEls, nodeEls);
      })
      .on('click', function(ev,d) {
        ev.stopPropagation();
        State.selectedArtist = d;
        drawRadar(d);
        document.getElementById('radarTitle').textContent = d.artists;
        document.getElementById('radarHint').textContent = '';
      });

    nodeEls.append('text')
      .attr('dy', d=>rScale(d.popularity||0)+11)
      .attr('text-anchor','middle').attr('opacity',0)
      .text(d=>d.artists.slice(0,14));

    sim = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d=>d.artists).distance(60).strength(0.3))
      .force('charge', d3.forceManyBody().strength(-70))
      .force('center', d3.forceCenter(W/2, H/2))
      .force('collision', d3.forceCollide(d=>rScale(d.popularity||0)+4));

    sim.on('tick', () => {
      linkEls.attr('x1',d=>d.source.x).attr('y1',d=>d.source.y)
             .attr('x2',d=>d.target.x).attr('y2',d=>d.target.y);
      nodeEls.attr('transform',d=>`translate(${d.x},${d.y})`);
    });
  }

  function showNodeHighlight(d, nodes, links, linkEls, nodeEls) {
    const connected = new Set([d.artists]);
    links.forEach(l=>{
      if(l.source.artists===d.artists||l.target.artists===d.artists){
        connected.add(l.source.artists); connected.add(l.target.artists);
      }
    });
    nodeEls.attr('opacity', n=>connected.has(n.artists)?1:0.15);
    nodeEls.select('text').attr('opacity', n=>connected.has(n.artists)?1:0);
    linkEls.classed('highlighted', l=>l.source.artists===d.artists||l.target.artists===d.artists)
           .attr('opacity', l=>(l.source.artists===d.artists||l.target.artists===d.artists)?1:0.05);
  }

  function resetHighlight(linkEls, nodeEls) {
    nodeEls.attr('opacity',1);
    nodeEls.select('text').attr('opacity',0);
    linkEls.classed('highlighted',false).attr('opacity',0.4);
  }

  function focusArtist(name) {
    if (!nodeEls) return;
    const node = netData.nodes.find(n=>n.artists===name);
    if (!node) return;
    const links = netData.edges.filter(e=>e.source===name||e.target===name);
    const related = new Set([name, ...links.flatMap(e=>[e.source,e.target])]);
    State.brush([...related].map(a=>a));
  }

  function drawRadar(d) {
    const container = document.getElementById('radarChart');
    d3.select(container).select('svg').remove();
    const W2 = container.clientWidth, H2 = container.clientHeight;
    const R2 = Math.min(W2,H2)/2-40, cx2=W2/2, cy2=H2/2;
    const feats4 = FEATS.slice(0,5);
    const n = feats4.length;
    const angles = feats4.map((_,i)=>(2*Math.PI*i/n)-Math.PI/2);
    const svg2 = d3.select(container).append('svg').attr('width',W2).attr('height',H2);
    const g2 = svg2.append('g').attr('transform',`translate(${cx2},${cy2})`);

    [0.25,0.5,0.75,1].forEach(fr=>g2.append('circle').attr('class','radar-web').attr('r',R2*fr));
    angles.forEach((a,i)=>{
      g2.append('line').attr('class','radar-spoke').attr('x1',0).attr('y1',0)
        .attr('x2',Math.cos(a)*R2).attr('y2',Math.sin(a)*R2);
      g2.append('text').attr('x',Math.cos(a)*(R2+14)).attr('y',Math.sin(a)*(R2+14)+4)
        .attr('text-anchor','middle').attr('font-size',9).attr('fill',FEAT_COLORS[feats4[i]])
        .text(feats4[i].slice(0,6));
    });

    const pts = feats4.map((f,i)=>[
      Math.cos(angles[i])*R2*(+(d[f+'_n']??d[f])||0),
      Math.sin(angles[i])*R2*(+(d[f+'_n']??d[f])||0)
    ]);
    const poly = [...pts,pts[0]].map(p=>p.join(',')).join(' ');
    g2.append('polygon').attr('class','radar-area').attr('points',poly).attr('fill','#1DB954').attr('stroke','#1DB954').attr('stroke-width',2);
    pts.forEach((p,i)=>{
      g2.append('circle').attr('cx',p[0]).attr('cy',p[1]).attr('r',4)
        .attr('fill',FEAT_COLORS[feats4[i]]).attr('stroke','var(--surface)').attr('stroke-width',1.5);
      g2.append('text').attr('x',p[0]+(p[0]>0?8:-8)).attr('y',p[1]+4)
        .attr('text-anchor',p[0]>0?'start':'end').attr('font-size',9).attr('fill','var(--text2)')
        .text(fmtVal(d[feats4[i]]||0));
    });
  }

  return { build, focusArtist, drawRadar };
})();
