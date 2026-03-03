// AdMob integration for Capacitor
const AdMobManager = (() => {
  // Test Ad IDs (릴리스 전 실제 ID로 교체)
  const BANNER_ID = 'ca-app-pub-3940256099942544/6300978111';
  const INTERSTITIAL_ID = 'ca-app-pub-3940256099942544/1033173712';
  const REWARDED_ID = 'ca-app-pub-3940256099942544/5224354917';

  let isCapacitor = false;
  let AdMob = null;
  let interstitialLoaded = false;
  let rewardedLoaded = false;

  // Interstitial frequency cap
  let gamesSinceLastInterstitial = 0;
  const INTERSTITIAL_EVERY_N_GAMES = 2;
  const MIN_GAME_DURATION_MS = 30000;

  async function init() {
    // Check if running inside Capacitor native app
    if (typeof window.Capacitor === 'undefined' || !window.Capacitor.isNativePlatform()) {
      return;
    }

    isCapacitor = true;

    try {
      const admobPlugin = window.Capacitor.Plugins.AdMob;
      if (!admobPlugin) {
        return;
      }
      AdMob = admobPlugin;

      await AdMob.initialize({
        initializeForTesting: true, // TODO: 릴리스 전 false로 변경
      });

      await showBanner();
      await loadInterstitial();
      await loadRewarded();
    } catch (err) {
      console.error('AdMob: Init error', err);
    }
  }

  async function showBanner() {
    if (!AdMob) return;

    try {
      await AdMob.showBanner({
        adId: BANNER_ID,
        adSize: 'BANNER',
        position: 'BOTTOM_CENTER',
        margin: 0,
        isTesting: true, // TODO: 릴리스 전 false로 변경
      });

      document.body.classList.add('has-banner');
    } catch (err) {
      console.error('AdMob: Banner error', err);
    }
  }

  async function loadInterstitial() {
    if (!AdMob) return;

    try {
      await AdMob.prepareInterstitial({
        adId: INTERSTITIAL_ID,
        isTesting: true, // TODO: 릴리스 전 false로 변경
      });
      interstitialLoaded = true;
    } catch (err) {
      console.error('AdMob: Interstitial load error', err);
    }
  }

  async function showInterstitial(gameDurationMs) {
    // Skip if game was too short (accidental/instant game over) — don't count these
    if (typeof gameDurationMs === 'number' && gameDurationMs < MIN_GAME_DURATION_MS) return;

    gamesSinceLastInterstitial++;

    // Frequency cap: show every N games
    if (gamesSinceLastInterstitial < INTERSTITIAL_EVERY_N_GAMES) return;

    if (!AdMob || !interstitialLoaded) return;

    try {
      await AdMob.showInterstitial();
      gamesSinceLastInterstitial = 0;
      interstitialLoaded = false;
      await loadInterstitial();
    } catch (err) {
      console.error('AdMob: Interstitial show error', err);
      interstitialLoaded = false;
      await loadInterstitial();
    }
  }

  // Rewarded video ad
  async function loadRewarded() {
    if (!AdMob) return;

    try {
      await AdMob.prepareRewardVideoAd({
        adId: REWARDED_ID,
        isTesting: true, // TODO: 릴리스 전 false로 변경
      });
      rewardedLoaded = true;
    } catch (err) {
      console.error('AdMob: Rewarded load error', err);
    }
  }

  // Show rewarded ad. Returns true if reward was earned.
  async function showRewarded() {
    if (!AdMob) {
      // Not in Capacitor — simulate reward for testing in browser
      return true;
    }
    if (!rewardedLoaded) return false;

    try {
      const result = await AdMob.showRewardVideoAd();
      rewardedLoaded = false;
      await loadRewarded();
      return true;
    } catch (err) {
      console.error('AdMob: Rewarded show error', err);
      rewardedLoaded = false;
      await loadRewarded();
      return false;
    }
  }

  function isRewardedReady() {
    // In browser, always allow (for testing)
    if (!isCapacitor) return true;
    return rewardedLoaded;
  }

  return { init, showInterstitial, showRewarded, isRewardedReady };
})();

// Initialize AdMob when app loads
window.addEventListener('load', () => {
  AdMobManager.init();
});
