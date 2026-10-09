const store={get(k,d){try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
const $=id=>document.getElementById(id);
const GROUP=Object.fromEntries(RELATED.flatMap((g,i)=>g.map(cz=>[cz,"group"+i])));
const ALL=DECKS.flatMap(d=>d.cards.map(([cz,en,note])=>({id:d.id+"|"+cz,group:GROUP[cz],deck:d,cz,en,note})));
// Each card is practised in two directions, tracked separately: "r" = recognise (CZ → EN), "p" = produce (EN → CZ).
const ITEMS=ALL.flatMap(c=>[{key:c.id+"#r",card:c,dir:"r"},{key:c.id+"#p",card:c,dir:"p"}]);
const BY=Object.fromEntries(ITEMS.map(it=>[it.key,it]));
const MODES={mix:"Mix",r:"CZ → EN",p:"EN → CZ"};
const SIZES=[10,20,40];

// Per card side: FSRS state (see srs.js). Keyed by deck + Czech text, so adding or reordering cards keeps it.
// log keeps every scheduled review as [minutes since epoch, grade] per side, so the scheduler can be retuned or replaced later.
let stats=SRS.migrateAll(store.get("stats",{}),Date.now());
let log=store.get("log",{});
let sel=store.get("sel",["l2"]).filter(id=>DECKS.some(d=>d.id===id));
let size=SIZES.includes(store.get("size",20))?store.get("size",20):20;
let mode=MODES[store.get("mode","mix")]?store.get("mode","mix"):"mix";
let S=store.get("session",null);
if(S&&!(Array.isArray(S.queue)&&S.queue.every(id=>BY[id])&&Array.isArray(S.missed)))S=null;
let flipped=false, history=[], endArmed=null;

function save(){store.set("stats",stats);store.set("log",log);store.set("session",S)}
function known(key){return !!stats[key]&&stats[key].s>=SRS.KNOWN}
// In Mix, the EN → CZ side of a card unlocks once you recognise it reliably (CZ → EN known).
function unlocked(c){return known(c.id+"#r")||!!stats[c.id+"#p"]}
function pool(){return ITEMS.filter(it=>sel.includes(it.card.deck.id)&&(mode===it.dir||(mode==="mix"&&(it.dir==="r"||unlocked(it.card)))))}
// New card sides started today, for the daily cap: the first review is logged today, and there is no history from before the log (migrated sides).
function newToday(now){const d=SRS.day(now);return Object.entries(log).filter(([k,a])=>a.length&&stats[k]&&stats[k].n===a.length&&SRS.day(a[0][0]*6e4)===d).length}

function newRound(){const now=Date.now(),r=SRS.buildRound(pool(),stats,{size,now,newToday:newToday(now)});
  S={queue:r.queue,total:r.queue.length,done:0,missed:[],mode};flipped=false;history=[];disarmEnd();save();render()}
function endRound(){S=null;flipped=false;history=[];disarmEnd();save();render()}

function answer(ok){if(!S||!flipped)return;
  const id=S.queue[0],first=!S.missed.includes(id); // only the first answer in a round is a review; retries after a miss don't change the schedule
  history.push({S:JSON.parse(JSON.stringify(S)),id,prev:stats[id]||null,logged:first});if(history.length>50)history.shift();
  if(first){const now=Date.now(),g=ok?SRS.GOOD:SRS.AGAIN;stats[id]=SRS.review(stats[id]||null,g,now);(log[id]=log[id]||[]).push([Math.round(now/6e4),g])}
  S.queue.shift();
  if(ok)S.done++;else{if(first)S.missed.push(id);S.queue.splice(Math.min(3,S.queue.length),0,id)}
  flipped=false;save();render()}
function undo(){const h=history.pop();if(!h)return;S=h.S;if(h.prev)stats[h.id]=h.prev;else delete stats[h.id];
  if(h.logged){log[h.id].pop();if(!log[h.id].length)delete log[h.id]}
  flipped=true;save();render()}
function disarmEnd(){clearTimeout(endArmed);endArmed=null;const b=$("end");b.textContent="Ukončit kolo";b.classList.remove("warn")}

function esc(s){return String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]))}
function renderChips(){
  $("decks").innerHTML="";
  DECKS.forEach(d=>{const b=document.createElement("button");b.type="button";b.className="chip";b.setAttribute("aria-pressed",sel.includes(d.id));
    const n=d.cards.length,kr=d.cards.filter(c=>known(d.id+"|"+c[0]+"#r")).length,kp=d.cards.filter(c=>known(d.id+"|"+c[0]+"#p")).length;
    b.innerHTML=`${esc(d.name)}<small>${esc(d.sub)}</small><small>rozumím ${kr} · řeknu ${kp} / ${n}</small><span class="lvl"><i style="width:${(kr+kp)/(2*n)*100}%"></i></span>`;
    b.disabled=!!S;
    b.onclick=()=>{if(S)return;if(sel.includes(d.id)){sel=sel.filter(x=>x!==d.id)}else sel=[...sel,d.id];store.set("sel",sel);render()};
    $("decks").append(b)});
  $("dir").hidden=!S;if(S)$("dir").textContent=MODES[S.mode||mode];
}

