// ── Helpers ────────────────────────────────────────────────────────────────

async function loadJSON(path) {
  const res = await fetch(`data/${path}`);
  if (!res.ok) throw new Error(`Impossible de charger ${path}`);
  return res.json();
}

const app  = document.getElementById('app');
const crumbs = document.getElementById('breadcrumb');

// ── Navigation stack  [{label, action}]
const stack = [];

function pushCrumb(label, action) {
  stack.push({ label, action });
  renderBreadcrumb();
}

function renderBreadcrumb() {
  crumbs.innerHTML = '';
  stack.forEach((item, i) => {
    if (i > 0) {
      const sep = document.createElement('span');
      sep.className = 'sep';
      sep.textContent = '›';
      crumbs.appendChild(sep);
    }
    const btn = document.createElement('button');
    btn.className = 'crumb';
    btn.textContent = item.label;
    btn.addEventListener('click', () => {
      stack.splice(i + 1);
      renderBreadcrumb();
      item.action();
    });
    crumbs.appendChild(btn);
  });
}

// ── Screens ────────────────────────────────────────────────────────────────

async function showClasses() {
  app.innerHTML = '<p class="loading">Chargement…</p>';
  const index = await loadJSON('index.json');

  const metas = await Promise.all(
    index.classes.map(id => loadJSON(`classes/${id}/meta.json`).then(m => ({ id, path: `classes/${id}`, ...m })))
  );

  app.innerHTML = `<h2 class="section-title">Choisissez votre classe</h2>
    <div class="grid">${metas.map(c =>
      `<button class="card" data-id="${c.id}" data-path="${c.path}">
         <h2>${c.label}</h2>
         ${c.description ? `<p>${c.description}</p>` : ''}
       </button>`
    ).join('')}</div>`;

  app.querySelectorAll('.card').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = metas.find(c => c.id === btn.dataset.id);
      pushCrumb(item.label, () => showMatieres(item));
      showMatieres(item);
    });
  });
}

async function showMatieres(classe) {
  app.innerHTML = '<p class="loading">Chargement…</p>';
  const metas = await Promise.all(
    classe.matieres.map(id =>
      loadJSON(`${classe.path}/${id}/meta.json`).then(d => ({ id, path: id, classePath: classe.path, ...d }))
    )
  );

  app.innerHTML = `<h2 class="section-title">Matières — ${classe.label}</h2>
    <div class="grid">${metas.map(m =>
      `<button class="card" data-id="${m.id}">
         <h2>${m.label}</h2>
         ${m.description ? `<p>${m.description}</p>` : ''}
       </button>`
    ).join('')}</div>`;

  app.querySelectorAll('.card').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = metas.find(m => m.id === btn.dataset.id);
      pushCrumb(item.label, () => showChapitres(item));
      showChapitres(item);
    });
  });
}

async function showChapitres(matiere) {
  app.innerHTML = '<p class="loading">Chargement…</p>';
  const basePath = `${matiere.classePath}/${matiere.path}`;
  const metas = await Promise.all(
    matiere.chapitres.map(id =>
      loadJSON(`${basePath}/${id}/meta.json`).then(d => ({ id, path: id, basePath, ...d }))
    )
  );

  app.innerHTML = `<h2 class="section-title">Chapitres — ${matiere.label}</h2>
    <div class="grid">${metas.map(ch =>
      `<button class="card" data-id="${ch.id}">
         <h2>${ch.label}</h2>
         ${ch.description ? `<p>${ch.description}</p>` : ''}
       </button>`
    ).join('')}</div>`;

  app.querySelectorAll('.card').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = metas.find(ch => ch.id === btn.dataset.id);
      pushCrumb(item.label, () => showModes(item));
      showModes(item);
    });
  });
}

function showModes(chapitre) {
  const chPath = `${chapitre.basePath}/${chapitre.path}`;
  const hasQuiz = chapitre.id === 'uaa4-modelage';
  const hasLeitner = chapitre.id === 'uaa4-modelage';
  app.innerHTML = `
    <h2 class="section-title">${chapitre.label}</h2>
    ${chapitre.description ? `<p style="color:var(--muted);margin-bottom:1.5rem">${chapitre.description}</p>` : ''}
    <div class="mode-grid">
      <button class="mode-btn" id="btn-qcm">
        <span class="icon">✏️</span> QCM
      </button>
      ${hasQuiz ? `<button class="mode-btn" id="btn-quiz">
        <span class="icon">🎮</span> Quiz interactif
      </button>` : ''}
      ${hasLeitner ? `<button class="mode-btn" id="btn-leitner">
        <span class="icon">🧠</span> Flashcards Leitner
      </button>` : ''}
    </div>`;

  document.getElementById('btn-qcm').addEventListener('click', () => {
    pushCrumb('QCM', () => startQCM(chPath));
    startQCM(chPath);
  });
  if (hasQuiz) {
    document.getElementById('btn-quiz').addEventListener('click', () => {
      window.location.href = 'quiz-principes-actifs-uaa4.html';
    });
  }
  if (hasLeitner) {
    document.getElementById('btn-leitner').addEventListener('click', () => {
      window.location.href = 'data/classes/5eq/sa/uaa4-modelage/index.html';
    });
  }
}

