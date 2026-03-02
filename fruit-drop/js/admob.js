// AdMob integration for Capacitor
const AdMobManager = (() => {
  // Test Ad IDs (replace with real IDs before Play Store release)
  const BANNER_ID = 'ca-app-pub-3940256099942544/6300978111';
  const INTERSTITIAL_ID = 'ca-app-pub-3940256099942544/1033173712';
  const REWARDED_ID = 'ca-app-pub-3940256099942544/5224354917';

  let isCapacitor = false;
  let AdMob = null;
  let interstitialLoaded = false;
  let rewardedLoaded = false;

  async function init() {
    // Check if running inside Capacitor native app
    if (typeof window.Capacitor === 'undefined' || !window.Capacitor.isNativePlatform()) {
      console.log('AdMob: Not running in Capacitor, ads disabled');
      return;
    }

    isCapacitor = true;

    try {
      const admobPlugin = window.Capacitor.Plugins.AdMob;
      if (!admobPlugin) {
        console.log('AdMob: Plugin not available');
        return;
      }
      AdMob = admobPlugin;

      await AdMob.initialize({
        initializeForTesting: true,
      });

      console.log('AdMob: Initialized successfully');

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
        isTesting: true,
      });

      document.body.classList.add('has-banner');
      console.log('AdMob: Banner shown');
    } catch (err) {
      console.error('AdMob: Banner error', err);
    }
  }

  async function loadInterstitial() {
    if (!AdMob) return;

    try {
      await AdMob.prepareInterstitial({
        adId: INTERSTITIAL_ID,
        isTesting: true,
      });
      interstitialLoaded = true;
    } catch (err) {
      console.error('AdMob: Interstitial load error', err);
    }
  }

  async function showInterstitial() {
    if (!AdMob || !interstitialLoaded) return;

    try {
      await AdMob.showInterstitial();
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
        isTesting: true,
      });
      rewardedLoaded = true;
      console.log('AdMob: Rewarded ad loaded');
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
      console.log('AdMob: Rewarded ad completed', result);
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