function render(){
  renderChips();
  $("undo").disabled=!history.length;$("undo").hidden=!S;$("import").disabled=!!S;
  $("wrap").classList.toggle("idle",!S||!S.queue.length);
  const card=$("card");card.classList.toggle("top",!S); // start screen is top-aligned so changing options never shifts the controls
  if(!S){ // start panel
    $("end").hidden=true;
    const now=Date.now(),today=SRS.day(now),p=pool(),kn=p.filter(it=>known(it.key)).length;
    const due=p.filter(it=>stats[it.key]&&stats[it.key].due<=today).length,tomorrow=p.filter(it=>stats[it.key]&&stats[it.key].due===today+1).length;
    const nw=Math.min(p.filter(it=>!stats[it.key]).length,Math.max(0,SRS.NEW_PER_DAY-newToday(now))),extra=!due&&!nw;
    const cards=ALL.filter(c=>sel.includes(c.deck.id)),np=cards.filter(unlocked).length;
    const why=(extra?`Nothing due${tomorrow?` (${tomorrow} tomorrow)`:""}, so this is an extra round of your weakest cards. `:"")+
      (mode==="mix"?`EN → CZ is open for ${np} of ${cards.length} cards, once you know the CZ → EN side.`
      :mode==="r"?"Only CZ → EN. Mix also practises saying the words in Czech.":"Only EN → CZ, including cards you haven't learned yet.");
    $("count").textContent=`${kn} / ${p.length} umím`;$("fill").style.width=(p.length?kn/p.length*100:0)+"%";
    if(!sel.length){card.innerHTML=`<div class="panel"><b>Vyberte balíček</b><span class="note">Pick one or more decks above to start a round.</span></div>`;return}
    card.innerHTML=`<div class="panel"><span class="tag">${esc(sel.map(id=>DECKS.find(d=>d.id===id).name).join(" + "))}</span>
      <div class="stats"><div><strong>${due}</strong>opakovat</div><div><strong>${nw}</strong>nové</div><div><strong>${kn}</strong>umím</div></div>
      <div class="seg" role="group" aria-label="Direction">${Object.entries(MODES).map(([k,v])=>`<button type="button" data-m="${k}" aria-pressed="${k===mode}">${v}</button>`).join("")}</div>
      <div class="seg" role="group" aria-label="Cards per round">${SIZES.map(n=>`<button type="button" data-n="${n}" class="n" aria-pressed="${n===size}">${n}</button>`).join("")}</div>
      <button class="restart" id="go" type="button">${extra?"Procvičit navíc":"Začít kolo"}</button>
      <span class="note">${why}</span></div>`;
    card.querySelectorAll(".seg button.n").forEach(b=>b.onclick=e=>{e.stopPropagation();size=+b.dataset.n;store.set("size",size);render()});
    card.querySelectorAll(".seg button[data-m]").forEach(b=>b.onclick=e=>{e.stopPropagation();mode=b.dataset.m;store.set("mode",mode);render()});
    $("go").onclick=e=>{e.stopPropagation();newRound()};return;
  }
  $("end").hidden=false;
  $("count").textContent=`${S.done} / ${S.total}`;$("fill").style.width=(S.total?S.done/S.total*100:0)+"%";
  if(!S.queue.length){ // round finished
    $("end").hidden=true;
    const first=S.total-S.missed.length;
    card.innerHTML=`<div class="panel"><b>Hotovo!</b><span class="note">${first} of ${S.total} right on the first try.</span>
      ${S.missed.length?`<ul class="missed">${S.missed.map(k=>`<li>${esc(BY[k].card.cz)} <span>– ${esc(BY[k].card.en)}</span></li>`).join("")}</ul>`:""}
      <button class="restart" id="go" type="button">Další kolo</button><button class="link" id="home" type="button">Change decks or size</button></div>`;
    $("go").onclick=e=>{e.stopPropagation();newRound()};$("home").onclick=e=>{e.stopPropagation();endRound()};return;
  }
  $("actions").classList.toggle("off",!flipped);
  const it=BY[S.queue[0]],c=it.card,cs=it.dir==="r";
  const front=cs?c.cz:c.en, back=cs?c.en:c.cz;
  card.innerHTML=`<span class="tag">${esc(c.deck.name)} · ${cs?"CZ → EN":"EN → CZ"}${stats[it.key]?"":" · nová"}</span><div class="front" lang="${cs?"cs":"en"}">${esc(front)}</div>`+
    (flipped?`<div class="back"><div class="answer" lang="${cs?"en":"cs"}">${esc(back)}</div>${c.note?`<div class="note">${esc(c.note)}</div>`:""}</div>`
            :`<div class="hint">${cs?"tap to flip":"say it in Czech out loud, then tap"}</div>`)+
    (canSpeak()&&(cs||flipped)?`<button class="say" id="say" type="button">▶ poslechnout</button>`:"");
  const sb=$("say");if(sb)sb.onclick=e=>{e.stopPropagation();speak(c.cz.replace(/___/g,""))};
}
// Backup: progress lives in this browser only, so export/import is the way to move it or keep a copy.
function exportProgress(){
  const date=new Date().toISOString().slice(0,10),name=`karticky-${date}.json`;
  const blob=new Blob([JSON.stringify({app:"karticky",exported:new Date().toISOString(),stats,log})],{type:"application/json"});
  const file=new File([blob],name,{type:"application/json"});
  if(navigator.canShare&&navigator.canShare({files:[file]})){navigator.share({files:[file],title:name}).catch(()=>{});return} // phones: share sheet (Save to Files, etc.)
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1e4)}
function importProgress(text){
  let data;try{data=JSON.parse(text)}catch(e){}
  if(!data||data.app!=="karticky"||!data.stats||typeof data.stats!=="object"){alert("That file isn't a Kartičky backup.");return}
  const next=SRS.migrateAll(data.stats,Date.now()),n=Object.keys(next).length,when=data.exported?new Date(data.exported).toLocaleString():"an unknown date";
  if(!confirm(`Replace the progress on this device with this backup?\n\n${n} card sides, saved ${when}.`))return;
  stats=next;log=Object.fromEntries(Object.entries(data.log||{}).filter(([k,v])=>next[k]&&Array.isArray(v)&&v.length&&v.every(e=>Array.isArray(e)&&Number.isFinite(e[0]))));S=null;history=[];save();render()}
