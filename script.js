// --- DÁN LINK WEB APP TỪ GOOGLE SCRIPT VÀO ĐÂY ---
const GOOGLE_SHEETS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwotWNfwoNDMZWABbdifr5KGD05Qb3E0Txp-TOETXoP48Yb-v91zciX0VdMgzzUlWoXLw/exec';


const app=document.getElementById('app'),toastEl=document.getElementById('toast');
const EXAM={data:null,section:'idle',studentName:'',timer:null,remaining:0,answers:{},submitted:false,audio:null,audioTimer:null,reviewMode:false,reviewDeadline:0};
let apiDataCache = null;

// --- XỬ LÝ MÀN HÌNH KHÓA & TRÓI THIẾT BỊ ---
(function initLoginSystem() {
  // 1. Tạo ID độc nhất cho thiết bị này
  let deviceId = localStorage.getItem('cobi_device_id');
  if (!deviceId) {
    deviceId = 'device_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
    localStorage.setItem('cobi_device_id', deviceId);
  }

  const loginScreen = document.getElementById('login-screen');
  const btnLogin = document.getElementById('btn-login');
  const accessCodeInput = document.getElementById('access-code');

  // Nếu đã đăng nhập thì giấu màn hình khóa
  if (localStorage.getItem('cobi_unlocked') === 'true') {
    if (loginScreen) loginScreen.style.display = 'none';
  }

  // Hàm xử lý đăng nhập
  const handleLogin = () => {
    const code = accessCodeInput.value.trim().toLowerCase();
    if(!code) return;

    btnLogin.textContent = "Đang kiểm tra mã...";
    btnLogin.disabled = true;

    const loginUrl = GOOGLE_SHEETS_WEB_APP_URL + '?action=login&pass=' + encodeURIComponent(code) + '&deviceId=' + encodeURIComponent(deviceId);
    
    fetch(loginUrl)
      .then(res => res.json())
      .then(data => {
        btnLogin.textContent = "Mở Khóa Tàng Thư Các";
        btnLogin.disabled = false;

        if (data.ok) {
          localStorage.setItem('cobi_unlocked', 'true');
          if(data.name) localStorage.setItem('cobi_student_name', data.name);
          
          if (loginScreen) loginScreen.style.display = 'none';
          toast('Mở khóa thành công! Chào mừng ' + (data.name || 'bạn'));
          
          fetchSheetData(() => {}); 
        } else {
          document.getElementById('login-error').textContent = data.error || 'Mã khóa không đúng!';
          document.getElementById('login-error').style.display = 'block';
        }
      })
      .catch(err => {
        btnLogin.textContent = "Mở Khóa Tàng Thư Các";
        btnLogin.disabled = false;
        document.getElementById('login-error').textContent = 'Lỗi mạng! Không thể kết nối máy chủ.';
        document.getElementById('login-error').style.display = 'block';
      });
  };

  // Gắn chức năng cho nút bấm
  if(btnLogin) {
    btnLogin.onclick = handleLogin;
  }

  // Cho phép ấn phím Enter để đăng nhập tiện hơn
  if(accessCodeInput) {
    accessCodeInput.addEventListener('keypress', function (e) {
      if (e.key === 'Enter') handleLogin();
    });
  }
})();

function goTop(){window.scrollTo({top:0,left:0,behavior:'auto'});document.documentElement.scrollTop=0;document.body.scrollTop=0}
function setPhaseTimer(seconds,onEnd){clearTimers();EXAM.remaining=seconds;paintTimer();const deadline=Date.now()+seconds*1000;EXAM.timer=setInterval(()=>{EXAM.remaining=Math.max(0,Math.ceil((deadline-Date.now())/1000));paintTimer();if(EXAM.remaining<=0){clearInterval(EXAM.timer);EXAM.timer=null;onEnd()}},200);}
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const norm=v=>String(v??'').trim().toUpperCase().replace(/\s+/g,'');
function toast(m){toastEl.textContent=m;toastEl.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>toastEl.classList.remove('show'),3000)}

function route(){
  let h=location.hash.slice(1)||'home';
  if(h==='home') renderHome();
  else if(h.startsWith('vocab-')) renderVocab(h.replace('vocab-',''));
  else if(h==='nguphap') renderNguPhap();
  else if(h==='hsk4') renderLevelHome('HSK4');
  else if(h.startsWith('exam-')) renderExamHome(decodeURIComponent(h.slice('exam-'.length)));
  else renderHome();
  document.querySelectorAll('.main-nav a').forEach(a=>a.classList.toggle('active',a.getAttribute('href')==='#'+h));
}

function getExamModules(){return Object.values(window.CoBiData?.exams||{}).sort((a,b)=>String(a.meta?.level||'').localeCompare(String(b.meta?.level||''),undefined,{numeric:true}) || String(a.meta?.title||'').localeCompare(String(b.meta?.title||'')));}
function findVocab(id){return window.CoBiData?.vocab?.[id]||null}
function findExam(id){return window.CoBiData?.exams?.[id]||null}
function placeholder(t,d){app.innerHTML=`<section class="page"><div class="section-title"><span class="cn">${esc(t)}</span><span class="vi">${esc(d)}</span></div><div class="card"><div class="notice">Lỗi lấy dữ liệu hoặc dữ liệu trống. Hãy kiểm tra lại Google Sheets.</div><div class="back-row" style="text-align:center"><a class="btn secondary" href="#home">← Về Trang Chủ</a></div></div></section>`}

