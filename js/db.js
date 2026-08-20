// Database Manager with Cloud Firestore & LocalStorage Dual-Sync
const DB = {
  _getKey(userId, collection) {
    return `eh_${userId}_${collection}`;
  },

  async initUser(userId) {
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

    // Sync user profile to Firestore
    if (window.isFirebaseActive && window.firestoreDb) {
      try {
        await window.firestoreDb.collection('users').doc(userId).set({
          ...profile,
          lastLogin: new Date().toISOString()
        }, { merge: true });
        console.log(`[Firestore] Synced user profile for: ${userId}`);
      } catch(err) {
        console.warn("[Firestore] Error syncing user:", err);
      }
    }
  },

  // Vocabulary progress
  getVocabProgress(userId) {
    const raw = localStorage.getItem(this._getKey(userId, 'vocab_progress'));
    return raw ? JSON.parse(raw) : {};
  },

  async saveVocabProgress(userId, wordId, isLearned, isCorrect = null) {
    const data = this.getVocabProgress(userId);
    if (!data[wordId]) {
      data[wordId] = { learned: false, correct: 0, wrong: 0, lastReviewed: new Date().toISOString() };
    }
    if (isLearned !== null) data[wordId].learned = isLearned;
    if (isCorrect === true) data[wordId].correct = (data[wordId].correct || 0) + 1;
    if (isCorrect === false) data[wordId].wrong = (data[wordId].wrong || 0) + 1;
    data[wordId].lastReviewed = new Date().toISOString();

    localStorage.setItem(this._getKey(userId, 'vocab_progress'), JSON.stringify(data));

    // Push to Firestore Cloud
    if (window.isFirebaseActive && window.firestoreDb) {
      try {
        await window.firestoreDb.collection('users').doc(userId)
          .collection('vocab_progress').doc(wordId).set(data[wordId], { merge: true });
      } catch(err) {
        console.warn("[Firestore] Error updating vocab_progress:", err);
      }
    }
    return data[wordId];
  },

  // Grammar progress
  getGrammarProgress(userId) {
    const raw = localStorage.getItem(this._getKey(userId, 'grammar_progress'));
    return raw ? JSON.parse(raw) : {};
  },

  async saveGrammarProgress(userId, day, score) {
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

    // Push to Firestore Cloud
    if (window.isFirebaseActive && window.firestoreDb) {
      try {
        await window.firestoreDb.collection('users').doc(userId)
          .collection('grammar_progress').doc(`day_${day}`).set(data[day], { merge: true });
        console.log(`[Firestore] Saved grammar progress for Day ${day}`);
      } catch(err) {
        console.warn("[Firestore] Error updating grammar_progress:", err);
      }
    }
  },

  // Quiz History
  async addQuizResult(userId, type, topic, score, total, mistakes = []) {
    const key = this._getKey(userId, 'quiz_history');
    const list = JSON.parse(localStorage.getItem(key) || '[]');
    const record = {
      id: 'qz_' + Date.now(),
      type,
      topic,
      score,
      total,
      percent: Math.round((score / total) * 100),
      mistakes,
      date: new Date().toISOString()
    };
    list.unshift(record);
    localStorage.setItem(key, JSON.stringify(list));

    if (mistakes && mistakes.length > 0) {
      this.recordMistakes(userId, type, mistakes);
    }

    // Push to Firestore Cloud
    if (window.isFirebaseActive && window.firestoreDb) {
      try {
        await window.firestoreDb.collection('users').doc(userId)
          .collection('quiz_history').doc(record.id).set(record);
        console.log(`[Firestore] Recorded quiz history: ${record.id}`);
      } catch(err) {
        console.warn("[Firestore] Error recording quiz:", err);
      }
    }
    return record;
  },

  getQuizHistory(userId) {
    return JSON.parse(localStorage.getItem(this._getKey(userId, 'quiz_history')) || '[]');
  },

  // Mistake bank
  async recordMistakes(userId, type, mistakeItems) {
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

    if (window.isFirebaseActive && window.firestoreDb) {
      try {
        await window.firestoreDb.collection('users').doc(userId)
          .collection('meta').doc('mistake_bank').set({ items: bank, updatedAt: new Date().toISOString() });
      } catch(err) {
        console.warn("[Firestore] Error updating mistake bank:", err);
      }
    }
  },

  getMistakes(userId) {
    return JSON.parse(localStorage.getItem(this._getKey(userId, 'mistake_bank')) || '[]');
  },

  async resolveMistake(userId, itemId) {
    const key = this._getKey(userId, 'mistake_bank');
    let bank = JSON.parse(localStorage.getItem(key) || '[]');
    bank = bank.filter(b => b.id !== itemId);
    localStorage.setItem(key, JSON.stringify(bank));

    if (window.isFirebaseActive && window.firestoreDb) {
      try {
        await window.firestoreDb.collection('users').doc(userId)
          .collection('meta').doc('mistake_bank').set({ items: bank, updatedAt: new Date().toISOString() });
      } catch(err) {
        console.warn("[Firestore] Error resolving mistake:", err);
      }
    }
  },

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
