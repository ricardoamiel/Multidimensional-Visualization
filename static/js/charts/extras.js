/* extras.js — Explicit rate chart, Duration/Loudness dual-axis, Artist bar */

const ExplicitChart = (() => {
  function build(container, data) {
    d3.select(container).select('svg').remove();
    const W=container.clientWidth, H=container.clientHeight;
    const M={top:16,right:50,bottom:36,left:44};
    const w=W-M.left-M.right, h=H-M.top-M.bottom;
    const d2 = data.filter(d=>d.year>=2000);

    const svg = d3.select(container).append('svg').attr('width',W).attr('height',H);
    const g = svg.append('g').attr('transform',`translate(${M.left},${M.top})`);

    const xSc = d3.scaleLinear().domain([2000,2020]).range([0,w]);
    const ySc = d3.scaleLinear().domain([0, d3.max(d2,d=>d.explicit_rate||0)*1.05]).range([h,0]);

    g.append('g').attr('class','grid').call(d3.axisLeft(ySc).ticks(4).tickSize(-w).tickFormat(''));
    g.append('g').attr('class','axis').attr('transform',`translate(0,${h})`).call(d3.axisBottom(xSc).tickFormat(d3.format('d')).ticks(10));
    g.append('g').attr('class','axis').call(d3.axisLeft(ySc).ticks(4).tickFormat(d3.format('.0%')));

    const area = d3.area().x(d=>xSc(d.year)).y0(h).y1(d=>ySc(d.explicit_rate||0)).curve(d3.curveCatmullRom);
    const line = d3.line().x(d=>xSc(d.year)).y(d=>ySc(d.explicit_rate||0)).curve(d3.curveCatmullRom);

    g.append('path').datum(d2).attr('d',area).attr('fill','#fd79a8').attr('opacity',.2);
    g.append('path').datum(d2).attr('d',line).attr('fill','none').attr('stroke','#fd79a8').attr('stroke-width',2.5);

    // Annotation 2020
    const last = d2[d2.length-1];
    if (last) {
      g.append('circle').attr('cx',xSc(last.year)).attr('cy',ySc(last.explicit_rate||0)).attr('r',5).attr('fill','#fd79a8');
      g.append('text').attr('x',xSc(last.year)+8).attr('y',ySc(last.explicit_rate||0)+4)
        .attr('font-size',10).attr('fill','#fd79a8').text(d3.format('.0%')(last.explicit_rate||0));
    }

    g.append('text').attr('x',w/2).attr('y',h+30).attr('text-anchor','middle').attr('font-size',10).attr('fill','var(--text3)').text('Year');
    g.append('text').attr('transform','rotate(-90)').attr('x',-h/2).attr('y',-32).attr('text-anchor','middle').attr('font-size',10).attr('fill','#fd79a8').text('% explicit tracks');

    // Hover
    g.append('rect').attr('width',w).attr('height',h).attr('fill','none').attr('pointer-events','all')
      .on('mousemove', function(ev) {
        const [mx]=d3.pointer(ev);
        const year=Math.round(xSc.invert(mx));
        const row=d2.find(d=>d.year===year)||d2.reduce((a,b)=>Math.abs(b.year-year)<Math.abs(a.year-year)?b:a);
        if (!row) return;
        Tooltip.show(`<strong>${row.year}</strong>Explicit rate: ${d3.format('.1%')(row.explicit_rate||0)}<br>Tracks: ${(row.n_tracks||0).toLocaleString()}`, ev);
      }).on('mouseleave',()=>Tooltip.hide());
  }
  return {build};
})();


