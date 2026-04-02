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
// 물리 윷 스틱
// ============================================================
function PhysicsStick({ index, phase, onLanded, delay = 0 }) {
  const landedRef = useRef(false);
  const throwTimeRef = useRef(0);
  const hasThrown = useRef(false);
  const collisionCount = useRef(0);
  const firstCollisionTime = useRef(0);
  const stoppedTime = useRef(0);

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

  // 물리 상태 구독
  const currentRot = useRef([0, 0, 0]);
  const currentVel = useRef([0, 0, 0]);
  const currentAngVel = useRef([0, 0, 0]);

  useEffect(() => {
    const unsubs = [
      api.rotation.subscribe(v => { currentRot.current = v; }),
      api.velocity.subscribe(v => { currentVel.current = v; }),
      api.angularVelocity.subscribe(v => { currentAngVel.current = v; }),
    ];
    return () => unsubs.forEach(u => u());
  }, [api]);

  // 재질
  const { flatMat, roundMat, sideMat } = useMemo(() => {
    const flatColor = createFlatWoodColor();
    const flatNormal = createNormalMapFromCanvas(flatColor, 2.5);
    const flatRough = createRoughnessMap(512, 1024, 0.45);

    const roundColor = createRoundWoodColor();
    const roundNormal = createNormalMapFromCanvas(roundColor, 3.0);
    const roundRough = createRoughnessMap(512, 1024, 0.6);

    const common = {
      metalness: 0.0, envMapIntensity: 0,
      side: THREE.DoubleSide, transparent: false,
    };
    return {
      flatMat: new THREE.MeshStandardMaterial({
        map: flatColor, normalMap: flatNormal, roughnessMap: flatRough,
        roughness: 0.5, normalScale: new THREE.Vector2(1.5, 1.5),
        ...common,
      }),
      roundMat: new THREE.MeshStandardMaterial({
        map: roundColor, normalMap: roundNormal, roughnessMap: roundRough,
        roughness: 0.6, normalScale: new THREE.Vector2(2, 2),
        ...common,
      }),
      sideMat: new THREE.MeshStandardMaterial({
        color: '#9E7B4A', roughness: 0.6,
        ...common,
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

  // 순수 물리 시뮬레이션 (보정 없음)
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

    // 착지 판정: 충돌 후 속도가 충분히 느려지고 1초 대기
    if (hasThrown.current && !landedRef.current && firstCollisionTime.current > 0) {
      const vel = currentVel.current;
      const angVel = currentAngVel.current;
      const speed = Math.sqrt(vel[0] ** 2 + vel[1] ** 2 + vel[2] ** 2);
      const angSpeed = Math.sqrt(angVel[0] ** 2 + angVel[1] ** 2 + angVel[2] ** 2);

      if (speed < 0.3 && angSpeed < 0.5) {
        if (stoppedTime.current === 0) {
          stoppedTime.current = Date.now();
        }
        if (Date.now() - stoppedTime.current > 1000) {
          // 현재 회전에서 로컬 Y축의 월드 방향 확인
          const [rx, ry, rz] = currentRot.current;
          const euler = new THREE.Euler(rx, ry, rz);
          const up = new THREE.Vector3(0, 1, 0).applyEuler(euler);

          // 애매한 방향 체크: |up.y| < 0.4이면 옆으로 누운 상태
          if (Math.abs(up.y) < 0.4) {
            // 살짝 밀어서 한쪽으로 넘기기
            const nudgeDir = up.y >= 0 ? 1 : -1;
            api.angularVelocity.set(nudgeDir * 3, 0, 0);
            api.velocity.set(0, 0.5, 0);
            stoppedTime.current = 0; // 타이머 리셋, 다시 멈출 때까지 대기
            return;
          }

          landedRef.current = true;
          api.velocity.set(0, 0, 0);
          api.angularVelocity.set(0, 0, 0);

          const isFlat = up.y < 0; // 로컬 Y가 아래를 향하면 → 평평한 면이 위
          if (onLanded) onLanded(index, isFlat);
        }
      } else {
        stoppedTime.current = 0;
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
    stoppedTime.current = 0;

    if (phase === 'idle') {
      api.position.set(0, -10, 0);
      api.velocity.set(0, 0, 0);
      api.angularVelocity.set(0, 0, 0);
    }
  }, [phase, api]);

  return (
    <group ref={ref}>
      <mesh geometry={visualGeo} material={[roundMat, flatMat, sideMat]} castShadow />
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
    camera.position.set(0, 9, 3.5);
    camera.lookAt(0, 0, -0.5);
  }, [camera]);
  return null;
}

// 메인 씬 — 물리 결과로 윷 값 결정
function ThrowScene({ phase, onResult, onAllLanded }) {
  const landedCount = useRef(0);
  const stickResults = useRef([]);

  useEffect(() => {
    landedCount.current = 0;
    stickResults.current = [];
  }, [phase]);

  const handleLanded = useCallback((index, isFlat) => {
    stickResults.current[index] = isFlat;
    landedCount.current++;

    if (landedCount.current >= 4) {
      // 평평한 면이 위인 개수 → 윷 결과
      const flatCount = stickResults.current.filter(Boolean).length;
      // 도=1, 개=2, 걸=3, 윷=4, 모=5(=0개 뒤집힘)
      const value = flatCount === 0 ? 5 : flatCount;
      if (onResult) onResult(value);
      if (onAllLanded) onAllLanded();
    }
  }, [onResult, onAllLanded]);

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
          onLanded={handleLanded}
          delay={i * 0.04}
        />
      ))}

      <Ground />
      <Walls />
    </Physics>
  );
}

function YutThrowScene({ isVisible, phase, onResult, onAllLanded }) {
  if (!isVisible) return null;
  return (
    <div className="yut-throw-3d-canvas">
      <Canvas
        shadows
        camera={{ position: [0, 9, 3.5], fov: 35, near: 0.1, far: 60 }}
        gl={{
          antialias: true, alpha: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.0,
          outputColorSpace: THREE.SRGBColorSpace,
        }}
        style={{ background: 'transparent' }}
        dpr={[1, 2]}
      >
        <ThrowScene phase={phase} onResult={onResult} onAllLanded={onAllLanded} />
      </Canvas>
    </div>
  );
}

export default YutThrowScene;
