import React, { useRef, useEffect, useMemo, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Physics, usePlane, useBox } from '@react-three/cannon';
import * as THREE from 'three';
import {
  createFlatWoodColor, createRoundWoodColor,
  createNormalMapFromCanvas, createRoughnessMap,
} from '../game/textures';

// 윷 크기 상수
const STICK_LENGTH = 3.2;
const STICK_RADIUS = 0.38;
const STICK_HALF_HEIGHT = STICK_RADIUS * 0.55;

// ============================================================
// 물리 윷 스틱 — 단일 Box 바디
// ============================================================
function PhysicsStick({ index, phase, isFlat, onLanded, delay = 0 }) {
  const landedRef = useRef(false);
  const throwTimeRef = useRef(0);
  const hasThrown = useRef(false);
  const collisionCount = useRef(0);
  const firstCollisionTime = useRef(0);
  const correctionStarted = useRef(false);
  const correctionStartTime = useRef(0);

  // 각 윷마다 고유한 던지기 파라미터
  const throwParams = useMemo(() => {
    const spread = (index - 1.5) * 0.6;
    return {
      startX: spread,
      startY: 3.5,
      startZ: 2.5,
      upVelocity: 6 + Math.random() * 2,
      forwardVelocity: -2.5 - Math.random() * 1,
      sideVelocity: spread * 1.5 + (Math.random() - 0.5) * 0.8,
      spinX: (8 + Math.random() * 10) * (Math.random() > 0.5 ? 1 : -1),
      spinY: (Math.random() - 0.5) * 3,
      spinZ: (Math.random() - 0.5) * 2,
      initRotY: (Math.random() - 0.5) * 0.4,
      initRotZ: (Math.random() - 0.5) * 0.2,
    };
  }, [index]);

  const [ref, api] = useBox(() => ({
    mass: 0.25,
    position: [0, -10, 0],
    args: [STICK_LENGTH, STICK_HALF_HEIGHT * 2, STICK_RADIUS * 1.6],
    linearDamping: 0.2,
    angularDamping: 0.25,
    sleepSpeedLimit: 0.3,
    sleepTimeLimit: 0.5,
    material: { friction: 0.8, restitution: 0.2 },
    onCollideBegin: () => {
      collisionCount.current++;
      if (collisionCount.current === 1) {
        firstCollisionTime.current = Date.now();
      }
    },
  }), useRef());

  // 현재 물리 상태 구독
  const currentPos = useRef([0, 0, 0]);
  const currentRot = useRef([0, 0, 0]);

  useEffect(() => {
    const unsubPos = api.position.subscribe(v => { currentPos.current = v; });
    const unsubRot = api.rotation.subscribe(v => { currentRot.current = v; });
    return () => { unsubPos(); unsubRot(); };
  }, [api]);

  // 재질 (환경 반사 최소화: metalness=0, envMapIntensity=0)
  const { flatMat, roundMat, sideMat } = useMemo(() => {
    const flatColor = createFlatWoodColor();
    const flatNormal = createNormalMapFromCanvas(flatColor, 2.5);
    const flatRough = createRoughnessMap(512, 1024, 0.45);

    const roundColor = createRoundWoodColor();
    const roundNormal = createNormalMapFromCanvas(roundColor, 3.0);
    const roundRough = createRoughnessMap(512, 1024, 0.6);

    return {
      flatMat: new THREE.MeshStandardMaterial({
        map: flatColor, normalMap: flatNormal, roughnessMap: flatRough,
        roughness: 0.5, metalness: 0.0, normalScale: new THREE.Vector2(1.5, 1.5),
        envMapIntensity: 0,
      }),
      roundMat: new THREE.MeshStandardMaterial({
        map: roundColor, normalMap: roundNormal, roughnessMap: roundRough,
        roughness: 0.6, metalness: 0.0, normalScale: new THREE.Vector2(2, 2),
        envMapIntensity: 0,
      }),
      sideMat: new THREE.MeshStandardMaterial({
        color: '#9E7B4A', roughness: 0.6, metalness: 0.0,
        envMapIntensity: 0,
      }),
    };
  }, []);

  // 반원기둥 비주얼 지오메트리
  const visualGeo = useMemo(() => {
    const length = STICK_LENGTH;
    const radius = STICK_RADIUS;
    const radSegs = 32;
    const lenSegs = 10;
    const taper = 0.12;

    function taperFn(t) {
      const d = Math.abs(t - 0.5) * 2;
      return 1.0 - taper * d * d;
    }

    const verts = [], norms = [], uvList = [], idx = [];

    // 1) 둥근 면 (위)
    for (let j = 0; j <= lenSegs; j++) {
      const t = j / lenSegs;
      const x = (t - 0.5) * length;
      const s = taperFn(t);
      for (let i = 0; i <= radSegs; i++) {
        const a = (i / radSegs) * Math.PI;
        verts.push(x, Math.sin(a) * radius * s, Math.cos(a) * radius * s);
        norms.push(0, Math.sin(a), Math.cos(a));
        uvList.push(t, i / radSegs);
      }
    }
    for (let j = 0; j < lenSegs; j++) {
      for (let i = 0; i < radSegs; i++) {
        const a = j * (radSegs + 1) + i;
        const b = a + 1, c = a + (radSegs + 1), d = c + 1;
        idx.push(a, b, c, b, d, c);
      }
    }
    const roundCnt = idx.length;

    // 2) 평평한 면 (아래)
    const fBase = verts.length / 3;
    for (let j = 0; j <= lenSegs; j++) {
      const t = j / lenSegs;
      const x = (t - 0.5) * length;
      const s = taperFn(t);
      verts.push(x, 0, -radius * s); norms.push(0, -1, 0); uvList.push(t, 0);
      verts.push(x, 0, radius * s);  norms.push(0, -1, 0); uvList.push(t, 1);
    }
    for (let j = 0; j < lenSegs; j++) {
      const a = fBase + j * 2;
      idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
    const flatCnt = idx.length - roundCnt;

    // 3) 양쪽 캡
    for (const side of [1, -1]) {
      const t = side === 1 ? 1 : 0;
      const x = (t - 0.5) * length;
      const s = taperFn(t);
      const cIdx = verts.length / 3;
      verts.push(x, 0, 0); norms.push(side, 0, 0); uvList.push(0.5, 0.5);
      for (let i = 0; i <= radSegs; i++) {
        const a = (i / radSegs) * Math.PI;
        verts.push(x, Math.sin(a) * radius * s, Math.cos(a) * radius * s);
        norms.push(side, 0, 0);
        uvList.push(Math.sin(a) * 0.5 + 0.5, Math.cos(a) * 0.5 + 0.5);
      }
      for (let i = 0; i < radSegs; i++) {
        if (side === 1) idx.push(cIdx, cIdx + 1 + i, cIdx + 2 + i);
        else idx.push(cIdx, cIdx + 2 + i, cIdx + 1 + i);
      }
    }
    const capCnt = idx.length - roundCnt - flatCnt;

    // 비주얼을 물리 박스 중심에 맞추기
    const yOffset = -radius / 2;
    for (let i = 1; i < verts.length; i += 3) {
      verts[i] += yOffset;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(norms, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvList, 2));
    geo.setIndex(idx);
    geo.clearGroups();
    geo.addGroup(0, roundCnt, 0);
    geo.addGroup(roundCnt, flatCnt, 1);
    geo.addGroup(roundCnt + flatCnt, capCnt, 2);
    return geo;
  }, []);

  // 물리 시뮬레이션 + 착지 후 결과 보정
  useFrame(() => {
    if (phase !== 'throwing') return;

    // 딜레이 후 던지기
    if (!hasThrown.current) {
      throwTimeRef.current += 1 / 60;
      if (throwTimeRef.current >= delay) {
        hasThrown.current = true;
        const p = throwParams;
        api.position.set(p.startX, p.startY, p.startZ);
        api.rotation.set(0, p.initRotY, p.initRotZ);
        api.velocity.set(p.sideVelocity, p.upVelocity, p.forwardVelocity);
        api.angularVelocity.set(p.spinX, p.spinY, p.spinZ);
      }
    }

    // 착지 판정: 첫 충돌 후 1.2초 경과
    if (hasThrown.current && !landedRef.current && firstCollisionTime.current > 0) {
      const elapsed = Date.now() - firstCollisionTime.current;
      if (elapsed > 1200) {
        landedRef.current = true;
        correctionStarted.current = true;
        correctionStartTime.current = performance.now();

        // 물리 정지
        api.velocity.set(0, 0, 0);
        api.angularVelocity.set(0, 0, 0);
      }
    }

    // 착지 후: 결과에 맞게 회전 보정 (0.4초에 걸쳐 부드럽게)
    if (correctionStarted.current) {
      const elapsed = performance.now() - correctionStartTime.current;
      const t = Math.min(elapsed / 400, 1);
      const ease = t < 1 ? 1 - Math.pow(1 - t, 3) : 1; // easeOutCubic

      const [cx, cy, cz] = currentRot.current;

      // 목표 Z 회전: isFlat=true → 평평한 면이 위 → Z=PI, isFlat=false → 둥근 면이 위 → Z=0
      // 지오메트리에서 둥근면이 +Y, 평평한면이 -Y
      // isFlat=true: 뒤집어야 함 → Z축 180도
      const targetZ = isFlat ? Math.PI : 0;

      // 현재 Z 회전을 목표로 보간 (X, Y는 유지하되 약간 수평으로)
      const newZ = cx + (targetZ - cx) * ease; // X축 회전으로 뒤집기
      const flatY = cy;
      const flatZ = cz + (0 - cz) * ease * 0.3; // Z축은 약간만 수평으로

      api.rotation.set(newZ, flatY, flatZ);

      // 높이 보정 (바닥 위로)
      const [px, py, pz] = currentPos.current;
      const targetY = STICK_HALF_HEIGHT + 0.01;
      const newY = py + (targetY - py) * ease;
      api.position.set(px, newY, pz);

      if (t >= 1) {
        correctionStarted.current = false;
        if (onLanded) onLanded(index);
      }
    }
  });

  // 리셋
  useEffect(() => {
    throwTimeRef.current = 0;
    hasThrown.current = false;
    landedRef.current = false;
    collisionCount.current = 0;
    firstCollisionTime.current = 0;
    correctionStarted.current = false;

    if (phase === 'idle') {
      api.position.set(0, -10, 0);
      api.velocity.set(0, 0, 0);
      api.angularVelocity.set(0, 0, 0);
    }
  }, [phase, api]);

  return (
    <group ref={ref}>
      <mesh geometry={visualGeo} material={[roundMat, flatMat, sideMat]} castShadow receiveShadow />
    </group>
  );
}

// 바닥 (물리 충돌만)
function Ground() {
  usePlane(() => ({
    rotation: [-Math.PI / 2, 0, 0],
    position: [0, 0, 0],
    material: { friction: 0.9, restitution: 0.15 },
  }));
  return null;
}

// 보이지 않는 벽
function Walls() {
  usePlane(() => ({ position: [0, 3, -4], rotation: [0, 0, 0] }));
  usePlane(() => ({ position: [0, 3, 5], rotation: [0, Math.PI, 0] }));
  usePlane(() => ({ position: [-5, 3, 0], rotation: [0, Math.PI / 2, 0] }));
  usePlane(() => ({ position: [5, 3, 0], rotation: [0, -Math.PI / 2, 0] }));
  return null;
}

// 카메라
function CameraSetup() {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(0, 5.5, 6.5);
    camera.lookAt(0, 0.3, -0.5);
  }, [camera]);
  return null;
}

