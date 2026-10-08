// Spaced repetition: FSRS-5 with its published default parameters (github.com/open-spaced-repetition).
// Pure functions with no DOM access, so tests/ can load this file in Node.
// A card side's state is {s, d, t, due, n, w}: stability in days (time until recall drops to 90%),
// difficulty 1–10, last review time (ms), due study day, review count, misses.
(function(root){
const W=[0.40255,1.18385,3.173,15.69105,7.1949,0.5345,1.4604,0.0046,1.54575,0.1192,1.01925,1.9395,0.11,0.29605,2.2698,0.2315,2.9898,0.51655,0.6621];
const DECAY=-0.5, FACTOR=19/81, RETAIN=0.9, MAX_IVL=365, AGAIN=1, GOOD=3;
const KNOWN=5;        // stability (days) that counts as "umím"; three right answers in a row, or two spread over a few days
const NEW_PER_DAY=20; // new card sides introduced per study day

const clampD=d=>Math.min(10,Math.max(1,d));
const initD=g=>clampD(W[4]-Math.exp(W[5]*(g-1))+1);
// Study days roll over at 4am local time, so late-night practice counts for that day.
function day(ms){return Math.floor((ms-new Date(ms).getTimezoneOffset()*6e4-4*36e5)/864e5)}
function retrievability(st,now){return Math.pow(1+FACTOR*Math.max(0,now-st.t)/864e5/st.s,DECAY)}
function interval(s){return Math.min(MAX_IVL,Math.max(1,Math.round(s/FACTOR*(Math.pow(RETAIN,1/DECAY)-1))))}

// One graded review (AGAIN or GOOD) of a card side; st is null for a new side. Returns the new state.
function review(st,g,now){
  let s,d;
  if(!st){s=W[g-1];d=initD(g)}
  else{
    if(day(now)===day(st.t))s=st.s*Math.exp(W[17]*(g-3+W[18])); // reviewed again the same day
    else{const r=retrievability(st,now);
      s=g===AGAIN?Math.min(st.s,W[11]*Math.pow(st.d,-W[12])*(Math.pow(st.s+1,W[13])-1)*Math.exp(W[14]*(1-r)))
        :st.s*(1+Math.exp(W[8])*(11-st.d)*Math.pow(st.s,-W[9])*(Math.exp(W[10]*(1-r))-1))}
    d=clampD(W[7]*initD(4)+(1-W[7])*(st.d-W[6]*(g-3)*(10-st.d)/9));
  }
  s=Math.max(.1,s);
  return {s,d,t:now,due:day(now)+(g===AGAIN?1:interval(s)), // a missed side always comes back the next day
    n:(st?st.n:0)+1,w:(st?st.w:0)+(g===AGAIN?1:0)}
}

// Stats saved before FSRS were {b: level 0–6, n, w, t}. Level 3 maps to KNOWN, so nothing already learned gets locked again.
const LEGACY_S=[.5,1,2.5,5,8,12,16];
function migrate(st,now){
  if(!st||typeof st!=="object")return null;
  if([st.s,st.d,st.t,st.due].every(Number.isFinite))return st;
  if(!Number.isFinite(st.b))return null;
  const s=LEGACY_S[Math.max(0,Math.min(6,st.b|0))],t=Number.isFinite(st.t)&&st.t>0?st.t:now,w=st.w|0;
  return {s,d:clampD(initD(GOOD)+1.5*w),t,due:day(t)+interval(s),n:st.n|0,w}
}
function migrateAll(stats,now){const out={};for(const[k,v]of Object.entries(stats||{})){const m=migrate(v,now);if(m)out[k]=m}return out}

function shuffle(a,rand){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}

// Build a round from the eligible card sides ({key, card:{id, group?}, dir}): due sides first (least likely
// to be remembered first), then new sides up to the daily cap. If there is neither, it is an extra
// round of the weakest sides. At most one side per card, or per group of related cards, in a round.
function buildRound(items,stats,{size,now,newToday=0,rand=Math.random}){
  const seen=new Set(),out=[];
  const add=it=>{const k=it.card.group||it.card.id;if(out.length>=size||seen.has(k))return false;seen.add(k);out.push(it.key);return true};
  const byR=(a,b)=>retrievability(stats[a.key],now)-retrievability(stats[b.key],now);
  const today=day(now);
  items.filter(it=>stats[it.key]&&stats[it.key].due<=today).sort(byR).forEach(add);
  let left=NEW_PER_DAY-newToday;
  const fresh=shuffle(items.filter(it=>!stats[it.key]),rand).sort((a,b)=>(b.dir==="p")-(a.dir==="p")); // unlocked EN → CZ sides first
  for(const it of fresh){if(left<=0)break;if(add(it))left--}
  if(out.length)return {queue:shuffle(out,rand),extra:false};
  items.filter(it=>stats[it.key]).sort(byR).forEach(add);
  return {queue:shuffle(out,rand),extra:true}
}

const SRS={AGAIN,GOOD,KNOWN,NEW_PER_DAY,day,retrievability,interval,review,migrate,migrateAll,buildRound};
if(typeof module!=="undefined"&&module.exports)module.exports=SRS;else root.SRS=SRS;
})(this);
