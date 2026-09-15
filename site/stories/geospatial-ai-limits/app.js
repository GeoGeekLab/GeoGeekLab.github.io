(() => {
  const story=document.getElementById('story');
  const pages=[...document.querySelectorAll('.page')];
  const rail=[...document.querySelectorAll('.rail button')];
  let active=0;

  const copy={
    zh:{
      headMeta:'GEOAI / 地理推理的边界',evidence:'SOURCES / 论据',next:'继续',end:'结束 / SOURCES',
      coverKicker:'人工智能之不能 / GEOAI',
      coverTitle:'<small>人工智能之不能：</small>空间地理大模型<br><em>不懂空间地理</em>',
      coverLead:'空间地理大模型能够识别地表对象与空间模式。<br><strong>但空间表征能力，不等于地理理解。</strong>',
      coverMicro:'本文所称“不懂”，指当前模型尚不能稳定完成跨区域、跨尺度并面向机制的地理推理。',
      p1Kicker:'01 / 观测',p1Title:'模型首先学习的是观测表征。<br><em>不是地理机制本身。</em>',p1Lead:'遥感影像、地图与轨迹是现实世界的观测结果。<br><strong>它们包含地理信息，也受传感器、尺度与采样方式约束。</strong>',p1Punch:'识别空间模式，<br><em>不等于解释形成这些模式的过程。</em>',p1Micro:'MOVE / 像元提供观测证据；过程、关系与历史仍需要推理。',
      p2Kicker:'02 / 空间泛化',p2Title:'真正的检验，是模型能否<br><em>跨地域泛化。</em>',p2Lead:'随机划分常使训练区与测试区共享相近的空间环境，容易高估性能。<br><strong>空间留出更接近真实应用：模型必须面对未见区域与分布偏移。</strong>',p2Punch:'地理能力的关键，<br><em>是跨地方的稳健推断。</em>',p2Micro:'EarthShift 报告：在真实空间分布偏移下，模型平均性能约下降 15–20%。见论据。',randomSplit:'随机划分',spatialSplit:'空间留出',schematic:'示意性能',schematicNote:'示意交互，不代表单一模型结果；用于说明随机划分与空间留出的评估差异。',
      p3Kicker:'03 / 地方与尺度',p3Title:'坐标可以定位对象。<br><em>但不能定义地方。</em>',p3Lead:'地方由位置、尺度、空间关系、环境过程与历史共同构成。地理结论因此具有尺度依赖性与情境依赖性。',p3Punch:'尺度改变，<br><em>关系、主导过程与可成立的结论都会改变。</em>',p3Micro:'DRAG SCALE / 同一空间对象在不同尺度下对应不同的关系结构。',scaleCaption:'PLACE = LOCATION × SCALE × RELATION × PROCESS × HISTORY',scale:'尺度',
      p4Kicker:'04 / 空间 ≠ 地理',p4Title:'空间表征能力，<br><em>不等于地理理解。</em>',p4Lead:'三维重建与视角变换描述几何一致性。<br><strong>地理解释还要求识别区域差异、过程机制及其空间依赖。</strong>',p4Punch:'空间模型回答“在哪里、什么形状”。<br><em>地理智能还需回答“为何在这里、为何这里不同”。</em>',p4Micro:'MOVE / 视角改变几何表征，但不会自动生成对地方机制的解释。',worldQuestion:'几何可以重建。<br>地理关系仍需推理。',
      p5Kicker:'05 / 地理推理',p5Title:'空间地理大模型的核心短板，<br><em>是地理推理。</em>',p5Lead:'可靠的地理智能必须明确<strong>尺度与适用范围</strong>，识别<strong>空间依赖与区域异质性</strong>，并判断结论<strong>何时可以迁移、何时不能</strong>。',rule1:'明确尺度与适用范围',rule2:'识别空间依赖与区域异质性',rule3:'检验跨地域迁移',shareline:'核心判断：空间表征可以学习；地理理解必须经受跨尺度、跨区域与机制解释的检验。',sourcesTitle:'论据与延伸阅读',close:'关闭',drawerNote:'正文仅保留核心论点；本页列出支撑相关判断的主要研究与资料。'
    },
    en:{
      headMeta:'GEOAI / LIMITS OF GEOGRAPHIC REASONING',evidence:'SOURCES / EVIDENCE',next:'CONTINUE',end:'END / SOURCES',
      coverKicker:'THE LIMITS OF AI / GEOAI',coverTitle:'<small>The Limits of AI:</small>Geospatial Foundation Models<br><em>Do Not Understand Geography</em>',coverLead:'Geospatial foundation models can identify surface objects and spatial patterns.<br><strong>But spatial representation is not the same as geographic understanding.</strong>',coverMicro:'Here, “do not understand” means that current models still lack robust, scale-aware and mechanism-oriented geographic reasoning.',
      p1Kicker:'01 / OBSERVATION',p1Title:'Models first learn observational representations.<br><em>Not geographic mechanisms themselves.</em>',p1Lead:'Imagery, maps and trajectories are observations of the world.<br><strong>They contain geographic information, but are conditioned by sensors, scale and sampling.</strong>',p1Punch:'Recognizing spatial patterns<br><em>is not the same as explaining the processes that produced them.</em>',p1Micro:'MOVE / Pixels provide observational evidence; process, relation and history still require inference.',
      p2Kicker:'02 / SPATIAL GENERALIZATION',p2Title:'The real test is whether a model<br><em>generalizes across regions.</em>',p2Lead:'Random splits often leave training and test samples in similar spatial environments and can overstate performance.<br><strong>Spatial holdout is closer to deployment: the model must face unseen regions and distribution shift.</strong>',p2Punch:'The key geographic capability<br><em>is robust inference across places.</em>',p2Micro:'EarthShift reports roughly 15–20% average degradation under real spatial distribution shifts. See Sources.',randomSplit:'RANDOM SPLIT',spatialSplit:'SPATIAL HOLDOUT',schematic:'SCHEMATIC SCORE',schematicNote:'Conceptual interaction, not the result of a single model; it illustrates the evaluation gap between random split and spatial holdout.',
      p3Kicker:'03 / PLACE & SCALE',p3Title:'Coordinates locate an object.<br><em>They do not define a place.</em>',p3Lead:'Place is constituted by location, scale, spatial relations, environmental processes and history. Geographic claims are therefore scale- and context-dependent.',p3Punch:'Change the scale,<br><em>and relations, dominant processes and valid conclusions can change.</em>',p3Micro:'DRAG SCALE / The same spatial object participates in different relation structures at different scales.',scaleCaption:'PLACE = LOCATION × SCALE × RELATION × PROCESS × HISTORY',scale:'SCALE',
      p4Kicker:'04 / SPACE ≠ GEOGRAPHY',p4Title:'Spatial representation<br><em>is not geographic understanding.</em>',p4Lead:'3D reconstruction and viewpoint transformation describe geometric consistency.<br><strong>Geographic explanation also requires regional differentiation, process mechanisms and spatial dependence.</strong>',p4Punch:'A spatial model answers where things are and what geometry they have.<br><em>Geographic intelligence must also explain why they occur here and why places differ.</em>',p4Micro:'MOVE / Viewpoint changes geometric representation; it does not automatically explain the mechanisms of place.',worldQuestion:'Geometry can be reconstructed.<br>Geographic relations still require reasoning.',
      p5Kicker:'05 / GEOGRAPHIC REASONING',p5Title:'The central limitation of current geospatial foundation models<br><em>is geographic reasoning.</em>',p5Lead:'Reliable geographic intelligence must state its <strong>scale and domain of validity</strong>, recognize <strong>spatial dependence and regional heterogeneity</strong>, and determine <strong>when conclusions can transfer and when they cannot</strong>.',rule1:'State scale and domain of validity',rule2:'Recognize dependence and heterogeneity',rule3:'Test geographic transfer',shareline:'Core claim: spatial representations can be learned; geographic understanding must be tested across scales, regions and mechanisms.',sourcesTitle:'Evidence & further reading',close:'CLOSE',drawerNote:'The main narrative contains only the central claims. This panel lists the principal studies and sources supporting them.'
    }
  };
  function setLang(lang){
    const d=copy[lang];document.documentElement.lang=lang==='zh'?'zh-CN':'en';localStorage.setItem('geoai-lang',lang);
    document.querySelectorAll('[data-lang]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.lang===lang?'true':'false'));
    document.querySelectorAll('[data-i18n]').forEach(el=>{const k=el.dataset.i18n;if(d[k]!=null)el.textContent=d[k]});
    document.querySelectorAll('[data-i18n-html]').forEach(el=>{const k=el.dataset.i18nHtml;if(d[k]!=null)el.innerHTML=d[k]});
  }
  document.querySelectorAll('[data-lang]').forEach(b=>b.addEventListener('click',()=>setLang(b.dataset.lang)));
  setLang(localStorage.getItem('geoai-lang')||'zh');

  function go(i){i=Math.max(0,Math.min(pages.length-1,i));pages[i].scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}
  rail.forEach((b,i)=>b.addEventListener('click',()=>go(i)));
  const io=new IntersectionObserver(entries=>{for(const e of entries)if(e.isIntersecting&&e.intersectionRatio>.55){active=+e.target.dataset.index;pages.forEach((p,i)=>p.classList.toggle('is-active',i===active));rail.forEach((b,i)=>b.setAttribute('aria-current',i===active?'true':'false'));}}, {root:story,threshold:[.55]});
  pages.forEach(p=>io.observe(p));
  addEventListener('keydown',e=>{if(document.getElementById('drawer').classList.contains('is-open'))return;if(['ArrowDown','PageDown','ArrowRight',' '].includes(e.key)){e.preventDefault();go(active+1)}else if(['ArrowUp','PageUp','ArrowLeft'].includes(e.key)){e.preventDefault();go(active-1)}else if(e.key==='Home'){go(0)}else if(e.key==='End'){go(pages.length-1)}});

  const obs=document.getElementById('observeStage'),lens=document.getElementById('lens'),scan=document.getElementById('scan');
  function moveLens(ev){const r=obs.getBoundingClientRect(),x=Math.max(0,Math.min(r.width,ev.clientX-r.left)),y=Math.max(0,Math.min(r.height,ev.clientY-r.top));lens.style.left=x+'px';lens.style.top=y+'px';scan.style.transform=`translateX(${x}px)`}
  obs.addEventListener('pointermove',moveLens);obs.addEventListener('pointerenter',moveLens);

  const shift=document.getElementById('shiftStage'),score=document.getElementById('scoreNumber');
  document.querySelectorAll('[data-split]').forEach(btn=>btn.addEventListener('click',()=>{const spatial=btn.dataset.split==='spatial';shift.classList.toggle('is-spatial',spatial);score.textContent=spatial?'74':'92';document.querySelectorAll('[data-split]').forEach(b=>b.classList.toggle('is-active',b===btn))}));

  const scale=document.getElementById('scaleInput'),readout=document.getElementById('scaleReadout');
  const lines=[...document.querySelectorAll('#netLines line')],nodes=[...document.querySelectorAll('#netNodes circle:not(.focus)')],labels=[...document.querySelectorAll('#netLabels text:not(:first-child)')];
  const layouts=[[[310,205],[505,198],[530,300],[290,310]],[[205,150],[600,145],[630,330],[220,352]],[[110,95],[690,90],[720,390],[105,405]]];
  function applyScale(v){const names=['10 M','1 KM','100 KM'];readout.textContent=names[v];layouts[v].forEach((p,i)=>{nodes[i].setAttribute('cx',p[0]);nodes[i].setAttribute('cy',p[1]);lines[i].setAttribute('x2',p[0]);lines[i].setAttribute('y2',p[1]);labels[i].setAttribute('x',p[0]+(i%2?11:-47));labels[i].setAttribute('y',p[1]-12)})}
  scale.addEventListener('input',()=>applyScale(+scale.value));applyScale(1);

  const world=document.getElementById('worldStage'),grid=document.getElementById('worldGrid');
  world.addEventListener('pointermove',e=>{const r=world.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;grid.style.transform=`rotateX(${66-y*6}deg) rotateZ(${-10+x*7}deg) translate(${x*8}px,${y*7}px)`});
  world.addEventListener('pointerleave',()=>grid.style.transform='rotateX(66deg) rotateZ(-10deg)');

  const drawer=document.getElementById('drawer');document.getElementById('openEvidence').addEventListener('click',()=>drawer.classList.add('is-open'));document.getElementById('closeEvidence').addEventListener('click',()=>drawer.classList.remove('is-open'));drawer.addEventListener('click',e=>{if(e.target===drawer)drawer.classList.remove('is-open')});addEventListener('keydown',e=>{if(e.key==='Escape')drawer.classList.remove('is-open')});
  document.querySelector('.finale .next-hint').addEventListener('click',()=>drawer.classList.add('is-open'));

  const c=document.getElementById('sky'),ctx=c.getContext('2d'),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;let stars=[],w=0,h=0,dpr=1,raf;
  function resize(){dpr=Math.min(devicePixelRatio||1,2);w=innerWidth;h=Math.max(1,innerHeight-72);c.width=w*dpr;c.height=h*dpr;c.style.width=w+'px';c.style.height=h+'px';ctx.setTransform(dpr,0,0,dpr,0,0);const n=Math.max(75,Math.round(w*h/16000));stars=Array.from({length:n},(_,i)=>({x:Math.random()*w,y:Math.random()*h,r:Math.random()*1.05+.18,a:Math.random()*.48+.08,s:Math.random()*.002+.00035,w:i%23===0}))}
  function draw(t=0){ctx.clearRect(0,0,w,h);for(const s of stars){const f=reduced?1:.82+Math.sin(t*s.s+s.x)*.18;ctx.beginPath();ctx.fillStyle=s.w?`rgba(215,155,103,${s.a*f})`:`rgba(224,233,229,${s.a*f})`;ctx.arc(s.x,s.y,s.r,0,Math.PI*2);ctx.fill()}if(!reduced)raf=requestAnimationFrame(draw)}
  resize();draw();addEventListener('resize',()=>{cancelAnimationFrame(raf);resize();draw()},{passive:true});
})();
