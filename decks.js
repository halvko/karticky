// Cards: [Czech, English, optional note]. Cards are tracked by deck id + Czech text,
// so renaming the Czech side of a card resets its progress; adding or reordering cards is safe.
const DECKS = [
 {id:"l2", name:"Lekce 2", sub:"30. září · kde je…?", cards:[
  ["vlevo","on the left (kde?)","kde? = where · kam? = where to: doleva"],["vpravo","on the right (kde?)","kam? → doprava"],
  ["nahoře","at the top, up there (kde?)","kam? → nahoru"],["dole","at the bottom, down there (kde?)","kam? → dolů"],
  ["uprostřed","in the middle"],["vedle banky","next to the bank","vedle + genitive"],["nad řekou","above the river","nad městem = above the town"],
  ["rovně","straight ahead"],["doprava","to the right (kam?)","kde? → vpravo"],["doleva","to the left (kam?)","kde? → vlevo"],["daleko","far"],["blízko","near, close"],["pěšky","on foot"],
  ["Prosím vás, kde je hotel Hilton?","Excuse me, where is the Hilton hotel?"],
  ["Nevíte, kde je metro?","Do you know where the metro is?","lit. “you don't know…” – the polite way to ask"],
  ["Musíte jet tři stanice metrem.","You have to go three stops by metro."],
  ["Musíte jít rovně a pak doprava.","You have to go straight and then right."],
  ["Stanice je tam vpravo dole.","The station is down there on the right.","where it is (kde?): vpravo, dole · where you go (kam?): doprava, dolů"],
  ["kde? / kam?","where? / where to?","Kde je banka? – Vlevo. · Kam jdete? – Doleva."],
  ["Vidíte ten bílý dům?","Do you see that white house?"],["Kolik stojí lístek?","How much is a ticket?"],
  ["Nevím.","I don't know.","vím = I know"],["Nemluvím moc česky.","I don't speak much Czech."],
  ["ta stanice","station (metro)"],["ta zastávka","stop (bus, tram)"],["to nádraží","station (train, bus)"],
  ["ta vesnice","village","Bydlí na vesnici."],["ten kostel","church","Kostel je vedle zastávky."],["ta řeka","river"],["ta socha","statue"],
  ["ten penzion","guesthouse","Budu bydlet v penzionu."],["hledat","to look for","Turistka hledá hotel."],
  ["poprvé","for the first time","Jedu do Koreje poprvé."],["Letím v deset ráno.","I'm flying at ten in the morning."],
  ["Dnes jdu na jógu.","Today I'm going to yoga."],["Každý týden chodím na jógu.","I go to yoga every week.","jdu = once / now, chodím = regularly"],
  ["Doufám…","I hope…"],["hotovo","done, finished"],["nic","nothing"],["ten zub, zuby","tooth, teeth"],["ten oběd","lunch","Oni dělají oběd."],
  ["Bolí mě…","My … hurts","Bolí mě koleno."],["to srdce","heart"],["ten hrudník","chest"],
  ["Jablko je vedle knihy.","The apple is next to the book."]
 ]},
 {id:"telo", name:"Tělo", sub:"24.–29. září · body & yoga", cards:[
  ["ta ústa, ta pusa","mouth","ústa is plural, so it takes ta"],["ten krk","neck"],["to rameno","shoulder"],["ta ruka, ruce","arm/hand, arms/hands"],["levá / pravá","left / right"],
  ["ta noha","leg (foot)"],["to koleno","knee"],["to břicho","belly"],["ta záda","back","always plural, so it takes ta"],["to chodidlo","sole of the foot","from chodit = to walk"],
  ["ta dlaň","palm"],["ten prst, prsty","finger, fingers"],["ten palec","thumb"],["Držím palce!","Fingers crossed!","lit. “I'm holding thumbs”"],
  ["protáhnout se","to stretch"],["Tlačte ramena dolů.","Push your shoulders down."],["nahoru","up, upwards (kam?)","kde? → nahoře"],["dolů","down, downwards (kam?)","kde? → dole"],
  ["dopředu","forward (kam?)"],["dozadu","backwards (kam?)"],["zpátky","back (return)"],["ten nádech","inhale, in-breath"],["ten výdech","exhale, out-breath"],
  ["hluboký nádech","deep breath"],["dýchat","to breathe"],["zadržet dech","to hold your breath"],
  ["pozice dítě","child's pose"],["pozice kočka","cat pose"],["pozice pes","downward dog","the teacher's note: like a roof (střecha)"],
  ["pozice prkno","plank"],["pozice kobra","cobra"],["pozice bojovník","warrior pose","bojovat = to fight"],["pozice strom","tree pose"]
 ]},
 {id:"l1", name:"Lekce 1", sub:"3.–21. září · fráze", cards:[
  ["Jak se řekne ‘apple’?","How do you say ‘apple’?","jablko"],["Co to znamená?","What does it mean?"],["Jak se to píše?","How is it spelled?"],
  ["Ještě jednou, prosím.","Once more, please."],["Mám otázku.","I have a question."],["Promiňte, nerozumím.","Sorry, I don't understand."],
  ["Mluvím trochu česky.","I speak a little Czech."],["Mluvím plynule anglicky.","I speak English fluently."],["Mluvíte anglicky?","Do you speak English?"],
  ["Těší mě.","Nice to meet you."],["Jsem z Dánska.","I'm from Denmark."],["Bydlím v Praze.","I live in Prague."],
  ["Pracuju jako programátor.","I work as a programmer."],["Jste ženatý?","Are you married? (asking a man)","vdaná = married, for a woman"],["Má mladšího bratra.","He/she has a younger brother.","mladší = younger, starší = older"],
  ["Rád cvičím ve fitku.","I like working out at the gym."],["Rád piju perlivou vodu.","I like drinking sparkling water."],
  ["To záleží na náladě.","It depends on the mood."],["Mám se dobře.","I'm doing well."],["Jde to. / Ujde to.","It's OK. / Not bad."],
  ["Cestoval jsem do Chorvatska.","I travelled to Croatia."],["Mám dovolenou.","I'm on holiday."],
  ["Měj se hezky! / Mějte se hezky!","Take care! (informal / formal)"],["Můžete prosím sdílet obrazovku?","Could you share your screen, please?"],
  ["To je zajímavý problém.","That's an interesting problem.","zajímavá žena, zajímavé auto"],["ta slečna","young (unmarried) woman, Miss"],
  ["S dovolením.","Excuse me (passing by)."],["Dále!","Come in!"],["ta střecha","roof"],["ten slon","elephant"],["ta slepice","hen"],
  ["Moji rodiče mají malou zahradu.","My parents have a small garden."],["ten cizinec / ta cizinka","foreigner (m / f)"],
  ["Učím se česky.","I'm learning Czech."],["Čeština je krásný jazyk.","Czech is a beautiful language."],["Umím zpívat.","I can sing."],
  ["vařit","to cook"],["kreslit obrázek","to draw a picture"],["Pamatujete? – Nepamatuju.","Do you remember? – I don't remember."],
  ["Můžeme si tykat?","Can we use ‘ty’ (be informal)?"],["Promiňte, musím jít.","Sorry, I have to go."],["Na shledanou. / Čus.","Goodbye. (formal / informal)"],
  ["To nic.","No problem (reply to ‘sorry’)."],["Odkud jste? / Odkud jsi?","Where are you from? (formal / informal)"]
 ]},
 {id:"gram", name:"Gramatika", sub:"být, dělat, ten/ta/to", cards:[
  ["být · já","jsem","nejsem · spoken /sem/"],["být · ty","jsi","nejsi"],["být · on, ona, to","je","není"],["být · my","jsme","nejsme"],
  ["být · vy","jste","nejste"],["být · oni","jsou","nejsou"],
  ["dělat · já","dělám"],["dělat · ty","děláš"],["dělat · on, ona","dělá"],["dělat · my","děláme"],["dělat · vy","děláte"],["dělat · oni","dělají","Oni dělají oběd."],
  ["___ hotel","ten hotel"],["___ banka","ta banka"],["___ kino","to kino"],["___ zastávka","ta zastávka"],["___ nádraží","to nádraží"],
  ["___ kostel","ten kostel"],["___ město","to město"],["___ obrazovka","ta obrazovka","ten obraz, ten obrázek"],
  ["Kdo je to?","Who is it?","To je Václav Havel."],["Co je to?","What is it?","To je auto."],
  ["obrázek → 2, 3, 4 · 5+","obrázky · obrázků"]
 ]}
];

// Cards that give each other away: seeing one makes the others easy by contrast ("the other one"),
// which inflates their scores. A round takes at most one card from each group. Matched by Czech text in any deck.
const RELATED = [
 ["vlevo","vpravo","doleva","doprava","levá / pravá","kde? / kam?","Stanice je tam vpravo dole."],
 ["nahoře","dole","nahoru","dolů","Tlačte ramena dolů."],
 ["dopředu","dozadu","zpátky"],
];
