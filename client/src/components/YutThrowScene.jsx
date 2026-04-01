import React, { useRef, useEffect, useMemo, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment } from '@react-three/drei';
import { Physics, usePlane, useCompoundBody } from '@react-three/cannon';
import { EffectComposer, N8AO, Bloom, ToneMapping } from '@react-three/postprocessing';
import * as THREE from 'three';
import {
  createFlatWoodColor, createRoundWoodColor,
  createNormalMapFromCanvas, createRoughnessMap, createGroundTexture,
} from '../game/textures';

// ============================================================
// 물리 기반 윷 스틱 (cannon-es)
// ============================================================
function PhysicsStick({ index, phase, isFlat, onLanded, delay = 0 }) {
  const landedRef = useRef(false);
  const throwTimeRef = useRef(0);
  const hasThrown = useRef(false);
  const settleTimer = useRef(0);

  // 물리 파라미터
  const throwParams = useMemo(() => ({
    upVelocity: 8 + Math.random() * 4,
    forwardVelocity: -1 + Math.random() * 2,
    sideVelocity: (index - 1.5) * 2.5 + (Math.random() - 0.5) * 1.5,
    spinX: (10 + Math.random() * 15) * (Math.random() > 0.5 ? 1 : -1),
    spinY: (Math.random() - 0.5) * 6,
    spinZ: (Math.random() - 0.5) * 4,
  }), [index]);

  // 반원기둥 근사: 복합 바디 (Box + Cylinder)
  const stickLength = 3.2;
  const stickRadius = 0.38;

  const [ref, api] = useCompoundBody(() => ({
    mass: 0.3,
    position: [0, -10, 0],
    rotation: [0, 0, 0],
    linearDamping: 0.1,
    angularDamping: 0.15,
    material: { friction: 0.6, restitution: 0.3 },
    shapes: [
      // 메인 박스 (평평한 면 포함)
      { type: 'Box', args: [stickLength, stickRadius * 0.7, stickRadius * 2], position: [0, stickRadius * 0.15, 0] },
      // 상단 원통 (둥근면 근사)
      { type: 'Cylinder', args: [stickRadius * 0.8, stickRadius * 0.8, stickLength, 6], position: [0, stickRadius * 0.45, 0], rotation: [0, 0, Math.PI / 2] },
    ],
    onCollide: () => {
      if (!landedRef.current) {
        settleTimer.current = Date.now();
      }
    },
  }), useRef());

  // 텍스처 & 재질
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
        roughness: 0.45, metalness: 0.02, normalScale: new THREE.Vector2(1.5, 1.5),
      }),
      roundMat: new THREE.MeshStandardMaterial({
        map: roundColor, normalMap: roundNormal, roughnessMap: roundRough,
        roughness: 0.58, metalness: 0.03, normalScale: new THREE.Vector2(2, 2),
      }),
      sideMat: new THREE.MeshStandardMaterial({
        color: '#9E7B4A', roughness: 0.55, metalness: 0.02,
      }),
    };
  }, []);

  // 반원기둥 비주얼 지오메트리 (면별 material 그룹)
  const visualGeo = useMemo(() => {
    const length = stickLength;
    const radius = stickRadius;
    const radSegs = 32;
    const lenSegs = 10;
    const taper = 0.12;

    function taperFn(t) {
      const d = Math.abs(t - 0.5) * 2;
      return 1.0 - taper * d * d;
    }

    const verts = [];
    const norms = [];
    const uvList = [];
    const idx = [];

    // 1) 둥근 면
    for (let j = 0; j <= lenSegs; j++) {
      const t = j / lenSegs;
      const x = (t - 0.5) * length;
      const s = taperFn(t);
      for (let i = 0; i <= radSegs; i++) {
        const a = (i / radSegs) * Math.PI;
        const cy = Math.sin(a) * radius * s;
        const cz = Math.cos(a) * radius * s;
        verts.push(x, cy, cz);
        norms.push(0, Math.sin(a), Math.cos(a));
        uvList.push(t, i / radSegs);
      }
    }
    for (let j = 0; j < lenSegs; j++) {
      for (let i = 0; i < radSegs; i++) {
        const a = j * (radSegs + 1) + i;
        const b = a + 1;
        const c = a + (radSegs + 1);
        const d = c + 1;
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
      verts.push(x, 0, -radius * s);
      norms.push(0, -1, 0);
      uvList.push(t, 0);
      verts.push(x, 0, radius * s);
      norms.push(0, -1, 0);
      uvList.push(t, 1);
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
      verts.push(x, 0, 0);
      norms.push(side, 0, 0);
      uvList.push(0.5, 0.5);
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

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(norms, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvList, 2));
    geo.setIndex(idx);
    geo.clearGroups();
    geo.addGroup(0, roundCnt, 0);             // 둥근면
    geo.addGroup(roundCnt, flatCnt, 1);       // 평평한면
    geo.addGroup(roundCnt + flatCnt, capCnt, 2); // 캡
    return geo;
  }, [stickLength, stickRadius]);

  // 물리 던지기
  useFrame((_, delta) => {
    if (phase === 'throwing' && !hasThrown.current) {
      throwTimeRef.current += delta;
      if (throwTimeRef.current >= delay) {
        hasThrown.current = true;
        api.position.set(
          (index - 1.5) * 0.3,
          2,
          1
        );
        api.velocity.set(
          throwParams.sideVelocity,
          throwParams.upVelocity,
          throwParams.forwardVelocity
        );
        api.angularVelocity.set(
          throwParams.spinX,
          throwParams.spinY,
          throwParams.spinZ
        );
      }
    }

    // 착지 판정: 충돌 후 속도가 충분히 줄었을 때
    if (phase === 'throwing' && hasThrown.current && !landedRef.current && settleTimer.current > 0) {
      if (Date.now() - settleTimer.current > 1200) {
        landedRef.current = true;

        // 최종 회전을 결과에 맞게 보정
        // flat: 평평한 면이 위 (y축 기준 rotation 보정)
        // round: 둥근 면이 위
        api.angularVelocity.set(0, 0, 0);
        if (onLanded) onLanded(index);
      }
    }
  });

  // 리셋
  useEffect(() => {
    if (phase === 'idle') {
      throwTimeRef.current = 0;
      hasThrown.current = false;
      landedRef.current = false;
      settleTimer.current = 0;
      api.position.set(0, -10, 0);
      api.velocity.set(0, 0, 0);
      api.angularVelocity.set(0, 0, 0);
    }
    if (phase === 'throwing') {
      throwTimeRef.current = 0;
      hasThrown.current = false;
      landedRef.current = false;
      settleTimer.current = 0;
    }
  }, [phase, api]);

  return (
    <group ref={ref}>
      <mesh geometry={visualGeo} material={[roundMat, flatMat, sideMat]} castShadow receiveShadow />
    </group>
  );
}

