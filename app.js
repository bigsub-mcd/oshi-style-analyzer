const MAX_CARDS = 10;
const cards = document.querySelector('#cards');
const addButton = document.querySelector('#add-card');
const clearButton = document.querySelector('#clear-all');
const count = document.querySelector('#count');
const template = document.querySelector('#card-template');
const generate = document.querySelector('#generate');
const copy = document.querySelector('#copy');
const promptWrap = document.querySelector('#prompt-wrap');
const prompt = document.querySelector('#prompt');
const promptStatus = document.querySelector('#prompt-status');

function updateUI() {
  const total = cards.children.length;
  count.textContent = total;
  addButton.hidden = total >= MAX_CARDS;
  clearButton.hidden = total === 0;
}

function setImage(card, file) {
  if (!file || !file.type.startsWith('image/')) return;
  const reader = new FileReader();
  reader.onload = () => {
    const preview = card.querySelector('.preview');
    preview.src = reader.result;
    preview.hidden = false;
    card.querySelector('.image-placeholder').hidden = true;
  };
  reader.readAsDataURL(file);
}

function addCard() {
  if (cards.children.length >= MAX_CARDS) return;
  const card = template.content.firstElementChild.cloneNode(true);
  const drop = card.querySelector('.image-drop');
  card.querySelector('.remove').addEventListener('click', () => { card.remove(); updateUI(); });
  card.querySelector('.file-input').addEventListener('change', (event) => setImage(card, event.target.files[0]));
  drop.addEventListener('paste', (event) => {
    const image = [...event.clipboardData.items].find(item => item.type.startsWith('image/'));
    if (image) { event.preventDefault(); setImage(card, image.getAsFile()); }
  });
  drop.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); card.querySelector('.file-input').click(); } });
  cards.append(card);
  updateUI();
  card.querySelector('.work').focus();
}

function makePrompt() {
  const entries = [...cards.querySelectorAll('.character-card')].map((card, index) => ({
    work: card.querySelector('.work').value.trim(),
    name: card.querySelector('.name').value.trim(),
    index: index + 1
  })).filter(entry => entry.work || entry.name);

  if (!entries.length) { promptStatus.textContent = '최소 한 명을 입력해 주세요'; promptWrap.hidden = false; prompt.value = ''; copy.disabled = true; return; }
  const list = entries.map(e => `${e.index}. ${e.work || '작품명 미입력'} — ${e.name || '캐릭터명 미입력'}`).join('\n');
  prompt.value = `아래는 내가 좋아하는 캐릭터 목록이야. 각 캐릭터와 작품에 대한 일반적인 정보를 바탕으로, 내 취향의 공통점을 분석해줘.\n\n[최애 캐릭터 목록]\n${list}\n\n다음 형식으로 한국어로 답해줘.\n1. 한 문장으로 요약한 나의 취향\n2. 외형·분위기에서 반복되는 요소 (확실한 경우에만)\n3. 성격·관계성·서사에서 끌리는 패턴\n4. 이 취향을 가장 잘 표현하는 키워드 5개\n5. 내가 다음에 좋아할 법한 캐릭터/작품 추천 3개와 이유\n\n과도한 단정은 피하고, 목록만으로 판단하기 어려운 부분은 추측이라고 밝혀줘.`;
  promptStatus.textContent = `${entries.length}명의 캐릭터로 생성됨`;
  promptWrap.hidden = false;
  copy.disabled = false;
  promptWrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

addButton.addEventListener('click', addCard);
clearButton.addEventListener('click', () => { cards.replaceChildren(); promptWrap.hidden = true; copy.disabled = true; updateUI(); });
generate.addEventListener('click', makePrompt);
copy.addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(prompt.value); copy.textContent = '복사 완료 ✓'; setTimeout(() => copy.textContent = '프롬프트 복사', 1600); }
  catch { prompt.select(); document.execCommand('copy'); copy.textContent = '복사 완료 ✓'; setTimeout(() => copy.textContent = '프롬프트 복사', 1600); }
});

addCard();
