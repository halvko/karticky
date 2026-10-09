// Scheduler and round logic. Run: node --test tests/*.test.js
const test=require("node:test"),assert=require("node:assert/strict");
const SRS=require("../srs.js");
const D=864e5, NOON=Date.UTC(2026,9,8,10);
const card=(id,dir)=>({key:`${id}#${dir}`,card:{id},dir});
const seq=()=>{let i=0;return ()=>(i=(i*9301+49297)%233280)/233280}; // deterministic "random"

test("a new side answered right is due in a few days, a miss the next day",()=>{
  const g=SRS.review(null,SRS.GOOD,NOON),a=SRS.review(null,SRS.AGAIN,NOON),today=SRS.day(NOON);
  assert.equal(g.due-today,3);assert.equal(a.due-today,1);assert.equal(a.w,1);assert.equal(g.n,1);
});

test("three right answers in one day, or two a few days apart, make a side known",()=>{
  let st=null;for(let i=0;i<2;i++)st=SRS.review(st,SRS.GOOD,NOON+i*6e4);
  assert.ok(st.s<SRS.KNOWN);
  st=SRS.review(st,SRS.GOOD,NOON+2*6e4);assert.ok(st.s>=SRS.KNOWN);
  const spaced=SRS.review(SRS.review(null,SRS.GOOD,NOON),SRS.GOOD,NOON+3*D);
  assert.ok(spaced.s>=SRS.KNOWN);assert.ok(spaced.due-SRS.day(NOON+3*D)>7);
});

test("a miss after a long gap lowers stability and raises difficulty",()=>{
  const st=SRS.review(SRS.review(null,SRS.GOOD,NOON),SRS.GOOD,NOON+3*D);
  const lapse=SRS.review(st,SRS.AGAIN,NOON+20*D);
  assert.ok(lapse.s<st.s);assert.ok(lapse.d>st.d);assert.equal(lapse.due,SRS.day(NOON+20*D)+1);
});

test("study days roll over at 4am, not midnight",()=>{
  const evening=new Date(2026,9,8,23,30).getTime(),lateNight=new Date(2026,9,9,2,0).getTime(),morning=new Date(2026,9,9,5,0).getTime();
  assert.equal(SRS.day(evening),SRS.day(lateNight));assert.equal(SRS.day(morning),SRS.day(evening)+1);
});

test("old {b,n,w,t} stats migrate; level 3 stays known; junk is dropped; new state passes through",()=>{
  const m=SRS.migrateAll({"a#r":{b:3,n:4,w:1,t:NOON},"b#r":{b:0,n:2,w:2,t:NOON},"c#r":{x:1},"d#r":null},NOON+D);
  assert.deepEqual(Object.keys(m),["a#r","b#r"]);
  assert.ok(m["a#r"].s>=SRS.KNOWN);assert.ok(m["b#r"].s<SRS.KNOWN);assert.ok(m["b#r"].d>m["a#r"].d);
  assert.equal(m["a#r"].due,SRS.day(NOON)+SRS.interval(m["a#r"].s));
  const fresh=SRS.review(null,SRS.GOOD,NOON);assert.equal(SRS.migrate(fresh,NOON),fresh);
});

test("a round never has both directions of one card",()=>{
  const items=[],stats={},due={...SRS.review(null,SRS.GOOD,NOON-5*D),due:SRS.day(NOON)};
  for(let i=0;i<30;i++){items.push(card("c"+i,"r"),card("c"+i,"p"));stats["c"+i+"#r"]=stats["c"+i+"#p"]=due} // both directions due
  const {queue}=SRS.buildRound(items,stats,{size:40,now:NOON,rand:seq()});
  const ids=queue.map(k=>k.split("#")[0]);assert.equal(ids.length,30);assert.equal(new Set(ids).size,ids.length);
});