function renderHome(){
  app.innerHTML=`
  <section class="page hero">
    <div>
      <div class="hero-kicker">漢 · 書 · 語 · 學</div>
      <h1><span class="hero-vn">Tàng Thư Các</span> <span class="hero-cobi">HSK4</span></h1>
      <h2>一朝入书馆，一生伴汉语</h2>
      <p>Không gian chuyên biệt luyện thi, học từ vựng và ngữ pháp HSK cấp 4.</p>
      <div class="hero-ornament">— ❖ —</div>
    </div>
  </section>
  <section class="page" style="padding-top:0">
    <div class="section-title"><span class="cn">入馆三卷</span><span class="vi">Ba không gian học tập</span></div>
    <div class="card-grid">
      <a class="card menu-card" href="#vocab-hsk4">
        <div class="symbol">词</div>
        <h3>Từ Vựng HSK4</h3>
        <p>Học 1200 từ vựng cốt lõi với Flashcard, ví dụ và Quiz trắc nghiệm.</p>
      </a>
      <a class="card menu-card" href="#nguphap">
        <div class="symbol">法</div>
        <h3>Ngữ Pháp HSK4</h3>
        <p>Tìm kiếm và ôn tập các cấu trúc ngữ pháp trọng tâm nhanh chóng.</p>
      </a>
      <a class="card menu-card" href="#hsk4">
        <div class="symbol">试</div>
        <h3>Khảo Thí Đường</h3>
        <p>Luyện đề thi HSK4 chuẩn với cấu trúc thi thực tế (Nghe - Đọc - Viết).</p>
      </a>
    </div>
  </section>`;
}

function fetchSheetData(callback) {
  if (apiDataCache) { callback(); return; }
  app.innerHTML = `<section class="page"><div class="section-title"><span class="cn">Đang tải...</span><span class="vi">Đang kết nối Tàng Thư Các...</span></div></section>`;
  fetch(GOOGLE_SHEETS_WEB_APP_URL)
    .then(res => res.json())
    .then(data => {
      apiDataCache = data;
      window.CoBiData = window.CoBiData || {};
      window.CoBiData.vocab = window.CoBiData.vocab || {};
      if(data.vocab) window.CoBiData.vocab['hsk4'] = data.vocab;
      callback();
    })
    .catch(err => {
      placeholder('Lỗi mạng', 'Không thể kết nối với Google Sheets.');
    });
}

