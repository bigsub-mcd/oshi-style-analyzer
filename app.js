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
const makePoster = document.querySelector('#make-poster');
const posterResult = document.querySelector('#poster-result');
const posterPreview = document.querySelector('#poster-preview');
const sharePoster = document.querySelector('#share-poster');
const downloadPoster = document.querySelector('#download-poster');
const posterStatus = document.querySelector('#poster-status');
let posterBlob;

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
    card.querySelector('.image-status').textContent = '이미지를 넣었어요.';
  };
  reader.readAsDataURL(file);
}

async function pasteImage(card) {
  const button = card.querySelector('.image-paste');
  const status = card.querySelector('.image-status');
  if (!navigator.clipboard?.read) {
    status.textContent = '이 브라우저에서는 클립보드 붙여넣기를 지원하지 않아요. 이미지 업로드를 이용해 주세요.';
    return;
  }
  button.disabled = true;
  button.textContent = '붙여넣는 중…';
  try {
    const items = await navigator.clipboard.read();
    for (const item of items) {
      const imageType = item.types.find(type => type.startsWith('image/'));
      if (imageType) {
        setImage(card, await item.getType(imageType));
        return;
      }
    }
    status.textContent = '클립보드에서 이미지를 찾지 못했어요.';
  } catch {
    status.textContent = '클립보드 접근을 허용하지 못했어요. 이미지 업로드를 이용해 주세요.';
  } finally {
    button.disabled = false;
    button.textContent = '클립보드 붙여넣기';
  }
}

function addCard() {
  if (cards.children.length >= MAX_CARDS) return;
  const card = template.content.firstElementChild.cloneNode(true);
  card.querySelector('.remove').addEventListener('click', () => { card.remove(); updateUI(); });
  card.querySelector('.file-input').addEventListener('change', (event) => setImage(card, event.target.files[0]));
  card.querySelector('.image-paste').addEventListener('click', () => pasteImage(card));
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

function posterEntries() {
  return [...cards.querySelectorAll('.character-card')].map(card => ({
    image: card.querySelector('.preview').src,
    hasImage: !card.querySelector('.preview').hidden,
    work: card.querySelector('.work').value.trim() || '작품명 미입력',
    name: card.querySelector('.name').value.trim() || '이름 미입력'
  })).filter(entry => entry.hasImage);
}

function loadImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Image could not be loaded'));
    image.src = source;
  });
}

function canvasToPng(canvas) {
  return new Promise((resolve, reject) => {
    const fallback = () => {
      try {
        const dataUrl = canvas.toDataURL('image/png');
        const [header, data] = dataUrl.split(',');
        const mime = header.match(/data:(.*?);/)?.[1] || 'image/png';
        const bytes = atob(data);
        const array = new Uint8Array(bytes.length);
        for (let index = 0; index < bytes.length; index += 1) array[index] = bytes.charCodeAt(index);
        resolve(new Blob([array], { type: mime }));
      } catch (error) { reject(error); }
    };
    if (!canvas.toBlob) { fallback(); return; }
    canvas.toBlob(blob => { if (blob) resolve(blob); else fallback(); }, 'image/png');
  });
}

