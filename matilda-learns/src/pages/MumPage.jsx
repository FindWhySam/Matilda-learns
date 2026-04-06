import { SUBJECTS, TERM_LABEL, TERM_NEXT, termProgressCount, S, CSS } from "../config";
import { hydrate } from "../storage";

export default function MumPage() {
  const saved = hydrate();
  const termLevels = saved?.termLevels || {};
  const path       = saved?.path       || [];
  const diagResults = saved?.diagResults || null;
  const completed  = path.filter(x => x.completed);

  const pageStyle = {
    fontFamily:"'Segoe UI',system-ui,sans-serif",
    maxWidth:600, margin:"0 auto", minHeight:"100vh",
    background:"#F9FAFB", padding:"0 0 48px",
  };

  return (
    <div style={pageStyle}>
      <style>{CSS}</style>

      {/* Header */}
      <div style={{ background:"white", borderBottom:"1px solid #F3F4F6", padding:"16px 20px", marginBottom:16 }}>
        <h1 style={{ fontSize:20, fontWeight:800, color:"#111827", margin:0 }}>👩 Matilda's Progress</h1>
        <p style={{ fontSize:12, color:"#9CA3AF", margin:"4px 0 0" }}>
          {saved ? "Live data from Matilda's sessions" : "No data yet — Matilda hasn't started"}
        </p>
      </div>

      {!saved && (
        <div style={{ ...S.card, textAlign:"center" }}>
          <p style={{ fontSize:40, margin:"0 0 8px" }}>📭</p>
          <p style={{ fontSize:14, color:"#6B7280" }}>No sessions recorded yet. Come back after Matilda has done her first quiz!</p>
        </div>
      )}

      {saved && (
        <div style={{ padding:"0 16px" }}>

          {/* Current levels */}
          <p style={S.secTitle}>Current levels</p>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:24 }}>
            {Object.entries(SUBJECTS).map(([k, v]) => {
              const tl   = termLevels[k] || "T1Y3";
              const prog = termProgressCount(k, tl, path);
              const next = TERM_NEXT[tl];
              return (
                <div key={k} style={{ background:v.light, border:`1.5px solid ${v.color}40`, borderRadius:12, padding:"12px 14px" }}>
                  <p style={{ margin:0, fontWeight:700, fontSize:14, color:v.color }}>{v.emoji} {v.label}</p>
                  <p style={{ margin:"4px 0 0", fontSize:13, fontWeight:600, color:"#111827" }}>{TERM_LABEL[tl]}</p>
                  {next && (
                    <div style={{ marginTop:6 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                        <span style={{ fontSize:10, color:"#9CA3AF" }}>Toward {TERM_LABEL[next].split(" · ")[1]}</span>
                        <span style={{ fontSize:10, fontWeight:700, color:v.color }}>{prog}/2</span>
                      </div>
                      <div style={{ height:4, background:"#E5E7EB", borderRadius:2 }}>
                        <div style={{ height:"100%", background:v.color, width:`${(prog/2)*100}%`, borderRadius:2 }} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Diagnostic breakdown */}
          {diagResults?.answers && (
            <>
              <p style={S.secTitle}>Diagnostic breakdown — how levels were set</p>
              <div style={{ background:"white", borderRadius:12, padding:"12px 14px", border:"1px solid #E5E7EB", marginBottom:8 }}>
                <p style={{ fontSize:12, color:"#6B7280", margin:0, lineHeight:1.6 }}>
                  Each subject had 3 questions pitched at Term 1, Term 2, and Term 3 level.
                  Getting 3 correct placed her at Term 3 · 2 correct → Term 2 · 0–1 correct → Term 1.
                </p>
              </div>
              {Object.entries(SUBJECTS).map(([subKey, sub]) => {
                const subAnswers = diagResults.answers.filter(a => a.subject === subKey);
                const correct    = subAnswers.filter(a => a.correct).length;
                const placed     = diagResults.termLevels?.[subKey] || "T1Y3";
                return (
                  <div key={subKey} style={{ marginBottom:16 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                      <span style={{ fontWeight:700, fontSize:13, color:sub.color }}>{sub.emoji} {sub.label}</span>
                      <span style={{ fontSize:12, color:"#6B7280" }}>
                        {correct}/3 correct → placed at <strong>{TERM_LABEL[placed].split(" · ")[1]}</strong>
                      </span>
                    </div>
                    {subAnswers.map((a, i) => (
                      <div key={i} style={{ background:a.correct?"#F0FDF4":"#FEF2F2", border:`1px solid ${a.correct?"#BBF7D0":"#FECACA"}`, borderRadius:8, padding:"10px 12px", marginBottom:5 }}>
                        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                          <span style={{ fontSize:10, color:"#9CA3AF", textTransform:"capitalize" }}>
                            {TERM_LABEL[a.term_level]} · {a.difficulty}
                          </span>
                          <span style={{ fontSize:11, fontWeight:700, color:a.correct?"#16A34A":"#DC2626" }}>
                            {a.correct ? "✅ Correct" : "❌ Incorrect"}
                          </span>
                        </div>
                        <p style={{ margin:0, fontSize:13, color:"#374151", fontWeight:500 }}>{a.question}</p>
                        {!a.correct && (
                          <div style={{ marginTop:6, fontSize:12, color:"#6B7280" }}>
                            <span>Her answer: <span style={{ color:"#DC2626", fontWeight:600 }}>{a.userAnswer}</span></span>
                            <span style={{ margin:"0 8px" }}>·</span>
                            <span>Correct: <span style={{ color:"#16A34A", fontWeight:600 }}>{a.answer}</span></span>
                          </div>
                        )}
                        {a.explanation && (
                          <p style={{ margin:"6px 0 0", fontSize:11, color:"#6B7280", fontStyle:"italic", lineHeight:1.5 }}>{a.explanation}</p>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })}
            </>
          )}

          {/* Session history */}
          {completed.length > 0 && (
            <>
              <p style={{ ...S.secTitle, marginTop:8 }}>Session history ({completed.length} topics)</p>

              {/* Summary stats */}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:12 }}>
                {[
                  { label:"Topics done",  value: completed.length },
                  { label:"Avg score",    value: `${Math.round(completed.reduce((a,x)=>a+x.score,0)/completed.length*100)}%` },
                  { label:"80%+ topics",  value: completed.filter(x=>x.score>=0.8).length },
                ].map(stat => (
                  <div key={stat.label} style={{ background:"white", border:"1px solid #E5E7EB", borderRadius:10, padding:"10px 12px", textAlign:"center" }}>
                    <p style={{ margin:0, fontSize:20, fontWeight:800, color:"#111827" }}>{stat.value}</p>
                    <p style={{ margin:"2px 0 0", fontSize:10, color:"#9CA3AF" }}>{stat.label}</p>
                  </div>
                ))}
              </div>

              {/* Per-subject breakdown */}
              {Object.entries(SUBJECTS).map(([subKey, sub]) => {
                const subDone = completed.filter(x => x.subject === subKey);
                if (!subDone.length) return null;
                const avg = Math.round(subDone.reduce((a,x)=>a+x.score,0)/subDone.length*100);
                return (
                  <div key={subKey} style={{ marginBottom:12 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:5 }}>
                      <span style={{ fontWeight:700, fontSize:12, color:sub.color }}>{sub.emoji} {sub.label}</span>
                      <span style={{ fontSize:11, color:"#6B7280" }}>avg {avg}% across {subDone.length} topic{subDone.length>1?"s":""}</span>
                    </div>
                    {subDone.map(item => {
                      const pct = Math.round(item.score*100);
                      return (
                        <div key={item.id} style={{ background:"white", border:"1px solid #E5E7EB", borderRadius:8, padding:"8px 12px", marginBottom:4, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                          <div>
                            <p style={{ margin:0, fontSize:12, fontWeight:600, color:"#111827" }}>{item.topic}</p>
                            <p style={{ margin:"1px 0 0", fontSize:10, color:"#9CA3AF" }}>{TERM_LABEL[item.termLevel]}</p>
                          </div>
                          <div style={{ textAlign:"right" }}>
                            <p style={{ margin:0, fontSize:14, fontWeight:800, color:pct>=80?"#16A34A":pct>=60?"#CA8A04":"#DC2626" }}>
                              {pct}%
                            </p>
                            <p style={{ margin:0, fontSize:10, color:"#9CA3AF" }}>
                              {pct>=80?"⭐ Strong":pct>=60?"📈 Good":"🔄 Needs work"}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </>
          )}

          {completed.length === 0 && diagResults && (
            <div style={{ ...S.card, textAlign:"center" }}>
              <p style={{ fontSize:13, color:"#9CA3AF" }}>Diagnostic complete but no topic sessions yet. Come back after she's done some lessons!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
