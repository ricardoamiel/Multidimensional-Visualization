/* joyplot.js — Ridge / Joy Plot for 100 years of features */

const JoyPlot = (() => {
  let svg, data;
  const M = {top:10, right:60, bottom:36, left:58};
  const SERIES = [
    {key:'danceability',   label:'Danceability',   color:'#1DB954'},
    {key:'energy',         label:'Energy',         color:'#ff6b6b'},
    {key:'valence',        label:'Valence',        color:'#ffd166'},
    {key:'acousticness',   label:'Acousticness',   color:'#06d6a0'},
    {key:'speechiness',    label:'Speechiness',    color:'#a29bfe'},
    {key:'explicit_rate',  label:'Explicit rate',  color:'#fd79a8'},
    {key:'loudness_n',     label:'Loudness (norm)',color:'#fdcb6e'},
  ];

  function build(container, _data) {
    data = _data;
    d3.select(container).select('svg').remove();
    const W = container.clientWidth, H = container.clientHeight;
    const w = W-M.left-M.right, h = H-M.top-M.bottom;
    const n = SERIES.length;
    const rowH = h / n;
    const overlap = rowH * 0.55;

    svg = d3.select(container).append('svg').attr('width',W).attr('height',H);
    const root = svg.append('g').attr('transform',`translate(${M.left},${M.top})`);

    const xSc = d3.scaleLinear().domain([1921,2020]).range([0,w]);
    root.append('g').attr('class','axis').attr('transform',`translate(0,${h})`)
      .call(d3.axisBottom(xSc).tickFormat(d3.format('d')).ticks(10));
    root.append('text').attr('x',w/2).attr('y',h+30).attr('text-anchor','middle').attr('font-size',10).attr('fill','var(--text3)').text('Year');

    // Hover line
    const hoverLine = root.append('line').attr('class','joy-hover-line').attr('y1',0).attr('y2',h).style('display','none');

    // Each series
    SERIES.forEach((s, i) => {
      const vals = data.map(d => d[s.key] ?? 0).filter(v=>!isNaN(v));
      const ext = d3.extent(vals);
      const ySc = d3.scaleLinear().domain(ext).range([rowH*0.85, 0]);
      const yOff = i * rowH;

      const sg = root.append('g').attr('transform',`translate(0,${yOff})`);

      const area = d3.area()
        .x(d => xSc(d.year))
        .y0(ySc(ext[0]))
        .y1(d => ySc(d[s.key]??ext[0]))
        .curve(d3.curveCatmullRom.alpha(0.5))
        .defined(d => d[s.key]!=null && !isNaN(d[s.key]));

      const line = d3.line()
        .x(d => xSc(d.year))
        .y(d => ySc(d[s.key]??ext[0]))
        .curve(d3.curveCatmullRom.alpha(0.5))
        .defined(d => d[s.key]!=null && !isNaN(d[s.key]));

      sg.append('path').datum(data).attr('class','joy-area').attr('d',area).attr('fill',s.color);
      sg.append('path').datum(data).attr('class','joy-line').attr('d',line).attr('stroke',s.color);

      // Y mini-axis
      sg.append('g').attr('class','axis')
        .call(d3.axisLeft(ySc).ticks(2).tickSize(3))
        .selectAll('text').attr('font-size',8).attr('fill','var(--text3)');

      // label
      sg.append('text').attr('class','joy-label')
        .attr('x',-4).attr('y',ySc(ext[1])+4)
        .attr('text-anchor','end').attr('font-size',10).attr('fill',s.color).attr('font-weight',600)
        .text(s.label);
    });

    // Hover overlay
    root.append('rect').attr('width',w).attr('height',h).attr('fill','none').attr('pointer-events','all')
      .on('mousemove', function(ev) {
        const [mx] = d3.pointer(ev);
        const year = Math.round(xSc.invert(mx));
        const row = data.find(d=>d.year===year) || data.reduce((a,b)=>Math.abs(b.year-year)<Math.abs(a.year-year)?b:a);
        if (!row) return;
        hoverLine.style('display',null).attr('x1',xSc(row.year)).attr('x2',xSc(row.year));
        const html = `<strong>${row.year}</strong>` + SERIES.map(s=>`<div class="tt-row"><span style="color:${s.color}">${s.label}</span><span>${fmtVal(row[s.key]??0)}</span></div>`).join('');
        Tooltip.show(html, ev);
      })
      .on('mouseleave', () => { hoverLine.style('display','none'); Tooltip.hide(); });
  }

  return { build };
})();