const DurationChart = (() => {
  function build(container, data) {
    d3.select(container).select('svg').remove();
    const W=container.clientWidth, H=container.clientHeight;
    const M={top:16,right:52,bottom:36,left:46};
    const w=W-M.left-M.right, h=H-M.top-M.bottom;
    const d2 = data.filter(d=>d.year>=1960);

    const svg = d3.select(container).append('svg').attr('width',W).attr('height',H);
    const g = svg.append('g').attr('transform',`translate(${M.left},${M.top})`);

    const xSc = d3.scaleLinear().domain([1960,2020]).range([0,w]);
    const yDur = d3.scaleLinear().domain(d3.extent(d2,d=>d.duration_min||0)).nice().range([h,0]);
    const yLoud = d3.scaleLinear().domain(d3.extent(data,d=>d.loudness)).nice().range([h,0]);

    g.append('g').attr('class','grid').call(d3.axisLeft(yDur).ticks(4).tickSize(-w).tickFormat(''));
    g.append('g').attr('class','axis').attr('transform',`translate(0,${h})`).call(d3.axisBottom(xSc).tickFormat(d3.format('d')).ticks(8));
    g.append('g').attr('class','axis').call(d3.axisLeft(yDur).ticks(4).tickFormat(d=>d.toFixed(1)+'m'));
    g.append('g').attr('class','axis').attr('transform',`translate(${w},0)`).call(d3.axisRight(yLoud).ticks(4).tickFormat(d=>d+'dB'));

    ['duration_min','loudness'].forEach((key,idx) => {
      const yS = idx===0?yDur:yLoud;
      const col = idx===0?'#3d91ff':'#ffd166';
      const area = d3.area().x(d=>xSc(d.year)).y0(h).y1(d=>yS(d[key]||0)).curve(d3.curveCatmullRom).defined(d=>d[key]!=null);
      const line = d3.line().x(d=>xSc(d.year)).y(d=>yS(d[key]||0)).curve(d3.curveCatmullRom).defined(d=>d[key]!=null);
      g.append('path').datum(idx===0?d2:data).attr('d',area).attr('fill',col).attr('opacity',.12);
      g.append('path').datum(idx===0?d2:data).attr('d',line).attr('fill','none').attr('stroke',col).attr('stroke-width',2);
      g.append('text').attr('x',idx===0?8:w-8).attr('y',12).attr('text-anchor',idx===0?'start':'end').attr('font-size',9).attr('fill',col).text(idx===0?'Duration (min)':'Loudness (dB)');
    });

    g.append('rect').attr('width',w).attr('height',h).attr('fill','none').attr('pointer-events','all')
      .on('mousemove', function(ev) {
        const [mx]=d3.pointer(ev);
        const yr=Math.round(xSc.invert(mx));
        const row=(yr>=1960?d2:data).find(d=>d.year===yr)||data.reduce((a,b)=>Math.abs(b.year-yr)<Math.abs(a.year-yr)?b:a);
        if (!row) return;
        Tooltip.show(`<strong>${row.year}</strong>Duration: ${(row.duration_min||0).toFixed(2)}m<br>Loudness: ${(row.loudness||0).toFixed(1)}dB`, ev);
      }).on('mouseleave',()=>Tooltip.hide());
  }
  return {build};
})();


const ArtistBar = (() => {
  let svg, data;
  function build(container, _data) {
    data = _data;
    d3.select(container).select('svg').remove();
    const top20 = data.slice(0,20);
    const W=container.clientWidth, H=container.clientHeight;
    const M={top:6,right:50,bottom:6,left:130};
    const w=W-M.left-M.right, h=H-M.top-M.bottom;
    const bH = h/top20.length - 2;

    svg = d3.select(container).append('svg').attr('width',W).attr('height',H);
    const g = svg.append('g').attr('transform',`translate(${M.left},${M.top})`);

    const xSc = d3.scaleLinear().domain([0,100]).range([0,w]);
    const ySc = d3.scaleBand().domain(top20.map(d=>d.artists)).range([0,h]).padding(0.2);
    const color = d3.scaleSequential(d3.interpolateViridis).domain([0,top20.length-1]);

    g.append('g').attr('class','axis').call(d3.axisLeft(ySc).tickSize(0))
      .selectAll('text').attr('font-size',10).attr('fill','var(--text2)');

    const bars = g.selectAll('.bar-rect').data(top20).join('rect')
      .attr('class','bar-rect').attr('y',d=>ySc(d.artists))
      .attr('height',ySc.bandwidth()).attr('x',0).attr('width',0)
      .attr('fill',(d,i)=>color(i)).attr('rx',3)
      .on('mouseover', function(ev,d) {
        d3.select(this).attr('opacity',.8);
        Tooltip.show(`<strong>${d.artists}</strong>Popularity: ${(d.popularity||0).toFixed(0)}<br>Tracks: ${d.count||'?'}`, ev);
        if (Network && Network.focusArtist) Network.focusArtist(d.artists);
      })
      .on('mousemove', ev=>Tooltip.move(ev))
      .on('mouseout', function() { d3.select(this).attr('opacity',1); Tooltip.hide(); })
      .on('click', function(ev,d) {
        State.selectedArtist = d;
        if (Network && Network.drawRadar) Network.drawRadar(d);
        document.getElementById('radarTitle').textContent = d.artists;
        document.getElementById('radarHint').textContent = '';
      });

    bars.transition().duration(600).delay((d,i)=>i*25).attr('width',d=>xSc(d.popularity||0));

    g.selectAll('.bar-val').data(top20).join('text').attr('class','bar-val bar-label')
      .attr('x',d=>xSc(d.popularity||0)+4).attr('y',d=>ySc(d.artists)+ySc.bandwidth()/2+4)
      .attr('font-size',9).attr('fill','var(--text3)').text(d=>(d.popularity||0).toFixed(0));
  }
  return {build};
})();