// ── QCM ────────────────────────────────────────────────────────────────────

async function startQCM(chPath) {
  app.innerHTML = '<p class="loading">Chargement…</p>';
  const questions = await loadJSON(`${chPath}/qcm.json`);
  let idx = 0;
  let score = 0;

  function renderQuestion() {
    if (idx >= questions.length) {
      renderScore();
      return;
    }
    const q = questions[idx];
    app.innerHTML = `
      <div class="qcm-wrap">
        <p class="qcm-progress">Question ${idx + 1} / ${questions.length}</p>
        <p class="qcm-question">${q.question}</p>
        <div class="qcm-options">
          ${q.options.map((opt, i) =>
            `<button class="qcm-option" data-index="${i}">${opt}</button>`
          ).join('')}
        </div>
        <div class="qcm-explication" id="explication">${q.explication}</div>
        <button class="btn" id="btn-next" disabled>Question suivante →</button>
      </div>`;

    const btnNext = document.getElementById('btn-next');
    const expDiv  = document.getElementById('explication');

    app.querySelectorAll('.qcm-option').forEach(btn => {
      btn.addEventListener('click', () => {
        const chosen = parseInt(btn.dataset.index);
        app.querySelectorAll('.qcm-option').forEach(b => b.disabled = true);
        expDiv.classList.add('visible');
        if (chosen === q.reponse) {
          btn.classList.add('correct');
          score++;
        } else {
          btn.classList.add('wrong');
          app.querySelectorAll('.qcm-option')[q.reponse].classList.add('correct');
        }
        btnNext.disabled = false;
      });
    });

    btnNext.addEventListener('click', () => {
      idx++;
      renderQuestion();
    });
  }

  function renderScore() {
    const pct = Math.round((score / questions.length) * 100);
    app.innerHTML = `
      <div class="qcm-score">
        <h3>${score} / ${questions.length} — ${pct} %</h3>
        <p>${pct >= 70 ? 'Bien joué !' : 'Continuez à réviser !'}</p>
        <button class="btn" id="btn-retry">Recommencer</button>
      </div>`;
    document.getElementById('btn-retry').addEventListener('click', () => {
      idx = 0; score = 0; renderQuestion();
    });
  }

  renderQuestion();
}

// ── Flashcards ──────────────────────────────────────────────────────────────

async function startFlashcards(chPath) {
  app.innerHTML = '<p class="loading">Chargement…</p>';
  const cards = await loadJSON(`${chPath}/flashcards.json`);
  let idx = 0;
  let flipped = false;

  function render() {
    const card = cards[idx];
    app.innerHTML = `
      <div class="fc-wrap">
        <p class="fc-progress">${idx + 1} / ${cards.length}</p>
        <div class="fc-card${flipped ? ' verso' : ''}" id="fc-card" tabindex="0">
          <span class="fc-label">${flipped ? 'Réponse' : 'Question'}</span>
          <p class="fc-text">${flipped ? card.verso : card.recto}</p>
        </div>
        <p class="fc-hint">Cliquez sur la carte pour la retourner</p>
        <div class="fc-nav">
          <button class="btn-ghost" id="btn-prev" ${idx === 0 ? 'disabled' : ''}>← Précédente</button>
          <button class="btn-ghost" id="btn-next" ${idx === cards.length - 1 ? 'disabled' : ''}>Suivante →</button>
        </div>
      </div>`;

    document.getElementById('fc-card').addEventListener('click', () => {
      flipped = !flipped;
      render();
    });
    document.getElementById('fc-card').addEventListener('keydown', e => {
      if (e.key === ' ' || e.key === 'Enter') { flipped = !flipped; render(); }
    });

    const prev = document.getElementById('btn-prev');
    const next = document.getElementById('btn-next');
    prev.addEventListener('click', () => { idx--; flipped = false; render(); });
    next.addEventListener('click', () => { idx++; flipped = false; render(); });
  }

  render();
}

// ── Init ────────────────────────────────────────────────────────────────────

(async () => {
  try {
    stack.length = 0;
    pushCrumb('Accueil', showClasses);
    await showClasses();
  } catch (e) {
    app.innerHTML = `<p class="loading" style="color:var(--red)">
      Erreur : ${e.message}<br><small>Ouvrez ce site via un serveur local (ex. : <code>npx serve .</code>).</small>
    </p>`;
  }
})();
