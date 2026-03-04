// Fruit Definitions — image-based rendering with procedural fallback
// Order: small → large, final is Queen (small legendary)

const FRUITS = [
  { name: 'Lychee',        radius: 18,  color: '#F2A0B0', score: 1,   img: null, file: '01_lychee.png' },
  { name: 'Lime',          radius: 24,  color: '#7EC850', score: 3,   img: null, file: '02_lime.png' },
  { name: 'Rambutan',      radius: 30,  color: '#E03030', score: 6,   img: null, file: '03_rambutan.png' },
  { name: 'Passion Fruit', radius: 36,  color: '#7B2D8B', score: 10,  img: null, file: '04_passionfruit.png' },
  { name: 'Mango',         radius: 43,  color: '#FFB831', score: 15,  img: null, file: '05_mango.png' },
  { name: 'Dragon Fruit',  radius: 50,  color: '#E84B8A', score: 21,  img: null, file: '06_dragonfruit.png' },
  { name: 'Papaya',        radius: 58,  color: '#F49030', score: 28,  img: null, file: '07_papaya.png' },
  { name: 'Coconut',       radius: 66,  color: '#6B3E1F', score: 36,  img: null, file: '08_coconut.png' },
  { name: 'Pineapple',     radius: 75,  color: '#E8C520', score: 45,  img: null, file: '09_pineapple.png' },
  { name: 'Durian',        radius: 85,  color: '#8BAE2F', score: 55,  img: null, file: '10_durian.png' },
  { name: '???',           radius: 20,  color: '#C890FF', score: 100, img: null, file: '11_mangosteen.png', legendary: true },
];

// Max level for random drops (0-indexed, only small fruits drop)
const MAX_DROP_LEVEL = 4;

// Track which fruits the player has seen (for album)
const FruitAlbum = (() => {
  const KEY = 'durianMergeAlbum';

  function getUnlocked() {
    try {
      return JSON.parse(localStorage.getItem(KEY) || '[]');
    } catch { return []; }
  }

  function unlock(level) {
    const arr = getUnlocked();
    if (!arr.includes(level)) {
      arr.push(level);
      localStorage.setItem(KEY, JSON.stringify(arr));
      return true; // newly unlocked
    }
    return false;
  }

  function isUnlocked(level) {
    return getUnlocked().includes(level);
  }

  function count() {
    return getUnlocked().length;
  }

  return { unlock, isUnlocked, count, getUnlocked };
})();

// ===== IMAGE LOADING =====

let imagesLoaded = false;

function loadFruitImages() {
  let loaded = 0;
  const total = FRUITS.length;

  FRUITS.forEach((fruit, i) => {
    const img = new Image();
    img.onload = () => {
      fruit.img = img;
      loaded++;
      if (loaded === total) {
        imagesLoaded = true;
      }
    };
    img.onerror = () => {
      console.warn(`Failed to load ${fruit.file}, using fallback`);
      loaded++;
      if (loaded === total) imagesLoaded = true;
    };
    img.src = `assets/fruits_clean/${fruit.file}`;
  });
}

// ===== RENDERING =====

function drawFruit(ctx, x, y, level, angle) {
  const fruit = FRUITS[level];
  if (!fruit) return;

  ctx.save();
  ctx.translate(x, y);
  if (angle) ctx.rotate(angle);

  if (fruit.img) {
    // Image-based rendering
    const size = fruit.radius * 2;
    ctx.drawImage(fruit.img, -fruit.radius, -fruit.radius, size, size);

    // Legendary glow effect (subtle overlay, no shadowBlur)
    if (fruit.legendary) {
      ctx.globalAlpha = 0.25 + Math.sin(Date.now() / 300) * 0.1;
      ctx.drawImage(fruit.img, -fruit.radius - 2, -fruit.radius - 2, size + 4, size + 4);
      ctx.globalAlpha = 1;
    }
  } else {
    // Fallback: simple colored circle (skin-aware)
    const skin = typeof SkinManager !== 'undefined' ? SkinManager.getCurrentSkin() : null;
    const skinData = skin ? skin.data[level] : null;
    const skinType = skin ? skin.type : 'default';
    const baseColor = (skinData && skinData.color) ? skinData.color : fruit.color;

    if (skinType === 'emoji' && skinData && skinData.emoji) {
      // Emoji skin: colored circle + emoji text
      ctx.beginPath();
      ctx.arc(0, 0, fruit.radius, 0, Math.PI * 2);
      const eGrad = ctx.createRadialGradient(
        -fruit.radius * 0.3, -fruit.radius * 0.3, fruit.radius * 0.1,
        0, 0, fruit.radius
      );
      eGrad.addColorStop(0, lightenColor(baseColor, 40));
      eGrad.addColorStop(0.7, baseColor);
      eGrad.addColorStop(1, darkenColor(baseColor, 30));
      ctx.fillStyle = eGrad;
      ctx.fill();

      ctx.font = `${fruit.radius * 1.1}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(skinData.emoji, 0, fruit.radius * 0.08);
    } else if (skinType === 'recolor' && skinData && skinData.accent) {
      // Jewel skin: faceted look with accent highlight
      ctx.beginPath();
      ctx.arc(0, 0, fruit.radius, 0, Math.PI * 2);
      const jGrad = ctx.createRadialGradient(
        -fruit.radius * 0.3, -fruit.radius * 0.3, fruit.radius * 0.1,
        0, 0, fruit.radius
      );
      jGrad.addColorStop(0, skinData.accent);
      jGrad.addColorStop(0.5, baseColor);
      jGrad.addColorStop(1, darkenColor(baseColor, 50));
      ctx.fillStyle = jGrad;
      ctx.fill();

      // Gem sparkle highlight
      ctx.beginPath();
      ctx.arc(-fruit.radius * 0.2, -fruit.radius * 0.2, fruit.radius * 0.25, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(fruit.radius * 0.15, -fruit.radius * 0.3, fruit.radius * 0.1, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fill();
    } else {
      // Default / tropical skin
      ctx.beginPath();
      ctx.arc(0, 0, fruit.radius, 0, Math.PI * 2);

      const grad = ctx.createRadialGradient(
        -fruit.radius * 0.3, -fruit.radius * 0.3, fruit.radius * 0.1,
        0, 0, fruit.radius
      );
      grad.addColorStop(0, lightenColor(baseColor, 40));
      grad.addColorStop(0.7, baseColor);
      grad.addColorStop(1, darkenColor(baseColor, 30));
      ctx.fillStyle = grad;
      ctx.fill();

      // Highlight
      ctx.beginPath();
      ctx.arc(-fruit.radius * 0.25, -fruit.radius * 0.25, fruit.radius * 0.3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fill();
    }
  }

  ctx.restore();
}

// Color utility helpers for fallback
function lightenColor(hex, amt) {
  let r = parseInt(hex.slice(1,3), 16);
  let g = parseInt(hex.slice(3,5), 16);
  let b = parseInt(hex.slice(5,7), 16);
  r = Math.min(255, r + amt);
  g = Math.min(255, g + amt);
  b = Math.min(255, b + amt);
  return `rgb(${r},${g},${b})`;
}

function darkenColor(hex, amt) {
  let r = parseInt(hex.slice(1,3), 16);
  let g = parseInt(hex.slice(3,5), 16);
  let b = parseInt(hex.slice(5,7), 16);
  r = Math.max(0, r - amt);
  g = Math.max(0, g - amt);
  b = Math.max(0, b - amt);
  return `rgb(${r},${g},${b})`;
}
