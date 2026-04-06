export const SUBJECTS = {
  maths:   { label:"Maths",             emoji:"🔢", color:"#3B82F6", light:"#EFF6FF" },
  english: { label:"English",           emoji:"📖", color:"#8B5CF6", light:"#F5F3FF" },
  science: { label:"Science",           emoji:"🔬", color:"#10B981", light:"#ECFDF5" },
  gk:      { label:"General Knowledge", emoji:"🌏", color:"#F59E0B", light:"#FFFBEB" },
};

export const TERM_LABEL = {
  T1Y3:"Year 3 · Term 1", T2Y3:"Year 3 · Term 2",
  T3Y3:"Year 3 · Term 3", T4Y3:"Year 3 · Term 4", T1Y4:"Year 4 · Term 1",
};

export const TERM_NEXT = {
  T1Y3:"T2Y3", T2Y3:"T3Y3", T3Y3:"T4Y3", T4Y3:"T1Y4", T1Y4:null,
};

export const TERM_TOPICS = {
  T1Y3:{maths:["Times Tables ×2 ×5 ×10","Addition & Subtraction to 1000","Halves & Quarters","Telling the Time"],english:["Spelling Patterns","Nouns, Verbs & Adjectives","Punctuation Basics","Conjunctions & Sentences"],science:["Living & Non-Living Things","Animal Habitats","Weather & Seasons","Properties of Materials"],gk:["Australian States & Territories","Australian Animals","Australian Symbols & Flag","Australian Community"]},
  T2Y3:{maths:["Times Tables ×3 ×4 ×6","Introduction to Division","Thirds & Eighths","Area & Perimeter"],english:["Adverbs & Pronouns","Compound Sentences","Apostrophes & Speech Marks","Writing Paragraphs"],science:["Forces & Motion","Materials & Change","Light & Shadows","Simple Experiments"],gk:["World Countries & Capitals","Continents & Oceans","Famous World Landmarks","Cultural Diversity"]},
  T3Y3:{maths:["4-Digit Numbers & Place Value","Multi-Digit Multiplication","Data, Graphs & Tables","Symmetry & Patterns"],english:["Complex Sentences","Similes & Metaphors","Narrative Writing","Synonyms & Antonyms"],science:["Life Cycles","Food Chains & Ecosystems","Sound & Energy","Chemical Changes"],gk:["Australian History","World History Basics","Famous Scientists & Inventions","Environment & Conservation"]},
  T4Y3:{maths:["Multi-Step Word Problems","Patterns & Algebra Basics","Capacity & Volume","Angles & Geometry"],english:["Persuasive Writing","Poetry & Figurative Language","Editing & Improving Writing","Advanced Vocabulary"],science:["Earth & Space","Physical Sciences","The Scientific Method","Technology & Design"],gk:["Global Environmental Issues","Logic & Reasoning","Major World Events","Critical Thinking"]},
  T1Y4:{maths:["Numbers Beyond 10,000","All Times Tables Mastery","Equivalent Fractions","Introduction to Decimals"],english:["Complex Grammar & Clauses","Extended Writing","Literary Devices","Research & Note-Taking"],science:["Advanced Ecosystems","Forces, Energy & Electricity","Rocks, Minerals & Earth","Experimental Design"],gk:["World Geography & Maps","Significant Historical Events","Current Affairs Basics","Advanced Reasoning"]},
};

