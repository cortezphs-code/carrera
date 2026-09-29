const SCENE_IMAGES = JSON.parse(document.getElementById("scene-images-data").textContent);
/* =========================================================
   CARRERA — Simulador de Carreira
   Lógica completa do jogo (vanilla JS, sem dependências)
   ========================================================= */

const EVENTS = JSON.parse(document.getElementById('events-data').textContent);


// Logos reais incorporados ao HTML: funcionam offline e não dependem de hotlinks.
const TEAM_LOGOS = JSON.parse(document.getElementById('team-logos-data').textContent);
function escapeLogoText(value){
  return String(value).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function renderTeamLogo(team, compact=false){
  if(!team) return '';
  const name = escapeLogoText(team.name);
  const logo = TEAM_LOGOS.teams[team.name];
  const size = compact ? ' team-logo--compact' : '';
  // Sem imagem confirmada, identificação textual; nunca um emblema fictício.
  if(!logo) return `<span class="team-logo team-logo--text${size}" title="${name}">${name}</span>`;
  const label = escapeLogoText(logo.label);
  return `<span class="team-logo${size}${logo.light ? ' team-logo--light' : ''}">
    <img src="${TEAM_LOGOS.assets[logo.asset]}" alt="Logo de ${label}" class="${logo.fit==='cover'?'team-logo--crop':''}" decoding="async"
      onerror="this.hidden=true;this.nextElementSibling.hidden=false">
    <span class="team-logo-fallback" hidden>${name}</span>
  </span>`;
}

/* ---------------- Dados estáticos ---------------- */

const NATIONS = [
  ["BR","Brasil"],["AR","Argentina"],["US","Estados Unidos"],["GB","Reino Unido"],
  ["DE","Alemanha"],["IT","Itália"],["FR","França"],["ES","Espanha"],["NL","Países Baixos"],
  ["MX","México"],["MC","Mônaco"],["AU","Austrália"],["JP","Japão"],["CA","Canadá"],
  ["FI","Finlândia"],["BE","Bélgica"],["PT","Portugal"],["ZA","África do Sul"],["NZ","Nova Zelândia"],["DK","Dinamarca"]
];

const STYLES = {
  agressivo:{ label:"Agressivo", desc:"Ultrapassagem e Contato pesam mais. Consistência sofre.",
    weights:{qualy:1, overtake:1.35, oval:1, contact:1.3, consistency:0.7, rain:1, tyre:0.9, mental:1, eng:0.9}},
  tecnico:{ label:"Técnico", desc:"Ritmo de qualificação e Trabalho com engenharia pesam mais.",
    weights:{qualy:1.35, overtake:1, oval:0.9, contact:0.8, consistency:1.05, rain:0.95, tyre:1.1, mental:1, eng:1.3}},
  consistente:{ label:"Consistente", desc:"Consistência e Gestão de pneu pesam mais. Ultrapassagem sofre.",
    weights:{qualy:1, overtake:0.75, oval:1, contact:0.85, consistency:1.35, rain:1, tyre:1.25, mental:1.05, eng:1}},
  chuva:{ label:"Instinto de Chuva", desc:"Chuva e Mental sob pressão pesam mais.",
    weights:{qualy:0.95, overtake:1.05, oval:0.9, contact:1, consistency:0.95, rain:1.4, tyre:1, mental:1.25, eng:0.9}},
};

/* pesos por categoria — pra recalcular o OVR conforme a fase da carreira */
const CATEGORY_WEIGHTS = {
  kart:      {qualy:1, overtake:1.1, oval:0.6, contact:1, consistency:1, rain:1.1, tyre:0.8, mental:1, eng:0.9},
  f4:        {qualy:1.1, overtake:1.1, oval:0.6, contact:0.9, consistency:1, rain:1, tyre:0.9, mental:1, eng:1},
  f3:        {qualy:1.2, overtake:1.15, oval:0.5, contact:0.8, consistency:1.05, rain:1.1, tyre:0.95, mental:1.05, eng:1.05},
  f2:        {qualy:1.2, overtake:1.2, oval:0.5, contact:0.8, consistency:1.05, rain:1.1, tyre:1, mental:1.1, eng:1.1},
  f1:        {qualy:1.3, overtake:1.2, oval:0.4, contact:0.7, consistency:1.1, rain:1.25, tyre:1.1, mental:1.2, eng:1.25},
  indycar:   {qualy:1, overtake:1, oval:1.3, contact:0.9, consistency:1.15, rain:0.9, tyre:1.25, mental:1.05, eng:1},
  nascar:    {qualy:0.7, overtake:0.9, oval:1.4, contact:1.35, consistency:1, rain:0.7, tyre:1.1, mental:1.15, eng:0.85},
  stockcar:  {qualy:0.9, overtake:1.1, oval:0.9, contact:1.15, consistency:1.05, rain:1, tyre:1.15, mental:1.05, eng:0.95},
  veterano:  {qualy:0.85, overtake:0.9, oval:0.95, contact:0.85, consistency:1.15, rain:1, tyre:1.05, mental:1.2, eng:1.05},
};

const CATEGORY_LABEL = {
  kart:"Kart", f4:"Fórmula 4", f3:"Fórmula 3", f2:"Fórmula 2", f1:"Fórmula 1",
  indycar:"IndyCar", nascar:"NASCAR", stockcar:"Stock Car Brasil", veterano:"Veterano"
};
const CATEGORY_ICON = {
  kart:racingIcon('flag'), f4:racingIcon('flag'), f3:racingIcon('flag'), f2:racingIcon('flag'), f1:racingIcon('cup'), indycar:racingIcon('flag'), nascar:racingIcon('flag'), stockcar:racingIcon('flag'), veterano:racingIcon('cup')
};
const CATEGORY_ROUNDS = { kart:9, f4:8, f3:8, f2:8, f1:8, indycar:5, nascar:5, stockcar:7, veterano:5 };
const CATEGORY_GATE   = { f4:46, f3:54, f2:62, f1:76, indycar:56, nascar:48, stockcar:58 };

// Referência fixa: equipes de 2026. Kart internacional, F4 Brasil, NASCAR Cup;
// veteranos usam equipes de endurance. Salários e estrelas são regras fictícias do jogo.
const TEAMS_2026 = {
  "kart": [
    [
      "Tony Kart Racing Team",
      "Itália"
    ],
    [
      "CRG Racing Team",
      "Itália"
    ],
    [
      "Birel Art Racing",
      "Itália"
    ],
    [
      "KR Motorsport",
      "Itália"
    ]
  ],
  "f4": [
    [
      "TMG Racing",
      "Brasil"
    ],
    [
      "Bandeiras Bassani",
      "Brasil"
    ],
    [
      "Cavaleiro Sports",
      "Brasil"
    ]
  ],
  "f3": [
    [
      "Campos Racing",
      "Espanha"
    ],
    [
      "Trident",
      "Itália"
    ],
    [
      "MP Motorsport",
      "Países Baixos"
    ],
    [
      "ART Grand Prix",
      "França"
    ],
    [
      "Van Amersfoort Racing",
      "Países Baixos"
    ],
    [
      "Rodin Motorsport",
      "Reino Unido"
    ],
    [
      "PREMA Racing",
      "Itália"
    ],
    [
      "Hitech",
      "Reino Unido"
    ],
    [
      "AIX Racing",
      "Alemanha"
    ],
    [
      "DAMS Lucas Oil",
      "França"
    ]
  ],
  "f1": [
    [
      "McLaren",
      "Reino Unido"
    ],
    [
      "Ferrari",
      "Itália"
    ],
    [
      "Mercedes",
      "Alemanha"
    ],
    [
      "Red Bull Racing",
      "Áustria"
    ],
    [
      "Williams",
      "Reino Unido"
    ],
    [
      "Racing Bulls",
      "Itália"
    ],
    [
      "Aston Martin",
      "Reino Unido"
    ],
    [
      "Haas F1 Team",
      "Estados Unidos"
    ],
    [
      "Audi",
      "Alemanha"
    ],
    [
      "Alpine",
      "França"
    ],
    [
      "Cadillac",
      "Estados Unidos"
    ]
  ],
  "indycar": [
    [
      "A.J. Foyt Enterprises",
      "Estados Unidos"
    ],
    [
      "Abel Motorsports",
      "Estados Unidos"
    ],
    [
      "Andretti Global",
      "Estados Unidos"
    ],
    [
      "Arrow McLaren",
      "Estados Unidos"
    ],
    [
      "Chip Ganassi Racing",
      "Estados Unidos"
    ],
    [
      "Dale Coyne Racing",
      "Estados Unidos"
    ],
    [
      "Dreyer & Reinbold Racing",
      "Estados Unidos"
    ],
    [
      "ECR",
      "Estados Unidos"
    ],
    [
      "HMD Motorsports w/ AJ Foyt Racing",
      "Estados Unidos"
    ],
    [
      "Juncos Hollinger Racing",
      "Estados Unidos"
    ],
    [
      "Meyer Shank Racing",
      "Estados Unidos"
    ],
    [
      "Rahal Letterman Lanigan Racing",
      "Estados Unidos"
    ],
    [
      "Team Penske",
      "Estados Unidos"
    ]
  ],
  "nascar": [
    [
      "23XI Racing",
      "Estados Unidos"
    ],
    [
      "Front Row Motorsports",
      "Estados Unidos"
    ],
    [
      "Haas Factory Team",
      "Estados Unidos"
    ],
    [
      "Hendrick Motorsports",
      "Estados Unidos"
    ],
    [
      "Hyak Motorsports",
      "Estados Unidos"
    ],
    [
      "Joe Gibbs Racing",
      "Estados Unidos"
    ],
    [
      "Kaulig Racing",
      "Estados Unidos"
    ],
    [
      "Legacy Motor Club",
      "Estados Unidos"
    ],
    [
      "Richard Childress Racing",
      "Estados Unidos"
    ],
    [
      "Rick Ware Racing",
      "Estados Unidos"
    ],
    [
      "RFK Racing",
      "Estados Unidos"
    ],
    [
      "Spire Motorsports",
      "Estados Unidos"
    ],
    [
      "Trackhouse Racing",
      "Estados Unidos"
    ],
    [
      "Team Penske",
      "Estados Unidos"
    ],
    [
      "Wood Brothers Racing",
      "Estados Unidos"
    ]
  ],
  "stockcar": [
    [
      "A.Mattheis Vogel",
      "Brasil"
    ],
    [
      "A.Mattheis TMG",
      "Brasil"
    ],
    [
      "Blau Motorsport",
      "Brasil"
    ],
    [
      "Car Racing",
      "Brasil"
    ],
    [
      "Car Racing Sports",
      "Brasil"
    ],
    [
      "Cavaleiro Sports",
      "Brasil"
    ],
    [
      "Crown Racing",
      "Brasil"
    ],
    [
      "Eurofarma RC",
      "Brasil"
    ],
    [
      "Full Time Toyota Gazoo Racing",
      "Brasil"
    ],
    [
      "Mercado Livre Racing",
      "Brasil"
    ],
    [
      "Mercado Livre Racing Team",
      "Brasil"
    ],
    [
      "RC Team",
      "Brasil"
    ],
    [
      "Scuderia Bandeiras",
      "Brasil"
    ],
    [
      "Scuderia Bandeiras Sports",
      "Brasil"
    ],
    [
      "Scuderia Chiarelli",
      "Brasil"
    ],
    [
      "SG28 Racing",
      "Brasil"
    ],
    [
      "SG28 Team",
      "Brasil"
    ],
    [
      "Time Lubrax TMG",
      "Brasil"
    ]
  ],
  "veterano": [
    [
      "Ferrari AF Corse",
      "Itália"
    ],
    [
      "BMW M Team WRT",
      "Alemanha"
    ],
    [
      "Alpine Endurance Team",
      "França"
    ],
    [
      "Cadillac Hertz Team JOTA",
      "Estados Unidos"
    ]
  ],
  "f2": [
    [
      "Invicta Racing",
      "Reino Unido"
    ],
    [
      "Campos Racing",
      "Espanha"
    ],
    [
      "Trident",
      "Itália"
    ],
    [
      "MP Motorsport",
      "Países Baixos"
    ],
    [
      "ART Grand Prix",
      "França"
    ],
    [
      "Van Amersfoort Racing",
      "Países Baixos"
    ],
    [
      "Rodin Motorsport",
      "Reino Unido"
    ],
    [
      "PREMA Racing",
      "Itália"
    ],
    [
      "Hitech",
      "Reino Unido"
    ],
    [
      "AIX Racing",
      "Alemanha"
    ],
    [
      "DAMS Lucas Oil",
      "França"
    ]
  ]
};
const TEAM_CRESTS = ["🛡️","⚡","🔶","🦅","🐆","🔺","⭐","🔷","🦁","🐎","🏹","💠"];
function categoryTeams(category,year=state.year){
  if(category==='f1') return historicalF1Teams(year);
  const historical=historicalJuniorTeams(category,year);
  if(historical) return historical;
  return TEAMS_2026[category].map(([name,country],i)=>({id:name,name,country,crest:TEAM_CRESTS[i%TEAM_CRESTS.length]}));
}
// Identidades da F1 por temporada; patrocinadores não alteram a identidade da equipe.
// 2018 usa Force India no início do ano; a transição a Racing Point ocorre no ano seguinte.
function historicalF1Teams(year){
  const entries=[['ferrari','Ferrari','Itália'],['mclaren','McLaren','Reino Unido'],['mercedes','Mercedes','Alemanha'],['redbull','Red Bull Racing','Áustria'],['williams','Williams','Reino Unido']];
  entries.push(['enstone',year<=2011?'Renault':year<=2015?'Lotus F1 Team':year<=2020?'Renault':'Alpine',year>=2012&&year<=2015?'Reino Unido':'França']);
  entries.push(['sauber',year<=2018?'Sauber':year<=2023?'Alfa Romeo':year<=2025?'Kick Sauber':'Audi',year>=2026?'Alemanha':'Suíça']);
  entries.push(['faenza',year<=2019?'Toro Rosso':year<=2023?'AlphaTauri':year===2024?'RB':'Racing Bulls','Itália']);
  entries.push(['silverstone',year<=2018?'Force India':year<=2020?'Racing Point':'Aston Martin','Reino Unido']);
  if(year>=2016) entries.push(['haas','Haas','Estados Unidos']);
  if(year>=2026) entries.push(['cadillac','Cadillac','Estados Unidos']);
  if(year<=2014) entries.push(['caterham',year===2010?'Lotus Racing':year===2011?'Team Lotus':'Caterham','Malásia']);
  if(year<=2016) entries.push(['manor',year<=2011?'Virgin Racing':year<=2014?'Marussia':year===2015?'Manor Marussia':'Manor Racing','Reino Unido']);
  if(year<=2012) entries.push(['hrt','HRT','Espanha']);
  return entries.map(([id,name,country],i)=>({id,name,country,crest:TEAM_CRESTS[i%TEAM_CRESTS.length],historical:year<2026}));
}
// Seleção de equipes da base na época alcançável pela campanha de 2010.
function historicalJuniorTeams(category,year){
  let rows;
  if(category==='kart'&&year<2015) rows=[['Tony Kart Racing Team','Itália'],['CRG Racing Team','Itália'],['Birel Motorsport','Itália']];
  if(category==='f4'&&year<2014) rows=[['Josef Kaufmann Racing','Alemanha'],['Tech 1 Racing','França'],['Koiranen Motorsport','Finlândia']];
  if(category==='f3'&&year<2019) rows=[['Prema Powerteam','Itália'],['Mücke Motorsport','Alemanha'],['Carlin','Reino Unido']];
  if(category==='f2'&&year<2019) rows=[['DAMS','França'],['ART Grand Prix','França'],['Trident','Itália'],...(year<=2017?[['Racing Engineering','Espanha']]:[]),...(year>=2013?[['Russian Time','Rússia']]:[])];
  return rows?.map(([name,country],i)=>({id:name,name,country,crest:TEAM_CRESTS[i%TEAM_CRESTS.length],historical:true}));
}
const F1_RACE_COUNTS={2010:19,2011:19,2012:20,2013:19,2014:19,2015:19,2016:21,2017:20,2018:21,2019:21,2020:17,2021:22,2022:22,2023:22,2024:24,2025:24};
function seasonRaceCount(category=state.category,year=state.year){
  // A partir de 2026, referência do calendário anunciado; anos futuros são simulados.
  return category==='f1' ? (F1_RACE_COUNTS[year]||24) : CATEGORY_ROUNDS[category];
}
const CONTRACT_ROLES={test:'Piloto de Teste',second:'2º Piloto',first:'1º Piloto'};
function contractRole(ovr,stars,category){
  if(category==='kart') return ovr>=55?'first':'second';
  return ovr>=65+stars*3?'first':ovr>=35+stars*4?'second':'test';
}
function contractDescription(team){
  return `${CONTRACT_ROLES[team.role]||CONTRACT_ROLES.second} · ${team.role==='test'?'Pode correr até 8 corridas':'Todas as corridas'}`;
}
function currentSeasonTeam(team=state.team){
  if(!team||team.category!==state.category) return null;
  return categoryTeams(state.category).find(t=>t.id===team.id||t.name===team.name)||null;
}
// Parâmetros de equilíbrio por era. De 2026 em diante, são projeções do jogo.
function f1CarRating(team,year=state.year){
  const id=team?.id||categoryTeams('f1',year).find(t=>t.name===team?.name)?.id;
  const era=year<=2013?0:year<=2016?1:year<=2020?2:year<=2023?3:4;
  const ratings={
    redbull:[100,88,91,100,94],mercedes:[82,100,100,91,96],
    ferrari:[94,93,95,92,94],mclaren:[95,72,83,86,100],
    williams:[68,89,64,68,78],enstone:[86,72,79,77,70],
    sauber:[75,62,69,65,58],faenza:[70,72,76,73,74],
    silverstone:[77,79,83,83,76],haas:[62,72,73,65,72],
    cadillac:[50,50,50,50,52],caterham:[48,48,48,48,48],manor:[46,46,46,46,46]
  };
  const base=(ratings[id]||[65,65,65,65,65])[era];
  // Crescimento industrial gradual, separado dos investimentos do piloto.
  const growth=id==='sauber'?3.25:id==='cadillac'?2.5:0;
  const cycle=year>2026?Math.sin((year-2026)*1.15+(id||'').split('').reduce((a,c)=>a+c.charCodeAt(0),0)) * 4:0;
  return clamp(base+Math.max(0,year-2026)*growth+cycle,40,id==='sauber'?94:id==='cadillac'?88:100);
}
function f1TeamStars(team,year=state.year){
  const rating=f1CarRating(team,year);
  return rating>=94?5:rating>=85?4:rating>=73?3:rating>=58?2:1;
}
function playerCarPerformance(){
  if(state.category==='f1')return (f1CarRating(state.team)-80)*.4+projectStrength();
  return (['kart','f4','f3','f2'].includes(state.category)?clamp(state.team.stars||3,1,5)-1:0)+projectStrength();
}
function refreshSeasonTeam(){
  const identity=currentSeasonTeam();
  if(identity){
    const renamed=state.team.name!==identity.name;
    state.team={...state.team,...identity};
    if(state.category==='f1')state.team.stars=f1TeamStars(state.team);
    if(renamed) registerTeamStart();
  }else{
    state.team={...generateOffers(state.category,2)[0],ageStart:state.age};
    state.salaryWeek=state.team.weekly;
    registerTeamStart();
  }
}
/* CARRERA 2.0.0 — escolhas e consequências compartilhadas pelos dois modos. */
function careerSystems(){
  return state.careerSystems ||= {trust:60,preparation:60,potential:92,projects:{},pending:[],journal:[],sponsor:null,rival:null,lastStart:null,lastEnd:null};
}
function teamProjectKey(team=state.team){return `${team?.category||state.category}:${team?.id||team?.name||''}`;}
function careerNote(text){const c=careerSystems();c.journal.push({year:state.year,text});}
function projectStrength(){return careerSystems().projects[teamProjectKey()]||0;}
function recordContractChoice(){
  const c=careerSystems(),previous=c.contract;
  const key=teamProjectKey();
  if(previous&&previous.key!==key){
    const sameCategory=previous.category===state.category;
    const broken=sameCategory&&state.age<previous.until;
    c.trust=clamp(c.trust+(broken?-12:sameCategory?-3:2),0,100);
    if(broken)careerNote('Saiu antes do fim do contrato: a confiança das equipes caiu.');
    else if(sameCategory)careerNote('Escolheu uma nova equipe; o desenvolvimento do projeto anterior ficou para trás.');
    if(sameCategory&&c.sponsor&&state.year<=c.sponsor.until){
      state.careerEarnings-=c.sponsor.buyout;
      careerNote('A troca de equipe encerrou o patrocínio exclusivo e exigiu devolver €'+(c.sponsor.buyout/1000)+'k.');c.sponsor=null;
    }
  }else if(previous&&previous.until<=state.age){c.trust=clamp(c.trust+5,0,100);careerNote('Renovou após cumprir o contrato: ganhou confiança para construir uma dinastia.');}
  c.contract={key,category:state.category,until:state.team.ageStart+state.team.years};
}
function strategicEvents(){
  const c=careerSystems();
  const events=[{id:'career-training',tag:'EQUIPE',title:'Talento ou disciplina: como preparar o próximo trecho da temporada?',options:[
    {text:'Treinar com os engenheiros: preparo +12 e confiança +3',chance:90,succ:2,fail:-1,effects:{preparation:12,trust:3}},
    {text:'Buscar o limite em testes: preparo +3, com grande risco de perder OVR',chance:40,succ:7,fail:-7,effects:{preparation:3}},
    {text:'Viver da reputação e faltar aos treinos: preparo −15 e confiança −8',chance:55,succ:1,fail:-4,effects:{preparation:-15,trust:-8}}
  ]},{id:'career-project',tag:'EQUIPE',title:'A equipe propõe desenvolver um carro para as próximas temporadas',options:[
    {text:'Investir tempo no projeto: preparo −5 agora; se der certo, carro +1 no próximo ano nesta equipe',chance:85,succ:1,fail:-2,effects:{preparation:-5,trust:5},later:{project:1}},
    {text:'Priorizar o resultado imediato: preparo +8; sem avanço futuro no projeto',chance:75,succ:3,fail:-3,effects:{preparation:8}},
    {text:'Expor os problemas à imprensa: confiança −10; arriscar uma reação da equipe',chance:35,succ:6,fail:-6,effects:{trust:-10}}
  ]}];
  if(!c.sponsor)events.push({id:'career-sponsor',tag:'OPORTUNIDADE',title:'Patrocinador oferece dinheiro em troca de permanência na equipe',options:[
    {text:'Aceitar €200k: exclusividade até o fim do próximo ano; devolver €100k se trocar de equipe na mesma categoria',chance:100,succ:1,fail:0,effects:{money:200000,sponsor:true}},
    {text:'Preservar liberdade: sem dinheiro, foco nos treinos (+8 preparo)',chance:100,succ:1,fail:0,effects:{preparation:8}}
  ]});
  if(c.rival)events.push({id:'career-rival',tag:'EQUIPE',title:`A disputa com ${c.rival} esquenta: como responder à pressão?`,options:[
    {text:'Estudar o rival e melhorar o ritmo: preparo +8',chance:80,succ:2,fail:-2,effects:{preparation:8}},
    {text:'Provocar publicamente e atacar sem margem: confiança −5',chance:35,succ:7,fail:-8,effects:{trust:-5,preparation:-5}},
    {text:'Colaborar com a equipe para construir uma resposta: confiança +6',chance:90,succ:1,fail:-1,effects:{trust:6,preparation:4}}
  ]});
  return events;
}
function applyCareerChoice(event,opt,success,delta){
  const c=careerSystems(),fx=opt.effects||{};
  if(opt.prodigy){c.potential=98;careerNote('Descoberto como prodígio: potencial ampliado, sem garantia de resultados.');}
  c.preparation=clamp(c.preparation+(fx.preparation??(opt.chance<60?-4:1)),0,100);
  c.trust=clamp(c.trust+(fx.trust??(success?0:opt.chance<60?-3:-1)),0,100);
  if(fx.money)state.careerEarnings+=fx.money;
  if(fx.sponsor)c.sponsor={until:state.year+1,buyout:100000};
  if(success&&opt.later)c.pending.push({year:state.year+1,key:teamProjectKey(),...opt.later});
  careerNote(`${event.title} — ${opt.text}. ${success?'Deu certo':'Não funcionou'} (${delta>=0?'+':''}${delta} OVR).`);
}
function startCareerSeason(){
  const c=careerSystems();
  if(c.lastStart===state.year)return;
  c.lastStart=state.year;
  if(c.sponsor&&state.year>c.sponsor.until)c.sponsor=null;
  for(const effect of c.pending.filter(e=>e.year<=state.year)){
    c.projects[effect.key]=clamp((c.projects[effect.key]||0)+effect.project,0,4);
    careerNote(effect.key===teamProjectKey()?'O investimento anterior melhorou seu carro.':'O projeto anterior evoluiu, mas você não está mais naquela equipe.');
  }
  c.pending=c.pending.filter(e=>e.year>state.year);
  c.preparation=clamp(c.preparation-3,0,100);
  for(const key of Object.keys(c.projects))c.projects[key]=Math.max(0,c.projects[key]-.6);
  const existing=state.standings.find(d=>d.name===c.rival);
  c.rival=(existing||[...state.standings].sort((a,b)=>Math.abs(a.strength-state.ovr)-Math.abs(b.strength-state.ovr))[0])?.name||null;
  c.objective=state.team.role==='test'?{label:'Pontuar como piloto de teste',kind:'points',target:1}:state.category==='f1'?{label:state.team.stars>=5?'Disputar o título':state.team.stars>=4?'Terminar entre os 5 primeiros':'Terminar entre os 10 primeiros',kind:'position',target:state.team.stars>=5?1:state.team.stars>=4?5:10}:{label:'Terminar entre os 3 primeiros',kind:'position',target:3};
}
function retirementReason(){
  if(state.age>=42)return 'Você chegou ao limite de 42 anos.';
  const recent=state.yearHistory.slice(-2);
  const declining=recent.length===2&&recent.every(y=>y.position>10);
  const contractEnding=state.age+1>=state.team.ageStart+state.team.years;
  if(state.age>=34&&declining&&contractEnding&&
    (state.ovr<60||(state.ovr<70&&careerSystems().trust<45))){
    return 'Após duas temporadas difíceis, a queda de desempenho e o fim do contrato deixaram você sem propostas para continuar.';
  }
  return null;
}
function endCareerSeason(position){
  const c=careerSystems();if(c.lastEnd===state.year)return;c.lastEnd=state.year;
  const goal=c.objective;const met=goal&&(goal.kind==='points'?state.seasonPoints>=goal.target:position<=goal.target);
  c.lastObjective=met;c.trust=clamp(c.trust+(met?6:-3),0,100);
  careerNote(`${goal?.label||'Objetivo'}: ${met?'cumprido':'não cumprido'} (${position}º).`);
  const rival=state.standings.find(d=>d.name===c.rival);
  if(rival){const beat=state.seasonPoints>rival.pts;c.trust=clamp(c.trust+(beat?2:-1),0,100);careerNote(`${beat?'Superou':'Terminou atrás de'} ${c.rival}: ${state.seasonPoints} a ${rival.pts} pontos.`);}
  if(c.trust>=65){const key=teamProjectKey();c.projects[key]=clamp((c.projects[key]||0)+.5,0,4);}
}
function renderCareerStatus(){
  const c=careerSystems();return `<section class="career-status"><h4>Seu projeto de carreira</h4><p>Confiança <b>${Math.round(c.trust)}</b> · Preparo <b>${Math.round(c.preparation)}</b></p><p>Potencial <b>${c.potential>=98?'Prodígio':'Alto'}</b> · Projeto do carro <b>+${projectStrength().toFixed(1)}</b></p>${state.category==='f1'?`<p>Carro: <b>${f1CarRating(state.team)}/100</b> · ${f1TeamStars(state.team)<=2?'Projeto em construção: títulos são muito difíceis.':'Competitividade própria da escuderia.'}</p>`:''}<p>Preparo influencia o ritmo; confiança melhora propostas. O projeto do carro cresce com investimento e continuidade.</p><p><b>Objetivo:</b> ${c.objective?.label||'Conquistar seu espaço'}</p>${c.rival?`<p><b>Rival:</b> ${escapeLogoText(c.rival)}</p>`:''}${c.sponsor?`<p>Patrocínio exclusivo até ${c.sponsor.until}. Trocar de equipe na mesma categoria exige devolver €100k.</p>`:''}</section>`;
}
function renderDecisionJournal(all=false){
  const items=careerSystems().journal.filter(e=>all||e.year===state.year);
  return `<details class="roster-details decision-journal"><summary>As escolhas que marcaram ${all?'sua carreira':'a temporada'}</summary><ol>${items.map(e=>`<li><b>${e.year}</b> · ${escapeLogoText(e.text)}</li>`).join('')||'<li>Sua história ainda está começando.</li>'}</ol></details>`;
}

function decisionCount(age, category=state.category){
  if(['kart','f4','f3','f2'].includes(category)) return rnd(1,3);
  if(category==='f1') return age>=24&&age<=34 ? rnd(3,6) : rnd(1,6);
  return rnd(1,3);
}

// Participantes classificados por temporada, na ordem do campeonato real.
// Fonte: formula1.com/en/results/{ano}/drivers. Inclui substitutos classificados.
const F1_HISTORY = {
  2010: ["Sebastian Vettel", "Fernando Alonso", "Mark Webber", "Lewis Hamilton", "Jenson Button", "Felipe Massa", "Nico Rosberg", "Robert Kubica", "Michael Schumacher", "Rubens Barrichello", "Adrian Sutil", "Kamui Kobayashi", "Vitaly Petrov", "Nico Hülkenberg", "Vitantonio Liuzzi", "Sébastien Buemi", "Pedro de la Rosa", "Nick Heidfeld", "Jaime Alguersuari", "Heikki Kovalainen", "Jarno Trulli", "Karun Chandhok", "Bruno Senna", "Lucas di Grassi", "Timo Glock", "Sakon Yamamoto", "Christian Klien"],
  2011: ["Sebastian Vettel", "Jenson Button", "Mark Webber", "Fernando Alonso", "Lewis Hamilton", "Felipe Massa", "Nico Rosberg", "Michael Schumacher", "Adrian Sutil", "Vitaly Petrov", "Nick Heidfeld", "Kamui Kobayashi", "Paul di Resta", "Jaime Alguersuari", "Sébastien Buemi", "Sergio Pérez", "Rubens Barrichello", "Bruno Senna", "Pastor Maldonado", "Pedro de la Rosa", "Jarno Trulli", "Heikki Kovalainen", "Vitantonio Liuzzi", "Jérôme d'Ambrosio", "Timo Glock", "Narain Karthikeyan", "Daniel Ricciardo", "Karun Chandhok"],
  2012: ["Sebastian Vettel", "Fernando Alonso", "Kimi Räikkönen", "Lewis Hamilton", "Jenson Button", "Mark Webber", "Felipe Massa", "Romain Grosjean", "Nico Rosberg", "Sergio Pérez", "Nico Hülkenberg", "Kamui Kobayashi", "Michael Schumacher", "Paul di Resta", "Pastor Maldonado", "Bruno Senna", "Jean-Éric Vergne", "Daniel Ricciardo", "Vitaly Petrov", "Timo Glock", "Charles Pic", "Heikki Kovalainen", "Jérôme d'Ambrosio", "Narain Karthikeyan", "Pedro de la Rosa"],
  2013: ["Sebastian Vettel", "Fernando Alonso", "Mark Webber", "Lewis Hamilton", "Kimi Räikkönen", "Nico Rosberg", "Romain Grosjean", "Felipe Massa", "Jenson Button", "Nico Hülkenberg", "Sergio Pérez", "Paul di Resta", "Adrian Sutil", "Daniel Ricciardo", "Jean-Éric Vergne", "Esteban Gutiérrez", "Valtteri Bottas", "Pastor Maldonado", "Jules Bianchi", "Charles Pic", "Heikki Kovalainen", "Giedo van der Garde", "Max Chilton"],
  2014: ["Lewis Hamilton", "Nico Rosberg", "Daniel Ricciardo", "Valtteri Bottas", "Sebastian Vettel", "Fernando Alonso", "Felipe Massa", "Jenson Button", "Nico Hülkenberg", "Sergio Pérez", "Kevin Magnussen", "Kimi Räikkönen", "Jean-Éric Vergne", "Romain Grosjean", "Daniil Kvyat", "Pastor Maldonado", "Jules Bianchi", "Adrian Sutil", "Marcus Ericsson", "Esteban Gutiérrez", "Max Chilton", "Kamui Kobayashi", "Will Stevens"],
  2015: ["Lewis Hamilton", "Nico Rosberg", "Sebastian Vettel", "Kimi Räikkönen", "Valtteri Bottas", "Felipe Massa", "Daniil Kvyat", "Daniel Ricciardo", "Sergio Pérez", "Nico Hülkenberg", "Romain Grosjean", "Max Verstappen", "Felipe Nasr", "Pastor Maldonado", "Carlos Sainz", "Jenson Button", "Fernando Alonso", "Marcus Ericsson", "Roberto Merhi", "Alexander Rossi", "Will Stevens"],
  2016: ["Nico Rosberg", "Lewis Hamilton", "Daniel Ricciardo", "Sebastian Vettel", "Max Verstappen", "Kimi Räikkönen", "Sergio Pérez", "Valtteri Bottas", "Nico Hülkenberg", "Fernando Alonso", "Felipe Massa", "Carlos Sainz", "Romain Grosjean", "Daniil Kvyat", "Jenson Button", "Kevin Magnussen", "Felipe Nasr", "Jolyon Palmer", "Pascal Wehrlein", "Stoffel Vandoorne", "Esteban Gutiérrez", "Marcus Ericsson", "Esteban Ocon", "Rio Haryanto"],
  2017: ["Lewis Hamilton", "Sebastian Vettel", "Valtteri Bottas", "Kimi Räikkönen", "Daniel Ricciardo", "Max Verstappen", "Sergio Pérez", "Esteban Ocon", "Carlos Sainz", "Nico Hülkenberg", "Felipe Massa", "Lance Stroll", "Romain Grosjean", "Kevin Magnussen", "Fernando Alonso", "Stoffel Vandoorne", "Jolyon Palmer", "Pascal Wehrlein", "Daniil Kvyat", "Marcus Ericsson", "Pierre Gasly", "Antonio Giovinazzi", "Brendon Hartley"],
  2018: ["Lewis Hamilton", "Sebastian Vettel", "Kimi Räikkönen", "Max Verstappen", "Valtteri Bottas", "Daniel Ricciardo", "Nico Hülkenberg", "Sergio Pérez", "Kevin Magnussen", "Carlos Sainz", "Fernando Alonso", "Esteban Ocon", "Charles Leclerc", "Romain Grosjean", "Pierre Gasly", "Stoffel Vandoorne", "Marcus Ericsson", "Lance Stroll", "Brendon Hartley", "Sergey Sirotkin"],
  2019: ["Lewis Hamilton", "Valtteri Bottas", "Max Verstappen", "Charles Leclerc", "Sebastian Vettel", "Carlos Sainz", "Pierre Gasly", "Alexander Albon", "Daniel Ricciardo", "Sergio Pérez", "Lando Norris", "Kimi Räikkönen", "Daniil Kvyat", "Nico Hülkenberg", "Lance Stroll", "Kevin Magnussen", "Antonio Giovinazzi", "Romain Grosjean", "Robert Kubica", "George Russell"],
  2020: ["Lewis Hamilton", "Valtteri Bottas", "Max Verstappen", "Sergio Pérez", "Daniel Ricciardo", "Carlos Sainz", "Alexander Albon", "Charles Leclerc", "Lando Norris", "Pierre Gasly", "Lance Stroll", "Esteban Ocon", "Sebastian Vettel", "Daniil Kvyat", "Nico Hülkenberg", "Kimi Räikkönen", "Antonio Giovinazzi", "George Russell", "Romain Grosjean", "Kevin Magnussen", "Nicholas Latifi", "Jack Aitken", "Pietro Fittipaldi"],
  2021: ["Max Verstappen", "Lewis Hamilton", "Valtteri Bottas", "Sergio Pérez", "Carlos Sainz", "Lando Norris", "Charles Leclerc", "Daniel Ricciardo", "Pierre Gasly", "Fernando Alonso", "Esteban Ocon", "Sebastian Vettel", "Lance Stroll", "Yuki Tsunoda", "George Russell", "Kimi Räikkönen", "Nicholas Latifi", "Antonio Giovinazzi", "Mick Schumacher", "Robert Kubica", "Nikita Mazepin"],
  2022: ["Max Verstappen", "Charles Leclerc", "Sergio Pérez", "George Russell", "Carlos Sainz", "Lewis Hamilton", "Lando Norris", "Esteban Ocon", "Fernando Alonso", "Valtteri Bottas", "Daniel Ricciardo", "Sebastian Vettel", "Kevin Magnussen", "Pierre Gasly", "Lance Stroll", "Mick Schumacher", "Yuki Tsunoda", "Zhou Guanyu", "Alexander Albon", "Nicholas Latifi", "Nyck de Vries", "Nico Hülkenberg"],
  2023: ["Max Verstappen", "Sergio Pérez", "Lewis Hamilton", "Fernando Alonso", "Charles Leclerc", "Lando Norris", "Carlos Sainz", "George Russell", "Oscar Piastri", "Lance Stroll", "Pierre Gasly", "Esteban Ocon", "Alexander Albon", "Yuki Tsunoda", "Valtteri Bottas", "Nico Hülkenberg", "Daniel Ricciardo", "Zhou Guanyu", "Kevin Magnussen", "Liam Lawson", "Logan Sargeant", "Nyck de Vries"],
  2024: ["Max Verstappen", "Lando Norris", "Charles Leclerc", "Oscar Piastri", "Carlos Sainz", "George Russell", "Lewis Hamilton", "Sergio Pérez", "Fernando Alonso", "Pierre Gasly", "Nico Hülkenberg", "Yuki Tsunoda", "Lance Stroll", "Esteban Ocon", "Kevin Magnussen", "Alexander Albon", "Daniel Ricciardo", "Oliver Bearman", "Franco Colapinto", "Zhou Guanyu", "Liam Lawson", "Valtteri Bottas", "Logan Sargeant", "Jack Doohan"],
  2025: ["Lando Norris", "Max Verstappen", "Oscar Piastri", "George Russell", "Charles Leclerc", "Lewis Hamilton", "Kimi Antonelli", "Alexander Albon", "Carlos Sainz", "Fernando Alonso", "Nico Hülkenberg", "Isack Hadjar", "Oliver Bearman", "Liam Lawson", "Esteban Ocon", "Lance Stroll", "Yuki Tsunoda", "Pierre Gasly", "Gabriel Bortoleto", "Franco Colapinto", "Jack Doohan"]
};
const CAREER_START_YEAR = 2010;

// Seleções de adversários reais dos anos alcançáveis na progressão da base.
// A etapa f4 representa a Fórmula Renault 2.0 antes da criação da FIA F4.
const JUNIOR_HISTORY = {
  kart: {
    2010: ['Nyck de Vries','Alexander Albon','Max Verstappen','Jake Dennis','Esteban Ocon','Jordan Chamberlain','Nicolaj Møller Madsen','Flavio Camponeschi'],
    2011: ['Nyck de Vries','Alexander Albon','Flavio Camponeschi',"Ignazio D’Agosto",'Max Verstappen','Charles Leclerc','George Russell','Lance Stroll']
  },
  f4: {
    2011: ['Robin Frijns','Carlos Sainz','Daniil Kvyat','Will Stevens','Javier Tarancón','Timmy Hansen','Paul-Loup Chatin','Alex Riberas'],
    2012: ['Stoffel Vandoorne','Daniil Kvyat','Oliver Rowland','Norman Nato','Pierre Gasly','Paul-Loup Chatin','Nyck de Vries','Esteban Ocon'],
    2013: ['Pierre Gasly','Oliver Rowland','Esteban Ocon','Nyck de Vries','Oscar Tunjo','Jake Dennis','Andrea Pizzitola','Alexander Albon']
  },
  f3: {
    2012: ['Daniel Juncadella','Pascal Wehrlein','Raffaele Marciello','Felix Rosenqvist','William Buller','Carlos Sainz','Michael Lewis','Sven Müller'],
    2013: ['Raffaele Marciello','Felix Rosenqvist','Alex Lynn','Lucas Auer','Harry Tincknell','Jordan King','Tom Blomqvist','Pipo Derani'],
    2014: ['Esteban Ocon','Tom Blomqvist','Max Verstappen','Lucas Auer','Antonio Giovinazzi','Jordan King','Jake Dennis','Felix Rosenqvist'],
    2015: ['Felix Rosenqvist','Antonio Giovinazzi','Jake Dennis','Charles Leclerc','Lance Stroll','George Russell','Alexander Albon','Pietro Fittipaldi']
  },
  f2: {
    2013: ['Fabio Leimer','Sam Bird','James Calado','Felipe Nasr','Stefano Coletti','Marcus Ericsson','Jolyon Palmer','Tom Dillmann'],
    2014: ['Jolyon Palmer','Stoffel Vandoorne','Felipe Nasr','Mitch Evans','Johnny Cecotto Jr.','Stefano Coletti','Julián Leal','Arthur Pic'],
    2015: ['Stoffel Vandoorne','Alexander Rossi','Sergey Sirotkin','Rio Haryanto','Mitch Evans','Pierre Gasly','Raffaele Marciello','Alex Lynn'],
    2016: ['Pierre Gasly','Antonio Giovinazzi','Sergey Sirotkin','Raffaele Marciello','Alex Lynn','Artem Markelov','Norman Nato','Luca Ghiotto'],
    2017: ['Charles Leclerc','Artem Markelov','Oliver Rowland','Luca Ghiotto','Nicholas Latifi','Nobuharu Matsushita','Alexander Albon','Nyck de Vries'],
    2018: ['George Russell','Lando Norris','Alexander Albon','Nyck de Vries','Artem Markelov','Luca Ghiotto','Sérgio Sette Câmara','Jack Aitken']
  }
};

// Base real de 2026. Notas e datas posteriores são escolhas de balanceamento,
// nunca contratos, classificações ou aposentadorias confirmadas.
// [nome, estreia nesta projeção, última temporada projetada, nota de auge]
const F1_FUTURE = [
  ['Max Verstappen',2026,2037,97], ['Lando Norris',2026,2039,96],
  ['Oscar Piastri',2026,2041,95], ['George Russell',2026,2038,94],
  ['Charles Leclerc',2026,2038,95], ['Lewis Hamilton',2026,2028,92],
  ['Kimi Antonelli',2026,2044,95], ['Carlos Sainz',2026,2034,88],
  ['Fernando Alonso',2026,2026,88], ['Alexander Albon',2026,2035,86],
  ['Pierre Gasly',2026,2035,86], ['Esteban Ocon',2026,2035,84],
  ['Nico Hülkenberg',2026,2027,83], ['Sergio Pérez',2026,2029,83],
  ['Valtteri Bottas',2026,2029,82], ['Lance Stroll',2026,2032,78],
  ['Liam Lawson',2026,2039,85], ['Oliver Bearman',2026,2043,91],
  ['Isack Hadjar',2026,2042,91], ['Gabriel Bortoleto',2026,2043,93],
  ['Franco Colapinto',2026,2041,85], ['Arvid Lindblad',2026,2045,91],
  ['Nikola Tsolov',2027,2045,93], ['Rafael Câmara',2028,2045,94],
  ['Alexander Dunne',2029,2045,92], ['Dino Beganovic',2030,2044,88],
  ['Gabriele Minì',2030,2045,90], ['Freddie Slater',2031,2047,95],
  ['Tuukka Taponen',2033,2046,91], ['Ugo Ugochukwu',2035,2047,88],
  ['Pedro Clerot',2036,2046,88], ['Martinius Stenshorne',2036,2046,90],
  ['Noah Strømsted',2038,2047,89], ['Matteo De Palo',2039,2047,89]
];

// [nome, início do recorte histórico, fim histórico, fim projetado, força, ano de auge]
// Recortes de participantes, não reprodução de todas as inscrições de cada etapa.
const PROFESSIONAL_DRIVERS = {
  indycar: [
    ['Dario Franchitti',2010,2013,2013,95,2011], ['Scott Dixon',2010,2026,2030,95,2018],
    ['Will Power',2010,2026,2029,93,2014], ['Hélio Castroneves',2010,2026,2026,91,2013],
    ['Tony Kanaan',2010,2023,2023,88,2013], ['Ryan Hunter-Reay',2010,2021,2021,91,2012],
    ['Ryan Briscoe',2010,2015,2015,86,2012], ['Marco Andretti',2010,2020,2020,81,2013],
    ['Graham Rahal',2010,2026,2032,85,2015], ['Takuma Sato',2010,2026,2026,85,2017],
    ['James Hinchcliffe',2011,2021,2021,84,2016], ['Sébastien Bourdais',2011,2021,2021,86,2015],
    ['Simon Pagenaud',2011,2023,2023,93,2016], ['Josef Newgarden',2012,2026,2035,94,2019],
    ['Juan Pablo Montoya',2014,2017,2017,92,2015], ['Alexander Rossi',2016,2026,2035,90,2018],
    ["Pato O’Ward",2018,2026,2040,93,2025], ['Colton Herta',2018,2025,2025,90,2024],
    ['Marcus Ericsson',2019,2026,2037,86,2022], ['Felix Rosenqvist',2019,2026,2036,87,2025],
    ['Álex Palou',2020,2026,2038,97,2025], ['Rinus VeeKay',2020,2026,2039,85,2026],
    ['Scott McLaughlin',2020,2026,2038,92,2025], ['Christian Lundgaard',2021,2026,2041,89,2028],
    ['David Malukas',2022,2026,2041,87,2029], ['Kyle Kirkwood',2022,2026,2041,90,2028],
    ['Marcus Armstrong',2023,2026,2041,85,2029], ['Nolan Siegel',2024,2026,2041,84,2030],
    ['Louis Foster',2025,2026,2041,86,2030], ['Dennis Hauger',2026,2026,2041,86,2030],
    ['Mick Schumacher',2026,2026,2039,84,2030]
  ],
  nascar: [
    ['Jimmie Johnson',2010,2020,2020,95,2013], ['Jeff Gordon',2010,2016,2016,93,2014],
    ['Tony Stewart',2010,2016,2016,93,2011], ['Dale Earnhardt Jr.',2010,2017,2017,88,2014],
    ['Carl Edwards',2010,2016,2016,91,2011], ['Matt Kenseth',2010,2020,2020,91,2013],
    ['Kevin Harvick',2010,2023,2023,94,2014], ['Kurt Busch',2010,2022,2022,89,2015],
    ['Martin Truex Jr.',2010,2024,2024,94,2017], ['Kyle Busch',2010,2026,2032,95,2019],
    ['Denny Hamlin',2010,2026,2030,93,2020], ['Brad Keselowski',2010,2026,2033,92,2012],
    ['Joey Logano',2010,2026,2038,94,2024], ['Austin Dillon',2011,2026,2038,81,2018],
    ['Kyle Larson',2014,2026,2040,96,2021], ['Chase Elliott',2015,2026,2041,93,2020],
    ['Ryan Blaney',2014,2026,2041,93,2023], ['Chris Buescher',2015,2026,2041,87,2023],
    ['William Byron',2018,2026,2041,92,2025], ['Christopher Bell',2020,2026,2041,92,2025],
    ['Tyler Reddick',2019,2026,2041,91,2025], ['Ross Chastain',2017,2026,2040,89,2022],
    ['Daniel Suárez',2017,2026,2040,85,2024], ['Bubba Wallace',2017,2026,2040,85,2025],
    ['Ty Gibbs',2022,2026,2041,88,2030], ['Shane van Gisbergen',2023,2026,2036,88,2026],
    ['Connor Zilisch',2025,2026,2041,92,2032]
  ],
  stockcar: [
    ['Cacá Bueno',2010,2026,2028,94,2012], ['Thiago Camilo',2010,2026,2034,92,2013],
    ['Ricardo Maurício',2010,2026,2029,94,2013], ['Max Wilson',2010,2020,2020,92,2010],
    ['Allam Khodair',2010,2026,2031,87,2016], ['Átila Abreu',2010,2026,2035,89,2014],
    ['Daniel Serra',2010,2026,2036,95,2019], ['Ricardo Zonta',2010,2026,2029,90,2020],
    ['Marcos Gomes',2010,2026,2036,93,2015], ['Valdeno Brito',2010,2020,2020,86,2014],
    ['Júlio Campos',2010,2026,2032,87,2024], ['Diego Nunes',2010,2026,2036,85,2024],
    ['Gabriel Casagrande',2013,2026,2041,95,2023], ['Rubens Barrichello',2013,2026,2028,94,2014],
    ['Rafael Suzuki',2014,2026,2037,86,2024], ['Felipe Fraga',2014,2026,2041,94,2016],
    ['Lucas Foresti',2014,2026,2040,84,2026], ['Bruno Baptista',2018,2026,2041,87,2028],
    ['Felipe Massa',2021,2026,2030,90,2025], ['Felipe Baptista',2022,2026,2041,91,2029],
    ['Gianluca Petecof',2023,2026,2041,88,2030], ['Dudu Barrichello',2023,2024,2024,87,2024],
    ['Gaetano Di Mauro',2019,2026,2041,89,2028], ['Guilherme Salas',2014,2026,2041,89,2027],
    ['Leonardo Reis',2026,2026,2041,85,2032], ['Enzo Weisheimer',2026,2026,2041,84,2033],
    ['Alfredinho Ibiapina',2026,2026,2041,84,2033]
  ],
  veterano: [
    ['Sébastien Buemi',2012,2026,2037,93,2014], ['Brendon Hartley',2012,2026,2038,93,2017],
    ['Kamui Kobayashi',2013,2026,2035,92,2021], ['Mike Conway',2013,2026,2032,90,2021],
    ['James Calado',2014,2026,2039,92,2023], ['Antonio Fuoco',2019,2026,2041,94,2024],
    ['Antonio Giovinazzi',2023,2026,2041,93,2025], ['Nyck de Vries',2018,2026,2041,91,2026],
    ['Ryo Hirakawa',2022,2026,2041,91,2025], ['Felipe Nasr',2017,2026,2040,93,2024],
    ['Pipo Derani',2014,2026,2041,92,2023], ['Raffaele Marciello',2017,2026,2041,92,2026],
    ['Dries Vanthoor',2016,2026,2041,93,2026], ['Charles Milesi',2021,2026,2041,90,2028],
    ['Yifei Ye',2021,2026,2041,91,2028], ['Phil Hanson',2017,2026,2041,90,2028],
    ['Mikkel Jensen',2018,2026,2041,91,2027], ['Malthe Jakobsen',2022,2026,2041,90,2030],
    ['Jules Gounon',2017,2026,2041,91,2028]
  ]
};

function driverKey(name){
  return name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
}

function categoryLabel(category, year){
  if(category==='f2' && year<2017) return 'GP2';
  if(category==='f4' && year<2014) return 'Fórmula Renault 2.0';
  if(category==='f3' && year<2019) return 'F3 Europeia';
  return CATEGORY_LABEL[category];
}

function pointsForPosition(pos){
  // Mantém a tabela simplificada que o jogador já usava.
  return pos===1 ? 25 : pos<=3 ? 15 : pos<=8 ? 12-pos : 0;
}

function seasonStandings(){
  return [...state.standings, {name:state.name,pts:state.seasonPoints,finishes:state.seasonFinishes,me:true}]
    .sort((a,b)=>{
      if(a.pts!==b.pts) return b.pts-a.pts;
      // Desempate por vitórias, segundos lugares e assim sucessivamente.
      for(let pos=1;pos<=state.standings.length+1;pos++){
        const delta=b.finishes.filter(p=>p===pos).length-a.finishes.filter(p=>p===pos).length;
        if(delta) return delta;
      }
      return 0;
    });
}

// Recorte do elenco principal; substituições durante o ano não criam vagas extras.
const F1_SUBSTITUTE_SLOTS = {"2010": ["Nick Heidfeld", "Sakon Yamamoto", "Christian Klien"], "2011": ["Bruno Senna", "Pedro de la Rosa", "Daniel Ricciardo", "Karun Chandhok"], "2012": ["Jérôme d'Ambrosio"], "2013": ["Heikki Kovalainen"], "2014": ["Will Stevens"], "2015": ["Alexander Rossi"], "2016": ["Stoffel Vandoorne", "Esteban Ocon"], "2017": ["Pierre Gasly", "Antonio Giovinazzi", "Brendon Hartley"], "2020": ["Nico Hülkenberg", "Jack Aitken", "Pietro Fittipaldi"], "2021": ["Robert Kubica"], "2022": ["Nyck de Vries", "Nico Hülkenberg"], "2023": ["Liam Lawson", "Daniel Ricciardo"], "2024": ["Oliver Bearman", "Franco Colapinto", "Liam Lawson", "Jack Doohan"], "2025": ["Franco Colapinto"]};

function seasonDrivers(category, year){
  let drivers;
  if(category==='f1' && year<2026){
    const names = F1_HISTORY[year]?.filter(name=>!(F1_SUBSTITUTE_SLOTS[year]||[]).includes(name));
    if(!names) throw new Error(`Temporada F1 não cadastrada: ${year}`);
    // Força representa piloto + desempenho do carro naquela temporada.
    drivers = names.map((name,i)=>({name,strength:Math.round(96-i*31/(names.length-1)),projected:false}));
  } else if(category==='f1'){
    drivers = F1_FUTURE.filter(([,start,end])=>year>=start && year<=end)
      .map(([name,start,end,peak])=>({name,projected:year>2026,prospect:start>2026,
        strength:clamp(peak-(start>2026 ? Math.max(0,4-(year-start))*1.8 : 0)-Math.max(0,year-(end-3))*1.5,65,97)
      })).sort((a,b)=>b.strength-a.strength).slice(0,22);
  } else if(JUNIOR_HISTORY[category]){
    const names = JUNIOR_HISTORY[category][year];
    if(!names) throw new Error(`Temporada de base fora da progressão: ${category} ${year}`);
    const top = {kart:53,f4:60,f3:68,f2:77}[category];
    drivers = names.map((name,i)=>({name,strength:top-i*2,projected:false}));
  } else {
    drivers = (PROFESSIONAL_DRIVERS[category]||[])
      .filter(([,start,end,futureEnd])=>year>=start && year<=(year<2026 ? end : futureEnd))
      .map(([name,start,end,futureEnd,peak,peakYear])=>({name,projected:year>=2026,
        strength:clamp(peak-Math.abs(year-peakYear)*0.65,60,96)
      }));
    if(category==='veterano' && year>=2026){
      // Transições fictícias para endurance após encerrar a carreira na F1.
      drivers.push(...F1_FUTURE.filter(([,start,end])=>year>end && year<=end+7 && end>=2032)
        .map(([name,start,end,peak])=>({name,strength:clamp(peak-4-(year-end),65,94),projected:true})));
    }
  }
  const seen = new Set();
  return drivers.filter(driver=>{
    const key=driverKey(driver.name);
    if(seen.has(key)) return false;
    seen.add(key); return true;
  });
}


/* ---------------- Estado global ---------------- */

let state = null;

function newState(){
  return {
    name:"", number:10, style:null, nationCode:"BR", nationName:"Brasil",
    age:14, get year(){ return CAREER_START_YEAR + this.age - 14; }, category:"kart", ovr:0, attrs:null,
    team:null, teamHistory:[], // {teamName, crest, ageStart, ageEnd, races, wins, podiums, titles}
    value:0, salaryWeek:0, careerEarnings:0, peakValue:0, peakOvr:0,
    races:0, wins:0, podiums:0, poles:0,
    seasonFinishes:[], lastRaceField:[], seasonRaces:0, seasonWins:0, seasonPodiums:0, seasonPoints:0, seasonHadRain:false, seasonIconic:false,
    yearHistory:[], // {age, team, category, ovr, races, wins, podiums}
    trophies:[], // {age, name}
    roundInSeason:0, roundsThisSeason:1, seasonEventIds:[], recentEventIds:[],
    lastTag:null, tagCooldown:{}, // tag -> rounds since last seen
    standings:[], myStanding:{pos:1, pts:0},
    currentEvent:null, currentOption:null, currentResult:null,
    firstSeasonInCategory:true,
    pendingBranch:false,
    agentUses:2,
    finished:false,
  };
}

/* ---------------- Utilidades ---------------- */

function rnd(min,max){ return Math.floor(Math.random()*(max-min+1))+min; }
function pick(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
function clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }
function shuffle(arr){
  const a = [...arr];
  for(let i=a.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [a[i],a[j]] = [a[j],a[i]];
  }
  return a;
}

function computeOVR(attrs, styleKey, categoryKey){
  const sw = STYLES[styleKey].weights;
  const cw = CATEGORY_WEIGHTS[categoryKey] || CATEGORY_WEIGHTS.f2;
  const keys = Object.keys(attrs);
  let sum=0, wsum=0;
  keys.forEach(k=>{
    const w = (sw[k]||1) * (cw[k]||1);
    sum += attrs[k]*w;
    wsum += w;
  });
  return Math.round(sum/wsum);
}

function adjustedGain(delta){
  if(delta<=0) return delta * .65;
  const rating=state.ovr;
  const difficulty=rating<75?1:rating<85?.65:rating<90?.4:rating<95?.2:.07;
  const ageFactor=state.age<32?1:state.age<35?.7:state.age<38?.4:.2;
  const c=careerSystems();
  const training=.8+c.preparation/300;
  const potential=rating>=c.potential?.35:1;
  return delta*difficulty*ageFactor*training*potential;
}
function bumpAttrs(attrs, delta, prodigy=false){
  const change=prodigy && delta>0 ? Math.min(delta,Math.max(0,85-state.ovr)) : adjustedGain(delta);
  Object.keys(attrs).forEach(k=>{ attrs[k] = clamp(attrs[k]+change,20,99); });
}
function choiceImpact(opt,success){
  if(success)return opt.prodigy?Math.min(opt.succ,Math.max(0,85-state.ovr)):adjustedGain(opt.succ);
  if(opt.chance>=100)return 0;
  // Perdas não recebem o desconto aplicado aos ganhos por idade e experiência.
  const gain=Math.max(0,opt.succ);
  const minimum=opt.chance<60?Math.max(4,Math.ceil(gain*1.25)):opt.chance<80?Math.max(2,Math.ceil(gain*.75)):1;
  return -Math.max(Math.abs(opt.fail||0),minimum);
}
function applyChoiceToAttrs(attrs,opt,success){
  const delta=choiceImpact(opt,success);
  for(const key of Object.keys(attrs))attrs[key]=clamp(attrs[key]+delta,20,99);
}
function previewChoice(opt,success){
  const attrs={...state.attrs};applyChoiceToAttrs(attrs,opt,success);
  const delta=computeOVR(attrs,state.style,state.category)-state.ovr;
  return (delta>=0?'+':'')+delta;
}
function choiceRiskLabel(opt){return opt.chance>=100?'Sem risco':opt.chance<60?'Alto risco':opt.chance<80?'Risco moderado':'Conservadora';}

function previewDelta(delta, prodigy=false){
  const attrs={...state.attrs};bumpAttrs(attrs,delta,prodigy);
  const change=computeOVR(attrs,state.style,state.category)-state.ovr;
  return (change>=0?'+':'')+change;
}
function ageDriver(){
  // Experiência suaviza o declínio inicial; depois dos 37, a perda acelera.
  const loss=state.age<34?0:state.age<36?.7:state.age<39?1.4:2.2;
  for(const key of Object.keys(state.attrs)) state.attrs[key]=clamp(state.attrs[key]-loss,20,99);
  updateRating();
}

function updateRating(){
  state.ovr = computeOVR(state.attrs,state.style,state.category);
  state.peakOvr = Math.max(state.peakOvr,state.ovr);
  state.value = marketValue(state.ovr,state.age,state.category);
  state.peakValue = Math.max(state.peakValue,state.value);
}

function marketValue(ovr, age, category){
  const catMult = {kart:0.02, f4:0.08, f3:0.25, f2:0.6, f1:6, indycar:2.2, nascar:2, stockcar:1.1, veterano:1.4};
  const ageFactor = age<=28 ? 1 : Math.max(0.4, 1-(age-28)*0.05);
  const base = Math.pow(ovr/50, 3) * (catMult[category]||0.5) * ageFactor;
  return Math.max(0.01, +base.toFixed(2));
}

/* ---------------- Passo 1: criação ---------------- */

function renderLanding(){
  showOnly('screen-cover');
  document.getElementById('screen-cover').innerHTML=`
    <section class="game-cover" aria-labelledby="cover-title">
      <div class="cover-copy"><div class="cover-wordmark">CARRERA<span>ESCREVA SUA HISTÓRIA</span></div><span class="creation-kicker">Uma carreira. Um destino: a Fórmula 1.</span>
        <h2 id="cover-title">Você é capaz de tirar títulos<br><em>de Hamilton e Verstappen?</em></h2>
        <p class="cover-intro"><strong>E você é capaz de bater o recorde de títulos de Schumacher?</strong></p>
        <p class="cover-intro">Comece em 2010. Conquiste seu espaço. Viva o auge da sua carreira na Fórmula 1 de 2026, contra os pilotos que você acompanha hoje.</p>
        <p class="cover-intro">Construa uma dinastia em uma equipe ou prefira a grana e mude de equipe a todo momento. A decisão é sua. A carreira é sua.</p>
        <button class="btn btn-primary cover-start" id="btn-start-career">Criar meu piloto <span aria-hidden="true">→</span></button>
        <p class="cover-small">14 anos no início · Até 3 decisões na base · Até 6 na F1</p>
      </div>
      <div class="cover-visual"><div class="event-image cover-race" style="--race-position:39%" role="img" aria-label="Cena ilustrativa de monopostos disputando uma corrida na chuva"></div><div class="cover-caption"><span class="badge">Seu objetivo · 2026</span><strong>Divida o grid.<br>Dispute a história.</strong><span>Hamilton · Verstappen · Leclerc<br>Norris · Piastri · Bortoleto</span></div></div>
    </section>
    <section class="cover-journey" aria-label="Sua jornada">
      <article><span>01 / A ORIGEM</span><h3>Kart, 2010</h3><p>Crie seu piloto e descubra seu estilo. Sua história começa aos 14 anos.</p></article>
      <article><span>02 / A CONQUISTA</span><h3>Seu lugar na F1</h3><p>Evolua na base, escolha equipes e conquiste resultados. A progressão leva à Fórmula 1.</p></article>
      <article><span>03 / O AUGE</span><h3>F1, 2026</h3><p>Aos 30 anos, enfrente o elenco real de 2026. Depois, novos talentos entram em projeções da simulação.</p></article>
    </section>
    <div class="cover-footnote">Os pilotos acompanham o calendário: elencos históricos até 2025, base real em 2026 e futuro projetado a partir de 2027. Vitórias e títulos dependem da sua carreira no jogo.</div>`;
  document.getElementById('btn-start-career').onclick=()=>{showOnly('screen-create');renderCreate();document.getElementById('in-name').focus();};
}

function nationFlag(code){
  return [...code].map(c=>String.fromCodePoint(127397+c.charCodeAt(0))).join('');
}

function renderCreate(){
  const el = document.getElementById('screen-create');
  const styleDetails = {
    agressivo:['↗','+ Ultrapassagem','+ Contato','− Consistência'],
    tecnico:['◎','+ Classificação','+ Engenharia','Precisão nas voltas'],
    consistente:['≋','+ Consistência','+ Gestão de pneus','− Ultrapassagem'],
    chuva:['☂','+ Chuva','+ Controle mental','Calma sob pressão']
  };
  el.innerHTML = `
    <div class="creation-heading"><span class="creation-kicker">Sua história começa no grid</span><h1>Nasce um piloto.</h1><p>Escolha sua identidade. Encontre seu jeito de correr.</p></div>
    <div class="create-grid create-grid-v2">
      <div class="panel create-form">
        <h2><span class="step-number">01</span> Sua identidade</h2>
        <div class="identity-fields">
          <div><label class="field-label" for="in-name">NOME DO PILOTO</label><input type="text" id="in-name" maxlength="16" placeholder="Como você será conhecido?" autocomplete="off"></div>
          <div><label class="field-label" for="in-num">NÚMERO (1–99)</label><input type="number" id="in-num" min="1" max="99" step="1" value="10"></div>
        </div>
        <h2><span class="step-number">02</span> Seu estilo de pilotagem</h2>
        <div class="style-grid" id="style-grid" role="group" aria-label="Estilo de pilotagem"></div>
        <h2><span class="step-number">03</span> Sua nacionalidade</h2>
        <label class="sr-only" for="nation-search">Buscar país</label>
        <input type="text" id="nation-search" placeholder="Buscar país…" autocomplete="off">
        <div class="nation-list" id="nation-list" role="group" aria-label="Nacionalidade"></div>
        <p class="nation-empty" id="nation-empty" role="status" hidden>Nenhum país encontrado. Tente outro nome ou a sigla.</p>
      </div>
      <aside class="panel credential-panel" aria-label="Prévia do piloto">
        <div class="credential-top"><span class="creation-kicker">Credencial do piloto</span><span class="credential-season">2010</span></div>
        <div class="helmet-art" aria-hidden="true">
          <span class="helmet-orbit"></span>
          <svg viewBox="0 0 320 230" focusable="false"><defs><linearGradient id="helmet-shell" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f4f1e8"/><stop offset=".5" stop-color="#a9adb1"/><stop offset="1" stop-color="#404750"/></linearGradient><linearGradient id="helmet-visor" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#111923"/><stop offset=".55" stop-color="#334858"/><stop offset="1" stop-color="#090d12"/></linearGradient></defs><path d="M57 170C48 143 50 100 72 68C91 40 128 24 166 25C216 26 255 49 272 92L281 126L256 137L275 169L262 198L98 201L67 189Z" fill="url(#helmet-shell)" stroke="#ffffff55" stroke-width="2"/><path d="M151 28L179 27L137 83L99 94Z" fill="#f2a900"/><path d="M65 105C123 80 205 78 268 91L280 124C227 139 164 142 105 133L75 126Z" fill="url(#helmet-visor)" stroke="#20252b" stroke-width="5"/><path d="M83 103C137 89 205 88 253 95" fill="none" stroke="#a4bbc766" stroke-width="3"/><circle cx="86" cy="116" r="9" fill="#15191f" stroke="#89949e" stroke-width="3"/><path d="M64 166L130 176L268 163L275 176L262 198L97 201L68 189Z" fill="#f2a900"/><path d="M144 154L176 151M188 148L220 144M156 164L188 160" stroke="#242a32" stroke-width="5" stroke-linecap="round"/><text id="helmet-number" x="127" y="74" font-size="27" font-family="system-ui" font-weight="900" fill="#15171a">10</text></svg>
        </div>
        <div class="credential-name" id="pv-name">SEU NOME</div>
        <div class="credential-identity"><span id="pv-country">🇧🇷 Brasil</span><span id="pv-num">#10</span></div>
        <div class="credential-style"><span>ESTILO DE PILOTAGEM</span><b id="pv-style">Seu jeito de correr</b></div>
        <div class="credential-facts"><div><span>Categoria</span><b>Kart</b></div><div><span>Idade</span><b>14 anos</b></div><div><span>Estreia</span><b>2010</b></div></div>
        <div class="career-start-note"><b>Dos primeiros metros à história.</b><p>Sua carreira começa no kart, aos 14 anos, em 2010. Seu objetivo é viver o auge na F1 de 2026, aos 30 anos, contra os pilotos atuais.</p></div>
        <p id="summary-box" class="creation-hint" role="status" aria-live="polite"></p>
        <button class="btn btn-primary" id="btn-confirm-create" disabled>Começar carreira →</button>
      </aside>
    </div>`;
  document.getElementById('in-name').value=draft.name||'';
  document.getElementById('in-num').value=draft.number||10;
  const styleGrid=document.getElementById('style-grid');
  Object.entries(STYLES).forEach(([key,s])=>{
    const [icon,first,second,third]=styleDetails[key];
    const card=document.createElement('button');card.type='button';card.className='style-card';
    card.title=s.desc;card.dataset.style=key;card.setAttribute('aria-pressed',String(draft.style===key));
    card.classList.toggle('selected',draft.style===key);
    card.innerHTML=`<span class="style-symbol" aria-hidden="true">${icon}</span><span class="style-check" aria-hidden="true">✓</span><b>${s.label}</b><span class="style-benefit">${first} · ${second}</span><span class="style-tradeoff">${third}</span>`;
    card.onclick=()=>{draft.style=key;styleGrid.querySelectorAll('button').forEach(c=>{const active=c===card;c.classList.toggle('selected',active);c.setAttribute('aria-pressed',String(active));});updateSummary();};
    styleGrid.appendChild(card);
  });
  const nationList=document.getElementById('nation-list');
  NATIONS.forEach(([code,name])=>{
    const item=document.createElement('button');item.type='button';item.className='nation-item';
    item.dataset.search=driverKey(`${code} ${name}`);item.setAttribute('aria-pressed',String(code===draft.nationCode));item.classList.toggle('selected',code===draft.nationCode);
    item.innerHTML=`<span class="nation-flag" aria-hidden="true">${nationFlag(code)}</span><span>${name}</span><small>${code}</small>`;
    item.onclick=()=>{draft.nationCode=code;draft.nationName=name;nationList.querySelectorAll('button').forEach(c=>{c.classList.toggle('selected',c===item);c.setAttribute('aria-pressed',String(c===item));});updateSummary();};
    nationList.appendChild(item);
  });
  document.getElementById('nation-search').oninput=e=>{
    const query=driverKey(e.target.value);let visible=0;
    nationList.querySelectorAll('button').forEach(item=>{item.hidden=!item.dataset.search.includes(query);if(!item.hidden)visible++;});
    document.getElementById('nation-empty').hidden=visible>0;
  };
  document.getElementById('in-name').oninput=e=>{draft.name=e.target.value.trim();updateSummary();};
  document.getElementById('in-num').oninput=e=>{const n=Number(e.target.value);draft.number=Number.isInteger(n)&&n>=1&&n<=99?n:null;updateSummary();};
  document.getElementById('btn-confirm-create').onclick=()=>{if(draft.name&&draft.style&&draft.number)confirmCreate();};
  function updateSummary(){
    document.getElementById('pv-name').textContent=draft.name?draft.name.toUpperCase():'SEU NOME';
    document.getElementById('pv-num').textContent=draft.number?'#'+draft.number:'#—';
    document.getElementById('helmet-number').textContent=draft.number||'—';
    document.getElementById('pv-country').textContent=`${nationFlag(draft.nationCode)} ${draft.nationName}`;
    document.getElementById('pv-style').textContent=draft.style?STYLES[draft.style].label:'Seu jeito de correr';
    const ready=!!(draft.name&&draft.style&&draft.number);
    document.getElementById('btn-confirm-create').disabled=!ready;
    document.getElementById('summary-box').textContent=!draft.name?'Digite o nome do seu piloto.':!draft.number?'Escolha um número inteiro entre 1 e 99.':!draft.style?'Escolha seu estilo de pilotagem.':'Tudo pronto para a sua primeira temporada.';
  }
  updateSummary();
}

let draft = {};

function confirmCreate(){
  state = newState();
  state.name = draft.name;
  state.number = draft.number;
  state.style = draft.style;
  state.nationCode = draft.nationCode;
  state.nationName = draft.nationName;

  // atributos base aleatórios moderados, com leve viés pro estilo escolhido
  const base = () => rnd(38,52);
  state.attrs = {
    qualy:base(), overtake:base(), oval:base(), contact:base(),
    consistency:base(), rain:base(), tyre:base(), mental:base(), eng:base()
  };
  state.ovr = computeOVR(state.attrs, state.style, "kart");
  state.peakOvr = state.ovr;
  state.roundsThisSeason = decisionCount(state.age);

  document.getElementById('screen-create').classList.add('hidden');
  renderOffers(generateOffers("kart", 1));
}

/* ---------------- Passo 2: propostas de equipe ---------------- */

function eliteSeatEligible(){
  const c=careerSystems(),years=state.yearHistory.filter(y=>y.category==='f1');
  return state.ovr>=85&&c.trust>=60&&c.preparation>=50&&
    (years.filter(y=>y.position<=8).length>=2||years.some(y=>y.position===1));
}
function exceptionalJunior(){
  return state.yearHistory.some(y=>y.category==='f2'&&y.position===1)&&state.ovr>=80&&careerSystems().trust>=65;
}
function f1OfferRole(team){
  const stars=f1TeamStars(team),hasF1=state.yearHistory.some(y=>y.category==='f1');
  if(stars>=4&&!eliteSeatEligible())return 'test';
  if(!hasF1)return 'second';
  return contractRole(state.ovr,stars,'f1');
}
function raceAbility(){
  if(state.category!=='f1')return state.ovr+playerCarPerformance()+(careerSystems().preparation-60)/30;
  // Rivais já usam força combinada de piloto/carro. Mesma escala 0–100 para o jogador.
  const c=careerSystems();
  const adaptation=state.age===state.team.ageStart?.8:0;
  return clamp(state.ovr*.65+f1CarRating(state.team)*.35+projectStrength()*.35+
    (c.preparation-30)/40+(state.team.role==='first'?.4:0)-adaptation,20,99);
}
function generateOffers(category, tierBias){
  // tierBias: 1 = base baixa, 2 = média, 3 = alta (pra propostas melhores conforme OVR sobe)
  let pool=categoryTeams(category);
  const recent=state.yearHistory.at(-1);
  if(category==='f1'&&!eliteSeatEligible()){
    const allowTest=exceptionalJunior();
    pool=pool.filter(t=>f1TeamStars(t)<=3||(allowTest&&f1TeamStars(t)===4));
  }
  const names = shuffle(pool).slice(0,3);
  return names.map((n,i)=>{
    const last=state.yearHistory.at(-1);
    const market=careerSystems();
    const form=last?.category===category ? (last.position<=3?1:last.position>10?-1:0) : 0;
    const stars = category==="f1" ? f1TeamStars(n) : clamp(tierBias + rnd(0,2) + Math.round(state.ovr/40), 1, 5);
    const country = n.country;
    const weekly = Math.max(2, Math.round(marketValue(state.ovr, state.age, category)*1000*0.015*(.75+market.trust/200+form*.1) + rnd(1,6)));
    const role = category==='f1'?f1OfferRole(n):contractRole(state.ovr,stars,category);
    return {
      ...n, category, stars, country,
      reason:category!=='f1'?'Oportunidade de desenvolvimento na base':role==='test'?'Campeão da base: oportunidade para provar seu valor':eliteSeatEligible()?'Resultados na F1 e confiança justificam esta proposta':'Conquiste seu espaço na Fórmula 1',
      weekly, years: Math.min(rnd(1,3),Math.max(1,43-state.age)), role,
      raceEstimate: role==='test'?Math.min(8,seasonRaceCount(category)):seasonRaceCount(category)
    };
  });
}

function renderOffers(offers, isTransferMidCareer){
  if(isTransferMidCareer && currentSeasonTeam()){
    const identity=currentSeasonTeam();
    offers = offers.filter(o=>o.id!==identity.id).slice(0,2);
    offers.push({...state.team,...identity, stars:state.category==='f1'?f1TeamStars(identity):state.team.stars, years:1, role:state.category==='f1'?f1OfferRole(identity):contractRole(state.ovr,state.team.stars,state.category), renewal:true});
  }
  const wrapId = isTransferMidCareer ? 'screen-transfer' : 'screen-offers';
  showOnly(wrapId);
  const el = document.getElementById(wrapId);

  const previousCategory = state.team?.category;
  const changingCategory = previousCategory && previousCategory !== state.category;
  const destination = categoryLabel(state.category, state.year);
  const title = isTransferMidCareer ? "Propostas de contrato" : "Propostas da base";
  const sub = isTransferMidCareer
    ? (changingCategory
      ? `Nova etapa: ${categoryLabel(previousCategory, state.year-1)} → ${destination} · ${state.year}. Escolha sua equipe para a nova categoria.`
      : `Propostas para ${destination} · ${state.year}. Escolha uma nova equipe ou renove o contrato atual.`)
    : `Três equipes de ${categoryLabel(state.category, state.year)} querem você. Escolha onde sua carreira começa.`;

  const cardsHtml = offers.map((o,idx)=>`
    <button type="button" class="offer-card" data-idx="${idx}" style="--team-color:${teamAccent(o.name)}">
      <div class="offer-tag">${o.renewal ? "Renovação" : "Nova equipe"} · ${o.country}</div>
      <div class="offer-crest" style="--garage-image:url('${SCENE_IMAGES[8]}')">${renderTeamLogo(o)}</div>
      <div class="badge">${categoryLabel(o.category, state.year)} · ${state.year}</div>
      <div class="offer-name">${o.name}</div>
      <div class="offer-stars" title="Competitividade do carro nesta temporada">${"★".repeat(o.stars)}${"☆".repeat(5-o.stars)}</div>
      <div class="contract-facts"><div><small>SALÁRIO SEMANAL</small><b>€${o.weekly}k</b></div><div><small>DURAÇÃO</small><b>${o.years} ano(s)</b></div></div>
      <div class="offer-role">${contractDescription(o)}</div><small class="offer-consequence">${o.renewal?'Renovação avaliada pelo seu desempenho atual':o.reason||'Oportunidade na categoria'}</small>${isTransferMidCareer?`<small class="salary-change">${o.weekly>=state.salaryWeek?'+':''}€${o.weekly-state.salaryWeek}k/sem em relação ao contrato atual</small>`:''}<small class="offer-consequence">${state.team&&state.team.id!==o.id&&state.team.category===o.category&&state.age<state.team.ageStart+state.team.years?'Saída antecipada: confiança −12.':o.renewal?'Continue o projeto e preserve sua evolução do carro.':'Comece um projeto nesta equipe.'}${careerSystems().sponsor&&state.team?.id!==o.id&&state.team?.category===o.category?' Patrocínio: devolução de €100k.':''}</small><span class="offer-action">${o.renewal?"Renovar contrato":"Escolher equipe"} →</span>
    </button>
  `).join("");

  el.innerHTML = `
    <div class="offers-wrap">
      <div class="offers-title">
        <h2>${title}</h2>
        <p>${sub}</p>
      </div>
      ${isTransferMidCareer&&state.team?`<section class="current-contract">${renderTeamLogo(state.team,true)}<div><small>Seu contrato atual</small><b>${escapeLogoText(state.team.name)} · ${categoryLabel(state.team.category,state.year)}</b></div><span>€${state.salaryWeek}k/sem · ${contractDescription(state.team)}</span></section>`:''}
      <div class="offers-grid">${cardsHtml}</div>
      ${isTransferMidCareer ? `
        <div class="agent-row">
          <button class="btn btn-ghost" id="btn-agent">Pedir novas indicações ao empresário (${state.agentUses}x)</button>
          <button class="btn btn-ghost" id="btn-simulate-end">Simular até a aposentadoria »</button>
        </div>` : ``}
    </div>
  `;

  el.querySelectorAll('.offer-card').forEach(card=>{
    card.onclick = ()=>{
      const idx = parseInt(card.dataset.idx,10);
      const o = offers[idx];
      signTeam(o, isTransferMidCareer);
    };
  });

  if(isTransferMidCareer){
    document.getElementById('btn-agent').onclick = ()=>{
      if(state.agentUses<=0) return;
      state.agentUses--;
      renderOffers(generateOffers(state.category, 2), true);
    };
    document.getElementById('btn-simulate-end').onclick = simulateToRetirement;
  }
}

function signTeam(offer, isTransfer){
  if(state.finished)return;
  if(state.age>42){finishCareer();return;}
  state.team = {
    ...offer, ageStart:state.age
  };
  state.salaryWeek = offer.weekly;
  registerTeamStart();

  if(isTransfer){
    document.getElementById('screen-transfer').classList.add('hidden');
  } else {
    document.getElementById('screen-offers').classList.add('hidden');
  }
  startSeason();
}

function registerTeamStart(){
  recordContractChoice();
  const last = state.teamHistory[state.teamHistory.length-1];
  if(last && last.open && last.name===state.team.name && last.category===state.category){ return; } // continuidade no mesmo time
  state.teamHistory.forEach(t=>t.open=false);
  state.teamHistory.push({
    name:state.team.name, crest:state.team.crest, historical:state.team.historical, category:state.category, ageStart:state.age, ageEnd:state.age,
    races:0, wins:0, podiums:0, titles:0, open:true
  });
}

function currentTeamRecord(){
  return state.teamHistory[state.teamHistory.length-1];
}

/* ---------------- Passo 3: temporada / rodadas ---------------- */

function prepareSeason(){
  refreshSeasonTeam();
  state.calendarRaces=0;
  state.seasonRaceTotal=seasonRaceCount();
  state.seasonRaceLimit=state.team.role==='test'?Math.min(state.seasonRaceTotal,rnd(4,8)):state.seasonRaceTotal;
  state.roundInSeason = 0;
  state.roundsThisSeason = decisionCount(state.age);
  state.seasonEventIds = [];
  state.seasonFinishes=[]; state.seasonRaces=0; state.seasonWins=0; state.seasonPodiums=0; state.seasonPoints=0;
  state.seasonHadRain=false; state.seasonIconic=false;

  state.standings = seasonDrivers(state.category, state.year).filter(driver=>driverKey(driver.name)!==driverKey(state.name)).map(driver=>({...driver, pts:0, finishes:[]}));
  state.lastRaceField = [];
  startCareerSeason();

}

function startSeason(){
  if(state.finished)return;
  if(state.age>42){finishCareer();return;}
  prepareSeason();
  nextRound();
}

function pickEvent(){
  // Sorteio único por carreira, não por rodada: 10% recebem a descoberta aos 14–15.
  if(!state.prodigyChecked){
    state.prodigyChecked=true;
    state.prodigyAge=state.age<=15 && Math.random()<.10 ? rnd(Math.max(14,state.age),15) : null;
  }
  if(!state.prodigyDiscovered && state.age===state.prodigyAge){
    state.prodigyDiscovered=true;
    const event={id:'prodigy-discovery',tag:'OPORTUNIDADE',title:'Um talento fora de série: os olheiros reconhecem você como um prodígio',options:[
      {text:'Entrar no programa intensivo da academia e revelar meu potencial',chance:100,succ:25,fail:0,prodigy:true},
      {text:'Desenvolver meu talento com a equipe e a família por perto',chance:100,succ:18,fail:0,prodigy:true}
    ]};
    state.seasonEventIds.push(event.id);state.recentEventIds=[...state.recentEventIds,event.id].slice(-12);state.lastTag=event.tag;
    return event;
  }
  const pool = [...(EVENTS[state.category]||[]), ...EVENTS.transversal, ...strategicEvents()].filter(ev=>!ev.minAge||state.age>=ev.minAge);
  const unused = pool.filter(e=>!state.seasonEventIds.includes(e.id));
  let candidates = unused.filter(e=>!state.recentEventIds.includes(e.id) && e.tag!==state.lastTag);
  if(!candidates.length) candidates = unused.filter(e=>!state.recentEventIds.includes(e.id));
  if(!candidates.length) candidates = unused.length ? unused : pool;

  // aumenta a chance de TÍTULO/OPORTUNIDADE se estiverem em cooldown longo
  const boostTags = ["TÍTULO","OPORTUNIDADE"];
  boostTags.forEach(t=>{
    state.tagCooldown[t] = (state.tagCooldown[t]||0)+1;
  });
  let pool2 = candidates.concat(candidates.filter(e=>e.id.startsWith('career-')));
  boostTags.forEach(t=>{
    if((state.tagCooldown[t]||0) >= 4){
      const extra = candidates.filter(e=>e.tag===t);
      pool2 = pool2.concat(extra, extra); // dobra o peso
    }
  });
  // reduz frequência de PESSOAL/MÍDIA
  pool2 = pool2.filter(e=> !( (e.tag==="PESSOAL"||e.tag==="MÍDIA") && Math.random()<0.4 ));
  if(pool2.length===0) pool2 = candidates;

  const strategic=candidates.filter(e=>e.id.startsWith('career-'));
  const chosen = strategic.length&&!state.seasonEventIds.some(id=>id.startsWith('career-'))&&Math.random()<.35 ? pick(strategic) : pick(pool2);
  state.tagCooldown[chosen.tag] = 0;
  state.seasonEventIds.push(chosen.id);
  state.recentEventIds = [...state.recentEventIds,chosen.id].slice(-12);
  state.lastTag = chosen.tag;
  return chosen;
}

const EVENT_IMAGES = {
  CHUVA:"linear-gradient(160deg,#1a2a33,#0a1418)", TÍTULO:"linear-gradient(160deg,#2b1a0e,#150c06)",
  RIVALIDADE:"linear-gradient(160deg,#2a1414,#140909)", EQUIPE:"linear-gradient(160deg,#141a2a,#090c14)",
  TÉCNICO:"linear-gradient(160deg,#1a2418,#0c130a)", MÍDIA:"linear-gradient(160deg,#241a2a,#120c15)",
  OPORTUNIDADE:"linear-gradient(160deg,#2a2214,#15110a)", PESSOAL:"linear-gradient(160deg,#1c1c22,#0d0d10)",
  LARGADA:"linear-gradient(160deg,#2a1010,#150707)"
};

// Cenas ilustrativas por categoria; não consome a aleatoriedade do jogo.
function raceImagePosition(category){
  const row = {kart:0, f4:1, f3:1, f2:1, f1:2, indycar:3, nascar:4, stockcar:4, veterano:5}[category] ?? 1;
  return `${[1.6,19.6,39,59.6,78.4,97.8][row]}%`;
}

// Seleção visual independente da aleatoriedade que decide os resultados.
function eventSceneKind(ev){
  const text=driverKey(ev.title||'');
  if(/noitada|festa|balada|noturna com amigos/.test(text)) return 'party';
  if(/sabot|adulter|violad|suspeita.*equipamento/.test(text)) return 'suspicion';
  if(/contrato|patrocin|proposta|negocia|reuniao|vaga|academia|convite simultaneo|oferece recursos|oferece mais recursos/.test(text)) return 'contract';
  if(/simulador/.test(text)) return 'simulator';
  if(/lesao|fisica|treinamento|preparacao fisica/.test(text)) return 'fitness';
  if(/escola|estudo|curso|pais pra|encerrar|mentor/.test(text)) return 'personal';
  if(ev.tag==='MÍDIA') return 'media';
  if(/engenheir|setup|acerto|upgrade|desenvolv|avaliacao tecnica|motor revisado|politica|conflito|telemetria/.test(text)) return 'garage';
  if(ev.tag==='PESSOAL') return 'personal';
  return ev.tag==='CHUVA'||/chuva|molhada/.test(text)?'wet':'race';
}
function chooseEventVisual(ev){
  const kind=eventSceneKind(ev);
  state.visualCounts ||= {};
  const count=state.visualCounts[kind]||0;state.visualCounts[kind]=count+1;
  const tiles={contract:[0,1],party:[2,3],suspicion:[4,5],media:[6,7],garage:[8,9],fitness:[10],personal:[11],simulator:[15,8],race:[12],wet:[13]};
  const racing=kind==='race'||kind==='wet';
  const formula=['f4','f3','f2','f1'].includes(state.category);
  // Mantém carros da categoria correta; alterna também o enquadramento das cenas existentes.
  const sheet=!racing||(formula&&count%2===0);
  const tile=tiles[kind][count%tiles[kind].length];
  return {kind,sheet,tile,variant:count%3,position:raceImagePosition(state.category)};
}
function eventVisualAttributes(ev){
  if(!state.eventVisual || state.eventVisualId!==ev.id){state.eventVisual=chooseEventVisual(ev);state.eventVisualId=ev.id;}
  const v=state.eventVisual;
  const descriptions={contract:'Negociação de contrato no paddock',party:'Encontro noturno entre amigos',suspicion:'Inspeção de equipamento suspeito na garagem',media:'Entrevista e imprensa',garage:'Engenharia e preparação na garagem',fitness:'Preparação e recuperação física',personal:'Vida e preparação fora da pista',simulator:'Treinamento e análise no simulador',race:'Disputa de corrida em circuito',wet:'Corrida em pista molhada'};
  return `class="event-image ${v.sheet?'event-image--story':'event-image--race'}" style="${v.sheet?`--scene-image:url('${SCENE_IMAGES[v.tile]}');`:""}--scene-x:${(v.tile%4)*100/3}%;--scene-y:${Math.floor(v.tile/4)*100/3}%;--race-position:${v.position};--scene-zoom:${1+v.variant*.06};--scene-pan:${v.variant===1?'-2%':v.variant===2?'2%':'0%'}" role="img" aria-label="${descriptions[v.kind]} — cena ilustrativa"`;
}
function renderDriverTrophies(){
  const items=(state.trophies||[]).filter(t=>t.name.startsWith('Campeão da '));
  const grouped=new Map();
  for(const t of items){const row=grouped.get(t.name)||{name:t.name,count:0,years:[]};row.count++;row.years.push(t.year??2010+t.age-14);grouped.set(t.name,row);}
  const rows=[...grouped.values()].reverse().sort((a,b)=>Number(b.name.includes('Fórmula 1'))-Number(a.name.includes('Fórmula 1')));
  const render=rows=>rows.map(t=>`<li class="${t.name.includes('Fórmula 1')?'title-f1':''}"><span aria-hidden="true">${racingIcon('cup')}</span><div><b>${escapeLogoText(t.name)}</b><small>${t.years.join(' · ')}</small></div><strong>×${t.count}</strong></li>`).join('');
  return `<section class="driver-trophies" aria-label="Títulos de campeão"><h4>Títulos <span>${items.length}</span></h4>${items.length?`<ul>${render(rows.slice(0,3))}</ul>${rows.length>3?`<details><summary>Ver todos os ${items.length} títulos</summary><ul>${render(rows.slice(3))}</ul></details>`:''}`:'<p>Sua coleção começa com o primeiro campeonato.</p>'}</section>`;
}

function nextRound(){
  if(state.finished)return;
  state.roundInSeason++;
  if(state.roundInSeason > state.roundsThisSeason){
    endSeason();
    return;
  }
  const ev = pickEvent();
  state.currentEvent = ev;
  state.eventVisual=chooseEventVisual(ev);state.eventVisualId=ev.id;
  state.lastTag = ev.tag;
  renderRound(ev);
}

function racingIcon(kind='cup'){
 const paths={cup:'M8 3h8v6a4 4 0 0 1-8 0V3ZM8 5H4v3a4 4 0 0 0 4 4m8-7h4v3a4 4 0 0 1-4 4m-4 1v6m-4 0h8',flag:'M5 21V3m0 0h14l-3 4 3 4H5',bolt:'m13 2-8 12h6l-1 8 9-13h-6Z'};
 return `<svg class="racing-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[kind]||paths.cup}"/></svg>`;
}
function renderSeasonHeader(){
 const position=seasonStandings().findIndex(d=>d.me)+1;
 const total=state.seasonRaceTotal||seasonRaceCount();
 return `<section class="season-dashboard" style="--team-color:${teamAccent(state.team?.name)}"><div>${renderTeamLogo(state.team,true)}<b>${state.year} <small>${categoryLabel(state.category,state.year)}</small></b><span>${escapeLogoText(state.team?.name||'')}</span></div><div><strong>${state.calendarRaces?position+'º':'—'}</strong><span>Campeonato · ${state.seasonPoints} pts</span></div><div class="season-progress"><span>Calendário <b>${state.calendarRaces}/${total}</b></span><progress max="${total}" value="${state.calendarRaces}" aria-label="Progresso do calendário"></progress><small>Decisão ${state.roundInSeason}/${state.roundsThisSeason}</small></div></section>`;
}
function renderMilestone(title,text,tile=14){
 return `<section class="milestone" style="--moment-image:url('${SCENE_IMAGES[tile]}')"><div>${racingIcon('flag')}<small>Um capítulo para guardar</small><h3>${title}</h3><p>${text}</p></div></section>`;
}
function renderEvolution(){
 const rows=state.yearHistory.slice(-6);
 if(!rows.length)return '<section class="evolution"><h4>Evolução</h4><p>Os gráficos aparecem após a primeira temporada.</p></section>';
 const graph=(key,label,color)=>{
   const valid=rows.filter(y=>Number.isFinite(y[key]));
   if(!valid.length)return '';
   const points=valid.map((y,i)=>`${12+i*216/Math.max(1,valid.length-1)},${78-y[key]*.65}`).join(' ');
   return `<div class="evolution-chart"><b>${label} <span>${valid.at(-1)[key].toFixed(0)}</span></b><svg viewBox="0 0 240 90" role="img" aria-label="${label}: ${valid.map(y=>y.year+': '+Math.round(y[key])).join(', ')}"><path d="M12 78H228M12 45H228M12 13H228" stroke="#ffffff12"/><polyline points="${points}" fill="none" stroke="${color}" stroke-width="3"/>${valid.map((y,i)=>`<circle cx="${12+i*216/Math.max(1,valid.length-1)}" cy="${78-y[key]*.65}" r="3" fill="${color}"/>`).join('')}</svg><small>${valid[0].year} — ${valid.at(-1).year} · escala 0–100</small></div>`;
 };
 return `<section class="evolution"><h4>Evolução por temporada</h4>${graph('ovr','Piloto / OVR','#f2a900')}${graph('carRating','Carro / competitividade','#62c9dd')}</section>`;
}
function renderBroadcast(result){
 const rival=state.lastRaceField.find(d=>d.name===careerSystems().rival);
 return `<section class="broadcast"><div class="broadcast-position"><small>Última corrida do trecho</small><b>${result.pos?'P'+result.pos:'—'}</b><span>${result.pos?'+'+result.pts+' pontos':'Sem participação'}</span></div><div class="broadcast-rival"><small>Rival nesta corrida</small><b>${escapeLogoText(careerSystems().rival||'Sem rival definido')}</b><span>${rival?'P'+rival.pos+' · '+rival.pts+' pts':'Sem resultado neste trecho'}</span></div></section>`;
}

function renderRound(ev){
  showOnly('screen-round');
  const el = document.getElementById('screen-round');
  const bg = EVENT_IMAGES[ev.tag] || EVENT_IMAGES.EQUIPE;

  el.innerHTML = `
    ${renderSeasonHeader()}
    <div class="game-grid" style="--team-color:${teamAccent(state.team?.name)}">
      ${renderDriverCard()}
      <div class="event-panel">
        ${state.category==='f1'&&state.firstSeasonInCategory&&state.roundInSeason===1?renderMilestone('Bem-vindo à Fórmula 1','Seu primeiro capítulo no grid da elite.',12):''}
        <div ${eventVisualAttributes(ev)}>
          <div class="roundtag">
            <span class="rtag">RODADA ${state.roundInSeason}/${state.roundsThisSeason}</span>
            <span class="rtag type">${ev.tag}</span>
          </div>
        </div>
        <div class="event-body">
          <h3>${ev.title}</h3>
          <p>${categoryLabel(state.category, state.year)} · ${state.team ? state.team.name : ""} · ${state.age} anos</p>
          <div class="options" id="options-wrap"></div>
        </div>
      </div>
      ${renderSidePanel()}
    </div>
  `;

  const wrap = document.getElementById('options-wrap');
  ev.options.forEach((opt,idx)=>{
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.innerHTML = `
      <div class="otext"><b>${opt.text}</b><span>${choiceRiskLabel(opt)} · ${opt.chance}%: sucesso ${previewChoice(opt,true)} OVR · falha ${previewChoice(opt,false)} OVR</span></div>
      <div class="probability"><div class="prob-labels"><span>${opt.chance}% sucesso</span><span>${100-opt.chance}% falha</span></div><div class="pctbar" aria-hidden="true"><div class="succ" style="width:${opt.chance}%"></div><div class="fai" style="width:${100-opt.chance}%"></div></div></div>
    `;
    btn.onclick = ()=> resolveOption(opt);
    wrap.appendChild(btn);
  });
}

function resolveOption(opt){
  const success = rnd(1,100) <= opt.chance;
  const before = state.ovr;
  applyChoiceToAttrs(state.attrs,opt,success);
  state.ovr = clamp(computeOVR(state.attrs, state.style, state.category), 20, 99);
  state.peakOvr = Math.max(state.peakOvr, state.ovr);
  applyCareerChoice(state.currentEvent,opt,success,state.ovr-before);

  if(state.currentEvent.tag==="CHUVA" && success) state.seasonHadRain = true;
  if(ICONIC_EVENT_IDS.includes(state.currentEvent.id) && success) state.seasonIconic = true;

  // resultado de corrida da rodada
  const winsBefore=state.wins;
  const raceResult = simulateDecisionRaces();
  const firstWin=winsBefore===0&&state.wins>0;
  state.currentResult = { success, delta:state.ovr-before, opt, raceResult, firstWin };

  renderResult();
}

const ICONIC_EVENT_IDS = ["indycar_50","stockcar_43","nascar_54","f1_34","f1_39"]; // 500 Milhas, Corrida do Milhão, Daytona, Spa

// Cada decisão representa um trecho do calendário original: nenhuma corrida se perde.
function simulateDecisionRaces(){
  const total=state.seasonRaceTotal;
  const target=Math.floor(state.roundInSeason*total/state.roundsThisSeason);
  let result={pos:null,pts:0,label:'Sem participação neste trecho'};
  while(state.calendarRaces<target){
    const next=state.calendarRaces+1;
    const participates=Math.floor(next*state.seasonRaceLimit/total)>Math.floor(state.calendarRaces*state.seasonRaceLimit/total);
    const race=simulateRace(participates);
    if(participates) result=race;
  }
  return result;
}

function simulateRace(participates=true){
  state.calendarRaces++;
  if(participates){state.races++; state.seasonRaces++;currentTeamRecord().races++;}

  // Na F1, a força dos rivais já inclui o carro; a equipe também contribui para o jogador.
  const myRoll = raceAbility() + rnd(-18,18);
  const field = state.standings.map(r=>({...r, roll:r.strength+rnd(-18,18)}));
  if(participates) field.push({name:state.name, roll:myRoll, me:true});
  field.sort((a,b)=>b.roll-a.roll);
  const pos = field.findIndex(f=>f.me)+1;

  const pts = participates ? pointsForPosition(pos) : 0;
  let label="Sem pontuar";
  if(pos===1){ label="Vitória"; state.wins++; state.seasonWins++; currentTeamRecord().wins++; state.podiums++; state.seasonPodiums++; currentTeamRecord().podiums++; }
  else if(participates&&pos<=3){ label="Pódio (P"+pos+")"; state.podiums++; state.seasonPodiums++; currentTeamRecord().podiums++; }
  else if(participates&&pos<=8){ label="P"+pos+" — pontuou"; }
  else { label="P"+pos; }

  if(participates && Math.random() < (state.ovr>=72 ? 0.22 : 0.08)){ state.poles++; }

  state.seasonPoints += pts;
  if(participates) state.seasonFinishes.push(pos);
  // Todos pontuam pelo mesmo resultado e pela mesma tabela simplificada do jogo.
  state.lastRaceField = field.map((driver,index)=>({
    name:driver.name, me:!!driver.me, pos:index+1, pts:pointsForPosition(index+1)
  }));
  state.standings.forEach(r=>{
    const result = state.lastRaceField.find(driver=>!driver.me && driver.name===r.name);
    r.pts += result.pts;
    r.finishes.push(result.pos);
  });

  // valor de mercado evolui a cada corrida também, suave
  state.value = marketValue(state.ovr, state.age, state.category);
  state.peakValue = Math.max(state.peakValue, state.value);
  const earn = Math.round(state.salaryWeek * 1000 * 52 / state.seasonRaceTotal);
  state.careerEarnings += earn;

  return { pos, pts, label };
}

function renderResult(){
  showOnly('screen-round');
  const el = document.getElementById('screen-round');
  const r = state.currentResult;
  const ev = state.currentEvent;
  const bg = EVENT_IMAGES[ev.tag] || EVENT_IMAGES.EQUIPE;

  el.innerHTML = `
    ${renderSeasonHeader()}
    <div class="game-grid" style="--team-color:${teamAccent(state.team?.name)}">
      ${renderDriverCard()}
      <div class="event-panel">
        ${r.firstWin?renderMilestone('Sua primeira vitória','O primeiro lugar que inaugura seu legado.'):''}
        <div ${eventVisualAttributes(ev)}></div>
        <div class="event-body">
          ${renderBroadcast(r.raceResult)}
          <span class="result-badge ${r.success?'ok':'bad'}">${r.success ? "A escolha deu certo" : "A escolha deu errado"}</span>
          <h3>${r.opt.text}</h3>
          <p>${r.success
            ? "A decisão funcionou a seu favor. Confira o resultado deste trecho da temporada."
            : "Não saiu como esperado — mas faz parte da temporada."}</p>
          <div class="effect-chip">OVR <b>${r.delta>=0?'+':''}${r.delta}</b> → agora em <b>${state.ovr}</b></div>
          <div class="effect-chip">Corrida: <b>${r.raceResult.label}</b> (+${r.raceResult.pts} pts)</div>
          <div><button class="btn btn-primary continue-btn" id="btn-continue">Continuar »</button></div>
        </div>
      </div>
      ${renderSidePanel()}
    </div>
  `;
  document.getElementById('btn-continue').onclick = nextRound;
}

/* ---------------- Painéis reutilizáveis ---------------- */

function teamAccent(name=''){
  if(/ferrari|prema/i.test(name))return '#ed443c';
  if(/mclaren/i.test(name))return '#ff9800';
  if(/mercedes/i.test(name))return '#39d6bb';
  if(/aston|tony kart/i.test(name))return '#38b88e';
  if(/red bull|williams|alpine/i.test(name))return '#5295ff';
  return '#f2a900';
}
function renderCareerTimeline(){
  const seasons=state.yearHistory;
  const items=seasons.map((y,i)=>`<li class="${y.position===1?'timeline-champion':''}"><time>${y.year}</time><div>${renderTeamLogo({name:y.team},true)}<b>${escapeLogoText(y.team||'—')}</b><small>${categoryLabel(y.category,y.year)}${i&&seasons[i-1].category!==y.category?' · Nova categoria':''}</small><span class="timeline-position">${y.position?`${y.position}º no campeonato`:'Posição não registrada'}</span>${y.position===1?'<span class="timeline-title">'+racingIcon('cup')+' Campeão</span>':''}</div></li>`).join('');
  return `<section class="career-timeline"><h4>Sua trajetória</h4>${items?`<ol>${items}</ol>`:'<p>A primeira página da sua história começa aqui.</p>'}${state.finished?'':`<div class="timeline-now">● ${state.year} · ${categoryLabel(state.category,state.year)}<small>Temporada atual</small></div>`}</section>`;
}

function renderDriverCard(){
  return `
    <div class="driver-card" style="--team-color:${teamAccent(state.team?.name)}"><div class="license-header"><span>CARRERA / PILOTO</span><span>${state.year}</span></div><div class="driver-portrait"><svg viewBox="0 0 160 110" aria-hidden="true"><path d="M22 82V57C22 0 137 0 137 61L145 87L126 99H44Z" fill="#dadce0"/><path d="M25 47Q81 28 137 47L141 67Q83 82 28 65Z" fill="#111923"/><path d="M23 79L144 83L126 99H44Z" fill="var(--team-color)"/></svg><strong>#${state.number}</strong></div>
      <div class="dc-top">
        <div class="dc-ovr"><small>OVR</small><b>${state.ovr}</b></div>
        <div class="dc-info">
          <b>${state.name}</b>
          <div class="dc-badges"><span class="badge">${nationFlag(state.nationCode)} ${state.nationCode}</span><span class="badge">#${state.number}</span><span class="badge">${state.year}</span></div>
          <div class="dc-team">${renderTeamLogo(state.team,true)}${state.team ? state.team.name : "—"}</div>
        </div>
      </div>
      <div class="dc-stats">
        <div><b>${state.age}</b><span>Idade</span></div>
        <div><b>€${state.value.toFixed(1)}M</b><span>Valor</span></div>
      </div>
      <div class="dc-races">
        <div><b>${state.races}</b><span>Corridas</span></div>
        <div><b>${state.wins}</b><span>Vitórias</span></div>
        <div><b>${state.podiums}</b><span>Pódios</span></div>
      </div>
      ${renderDriverTrophies()}
      ${renderCareerStatus()}
      ${renderEvolution()}
    </div>
  `;
}

function renderSidePanel(){
  const rows = state.yearHistory.slice(-8).map(y=>`
    <tr>
      <td title="${y.age} anos">${y.year}</td>
      <td><b>${categoryLabel(y.category, y.year)}</b><br>${y.team||'—'}</td>
      <td><span class="ovr-pill">${y.ovr}</span></td><td>${y.position?`${y.position}º`:'—'}</td>
      <td>${y.races}</td>
      <td>${y.wins}</td>
    </tr>
  `).join("");

  const standingsSorted = seasonStandings();
  const myPos = standingsSorted.findIndex(s=>s.me)+1;
  const top3 = standingsSorted.slice(0,3);
  const standingsHtml = top3.map((s,i)=>`
    <div class="standings-row ${s.me?'me':''}">${i+1}. ${s.name}<span>${s.pts} pts</span></div>
  `).join("") + (myPos>3 ? `<div class="standings-row me">${myPos}. ${state.name}<span>${state.seasonPoints} pts</span></div>` : "");

  return `
    <div class="side-panel">
      ${renderCareerTimeline()}
      <details class="roster-details"><summary>Estatísticas por temporada</summary>
      <table class="years">
        <thead><tr><th>Ano</th><th>Categoria / Equipe</th><th>OVR</th><th>Pos.</th><th>Corr.</th><th>Vit.</th></tr></thead>
        <tbody>
          ${rows}
          <tr class="current"><td title="${state.age} anos">${state.year}</td><td><b>${categoryLabel(state.category, state.year)}</b><br>${state.team?state.team.name:'—'}</td><td><span class="qmark">?</span></td><td>${myPos}º</td><td>${state.seasonRaces}</td><td>${state.seasonWins}</td></tr>
        </tbody>
      </table></details>
      <h4>Classificação · ${categoryLabel(state.category, state.year)} · ${state.year}${state.year>2026 ? " · Projeção" : ""}</h4>
      <div class="standings">${standingsHtml}</div>
      <details class="roster-details"><summary>Ver todos os pilotos · ${state.year}</summary>
        <p>${state.year>2026 ? 'Continuidade e entradas futuras são projeções da simulação.' : 'Pilotos reais da categoria nesta época; resultados decididos no jogo.'}</p>
        <ol class="roster-list">${standingsSorted.map(driver=>`<li>${escapeLogoText(driver.name)} · ${driver.pts} pts${driver.me ? '<small>Você</small>' : driver.prospect ? '<small>Entrada projetada na F1</small>' : ''}</li>`).join('')}</ol>
      </details>
      <h4>Rodada</h4>
      <div class="cup-box">
        <div class="cup-row">Rodada atual<span>${state.roundInSeason}/${state.roundsThisSeason}</span></div>
        <div class="cup-row">Ganhos na temporada<span>€${Math.round(state.careerEarnings/1000)}k</span></div>
      </div>
    </div>
  `;
}

function showOnly(id){
  ["screen-cover","screen-create","screen-offers","screen-round","screen-seasonsummary","screen-transfer","screen-final"]
    .forEach(s=>document.getElementById(s).classList.toggle('hidden', s!==id));
}

/* ---------------- Fim de temporada ---------------- */

function endSeason(automatic=false){
  const standingsSorted = seasonStandings();
  const myPos = standingsSorted.findIndex(s=>s.me)+1;

  const seasonTrophies = [];
  if(myPos===1) seasonTrophies.push("Campeão da "+categoryLabel(state.category, state.year));
  if(state.firstSeasonInCategory && myPos<=5) seasonTrophies.push("Novato do Ano");
  if(state.seasonHadRain) seasonTrophies.push("Piloto da Chuva");
  if(state.seasonIconic) seasonTrophies.push("Corrida Lendária");
  if(state.ovr>=75 && Math.random()<0.35) seasonTrophies.push("Pole Mais Rápida");
  if(seasonTrophies.length===0 && state.seasonWins>0) seasonTrophies.push("Superação");

  seasonTrophies.forEach(t=> state.trophies.push({age:state.age, name:t}));
  if(myPos===1) currentTeamRecord().titles++;

  state.yearHistory.push({
    age:state.age, year:state.year, team:state.team?state.team.name:null, category:state.category,
    carRating:state.category==='f1'?Math.min(100,f1CarRating(state.team)+projectStrength()/0.4):Math.min(100,state.team.stars*20+projectStrength()), ovr:state.ovr, role:state.team.role, calendarRaces:state.calendarRaces, races:state.seasonRaces, wins:state.seasonWins, podiums:state.seasonPodiums, position:myPos
  });
  currentTeamRecord().ageEnd = state.age;

  // Treino anual da base mantém a evolução mesmo com poucas decisões.
  if(["kart","f4","f3","f2"].includes(state.category)){
    bumpAttrs(state.attrs,3);
    updateRating();
    state.yearHistory[state.yearHistory.length-1].ovr = state.ovr;
  }
  endCareerSeason(myPos);
  state.retirementReason=retirementReason();
  if(state.retirementReason){finishCareer();return;}
  if(!automatic) renderSeasonSummary(myPos, seasonTrophies);
}

function renderSeasonSummary(pos, trophies){
  trophies=trophies.filter(t=>t.startsWith('Campeão da '));
  showOnly('screen-seasonsummary');
  const el = document.getElementById('screen-seasonsummary');
  el.innerHTML = `
    <div class="summary-wrap">
      ${trophies.length?renderMilestone('Uma temporada de campeão',escapeLogoText(trophies.join(' · '))):''}
      <h2>Temporada ${state.year} encerrada — ${state.age} anos</h2><p style="color:var(--muted)">Você pode encerrar sua carreira agora. 42 anos é o limite, não uma meta obrigatória.</p>
      <p style="color:var(--muted)">${categoryLabel(state.category, state.year)} · ${state.team.name} · posição final: <b>${pos}º</b></p>
      <div class="dc-ovr" style="margin:18px auto;"><small>OVR</small><b>${state.ovr}</b></div>
      <div class="trophy-list ${trophies.length?'title-celebration':''}">
        ${trophies.length ? trophies.map(t=>`<span class="trophy-chip">${racingIcon('cup')} ${t}</span>`).join("") : `<span class="trophy-chip" style="color:var(--muted);border-color:var(--line);">Sem título nesta temporada</span>`}
      </div>
      <p>Objetivo: ${careerSystems().objective?.label||'Conquistar seu espaço'} · <b>${careerSystems().lastObjective?'Cumprido':'Não cumprido'}</b></p>
      ${renderDecisionJournal()}
      <button class="btn btn-primary" id="btn-advance">${state.age>=42?"Encerrar carreira 🏁":`Avançar para ${state.year+1} · ${state.age+1} anos »`}</button>
    </div>
  `;
  document.getElementById('btn-advance').onclick = advanceAge;
  if(state.age<42){
    const retire=document.createElement('button');retire.className='btn';
    retire.textContent='Aposentar e ver meu legado';retire.onclick=finishCareer;el.appendChild(retire);
  }
}

/* ---------------- Progressão de idade / categoria ---------------- */

function advanceAge(){
  if(state.finished||state.yearHistory.at(-1)?.age!==state.age)return;
  if(state.age>=42){finishCareer();return;}
  state.age++;
  ageDriver();
  state.firstSeasonInCategory = false;

  const nextCat = maybePromote();
  if(nextCat){
    state.category = nextCat;
    state.firstSeasonInCategory = true;
    updateRating();
    goToTransferOrContinue();
    return;
  }

  // sem promoção — decide se troca de equipe (30% de chance) ou segue
  if(!currentSeasonTeam() || state.age-state.team.ageStart>=state.team.years || Math.random()<0.35){
    goToTransferOrContinue();
  } else {
    currentTeamRecord().ageEnd = state.age;
    startSeason();
  }
}

function maybePromote(){
  const completed = state.yearHistory.filter(y=>y.category===state.category).length;
  const last = state.yearHistory[state.yearHistory.length-1];
  const strongSeason = last && last.category===state.category && last.position<=3;
  const next = {kart:"f4",f4:"f3",f3:"f2"}[state.category];
  if(next){
    // De uma a duas temporadas em cada categoria de formação, inclusive F3.
    return completed>=2 || state.ovr>=CATEGORY_GATE[next]-4 || strongSeason ? next : null;
  }
  if(state.category==="f2"){
    if(state.ovr>=CATEGORY_GATE.f1 || (strongSeason && state.ovr>=68)) return "f1";
    // A F1 é o destino da campanha; o desempenho antecipa a chegada.
    // Após três temporadas na F2, o acesso ocorre sem desvio aleatório de categoria.
    if(completed>=3) return "f1";
  }
  return null;
}

function goToTransferOrContinue(){
  state.agentUses = 2;
  renderOffers(generateOffers(state.category, 2), true);
}

function simulateToRetirement(){
  if(state.finished)return;
  document.getElementById('screen-transfer').classList.add('hidden');
  while(state.age<=42 && !state.finished){
    // Promoções sempre colocam o piloto em uma equipe da categoria correta.
    if(!currentSeasonTeam() || state.age-state.team.ageStart>=state.team.years){
      state.team = {...generateOffers(state.category,2)[0],ageStart:state.age};
      state.salaryWeek = state.team.weekly;
      registerTeamStart();
    }
    prepareSeason();
    for(let r=1;r<=state.roundsThisSeason;r++){
      state.roundInSeason = r;
      const ev = pickEvent();
      const opt = pick(ev.options);
      const success = rnd(1,100)<=opt.chance;
      const before=state.ovr;
      applyChoiceToAttrs(state.attrs,opt,success);
      updateRating();
      applyCareerChoice(ev,opt,success,state.ovr-before);
      if(ev.tag==="CHUVA" && success) state.seasonHadRain=true;
      if(ICONIC_EVENT_IDS.includes(ev.id) && success) state.seasonIconic=true;
      simulateDecisionRaces();
    }
    endSeason(true);
    if(state.finished||state.age>=42) break;
    state.age++;
    ageDriver();
    state.firstSeasonInCategory = false;
    const next = maybePromote();
    if(next){
      state.category = next;
      state.firstSeasonInCategory = true;
      updateRating();
    }
  }
  if(!state.finished)finishCareer();
}

/* ---------------- Tela final ---------------- */

function formatCareerMoney(value){
  const scale=Math.abs(value)>=1e9?1e9:Math.abs(value)>=1e6?1e6:Math.abs(value)>=1e3?1e3:1;
  return '€'+(value/scale).toLocaleString('pt-BR',{maximumFractionDigits:1})+({1000000000:'B',1000000:'M',1000:'k',1:''}[scale]);
}
function renderFinalSeasons(){
  return `<section class="final-seasons"><h3>Sua trajetória <span>${state.yearHistory.length} temporadas</span></h3><div class="season-grid">${state.yearHistory.map((y,i)=>`<article class="season-tile ${y.position===1?'season-winner':''}"><header><time>${y.year}</time><span>${y.age} anos</span>${renderTeamLogo({name:y.team},true)}</header><b>${escapeLogoText(y.team||'—')}</b><small>${categoryLabel(y.category,y.year)}${i&&state.yearHistory[i-1].category!==y.category?' · Nova categoria':''}</small><strong class="season-place">${y.position?y.position+'º lugar':'—'} ${y.position===1?racingIcon('cup'):''}</strong><footer><span><b>${y.wins}</b> vitórias</span><span><b>${y.podiums}</b> pódios</span><span><b>${y.ovr}</b> OVR</span></footer></article>`).join('')}</div></section>`;
}

function finishCareer(){
  state.finished = true;
  showOnly('screen-final');
  const el = document.getElementById('screen-final');

  const highestCatReached = pickHighestCategory();
  const awards = computeAwards(highestCatReached);
  const unlockedMedals = [...new Set(state.yearHistory.map(y=>y.category))];

  const teamCardsHtml = state.teamHistory.map((t,i)=>`
    <div class="team-card">
      <div class="tc-num">${String(i+1).padStart(2,'0')}</div>
      <div class="tc-crest">${renderTeamLogo(t)}</div>
      <div class="tc-name">${t.name}</div>
      <div class="tc-seasons">${(t.ageEnd-t.ageStart+1)} temporada(s)</div>
      <div class="tc-stats">
        <div><b>${t.races}</b><span>Corridas</span></div>
        <div><b>${t.wins}</b><span>Vitórias</span></div>
        <div><b>${t.podiums}</b><span>Pódios</span></div>
      </div>
      ${t.titles>0 ? `<div class="tc-trophies">${racingIcon('cup').repeat(Math.min(t.titles,3))}</div>` : ``}
    </div>
  `).join("");

  const titles=state.yearHistory.filter(y=>y.position===1);
  const f1Titles=titles.filter(y=>y.category==='f1').length;
  const otherTitles=titles.length-f1Titles;
  const legacy=f1Titles>=8?'Uma nova referência na história da Fórmula 1.':f1Titles>0?'Seu nome entrou para a história dos campeões.':state.wins>0?'Vitórias, escolhas e uma história que é só sua.':'Cada temporada escreveu um capítulo da sua história.';
  el.innerHTML = `
    <section class="legacy-hero">
      <img src="${SCENE_IMAGES[14]}" alt="Cena ilustrativa de celebração no pódio" class="legacy-photo">
      <div class="legacy-copy"><span class="fc-eyebrow">CARRERA / SEU LEGADO · ${state.yearHistory.at(-1)?.age??state.age} anos</span><h2>${escapeLogoText(state.name)}</h2><p>${legacy}</p><div class="legacy-titles"><div><b>${f1Titles}</b><span>Títulos de F1</span></div><div><b>${otherTitles}</b><span>Títulos em outras categorias</span></div></div></div>
    </section>
    <p class="retirement-note">${state.retirementReason||'Você decidiu encerrar sua carreira.'}</p>
    <section class="legacy-stats" aria-label="Números da carreira">
      ${[[state.wins,'Vitórias'],[state.podiums,'Pódios'],[state.races,'Corridas'],[state.peakOvr,'Melhor OVR'],[formatCareerMoney(state.careerEarnings),'Ganhos'],[formatCareerMoney(state.peakValue*1000000),'Valor máximo']].map(([value,label])=>`<div><b>${value}</b><span>${label}</span></div>`).join('')}
    </section>
    <section class="title-gallery"><h3>Galeria de campeonatos <span>${titles.length}</span></h3><div class="title-gallery-grid">${titles.length?titles.map(y=>`<article class="title-tile ${y.category==='f1'?'title-tile-f1':''}"><span class="title-cup" aria-hidden="true">${racingIcon('cup')}</span><div><b>${categoryLabel(y.category,y.year)}</b><strong>${y.year}</strong><small>${escapeLogoText(y.team||'—')}</small></div>${renderTeamLogo({name:y.team},true)}</article>`).join(''):'<p>Você encerrou a carreira sem campeonatos, mas sua trajetória fica registrada abaixo.</p>'}</div></section>
    ${renderEvolution()}
    ${renderFinalSeasons()}
    <details class="legacy-awards"><summary>Prêmios e marcas pessoais · ${awards.filter(a=>a.unlocked).length} conquistas</summary><div class="awards-list">${awards.map(a=>`<div class="award-item ${a.unlocked?'':'locked'}"><span>${a.label}</span><span>${a.unlocked?'✓':'—'}</span></div>`).join('')}</div><p>${state.poles} poles · ${state.trophies.filter(t=>t.name==='Corrida Lendária').length} eventos lendários</p><div class="medal-row">${unlockedMedals.map(c=>`<div class="medal" title="${CATEGORY_LABEL[c]}">${CATEGORY_ICON[c]}</div>`).join('')}</div></details>
    ${renderDecisionJournal(true)}
    <details class="legacy-awards"><summary>Equipes da sua carreira · ${state.teamHistory.length} passagens</summary><div class="team-cards">${teamCardsHtml}</div></details>

    <div class="final-actions">
      <button class="btn btn-primary" id="btn-again">↺ Jogar de novo</button>
      <button class="btn btn-ghost" id="btn-share">Compartilhe esta lenda</button>
      <button class="btn btn-ghost" id="btn-rank">Enviar para a classificação</button>
      <button class="btn btn-ghost" id="btn-save">Salvar e receber honras</button>
    </div>
  `;

  document.getElementById('btn-again').onclick = ()=>{ location.reload(); };
  document.getElementById('btn-share').onclick = ()=> alert("Em uma próxima versão: gera a carta do piloto em imagem pra download/compartilhamento.");
  document.getElementById('btn-rank').onclick = ()=> alert("Em uma próxima versão: envia seu resultado pra uma classificação pública online.");
  document.getElementById('btn-save').onclick = ()=> alert("Em uma próxima versão: salva seu progresso vinculado a uma conta.");
}

function pickHighestCategory(){
  const rank = {kart:1,f4:2,f3:3,f2:4,stockcar:5,indycar:6,nascar:6,f1:7,veterano:7};
  let best = "kart";
  state.yearHistory.forEach(y=>{ if((rank[y.category]||0) >= (rank[best]||0)) best = y.category; });
  return best;
}

function iconicRaceForCategory(cat){
  const map = {
    f1:"GP de Mônaco", indycar:"500 Milhas de Indianápolis", nascar:"Daytona 500",
    stockcar:"Corrida do Milhão", f2:"Fórmula 2 — Spa", f3:"Fórmula 3 — Macau",
    f4:"F4 — Interlagos", kart:"Mundial de Kart", veterano:"24 Horas de Le Mans"
  };
  return map[cat]||"—";
}

function computeAwards(cat){
  const t = name => state.trophies.some(x=>x.name.includes(name));
  return [
    {label:"Campeão Mundial", unlocked: t("Campeão da Fórmula 1")||t("Campeão da NASCAR")||t("Campeão da IndyCar")},
    {label:"A Joia", unlocked: t("Novato do Ano")},
    {label:"O Estrategista", unlocked: state.wins>=10},
    {label:"Quinhentas Largadas", unlocked: state.races>=500},
    {label:"Cem Vitórias", unlocked: state.wins>=100},
    {label:"Cem Corridas em Categoria de Elite", unlocked: state.races>=100 && (cat==="f1"||cat==="indycar"||cat==="nascar")},
    {label:"Rei da Chuva", unlocked: t("Piloto da Chuva")},
    {label:"Andarilho", unlocked: new Set(state.teamHistory.map(x=>x.name)).size>=4},
    {label:"Cem Pódios", unlocked: state.podiums>=100},
    {label:"Testado por Equipe de Fábrica", unlocked: state.trophies.length>0},
    {label:"Sócio da Primeira Corrida", unlocked: state.yearHistory.length>0 && state.yearHistory[0].races===CATEGORY_ROUNDS.kart},
  ];
}

/* ---------------- Boot ---------------- */

draft = {name:"", number:10, style:null, nationCode:"BR", nationName:"Brasil"};
renderLanding();