// 바닥 (물리 + 비주얼)
function Ground() {
  const [ref] = usePlane(() => ({
    rotation: [-Math.PI / 2, 0, 0],
    position: [0, 0, 0],
    material: { friction: 0.7, restitution: 0.25 },
  }));

  const tex = useMemo(() => createGroundTexture(), []);

  return (
    <mesh ref={ref} receiveShadow>
      <planeGeometry args={[16, 12]} />
      <meshStandardMaterial map={tex} roughness={0.75} metalness={0.01} />
    </mesh>
  );
}

// 보이지 않는 벽 (윷이 너무 멀리 안 가도록)
function Walls() {
  usePlane(() => ({ position: [0, 3, -4], rotation: [0, 0, 0] }));
  usePlane(() => ({ position: [0, 3, 4], rotation: [0, Math.PI, 0] }));
  usePlane(() => ({ position: [-5, 3, 0], rotation: [0, Math.PI / 2, 0] }));
  usePlane(() => ({ position: [5, 3, 0], rotation: [0, -Math.PI / 2, 0] }));
  return null;
}

// 카메라 설정
function CameraSetup() {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(0, 6, 7);
    camera.lookAt(0, 0, 0);
  }, [camera]);
  return null;
}

// 포스트 프로세싱
function Effects() {
  return (
    <EffectComposer>
      <N8AO aoRadius={0.8} intensity={1.5} distanceFalloff={0.5} />
      <Bloom luminanceThreshold={0.9} luminanceSmoothing={0.4} intensity={0.15} />
      <ToneMapping />
    </EffectComposer>
  );
}

// 메인 씬
function ThrowScene({ phase, stickResults, onAllLanded }) {
  const landedCount = useRef(0);

  useEffect(() => {
    landedCount.current = 0;
  }, [phase]);

  const handleLanded = useCallback((idx) => {
    landedCount.current++;
    if (landedCount.current >= 4 && onAllLanded) {
      onAllLanded();
    }
  }, [onAllLanded]);

  return (
    <Physics gravity={[0, -15, 0]} allowSleep={true}>
      <CameraSetup />

      <ambientLight intensity={0.3} color="#ffeedd" />
      <directionalLight
        position={[5, 12, 8]}
        intensity={1.6}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={30}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
        shadow-bias={-0.0005}
        color="#fff8f0"
      />
      <directionalLight position={[-3, 5, -5]} intensity={0.2} color="#e0e8ff" />
      <hemisphereLight args={['#ffeebb', '#445566', 0.3]} />

      {[0, 1, 2, 3].map(i => (
        <PhysicsStick
          key={i}
          index={i}
          phase={phase}
          isFlat={stickResults[i]}
          onLanded={handleLanded}
          delay={i * 0.08}
        />
      ))}

      <Ground />
      <Walls />
      <Environment preset="apartment" />
      <Effects />
    </Physics>
  );
}

// 최종 Export
function YutThrowScene({ isVisible, phase, stickResults, onAllLanded }) {
  if (!isVisible) return null;

  return (
    <div className="yut-throw-3d-canvas">
      <Canvas
        shadows
        camera={{ position: [0, 6, 7], fov: 35, near: 0.1, far: 60 }}
        gl={{
          antialias: true,
          alpha: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.0,
          outputColorSpace: THREE.SRGBColorSpace,
        }}
        style={{ background: 'transparent' }}
        dpr={[1, 2]}
      >
        <ThrowScene
          phase={phase}
          stickResults={stickResults}
          onAllLanded={onAllLanded}
        />
      </Canvas>
    </div>
  );
}

export default YutThrowScene;
