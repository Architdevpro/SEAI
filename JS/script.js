/* JS/scripts.js — Upgraded logic and UI for TinyNumberBot */

(function(){
  // Elements
  const inputNumber = document.getElementById('inputNumber');
  const sendBtn = document.getElementById('sendBtn');
  const chatWindow = document.getElementById('chatWindow');
  const refsField = document.getElementById('refsField');
  const saveRefs = document.getElementById('saveRefs');
  const resetRefs = document.getElementById('resetRefs');
  const historyList = document.getElementById('historyList');
  const clearBtn = document.getElementById('clearBtn');
  const examplesBtn = document.getElementById('examplesBtn');
  const modeSelect = document.getElementById('modeSelect');
  const confSelect = document.getElementById('confSelect');
  const scaleInput = document.getElementById('scaleInput');
  const themeToggle = document.getElementById('themeToggle');
  const exportHistory = document.getElementById('exportHistory');
  const typing = document.getElementById('typing');

  // Defaults
  const DEFAULT_REFS = [0,1,20];
  const LETTERS = ['L','P','K','M','N','O'];

  // Storage helpers
  function saveSettings(obj){ localStorage.setItem('tnb_settings', JSON.stringify(obj)); }
  function loadSettings(){ try{ return JSON.parse(localStorage.getItem('tnb_settings')) || {}; }catch(e){return{}} }

  function saveHistory(arr){ localStorage.setItem('tnb_history', JSON.stringify(arr)); }
  function loadHistory(){ try{ return JSON.parse(localStorage.getItem('tnb_history')) || []; }catch(e){return[]} }

  // initialize
  function init(){
    const s = loadSettings();
    refsField.value = s.refs ? s.refs.join(',') : DEFAULT_REFS.join(',');
    modeSelect.value = s.mode || 'closest';
    confSelect.value = s.conf || 'ratio';
    scaleInput.value = s.scale || 10;
    renderHistory();
  }

  // parse refs
  function parseRefs(txt){ return txt.split(',').map(t=>t.trim()).filter(Boolean).map(Number).filter(n=>!Number.isNaN(n)); }

  // ID generator
  function generateDataVerifiedId(){
    function randNum(n){let s='';for(let i=0;i<n;i++) s+=String(Math.floor(Math.random()*10));return s}
    function randLetters(n){let s='';for(let i=0;i<n;i++) s+=LETTERS[Math.floor(Math.random()*LETTERS.length)];return s}
    return `${randNum(4)}-${randLetters(2)}-${randNum(4)}`;
  }

  // Confidence formulas
  function confidenceRatio(dmin, dsec){
    if(dsec === null) return 100;
    if(dmin === 0 && dsec === 0) return 50;
    const raw = 1 - (dmin / (dmin + dsec + Number.EPSILON));
    return Math.round(Math.max(0, Math.min(1, raw)) * 100);
  }

  function confidenceExp(dmin, scale){
    // decays with distance; closer -> near 100
    const raw = Math.exp(- (dmin / (scale || 1)));
    return Math.round(raw * 100);
  }

  // core computation
  function compute(value, refs, options){
    if(refs.length === 0) return { error: 'No reference numbers provided.' };
    const dists = refs.map(r => ({ref:r, dist: Math.abs(value - r)}));
    dists.sort((a,b)=>a.dist - b.dist);
    const best = dists[0];
    const second = dists[1] || null;

    // choose confidence
    let confidence = 100;
    if(options.conf === 'exp') confidence = confidenceExp(best.dist, options.scale);
    else confidence = confidenceRatio(best.dist, second ? second.dist : null);

    // More outputs depending on mode
    if(options.mode === 'closest'){
      return { closest: best.ref, distance: best.dist, confidence, dv: generateDataVerifiedId() };
    } else if(options.mode === 'rank'){
      return { rank: dists.map(d=>({v:d.ref,distance:d.dist})), confidence, dv: generateDataVerifiedId() };
    } else if(options.mode === 'range'){
      const min = Math.min(...refs); const max = Math.max(...refs);
      let region = `${min} → ${max}`;
      return { closest: best.ref, distance: best.dist, region, confidence, dv: generateDataVerifiedId() };
    }
  }

  // UI helpers
  function appendMessage(isUser, titleHtml, bodyHtml, metaHtml){
    const wrapper = document.createElement('div');
    wrapper.className = 'message ' + (isUser ? 'user' : 'assistant');

    const avatar = document.createElement('div'); avatar.className = 'avatar';
    avatar.textContent = isUser ? 'Y' : 'T';

    const card = document.createElement('div'); card.className = 'card';
    if(titleHtml) card.innerHTML = `<h3>${titleHtml}</h3>` + (bodyHtml||'');
    else card.innerHTML = bodyHtml || '';

    if(metaHtml){
      const details = document.createElement('div'); details.className = 'details';
      details.innerHTML = metaHtml;
      card.appendChild(details);
    }

    wrapper.appendChild(avatar);
    wrapper.appendChild(card);
    chatWindow.appendChild(wrapper);
    chatWindow.scrollTop = chatWindow.scrollHeight;
  }

  function renderHistory(){
    const h = loadHistory();
    historyList.innerHTML = '';
    h.slice().reverse().forEach(item => {
      const li = document.createElement('li');
      li.textContent = `${item.input} → ${item.output} (${item.confidence}%)`;
      historyList.appendChild(li);
    });
  }

  function addToHistory(entry){
    const h = loadHistory();
    h.push(entry); if(h.length>200) h.shift();
    saveHistory(h); renderHistory();
  }

  // copy helper
  function makeCopyButton(txt){
    const btn = document.createElement('button'); btn.className = 'copy-btn'; btn.textContent = 'Copy ID';
    btn.addEventListener('click', ()=>{
      navigator.clipboard?.writeText(txt).then(()=>{ btn.textContent='Copied!'; setTimeout(()=> btn.textContent='Copy ID',1200); }).catch(()=>{});
    });
    return btn;
  }

  // main flow
  function handleSend(){
    const raw = inputNumber.value.trim(); if(raw === '') return;
    appendMessage(true, null, `<p>${escapeHtml(raw)}</p>`);
    showTyping(true);
    inputNumber.value = '';

    setTimeout(()=>{
      showTyping(false);
      const value = Number(raw);
      if(Number.isNaN(value)){
        appendMessage(false, 'Error', `<p>Couldn't parse "${escapeHtml(raw)}" as a number.</p>`);
        return;
      }

      const refs = parseRefs(refsField.value);
      const opts = { mode: modeSelect.value, conf: confSelect.value, scale: Number(scaleInput.value) || 10 };
      const res = compute(value, refs, opts);
      if(res.error){ appendMessage(false, 'Error', `<p>${res.error}</p>`); return; }

      // build response UI
      if(opts.mode === 'rank'){
        const lines = res.rank.map(r=>`${r.v} (dist ${r.distance})`).join('<br/>');
        const title = `${escapeHtml(String(value))} — Ranked references`;
        const meta = `<span class="tag">Confidence: ${res.confidence}%</span><span class="tag">Data Verified: ${res.dv}</span>`;
        appendMessage(false, title, `<p>${lines}</p>`, meta);
        const last = `${value} => ranked`; addToHistory({input:value, output:'ranked', confidence:res.confidence, dv:res.dv, time:Date.now()});
      } else if(opts.mode === 'range'){
        const title = `${escapeHtml(String(value))} is closest to ${res.closest}`;
        const meta = `<span class="tag">Region: ${res.region}</span><span class="tag">Confidence: ${res.confidence}%</span><span class="tag">Data Verified: ${res.dv}</span>`;
        appendMessage(false, title, `<p>Closest distance: ${res.distance}</p>`, meta);
        addToHistory({input:value, output:res.closest, confidence:res.confidence, dv:res.dv, time:Date.now()});
      } else {
        const title = `${escapeHtml(String(value))} is closer to ${escapeHtml(String(res.closest))}!`;
        const meta = `<span class="tag">Confidence: ${res.confidence}%</span><span class="tag">Data Verified: ${res.dv}</span>`;
        appendMessage(false, title, `<p>Have a nice day ☺️</p>`, meta);
        addToHistory({input:value, output:res.closest, confidence:res.confidence, dv:res.dv, time:Date.now()});
      }

    }, 600 + Math.random()*400);
  }

  function escapeHtml(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/\'/g,"&#39;"); }

  function showTyping(show){ typing.style.display = show ? 'flex' : 'none'; }

  // UI events
  sendBtn.addEventListener('click', handleSend);
  inputNumber.addEventListener('keydown', (e)=>{ if(e.key === 'Enter') handleSend(); });
  examplesBtn.addEventListener('click', ()=>{ inputNumber.value='2'; handleSend(); setTimeout(()=>{ inputNumber.value='-30'; handleSend(); },700); });
  clearBtn.addEventListener('click', ()=>{ chatWindow.innerHTML = '<div class="system-note">Cleared. Try another number.</div>'; });

  saveRefs.addEventListener('click', ()=>{ const refs = parseRefs(refsField.value); if(refs.length===0) alert('Provide at least one reference number.'); else { const s = loadSettings(); s.refs = refs; saveSettings(s); alert('Saved refs'); } });
  resetRefs.addEventListener('click', ()=>{ refsField.value = DEFAULT_REFS.join(','); const s = loadSettings(); s.refs = DEFAULT_REFS; saveSettings(s); alert('Reset to defaults'); });

  modeSelect.addEventListener('change', ()=>{ const s = loadSettings(); s.mode = modeSelect.value; saveSettings(s); });
  confSelect.addEventListener('change', ()=>{ const s = loadSettings(); s.conf = confSelect.value; saveSettings(s); });
  scaleInput.addEventListener('change', ()=>{ const s = loadSettings(); s.scale = scaleInput.value; saveSettings(s); });

  themeToggle.addEventListener('click', ()=>{ document.body.classList.toggle('light'); });

  exportHistory.addEventListener('click', ()=>{
    const h = loadHistory(); if(h.length===0) return alert('No history');
    const lines = ['input,output,confidence,dv,time'];
    h.forEach(r=> lines.push(`${r.input},${r.output},${r.confidence},${r.dv},${new Date(r.time).toISOString()}`));
    const blob = new Blob([lines.join('\n')], {type:'text/csv'});
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'tiny-number-bot-history.csv'; a.click(); URL.revokeObjectURL(url);
  });

  // init
  init();
})();