test("due sides come first, then new ones up to the daily cap",()=>{
  const items=[],stats={};
  for(let i=0;i<5;i++){items.push(card("due"+i,"r"));stats["due"+i+"#r"]={...SRS.review(null,SRS.GOOD,NOON-10*D),due:SRS.day(NOON)}}
  for(let i=0;i<5;i++){items.push(card("later"+i,"r"));stats["later"+i+"#r"]=SRS.review(null,SRS.GOOD,NOON)}
  for(let i=0;i<40;i++)items.push(card("new"+i,"r"));
  const r=SRS.buildRound(items,stats,{size:8,now:NOON,newToday:SRS.NEW_PER_DAY-3,rand:seq()});
  assert.equal(r.extra,false);
  assert.equal(r.queue.filter(k=>k.startsWith("due")).length,5);
  assert.equal(r.queue.filter(k=>k.startsWith("new")).length,3);
  assert.equal(r.queue.filter(k=>k.startsWith("later")).length,0);
});

test("a small round takes the most-forgotten due sides",()=>{
  const stats={"old#r":{...SRS.review(null,SRS.GOOD,NOON-30*D),due:SRS.day(NOON)},"recent#r":{...SRS.review(null,SRS.GOOD,NOON-2*D),due:SRS.day(NOON)}};
  const r=SRS.buildRound([card("recent","r"),card("old","r")],stats,{size:1,now:NOON,rand:seq()});
  assert.deepEqual(r.queue,["old#r"]);
});

test("newly unlocked EN → CZ sides are introduced before brand-new cards",()=>{
  const items=[];for(let i=0;i<10;i++)items.push(card("x"+i,"r"));items.push(card("u","p"));
  const r=SRS.buildRound(items,{},{size:20,now:NOON,newToday:SRS.NEW_PER_DAY-1,rand:seq()});
  assert.deepEqual(r.queue,["u#p"]);
});

test("with nothing due and no new cards left, the round is an extra round of the weakest sides",()=>{
  const items=[card("weak","r"),card("strong","r"),card("new","r")];
  const stats={"weak#r":SRS.review(null,SRS.AGAIN,NOON),"strong#r":SRS.review(SRS.review(null,SRS.GOOD,NOON-5*D),SRS.GOOD,NOON)};
  const r=SRS.buildRound(items,stats,{size:1,now:NOON+6e4,newToday:SRS.NEW_PER_DAY,rand:seq()});
  assert.equal(r.extra,true);assert.deepEqual(r.queue,["weak#r"]);
});

test("a round takes at most one card from a group of related cards",()=>{
  const due={...SRS.review(null,SRS.GOOD,NOON-5*D),due:SRS.day(NOON)},stats={},items=[];
  for(const id of ["vlevo","vpravo","doleva","doprava","daleko"])for(const dir of ["r","p"]){
    items.push({key:`${id}#${dir}`,card:{id,group:id==="daleko"?undefined:"lr"},dir});stats[`${id}#${dir}`]=due}
  const r=SRS.buildRound(items,stats,{size:10,now:NOON,rand:seq()});
  assert.equal(r.queue.length,2);
  assert.equal(r.queue.filter(k=>k.startsWith("daleko")).length,1);
});

test("when due and new sides don't fill a round, the weakest other sides top it up",()=>{
  const items=[],stats={};
  items.push(card("due","r"));stats["due#r"]={...SRS.review(null,SRS.GOOD,NOON-10*D),due:SRS.day(NOON)};
  for(let i=0;i<10;i++){items.push(card("seen"+i,"r"));stats["seen"+i+"#r"]=SRS.review(null,i<3?SRS.AGAIN:SRS.GOOD,NOON-6e4)}
  for(let i=0;i<10;i++)items.push(card("new"+i,"r"));
  const r=SRS.buildRound(items,stats,{size:6,now:NOON,newToday:SRS.NEW_PER_DAY-2,rand:seq()});
  assert.equal(r.extra,false);assert.equal(r.queue.length,6);
  assert.ok(r.queue.includes("due#r"));
  assert.equal(r.queue.filter(k=>k.startsWith("new")).length,2);
  assert.deepEqual(r.queue.filter(k=>k.startsWith("seen")).sort(),["seen0#r","seen1#r","seen2#r"]); // the three misses are weakest
});
