const store={get(k,d){try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
const $=id=>document.getElementById(id);
const ALL=DECKS.flatMap(d=>d.cards.map(([cz,en,note])=>({id:d.id+"|"+cz,deck:d,cz,en,note})));
// Each card is practised in two directions, tracked separately: "r" = recognise (CZ → EN), "p" = produce (EN → CZ).
const ITEMS=ALL.flatMap(c=>[{key:c.id+"#r",card:c,dir:"r"},{key:c.id+"#p",card:c,dir:"p"}]);
const BY=Object.fromEntries(ITEMS.map(it=>[it.key,it]));
const MODES={mix:"Mix",r:"CZ → EN",p:"EN → CZ"};
const SIZES=[10,20,40], KNOWN=3, MAXBOX=6;

// Per-card memory: box 0–6 (Leitner-style), seen count, misses, last seen time. Keyed by deck + Czech text, so adding or reordering cards keeps it.
let stats=store.get("stats",{});
let sel=store.get("sel",["l2"]).filter(id=>DECKS.some(d=>d.id===id));
let size=SIZES.includes(store.get("size",20))?store.get("size",20):20;
let mode=MODES[store.get("mode","mix")]?store.get("mode","mix"):"mix";
let S=store.get("session",null);
if(S&&!(Array.isArray(S.queue)&&S.queue.every(id=>BY[id])&&Array.isArray(S.missed)))S=null;
let flipped=false, history=[], endArmed=null;

function save(){store.set("stats",stats);store.set("session",S)}
function box(id){return stats[id]?stats[id].b:-1}
// In Mix, the EN → CZ side of a card unlocks once you recognise it reliably (level 3 in CZ → EN).
function unlocked(c){return box(c.id+"#r")>=KNOWN||!!stats[c.id+"#p"]}
function pool(){return ITEMS.filter(it=>sel.includes(it.card.deck.id)&&(mode===it.dir||(mode==="mix"&&(it.dir==="r"||unlocked(it.card)))))}

// Weighted pick without replacement: weak cards and cards not seen for a while come up more often.
function weight(it){const st=stats[it.key];if(!st)return it.dir==="p"?10:6; // a freshly unlocked EN → CZ side is pulled in a bit sooner than a brand-new card
  const base=[16,8,4,2,1,.5,.25][Math.min(st.b,MAXBOX)];const days=(Date.now()-(st.t||0))/864e5;return base*(1+Math.min(days,14)/7)}
function pick(n){const seen=new Set(),out=[];
  for(const x of pool().map(it=>({it,k:Math.pow(Math.random(),1/weight(it))})).sort((a,b)=>b.k-a.k)){
    if(seen.has(x.it.card.id))continue;seen.add(x.it.card.id);out.push(x.it.key);if(out.length>=n)break} // never both directions of one card in a round
  return out}

function newRound(){const q=pick(size);S={queue:q,total:q.length,done:0,missed:[],mode};flipped=false;history=[];disarmEnd();save();render()}
function endRound(){S=null;flipped=false;history=[];disarmEnd();save();render()}

function answer(ok){if(!S||!flipped)return;
  const id=S.queue[0];history.push({S:JSON.parse(JSON.stringify(S)),id,prev:stats[id]?{...stats[id]}:null});if(history.length>50)history.shift();
  const st=stats[id]||{b:0,n:0,w:0,t:0};st.n++;st.t=Date.now();
  const missedBefore=S.missed.includes(id);
  if(ok){if(!missedBefore)st.b=Math.min(st.b+1,MAXBOX);S.queue.shift();S.done++}
  else{if(!missedBefore){st.w++;st.b=Math.max(0,st.b-2);S.missed.push(id)}S.queue.shift();S.queue.splice(Math.min(3,S.queue.length),0,id)}
  stats[id]=st;flipped=false;save();render()}
function undo(){const h=history.pop();if(!h)return;S=h.S;if(h.prev)stats[h.id]=h.prev;else delete stats[h.id];flipped=true;save();render()}
function disarmEnd(){clearTimeout(endArmed);endArmed=null;const b=$("end");b.textContent="Ukončit kolo";b.classList.remove("warn")}

function esc(s){return String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]))}
function renderChips(){
  $("decks").innerHTML="";
  DECKS.forEach(d=>{const b=document.createElement("button");b.type="button";b.className="chip";b.setAttribute("aria-pressed",sel.includes(d.id));
    const n=d.cards.length,kr=d.cards.filter(c=>box(d.id+"|"+c[0]+"#r")>=KNOWN).length,kp=d.cards.filter(c=>box(d.id+"|"+c[0]+"#p")>=KNOWN).length;
    b.innerHTML=`${esc(d.name)}<small>${esc(d.sub)}</small><small>rozumím ${kr} · řeknu ${kp} / ${n}</small><span class="lvl"><i style="width:${(kr+kp)/(2*n)*100}%"></i></span>`;
    b.disabled=!!S;
    b.onclick=()=>{if(S)return;if(sel.includes(d.id)){sel=sel.filter(x=>x!==d.id)}else sel=[...sel,d.id];store.set("sel",sel);render()};
    $("decks").append(b)});
  $("dir").hidden=!S;if(S)$("dir").textContent=MODES[S.mode||mode];
}

