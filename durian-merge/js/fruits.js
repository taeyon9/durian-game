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
  let _cache = null;

  function getUnlocked() {
    if (_cache) return _cache;
    try {
      _cache = new Set(JSON.parse(localStorage.getItem(KEY) || '[]'));
    } catch { _cache = new Set(); }
    return _cache;
  }

  function unlock(level) {
    const set = getUnlocked();
    if (!set.has(level)) {
      set.add(level);
      localStorage.setItem(KEY, JSON.stringify([...set]));
      return true; // newly unlocked
    }
    return false;
  }

  function isUnlocked(level) {
    return getUnlocked().has(level);
  }

  function count() {
    return getUnlocked().size;
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

  const skin = typeof SkinManager !== 'undefined' ? SkinManager.getCurrentSkin() : null;
  const usePNG = fruit.img && (!skin || skin.type === 'default');

  if (usePNG) {
    // Image-based rendering (tropical/default skin only)
    const size = fruit.radius * 2;
    ctx.drawImage(fruit.img, -fruit.radius, -fruit.radius, size, size);

    // Legendary glow effect (subtle overlay, no shadowBlur)
    if (fruit.legendary) {
      ctx.globalAlpha = 0.25 + Math.sin(Date.now() / 300) * 0.1;
      ctx.drawImage(fruit.img, -fruit.radius - 2, -fruit.radius - 2, size + 4, size + 4);
      ctx.globalAlpha = 1;
    }
  } else {
    // Procedural rendering (skin-aware)
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
    } else if (skinType === 'neon' && skinData) {
      const glowColor = skinData.glow || baseColor;
      ctx.beginPath();
      ctx.arc(0, 0, fruit.radius, 0, Math.PI * 2);
      ctx.fillStyle = '#0A0A0A';
      ctx.fill();
      for (let i = 3; i >= 1; i--) {
        ctx.beginPath();
        ctx.arc(0, 0, fruit.radius - 2, 0, Math.PI * 2);
        ctx.strokeStyle = glowColor;
        ctx.lineWidth = i * 3;
        ctx.globalAlpha = 0.15 + (0.15 * (4 - i));
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    } else if (skinType === 'pastel' && skinData) {
      ctx.beginPath();
      ctx.arc(0, 0, fruit.radius, 0, Math.PI * 2);
      const pGrad = ctx.createRadialGradient(
        -fruit.radius * 0.2, -fruit.radius * 0.2, fruit.radius * 0.05,
        0, 0, fruit.radius
      );
      pGrad.addColorStop(0, '#FFFFFF');
      pGrad.addColorStop(0.4, baseColor);
      pGrad.addColorStop(1, darkenColor(baseColor, 15));
      ctx.fillStyle = pGrad;
      ctx.fill();
    } else if (skinType === 'mono') {
      ctx.beginPath();
      ctx.arc(0, 0, fruit.radius, 0, Math.PI * 2);
      const mGrad = ctx.createRadialGradient(
        -fruit.radius * 0.3, -fruit.radius * 0.3, fruit.radius * 0.1,
        0, 0, fruit.radius
      );
      mGrad.addColorStop(0, lightenColor(baseColor, 30));
      mGrad.addColorStop(0.6, baseColor);
      mGrad.addColorStop(1, darkenColor(baseColor, 40));
      ctx.fillStyle = mGrad;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, 0, fruit.radius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(139, 119, 101, 0.1)';
      ctx.fill();
    } else if (skinType === 'galaxy' && skinData) {
      ctx.beginPath();
      ctx.arc(0, 0, fruit.radius, 0, Math.PI * 2);
      const gGrad = ctx.createRadialGradient(
        fruit.radius * 0.2, fruit.radius * 0.2, fruit.radius * 0.1,
        0, 0, fruit.radius
      );
      gGrad.addColorStop(0, skinData.highlight || '#FFFFFF');
      gGrad.addColorStop(0.3, baseColor);
      gGrad.addColorStop(1, '#000000');
      ctx.fillStyle = gGrad;
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      for (let i = 0; i < 6 + level * 2; i++) {
        const seed = level * 100 + i * 17;
        const sx = (Math.sin(seed) * 0.7) * fruit.radius;
        const sy = (Math.cos(seed * 1.3) * 0.7) * fruit.radius;
        const sr = 0.5 + (seed % 3) * 0.4;
        ctx.beginPath();
        ctx.arc(sx, sy, sr, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (skinType === 'pixel' && skinData) {
      const dark = skinData.dark || darkenColor(baseColor, 40);
      const gridSize = Math.max(4, Math.floor(fruit.radius / 5));
      const r = fruit.radius * 0.85;
      ctx.beginPath();
      ctx.moveTo(-r, -r + gridSize);
      ctx.lineTo(-r, r - gridSize);
      ctx.lineTo(-r + gridSize, r);
      ctx.lineTo(r - gridSize, r);
      ctx.lineTo(r, r - gridSize);
      ctx.lineTo(r, -r + gridSize);
      ctx.lineTo(r - gridSize, -r);
      ctx.lineTo(-r + gridSize, -r);
      ctx.closePath();
      ctx.fillStyle = baseColor;
      ctx.fill();
      ctx.strokeStyle = dark;
      ctx.lineWidth = 0.5;
      for (let gx = -r; gx <= r; gx += gridSize) {
        ctx.beginPath(); ctx.moveTo(gx, -r); ctx.lineTo(gx, r); ctx.stroke();
      }
      for (let gy = -r; gy <= r; gy += gridSize) {
        ctx.beginPath(); ctx.moveTo(-r, gy); ctx.lineTo(r, gy); ctx.stroke();
      }
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fillRect(-r, -r, gridSize * 2, gridSize * 2);
    } else if (skinType === 'candy' && skinData) {
      const stripeColor = skinData.stripe || '#FFFFFF';
      ctx.beginPath();
      ctx.arc(0, 0, fruit.radius, 0, Math.PI * 2);
      ctx.fillStyle = baseColor;
      ctx.fill();
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, fruit.radius, 0, Math.PI * 2);
      ctx.clip();
      ctx.lineWidth = fruit.radius * 0.2;
      ctx.strokeStyle = stripeColor;
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      for (let a = 0; a < Math.PI * 4; a += 0.1) {
        const sr = a * fruit.radius / (Math.PI * 4);
        const sx = Math.cos(a) * sr;
        const sy = Math.sin(a) * sr;
        if (a === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.restore();
      ctx.beginPath();
      ctx.arc(-fruit.radius * 0.25, -fruit.radius * 0.25, fruit.radius * 0.3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fill();
    } else if (skinType === 'placeholder' && skinData && skinData.emoji) {
      ctx.beginPath();
      ctx.arc(0, 0, fruit.radius, 0, Math.PI * 2);
      const phGrad = ctx.createRadialGradient(
        -fruit.radius * 0.3, -fruit.radius * 0.3, fruit.radius * 0.1,
        0, 0, fruit.radius
      );
      phGrad.addColorStop(0, lightenColor(baseColor, 40));
      phGrad.addColorStop(0.7, baseColor);
      phGrad.addColorStop(1, darkenColor(baseColor, 30));
      ctx.fillStyle = phGrad;
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
