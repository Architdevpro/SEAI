/* script.js - TinyNumberBot
   - Click Send or press Enter.
   - Computes closest reference number.
   - Confidence formula: conf = 100 * (1 - d_min / (d_min + d_second))
     * If only one reference => 100%
   - Generates Data Verified ID NNNN-XX-NNNN with letters from [L,P,K,M,N,O].
*/

(function(){
  const chatArea = document.getElementById('chatArea');
  const sendBtn = document.getElementById('sendBtn');
  const userInput = document.getElementById('userInput');
  const refsInput = document.getElementById('refs');
  const clearBtn = document.getElementById('clearBtn');
  const copyExampleBtn = document.getElementById('copyExampleBtn');

  function addMessage(text, who = 'assistant', extraHtml = '') {
    const row = document.createElement('div');
    row.className = 'message-row';
    const wrapper = document.createElement('div');
    wrapper.className = 'message ' + who;

    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.innerHTML = text + (extraHtml ? ('<div class="details">' + extraHtml + '</div>') : '');

    wrapper.appendChild(bubble);

    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.textContent = who === 'user' ? 'You' : 'TinyNumberBot';
    wrapper.appendChild(meta);

    row.appendChild(wrapper);
    chatArea.appendChild(row);
    chatArea.scrollTop = chatArea.scrollHeight;
  }

  function parseRefs(txt) {
    // parse comma-separated numbers; ignore invalid tokens
    return txt.split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0)
      .map(Number)
      .filter(n => !Number.isNaN(n));
  }

  function generateDataVerifiedId() {
    const letters = ['L','P','K','M','N','O'];
    function randNum(n){
      let s = '';
      for(let i=0;i<n;i++) s += String(Math.floor(Math.random()*10));
      return s;
    }
    function randLetters(n){
      let s = '';
      for(let i=0;i<n;i++) s += letters[Math.floor(Math.random()*letters.length)];
      return s;
    }
    return `${randNum(4)}-${randLetters(2)}-${randNum(4)}`;
  }

  function computeClosest(value, refs) {
    if(refs.length === 0) {
      return { error: 'No valid reference numbers provided.' };
    }
    // compute distances
    const dists = refs.map(r => ({ref: r, dist: Math.abs(value - r)}));
    dists.sort((a,b) => a.dist - b.dist);
    const best = dists[0];
    const second = dists[1] ? dists[1] : null;

    let confidence = 100;
    if(second) {
      const dmin = best.dist;
      const dsec = second.dist;
      // formula: conf = 100 * (1 - dmin / (dmin + dsec))
      // if both equal => 50%
      const confRaw = 1 - (dmin / (dmin + dsec + Number.EPSILON));
      confidence = Math.round(Math.max(0, Math.min(1, confRaw)) * 100);
    } else {
      confidence = 100;
    }

    return {
      closest: best.ref,
      distance: best.dist,
      confidence,
      bestIndex: refs.indexOf(best.ref)
    };
  }

  function handleSend() {
    const txt = userInput.value.trim();
    if(txt === '') return;
    addMessage(escapeHtml(txt), 'user');
    userInput.value = '';

    // parse number
    const value = Number(txt);
    if(Number.isNaN(value)) {
      addMessage(`I couldn't parse "${escapeHtml(txt)}" as a number. Please enter a numeric value.`,
        'assistant');
      return;
    }

    const refs = parseRefs(refsInput.value);
    if(refs.length === 0) {
      addMessage('Please provide at least one valid reference number (e.g. 0,1,20).', 'assistant');
      return;
    }

    const result = computeClosest(value, refs);
    if(result.error) {
      addMessage(result.error, 'assistant');
      return;
    }

    const dvId = generateDataVerifiedId();
    const signText = (value >= 0 ? '' : '') ;
    // nice message text (main bubble)
    const messageText = `${escapeHtml(String(value))} is closer to ${escapeHtml(String(result.closest))}! Have a nice day ☺️`;
    // extra details under dashed line
    const details = `
      <div>---</div>
      <div><strong>Confidence:</strong> ${result.confidence}%</div>
      <div><strong>Data Verified:</strong> ${dvId} <button class="copy-dv" data-id="${dvId}">Copy</button></div>
      <div style="margin-top:6px;color:var(--muted);font-size:12px">
        <span class="tag">Ref list: ${refs.join(', ')}</span>
        <span class="tag">Distance: ${result.distance}</span>
      </div>
    `;

    addMessage(messageText, 'assistant', details);
    attachCopyDvHandlers();
  }

  function escapeHtml(s){
    return String(s)
      .replaceAll('&','&amp;')
      .replaceAll('<','&lt;')
      .replaceAll('>','&gt;')
      .replaceAll('"','&quot;')
      .replaceAll("'", '&#39;');
  }

  function attachCopyDvHandlers(){
    // attach to any copy buttons
    const buttons = Array.from(document.querySelectorAll('.copy-dv'));
    buttons.forEach(btn => {
      if(btn.dataset.attached) return;
      btn.dataset.attached = '1';
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        navigator.clipboard?.writeText(id).then(() => {
          btn.textContent = 'Copied!';
          setTimeout(()=> btn.textContent = 'Copy', 1200);
        }).catch(()=> {
          const t = document.createElement('textarea');
          t.value = id;
          document.body.appendChild(t);
          t.select();
          try{ document.execCommand('copy'); btn.textContent='Copied!'; } catch(e){}
          t.remove();
          setTimeout(()=> btn.textContent = 'Copy', 1200);
        });
      });
    });
  }

  // example loader
  copyExampleBtn.addEventListener('click', () => {
    refsInput.value = '0,1,20';
    userInput.value = '2';
    handleSend();
    setTimeout(()=> { userInput.value = '-30'; handleSend(); }, 600);
  });

  sendBtn.addEventListener('click', handleSend);
  userInput.addEventListener('keydown', (e) => {
    if(e.key === 'Enter') { e.preventDefault(); handleSend(); }
  });

  clearBtn.addEventListener('click', () => { chatArea.innerHTML = '<div class="system-note">Default references: <strong>0, 1, 20</strong>. Change them below before sending a query.</div>'; });

  // attach copy for initial messages when loaded
  function init(){
    attachCopyDvHandlers();
  }
  init();

})();
