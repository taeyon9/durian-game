// Firebase Leaderboard — Firestore-based global rankings
const FirebaseLeaderboard = (() => {
  let db = null;
  let userCountry = 'XX';

  function init(firebaseConfig) {
    try {
      firebase.initializeApp(firebaseConfig);
      db = firebase.firestore();
      // Detect country from locale
      const lang = navigator.language || 'en-US';
      const parts = lang.split('-');
      userCountry = (parts[1] || parts[0]).toUpperCase().slice(0, 2);
    } catch (e) {
      console.warn('Firebase init failed, using local leaderboard:', e);
    }
  }

  function isAvailable() {
    return db !== null;
  }

  function getCountry() {
    return userCountry;
  }

  // Country code → flag emoji
  function countryFlag(code) {
    if (!code || code.length !== 2) return '🌍';
    const offset = 127397;
    return String.fromCodePoint(
      code.charCodeAt(0) + offset,
      code.charCodeAt(1) + offset
    );
  }

  async function submitScore(name, score) {
    if (!db) return null;
    try {
      await db.collection('scores').add({
        name: name,
        score: score,
        country: userCountry,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      return true;
    } catch (e) {
      console.warn('Failed to submit score:', e);
      return false;
    }
  }

  async function getScores(tab, limit = 50) {
    if (!db) return [];
    try {
      let query = db.collection('scores');

      if (tab === 'weekly') {
        const now = new Date();
        const dayOfWeek = now.getDay() || 7;
        const monday = new Date(now);
        monday.setDate(now.getDate() - dayOfWeek + 1);
        monday.setHours(0, 0, 0, 0);
        query = query.where('createdAt', '>=', monday);
      } else if (tab === 'country') {
        query = query.where('country', '==', userCountry);
      }

      const snapshot = await query
        .orderBy(tab === 'weekly' ? 'createdAt' : 'score', tab === 'weekly' ? 'asc' : 'desc')
        .limit(limit)
        .get();

      let results = snapshot.docs.map(doc => {
        const d = doc.data();
        return {
          name: d.name,
          score: d.score,
          country: d.country,
          date: d.createdAt ? d.createdAt.toDate().toISOString().split('T')[0] : '',
        };
      });

      // Weekly needs score sort (queried by createdAt for filter)
      if (tab === 'weekly') {
        results.sort((a, b) => b.score - a.score);
        results = results.slice(0, limit);
      }

      return results;
    } catch (e) {
      console.warn('Failed to fetch scores:', e);
      return [];
    }
  }

  return { init, isAvailable, getCountry, countryFlag, submitScore, getScores };
})();