function drawCover(context, image, x, y, width, height) {
  const scale = Math.max(width / image.width, height / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  context.drawImage(image, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight);
}

async function createPoster() {
  const entries = posterEntries();
  if (!entries.length) {
    posterBlob = undefined;
    posterStatus.textContent = '사진을 한 장 이상 넣어야 포스터를 만들 수 있어요.';
    posterResult.hidden = false;
    posterPreview.removeAttribute('src');
    sharePoster.disabled = true;
    downloadPoster.disabled = true;
    return;
  }

  makePoster.disabled = true;
  makePoster.textContent = '포스터 만드는 중…';
  posterBlob = undefined;
  try {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 1080;
    canvas.height = 1350;
    // Keep the exported poster soft and let the magenta frame be the single accent.
    context.fillStyle = '#fcfcfc';
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.strokeStyle = '#f2a8cd';
    context.lineWidth = 4;
    context.strokeRect(18, 18, canvas.width - 36, canvas.height - 36);

    context.fillStyle = '#d976a8';
    context.font = '500 24px "DM Mono", monospace';
    context.fillText('MY CHARACTER ARCHIVE', 72, 86);
    context.fillStyle = '#20383e';
    context.font = '700 58px "Noto Sans KR", sans-serif';
    context.fillText('내가 사랑한 캐릭터들', 72, 160);
    context.strokeStyle = '#78d8c8';
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(72, 203);
    context.lineTo(1008, 203);
    context.stroke();

    const columns = entries.length <= 2 ? entries.length : entries.length <= 6 ? 2 : 3;
    const rows = Math.ceil(entries.length / columns);
    const gap = 20;
    const edge = 72;
    const gridTop = 244;
    const gridBottom = 88;
    const cardWidth = (canvas.width - edge * 2 - gap * (columns - 1)) / columns;
    const cardHeight = (canvas.height - gridTop - gridBottom - gap * (rows - 1)) / rows;
    const captionHeight = 92;
    const imageHeight = Math.max(100, cardHeight - captionHeight);
    const images = await Promise.all(entries.map(entry => loadImage(entry.image)));

    entries.forEach((entry, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      const x = edge + column * (cardWidth + gap);
      const y = gridTop + row * (cardHeight + gap);
      context.fillStyle = '#ffffff';
      context.fillRect(x, y, cardWidth, cardHeight);
      context.save();
      context.beginPath();
      context.rect(x, y, cardWidth, imageHeight);
      context.clip();
      drawCover(context, images[index], x, y, cardWidth, imageHeight);
      context.restore();
      const work = entry.work.length > 22 ? `${entry.work.slice(0, 22)}…` : entry.work;
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillStyle = '#63797c';
      context.font = '500 21px "Noto Sans KR", sans-serif';
      context.fillText(work, x + cardWidth / 2, y + imageHeight + 29);
      context.fillStyle = '#20383e';
      context.font = '700 32px "Noto Sans KR", sans-serif';
      const name = entry.name.length > 14 ? `${entry.name.slice(0, 14)}…` : entry.name;
      context.fillText(name, x + cardWidth / 2, y + imageHeight + 63);
    });
    context.textAlign = 'start';
    posterBlob = await canvasToPng(canvas);
    if (!posterBlob) throw new Error('Poster export failed');
    if (posterPreview.src.startsWith('blob:')) URL.revokeObjectURL(posterPreview.src);
    posterPreview.src = URL.createObjectURL(posterBlob);
    posterStatus.textContent = `${entries.length}명의 캐릭터로 포스터를 만들었어요.`;
    posterResult.hidden = false;
    sharePoster.disabled = false;
    downloadPoster.disabled = false;
    posterResult.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } catch (error) {
    console.error('Poster creation failed:', error);
    posterStatus.textContent = '포스터를 만들지 못했어요. 사진을 다시 선택하거나 PNG·JPG 형식인지 확인해 주세요.';
    posterResult.hidden = false;
    sharePoster.disabled = true;
    downloadPoster.disabled = true;
  } finally {
    makePoster.disabled = false;
    makePoster.innerHTML = '<span>포스터 만들기</span><i aria-hidden="true">↗</i>';
  }
}

function savePoster() {
  if (!posterBlob) return;
  const link = document.createElement('a');
  link.href = posterPreview.src;
  link.download = 'my-character-archive.png';
  link.click();
}

async function shareGeneratedPoster() {
  if (!posterBlob) return;
  const file = new File([posterBlob], 'my-character-archive.png', { type: 'image/png' });
  try {
    if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
      await navigator.share({ title: '나의 최애 캐릭터 아카이브', text: '내가 사랑한 캐릭터들', files: [file] });
      posterStatus.textContent = '공유 창을 열었어요.';
    } else {
      savePoster();
      posterStatus.textContent = '이 브라우저에서는 PNG 파일로 저장했어요.';
    }
  } catch (error) {
    if (error.name !== 'AbortError') posterStatus.textContent = '공유하지 못했어요. PNG 저장을 이용해 주세요.';
  }
}

addButton.addEventListener('click', addCard);
clearButton.addEventListener('click', () => {
  cards.replaceChildren();
  promptWrap.hidden = true;
  posterResult.hidden = true;
  posterBlob = undefined;
  copy.disabled = true;
  updateUI();
});
generate.addEventListener('click', makePrompt);
makePoster.addEventListener('click', createPoster);
downloadPoster.addEventListener('click', savePoster);
sharePoster.addEventListener('click', shareGeneratedPoster);
copy.addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(prompt.value); copy.textContent = '복사 완료 ✓'; setTimeout(() => copy.textContent = '프롬프트 복사', 1600); }
  catch { prompt.select(); document.execCommand('copy'); copy.textContent = '복사 완료 ✓'; setTimeout(() => copy.textContent = '프롬프트 복사', 1600); }
});

addCard();
