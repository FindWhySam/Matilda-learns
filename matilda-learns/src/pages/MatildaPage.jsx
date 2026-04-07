import { useState, useEffect, useRef } from "react";
import {
  SUBJECTS, TERM_LABEL, TERM_NEXT, TERM_TOPICS, TERM_CONTENT,
  PROMOTE_NEEDED, PROMOTE_PCT, TODAY, norm,
  topicItems, checkPromotion, termProgressCount, nextTopicFor, weakestSubject,
  callClaude, S, CSS,
} from "../config";
import { persist, hydrate, clearAll, getQuestionHistory, saveQuestions } from "../storage";

export default function MatildaPage() {
  const [screen, setScreen]           = useState("loading");
  const [loading, setLoading]         = useState(false);
  const [loadingMsg, setLoadingMsg]   = useState("");

  const [diagQs, setDiagQs]           = useState([]);
  const [diagIdx, setDiagIdx]         = useState(0);
  const diagRef                       = useRef([]);

  const [termLevels, setTermLevels]   = useState({ maths:"T1Y3", english:"T1Y3", science:"T1Y3", gk:"T1Y3" });
  const [path, setPath]               = useState([]);
  const [diagResults, setDiagResults] = useState(null);
  const [lastMixDate, setLastMixDate] = useState(null);

  const [luSubject, setLuSubject]     = useState(null);
  const [luOldTerm, setLuOldTerm]     = useState(null);
  const [luNewTerm, setLuNewTerm]     = useState(null);

  const [lesson, setLesson]           = useState(null);
  const [activeQs, setActiveQs]       = useState([]);
  const [activeIdx, setActiveIdx]     = useState(0);
  const [isMixMode, setIsMixMode]     = useState(false);
  const [streak, setStreak]           = useState(0);
  const [quickMode, setQuickMode]     = useState(false);
  const sessionRef                    = useRef([]);

  const [typed, setTyped]             = useState("");
  const [selected, setSelected]       = useState(null);
  const [isCorrect, setIsCorrect]     = useState(null);
  const [showExp, setShowExp]         = useState(false);
  const [autoAdv, setAutoAdv]         = useState(false);
  const [retrying, setRetrying]       = useState(false);
  const advTimer                      = useRef(null);

  useEffect(() => {
    hydrate().then((saved) => {
      if (saved?.termLevels && saved?.path) {
        setTermLevels(saved.termLevels); setPath(saved.path);
        if (saved.diagResults)  setDiagResults(saved.diagResults);
        if (saved.lastMixDate)  setLastMixDate(saved.lastMixDate);
        setScreen("path");
      } else setScreen("welcome");
    });
    return () => clearTimeout(advTimer.current);
  }, []);

  const resetQ = (keepRetrying = false) => {
    clearTimeout(advTimer.current);
    setTyped(""); setSelected(null); setIsCorrect(null); setShowExp(false); setAutoAdv(false);
    if (!keepRetrying) setRetrying(false);
  };

  const saveAll = (tl, p, dr, lmd) => persist({ termLevels:tl, path:p, diagResults:dr, lastMixDate:lmd });

  // ── Diagnostic ─────────────────────────────────────────

  const startDiag = async () => {
    setLoading(true); setLoadingMsg("Setting up your quiz, Matilda... ✏️");
    diagRef.current = [];

    const allHistory = (await Promise.all(Object.keys(SUBJECTS).map(s => getQuestionHistory(s)))).flat().slice(-40);
    const avoidBlock = allHistory.length
      ? `\nAvoid repeating these previously asked questions:\n${allHistory.map(q => `- ${q}`).join("\n")}\n`
      : "";

    try {
      const qs = await callClaude(`Generate exactly 12 adaptive diagnostic questions for Matilda, a bright Year 3 Australian student aged 7-8 who just finished Term 1.

3 questions per subject ordered maths english science gk. Within each subject: easy=Term1Y3, medium=Term2Y3, hard=Term3Y3.

Australian Curriculum:
MATHS: T1Y3=3-digit numbers +/-to1000 ×2×5×10 halves/quarters telling time | T2Y3=×3×4×6 division thirds/eighths area/perimeter | T3Y3=4-digit numbers multi-digit multiplication graphs patterns
ENGLISH: T1Y3=nouns/verbs/adjectives conjunctions basic punctuation Year3 spelling | T2Y3=adverbs/pronouns compound sentences apostrophes speech marks | T3Y3=complex sentences similes/metaphors narrative writing synonyms/antonyms
SCIENCE: T1Y3=living/non-living habitats weather | T2Y3=forces materials/change light/shadows | T3Y3=life cycles ecosystems sound/energy
GK: T1Y3=Australian states/territories animals symbols | T2Y3=world countries continents landmarks | T3Y3=Australian history world history famous scientists
${avoidBlock}
Rules:
- Include "term_level" field: "T1Y3" "T2Y3" or "T3Y3"
- maths: typed for arithmetic (answer is a number), multiple_choice for concepts
- english: typed for single-word spelling ONLY, multiple_choice for grammar
- science & gk: all multiple_choice
- multiple_choice: exactly 4 options, answer matches one option exactly
- typed: exact correct value
- explanations: clear and conceptual, explain the idea not just the answer, 1-2 sentences

Return ONLY this JSON:
[{"subject":"maths","difficulty":"easy","term_level":"T1Y3","question":"What is 45 + 37?","type":"typed","answer":"82","explanation":"To add these numbers, first add the tens (40+30=70) then the ones (5+7=12), giving 70+12=82."}]`);

      await Promise.all(Object.keys(SUBJECTS).map(s => {
        const subQs = qs.filter(q => q.subject === s);
        return subQs.length ? saveQuestions(s, subQs) : Promise.resolve();
      }));

      setDiagQs(qs); setDiagIdx(0); resetQ(); setScreen("diagnostic");
    } catch(e) { console.error(e); alert("Couldn't load quiz — try again!"); }
    setLoading(false);
  };

  const submitDiagAnswer = (answer) => {
    const q = diagQs[diagIdx];
    const ok = norm(answer) === norm(q.answer);
    setSelected(answer); setIsCorrect(ok); setShowExp(true);
    if (!retrying) {
      diagRef.current = [...diagRef.current, { subject:q.subject, term_level:q.term_level, difficulty:q.difficulty, correct:ok, question:q.question, answer:q.answer, userAnswer:answer, explanation:q.explanation }];
    }
    if (ok) { setAutoAdv(true); advTimer.current = setTimeout(nextDiag, 1800); }
  };

  const nextDiag = () => {
    if (diagIdx + 1 >= diagQs.length) {
      const all = diagRef.current;
      const tl  = {};
      Object.keys(SUBJECTS).forEach(s => {
        const c = all.filter(x => x.subject===s && x.correct).length;
        tl[s] = c>=3 ? "T3Y3" : c>=2 ? "T2Y3" : "T1Y3";
      });
      const p  = Object.keys(SUBJECTS).flatMap(sub => topicItems(sub, tl[sub]));
      const dr = { answers:all, termLevels:tl };
      setTermLevels(tl); setPath(p); setDiagResults(dr);
      saveAll(tl, p, dr, null);
      setScreen("diag-results");
    } else {
      setDiagIdx(i => i+1);
    }
    resetQ();
  };

  const tryAgain = () => { setRetrying(true); resetQ(true); };

  // ── Today's Mix ────────────────────────────────────────

  const startMix = async (tl, p) => {
    const useTL = tl || termLevels;
    const useP  = p  || path;
    setLoading(true); setLoadingMsg("Building today's mix... 🎲");
    sessionRef.current = [];
    const topicPicks = Object.keys(SUBJECTS).map(sub => {
      return nextTopicFor(sub, useTL[sub], useP)
        || useP.find(x => x.subject===sub && x.termLevel===useTL[sub])
        || { subject:sub, topic:TERM_TOPICS[useTL[sub]]?.[sub]?.[0], termLevel:useTL[sub] };
    });
    try {
      const histories = await Promise.all(Object.keys(SUBJECTS).map(s => getQuestionHistory(s)));
      const histMap   = Object.fromEntries(Object.keys(SUBJECTS).map((s,i) => [s, histories[i]]));

      const subBlocks = topicPicks.map(item => {
        const content  = TERM_CONTENT[item.termLevel]?.[item.subject] || "";
        const typeRule =
          item.subject==="maths"   ? "typed for arithmetic (answer is a number), multiple_choice for concepts" :
          item.subject==="english" ? "typed for single-word spelling ONLY, multiple_choice for everything else" :
                                     "all multiple_choice";
        const history  = (histMap[item.subject] || []).slice(-20);
        const avoidStr = history.length ? ` AVOID:${history.join("|")}` : "";
        return `SUBJECT:${item.subject} TOPIC:"${item.topic}" LEVEL:${TERM_LABEL[item.termLevel]} CONTENT:${content} TYPES:${typeRule}${avoidStr}`;
      }).join("\n");

      const qs = await callClaude(`Generate exactly 8 quiz questions for Matilda, Year 3 Australian student aged 7-8. Bright with ADHD — engaging, VARIED, never repeat facts or examples she has seen before.

Generate EXACTLY 2 questions per subject in this order: maths, english, science, gk.
Include "subject" field in every question. First question per subject: easy. Second: medium/harder.

${subBlocks}

Rules:
- Include "subject" field matching exactly: maths english science gk
- multiple_choice: exactly 4 options, answer matches one option exactly
- typed: exact correct value
- Include "difficulty" field: "easy" or "medium"
- explanations: clear and conceptual, explain the idea not just the answer, 1-2 sentences
- Use completely fresh examples — never reuse landmarks, animals, people or numbers from AVOID lists

Return ONLY this JSON:
[{"subject":"maths","question":"...","type":"typed","answer":"30","difficulty":"easy","explanation":"..."}]`);

      await Promise.all(Object.keys(SUBJECTS).map(s => {
        const subQs = qs.filter(q => q.subject === s);
        return subQs.length ? saveQuestions(s, subQs) : Promise.resolve();
      }));

      setActiveQs(qs); setActiveIdx(0);
      setIsMixMode(true); setStreak(0); resetQ();
      setScreen("lesson");
    } catch(e) { console.error(e); alert("Couldn't load mix — try again!"); }
    setLoading(false);
  };

  // ── Single topic lesson ────────────────────────────────

  const startLesson = async (item, quick=false) => {
    setLesson(item); setQuickMode(quick); setIsMixMode(false);
    setLoading(true); setLoadingMsg(`Loading ${item.topic}... 📚`);
    sessionRef.current = [];
    const count    = quick ? 3 : 6;
    const subLabel = SUBJECTS[item.subject].label;
    const content  = TERM_CONTENT[item.termLevel]?.[item.subject] || "";
    const typeRule =
      item.subject==="maths"   ? "typed for arithmetic (answer is a number), multiple_choice for word problems and concepts" :
      item.subject==="english" ? "typed for single-word spelling ONLY, multiple_choice for everything else" :
                                 "all multiple_choice";
    const history    = await getQuestionHistory(item.subject);
    const avoidBlock = history.length
      ? `\nAvoid repeating these previously asked questions (use completely different examples, numbers, animals, people or facts):\n${history.slice(-30).map(q => `- ${q}`).join("\n")}\n`
      : "";
    try {
      const qs = await callClaude(`Generate exactly ${count} questions about "${item.topic}" in ${subLabel} for Matilda, Year 3 Australian student aged 7-8. Bright with ADHD — engaging, varied, never repetitive.

Level: ${TERM_LABEL[item.termLevel]}
Content: ${content}
${avoidBlock}
Start with 1 confidence-building question then push progressively harder. Include "difficulty": "easy" "medium" or "hard".
${typeRule}
- multiple_choice: exactly 4 options, answer matches one option exactly
- typed: exact correct value
- explanations: clear and conceptual, explain the idea not just the answer, 1-2 sentences

Return ONLY this JSON:
[{"question":"...","type":"multiple_choice","options":["A","B","C","D"],"answer":"B","difficulty":"easy","explanation":"..."}]`);

      await saveQuestions(item.subject, qs);
      setActiveQs(qs); setActiveIdx(0); setStreak(0); resetQ(); setScreen("lesson");
    } catch(e) { console.error(e); alert("Couldn't load lesson — try again!"); }
    setLoading(false);
  };

  // ── Answer / advance ───────────────────────────────────

  const submitAnswer = (answer) => {
    const q  = activeQs[activeIdx];
    const ok = norm(answer) === norm(q.answer);
    setSelected(answer); setIsCorrect(ok); setShowExp(true);
    if (!retrying) {
      sessionRef.current = [...sessionRef.current, { correct:ok, subject:q.subject||lesson?.subject }];
    }
    if (ok) { setStreak(s => s+1); setAutoAdv(true); advTimer.current = setTimeout(nextQ, 1800); }
    else setStreak(0);
  };

  const nextQ = () => {
    const isLast = activeIdx + 1 >= activeQs.length;
    if (isLast) { if (isMixMode) finishMix(); else finishLesson(); }
    else setActiveIdx(i => i+1);
    resetQ();
  };

  const finishMix = () => {
    const today = TODAY();
    setLastMixDate(today);
    saveAll(termLevels, path, diagResults, today);
    setScreen("mix-complete");
  };

  const finishLesson = () => {
    const all   = sessionRef.current;
    const score = all.filter(x => x.correct).length / all.length;
    const updatedPath = path.map(item => item.id===lesson.id ? { ...item, completed:true, score } : item);
    const shouldPromote = checkPromotion(lesson.subject, lesson.termLevel, updatedPath);
    const nextTerm      = TERM_NEXT[lesson.termLevel];
    if (shouldPromote && nextTerm) {
      const newItems  = topicItems(lesson.subject, nextTerm);
      const finalPath = [...updatedPath, ...newItems];
      const newTL     = { ...termLevels, [lesson.subject]:nextTerm };
      setPath(finalPath); setTermLevels(newTL);
      saveAll(newTL, finalPath, diagResults, lastMixDate);
      setLuSubject(lesson.subject); setLuOldTerm(lesson.termLevel); setLuNewTerm(nextTerm);
      setScreen("level-up");
    } else {
      setPath(updatedPath);
      saveAll(termLevels, updatedPath, diagResults, lastMixDate);
      setScreen("lesson-complete");
    }
  };

  const resetAll = () => { clearAll(); setTermLevels({ maths:"T1Y3", english:"T1Y3", science:"T1Y3", gk:"T1Y3" }); setPath([]); setDiagResults(null); setLastMixDate(null); diagRef.current=[]; setScreen("welcome"); };

  // ── Mix progress bar ───────────────────────────────────

  const MixProgress = () => {
    const subOrder = ["maths","english","science","gk"];
    const current  = activeQs[activeIdx]?.subject;
    return (
      <div style={{ display:"flex", padding:"8px 16px", gap:6, background:"white", borderBottom:"1px solid #F3F4F6" }}>
        {subOrder.map(s => {
          const sub  = SUBJECTS[s];
          const qs   = activeQs.filter(q => q.subject===s);
          const done = sessionRef.current.filter(x => x.subject===s).length;
          const isCurrent = s===current;
          return (
            <div key={s} style={{ flex:1 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                <span style={{ fontSize:10, fontWeight:isCurrent?700:500, color:isCurrent?sub.color:"#9CA3AF" }}>{sub.emoji}</span>
                <span style={{ fontSize:9, color:"#9CA3AF" }}>{done}/{qs.length}</span>
              </div>
              <div style={{ height:4, background:"#E5E7EB", borderRadius:2 }}>
                <div style={{ height:"100%", background:sub.color, width:`${(done/qs.length)*100}%`, borderRadius:2, transition:"width 0.3s", opacity:isCurrent?1:0.5 }} />
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // ── Question card ──────────────────────────────────────

  const QuestionCard = ({ q, onSubmit, onTryAgain, isLast, color }) => {
    const diff = ({
      easy:  {label:"✅ Warm-up",   bg:"#DCFCE7",col:"#16A34A"},
      medium:{label:"⚡ Medium",    bg:"#FEF9C3",col:"#CA8A04"},
      hard:  {label:"🔥 Challenge", bg:"#FEE2E2",col:"#DC2626"},
    })[q.difficulty] || {label:"⚡ Medium",bg:"#FEF9C3",col:"#CA8A04"};

    return (
      <div style={S.card}>
        <span style={{...S.badge, background:diff.bg, color:diff.col}}>{diff.label}</span>
        <p style={S.qText}>{q.question}</p>
        {!showExp ? (
          q.type==="multiple_choice" ? (
            <div style={S.optGrid}>
              {(q.options||[]).map((opt,i) => (
                <button key={i} onClick={() => onSubmit(opt)}
                  style={{...S.optBtn, borderColor:selected===opt?color:"#E5E7EB", background:selected===opt?color+"18":"#F9FAFB"}}>
                  <span style={S.optLetter}>{["A","B","C","D"][i]}</span>
                  <span style={S.optText}>{opt}</span>
                </button>
              ))}
            </div>
          ) : (
            <div style={S.typedWrap}>
              <input style={S.input} value={typed} autoFocus
                onChange={e => setTyped(e.target.value)}
                onKeyDown={e => e.key==="Enter" && typed.trim() && onSubmit(typed)}
                placeholder="Type your answer…" />
              <button style={{...S.btn, background:typed.trim()?color:"#D1D5DB"}}
                disabled={!typed.trim()} onClick={() => onSubmit(typed)}>Check ✓</button>
            </div>
          )
        ) : (
          <div style={{background:isCorrect?"#F0FDF4":"#FEF2F2", border:`1px solid ${isCorrect?"#86EFAC":"#FECACA"}`, borderRadius:12, padding:16}}>
            {isCorrect ? (
              <>
                <p style={{fontWeight:700, fontSize:15, color:"#16A34A", marginBottom:6}}>
                  {retrying ? "✅ Got it!" : streak>=3 ? `🔥 ${streak} in a row!` : "✅ Correct!"}
                </p>
                <p style={S.expText}>{q.explanation}</p>
                <p style={{fontSize:12,color:"#9CA3AF",textAlign:"center",margin:0}}>{autoAdv?"Moving on…":""}</p>
              </>
            ) : (
              <>
                <p style={{fontWeight:700, fontSize:15, color:"#DC2626", marginBottom:8}}>
                  Not quite — the answer is <span style={{background:"#FEE2E2",padding:"1px 6px",borderRadius:6}}>{q.answer}</span>
                </p>
                <div style={{background:"white",borderRadius:8,padding:"10px 12px",marginBottom:12,border:"1px solid #FECACA"}}>
                  <p style={{margin:"0 0 4px",fontSize:11,fontWeight:700,color:"#9CA3AF",textTransform:"uppercase",letterSpacing:"0.04em"}}>What to remember</p>
                  <p style={{margin:0,fontSize:14,color:"#374151",lineHeight:1.6}}>{q.explanation}</p>
                </div>
                <button style={{...S.btn,background:"#DC2626"}} onClick={onTryAgain}>Try again →</button>
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  // ── Screens ────────────────────────────────────────────

  if (screen==="loading"||loading) return (
    <div style={S.center}><style>{CSS}</style>
      <div style={S.spinner}/>
      <p style={{color:"#6B7280",marginTop:14,fontSize:15}}>{loadingMsg||"Loading…"}</p>
    </div>
  );

  if (screen==="welcome") return (
    <div style={S.center}><style>{CSS}</style>
      <div style={{...S.card,textAlign:"center",maxWidth:340,animation:"fadeUp 0.4s ease"}}>
        <p style={{fontSize:52,margin:"0 0 4px",animation:"pop 0.5s ease"}}>🌟</p>
        <h1 style={S.h1}>Hi Matilda!</h1>
        <p style={{fontSize:14,color:"#9CA3AF",lineHeight:1.6,margin:"8px 0 24px"}}>Quick 12-question quiz first — I'll use your answers to build your personal learning path!</p>
        <button style={{...S.btn,background:"#3B82F6",fontSize:16}} onClick={startDiag}>Let's go! →</button>
      </div>
    </div>
  );

  if (screen==="diagnostic") {
    const q=diagQs[diagIdx]; const sub=SUBJECTS[q.subject];
    return (
      <div style={S.page}><style>{CSS}</style>
        <div style={{...S.bar,background:sub.color}}>
          <span style={{fontWeight:700,fontSize:14}}>{sub.emoji} {sub.label}</span>
          <span style={{fontSize:13,opacity:0.8}}>{diagIdx+1}/{diagQs.length}</span>
        </div>
        <div style={S.track}><div style={{...S.fill,width:`${(diagIdx/diagQs.length)*100}%`,background:sub.color}}/></div>
        <div key={diagIdx} style={{animation:"fadeUp 0.25s ease"}}>
          <QuestionCard q={q} color={sub.color} onSubmit={submitDiagAnswer} onTryAgain={tryAgain} isLast={diagIdx+1>=diagQs.length}/>
        </div>
      </div>
    );
  }

  if (screen==="diag-results") {
    const all    = diagRef.current;
    const total  = all.filter(x => x.correct).length;
    const subs   = Object.keys(SUBJECTS).map(k => ({ k, sub:SUBJECTS[k], correct:all.filter(x=>x.subject===k&&x.correct).length })).sort((a,b)=>b.correct-a.correct);
    const top    = subs[0];
    const headline = total>=9?"Wow, you're amazing!":total>=6?"You know SO much!":"Great start, Matilda!";
    return (
      <div style={S.center}><style>{CSS}</style>
        <div style={{...S.card,textAlign:"center",maxWidth:360,animation:"fadeUp 0.4s ease"}}>
          <p style={{fontSize:56,margin:"0 0 4px",animation:"star 1.2s ease infinite"}}>⭐</p>
          <h1 style={{...S.h1,fontSize:24}}>{headline}</h1>
          <p style={{fontSize:15,color:"#6B7280",margin:"4px 0 16px"}}>You got <strong style={{color:"#111827"}}>{total} out of 12</strong> right!</p>
          <div style={{background:top.sub.light,border:`2px solid ${top.sub.color}50`,borderRadius:14,padding:"12px 16px",marginBottom:12}}>
            <p style={{margin:0,fontSize:16,fontWeight:800,color:top.sub.color}}>{top.sub.emoji} You're a {top.sub.label} star!</p>
            <p style={{margin:"4px 0 0",fontSize:13,color:"#6B7280"}}>{top.correct===3?"You nailed all 3 questions — even the hard ones!":`You got ${top.correct} out of 3 questions!`}</p>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:18}}>
            {subs.slice(1).map(({k,sub,correct}) => (
              <div key={k} style={{background:sub.light,borderRadius:10,padding:"8px 10px",border:`1px solid ${sub.color}30`}}>
                <p style={{margin:0,fontSize:13,fontWeight:700,color:sub.color}}>{sub.emoji} {sub.label}</p>
                <p style={{margin:"2px 0 0",fontSize:11,color:"#6B7280"}}>{correct===3?"Perfect! 🌟":correct===2?"Really good! 👍":correct===1?"Good try! 💪":"Let's practise! 📚"}</p>
              </div>
            ))}
          </div>
          <p style={{fontSize:13,color:"#9CA3AF",margin:"0 0 18px",lineHeight:1.5}}>I've set up your learning path — let's keep going!</p>
          <button style={{...S.btn,background:"#3B82F6",fontSize:15,marginBottom:10}} onClick={() => setScreen("path")}>Let's learn! 🚀</button>
          <button style={{background:"none",border:"1px solid #E5E7EB",borderRadius:10,padding:"9px 16px",fontSize:12,color:"#9CA3AF",cursor:"pointer",width:"100%",fontFamily:"inherit"}}
            onClick={() => setScreen("path")}>Results for Mum 👩</button>
        </div>
      </div>
    );
  }

  if (screen==="path") {
    const mixDoneToday = lastMixDate === TODAY();
    const ws    = weakestSubject(termLevels, path);
    const wsSub = SUBJECTS[ws];
    const wsNext = nextTopicFor(ws, termLevels[ws], path);
    return (
      <div style={S.page}><style>{CSS}</style>
        <div style={{background:"white",borderBottom:"1px solid #F3F4F6",position:"sticky",top:0,zIndex:10,padding:"12px 16px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <h1 style={{...S.h1,textAlign:"left",fontSize:18,margin:0}}>Hi Matilda! 👋</h1>
            <button onClick={resetAll} style={{fontSize:10,color:"#E5E7EB",background:"none",border:"none",cursor:"pointer"}}>Reset</button>
          </div>
        </div>

        <div style={{padding:"12px 14px 48px"}}>
          {!mixDoneToday ? (
            <button onClick={() => startMix()} style={{width:"100%",background:"linear-gradient(135deg,#3B82F6,#8B5CF6)",border:"none",borderRadius:14,padding:"16px",marginBottom:14,cursor:"pointer",fontFamily:"inherit",animation:"pulse 2s ease infinite"}}>
              <p style={{margin:0,fontSize:18,fontWeight:800,color:"white"}}>🎲 Today's Mix</p>
              <p style={{margin:"4px 0 0",fontSize:12,color:"rgba(255,255,255,0.85)"}}>2 questions from every subject · ~8 mins · covers everything!</p>
            </button>
          ) : wsNext ? (
            <div style={{background:wsSub.light,border:`2px solid ${wsSub.color}60`,borderRadius:14,padding:"12px 14px",marginBottom:14,display:"flex",alignItems:"center",gap:12}}>
              <span style={{fontSize:28}}>{wsSub.emoji}</span>
              <div style={{flex:1}}>
                <p style={{margin:0,fontSize:13,fontWeight:700,color:wsSub.color}}>Suggested next</p>
                <p style={{margin:"2px 0 0",fontSize:12,color:"#374151",fontWeight:600}}>{wsNext.topic}</p>
                <p style={{margin:"1px 0 0",fontSize:10,color:"#9CA3AF"}}>{wsSub.label} · {TERM_LABEL[wsNext.termLevel]}</p>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                <button onClick={() => startLesson(wsNext,true)} style={{...S.topicBtn,background:"white",color:wsSub.color,border:`2px solid ${wsSub.color}`}}>⚡ Quick 3</button>
                <button onClick={() => startLesson(wsNext,false)} style={{...S.topicBtn,background:wsSub.color,color:"white",border:"none"}}>Start 6 →</button>
              </div>
            </div>
          ) : null}

          {Object.entries(SUBJECTS).map(([subKey,sub]) => {
            const currentTerm = termLevels[subKey]||"T1Y3";
            const nextTerm    = TERM_NEXT[currentTerm];
            const subTopics   = path.filter(x => x.subject===subKey&&x.termLevel===currentTerm);
            const prog        = termProgressCount(subKey,currentTerm,path);
            const canPromote  = prog>=PROMOTE_NEEDED;
            return (
              <div key={subKey} style={{marginBottom:18}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <span style={{fontSize:15}}>{sub.emoji}</span>
                    <span style={{fontWeight:700,fontSize:13,color:"#111827"}}>{sub.label}</span>
                    <span style={{background:sub.light,color:sub.color,borderRadius:12,padding:"2px 8px",fontSize:10,fontWeight:700}}>{TERM_LABEL[currentTerm]}</span>
                  </div>
                  {nextTerm&&<span style={{fontSize:10,color:canPromote?"#10B981":"#9CA3AF",fontWeight:canPromote?700:400}}>{canPromote?"🚀 Ready!":`${prog}/${PROMOTE_NEEDED} → ${TERM_LABEL[nextTerm].split(" · ")[1]}`}</span>}
                </div>
                {nextTerm&&<div style={{height:3,background:"#E5E7EB",borderRadius:2,marginBottom:6}}><div style={{height:"100%",background:canPromote?"#10B981":sub.color,width:`${(prog/PROMOTE_NEEDED)*100}%`,borderRadius:2,transition:"width 0.4s"}}/></div>}
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  {subTopics.map(item => (
                    <div key={item.id} style={{background:item.completed?sub.light:"white",border:`1.5px solid ${item.completed?sub.color+"55":"#E5E7EB"}`,borderRadius:12,padding:"10px 12px",display:"flex",alignItems:"center",gap:10}}>
                      <div style={{flex:1,minWidth:0}}>
                        <p style={{margin:0,fontWeight:600,fontSize:13,color:"#111827",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{item.topic}</p>
                        {item.completed&&<p style={{margin:"2px 0 0",fontSize:10,color:sub.color,fontWeight:600}}>⭐ {Math.round(item.score*100)}% complete</p>}
                      </div>
                      <div style={{display:"flex",gap:6,flexShrink:0}}>
                        <button onClick={() => startLesson(item,true)} style={{...S.topicBtn,background:"white",color:sub.color,border:`2px solid ${sub.color}`}}>⚡ Quick 3</button>
                        <button onClick={() => startLesson(item,false)} style={{...S.topicBtn,background:sub.color,color:"white",border:"none"}}>{item.completed?"Retry ↺":"Start 6 →"}</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (screen==="lesson") {
    const q   = activeQs[activeIdx];
    const sub = SUBJECTS[q?.subject||lesson?.subject||"maths"];
    const total = activeQs.length;
    return (
      <div style={S.page}><style>{CSS}</style>
        <div style={{...S.bar,background:isMixMode?"#1E293B":sub.color}}>
          <button onClick={() => setScreen("path")} style={{background:"none",border:"none",color:"white",fontWeight:700,cursor:"pointer",fontSize:14,padding:0}}>← Back</button>
          <div style={{display:"flex",flexDirection:"column",alignItems:"center"}}>
            <span style={{fontWeight:700,fontSize:12}}>{isMixMode?"🎲 Today's Mix":lesson?.topic}</span>
            {!isMixMode&&<span style={{fontSize:10,opacity:0.7}}>{TERM_LABEL[lesson?.termLevel]}</span>}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:5}}>
            {streak>=3&&<span style={{fontSize:14,animation:"shine 1s ease infinite"}}>🔥{streak}</span>}
            {quickMode&&!isMixMode&&<span style={{background:"rgba(255,255,255,0.25)",borderRadius:8,padding:"1px 6px",fontSize:10,fontWeight:700}}>⚡</span>}
            <span style={{fontSize:13,opacity:0.8}}>{activeIdx+1}/{total}</span>
          </div>
        </div>
        {isMixMode
          ? <MixProgress/>
          : <div style={S.track}><div style={{...S.fill,width:`${(activeIdx/total)*100}%`,background:sub.color}}/></div>
        }
        <div key={activeIdx} style={{animation:"fadeUp 0.25s ease"}}>
          {isMixMode&&(
            <div style={{margin:"10px 14px 0",display:"flex",alignItems:"center",gap:6}}>
              <span style={{background:sub.light,color:sub.color,borderRadius:20,padding:"3px 10px",fontSize:11,fontWeight:700}}>{sub.emoji} {sub.label}</span>
            </div>
          )}
          <QuestionCard q={q} color={sub.color} onSubmit={submitAnswer} onTryAgain={tryAgain} isLast={activeIdx+1>=total}/>
        </div>
      </div>
    );
  }

  if (screen==="mix-complete") {
    const all   = sessionRef.current;
    const total = all.length;
    const score = all.filter(x=>x.correct).length;
    const pct   = Math.round((score/total)*100);
    const subScores = Object.keys(SUBJECTS).map(k => ({ k,sub:SUBJECTS[k],correct:all.filter(x=>x.subject===k&&x.correct).length,total:all.filter(x=>x.subject===k).length }));
    return (
      <div style={S.center}><style>{CSS}</style>
        <div style={{...S.card,textAlign:"center",maxWidth:360,animation:"fadeUp 0.35s ease"}}>
          <p style={{fontSize:52,margin:"0 0 2px",animation:"pop 0.45s ease"}}>{pct>=75?"🌟":pct>=50?"👍":"💪"}</p>
          <h1 style={S.h1}>{pct>=75?"Today's Mix — crushed it!":pct>=50?"Today's Mix — great effort!":"Today's Mix — keep going!"}</h1>
          <p style={{fontSize:13,color:"#6B7280",margin:"4px 0 16px"}}>{score} out of {total} correct</p>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:18}}>
            {subScores.map(({k,sub,correct,total:t}) => (
              <div key={k} style={{background:sub.light,borderRadius:10,padding:"8px 10px",border:`1px solid ${sub.color}30`}}>
                <p style={{margin:0,fontSize:13,fontWeight:700,color:sub.color}}>{sub.emoji} {sub.label}</p>
                <p style={{margin:"3px 0 0",fontSize:14,fontWeight:800,color:"#111827"}}>{correct}/{t}</p>
              </div>
            ))}
          </div>
          <button style={{...S.btn,background:"#3B82F6"}} onClick={() => setScreen("path")}>Back to path →</button>
        </div>
      </div>
    );
  }

  if (screen==="lesson-complete") {
    const all   = sessionRef.current;
    const score = all.filter(x=>x.correct).length;
    const total = all.length;
    const pct   = Math.round((score/total)*100);
    const sub   = SUBJECTS[lesson.subject];
    const next  = TERM_NEXT[lesson.termLevel];
    const prog  = termProgressCount(lesson.subject,lesson.termLevel,path);
    return (
      <div style={S.center}><style>{CSS}</style>
        <div style={{...S.card,textAlign:"center",maxWidth:340,animation:"fadeUp 0.35s ease"}}>
          <p style={{fontSize:52,margin:"0 0 2px",animation:"pop 0.45s ease"}}>{pct>=80?"🌟":pct>=60?"👍":"💪"}</p>
          <h1 style={S.h1}>{pct>=80?"Brilliant!":pct>=60?"Good work!":"Keep going!"}</h1>
          <p style={{fontSize:11,color:"#9CA3AF",margin:"0 0 12px"}}>{lesson.topic} · {TERM_LABEL[lesson.termLevel]}</p>
          <div style={{width:76,height:76,borderRadius:"50%",background:sub.color,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px",animation:"pop 0.5s ease 0.1s both"}}>
            <span style={{fontSize:20,fontWeight:800,color:"white"}}>{pct}%</span>
          </div>
          <p style={{fontSize:13,color:"#6B7280",margin:"0 0 4px"}}>{score} out of {total}</p>
          {next&&<p style={{fontSize:11,color:"#9CA3AF",margin:"0 0 16px"}}>{prog}/{PROMOTE_NEEDED} topics at 75%+ to reach {TERM_LABEL[next].split(" · ")[1]}</p>}
          <div style={{display:"flex",gap:8}}>
            <button style={{...S.btn,flex:1,background:"white",color:sub.color,border:`2px solid ${sub.color}`}} onClick={() => startLesson(lesson)}>Try again</button>
            <button style={{...S.btn,flex:1,background:sub.color}} onClick={() => setScreen("path")}>Back to path</button>
          </div>
        </div>
      </div>
    );
  }

  if (screen==="level-up") {
    const sub = SUBJECTS[luSubject];
    return (
      <div style={S.center}><style>{CSS}</style>
        <div style={{...S.card,textAlign:"center",maxWidth:340,animation:"fadeUp 0.4s ease"}}>
          <p style={{fontSize:60,margin:"0 0 4px",animation:"rocket 1s ease infinite"}}>🚀</p>
          <h1 style={{...S.h1,fontSize:26,color:sub.color}}>Level Up!</h1>
          <p style={{fontSize:14,color:"#6B7280",margin:"6px 0 4px"}}>You've mastered <strong>{TERM_LABEL[luOldTerm]}</strong> {sub.emoji} {sub.label}</p>
          <div style={{background:sub.light,border:`2px solid ${sub.color}50`,borderRadius:12,padding:"12px 16px",margin:"14px 0"}}>
            <p style={{margin:0,fontSize:13,fontWeight:700,color:sub.color}}>Now unlocked: {TERM_LABEL[luNewTerm]} 🎉</p>
            <p style={{margin:"4px 0 0",fontSize:12,color:"#6B7280"}}>New, harder topics added to your path.</p>
          </div>
          <button style={{...S.btn,background:sub.color}} onClick={() => setScreen("path")}>See new topics →</button>
        </div>
      </div>
    );
  }

  return null;
}
