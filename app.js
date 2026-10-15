/* IELTS 個人練習室 · 無框架靜態網站 · 答案只來自提供的 PDF 抽取資料 */
'use strict';
const BANK=window.IELTS_BANK;
if(!BANK || !Array.isArray(BANK.words)) throw Error('找不到 data/bank.js 題庫檔');
const $=id=>document.getElementById(id);
const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const tidy=s=>String(s??'').trim().toLowerCase().replace(/\s+/g,' ').replace(/[’‘]/g,"'").replace(/[—–]/g,'-');
const randomize=a=>{let x=[...a];for(let i=x.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[x[i],x[j]]=[x[j],x[i]];}return x;};
const distinct=(xs,keyFn=x=>x)=>{let seen=new Set();return xs.filter(x=>{const key=keyFn(x);if(seen.has(key))return false;seen.add(key);return true;});};
const wordZh=w=>(w.zh||[]).join('；');
const sourcesOf=x=> x.sources?.length ? x.sources.map(y=>({file:y.file,page:y.page})) : [{file:x.source,page:x.page}];
const sourceText=x=>{const s=sourcesOf(x)[0];return s?`${String(s.file).replace(/\.pdf$/i,'')} · PDF 第 ${s.page} 頁`:'';};
const K='ielts_word_lab_progress_v3';
let wrong=new Set(),attempts={}, ratings={};
try{const p=JSON.parse(localStorage.getItem(K)||'{}');wrong=new Set(Array.isArray(p.wrong)?p.wrong:[]);attempts=p.attempts||{};ratings=p.ratings||{};}catch{}
function rateKey(){
 if(!studyPool.length)return null;
 const x=studyPool[studyIndex];return `${track}:${x.id}`;
}
function dueAt(x, t){const v=ratings[`${t}:${x.id}`];return !v||v.next<=Date.now();}
function setRating(level){
 const key=rateKey(); if(!key)return;
 const days=[0,0,1,3,7][level];
 ratings[key]={level,reviewed:Date.now(),next:Date.now()+days*86400000};
 save();const label=['','完全不會','有點印象','大致記得','完全掌握'][level];
 $('ratingStatus').textContent=`已記錄：${label}`;
 const buttons=document.querySelectorAll('[data-rating]');buttons.forEach(b=>b.classList.toggle('rating-active',Number(b.dataset.rating)===level));
}
function save(){try{localStorage.setItem(K,JSON.stringify({wrong:[...wrong],attempts,ratings}));}catch{}$('wrongCount').textContent=wrong.size;}
const VERIFIED=BANK.words.filter(w=>w.quizzable&&!w.review);
const OCR=BANK.words.filter(w=>w.quizzable&&w.review);
const REFERENCE=BANK.words.filter(w=>!w.quizzable);
const SYN=BANK.synonyms.filter(g=>g.related.length);
const AFF=BANK.affixes.filter(g=>g.examples.length);
const TYPE_LABEL={prefix:'字首',suffix:'字尾',root:'字根'};
let track='words',mode='study',studyPool=[],studyIndex=0,studyRevealed=false,activeSession=[],qi=0,score=0,misses=[],hasAnswered=false,activeType='spell',activeScope='verified',sessionWasWrong=false;
const CONFIG={
 words:{help:'看中文拼字，或看英文選出中文',tip:'複習時先看英文，試著說出中文；測驗可以切換成「看中文拼寫英文」。',
  types:[['spell','中翻英 · 拼字輸入'],['recognition','認字 · 英文選中文']],filters:[['verified','已確認文字題庫'],['withocr','包含掃描辨識（待複核）'],['affix','只練詞根詞綴例字'],['reading','只練閱讀資料']]},
 synonyms:{help:'先背同義群，再做「正向」或「反向」辨認',tip:'先說出核心詞的中文，再回想教材列出的替換詞。注意同組詞不保證每個語境都能互換。',
  types:[['synForward','核心詞 → 選出教材替換詞'],['synReverse','替換詞 → 找回核心詞']],filters:[['all','全部語義群組'],['multi','只練含 3 個以上替換詞的群組']]},
 affixes:{help:'先理解語義，再從例字反推詞根',tip:'試著用字首／字根／字尾去猜例字意思，再翻開看教材提供的單字家族。',
  types:[['affixMeaning','看到詞根 → 選出意思'],['affixFamily','看到詞根 → 選出同家族單字']],filters:[['all','全部'],['prefix','只練字首'],['suffix','只練字尾'],['root','只練字根'],['basic','基礎組'],['advanced','進階組']]}
};
function optHTML(items){return items.map(([v,t])=>`<option value="${safe(v)}">${safe(t)}</option>`).join('');}
function setTrack(t){
 track=t;for(const b of document.querySelectorAll('.track'))b.classList.toggle('active',b.dataset.track===t);
 $('trackHelp').textContent=CONFIG[t].help;
 $('studyTip').textContent=CONFIG[t].tip;
 const filterLists={words:[['verified','已確認中文的單字'],['due','今天需要複習'],['withocr','全部有中文的單字'],['affix','詞根詞綴例字'],['reading','閱讀資料'],['reference','索引詞條（未取得中文）']],synonyms:[['all','全部群組'],['due','今天需要複習'],['multi','同義詞較多的群組']],affixes:[['all','全部'],['due','今天需要複習'],['prefix','字首'],['suffix','字尾'],['root','字根'],['basic','基礎'],['advanced','進階']]};
 $('studyFilter').innerHTML=optHTML(filterLists[t]);
 $('quizType').innerHTML=optHTML(CONFIG[t].types);
 $('quizScope').innerHTML=optHTML(CONFIG[t].filters);
 $('searchTerm').value='';$('errorOnly').value='all';$('setupMessage').textContent='';
 studyIndex=0;filterStudy();if(mode==='exam')updateQuizNote();
}
function setMode(m){mode=m;$('studyScreen').classList.toggle('hidden',m!=='study');$('examSetup').classList.toggle('hidden',m!=='exam');
 $('studyTab').classList.toggle('selected',m==='study');$('examTab').classList.toggle('selected',m==='exam');
 $('studyTab').setAttribute('aria-selected',String(m==='study'));$('examTab').setAttribute('aria-selected',String(m==='exam'));}
