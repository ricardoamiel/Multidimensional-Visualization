/* main.js — Application orchestrator */
const App = {
  data: {}, initialized: {},

  async load() {
    const eps = ['genres','year','artists','network','year_trends','treemap','pca_meta'];
    const res = await Promise.all(eps.map(e=>fetch('/api/'+e).then(r=>r.json())));
    App.data.genres=res[0]; App.data.year=res[1]; App.data.artists=res[2];
    App.data.network=res[3]; App.data.year_trends=res[4]; App.data.treemap=res[5]; App.data.pca_meta=res[6];
    App.initSidebar();
    App.showView('dashboard');
  },

  showView(name) {
    document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('active',t.dataset.view===name));
    document.getElementById('view-'+name).classList.add('active');
    if (!App.initialized[name]) { App.initialized[name]=true; setTimeout(()=>App.buildView(name),50); }
  },

  buildView(name) {
    const g=App.data.genres, y=App.data.year, a=App.data.artists, yt=App.data.year_trends;
    if (name==='dashboard') {
      Projection.build(document.getElementById('projChart'), g, App.data.pca_meta);
      Parallel.build(document.getElementById('parallelChart'), g);
      Treemap.build(document.getElementById('treemapChart'), App.data.treemap);
      CorrMatrix.build(document.getElementById('corrChart'), g);
    }
    if (name==='multidim') {
      RadViz.build(document.getElementById('radvizChart'), g);
      Star.build(document.getElementById('starChart'), g);
    }
    if (name==='temporal') {
      JoyPlot.build(document.getElementById('joyChart'), y);
      ExplicitChart.build(document.getElementById('explicitChart'), yt);
      DurationChart.build(document.getElementById('durationChart'), y);
    }
    if (name==='artists') {
      Network.build(document.getElementById('networkChart'), App.data.network);
      ArtistBar.build(document.getElementById('artistBarChart'), a);
    }
  },

  initSidebar() {
    document.getElementById('themeToggle').addEventListener('click', ()=>{
      document.body.dataset.theme = document.body.dataset.theme==='dark'?'light':'dark';
    });
    document.querySelectorAll('.tab').forEach(t=>t.addEventListener('click',()=>App.showView(t.dataset.view)));

    document.querySelectorAll('.task-pill').forEach(p=>p.addEventListener('click',function(){
      document.querySelectorAll('.task-pill').forEach(x=>x.classList.remove('active'));
      this.classList.add('active');
      App.showView({clustering:'dashboard',evolution:'temporal',correlation:'multidim'}[this.dataset.task]||'dashboard');
    }));

    const fl=document.getElementById('featureList');
    fl.innerHTML='';
    FEATS.forEach(f=>{
      const el=document.createElement('label');
      el.className='feat-item'+(State.activeFeats.has(f)?'':' off'); el.dataset.feat=f;
      el.innerHTML=`<div class="feat-dot" style="background:${FEAT_COLORS[f]}"></div><span class="feat-label">${f}</span><input type="checkbox" class="feat-check" ${State.activeFeats.has(f)?'checked':''}>`;
      el.querySelector('input').addEventListener('change',e=>{
        if(e.target.checked) State.activeFeats.add(f); else State.activeFeats.delete(f);
        el.classList.toggle('off',!e.target.checked);
        State.emit('feats',null);
      });
      fl.appendChild(el);
    });

    document.getElementById('colorBy').addEventListener('change',function(){
      State.colorBy=this.value; State.emit('colorBy',this.value);
    });

    document.querySelectorAll('.proj-pill').forEach(p=>p.addEventListener('click',function(){
      document.querySelectorAll('.proj-pill').forEach(x=>x.classList.remove('active'));
      this.classList.add('active');
      State.projMode=this.dataset.proj; State.emit('projMode',this.dataset.proj);
    }));

    document.getElementById('clearBrush').addEventListener('click',()=>State.clearBrush());

    const famColors=d3.schemeTableau10;
    const fl2=document.getElementById('familyList');
    App.data.treemap.forEach((fam,i)=>{
      const el=document.createElement('div');
      el.className='fam-item';
      el.innerHTML=`<div class="fam-dot" style="background:${famColors[i%10]}"></div>${fam.family}`;
      el.addEventListener('click',()=>{
        const already=el.classList.contains('active');
        document.querySelectorAll('.fam-item').forEach(x=>x.classList.remove('active'));
        if(!already){
          el.classList.add('active');
          const tags=fam.genres.map(g=>g.name);
          const matching=App.data.genres.filter(d=>tags.includes(d.genres)).map(d=>d.genres);
          State.brush(matching.length?matching:[]);
        } else State.clearBrush();
      });
      fl2.appendChild(el);
    });

    const artistNames=App.data.artists.map(a=>a.artists);
    const input=document.getElementById('artistSearch');
    const sug=document.getElementById('suggestions');
    input.addEventListener('input',function(){
      const q=this.value.toLowerCase();
      sug.innerHTML='';
      if(!q){sug.classList.remove('open');return;}
      const matches=artistNames.filter(n=>n.toLowerCase().includes(q)).slice(0,8);
      if(!matches.length){sug.classList.remove('open');return;}
      matches.forEach(name=>{
        const div=document.createElement('div'); div.className='sug-item'; div.textContent=name;
        div.addEventListener('click',()=>{
          input.value=name; sug.classList.remove('open');
          App.showView('artists');
          setTimeout(()=>{
            const d=App.data.network.nodes.find(n=>n.artists===name)||App.data.artists.find(n=>n.artists===name);
            if(d){Network.drawRadar(d);document.getElementById('radarTitle').textContent=d.artists;document.getElementById('radarHint').textContent='';}
          },300);
        });
        sug.appendChild(div);
      });
      sug.classList.add('open');
    });
    document.addEventListener('click',e=>{
      if(!e.target.closest('.search-wrap')&&!e.target.closest('.suggestions')) sug.classList.remove('open');
    });
  }
};
window.addEventListener('load',()=>App.load());