// 메인 씬
function ThrowScene({ phase, stickResults, onAllLanded }) {
  const landedCount = useRef(0);

  useEffect(() => { landedCount.current = 0; }, [phase]);

  const handleLanded = useCallback(() => {
    landedCount.current++;
    if (landedCount.current >= 4 && onAllLanded) onAllLanded();
  }, [onAllLanded]);

  return (
    <Physics
      gravity={[0, -12, 0]}
      allowSleep={true}
      defaultContactMaterial={{ friction: 0.8, restitution: 0.15 }}
    >
      <CameraSetup />
      <ambientLight intensity={0.5} color="#ffeedd" />
      <directionalLight
        position={[5, 12, 8]} intensity={1.8} castShadow color="#fff8f0"
        shadow-mapSize-width={2048} shadow-mapSize-height={2048}
        shadow-camera-far={30}
        shadow-camera-left={-8} shadow-camera-right={8}
        shadow-camera-top={8} shadow-camera-bottom={-8}
        shadow-bias={-0.0005}
      />
      <directionalLight position={[-3, 5, -5]} intensity={0.3} color="#e0e8ff" />
      <hemisphereLight args={['#ffeebb', '#887766', 0.4]} />

      {[0, 1, 2, 3].map(i => (
        <PhysicsStick
          key={i} index={i} phase={phase}
          isFlat={stickResults[i]} onLanded={handleLanded}
          delay={i * 0.04}
        />
      ))}

      <Ground />
      <Walls />
    </Physics>
  );
}

function YutThrowScene({ isVisible, phase, stickResults, onAllLanded }) {
  if (!isVisible) return null;
  return (
    <div className="yut-throw-3d-canvas">
      <Canvas
        shadows
        camera={{ position: [0, 5.5, 6.5], fov: 35, near: 0.1, far: 60 }}
        gl={{
          antialias: true, alpha: false,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.0,
          outputColorSpace: THREE.SRGBColorSpace,
        }}
        style={{ background: '#3A3A3A' }}
        onCreated={({ gl }) => { gl.setClearColor('#3A3A3A', 1); }}
        dpr={[1, 2]}
      >
        <ThrowScene phase={phase} stickResults={stickResults} onAllLanded={onAllLanded} />
      </Canvas>
    </div>
  );
}

export default YutThrowScene;