function getPool(t,scope){
 if(t==='words'){
  if(scope==='due')return VERIFIED.filter(x=>dueAt(x,'words'));
  let pool=scope==='withocr'?[...VERIFIED,...OCR]:scope==='reference'?REFERENCE:VERIFIED;
  if(scope==='affix')pool=pool.filter(x=>x.labels.includes('affix_example'));
  if(scope==='reading')pool=pool.filter(x=>x.sources.some(s=>s.file.includes('阅读单词小范围高频体系')));
  return pool;
 }
 if(t==='synonyms')return scope==='multi'?SYN.filter(s=>s.related.length>=3):scope==='due'?SYN.filter(x=>dueAt(x,'synonyms')):SYN;
 return AFF.filter(g=>{
  if(scope==='due')return dueAt(g,'affixes');
  if(scope==='all')return true;
  if(scope==='basic')return !g.advanced;if(scope==='advanced')return g.advanced;
  return g.kind===scope;
 });
}
function filterStudy(){
 const q=tidy($('searchTerm').value);const scope=$('studyFilter').value;
 studyPool=getPool(track,scope).filter(x=>{
  if(!q)return true;
  const words=track==='words'?`${x.word} ${wordZh(x)}`:track==='synonyms'?`${x.base} ${x.zh} ${x.related.join(' ')}`:`${x.unit} ${x.meaning} ${x.examples.map(y=>y.word+' '+y.zh).join(' ')}`;
  return words.toLowerCase().includes(q);
 });
 studyIndex=0;renderStudy();
}
function renderStudy(){
 const count=studyPool.length;$('studyShowing').textContent=`找到 ${count.toLocaleString()} 筆 · ${count?studyIndex+1:0} / ${count}`;
 $('prevStudy').disabled=!count;$('nextStudy').disabled=!count;$('randomStudy').disabled=count<2;
 if(!count){$('flashType').textContent='NOT FOUND';$('flashIndex').textContent='';$('flashFront').textContent='沒有符合條件的資料';$('flashHint').textContent='換個關鍵字或範圍試試看';$('flashAnswer').classList.add('hidden');$('revealStudy').classList.add('hidden');$('flashSource').textContent='';return;}
 if(studyIndex<0||studyIndex>=count)studyIndex=0;
 const x=studyPool[studyIndex];studyRevealed=false;
 $('flashIndex').textContent=`CARD ${String(studyIndex+1).padStart(2,'0')}`;
 $('flashType').textContent=track==='words'?'WORD CARD':track==='synonyms'?'PARAPHRASE GROUP':`${TYPE_LABEL[x.kind]} · ${x.advanced?'ADVANCED':'BASIC'}`;
 $('flashFront').textContent=track==='words'?x.word:track==='synonyms'?x.base:x.unit;
 $('flashHint').textContent=track==='words'?(x.quizzable?'你知道這個單字的中文意思嗎？':'目前只保留英文索引，尚無可靠的中文對照；不進入測驗題庫。'):track==='synonyms'?`中文語義：${x.zh} · 你能想出幾個替換詞？`:'這個構詞成分表示什麼？你能想到相關例字嗎？';
 $('revealStudy').classList.remove('hidden');$('revealStudy').textContent='顯示答案 / 展開字族 ↓';$('flashAnswer').innerHTML='';$('flashAnswer').classList.add('hidden');$('ratingWrap').classList.add('hidden');
 $('flashSource').textContent=sourceText(x)+(track==='words'&&x.review?' · 掃描辨識待複核':'');
}
function revealStudy(){if(!studyPool.length)return;
 studyRevealed=!studyRevealed;const x=studyPool[studyIndex];
 $('flashAnswer').classList.toggle('hidden',!studyRevealed);$('ratingWrap').classList.toggle('hidden',!studyRevealed);$('revealStudy').textContent=studyRevealed?'收起答案 ↑':'顯示答案 / 展開字族 ↓';
 if(!studyRevealed)return;
 const prev=ratings[rateKey()];$('ratingStatus').textContent=prev?`上次熟悉度：${['','完全不會','有點印象','大致記得','完全掌握'][prev.level]}`:'選擇熟悉度，安排下次複習';
 document.querySelectorAll('[data-rating]').forEach(b=>b.classList.toggle('rating-active',Number(b.dataset.rating)===prev?.level));
 if(track==='words')$('flashAnswer').innerHTML=`<strong>${safe(wordZh(x)||'尚未核對中文翻譯')}</strong><div class="chips">${x.pos.map(p=>`<span class="chip">${safe(p)}</span>`).join('')}${x.review?'<span class="chip">OCR 待複核</span>':''}</div>`;
 else if(track==='synonyms')$('flashAnswer').innerHTML=`<strong>${safe(x.zh)}</strong><div class="chips">${x.related.map(w=>`<span class="chip">${safe(w)}</span>`).join('')}</div><p style="font-size:12px;color:#7d9289;margin-top:12px">教材語義群組，實際替換須確認語境及詞性。</p>`;
 else $('flashAnswer').innerHTML=`<strong>${safe(x.meaning)}</strong><p style="font-size:12px;color:#66847b;margin:6px 0">例字（${x.examples.length}）</p><ul class="example-list">${x.examples.map(e=>`<li><b>${safe(e.word)}</b> — ${safe(e.zh)}</li>`).join('')}</ul>`;
}
function nextStudy(step){if(!studyPool.length)return;studyIndex=(studyIndex+step+studyPool.length)%studyPool.length;renderStudy();}
function updateQuizNote(){
 $('ocrNote').textContent=track==='words'?$('quizScope').value==='withocr'?'你選了「含 OCR」：將包含掃描版擷取但未逐筆核對的中文解釋。建議把不確定的題目當作複習提醒。':'預設只使用已有可靠中文對照的資料；未驗證的掃描詞義暫不當成標準答案。':track==='synonyms'?'依照來源教材的「同義替換／語義群組」出題；有些詞不一定能在所有句子中直接替換。':'根據來源教材的分類與例字出題；字根與字尾的語義有時會因構詞歷史或語境而改變。';
}
function mkChoices(right, candidates, labelFn=x=>x){
 const r=labelFn(right);const distract=distinct(randomize(candidates).filter(x=>labelFn(x)!==r),labelFn).slice(0,3);
 if(distract.length<3)return null;
 return randomize([{value:r,correct:true},...distract.map(x=>({value:labelFn(x),correct:false}))]);
}
function makeQ(t,x,sub,pool){
 if(t==='words'){
  let z=wordZh(x), id=`words:${sub}:${x.id}`;
  if(sub==='spell')return {id,t,sub,kind:'spell',prompt:z,caption:`看中文，拼出正確的英文 · ${x.word[0].toUpperCase()} 開頭 · ${x.word.length} 個字母`,answer:x.word,explain:`${x.word} — ${z}`,origin:x,questionWord:x.word};
  const options=mkChoices(x,pool.filter(y=>y.id!==x.id&&!wordZh(y).includes(z)&&!z.includes(wordZh(y))),wordZh);
  return options?{id,t,sub,kind:'choice',prompt:x.word,caption:'英文認字：選出中文意思',answer:z,choices:options,explain:`${x.word} — ${z}`,origin:x,questionWord:x.word}:null;
 }
 if(t==='synonyms'){
  if(sub==='synForward'){
   const a=randomize(x.related)[0];
   const other=pool.filter(y=>y.id!==x.id).flatMap(y=>y.related).filter(w=>!x.related.includes(w)&&w!==x.base);
   const choices=mkChoices(a,other);
   return choices?{id:`synonyms:synForward:${x.id}`,t,sub,kind:'choice',prompt:x.base,caption:'哪一個出現在教材的同義替換群組？',answer:a,choices,explain:`${x.base}（${x.zh}）→ ${x.related.join(' / ')}`,origin:x,questionWord:x.base}:null;
  }
  // Use unique source relationship to avoid ambiguous reverse question
  const a=randomize(x.related.filter(w=>SYN.filter(g=>g.related.includes(w)).length===1))[0];
  if(!a)return null;
  const bases=pool.filter(y=>y.id!==x.id&&!y.related.includes(a)).map(y=>y.base);
  const choices=mkChoices(x.base,bases);
  return choices?{id:`synonyms:synReverse:${x.id}`,t,sub,kind:'choice',prompt:a,caption:'這個詞在原教材屬於哪個核心詞語義群？',answer:x.base,choices,explain:`${x.base}（${x.zh}）→ ${x.related.join(' / ')}`,origin:x,questionWord:x.base}:null;
 }
 if(sub==='affixMeaning'){
  const other=pool.filter(y=>y.id!==x.id).map(y=>y.meaning);
  const choices=mkChoices(x.meaning,other);
  return choices?{id:`affixes:affixMeaning:${x.id}`,t,sub,kind:'choice',prompt:x.unit,caption:`選出這個${TYPE_LABEL[x.kind]}的意思`,answer:x.meaning,choices,explain:`${x.unit}：${x.meaning}。例字：${x.examples.slice(0,4).map(z=>z.word).join(' / ')}`,origin:x,questionWord:x.unit}:null;
 }
 const chosen=randomize(x.examples)[0]?.word;
 const own=new Set(x.examples.map(e=>e.word));
 const other=pool.filter(y=>y.id!==x.id).flatMap(y=>y.examples.map(e=>e.word)).filter(w=>!own.has(w));
 const choices=mkChoices(chosen,other);
 return choices?{id:`affixes:affixFamily:${x.id}`,t,sub,kind:'choice',prompt:x.unit,caption:'哪一個單字是來源教材列出的同一家族例字？',answer:chosen,choices,explain:`${x.unit}（${x.meaning}）：${x.examples.map(e=>e.word+' '+e.zh).join('；')}`,origin:x,questionWord:x.unit}:null;
}
function startQuiz(onlyMissedFromSession=false){
 activeType=$('quizType').value;activeScope=$('quizScope').value;sessionWasWrong=$('errorOnly').value==='wrong'||onlyMissedFromSession;
 let pool=getPool(track,activeScope);
 if(!pool.length){$('setupMessage').textContent='這個範圍還沒有可用題目。';return;}
 const questions=randomize(pool).map(x=>makeQ(track,x,activeType,pool)).filter(Boolean);
 let filtered=questions;
 if(onlyMissedFromSession){const idset=new Set(misses.map(q=>q.id));filtered=questions.filter(q=>idset.has(q.id));}
 else if(sessionWasWrong)filtered=questions.filter(q=>wrong.has(q.id));
 let wanted=$('questionCount').value==='all'?filtered.length:Number($('questionCount').value);
 if(!filtered.length){$('setupMessage').textContent='目前這組題型沒有符合條件的錯題，或題庫不足。可先選「全部」做一般測驗。';return;}
 activeSession=filtered.slice(0,wanted);qi=0;score=0;misses=[];hasAnswered=false;
 $('mainPanel').classList.add('hidden');$('resultScreen').classList.add('hidden');$('quizScreen').classList.remove('hidden');renderQuestion();window.scrollTo({top:0,behavior:'smooth'});
}
function renderQuestion(){
 hasAnswered=false;const q=activeSession[qi];
 $('quizProgressText').textContent=`第 ${qi+1} / ${activeSession.length} 題`;
 $('liveScore').textContent=`正確 ${score}`;
 $('progressFill').style.width=(qi/activeSession.length*100)+'%';
 $('questionType').textContent=track==='words'?'WORD KNOWLEDGE':track==='synonyms'?'SYNONYM RECOGNITION':'WORD FORMATION';
 $('questionInstruction').textContent=q.caption;$('questionPrompt').textContent=q.prompt;
 $('questionExtra').textContent=track==='affixes'?`${TYPE_LABEL[q.origin.kind]} · ${q.origin.advanced?'進階':'基礎'}`:track==='words'?(q.origin.review?'掃描辨識／待複核':''):q.origin.zh;
 $('feedback').className='feedback hidden';$('feedback').textContent='';$('nextQuestion').classList.add('hidden');
 const box=$('answerArea');box.innerHTML='';
 if(q.kind==='spell'){
  const form=document.createElement('form');form.className='spell-form';
  form.innerHTML='<input id="spellInput" aria-label="輸入英文拼字" placeholder="Type the English word..." autocomplete="off" autocapitalize="off" spellcheck="false" required><button class="primary-btn" type="submit">送出答案</button>';
  form.onsubmit=e=>{e.preventDefault();if(hasAnswered)return;const val=$('spellInput').value;if(!val.trim())return;submitAnswer(tidy(val)===tidy(q.answer),'')};box.appendChild(form);setTimeout(()=>$('spellInput')?.focus(),50);
 }else{
  const wrap=document.createElement('div');wrap.className='choices';
  q.choices.forEach((opt,i)=>{const btn=document.createElement('button');btn.className='answer-choice';btn.type='button';btn.dataset.right=String(opt.correct);btn.innerHTML=`<span class="choice-prefix">${'ABCD'[i]}.</span>${safe(opt.value)}`;btn.onclick=()=>submitAnswer(opt.correct,btn);wrap.appendChild(btn);});box.appendChild(wrap);
 }
}
function submitAnswer(right,selected){
 if(hasAnswered)return;hasAnswered=true;const q=activeSession[qi];
 if(right){score++;wrong.delete(q.id)}else{wrong.add(q.id);misses.push(q)}
 const a=attempts[q.id]||{right:0,wrong:0};a[right?'right':'wrong']++;a.last=Date.now();attempts[q.id]=a;save();
 if(q.kind==='choice')for(const b of document.querySelectorAll('.answer-choice')){b.disabled=true;if(b.dataset.right==='true')b.classList.add('correct');else if(b===selected)b.classList.add('incorrect');}
 else {const inp=$('spellInput');if(inp)inp.disabled=true;const btn=$('answerArea').querySelector('button');if(btn)btn.disabled=true;}
 const fb=$('feedback');fb.className='feedback'+(right?'':' bad');
 fb.innerHTML=`<strong>${right?'✓ 答對了！':'✕ 再記住這一題'}</strong><p>${safe(q.explain)}</p><small>${safe(sourceText(q.origin))}${q.origin.review?' · 辨識文字待核對':''}</small>${q.t==='synonyms'?'<p class="tagline">同義替換需依句子語境與詞性判斷。</p>':''}`;
 $('liveScore').textContent=`正確 ${score}`;$('progressFill').style.width=((qi+1)/activeSession.length*100)+'%';
 $('nextQuestion').textContent=qi===activeSession.length-1?'查看測驗結果 →':'下一題 →';$('nextQuestion').classList.remove('hidden');
}
function finishQuiz(){
 $('quizScreen').classList.add('hidden');$('resultScreen').classList.remove('hidden');
 $('resultPercent').textContent=Math.round(score/activeSession.length*100)+'%';$('resultText').textContent=`共 ${activeSession.length} 題 · 答對 ${score} 題 · 答錯 ${misses.length} 題`;
 $('retryWrong').disabled=misses.length===0;$('missedList').innerHTML=misses.slice(0,24).map(q=>`<div class="missed-item"><strong>${safe(q.questionWord)}</strong>${safe(q.answer)}</div>`).join('');
 window.scrollTo({top:0,behavior:'smooth'});
}
function showHome(){ $('quizScreen').classList.add('hidden');$('resultScreen').classList.add('hidden');$('mainPanel').classList.remove('hidden');$('setupMessage').textContent='';window.scrollTo({top:0,behavior:'smooth'});}
function exportProgress(){const blob=new Blob([JSON.stringify({version:2,date:new Date().toISOString(),wrong:[...wrong],attempts,ratings},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='IELTS_學習紀錄.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),500);}
async function importProgress(file){if(!file)return;try{const obj=JSON.parse(await file.text());if(!Array.isArray(obj.wrong)||typeof obj.attempts!=='object')throw Error('檔案格式不正確');wrong=new Set(obj.wrong.filter(x=>typeof x==='string'));attempts=obj.attempts;ratings=obj.ratings||{};save();alert('學習紀錄已匯入。')}catch(e){alert('無法匯入：'+e.message)}}
$('brandLink').onclick=e=>{e.preventDefault();showHome();setMode('study')};
for(const b of document.querySelectorAll('.track'))b.onclick=()=>setTrack(b.dataset.track);
$('studyTab').onclick=()=>setMode('study');$('examTab').onclick=()=>setMode('exam');
$('searchTerm').oninput=filterStudy;$('studyFilter').onchange=filterStudy;
$('prevStudy').onclick=()=>nextStudy(-1);$('nextStudy').onclick=()=>nextStudy(1);$('randomStudy').onclick=()=>{if(studyPool.length<2)return;studyIndex=(studyIndex+1+Math.floor(Math.random()*(studyPool.length-1)))%studyPool.length;renderStudy()};$('revealStudy').onclick=revealStudy;
$('quizScope').onchange=updateQuizNote;$('quizType').onchange=updateQuizNote;
$('startQuiz').onclick=()=>startQuiz();$('nextQuestion').onclick=()=>qi+1<activeSession.length?(qi++,renderQuestion()):finishQuiz();
$('exitQuiz').onclick=()=>{if(confirm('要結束這一回合嗎？已答題的錯題紀錄會保留。')){showHome();setMode('exam')}};
$('retryWrong').onclick=()=>{if(!misses.length)return;const keep=[...misses];activeSession=keep;qi=0;score=0;misses=[];hasAnswered=false;$('mainPanel').classList.add('hidden');$('resultScreen').classList.add('hidden');$('quizScreen').classList.remove('hidden');renderQuestion();};
$('backToSetup').onclick=()=>{showHome();setMode('exam')};
$('exportBtn').onclick=exportProgress;$('importBtn').onclick=()=>$('importFile').click();$('importFile').onchange=e=>importProgress(e.target.files[0]);
for(const b of document.querySelectorAll('[data-rating]'))b.onclick=()=>setRating(Number(b.dataset.rating));
$('clearProgress').onclick=()=>{if(!confirm('確定要清除這台裝置上的錯題與練習次數嗎？'))return;wrong.clear();attempts={};ratings={};save();};
$('wordCount').textContent=VERIFIED.length.toLocaleString('zh-TW');$('synCount').textContent=SYN.length.toLocaleString('zh-TW');$('affCount').textContent=AFF.length.toLocaleString('zh-TW');
$('coverageText').textContent=`共六份 PDF，合計 ${BANK.report.total_pages} 頁。包含原文可擷取文字及掃描影像；掃描的中文可能有斷字、誤字。目前可直接練習 ${BANK.report.quizzable_verified} 筆中英對照；另有 ${BANK.report.quizzable_ocr_review} 筆待複核中文，以及 ${BANK.report.index_only} 個索引詞條。待複核可在範圍選單中自行加入；無中文對照的索引不會變成中翻英標準答案。網站未附 PDF 全文、例句或影像。個人進度存在本機瀏覽器，不會跨裝置同步。`;save();setTrack('words');setMode('study');
