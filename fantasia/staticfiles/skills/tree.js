(function(){
  const svg = document.getElementById('skillSvg');
  if(!svg) return;
  let width = svg.clientWidth || window.innerWidth;
  let height = svg.clientHeight || window.innerHeight;
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  const tooltip = document.getElementById('tooltip');

  function el(tag, attrs){
    const n = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }
  function stop(offset, color){
    const s = document.createElementNS('http://www.w3.org/2000/svg','stop');
    s.setAttribute('offset', offset);
    s.setAttribute('stop-color', color);
    return s;
  }

  // Reset progress on load so refresh starts clean
  const storageKey = 'fantasia_skills_unlocked_v1';
  try { localStorage.removeItem(storageKey); } catch {}

  // Root defs and viewport (for pan/zoom)
  const defs = el('defs',{});
  defs.appendChild(glowFilter());
  defs.appendChild(grad('arcaneStroke',['#8b5cf6','#22d3ee','#f59e0b']));
  defs.appendChild(grad('nodeStroke',['#a78bfa','#22d3ee'], '0 0 0 100%'));
  defs.appendChild(grad('nodeStrokeCenter',['#f59e0b','#ef4444'], '0 0 0 100%'));
  defs.appendChild(arrowMarker());
  svg.appendChild(defs);
  const viewport = el('g', { id:'viewport' });
  svg.appendChild(viewport);
  // Pan/zoom state (declared early so helpers can use them)
  let s = 1, tx = 0, ty = 0;
  const minS = 0.4, maxS = 2.5;
  // Fixed subclass set (eight slices) and colors (renamed)
  const SUBCLASSES = ['Dark Magic','Necromancer','Trapper','Hemomancer','Witchcraft','Sentinel','Alchemist','Succubus'];
  const subclassColors = {
    'Dark Magic':'#ef4444',
    'Necromancer':'#a78bfa',
    'Trapper':'#22d3ee',
    'Hemomancer':'#f43f5e',
    'Witchcraft':'#f59e0b',
    'Sentinel':'#10b981',
    'Alchemist':'#84cc16',
    'Succubus':'#9333ea'
  };

  // Data model
  const center = { id:'necromancer', label:'Necromancer', detail:'Master of death and shadow', glyph:'rune' };
  // Data-driven nodes (20+), single primary parent (first prereq) used for layout
  const nodes = [
    center,
    // Tier 1 branches
    { id:'dark-bullet', label:'Dark Bullet', glyph:'bullet', prereq:['necromancer'], subclass:'Dark Magic' },
    { id:'necromancy', label:'Necromancy', glyph:'skull', prereq:['necromancer'], subclass:'Necromancer' },
    { id:'shadow-binding', label:'Shadow Binding', glyph:'chains', prereq:['necromancer'], subclass:'Trapper' },
    { id:'life-siphon', label:'Charm Siphon', glyph:'vessel', prereq:['necromancer'], subclass:'Succubus' },
    { id:'curse-of-frailty', label:'Curse of Frailty', glyph:'rune', prereq:['necromancer'], subclass:'Witchcraft' },
    // Tier 2 children
    { id:'vessel-creation', label:'Vessel Creation', glyph:'vessel', prereq:['necromancy'], subclass:'Necromancer' },
    { id:'raise-skeleton', label:'Raise Skeleton', glyph:'skull', prereq:['necromancy'], subclass:'Necromancer' },
    { id:'bone-armor', label:'Bone Armor', glyph:'shield', prereq:['raise-skeleton'], subclass:'Necromancer' },
    { id:'grave-pact', label:'Grave Pact', glyph:'hand', prereq:['necromancy'], subclass:'Necromancer' },
    { id:'command-undead', label:'Command Undead', glyph:'eye', prereq:['necromancy'], subclass:'Necromancer' },
    { id:'shadow-sewing', label:'Shadow Sewing', glyph:'needle', prereq:['shadow-binding'], subclass:'Trapper' },
    { id:'night-veil', label:'Night Veil', glyph:'web', prereq:['shadow-binding'], subclass:'Trapper' },
    { id:'shadow-step', label:'Shadow Step', glyph:'dagger', prereq:['shadow-binding'], subclass:'Trapper' },
    { id:'incendiary-regulation', label:'Incendiary Regulation', glyph:'flame', prereq:['necromancer'], subclass:'Sentinel' },
    { id:'time-to-cook', label:'Time to Cook', glyph:'bottle', prereq:['necromancer'], subclass:'Alchemist' },
    // Tier 3
    { id:'wraith-summon', label:'Summon Wraith', glyph:'orb', prereq:['command-undead'], subclass:'Necromancer' },
    { id:'bone-golem', label:'Bone Golem', glyph:'bone', prereq:['raise-skeleton'], subclass:'Necromancer' },
    { id:'soul-harvest', label:'Enthrall', glyph:'rune', prereq:['life-siphon'], subclass:'Succubus' },
    { id:'soul-battery', label:'Enthrall Battery', glyph:'orb', prereq:['soul-harvest'], subclass:'Succubus' },
    { id:'bloodletting', label:'Bloodletting', glyph:'dagger', prereq:['necromancer'], subclass:'Hemomancer' },
    { id:'hemorrhage', label:'Hemorrhage', glyph:'dagger', prereq:['bloodletting'], subclass:'Hemomancer' },
    { id:'sanguine-ward', label:'Sanguine Ward', glyph:'shield', prereq:['bloodletting'], subclass:'Hemomancer' },
    { id:'arterial-surge', label:'Arterial Surge', glyph:'dagger', prereq:['hemorrhage'], subclass:'Hemomancer' },
    { id:'vitae-drain', label:'Vitae Drain', glyph:'vessel', prereq:['sanguine-ward'], subclass:'Hemomancer' },
    { id:'crimson-maelstrom', label:'Crimson Maelstrom', glyph:'orb', prereq:['arterial-surge'], subclass:'Hemomancer' },
    { id:'blood-ritual', label:'Blood Ritual', glyph:'rune', prereq:['vitae-drain'], subclass:'Hemomancer' },
    { id:'witchfire', label:'Witchfire', glyph:'flame', prereq:['evil-eye'], subclass:'Witchcraft' },
    { id:'wither', label:'Wither', glyph:'rune', prereq:['curse-of-frailty'], subclass:'Witchcraft' },
    { id:'doom', label:'Doom', glyph:'rune', prereq:['hexweave'], subclass:'Witchcraft' },
    { id:'silence', label:'Silence', glyph:'rune', prereq:['evil-eye'], subclass:'Witchcraft' },
    { id:'raven-scout', label:'Raven Scout', glyph:'raven', prereq:['night-veil'], subclass:'Trapper' },
    // Expanded branches
    // Dark Magic
    { id:'void-lance', label:'Void Lance', glyph:'bullet', prereq:['dark-bullet'], subclass:'Dark Magic' },
    { id:'shadow-burst', label:'Shadow Burst', glyph:'orb', prereq:['dark-bullet'], subclass:'Dark Magic' },
    { id:'entropy-mark', label:'Entropy Mark', glyph:'rune', prereq:['dark-bullet'], subclass:'Dark Magic' },
    { id:'abyssal-comet', label:'Abyssal Comet', glyph:'orb', prereq:['void-lance'], subclass:'Dark Magic' },
    { id:'umbral-nova', label:'Umbral Nova', glyph:'orb', prereq:['shadow-burst'], subclass:'Dark Magic' },
    // Necromancer
    { id:'grave-harvest', label:'Grave Harvest', glyph:'hand', prereq:['necromancy'], subclass:'Necromancer' },
    { id:'rotting-plague', label:'Rotting Plague', glyph:'rune', prereq:['necromancy'], subclass:'Necromancer' },
    { id:'black-phalanx', label:'Black Phalanx', glyph:'shield', prereq:['bone-armor'], subclass:'Necromancer' },
    { id:'lichdom', label:'Lichdom', glyph:'rune', prereq:['grave-pact'], subclass:'Necromancer' },
    // Trapper
    { id:'snare-runes', label:'Snare Runes', glyph:'rune', prereq:['shadow-binding'], subclass:'Trapper' },
    { id:'gloom-mines', label:'Gloom Mines', glyph:'orb', prereq:['shadow-binding'], subclass:'Trapper' },
    { id:'nether-trap', label:'Nether Trap', glyph:'web', prereq:['snare-runes'], subclass:'Trapper' },
    { id:'silk-ambush', label:'Silk Ambush', glyph:'needle', prereq:['shadow-sewing'], subclass:'Trapper' },
    // Hemomancer
    { id:'blood-meteor', label:'Blood Meteor', glyph:'orb', prereq:['blood-ritual'], subclass:'Hemomancer' },
    { id:'scarlet-apotheosis', label:'Scarlet Apotheosis', glyph:'rune', prereq:['crimson-maelstrom'], subclass:'Hemomancer' },
    // Witchcraft
    { id:'grand-hex', label:'Grand Hex', glyph:'rune', prereq:['malison'], subclass:'Witchcraft' },
    { id:'black-sabbath', label:'Black Sabbath', glyph:'flame', prereq:['witchfire'], subclass:'Witchcraft' },
    // Sentinel
    { id:'adamantine-aegis', label:'Adamantine Aegis', glyph:'shield', prereq:['unbreakable'], subclass:'Sentinel' },
    { id:'immortal-stand', label:'Immortal Stand', glyph:'hand', prereq:['phoenix-heart'], subclass:'Sentinel' },
    // Alchemist
    { id:'philosophers-storm', label:"Philosopher's Storm", glyph:'bottle', prereq:['homunculus'], subclass:'Alchemist' },
    { id:'primal-elixir', label:'Primal Elixir', glyph:'vessel', prereq:['dragon-tincture'], subclass:'Alchemist' },
    // Succubus
    { id:'soul-throne', label:'Soul Throne', glyph:'eye', prereq:['dominate'], subclass:'Succubus' },
    { id:'sovereign-temptation', label:'Sovereign Temptation', glyph:'hand', prereq:['essence-bond'], subclass:'Succubus' },
  ];

  // Fast lookup
  const nodeById = new Map(nodes.map(n => [n.id, n]));

  let cx = width/2, cy = height/2;
  const nodeSize = 40;

  // Primary parent and children mapping (first prereq)
  const primaryParent = {}; nodes.forEach(n=>{ primaryParent[n.id] = (n.prereq && n.prereq[0]) || null; });
  const children = {}; nodes.forEach(n=> children[n.id] = []);
  nodes.forEach(n=>{ const p = primaryParent[n.id]; if(p) children[p].push(n.id); });

  // Depth
  const depth = {}; depth[center.id] = 0;
  function depthOf(id){ if(id===center.id) return 0; if(depth[id]!=null) return depth[id]; const p = primaryParent[id]; depth[id] = (p ? depthOf(p)+1 : 1); return depth[id]; }
  nodes.forEach(n=> depthOf(n.id));

  // Linear web layout with subclass sectors
  const angle = {}; const positions = {}; angle[center.id] = -Math.PI/2; positions[center.id] = {x:cx, y:cy};
  const rStep = 340; const minDist = 260;
  // Node elements registry (declared early to avoid TDZ when used in transforms)
  let nodeEls = {};

  // Resolve subclass for every node (inherit from nearest ancestor if missing)
  function resolveSubclass(id){
    const n = nodeById.get(id);
    if(n && n.subclass) return n.subclass;
    const p = primaryParent[id];
    return p ? resolveSubclass(p) : null;
  }
  nodes.forEach(n=>{ if(n.id!==center.id){ n.subclass = n.subclass || resolveSubclass(n.id) || SUBCLASSES[(hashCode(n.id)%SUBCLASSES.length)]; } });
  const subclasses = SUBCLASSES; // enforce fixed set/order
  // Assign each subclass to an equal angular sector anchored at -π/2
  const sectorMap = {}; // subclass -> {start,end,base}
  const sectorPad = 0.08; // padding inside each sector
  const sectorWidth = (Math.PI*2) / subclasses.length;
  subclasses.forEach((sc, i)=>{
    const base = -Math.PI/2 + i*sectorWidth;
    const start = base - sectorWidth/2 + sectorPad;
    const end = base + sectorWidth/2 - sectorPad;
    sectorMap[sc] = {start, end, base};
  });
  // Determine branch root for any node
  function branchRootOf(id){ let cur=id; let p=primaryParent[cur]; while(p && p!==center.id){ cur=p; p=primaryParent[cur]; } return p===center.id?cur:id; }
  // Place primary root per subclass on ring 1 at sector center; prefer 'bloodletting' for Blood
  const roots = children[center.id] || [];
  const rootsBySubclass = {};
  roots.forEach(rid => { const sc=(nodeById.get(rid)||{}).subclass; if(!sc) return; (rootsBySubclass[sc]||(rootsBySubclass[sc]=[])).push(rid); });
  const ringRadius = (d)=> (d===0 ? 0 : rStep * d);
  const rootRadius = ringRadius(1);
  const primaryRootBySubclass = {};
  const preferredRootBySubclass = {
    'Hemomancer':'bloodletting',
    'Trapper':'shadow-binding',
    'Necromancer':'necromancy',
    'Witchcraft':'curse-of-frailty',
    'Alchemist':'time-to-cook',
    'Sentinel':'incendiary-regulation',
    'Dark Magic':'dark-bullet',
    'Succubus':'life-siphon'
  };
  subclasses.forEach(sc=>{
    const list=(rootsBySubclass[sc]||[]).slice();
    let chosen=null; const pref=preferredRootBySubclass[sc];
    if(pref && list.includes(pref)) chosen=pref; else chosen = list.sort()[0] || null;
    if(chosen) primaryRootBySubclass[sc]=chosen;
  });
  subclasses.forEach(sc=>{ const rid=primaryRootBySubclass[sc]; if(!rid) return; const sec=sectorMap[sc]; const a=sec.base; angle[rid]=a; positions[rid]=pol2cart(cx, cy, a, rootRadius); });
  // Map each node to its layout root (primary root of its subclass)
  const layoutRootOf = {}; nodes.forEach(n=>{ if(n.id===center.id) return; const sc=n.subclass; const lr = primaryRootBySubclass[sc] || branchRootOf(n.id); layoutRootOf[n.id]=lr; });
  // Compute sub-depth from layout root; push non-primary branches out by +1
  const subDepth = {}; nodes.forEach(n=>{ if(n.id===center.id) return; const lr=layoutRootOf[n.id]; const realRoot=branchRootOf(n.id); const base = Math.max(0,(depth[n.id]||1)-(depth[lr]||1)); subDepth[n.id] = (realRoot!==lr) ? Math.max(1, base+1) : base; });

  // Local state
  const key = storageKey;
  let unlocked = new Set(JSON.parse(localStorage.getItem(key) || '[]'));
  // Center is always unlocked
  unlocked.add(center.id);

  // Graph helpers
  const prereqs = collectPrereqs(nodes);
  const links = collectLinks(nodes);

  // Render links
  const linkEls = {};
  function renderLinks(){
    Object.values(linkEls).forEach(p=> p.remove());
    Object.keys(linkEls).forEach(k=> delete linkEls[k]);
  links.forEach(({from,to})=>{
    const a = positions[from], b = positions[to];
      if(!a || !b) return;
      const pathD = `M ${a.x},${a.y} L ${b.x},${b.y}`;
    const toNode = nodeById.get(to);
    const color = toNode && toNode.subclass && subclassColors[toNode.subclass] ? subclassColors[toNode.subclass] : null;
      const p = el('path', { d: pathD, class: 'link glow', fill:'none', 'marker-end':'url(#arrow)', 'stroke-width':'5'});
    if(color) p.setAttribute('stroke', color);
      const state = isUnlocked(to) ? 'unlocked' : (canUnlock(to) ? 'unlockable' : 'locked');
    p.classList.add(state);
    p.addEventListener('mouseenter', e=> showTip(e, `${labelFor(from)} → ${labelFor(to)}`));
    p.addEventListener('mousemove', e=> showTip(e));
    p.addEventListener('mouseleave', hideTip);
    viewport.appendChild(p);
    linkEls[`${from}->${to}`] = p;
  });
  }
  renderLinks();

  // Render nodes
  nodeEls = {};
  // center
  const cg = drawNode(center.id, positions[center.id], center.label, 'rune', true);
  nodeEls[center.id] = cg; viewport.appendChild(cg);
  // tiers
  nodes.forEach(n=>{
    if(n.id===center.id) return;
    const g = drawNode(n.id, positions[n.id], n.label, n.glyph, false, n.subclass);
    nodeEls[n.id] = g; viewport.appendChild(g);
  });

  // Interactions
  Object.keys(nodeEls).forEach(id=>{
    const g = nodeEls[id];
    const meta = { id, label:labelFor(id), detail:detailFor(id) };
    attachHover(g, meta);
    g.style.cursor = canUnlock(id) ? 'pointer' : 'default';
    const dAbs = depth[id] || 0;
    g.classList.remove('tier-2','tier-3','tier-4');
    if(dAbs>=2 && dAbs<3) g.classList.add('tier-2');
    else if(dAbs>=3 && dAbs<4) g.classList.add('tier-3');
    else if(dAbs>=4) g.classList.add('tier-4');
    g.addEventListener('click', ()=>{
      if(canUnlock(id)){
        unlocked.add(id);
        localStorage.setItem(key, JSON.stringify(Array.from(unlocked)));
        updateStates();
      }
    });
  });

  updateStates();
  updateNodeScales();

  // Fit-to-screen initial transform
  fitToScreen();

  // Pan/Zoom
  // vars declared above
  let dragging = false, sx=0, sy=0, stx=0, sty=0;
  function applyTransform(){ viewport.setAttribute('transform', `translate(${tx},${ty}) scale(${s})`); updateNodeScales(); }
  function fitToScreen(){
    const pts = Object.values(positions);
    const minX = Math.min(...pts.map(p=>p.x - nodeSize));
    const maxX = Math.max(...pts.map(p=>p.x + nodeSize));
    const minY = Math.min(...pts.map(p=>p.y - nodeSize));
    const maxY = Math.max(...pts.map(p=>p.y + nodeSize));
    const boundsW = maxX - minX, boundsH = maxY - minY;
    const margin = 80;
    const scaleX = (width - margin*2) / boundsW;
    const scaleY = (height - margin*2) / boundsH;
    s = Math.max(minS, Math.min(maxS, Math.min(scaleX, scaleY)));
    // center
    const cxB = (minX + maxX)/2, cyB = (minY + maxY)/2;
    tx = width/2 - s * cxB; ty = height/2 - s * cyB;
    applyTransform();
  }
  svg.addEventListener('wheel', (e)=>{
    e.preventDefault();
    const rect = svg.getBoundingClientRect();
    const cxp = e.clientX - rect.left; const cyp = e.clientY - rect.top;
    const prev = s; const factor = e.deltaY < 0 ? 1.1 : 0.9; s = Math.max(minS, Math.min(maxS, s*factor));
    tx = cxp - (cxp - tx) * (s/prev); ty = cyp - (cyp - ty) * (s/prev);
    applyTransform();
  }, { passive:false });
  svg.addEventListener('mousedown', (e)=>{ dragging=true; sx=e.clientX; sy=e.clientY; stx=tx; sty=ty; });
  window.addEventListener('mousemove', (e)=>{ if(!dragging) return; tx = stx + (e.clientX - sx); ty = sty + (e.clientY - sy); applyTransform(); });
  window.addEventListener('mouseup', ()=> dragging=false);

  // Responsive: recompute on resize so SVG autosizes
  window.addEventListener('resize', ()=>{
    width = svg.clientWidth || window.innerWidth;
    height = svg.clientHeight || window.innerHeight;
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    cx = width/2; cy = height/2;
    recomputePositions();
    fitToScreen();
  });

  // Functions
  function updateStates(){
    // nodes
    Object.keys(nodeEls).forEach(id=>{
      const g = nodeEls[id];
      g.classList.remove('locked','unlockable','unlocked');
      g.classList.add(nodeState(id));
      g.style.cursor = canUnlock(id) ? 'pointer' : 'default';
    });
    // links
    links.forEach(({from,to})=>{
      const el = linkEls[`${from}->${to}`]; if(!el) return;
      el.classList.remove('locked','unlocked','unlockable');
      el.classList.add(isUnlocked(to) ? 'unlocked' : (canUnlock(to) ? 'unlockable' : 'locked'));
    });
  }

  function nodeState(id){
    if(isUnlocked(id)) return 'unlocked';
    return canUnlock(id) ? 'unlockable' : 'locked';
  }
  function isUnlocked(id){ return unlocked.has(id); }
  function canUnlock(id){
    if(isUnlocked(id)) return false;
    const req = prereqs[id] || [];
    return req.every(r=>isUnlocked(r));
  }
  function labelFor(id){
    const n = nodeById.get(id);
    return (n && n.label) ? n.label : id;
  }
  function detailFor(id){
    if(id===center.id) return 'Your core discipline; all paths begin here.';
    const desc = {
      necromancer:'Your core discipline; all paths begin here.',
      // Dark Magic
      'dark-bullet':'Project a bolt of shadow that pierces a single target.',
      'void-lance':'Focus darkness into a long-range lance for high damage.',
      'shadow-burst':'Detonate an umbral sphere, damaging nearby foes.',
      'entropy-mark':'Brand an enemy; damage ramps over time.',
      'abyssal-comet':'Call down a comet of void energy on marked foes.',
      'umbral-nova':'Explode stored shadows for massive area damage.',
      'event-horizon':'Collapse space to pin enemies in crushing dark.',
      'singularity':'Create a singularity that devastates the battlefield.',
      // Necromancer
      'necromancy':'Raise and command the dead as extensions of your will.',
      'vessel-creation':'Craft containers for souls and reagents.',
      'raise-skeleton':'Summon a skeletal warrior to fight for you.',
      'bone-armor':'Form a bony carapace that absorbs incoming blows.',
      'grave-pact':'Sacrifice a minion to empower your next spell.',
      'command-undead':'Issue binding orders to all your undead.',
      'wraith-summon':'Summon a swift wraith that chills enemies.',
      'bone-golem':'Assemble a hulking golem from fused bones.',
      'grave-harvest':'Reap remnants to strengthen minions.',
      'rotting-plague':'Inflict decay that spreads among enemies.',
      'black-phalanx':'Fortify minions into a disciplined formation.',
      'lichdom':'Embrace undeath to magnify spellcasting might.',
      'army-of-bones':'Raise an entire cohort of skeletal soldiers.',
      'deathlord':'Ascend as a Deathlord, empowering all undead.',
      // Trapper
      'shadow-binding':'Snare foes with living shadows that hold them.',
      'shadow-sewing':'Stitch shadows into tripwires and anchors.',
      'night-veil':'Veil the field, reducing enemy vision and accuracy.',
      'shadow-step':'Blink between shadows, ignoring obstacles.',
      'snare-runes':'Inscribe traps that trigger on approach.',
      'gloom-mines':'Umbral mines that detonate with fear magic.',
      'nether-trap':'Planar snare that slows and weakens.',
      'silk-ambush':'Entangling threads for sudden ambush.',
      'nocturne-web':'Lattice of night that immobilizes squads.',
      'midnight-collapse':'Collapse the web, crushing entrapped foes.',
      'raven-scout':'Send a raven to reconnoiter and mark threats.',
      // Hemomancer
      'bloodletting':'Spend health to drastically empower spells.',
      'hemorrhage':'Internal bleeding that escalates over time.',
      'sanguine-ward':'Blood barrier that absorbs heavy damage.',
      'arterial-surge':'Convert blood loss into burst damage.',
      'vitae-drain':'Leech vitality to replenish yourself.',
      'crimson-maelstrom':'Storm of blood that shreds nearby foes.',
      'blood-ritual':'Risky rite for overwhelming power spikes.',
      'blood-meteor':'Call a meteor forged from your own blood.',
      'scarlet-apotheosis':'Apex form: transcend flesh through blood.',
      // Witchcraft
      'curse-of-frailty':'Weaken enemies, sapping strength and endurance.',
      'wither':'Corrode armor and resolve with swift decay.',
      'doom':'Inevitable fate that amplifies all damage.',
      'silence':'Stifle spellcasting and channeled abilities.',
      'hexweave':'Layered maledictions for compounding effects.',
      'evil-eye':'Baleful gaze that crushes morale.',
      'malison':'Lingering master-curse that deepens per hit.',
      'witchfire':'Eldritch flame that devours protections.',
      'grand-hex':'Cataclysmic hex that warps reality.',
      'black-sabbath':'Rite of ruin that overwhelms battalions.',
      // Sentinel
      'incendiary-regulation':'Master inner fire to resist harm.',
      'stone-skin':'Harden flesh for steady defense.',
      'iron-will':'Bolster resolve to shrug off impairments.',
      'phoenix-heart':'Rekindle from ruin with frequent healing.',
      'unbreakable':'Reduce stagger and incoming spikes.',
      'adamantine-aegis':'Nigh-impenetrable bulwark against sieges.',
      'immortal-stand':'Stand immortal for a brief, heroic interval.',
      // Alchemist
      'time-to-cook':'Unlock and auto-learn concoctions from finds.',
      'brew-volatile':'Brew unstable mixtures for explosives.',
      'acid-flask':'Hurl corrosives that melt armor plates.',
      'homunculus':'Create an assistant to extend your craft.',
      'dragon-tincture':'Rare tonic surging power at a cost.',
      "philosophers-storm":"Storm of reagents reshapes the field.",
      'primal-elixir':'Elixir that supercharges body and mind.',
      // Succubus
      'life-siphon':'Charm to siphon vigor from the enamored.',
      'soul-harvest':'Bind enthralled essence for later use.',
      'soul-battery':'Condense essence into a potent reservoir.',
      'allure':'Beguile targets, lowering their guard.',
      'night-kiss':'Draining kiss that marks for domination.',
      'dominate':'Seize control of a weakened mind.',
      'essence-bond':'Link fates—share harm and benefit.',
      'soul-throne':'Seat of power commanding bound souls.',
      'sovereign-temptation':'Absolute allure that turns leaders.',
    };
    const t = Math.max(1, depth[id] || 1);
    const text = desc[id] || '';
    return text ? `T${t}: ${text}` : '';
  }
  function unlockListFor(id){
    const kids = (children[id]||[]);
    if(!kids.length) return '';
    const names = kids.map(labelFor).join(', ');
    return names ? ` Unlocks: ${names}.` : '';
  }

  function drawNode(id, pos, label, glyph, isCenter, subclass){
    const g = el('g', { class:`node${isCenter?' center':''}` });
    const content = el('g', { class:'node-content' });
    const hex = el('path',{d:polygon(6, isCenter?60:40), class:'ring'});
    const icon = drawGlyph(isCenter?'rune':glyph, isCenter?28:22);
    icon.setAttribute('transform', isCenter?'translate(-14,-16)':'translate(-11,-11)');
    const radialOut = isCenter ? 86 : (40 + 26);
    const text = el('text',{class:'label', y: radialOut}); text.textContent = label;
    content.appendChild(hex); content.appendChild(icon); content.appendChild(text);
    g.appendChild(content);
    g.dataset.id = id;
    return g;
  }

  // UI helpers
  function attachHover(node, data){
    node.addEventListener('mouseenter', e=> showTip(e, `${data.label}${data.detail?': '+data.detail:''}${unlockListFor(data.id)}`));
    node.addEventListener('mousemove', e=> showTip(e));
    node.addEventListener('mouseleave', hideTip);
  }
  function showTip(e, text){ if(text) tooltip.textContent = text; tooltip.hidden = false; const off=14; tooltip.style.left = `${e.clientX+off}px`; tooltip.style.top = `${e.clientY+off}px`; }
  function hideTip(){ tooltip.hidden = true; }

  // Legend and subclass filtering/highlighting
  const legend = document.getElementById('legend');
  let legendChips = [];
  if(legend){
    const frag = document.createDocumentFragment();
    Object.entries(subclassColors).forEach(([name,color])=>{
      const chip = document.createElement('button');
      chip.className = 'chip'; chip.type='button'; chip.setAttribute('data-subclass', name);
      chip.innerHTML = `<span class="dot" style="background:${color}"></span><span>${name}</span>`;
      chip.addEventListener('click', ()=> toggleSubclass(name));
      legendChips.push(chip);
      frag.appendChild(chip);
    });
    legend.appendChild(frag);
  }
  let activeSubclass = null;
  function toggleSubclass(name){
    activeSubclass = activeSubclass===name ? null : name;
    // update chip styles
    legendChips.forEach(ch=>{
      const sc = ch.getAttribute('data-subclass');
      if(activeSubclass && sc===activeSubclass) ch.classList.add('active');
      else ch.classList.remove('active');
    });
    // dim/select nodes
    nodes.forEach(n=>{
      const elNode = nodeEls[n.id]; if(!elNode) return;
      elNode.classList.remove('dim','selected');
      if(activeSubclass && n.subclass!==activeSubclass && n.id!==center.id){
        elNode.classList.add('dim');
      } else if(activeSubclass && n.subclass===activeSubclass && n.id!==center.id){
        elNode.classList.add('selected');
      }
      // no per-subclass ring coloring
    });
    // dim/select links
    links.forEach(({to})=>{
      const n = nodeById.get(to);
      const elLink = linkEls[`${primaryParent[to]}->${to}`];
      if(!elLink) return;
      const sc = n && n.subclass; const color = sc && subclassColors[sc];
      if(color) elLink.setAttribute('stroke', color);
      elLink.classList.remove('dim','selected');
      if(activeSubclass && (!n || n.subclass!==activeSubclass)) elLink.classList.add('dim');
      else if(activeSubclass && n && n.subclass===activeSubclass) elLink.classList.add('selected');
    });
  }

  // Build defs
  function glowFilter(){
    const f = el('filter',{id:'glow', x:'-50%', y:'-50%', width:'200%', height:'200%'});
    f.appendChild(el('feGaussianBlur',{stdDeviation:'4', result:'b'}));
    const m = el('feMerge',{}); m.appendChild(el('feMergeNode',{in:'b'})); m.appendChild(el('feMergeNode',{in:'SourceGraphic'})); f.appendChild(m);
    return f;
  }
  function grad(id, stops, axis){
    const g = el('linearGradient',{id, x1:'0%', y1:'0%', x2:'100%', y2:'0%'});
    if(axis) { const [x1,y1,x2,y2]=axis.split(' '); g.setAttribute('x1',x1); g.setAttribute('y1',y1); g.setAttribute('x2',x2); g.setAttribute('y2',y2); }
    const step = 100/(stops.length-1);
    stops.forEach((c,i)=> g.appendChild(stop(`${i*step}%`, c)));
    return g;
  }
  function arrowMarker(){
    const marker = el('marker',{id:'arrow',viewBox:'0 0 10 10',refX:'8',refY:'5',markerWidth:'6',markerHeight:'6',orient:'auto-start-reverse'});
    marker.appendChild(el('path',{d:'M0 0 L10 5 L0 10 Z', fill:'#22d3ee'}));
    return marker;
  }

  // Geometry helpers
  function curvedPath(x1,y1,x2,y2,t){ const mx=(x1+x2)/2,my=(y1+y2)/2; const dx=x2-x1,dy=y2-y1; const nx=-dy,ny=dx; const len=Math.hypot(dx,dy)||1; const ux=nx/len,uy=ny/len; const c=t*Math.hypot(dx,dy); const cx1=mx+ux*c, cy1=my+uy*c; return `M ${x1},${y1} Q ${cx1},${cy1} ${x2},${y2}`; }
  function polygon(sides, r){ const a=Array.from({length:sides},(_,i)=>{ const ang = (Math.PI*2 * i / sides) - Math.PI/2; const x = r * Math.cos(ang), y = r * Math.sin(ang); return `${i?'L':'M'} ${x} ${y}`; }).join(' '); return `${a} Z`; }
  function hashCode(str){ let h=0; for(let i=0;i<str.length;i++){ h=((h<<5)-h) + str.charCodeAt(i); h|=0; } return Math.abs(h); }
  function dist(a,b){ const dx=a.x-b.x, dy=a.y-b.y; return Math.hypot(dx,dy); }
  function angOf(p){ return Math.atan2(p.y-cy, p.x-cx); }
  function clamp(v, lo, hi){ return Math.max(lo, Math.min(hi, v)); }
  function nodeScaleForZoom(z){ const sc = Math.pow(Math.max(0.001,z), -0.6); return clamp(sc, 0.58, 1.35); }
  function setNodeTransform(id){ const pos = positions[id]; if(!pos) return; const sc = nodeScaleForZoom(s); const g = nodeEls && nodeEls[id]; if(!g) return; g.setAttribute('transform', `translate(${pos.x},${pos.y})`); }
  function setNodeScale(id){ const g = nodeEls && nodeEls[id]; if(!g) return; const content = g.querySelector('.node-content'); if(!content) return; const sc = nodeScaleForZoom(s); content.setAttribute('transform', `scale(${sc})`); }
  function updateNodeScales(){ if(!nodeEls) return; Object.keys(nodeEls).forEach(id=>{ setNodeTransform(id); setNodeScale(id); }); }
  function resolveCollisions(){
    const ids = Object.keys(positions).filter(id=>id!==center.id);
    for(let iter=0; iter<30; iter++){
      let moved=false;
      for(let i=0;i<ids.length;i++){
        for(let j=i+1;j<ids.length;j++){
          const aId = ids[i], bId = ids[j];
          const pa = positions[aId], pb = positions[bId];
          const d = dist(pa,pb);
          const ra = rStep*(depth[aId]||1);
          const rb = rStep*(depth[bId]||1);
          if(d < 210){
            const ai = angle[aId] ?? angOf(pa);
            const aj = angle[bId] ?? angOf(pb);
            const need = (210 - d);
            const pushA = clamp(need/ra * 0.6, 0.005, 0.35);
            const pushB = clamp(need/rb * 0.6, 0.005, 0.35);
            angle[aId] = ai - pushA;
            angle[bId] = aj + pushB;
            positions[aId] = pol2cart(cx, cy, angle[aId], ra);
            positions[bId] = pol2cart(cx, cy, angle[bId], rb);
            moved=true;
          }
        }
      }
      if(!moved) break;
    }
  }

  function computeDepthRadii(){
    const radii = {};
    const groups = {};
    Object.keys(positions).forEach(id=>{
      const dpth = depth[id]||0; if(!groups[dpth]) groups[dpth]=[]; groups[dpth].push(id);
    });
    Object.keys(groups).forEach(k=>{
      const dpth = parseInt(k,10);
      if(dpth===0){ radii[dpth]=0; return; }
      const count = groups[dpth].length;
      const neededCirc = Math.max(count,1) * (minDist*0.95);
      const baseR = rStep * dpth;
      const needR = neededCirc / (2*Math.PI);
      radii[dpth] = Math.max(baseR, needR);
    });
    return radii;
  }
  function recomputePositions(){
    Object.keys(positions).forEach(id=>{
      const dpth = depth[id]||0;
      const r = dpth===0 ? 0 : (depthRadius[dpth] || rStep*dpth);
      const ang = angle[id] ?? angOf(positions[id]);
      positions[id] = pol2cart(cx, cy, ang, r);
      setNodeTransform(id);
    });
    renderLinks();
  }
  function enforceAngularSeparation(){
    const byDepth = {};
    Object.keys(angle).forEach(id=>{
      if(id===center.id) return;
      const dAbs = depth[id]||0; if(dAbs<=1) return;
      (byDepth[dAbs]||(byDepth[dAbs]=[])).push(id);
    });
    Object.entries(byDepth).forEach(([dStr, ids])=>{
      const dAbs = parseInt(dStr,10);
      const r = ringRadius(dAbs);
      const minAng = (nodeSize * 3.2) / Math.max(1, r);
      ids.sort((a,b)=> (angle[a]||0)-(angle[b]||0));
      for(let i=0;i<ids.length;i++){
        const prev = ids[(i-1+ids.length)%ids.length];
        const cur = ids[i];
        let aPrev = angle[prev]; let aCur = angle[cur];
        while(aCur <= aPrev) aCur += Math.PI*2;
        const gap = aCur - aPrev;
        if(gap < minAng){
          const diff = (minAng - gap);
          angle[cur] = (angle[cur] + diff);
          positions[cur] = pol2cart(cx, cy, angle[cur], r);
        }
      }
    });
  }
  enforceAngularSeparation();

  // Glyph drawer (same as previous, trimmed)
  function drawGlyph(name, size){
    const g = el('g', { class:'glyph' });
    if(name==='skull'){ g.appendChild(el('path',{d:'M11 0c6 0 11 5 11 11 0 5-3 7-6 9v3H6v-3C3 18 0 16 0 11 0 5 5 0 11 0Z', fill:'#f5f2e8'})); g.appendChild(el('circle',{cx:'7', cy:'9', r:'2', fill:'#0f0d15'})); g.appendChild(el('circle',{cx:'15', cy:'9', r:'2', fill:'#0f0d15'})); return g; }
    if(name==='flame'){ g.appendChild(el('path',{d:'M11 0c3 6-1 7 2 11 2 2 2 6-1 8-3 2-7 1-9-2-2-3-1-6 1-8 4-4 3-7 7-9Z', fill:'#f59e0b'})); return g; }
    if(name==='chains'){ g.appendChild(el('rect',{x:'2',y:'6',width:'6',height:'10',rx:'3',fill:'#9ca3af'})); g.appendChild(el('rect',{x:'12',y:'6',width:'6',height:'10',rx:'3',fill:'#9ca3af'})); g.appendChild(el('rect',{x:'7',y:'6',width:'6',height:'10',rx:'3',fill:'#9ca3af', opacity:'.6'})); return g; }
    if(name==='needle'){ g.appendChild(el('path',{d:'M1 20L20 1l2 2L3 22 1 20Z', fill:'#a78bfa'})); g.appendChild(el('circle',{cx:'20',cy:'2',r:'2',fill:'#a78bfa'})); return g; }
    if(name==='vessel'){ g.appendChild(el('path',{d:'M6 0h10v4l-2 3v10a6 6 0 0 1-6 6 6 6 0 0 1-6-6V7L6 4V0Z', fill:'#22d3ee'})); return g; }
    if(name==='bottle'){ g.appendChild(el('rect',{x:'7',y:'0',width:'6',height:'4',fill:'#94a3b8'})); g.appendChild(el('path',{d:'M6 4h8v4l2 2v8a6 6 0 0 1-6 6 6 6 0 0 1-6-6v-8l2-2V4Z', fill:'#22d3ee'})); return g; }
    if(name==='bullet'){ g.appendChild(el('path',{d:'M0 11h14l6-3-6-3H0v6Z', fill:'#ef4444'})); return g; }
    if(name==='rune'){ g.appendChild(el('path',{d:'M6 28L14 0l8 28-8-6-8 6Z', fill:'#f5f2e8'})); return g; }
    if(name==='shield'){ g.appendChild(el('path',{d:'M11 0l7 4v8c0 6-4 9-7 10-3-1-7-4-7-10V4l7-4Z', fill:'#22d3ee'})); return g; }
    if(name==='hand'){ g.appendChild(el('path',{d:'M2 12c0-5 3-8 5-8 2 0 3 2 3 3V4c0-2 2-4 4-2 2 2 2 6 2 9v9H8c-4 0-6-4-6-8Z', fill:'#a78bfa'})); return g; }
    if(name==='eye'){ g.appendChild(el('ellipse',{cx:'11',cy:'11',rx:'10',ry:'6',fill:'#111827',stroke:'#22d3ee','stroke-width':'2'})); g.appendChild(el('circle',{cx:'11',cy:'11',r:'2.5',fill:'#22d3ee'})); return g; }
    if(name==='web'){ g.appendChild(el('path',{d:'M0 11h22M11 0v22M3 3l16 16M19 3 3 19', stroke:'#a78bfa','stroke-width':'2'})); return g; }
    if(name==='dagger'){ g.appendChild(el('path',{d:'M0 11l20-5-5 20-5-5-5-10Z', fill:'#ef4444'})); return g; }
    if(name==='orb'){ g.appendChild(el('circle',{cx:'11',cy:'11',r:'8',fill:'#22d3ee'})); g.appendChild(el('circle',{cx:'9',cy:'9',r:'3',fill:'#a78bfa'})); return g; }
    if(name==='bone'){ g.appendChild(el('path',{d:'M2 8a3 3 0 1 1 4-4l8 8a3 3 0 1 1-4 4L2 8Z', fill:'#e5e7eb'})); return g; }
    if(name==='raven'){ g.appendChild(el('path',{d:'M0 14l8-8 8 4-6 2 4 6-6-4-4 0Z', fill:'#1f2937'})); return g; }
    g.appendChild(el('circle',{cx:size/2,cy:size/2,r:size/2,fill:'#e5e7eb'})); return g;
  }

  // Build prereqs/links
  function collectPrereqs(nodes){
    const pr = {}; nodes.forEach(n=> pr[n.id] = (n.prereq||[])); return pr;
  }
  function collectLinks(nodes){
    const links = []; nodes.forEach(n=> (n.prereq||[]).forEach(p=> links.push({from:p, to:n.id}))); return links;
  }

  function pol2cart(cx, cy, ang, r){ return { x: cx + r*Math.cos(ang), y: cy + r*Math.sin(ang) }; }
})();