function render(){
  renderChips();
  $("undo").disabled=!history.length;$("undo").hidden=!S;
  const card=$("card");card.classList.toggle("top",!S); // start screen is top-aligned so changing options never shifts the controls
  if(!S){ // start panel
    $("actions").hidden=true;$("end").hidden=true;
    const p=pool(),nw=p.filter(it=>box(it.key)<0).length,kn=p.filter(it=>box(it.key)>=KNOWN).length;
    const cards=ALL.filter(c=>sel.includes(c.deck.id)),np=cards.filter(unlocked).length;
    const why=mode==="mix"?`Weak and unseen cards come up more often. EN → CZ is unlocked for ${np} of ${cards.length} cards: each one opens once you know it CZ → EN.`
      :mode==="r"?"Only CZ → EN. Mix also practises saying the words in Czech.":"Only EN → CZ, including cards you haven't learned yet.";
    $("count").textContent=`${kn} / ${p.length} umím`;$("fill").style.width=(p.length?kn/p.length*100:0)+"%";
    if(!sel.length){card.innerHTML=`<div class="panel"><b>Vyberte balíček</b><span class="note">Pick one or more decks above to start a round.</span></div>`;return}
    card.innerHTML=`<div class="panel"><span class="tag">${esc(sel.map(id=>DECKS.find(d=>d.id===id).name).join(" + "))}</span>
      <div class="stats"><div><strong>${nw}</strong>nové</div><div><strong>${p.length-nw-kn}</strong>učím se</div><div><strong>${kn}</strong>umím</div></div>
      <div class="seg" role="group" aria-label="Direction">${Object.entries(MODES).map(([k,v])=>`<button type="button" data-m="${k}" aria-pressed="${k===mode}">${v}</button>`).join("")}</div>
      <div class="seg" role="group" aria-label="Cards per round">${SIZES.map(n=>`<button type="button" data-n="${n}" class="n" aria-pressed="${n===size}">${n}</button>`).join("")}</div>
      <button class="restart" id="go" type="button">Začít kolo</button>
      <span class="note">${why}</span></div>`;
    card.querySelectorAll(".seg button.n").forEach(b=>b.onclick=e=>{e.stopPropagation();size=+b.dataset.n;store.set("size",size);render()});
    card.querySelectorAll(".seg button[data-m]").forEach(b=>b.onclick=e=>{e.stopPropagation();mode=b.dataset.m;store.set("mode",mode);render()});
    $("go").onclick=e=>{e.stopPropagation();newRound()};return;
  }
  $("end").hidden=false;
  $("count").textContent=`${S.done} / ${S.total}`;$("fill").style.width=(S.total?S.done/S.total*100:0)+"%";
  if(!S.queue.length){ // round finished
    $("actions").hidden=true;$("end").hidden=true;
    const first=S.total-S.missed.length;
    card.innerHTML=`<div class="panel"><b>Hotovo!</b><span class="note">${first} of ${S.total} right on the first try.</span>
      ${S.missed.length?`<ul class="missed">${S.missed.map(k=>`<li>${esc(BY[k].card.cz)} <span>– ${esc(BY[k].card.en)}</span></li>`).join("")}</ul>`:""}
      <button class="restart" id="go" type="button">Další kolo</button><button class="link" id="home" type="button">Change decks or size</button></div>`;
    $("go").onclick=e=>{e.stopPropagation();newRound()};$("home").onclick=e=>{e.stopPropagation();endRound()};return;
  }
  $("actions").hidden=!flipped;
  const it=BY[S.queue[0]],c=it.card,cs=it.dir==="r";
  const front=cs?c.cz:c.en, back=cs?c.en:c.cz;
  card.innerHTML=`<span class="tag">${esc(c.deck.name)} · ${cs?"CZ → EN":"EN → CZ"}${box(it.key)<0?" · nová":""}</span><div class="front" lang="${cs?"cs":"en"}">${esc(front)}</div>`+
    (flipped?`<div class="back"><div class="answer" lang="${cs?"en":"cs"}">${esc(back)}</div>${c.note?`<div class="note">${esc(c.note)}</div>`:""}</div>`
            :`<div class="hint">${cs?"tap to flip":"say it in Czech out loud, then tap"}</div>`)+
    (canSpeak()&&(cs||flipped)?`<button class="say" id="say" type="button">▶ poslechnout</button>`:"");
  const sb=$("say");if(sb)sb.onclick=e=>{e.stopPropagation();speak(c.cz.replace(/___/g,""))};
}
function flip(){if(!S||!S.queue.length||flipped)return;flipped=true;render()}

let csVoice=null;
function loadVoice(){try{csVoice=speechSynthesis.getVoices().find(v=>/^cs/i.test(v.lang))||null}catch(e){}}
function canSpeak(){return "speechSynthesis" in window && !!csVoice}
function speak(t){try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(t);u.voice=csVoice;u.lang="cs-CZ";u.rate=.9;speechSynthesis.speak(u)}catch(e){}}
if("speechSynthesis" in window){loadVoice();try{speechSynthesis.onvoiceschanged=()=>{loadVoice();render()}}catch(e){}}

$("card").onclick=flip;
$("card").onkeydown=e=>{if(e.key===" "||e.key==="Enter"){e.preventDefault();flip()}};
$("again").onclick=()=>answer(false);$("know").onclick=()=>answer(true);$("undo").onclick=undo;
$("end").onclick=()=>{if(endArmed){endRound();return}const b=$("end");b.textContent="Tap again to end round";b.classList.add("warn");endArmed=setTimeout(disarmEnd,3000)};
document.addEventListener("keydown",e=>{if(e.target.tagName==="BUTTON")return;if(e.key==="1")answer(false);if(e.key==="2")answer(true)});
render();
// Offline + instant launch
if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
// Ask the browser not to evict saved progress
try{navigator.storage&&navigator.storage.persist&&navigator.storage.persist()}catch(e){}