export const TERM_CONTENT = {
  T1Y3:{maths:"3-digit numbers, addition and subtraction to 1000, times tables ×2 ×5 ×10, halves and quarters, reading time on clocks, measuring length",english:"nouns verbs adjectives, conjunctions (because but so and), punctuation (full stops capitals question marks commas), spelling common Year 3 words",science:"living vs non-living things, animal habitats and adaptations, observable weather and seasons, basic properties of materials",gk:"Australian states and territories and capitals, well-known Australian animals, Australian flag and national anthem, community helpers"},
  T2Y3:{maths:"times tables ×3 ×4 ×6, introduction to division, fractions including thirds and eighths, area by counting squares, perimeter, 3D shapes",english:"adverbs, pronouns, compound sentences, apostrophes for contractions and possession, speech marks, writing structured paragraphs",science:"push and pull forces, how materials change when heated cooled or mixed, how light travels and creates shadows, fair test experiments",gk:"countries and capitals of major world nations, seven continents and five oceans, famous world landmarks, comparing cultures"},
  T3Y3:{maths:"4-digit numbers and place value, multi-digit multiplication strategies, reading and creating bar graphs and pictographs, lines of symmetry, number patterns",english:"complex sentences with subordinate clauses, similes and metaphors, writing narratives, synonyms antonyms prefixes suffixes",science:"life cycles of plants frogs butterflies, food chains producers consumers decomposers, how sound is made and travels, reversible and irreversible changes",gk:"key events in Australian history, major world historical events, famous scientists and their discoveries, biodiversity and conservation"},
  T4Y3:{maths:"multi-step word problems with mixed operations, patterns and rules in sequences, measuring capacity in litres and millilitres, right acute and obtuse angles",english:"persuasive texts with arguments and evidence, poetic devices including rhyme rhythm alliteration, editing writing for grammar spelling punctuation",science:"planets and order of the solar system, moon phases, forces energy and motion, scientific method steps, design and technology",gk:"global environmental and climate issues, major world events in the last century, logical puzzles and deductive reasoning"},
  T1Y4:{maths:"numbers beyond 10,000, rounding to nearest 10 100 1000, all times tables and related division, equivalent fractions, tenths and hundredths as decimals",english:"subordinate and relative clauses, passive voice, extended narratives and informational texts, literary devices, research skills and summarising",science:"complex food webs and ecosystem balance, electrical circuits, weathering erosion and deposition, variables and controlled experiments",gk:"detailed world geography using maps, significant historical events timelines, introductory current world affairs, advanced logical and analytical thinking"},
};

export const PROMOTE_NEEDED = 2;
export const PROMOTE_PCT    = 0.75;
export const TODAY          = () => new Date().toDateString();
export const norm           = (s) => String(s).toLowerCase().trim().replace(/[.,!?]$/, "");

export const topicItems = (subject, termLevel) =>
  (TERM_TOPICS[termLevel]?.[subject] || []).map((topic, i) => ({
    id:`${subject}-${termLevel}-${i}`, subject, topic, termLevel, completed:false, score:null,
  }));

export const checkPromotion = (subject, termLevel, updatedPath) => {
  const done = updatedPath.filter(x => x.subject===subject && x.termLevel===termLevel && x.completed);
  if (done.length < PROMOTE_NEEDED) return false;
  const last = done.slice(-PROMOTE_NEEDED);
  return (last.reduce((s,x) => s+x.score,0)/last.length) >= PROMOTE_PCT;
};

export const termProgressCount = (subject, termLevel, currentPath) =>
  Math.min(currentPath.filter(x => x.subject===subject && x.termLevel===termLevel && x.completed).length, PROMOTE_NEEDED);

export const nextTopicFor = (subject, termLevel, currentPath) =>
  currentPath.find(x => x.subject===subject && x.termLevel===termLevel && !x.completed);

export const weakestSubject = (termLevels, currentPath) => {
  const counts = Object.keys(SUBJECTS).map(s => ({
    s,
    count: currentPath.filter(x => x.subject===s && x.completed).length,
    avgScore: (() => {
      const done = currentPath.filter(x => x.subject===s && x.completed);
      return done.length ? done.reduce((a,x) => a+x.score,0)/done.length : 0;
    })(),
  }));
  counts.sort((a,b) => a.count!==b.count ? a.count-b.count : a.avgScore-b.avgScore);
  return counts[0].s;
};

