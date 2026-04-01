import * as THREE from 'three';

// ============================================================
// 고품질 나무 텍스처 생성기
// Color Map + Normal Map + Roughness Map 세트로 생성
// ============================================================

function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// ---- Color Map: 밝은 나무 (평평한 면 = 쪼갠 단면) ----
export function createFlatWoodColor(w = 512, h = 1024) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  const rand = seededRandom(42);

  // 베이스: 따뜻한 밝은 나무색
  const grad = ctx.createLinearGradient(0, 0, w, 0);
  grad.addColorStop(0, '#E8D0A8');
  grad.addColorStop(0.3, '#DBBF8F');
  grad.addColorStop(0.7, '#D4B580');
  grad.addColorStop(1, '#E0C89A');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // 세로 나무결 (촘촘한 섬유질)
  for (let i = 0; i < 120; i++) {
    const x = rand() * w;
    const lineW = 0.3 + rand() * 1.5;
    const alpha = 0.03 + rand() * 0.08;
    const r = 150 + rand() * 40;
    const g = 110 + rand() * 35;
    const b = 60 + rand() * 25;
    ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`;
    ctx.lineWidth = lineW;
    ctx.beginPath();
    let y = 0;
    let cx = x;
    ctx.moveTo(cx, y);
    while (y < h) {
      y += 1 + rand() * 3;
      cx += (rand() - 0.5) * 1.2;
      ctx.lineTo(cx, y);
    }
    ctx.stroke();
  }

  // 나이테 (연한 곡선)
  for (let i = 0; i < 6; i++) {
    const cx = rand() * w;
    const cy = rand() * h;
    const rx = 40 + rand() * 100;
    const ry = 150 + rand() * 300;
    ctx.strokeStyle = `rgba(160,120,70,${0.04 + rand() * 0.06})`;
    ctx.lineWidth = 0.8 + rand() * 1.2;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, rand() * 0.3, 0, Math.PI * 2);
    ctx.stroke();
  }

  // 마디/옹이 (작은 어두운 타원)
  for (let i = 0; i < 2; i++) {
    const kx = 80 + rand() * (w - 160);
    const ky = 100 + rand() * (h - 200);
    const kr = 4 + rand() * 8;
    const gradient = ctx.createRadialGradient(kx, ky, 0, kx, ky, kr);
    gradient.addColorStop(0, 'rgba(100,65,30,0.5)');
    gradient.addColorStop(0.6, 'rgba(120,80,40,0.2)');
    gradient.addColorStop(1, 'rgba(140,100,60,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(kx - kr, ky - kr, kr * 2, kr * 2);
  }

  // 미세 노이즈
  addNoise(ctx, w, h, 6);

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  return tex;
}

// ---- Color Map: 어두운 나무 (둥근 면 = 껍질) ----
export function createRoundWoodColor(w = 512, h = 1024) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  const rand = seededRandom(77);

  // 베이스: 진한 갈색
  const grad = ctx.createLinearGradient(0, 0, w, 0);
  grad.addColorStop(0, '#7A5A30');
  grad.addColorStop(0.3, '#6B4C28');
  grad.addColorStop(0.5, '#8A6538');
  grad.addColorStop(0.7, '#6E5030');
  grad.addColorStop(1, '#7C5C34');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // 거친 세로 결 (껍질 느낌)
  for (let i = 0; i < 150; i++) {
    const x = rand() * w;
    const lineW = 0.5 + rand() * 2.5;
    const alpha = 0.04 + rand() * 0.12;
    const bright = rand() > 0.5;
    const r = bright ? 100 + rand() * 40 : 50 + rand() * 30;
    const g = bright ? 70 + rand() * 30 : 35 + rand() * 25;
    const b = bright ? 30 + rand() * 20 : 15 + rand() * 15;
    ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`;
    ctx.lineWidth = lineW;
    ctx.beginPath();
    let y = 0;
    let cx = x;
    ctx.moveTo(cx, y);
    while (y < h) {
      y += 1 + rand() * 2;
      cx += (rand() - 0.5) * 2;
      ctx.lineTo(cx, y);
    }
    ctx.stroke();
  }

  // 껍질 갈라짐 패턴
  for (let i = 0; i < 8; i++) {
    const x = rand() * w;
    ctx.strokeStyle = `rgba(40,25,10,${0.1 + rand() * 0.15})`;
    ctx.lineWidth = 0.5 + rand() * 1;
    ctx.beginPath();
    let y = rand() * h * 0.3;
    ctx.moveTo(x, y);
    const endY = y + 80 + rand() * 200;
    while (y < endY && y < h) {
      y += 2 + rand() * 5;
      ctx.lineTo(x + (rand() - 0.5) * 4, y);
    }
    ctx.stroke();
  }

  addNoise(ctx, w, h, 10);

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  return tex;
}