// ==========================================
// HỆ THỐNG TỪ VỰNG TỐI ƯU HOÀN TOÀN
// ==========================================
function renderVocab(id){
  if (id === 'hsk4' && !window.CoBiData?.vocab?.['hsk4']) { fetchSheetData(() => renderVocab(id)); return; }
  const data=findVocab(id); if(!data){placeholder('Lỗi dữ liệu','Không tìm thấy dữ liệu từ vựng.');return;}
  const words=(data.items||[]).map((w,i)=>({...w,id:w.id??`${data.id}_${i+1}`})); 
  const total=words.length; 
  const storageKey=`cobi_vocab_${data.id}`; 
  const saved=JSON.parse(localStorage.getItem(storageKey)||'{}');
  
  // Trạng thái độc lập trong hàm renderVocab
  let mode = 'list'; 
  let currentWordId = sessionStorage.getItem(`${storageKey}_current_id`) || words[0].id;
  let quiz=[], quizIndex=0, quizScore=0;
  
  const speak=text=>{if(!text)return;if(!('speechSynthesis' in window))return toast('Trình duyệt không hỗ trợ phát âm.');speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang='zh-CN';u.rate=.82;speechSynthesis.speak(u)};
  const shuffle=a=>[...a].sort(()=>Math.random()-.5);
  
  // Tìm từ CHƯA HỌC tiếp theo
  const getNextUnlearned = (startId) => {
      let startIdx = words.findIndex(w => w.id === startId);
      if (startIdx < 0) startIdx = 0;
      for (let i = 1; i <= total; i++) {
          let checkIdx = (startIdx + i) % total;
          if (!saved[words[checkIdx].id]) return words[checkIdx].id;
      }
      return null; 
  };

  const markLearned = (id) => {
    saved[id] = true;
    localStorage.setItem(storageKey, JSON.stringify(saved));
    currentWordId = getNextUnlearned(id);
    if(currentWordId) sessionStorage.setItem(`${storageKey}_current_id`, currentWordId);
    appView(); 
  };

  const appView = () => {
    const learned=Object.keys(saved).filter(k=>saved[k]).length;
    app.innerHTML=`<section class="page vocab-page">
      <div class="section-title"><span class="cn">${esc(data.level||'词汇')}</span><span class="vi">${esc(data.title||'Từ vựng')} · ${total} mục</span></div>
      <div class="vocab-toolbar"><a class="btn secondary" href="#home">← Trang chủ</a><div class="vocab-progress">Đã đánh dấu học: <b>${learned}/${total}</b></div></div>
      <div class="vocab-tabs">
        <button class="vocab-tab ${mode==='list'?'active':''}" data-mode="list">Danh sách</button>
        <button class="vocab-tab ${mode==='study'?'active':''}" data-mode="study">Học từ</button>
        <button class="vocab-tab ${mode==='quiz'?'active':''}" data-mode="quiz">Kiểm tra</button>
      </div>
      <div id="vocab-content"></div>
    </section>`;
    
    document.querySelectorAll('.vocab-tab').forEach(b => b.onclick = () => {
      mode = b.dataset.mode;
      if (mode === 'quiz') startVocabQuiz();
      else appView();
    });
    renderVocabContent();
  };

  function renderVocabContent(){
    const box=document.getElementById('vocab-content');if(!box)return;
    
    if(mode === 'list') {
      box.innerHTML=`<div class="vocab-search-row"><input id="vocab-search" class="vocab-search" placeholder="Tìm chữ Hán, pinyin hoặc nghĩa tiếng Việt..."><span class="vocab-count">${total} từ</span></div><div class="vocab-table-wrap"><table class="vocab-table"><thead><tr><th>#</th><th>汉字</th><th>Pinyin</th><th>Nghĩa</th><th>Hành động</th></tr></thead><tbody id="vocab-body"></tbody></table></div>`;
      const fill=()=>{
        const q=(document.getElementById('vocab-search').value||'').trim().toLowerCase();
        document.getElementById('vocab-body').innerHTML=words.filter(w=>!q||`${w.hanzi} ${w.pinyin} ${w.meaning}`.toLowerCase().includes(q)).map((w,i)=>`
        <tr class="${saved[w.id]?'learned':''}"><td>${i+1}</td><td class="hanzi-cell">${esc(w.hanzi)}</td><td>${esc(w.pinyin)}</td><td>${esc(w.meaning)}</td>
        <td>
          <button class="icon-btn" data-speak="${esc(w.hanzi)}" title="Nghe">🔊</button>
          <button class="icon-btn jump-btn" data-jump="${esc(w.id)}" title="Học từ này">📖</button>
        </td></tr>`).join('');
        
        document.querySelectorAll('[data-speak]').forEach(b=>b.onclick=()=>speak(b.dataset.speak));
        
        // Sự kiện: Bấm biểu tượng Sách để nhảy sang tab Học Từ
        document.querySelectorAll('.jump-btn').forEach(b => b.onclick = () => {
            currentWordId = b.dataset.jump;
            sessionStorage.setItem(`${storageKey}_current_id`, currentWordId);
            mode = 'study';
            appView(); 
        });
      };
      document.getElementById('vocab-search').oninput=fill; fill(); return;
    }
    
    if(mode === 'study') {
      let w = words.find(x => x.id === currentWordId);
      
      // Nếu từ rỗng (vừa học xong từ cuối cùng), thử tìm từ chưa học khác
      if (!w) {
          currentWordId = getNextUnlearned(words[0].id);
          w = words.find(x => x.id === currentWordId);
      }

      // Đã học hết sạch từ vựng
      if (!w) {
          box.innerHTML = `<div class="study-wrap"><div class="notice" style="margin-bottom: 20px;">Chúc mừng! Bạn đã hoàn thành toàn bộ ${total} từ vựng. Hãy sang phần Kiểm tra để ôn tập nhé.</div><button class="btn red" onclick="document.querySelector('[data-mode=quiz]').click()">Làm bài kiểm tra</button></div>`;
          return;
      }
      
      const realIndex = words.findIndex(x => x.id === w.id);

      box.innerHTML=`<div class="study-wrap"><div class="study-index">Từ số ${realIndex+1} / ${total}</div><div id="study-flip" class="flip-card"><div class="flip-inner"><div class="flip-face flip-front"><div class="front-label">NHÌN CHỮ HÁN</div><div class="study-hanzi">${esc(w.hanzi)}</div><button class="speak-btn" id="speak-word">🔊 Nghe phát âm</button><div class="flip-hint">Nghe xong → chạm vào thẻ để lật</div></div><div class="flip-face flip-back"><div class="front-label">MẶT SAU</div><div class="study-hanzi small">${esc(w.hanzi)}</div><div class="study-pinyin">${esc(w.pinyin)}</div><div class="study-meaning">${esc(w.meaning)}</div><div class="example-box"><div class="example-label">CÂU VÍ DỤ</div><div class="example-cn">${esc(w.example||'Chưa có câu ví dụ.')}</div>${w.example?`<button class="speak-example" id="speak-example">🔊 Nghe câu ví dụ</button>`:''}</div></div></div></div><button class="flip-button" id="flip-btn">↻ Lật thẻ</button><div class="study-actions"><button class="btn red" id="learn-word">${saved[w.id]?'✓ Bỏ đánh dấu đã học':'Đánh dấu Đã học'}</button><button class="btn secondary" id="next-word">Từ chưa học tiếp theo →</button></div></div>`;
      
      const flip=()=>document.getElementById('study-flip')?.classList.toggle('flipped');
      document.getElementById('study-flip').onclick=flip; document.getElementById('flip-btn').onclick=flip;
      document.getElementById('speak-word').onclick=e=>{e.stopPropagation();speak(w.hanzi)};
      document.getElementById('speak-example')?.addEventListener('click',e=>{e.stopPropagation();speak(w.example)});
      
      document.getElementById('learn-word').onclick=()=>{
          if (saved[w.id]) {
              saved[w.id] = false; 
              localStorage.setItem(storageKey,JSON.stringify(saved));
              appView();
          } else {
              markLearned(w.id);
          }
      };
      document.getElementById('next-word').onclick=()=>{
          const nextId = getNextUnlearned(w.id);
          if(nextId) {
             currentWordId = nextId;
             sessionStorage.setItem(`${storageKey}_current_id`, currentWordId);
             appView();
          } else {
             toast('Bạn đã học hết từ vựng!');
          }
      };
      return;
    }
    
    if(mode === 'quiz') renderQuizContent();
  }

  function startVocabQuiz(){
    // CHỈ CHỌN CÁC TỪ ĐÃ ĐƯỢC ĐÁNH DẤU "ĐÃ HỌC"
    const learnedWords = words.filter(w => saved[w.id]);
    
    if (learnedWords.length < 4) {
        const box = document.getElementById('vocab-content');
        if(box) box.innerHTML = `<div class="quiz-result"><div class="notice" style="margin-bottom:20px;">Bạn cần đánh dấu "Đã học" ít nhất 4 từ vựng để mở khóa bài kiểm tra. (Hiện tại: ${learnedWords.length}/4)</div><button class="btn secondary" onclick="document.querySelector('[data-mode=study]').click()">Quay lại học từ</button></div>`;
        return;
    }
    quiz = shuffle(learnedWords).slice(0, Math.min(10, learnedWords.length));
    quizIndex = 0; 
    quizScore = 0; 
    renderVocabContent();
  }

  function nextQuiz(){ quizIndex++; renderVocabContent(); }

  function renderQuizContent(){
    const box = document.getElementById('vocab-content');
    if(!quiz.length) { startVocabQuiz(); return; }
    
    if(quizIndex >= quiz.length){
        box.innerHTML=`<div class="quiz-result"><div class="quiz-score">${quizScore}/${quiz.length}</div><h3>Hoàn thành lượt ôn</h3><p>Mỗi lượt gồm ${quiz.length} từ được chọn ngẫu nhiên từ kho từ đã học.</p><button class="btn red" id="quiz-again">Làm lượt mới</button></div>`;
        document.getElementById('quiz-again').onclick=startVocabQuiz;
        return;
    }
    
    const w = quiz[quizIndex];
    // Đáp án sai được bốc từ TOÀN BỘ từ vựng để làm nhiễu
    const candidates = shuffle([w, ...shuffle(words.filter(x => x.id !== w.id)).slice(0, 3)]);
    const type = total >= 4 ? shuffle(['meaning','pinyin','hanzi','match'])[0] : 'meaning';
    let title='', prompt='', body='';

    if(type==='meaning'){title='Hán tự → Nghĩa';prompt=`<div class="quiz-prompt">${esc(w.hanzi)} <button class="icon-btn" id="quiz-speak">🔊</button></div><p class="quiz-sub">Chọn nghĩa đúng của từ.</p>`;body=candidates.map((x,i)=>`<button class="quiz-option" data-answer="${esc(x.id)}">${String.fromCharCode(65+i)}. ${esc(x.meaning)}</button>`).join('')}
    if(type==='pinyin'){title='Hán tự → Pinyin';prompt=`<div class="quiz-prompt">${esc(w.hanzi)} <button class="icon-btn" id="quiz-speak">🔊</button></div><p class="quiz-sub">Chọn pinyin đúng.</p>`;body=candidates.map((x,i)=>`<button class="quiz-option" data-answer="${esc(x.id)}">${String.fromCharCode(65+i)}. ${esc(x.pinyin)}</button>`).join('')}
    if(type==='hanzi'){title='Nghĩa → Hán tự';prompt=`<div class="quiz-prompt quiz-vietnamese">${esc(w.meaning)}</div><p class="quiz-sub">Chọn Hán tự đúng.</p>`;body=candidates.map((x,i)=>`<button class="quiz-option hanzi-option" data-answer="${esc(x.id)}">${String.fromCharCode(65+i)}. ${esc(x.hanzi)}</button>`).join('')}
    if(type==='match'){title='Hán tự → Pinyin';prompt=`<div class="quiz-prompt">${esc(w.hanzi)}</div><p class="quiz-sub">Chọn cặp Hán tự – Pinyin đúng.</p>`;body=candidates.map((x,i)=>`<button class="quiz-option" data-answer="${esc(x.id)}">${String.fromCharCode(65+i)}. ${esc(x.hanzi)} — ${esc(x.pinyin)}</button>`).join('')}
    
    box.innerHTML=`<div class="quiz-card"><div class="quiz-meta"><span>Câu ${quizIndex+1}/${quiz.length}</span><b>${title}</b></div>${prompt}<div class="quiz-options">${body}</div></div>`;
    document.getElementById('quiz-speak')?.addEventListener('click',e=>{e.stopPropagation();speak(w.hanzi)});
    
    document.querySelectorAll('.quiz-option').forEach(b => b.onclick = () => {
      const ok = String(b.dataset.answer) === String(w.id);
      if(ok) quizScore++;
      document.querySelectorAll('.quiz-option').forEach(x => x.disabled = true);
      b.classList.add(ok ? 'correct' : 'wrong');
      if(!ok) [...document.querySelectorAll('.quiz-option')].find(x => String(x.dataset.answer) === String(w.id))?.classList.add('correct');
      setTimeout(nextQuiz, 600);
    });
  }
  appView();
}

