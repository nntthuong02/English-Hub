
// Unified Storage Management (Firestore + LocalStorage Sync Adapter)
const DB = {
  _getKey(userId, collection) {
    return `eh_${userId}_${collection}`;
  },

  initUser(userId) {
    const key = `eh_profile_${userId}`;
    let profile = JSON.parse(localStorage.getItem(key) || '{}');
    if (!profile.createdAt) {
      profile = {
        userId,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        streak: 1
      };
      localStorage.setItem(key, JSON.stringify(profile));
    }
  },

  // Vocabulary progress: { [wordId]: { learned: true, correct: 0, wrong: 0, lastReviewed: string } }
  getVocabProgress(userId) {
    const raw = localStorage.getItem(this._getKey(userId, 'vocab_progress'));
    return raw ? JSON.parse(raw) : {};
  },

  saveVocabProgress(userId, wordId, isLearned, isCorrect = null) {
    const data = this.getVocabProgress(userId);
    if (!data[wordId]) {
      data[wordId] = { learned: false, correct: 0, wrong: 0, lastReviewed: new Date().toISOString() };
    }
    if (isLearned !== null) data[wordId].learned = isLearned;
    if (isCorrect === true) data[wordId].correct = (data[wordId].correct || 0) + 1;
    if (isCorrect === false) data[wordId].wrong = (data[wordId].wrong || 0) + 1;
    data[wordId].lastReviewed = new Date().toISOString();

    localStorage.setItem(this._getKey(userId, 'vocab_progress'), JSON.stringify(data));

    // Optional Firestore sync
    if (window.isFirebaseActive && window.firestoreDb) {
      window.firestoreDb.collection('users').doc(userId).collection('vocab_progress').doc(wordId).set(data[wordId], { merge: true });
    }
    return data[wordId];
  },

  // Grammar progress: { [day]: { completed: true, score: 90, attempts: 2 } }
  getGrammarProgress(userId) {
    const raw = localStorage.getItem(this._getKey(userId, 'grammar_progress'));
    return raw ? JSON.parse(raw) : {};
  },

  saveGrammarProgress(userId, day, score) {
    const data = this.getGrammarProgress(userId);
    if (!data[day]) {
      data[day] = { completed: true, bestScore: score, attempts: 1, lastCompleted: new Date().toISOString() };
    } else {
      data[day].completed = true;
      data[day].bestScore = Math.max(data[day].bestScore || 0, score);
      data[day].attempts = (data[day].attempts || 1) + 1;
      data[day].lastCompleted = new Date().toISOString();
    }
    localStorage.setItem(this._getKey(userId, 'grammar_progress'), JSON.stringify(data));

    if (window.isFirebaseActive && window.firestoreDb) {
      window.firestoreDb.collection('users').doc(userId).collection('grammar_progress').doc(`day_${day}`).set(data[day], { merge: true });
    }
  },

  // Quiz History
  addQuizResult(userId, type, topic, score, total, mistakes = []) {
    const key = this._getKey(userId, 'quiz_history');
    const list = JSON.parse(localStorage.getItem(key) || '[]');
    const record = {
      id: 'qz_' + Date.now(),
      type, // 'vocab' or 'grammar'
      topic,
      score,
      total,
      percent: Math.round((score / total) * 100),
      mistakes, // array of items/questions failed
      date: new Date().toISOString()
    };
    list.unshift(record);
    localStorage.setItem(key, JSON.stringify(list));

    // Also update Mistake Bank
    if (mistakes && mistakes.length > 0) {
      this.recordMistakes(userId, type, mistakes);
    }

    if (window.isFirebaseActive && window.firestoreDb) {
      window.firestoreDb.collection('users').doc(userId).collection('quiz_history').add(record);
    }
    return record;
  },

  getQuizHistory(userId) {
    return JSON.parse(localStorage.getItem(this._getKey(userId, 'quiz_history')) || '[]');
  },

  // Mistake bank for retrying
  recordMistakes(userId, type, mistakeItems) {
    const key = this._getKey(userId, 'mistake_bank');
    let bank = JSON.parse(localStorage.getItem(key) || '[]');
    mistakeItems.forEach(item => {
      const existing = bank.find(b => b.id === item.id);
      if (!existing) {
        bank.push({ ...item, type, wrongCount: 1, addedAt: new Date().toISOString() });
      } else {
        existing.wrongCount = (existing.wrongCount || 1) + 1;
      }
    });
    localStorage.setItem(key, JSON.stringify(bank));
  },

  getMistakes(userId) {
    return JSON.parse(localStorage.getItem(this._getKey(userId, 'mistake_bank')) || '[]');
  },

  resolveMistake(userId, itemId) {
    const key = this._getKey(userId, 'mistake_bank');
    let bank = JSON.parse(localStorage.getItem(key) || '[]');
    bank = bank.filter(b => b.id !== itemId);
    localStorage.setItem(key, JSON.stringify(bank));
  },

  // Overall Stats summary
  getStats(userId) {
    const vocabProg = this.getVocabProgress(userId);
    const grammarProg = this.getGrammarProgress(userId);
    const quizzes = this.getQuizHistory(userId);
    const mistakes = this.getMistakes(userId);

    const totalLearnedVocab = Object.values(vocabProg).filter(v => v.learned).length;
    const totalGrammarDone = Object.values(grammarProg).filter(g => g.completed).length;
    const totalQuizzes = quizzes.length;

    let totalScorePercent = 0;
    quizzes.forEach(q => totalScorePercent += q.percent);
    const avgScore = totalQuizzes > 0 ? Math.round(totalScorePercent / totalQuizzes) : 0;

    return {
      totalLearnedVocab,
      totalGrammarDone,
      totalQuizzes,
      avgScore,
      mistakesCount: mistakes.length,
      quizzes,
      mistakes
    };
  }
};

window.DB = DB;
