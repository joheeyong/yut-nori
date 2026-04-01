import * as THREE from 'three';

// 나무결 텍스처 프로시저럴 생성 (Canvas 기반)
export function createWoodTexture(width = 512, height = 512, options = {}) {
  const {
    baseColor = [210, 170, 120],    // 밝은 나무색
    grainColor = [170, 130, 80],    // 나무결 색
    darkColor = [140, 100, 55],     // 어두운 부분
    grainDensity = 40,
    noiseScale = 0.7,
  } = options;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // 기본 색상
  ctx.fillStyle = `rgb(${baseColor[0]}, ${baseColor[1]}, ${baseColor[2]})`;
  ctx.fillRect(0, 0, width, height);

  // 나무결 패턴 (세로 줄무늬)
  for (let i = 0; i < grainDensity; i++) {
    const x = Math.random() * width;
    const w = 1 + Math.random() * 3;
    const alpha = 0.05 + Math.random() * 0.15;
    const color = Math.random() > 0.5 ? grainColor : darkColor;

    ctx.strokeStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`;
    ctx.lineWidth = w;
    ctx.beginPath();

    let y = 0;
    ctx.moveTo(x, y);
    while (y < height) {
      y += 2 + Math.random() * 4;
      const drift = (Math.random() - 0.5) * 3 * noiseScale;
      ctx.lineTo(x + drift, y);
    }
    ctx.stroke();
  }

  // 나이테 느낌의 곡선 패턴
  for (let i = 0; i < 8; i++) {
    const cx = Math.random() * width;
    const cy = Math.random() * height;
    const radius = 30 + Math.random() * 80;
    const alpha = 0.03 + Math.random() * 0.06;

    ctx.strokeStyle = `rgba(${darkColor[0]}, ${darkColor[1]}, ${darkColor[2]}, ${alpha})`;
    ctx.lineWidth = 0.5 + Math.random() * 1.5;
    ctx.beginPath();
    ctx.ellipse(cx, cy, radius, radius * (0.3 + Math.random() * 0.4), Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.stroke();
  }

  // 미세한 노이즈
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 12;
    data[i] = Math.min(255, Math.max(0, data[i] + noise));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
  }
  ctx.putImageData(imageData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

// 어두운 나무 텍스처 (뒷면용)
export function createDarkWoodTexture(width = 512, height = 512) {
  return createWoodTexture(width, height, {
    baseColor: [140, 95, 50],
    grainColor: [110, 70, 35],
    darkColor: [85, 55, 25],
    grainDensity: 50,
    noiseScale: 0.5,
  });
}

// 범프맵 생성 (나무결 울퉁불퉁함)
export function createWoodBumpMap(width = 512, height = 512) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, width, height);

  // 나무결 범프
  for (let i = 0; i < 60; i++) {
    const x = Math.random() * width;
    const w = 0.5 + Math.random() * 2;
    const brightness = 100 + Math.floor(Math.random() * 56);

    ctx.strokeStyle = `rgb(${brightness}, ${brightness}, ${brightness})`;
    ctx.lineWidth = w;
    ctx.beginPath();

    let y = 0;
    ctx.moveTo(x, y);
    while (y < height) {
      y += 2 + Math.random() * 3;
      ctx.lineTo(x + (Math.random() - 0.5) * 2, y);
    }
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}
