/* treemap.js — Treemap + Correlation matrix */

const Treemap = (() => {
  let svg, data, selected=null;
  const FAM_COLORS = d3.schemeTableau10;

  function build(container, _data) {
    data = _data;
    d3.select(container).select('svg').remove();
    const W = container.clientWidth, H = container.clientHeight;

    const root = d3.hierarchy({name:'root', children: data})
      .sum(d => d.count||0).sort((a,b)=>b.value-a.value);
    d3.treemap().size([W,H]).padding(2).paddingTop(0)(root);

    svg = d3.select(container).append('svg').attr('width',W).attr('height',H);

    const cells = svg.selectAll('.tm-cell').data(root.leaves()).join('g')
      .attr('class','tm-cell')
      .attr('transform', d=>`translate(${d.x0},${d.y0})`);

    cells.append('rect')
      .attr('width', d=>d.x1-d.x0).attr('height', d=>d.y1-d.y0)
      .attr('fill', d=>FAM_COLORS[root.leaves().indexOf(d)%10])
      .attr('rx',3);

    cells.each(function(d) {
      const cw=d.x1-d.x0, ch=d.y1-d.y0;
      if (cw>50 && ch>20) {
        d3.select(this).append('text')
          .attr('x',4).attr('y',14).attr('fill','white').attr('font-size',Math.min(11,cw/8)+'px')
          .attr('font-weight',600)
          .text(d.data.family.length>cw/7?d.data.family.slice(0,Math.floor(cw/7))+'…':d.data.family);
        if (ch>32) {
          d3.select(this).append('text')
            .attr('x',4).attr('y',26).attr('fill','rgba(255,255,255,0.7)').attr('font-size',9+'px')
            .text(d.data.count.toLocaleString()+' tags');
        }
      }
    });

    cells.on('mouseover', function(ev,d) {
      d3.select(this).select('rect').attr('opacity',0.85);
      Tooltip.show(`<strong>${d.data.family}</strong>Tag count: ${d.data.count.toLocaleString()}<br>Avg popularity: ${d.data.avg_pop}`, ev);
    })
    .on('mousemove', ev=>Tooltip.move(ev))
    .on('mouseout', function() { d3.select(this).select('rect').attr('opacity',1); Tooltip.hide(); })
    .on('click', function(ev,d) {
      const alreadySel = selected===d.data.family;
      selected = alreadySel ? null : d.data.family;
      svg.selectAll('.tm-cell').classed('selected', dd=>dd.data.family===selected);
      State.selectedFamily = selected;
      State.emit('family', selected);
    });
  }
  return { build };
})();


const CorrMatrix = (() => {
  let svg;
  const FEATS7 = ['danceability','energy','valence','acousticness','speechiness','instrumentalness','liveness'];

  function build(container, data) {
    d3.select(container).select('svg').remove();
    const W = container.clientWidth, H = container.clientHeight;
    const n = FEATS7.length;
    const M = {top:50, right:10, bottom:10, left:80};
    const side = Math.min((W-M.left-M.right)/n, (H-M.top-M.bottom)/n);
    const gW = side*n, gH = side*n;

    // Compute correlations
    const corr = [];
    FEATS7.forEach((fi,i) => FEATS7.forEach((fj,j) => {
      const xi = data.map(d=>+d[fi]||0), xj = data.map(d=>+d[fj]||0);
      const mx=d3.mean(xi), my=d3.mean(xj);
      const num=d3.sum(xi.map((v,k)=>(v-mx)*(xj[k]-my)));
      const den=Math.sqrt(d3.sum(xi.map(v=>(v-mx)**2))*d3.sum(xj.map(v=>(v-my)**2)));
      corr.push({i:fi,j:fj,r:den>0?num/den:0});
    }));

    const color = d3.scaleDiverging(d3.interpolateRdYlGn).domain([-1,0,1]);
    svg = d3.select(container).append('svg').attr('width',W).attr('height',H);
    const g = svg.append('g').attr('transform',`translate(${M.left},${M.top})`);

    // X labels
    FEATS7.forEach((f,i) => {
      g.append('text').attr('x',i*side+side/2).attr('y',-8).attr('text-anchor','middle')
        .attr('font-size',9).attr('fill',FEAT_COLORS[f]||'var(--text3)')
        .attr('transform',`rotate(-35,${i*side+side/2},-8)`)
        .text(f.slice(0,6));
    });
    // Y labels
    FEATS7.forEach((f,i) => {
      g.append('text').attr('x',-4).attr('y',i*side+side/2+4).attr('text-anchor','end')
        .attr('font-size',9).attr('fill',FEAT_COLORS[f]||'var(--text3)').text(f.slice(0,6));
    });

    const cells = g.selectAll('.corr-cell').data(corr).join('g').attr('class','corr-cell')
      .attr('transform', d=>`translate(${FEATS7.indexOf(d.i)*side},${FEATS7.indexOf(d.j)*side})`);

    cells.append('rect').attr('width',side-1).attr('height',side-1).attr('rx',2)
      .attr('fill', d=>color(d.r)).attr('opacity',.9);

    cells.each(function(d) {
      if (side > 22) {
        d3.select(this).append('text').attr('x',side/2).attr('y',side/2+3.5)
          .attr('text-anchor','middle').attr('font-size',8)
          .attr('fill', Math.abs(d.r)>0.45?'rgba(0,0,0,0.8)':'rgba(255,255,255,0.7)')
          .text(d.r.toFixed(2));
      }
    });

    cells.on('mouseover', function(ev,d) {
      d3.select(this).select('rect').attr('opacity',.7);
      Tooltip.show(`<strong>${d.i} × ${d.j}</strong>r = ${d.r.toFixed(3)}`, ev);
    })
    .on('mousemove', ev=>Tooltip.move(ev))
    .on('mouseout', function() { d3.select(this).select('rect').attr('opacity',.9); Tooltip.hide(); });
  }
  return { build };
})();