function renderNguPhap() {
  if (!apiDataCache || !apiDataCache.grammar) { fetchSheetData(() => renderNguPhap()); return; }
  const grammarList = apiDataCache.grammar.items || [];
  if (!grammarList.length) { placeholder('Chưa có dữ liệu', 'Sheet Ngữ Pháp đang trống.'); return; }
  const total = grammarList.length;

  app.innerHTML = `
  <section class="page vocab-page">
    <div class="section-title"><span class="cn">语法</span><span class="vi">Ngữ pháp HSK4 · ${total} điểm ngữ pháp</span></div>
    <div class="vocab-toolbar" style="max-width:800px; margin:0 auto 16px;">
      <a class="btn secondary" href="#home">← Trang chủ</a>
    </div>
    <div class="vocab-search-row" style="max-width:800px; margin:0 auto 24px;">
      <input id="grammar-search" class="vocab-search" placeholder="🔍 Tìm điểm ngữ pháp, cấu trúc, cách dùng, ví dụ..." style="width: 100%;">
    </div>
    <div id="grammar-list" class="grammar-list" style="max-width:800px; margin:auto"></div>
  </section>`;

  const renderList = (filterText = '') => {
    const box = document.getElementById('grammar-list');
    if(!box) return;
    const q = filterText.toLowerCase();

    const filtered = grammarList.filter(g => {
      if(!q) return true;
      if(g.title.toLowerCase().includes(q)) return true;
      return g.items.some(sub => 
        (sub.structure && sub.structure.toLowerCase().includes(q)) || 
        (sub.usage && sub.usage.toLowerCase().includes(q)) || 
        (sub.explanation && sub.explanation.toLowerCase().includes(q)) || 
        (sub.example && sub.example.toLowerCase().includes(q))
      );
    });

    if(filtered.length === 0) {
      box.innerHTML = `<div class="notice">Không tìm thấy ngữ pháp phù hợp.</div>`;
      return;
    }

    box.innerHTML = filtered.map((g, i) => `
      <div class="question-card" style="margin-bottom:24px; padding: 28px;">
        <div class="q-head" style="border-bottom: 2px solid var(--gold); padding-bottom: 12px; margin-bottom: 20px;">
          <span class="q-number" style="font-size: 24px; color: var(--red); font-weight: bold;">${esc(g.title)}</span>
        </div>
        <div class="grammar-sub-items">
          ${g.items.map((sub, j) => `
            <div class="grammar-sub-item" style="${j > 0 ? 'margin-top: 24px; padding-top: 24px; border-top: 1px dashed var(--line);' : ''}">
              ${g.items.length > 1 ? `<div style="color:var(--muted); font-size:13px; margin-bottom:12px; font-weight: bold; letter-spacing:1px;">CẤU TRÚC ${j+1}</div>` : ''}
              ${sub.structure ? `<div class="study-hanzi small" style="margin-top:0; margin-bottom:12px; color:var(--brown-dark); font-weight:bold; font-size: 20px;">${esc(sub.structure).replace(/\n/g,'<br>')}</div>` : ''}
              ${sub.usage ? `<div style="margin-bottom:8px; line-height: 1.7; color: var(--ink);"><b>Cách dùng:</b> ${esc(sub.usage).replace(/\n/g,'<br>')}</div>` : ''}
              ${sub.explanation ? `<div style="margin-bottom:12px; line-height: 1.7; color: var(--ink);"><b>Giải thích:</b> ${esc(sub.explanation).replace(/\n/g,'<br>')}</div>` : ''}
              ${sub.example ? `<div class="example-box" style="max-width:100%; border-radius:5px; margin-top:16px; background:#fffaf0; border: 1px solid var(--line); padding: 16px;"><div class="example-label" style="margin-bottom: 8px;">VÍ DỤ</div><div class="example-cn" style="font-size: 18px; color: var(--red);">${esc(sub.example).replace(/\n/g,'<br>')}</div></div>` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');
  };

  document.getElementById('grammar-search').oninput = (e) => renderList(e.target.value);
  renderList();
}

function renderLevelHome(level){
  const exams=getExamModules().filter(e=>String(e.meta?.level||'').toUpperCase()===level);
  app.innerHTML=`<section class="page"><div class="section-title"><span class="cn">${esc(level)} 模拟考试</span><span class="vi">Khảo Thí Đường ${esc(level)}</span></div><p class="review-intro">Chọn bộ đề để bắt đầu thi. Hãy chuẩn bị giấy nháp, bút và tai nghe.</p><div class="card-grid">${exams.map((e,i)=>{const id=e.meta?.id||`exam_${i+1}`;e.meta=e.meta||{};e.meta.id=id;return `<a class="card menu-card" href="#exam-${encodeURIComponent(id)}"><div class="symbol">试</div><h3>${esc(e.meta.title||`Đề ${i+1}`)}</h3><p>Nghe · 阅读 · 书写</p><span class="review-arrow">Vào thi →</span></a>`}).join('')||`<div class="card"><div class="notice">${level} hiện chưa có đề được đăng tải.</div></div>`}</div><div class="back-row"><a class="btn secondary" href="#home">← Trang Chủ</a></div></section>`;
}
function renderExamHome(id){
  const data=findExam(id);if(!data){placeholder('Không tìm thấy đề','File đề chưa được đăng ký hoặc đường dẫn không đúng.');return;}EXAM.data=data;
  const meta=data.meta||{}, counts=[['听力',data.listening?.length||0],['阅读',data.reading?.length||0],['书写',(data.writingOrder?.length||0)+(data.writingPicture?.length||0)]];
  const savedStudentName = localStorage.getItem('cobi_student_name') || '';
  app.innerHTML=`<section class="page"><div class="section-title"><span class="cn">${esc(meta.level||'HSK')} 模拟考试</span><span class="vi">${esc(meta.title||'Bộ đề')}</span></div><div class="notice">${counts.map(x=>`<strong>${x[0]}:</strong> ${x[1]}题`).join(' · ')}${meta.reviewMinutes?` · <strong>检查:</strong> ${meta.reviewMinutes} phút`:''}</div><div class="card-grid">${counts.map(x=>`<div class="card"><h3>${x[0]} · ${x[1]}题</h3><p>${x[0]==='听力'?'判断正误 + 选择题.':x[0]==='阅读'?'选词填空 + 排列顺序 + 阅读理解.':'完成句子 + 看图造句.'}</p></div>`).join('')}</div><div class="card start-card"><label><strong>姓名 · Họ tên học viên</strong></label><input id="student-name" placeholder="Nhập họ tên" value="${esc(savedStudentName)}"><button class="btn red" id="start-exam">开始考试 · Bắt đầu</button></div><div class="back-row"><a class="btn secondary" href="#hsk4">← Quay lại danh sách đề thi</a></div></section>`;
  document.getElementById('start-exam').onclick=()=>startExam(data);
}
function allQuestions(){return [...(EXAM.data.listening||[]),...(EXAM.data.reading||[]),...(EXAM.data.writingOrder||[]),...(EXAM.data.writingPicture||[])]}
function sectionQuestions(section){if(section==='listening')return EXAM.data.listening||[];if(section==='reading')return EXAM.data.reading||[];if(section==='writing')return [...(EXAM.data.writingOrder||[]),...(EXAM.data.writingPicture||[])];return allQuestions()}
function questionSection(id){const s=EXAM.data?.meta?.sections;if(s){for(const [name,range] of Object.entries(s)){if(id>=range[0]&&id<=range[1])return name}}if(id<=45)return'listening';if(id<=85)return'reading';return'writing'}
function isDone(q){return EXAM.answers[q.id]!==undefined&&String(EXAM.answers[q.id]).trim()!==''}
function startExam(data){let n=document.getElementById('student-name').value.trim();if(!n)return toast('Vui lòng nhập họ tên học viên.');EXAM.data=data;EXAM.studentName=n;EXAM.answers={};EXAM.submitted=false;EXAM.section='listening';EXAM.reviewMode=false;renderListening()}
function clearTimers(){clearInterval(EXAM.timer);clearInterval(EXAM.audioTimer);EXAM.timer=null;EXAM.audioTimer=null}
function startClock(seconds,onEnd){setPhaseTimer(seconds,onEnd)}
function startAudioClock(){clearInterval(EXAM.audioTimer);EXAM.audioTimer=setInterval(()=>{if(EXAM.audio&&!EXAM.audio.paused&&isFinite(EXAM.audio.duration)){EXAM.remaining=Math.max(0,Math.ceil(EXAM.audio.duration-EXAM.audio.currentTime));paintTimer()}},250)}
function paintTimer(){let e=document.getElementById('timer');if(!e)return;let s=Math.max(0,EXAM.remaining),m=Math.floor(s/60),r=s%60;e.textContent=`${String(m).padStart(2,'0')}:${String(r).padStart(2,'0')}`;e.classList.toggle('warning',s<=60)}
function shell(title,sub,qs){app.innerHTML=`<div class="practice-shell"><div class="practice-top"><div class="practice-top-row"><div><div class="exam-title">${esc(EXAM.data.meta.title)}</div><div class="subhead">${esc(title)} · ${esc(sub)}</div></div><div class="timer" id="timer">00:00</div></div><div class="progress-line"><div class="progress-fill" id="progress-fill"></div></div></div><div class="exam-layout"><main class="exam-main" id="exam-main"></main><aside class="reading-nav"><h3>答题卡</h3><div class="legend"><span class="dot green"></span> Đã làm <span class="dot red"></span> Chưa làm</div><div class="palette" id="palette"></div></aside></div></div>`;renderPalette();updateProgress()}
function renderListening(reviewMode=false){
  if(!reviewMode) clearTimers(); goTop(); EXAM.section='listening'; EXAM.reviewMode=reviewMode; shell(reviewMode?'检查答案 · 听力':'听力','Nghe'+(reviewMode?' · Rà soát':' · Audio'),EXAM.data.listening);
  const main=document.getElementById('exam-main');
  if(!reviewMode){
    const audio=document.createElement('audio'); audio.id='listening-audio'; audio.src=EXAM.data.meta.listeningAudio; audio.preload='metadata'; audio.controls=false; audio.style.display='none';
    audio.addEventListener('loadedmetadata',()=>{if(isFinite(audio.duration)&&audio.duration>0){EXAM.remaining=Math.ceil(audio.duration);paintTimer();startAudioClock()}});
    audio.addEventListener('timeupdate',()=>{if(isFinite(audio.duration)&&audio.duration>0){EXAM.remaining=Math.max(0,Math.ceil(audio.duration-audio.currentTime));paintTimer()}});
    audio.addEventListener('ended',endListening);
    main.appendChild(audio); EXAM.audio=audio; audio.play().catch(()=>toast('Hãy cho phép trang phát âm thanh rồi mở lại bài.'));
  }
  EXAM.data.listening.forEach(q=>main.appendChild(questionElement(q)));
  if(reviewMode){
    main.insertAdjacentHTML('beforeend',`<div class="action-row"><span></span><button class="btn secondary" id="back-review">← 回到检查答案 · Quay lại rà soát</button></div>`); document.getElementById('back-review').onclick=renderReview;
  }else{
    main.insertAdjacentHTML('beforeend',`<div class="action-row"><span></span><button class="btn red" id="next-section">下一部分 → Sang 阅读</button></div>`); document.getElementById('next-section').onclick=endListening;
  }
  renderPalette(); updateProgress();
  if(!reviewMode) setTimeout(()=>{if(EXAM.audio&&isFinite(EXAM.audio.duration)&&EXAM.audio.duration>0)startAudioClock()},500);
}
function endListening(){if(EXAM.section!=='listening')return;clearTimers();if(EXAM.audio){EXAM.audio.pause();EXAM.audio.currentTime=0}EXAM.audio=null;renderReading()}
function renderReading(reviewMode=false){
  if(!reviewMode) clearTimers(); goTop(); EXAM.section='reading'; EXAM.reviewMode=reviewMode; shell(reviewMode?'检查答案 · 阅读':'阅读','Đọc · '+(reviewMode?'Rà soát':'40 phút'),EXAM.data.reading);
  const main=document.getElementById('exam-main'), groups=[['第一部分 · 选词填空',EXAM.data.reading.filter(q=>q.id<=55)],['第二部分 · 排列顺序',EXAM.data.reading.filter(q=>q.id>=56&&q.id<=65)],['第三部分 · 阅读理解',EXAM.data.reading.filter(q=>q.id>=66)]];
  groups.forEach(([title,qs])=>{main.insertAdjacentHTML('beforeend',`<div class="exam-section-heading"><span>${esc(title)}</span></div>`);qs.forEach(q=>main.appendChild(questionElement(q)))});
  if(reviewMode){
    main.insertAdjacentHTML('beforeend',`<div class="action-row"><span></span><button class="btn secondary" id="back-review">← 回到检查答案 · Quay lại rà soát</button></div>`); document.getElementById('back-review').onclick=renderReview;
  }else{
    main.insertAdjacentHTML('beforeend',`<div class="action-row"><span></span><button class="btn red" id="next-writing">下一部分 → Sang 书写</button></div>`); document.getElementById('next-writing').onclick=()=>renderWriting(false); setPhaseTimer(40*60,()=>renderWriting(false));
  }
  renderPalette(); updateProgress();
}
function renderWriting(reviewMode=false){
  if(!reviewMode) clearTimers(); goTop(); EXAM.section='writing'; EXAM.reviewMode=reviewMode; shell(reviewMode?'检查答案 · 书写':'书写','Viết · '+(reviewMode?'Rà soát':'25 phút'),sectionQuestions('writing'));
  const main=document.getElementById('exam-main');
  main.insertAdjacentHTML('beforeend',`<div class="exam-section-heading"><span>第一部分 · 完成句子</span></div>`); EXAM.data.writingOrder.forEach(q=>main.appendChild(questionElement(q)));
  main.insertAdjacentHTML('beforeend',`<div class="exam-section-heading"><span>第二部分 · 看图，用词造句</span></div>${EXAM.data.meta?.writingPicture?`<div class="shared-writing-image"><img src="${esc(EXAM.data.meta.writingPicture)}" alt="HSK4 96–100"><p>第96–100题共用此图</p></div>`:''}`); EXAM.data.writingPicture.forEach(q=>main.appendChild(questionElement(q)));
  if(reviewMode){
    main.insertAdjacentHTML('beforeend',`<div class="action-row"><span></span><button class="btn secondary" id="back-review">← 回到检查答案 · Quay lại rà soát</button></div>`); document.getElementById('back-review').onclick=renderReview;
  }else{
    main.insertAdjacentHTML('beforeend',`<div class="action-row"><span></span><button class="btn red" id="next-review">检查答案 → 进入 5 分钟 rà soát</button></div>`); document.getElementById('next-review').onclick=startReview; setPhaseTimer(25*60,startReview);
  }
  renderPalette(); updateProgress();
}
function startReview(){
  if(EXAM.section==='review')return; goTop(); clearTimers(); if(EXAM.audio)EXAM.audio.pause(); EXAM.audio=null; EXAM.section='review'; EXAM.reviewMode=false; EXAM.reviewDeadline=Date.now()+EXAM.data.meta.reviewMinutes*60*1000; renderReview();
}
function questionElement(q){const c=document.createElement('article');c.className='question-card';c.id='q-'+q.id;let body='';if(q.type==='tf'){body=`<div class="statement">★ ${esc(q.statement)}</div>${options(q,q.options)}`}else if(q.type==='mcq'){body=options(q,q.options)}else if(q.type==='cloze'){body=(q.example?`<div class="example"><strong>例如：</strong>${esc(q.example)}</div>`:'')+`<div class="cloze-text">${esc(q.question)}</div>${options(q,q.options)}`}else if(q.type==='order'){const keys=Array.isArray(q.parts)?q.parts.map((_,i)=>String.fromCharCode(65+i)):Object.keys(q.parts);const labels=Array.isArray(q.parts)?q.parts:Object.values(q.parts);const saved=String(EXAM.answers[q.id]||'').split('').filter(Boolean);const ordered=saved.length?saved:keys;body=`<div class="order-parts">${labels.map((v,i)=>`<div class="order-part"><b>${keys[i]}</b><span>${esc(v)}</span></div>`).join('')}</div><p class="drag-hint">拖动下方字母排列顺序 · Có thể kéo thả hoặc bấm để đổi vị trí</p><div class="order-builder" data-order="${q.id}">${ordered.map(k=>`<button type="button" class="order-token" draggable="true" data-token="${k}">${k}</button>`).join('')}</div><input type="hidden" class="answer-input" data-answer="${q.id}" value="${esc(ordered.join(''))}">`}else if(q.type==='reading'){body=`<div class="passage">${esc(q.passage)}</div><div class="question-text">${esc(q.question)}</div>${options(q,q.options)}`}else if(q.type==='writing_text'){body=`<div class="writing-words"><b>词语：</b>${(q.words||[]).map(w=>`<span class="word-chip">${esc(w)}</span>`).join(' ')}</div><div class="question-text">${esc(q.question||'完成句子')}</div><input class="answer-input writing-text-answer" data-answer="${q.id}" value="${esc(EXAM.answers[q.id]||'')}" placeholder="请输入完整句子">`}else if(q.type==='picture'){body=`<div class="picture-instruction">看图，用词“<strong>${esc(q.word)}</strong>”造句</div>${q.content?`<img class="writing-picture-item" src="${esc(q.content)}" alt="第${q.id}题">`:''}<input class="answer-input picture-answer" data-answer="${q.id}" value="${esc(EXAM.answers[q.id]||'')}" placeholder="请输入句子">`};c.innerHTML=`<div class="q-head"><span class="q-number">第 ${q.id} 题</span><span class="q-type">${typeName(q.type)}</span></div>${body}`;c.querySelectorAll('input[type=radio]').forEach(r=>r.onchange=()=>setAnswer(q.id,r.value));c.querySelectorAll('.answer-input:not([type=hidden])').forEach(i=>i.oninput=()=>setAnswer(q.id,i.value));const builder=c.querySelector('.order-builder');if(builder){let dragged=null;const sync=()=>{const order=[...builder.querySelectorAll('.order-token')].map(b=>b.dataset.token).join('');const input=c.querySelector('.answer-input');input.value=order;setAnswer(q.id,order)};builder.querySelectorAll('.order-token').forEach(btn=>{btn.addEventListener('dragstart',e=>{dragged=btn;btn.classList.add('dragging');e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',btn.dataset.token)});btn.addEventListener('dragend',()=>{dragged=null;btn.classList.remove('dragging');builder.querySelectorAll('.drag-over').forEach(x=>x.classList.remove('drag-over'))});btn.addEventListener('dragover',e=>{e.preventDefault();btn.classList.add('drag-over');e.dataTransfer.dropEffect='move'});btn.addEventListener('dragleave',()=>btn.classList.remove('drag-over'));btn.addEventListener('drop',e=>{e.preventDefault();btn.classList.remove('drag-over');if(!dragged||dragged===btn)return;const rect=btn.getBoundingClientRect();builder.insertBefore(dragged,e.clientX>rect.left+rect.width/2?btn.nextSibling:btn);sync()});btn.addEventListener('click',()=>{const arr=[...builder.querySelectorAll('.order-token')];const idx=arr.indexOf(btn);if(idx>0){builder.insertBefore(btn,arr[idx-1]);sync()}else if(arr.length>1){builder.appendChild(btn);sync()}})})}return c}
function typeName(t){return({tf:'判断正误',mcq:'选择题',cloze:'选词填空',reading:'阅读理解',order:'排列顺序',writing_text:'完成句子',picture:'看图写句'})[t]||''}
function options(q,o){return `<div class="options">${Object.entries(o).map(([k,v])=>`<label class="option"><input type="radio" name="q-${q.id}" value="${k}" ${EXAM.answers[q.id]===k?'checked':''}><span><b>${k}.</b> ${esc(v)}</span></label>`).join('')}</div>`}
function setAnswer(id,v){EXAM.answers[id]=v;renderPalette();updateProgress()}
function renderPalette(){let e=document.getElementById('palette');if(!e)return;let qs=sectionQuestions(EXAM.section);e.innerHTML=qs.map(q=>`<button class="${isDone(q)?'done':''}" data-jump="${q.id}">${q.id}</button>`).join('');e.querySelectorAll('button').forEach(b=>b.onclick=()=>jumpToQuestion(Number(b.dataset.jump)))}
function jumpToQuestion(id){const sec=questionSection(id); if(EXAM.section===sec && !EXAM.reviewMode){document.getElementById('q-'+id)?.scrollIntoView({behavior:'smooth',block:'start'});return;} if(EXAM.section!=='review'){toast('Câu này thuộc phần khác.');return;} if(Date.now()>=EXAM.reviewDeadline){submitExam();return;} if(sec==='listening')renderListening(true);else if(sec==='reading')renderReading(true);else renderWriting(true); setTimeout(()=>document.getElementById('q-'+id)?.scrollIntoView({behavior:'auto',block:'start'}),80);}
function updateProgress(){let e=document.getElementById('progress-fill');if(!e)return;let qs=sectionQuestions(EXAM.section);e.style.width=qs.length?`${qs.filter(isDone).length/qs.length*100}%`:'0%'}
function renderReview(){clearTimers(); goTop(); EXAM.section='review'; EXAM.reviewMode=false; let qs=allQuestions(),un=qs.filter(q=>!isDone(q)); app.innerHTML=`<section class="page"><div class="review-top"><div class="section-title"><span class="cn">检查答案</span><span class="vi">Rà soát · còn ${un.length} câu chưa làm</span></div><div class="review-timer" id="review-timer">05:00</div></div><div class="card"><p><b class="green-text">Xanh</b> = đã làm · <b class="red-text">Đỏ</b> = chưa làm. Bấm số câu để xem và sửa đáp án.</p><div class="palette review-palette">${qs.map(q=>`<button class="${isDone(q)?'done':''}" data-jump="${q.id}">${q.id}</button>`).join('')}</div></div><div class="card"><button class="btn red" id="submit-now">提交答案 · Nộp bài ngay</button></div></section>`; document.querySelectorAll('[data-jump]').forEach(b=>b.onclick=()=>jumpToQuestion(Number(b.dataset.jump))); document.getElementById('submit-now').onclick=submitExam; EXAM.remaining=Math.max(0,Math.ceil((EXAM.reviewDeadline-Date.now())/1000)); paintReviewTimer(); EXAM.timer=setInterval(()=>{EXAM.remaining=Math.max(0,Math.ceil((EXAM.reviewDeadline-Date.now())/1000));paintReviewTimer();if(EXAM.remaining<=0){clearTimers();submitExam()}},200);}
function paintReviewTimer(){const el=document.getElementById('review-timer');if(el){el.textContent=formatTime(EXAM.remaining);el.classList.toggle('warning',EXAM.remaining<=60)}}
function formatTime(s){s=Math.max(0,Math.ceil(s));return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`}
function submitExam(){if(EXAM.submitted)return;EXAM.submitted=true;clearTimers();if(EXAM.audio)EXAM.audio.pause();let r=calculateResult();saveResultLocally(r);renderResult(r);sendResultToGoogleSheets(r)}
function normWriting(v){return norm(v).replace(/[。！？!?，,、；;：:‘’“”"'（）()《》<>]/g,'')}
function answerCorrect(q){if(q.type==='writing_text')return normWriting(EXAM.answers[q.id])===normWriting(q.answer);return norm(EXAM.answers[q.id])===norm(q.answer)}
function calculateResult(){let l=EXAM.data.listening,r=EXAM.data.reading,w=EXAM.data.writingOrder,p=EXAM.data.writingPicture;let lc=l.filter(answerCorrect).length,rc=r.filter(answerCorrect).length,wc=w.filter(answerCorrect).length;const m=EXAM.data.meta||{},lp=Number(m.listeningPoint??2.22),rp=Number(m.readingPoint??2.5),wp=Number(m.writingOrderPoint??6);let wrong=[...l,...r,...w].filter(q=>q.answer&&!answerCorrect(q)).map(q=>({id:q.id,student:EXAM.answers[q.id]||'',correct:q.answer}));return{examId:EXAM.data.meta.title,level:EXAM.data.meta.level,studentName:EXAM.studentName,submittedAt:new Date().toISOString(),listeningCorrect:lc,listeningTotal:l.length,readingCorrect:rc,readingTotal:r.length,writingOrderCorrect:wc,writingOrderTotal:w.length,pictureAnswered:p.filter(isDone).length,pictureTotal:p.length,autoScore:+(lc*lp+rc*rp+wc*wp).toFixed(2),wrong,answers:{...EXAM.answers}}}
function renderResult(r){app.innerHTML=`<section class="page"><div class="result-box"><div class="section-title"><span class="cn">考试结果</span><span class="vi">Kết quả luyện đề</span></div><div class="score-big">${r.autoScore}</div><p class="result-note">Học viên: <b>${esc(r.studentName)}</b><br>Điểm tự động, chưa gồm điểm 96–100 do giáo viên chấm.</p><table class="score-table"><tr><th>Phần</th><th>Đúng</th><th>Điểm</th></tr><tr><td>Nghe</td><td>${r.listeningCorrect}/${r.listeningTotal}</td><td>${(r.listeningCorrect*Number(EXAM.data.meta?.listeningPoint??2.22)).toFixed(2)}</td></tr><tr><td>Đọc</td><td>${r.readingCorrect}/${r.readingTotal}</td><td>${(r.readingCorrect*Number(EXAM.data.meta?.readingPoint??2.5)).toFixed(2)}</td></tr><tr><td>Viết 86–95</td><td>${r.writingOrderCorrect}/${r.writingOrderTotal}</td><td>${(r.writingOrderCorrect*Number(EXAM.data.meta?.writingOrderPoint??6)).toFixed(2)}</td></tr><tr><td>Viết 96–100</td><td>${r.pictureAnswered}/${r.pictureTotal}</td><td>GV chấm</td></tr></table><h3>Câu sai / chưa làm</h3><div class="wrong-list">${r.wrong.length?r.wrong.map(w=>`<div class="wrong-item"><b>Câu ${w.id}</b> · Bạn: <code>${esc(w.student||'Chưa làm')}</code> · Đáp án: <code>${esc(w.correct)}</code></div>`).join(''):'Không có câu sai ở phần tự chấm.'}</div><div class="notice">${GOOGLE_SHEETS_WEB_APP_URL?'Kết quả đã được gửi lên Google Sheets.':''}</div><a class="btn secondary" href="#exam-${encodeURIComponent(EXAM.data.meta.id)}">Làm lại</a></div></section>`}
function saveResultLocally(r){try{const key='cobi_hsk_results';const old=JSON.parse(localStorage.getItem(key)||'[]');old.push(r);localStorage.setItem(key,JSON.stringify(old));}catch(e){console.warn('Không lưu được localStorage',e)}}
function sendResultToGoogleSheets(r){if(!GOOGLE_SHEETS_WEB_APP_URL)return;const payload={...r,answers:JSON.stringify(r.answers),wrong:JSON.stringify(r.wrong)};fetch(GOOGLE_SHEETS_WEB_APP_URL,{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(payload)}).then(()=>toast('Đã gửi kết quả lên Google Sheets.')).catch(()=>toast('Không gửi được Google Sheets; kết quả vẫn được lưu trên máy.'))}

window.addEventListener('hashchange',route);route();