function flip(){if(!S||!S.queue.length||flipped)return;flipped=true;render()}

let csVoice=null;
function loadVoice(){try{csVoice=speechSynthesis.getVoices().find(v=>/^cs/i.test(v.lang))||null}catch(e){}}
function canSpeak(){return "speechSynthesis" in window && !!csVoice}
function speak(t){try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(t);u.voice=csVoice;u.lang="cs-CZ";u.rate=.9;speechSynthesis.speak(u)}catch(e){}}
if("speechSynthesis" in window){loadVoice();try{speechSynthesis.onvoiceschanged=()=>{loadVoice();render()}}catch(e){}}

$("card").onclick=flip;
$("card").onkeydown=e=>{if(e.key===" "||e.key==="Enter"){e.preventDefault();flip()}};
$("export").onclick=exportProgress;$("import").onclick=()=>$("file").click();
$("file").onchange=e=>{const f=e.target.files[0];e.target.value="";if(f)f.text().then(importProgress)};
$("again").onclick=()=>answer(false);$("know").onclick=()=>answer(true);$("undo").onclick=undo;
$("end").onclick=()=>{if(endArmed){endRound();return}const b=$("end");b.textContent="Tap again to end round";b.classList.add("warn");endArmed=setTimeout(disarmEnd,3000)};
document.addEventListener("keydown",e=>{if(e.target.tagName==="BUTTON")return;if(e.key==="1")answer(false);if(e.key==="2")answer(true)});
render();
// Offline + instant launch
if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
// Ask the browser not to evict saved progress
try{navigator.storage&&navigator.storage.persist&&navigator.storage.persist()}catch(e){}