// ---- Normal Map 생성 (Color Map으로부터) ----
export function createNormalMapFromCanvas(colorTex, strength = 2.0) {
  const source = colorTex.image;
  const w = source.width;
  const h = source.height;

  // Color map의 픽셀 데이터 추출
  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = w; srcCanvas.height = h;
  const srcCtx = srcCanvas.getContext('2d');
  srcCtx.drawImage(source, 0, 0);
  const srcData = srcCtx.getImageData(0, 0, w, h).data;

  // 그레이스케일 높이맵
  const heightMap = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const idx = i * 4;
    heightMap[i] = (srcData[idx] * 0.299 + srcData[idx + 1] * 0.587 + srcData[idx + 2] * 0.114) / 255;
  }

  // Sobel 필터로 노멀맵 계산
  const outCanvas = document.createElement('canvas');
  outCanvas.width = w; outCanvas.height = h;
  const outCtx = outCanvas.getContext('2d');
  const outImg = outCtx.createImageData(w, h);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const getH = (px, py) => {
        const cx = (px + w) % w;
        const cy = (py + h) % h;
        return heightMap[cy * w + cx];
      };

      const dx = (getH(x + 1, y) - getH(x - 1, y)) * strength;
      const dy = (getH(x, y + 1) - getH(x, y - 1)) * strength;

      // 노멀 벡터 (tangent space)
      const len = Math.sqrt(dx * dx + dy * dy + 1);
      const nx = (-dx / len) * 0.5 + 0.5;
      const ny = (-dy / len) * 0.5 + 0.5;
      const nz = (1 / len) * 0.5 + 0.5;

      const idx = (y * w + x) * 4;
      outImg.data[idx] = Math.round(nx * 255);
      outImg.data[idx + 1] = Math.round(ny * 255);
      outImg.data[idx + 2] = Math.round(nz * 255);
      outImg.data[idx + 3] = 255;
    }
  }

  outCtx.putImageData(outImg, 0, 0);
  const normalTex = new THREE.CanvasTexture(outCanvas);
  normalTex.wrapS = normalTex.wrapT = THREE.RepeatWrapping;
  normalTex.anisotropy = 8;
  return normalTex;
}

// ---- Roughness Map ----
export function createRoughnessMap(w = 512, h = 1024, baseRoughness = 0.55) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  const rand = seededRandom(99);

  const val = Math.round(baseRoughness * 255);
  ctx.fillStyle = `rgb(${val},${val},${val})`;
  ctx.fillRect(0, 0, w, h);

  // 나무결 방향 거칠기 변화
  for (let i = 0; i < 80; i++) {
    const x = rand() * w;
    const v = Math.round((baseRoughness + (rand() - 0.5) * 0.25) * 255);
    ctx.strokeStyle = `rgba(${v},${v},${v},${0.3 + rand() * 0.4})`;
    ctx.lineWidth = 0.5 + rand() * 2;
    ctx.beginPath();
    let y = 0;
    ctx.moveTo(x, y);
    while (y < h) {
      y += 2 + rand() * 4;
      ctx.lineTo(x + (rand() - 0.5) * 2, y);
    }
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

// ---- 유틸 ----
function addNoise(ctx, w, h, amount) {
  const imageData = ctx.getImageData(0, 0, w, h);
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * amount;
    d[i] = Math.min(255, Math.max(0, d[i] + n));
    d[i + 1] = Math.min(255, Math.max(0, d[i + 1] + n));
    d[i + 2] = Math.min(255, Math.max(0, d[i + 2] + n));
  }
  ctx.putImageData(imageData, 0, 0);
}

// ---- 바닥 텍스처 (짚/돗자리 느낌) ----
export function createGroundTexture(w = 1024, h = 1024) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  const rand = seededRandom(123);

  ctx.fillStyle = '#C8B08A';
  ctx.fillRect(0, 0, w, h);

  // 격자무늬 (돗자리)
  for (let y = 0; y < h; y += 4) {
    const alpha = 0.03 + rand() * 0.05;
    ctx.strokeStyle = `rgba(150,120,80,${alpha})`;
    ctx.lineWidth = 1 + rand() * 2;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y + (rand() - 0.5) * 2);
    ctx.stroke();
  }
  for (let x = 0; x < w; x += 4) {
    const alpha = 0.02 + rand() * 0.04;
    ctx.strokeStyle = `rgba(140,110,70,${alpha})`;
    ctx.lineWidth = 0.5 + rand() * 1.5;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + (rand() - 0.5) * 2, h);
    ctx.stroke();
  }

  addNoise(ctx, w, h, 5);

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  return tex;
}