export const callClaude = async (prompt) => {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method:"POST",
    headers:{
      "Content-Type":"application/json",
      "x-api-key": import.meta.env.VITE_ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body:JSON.stringify({
      model:"claude-sonnet-4-20250514", max_tokens:4000,
      system:"You are an expert Australian primary school teacher. Return only a valid JSON array — no markdown, no preamble, raw JSON only.",
      messages:[{ role:"user", content:prompt }],
    }),
  });
  const data = await res.json();
  return JSON.parse(data.content[0].text.replace(/```json\n?|```/g,"").trim());
};
export const S = {
  page:     {fontFamily:"'Segoe UI',system-ui,sans-serif",maxWidth:480,margin:"0 auto",minHeight:"100vh",background:"#F9FAFB"},
  center:   {fontFamily:"'Segoe UI',system-ui,sans-serif",display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",padding:16,background:"#F9FAFB"},
  card:     {background:"white",borderRadius:16,padding:20,margin:14,boxShadow:"0 1px 10px rgba(0,0,0,0.07)"},
  bar:      {color:"white",padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"},
  track:    {height:4,background:"#E5E7EB"},
  fill:     {height:"100%",transition:"width 0.3s ease",borderRadius:"0 2px 2px 0"},
  h1:       {fontSize:22,fontWeight:800,textAlign:"center",color:"#111827",margin:"8px 0 4px"},
  badge:    {display:"inline-block",borderRadius:20,padding:"3px 10px",fontSize:11,fontWeight:700,marginBottom:12},
  qText:    {fontSize:16,fontWeight:600,color:"#111827",lineHeight:1.5,marginBottom:16},
  optGrid:  {display:"grid",gridTemplateColumns:"1fr 1fr",gap:8},
  optBtn:   {display:"flex",alignItems:"center",gap:7,border:"1.5px solid #E5E7EB",borderRadius:10,padding:"10px 11px",cursor:"pointer",fontFamily:"inherit",textAlign:"left",background:"#F9FAFB"},
  optLetter:{fontWeight:700,fontSize:11,color:"#9CA3AF",flexShrink:0},
  optText:  {fontSize:13,fontWeight:500,color:"#111827"},
  typedWrap:{display:"flex",flexDirection:"column",gap:10},
  input:    {border:"1.5px solid #E5E7EB",borderRadius:10,padding:"12px 14px",fontSize:16,fontFamily:"inherit",outline:"none",width:"100%",boxSizing:"border-box"},
  expText:  {fontSize:13,color:"#555",lineHeight:1.6,marginBottom:12},
  btn:      {color:"white",border:"none",borderRadius:10,padding:"12px 16px",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit",width:"100%",display:"block"},
  topicBtn: {borderRadius:8,padding:"7px 12px",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap"},
  spinner:  {width:34,height:34,border:"3px solid #E5E7EB",borderTop:"3px solid #3B82F6",borderRadius:"50%",animation:"spin 0.7s linear infinite"},
  secTitle: {fontSize:12,fontWeight:700,color:"#374151",textTransform:"uppercase",letterSpacing:"0.05em",margin:"0 0 8px"},
};

export const CSS = `
  @keyframes spin   { to { transform:rotate(360deg) } }
  @keyframes fadeUp { from { opacity:0;transform:translateY(10px) } to { opacity:1;transform:translateY(0) } }
  @keyframes pop    { 0% { transform:scale(0.75);opacity:0 } 80% { transform:scale(1.06) } 100% { transform:scale(1);opacity:1 } }
  @keyframes rocket { 0%,100% { transform:translateY(0) } 50% { transform:translateY(-14px) } }
  @keyframes shine  { 0%,100% { opacity:1 } 50% { opacity:0.6 } }
  @keyframes star   { 0%,100% { transform:scale(1) } 50% { transform:scale(1.2) } }
  @keyframes pulse  { 0%,100% { box-shadow:0 0 0 0 rgba(59,130,246,0.4) } 70% { box-shadow:0 0 0 8px rgba(59,130,246,0) } }
`;
