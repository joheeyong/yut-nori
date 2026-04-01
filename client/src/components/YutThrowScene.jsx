import React, { useRef, useEffect, useMemo, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { ContactShadows, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { createWoodTexture, createDarkWoodTexture, createWoodBumpMap } from '../game/textures';

// 실제 윷 지오메트리 생성: 둥근 나무를 반으로 쪼갠 반원기둥
// - 앞면(flat): 평평한 면 (나무를 쪼갠 단면)
// - 뒷면(round): 둥근 면 (나무 껍질 쪽)
// - 양끝은 약간 테이퍼
function createYutGeometry() {
  const length = 3.6;       // 길이
  const radius = 0.42;      // 반지름 (두께 = 반지름, 너비 = 지름)
  const segments = 32;       // 둥근면 세그먼트 수
  const lengthSegs = 12;     // 길이 방향 세그먼트
  const taperAmount = 0.15;  // 양끝 테이퍼 비율

  const vertices = [];
  const normals = [];
  const uvs = [];
  const indices = [];

  // 길이 방향 테이퍼 함수 (양끝이 살짝 좁아짐)
  function taperScale(t) {
    // t: 0~1 (길이방향 비율)
    const center = 0.5;
    const dist = Math.abs(t - center) * 2; // 0(중앙)~1(끝)
    return 1.0 - taperAmount * dist * dist;
  }

  // === 둥근 면 (윗면, 반원) ===
  const roundStart = 0;
  for (let j = 0; j <= lengthSegs; j++) {
    const t = j / lengthSegs;
    const z = (t - 0.5) * length;
    const scale = taperScale(t);

    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI; // 0 ~ PI (반원)
      const x = Math.cos(angle) * radius * scale;
      const y = Math.sin(angle) * radius * scale;

      vertices.push(x, y, z);
      // 법선: 방사형
      const nx = Math.cos(angle);
      const ny = Math.sin(angle);
      normals.push(nx, ny, 0);
      uvs.push(i / segments, t);
    }
  }

  // 둥근 면 인덱스
  for (let j = 0; j < lengthSegs; j++) {
    for (let i = 0; i < segments; i++) {
      const a = roundStart + j * (segments + 1) + i;
      const b = a + 1;
      const c = a + (segments + 1);
      const d = c + 1;
      indices.push(a, c, b);
      indices.push(b, c, d);
    }
  }

  const roundCount = indices.length;

  // === 평평한 면 (바닥면) ===
  const flatStart = vertices.length / 3;
  for (let j = 0; j <= lengthSegs; j++) {
    const t = j / lengthSegs;
    const z = (t - 0.5) * length;
    const scale = taperScale(t);

    // 평면의 두 끝점 (x = -radius*scale ~ +radius*scale, y = 0)
    vertices.push(-radius * scale, 0, z);
    normals.push(0, -1, 0);
    uvs.push(0, t);

    vertices.push(radius * scale, 0, z);
    normals.push(0, -1, 0);
    uvs.push(1, t);
  }

  // 평평한 면 인덱스
  for (let j = 0; j < lengthSegs; j++) {
    const a = flatStart + j * 2;
    const b = a + 1;
    const c = a + 2;
    const d = a + 3;
    // 법선이 아래를 향하므로 winding 반대
    indices.push(a, b, c);
    indices.push(b, d, c);
  }

  const flatCount = indices.length - roundCount;

  // === 양쪽 끝면 (반원형 캡) ===
  // 앞쪽 캡 (z = +length/2)
  const frontZ = length / 2;
  const frontScale = taperScale(1);
  const frontCenter = vertices.length / 3;
  vertices.push(0, 0, frontZ);
  normals.push(0, 0, 1);
  uvs.push(0.5, 0.5);

  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI;
    vertices.push(
      Math.cos(angle) * radius * frontScale,
      Math.sin(angle) * radius * frontScale,
      frontZ
    );
    normals.push(0, 0, 1);
    uvs.push(Math.cos(angle) * 0.5 + 0.5, Math.sin(angle) * 0.5 + 0.5);
  }

  for (let i = 0; i < segments; i++) {
    indices.push(frontCenter, frontCenter + 1 + i, frontCenter + 2 + i);
  }

  // 뒤쪽 캡 (z = -length/2)
  const backZ = -length / 2;
  const backScale = taperScale(0);
  const backCenter = vertices.length / 3;
  vertices.push(0, 0, backZ);
  normals.push(0, 0, -1);
  uvs.push(0.5, 0.5);

  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI;
    vertices.push(
      Math.cos(angle) * radius * backScale,
      Math.sin(angle) * radius * backScale,
      backZ
    );
    normals.push(0, 0, -1);
    uvs.push(Math.cos(angle) * 0.5 + 0.5, Math.sin(angle) * 0.5 + 0.5);
  }

  for (let i = 0; i < segments; i++) {
    indices.push(backCenter, backCenter + 2 + i, backCenter + 1 + i);
  }

  const capCount = indices.length - roundCount - flatCount;

  // BufferGeometry 생성
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);

  // 면별 그룹 (material index)
  // group 0: 둥근 면 (뒷면)
  // group 1: 평평한 면 (앞면)
  // group 2: 캡 (양쪽 끝)
  geo.clearGroups();
  geo.addGroup(0, roundCount, 0);
  geo.addGroup(roundCount, flatCount, 1);
  geo.addGroup(roundCount + flatCount, capCount, 2);

  // 길이방향이 X축이 되도록 회전
  geo.rotateY(Math.PI / 2);

  return geo;
}

// 단일 윷 스틱
function AnimatedStick({ index, phase, isFlat, onLanded, delay = 0 }) {
  const groupRef = useRef();
  const timeRef = useRef(0);
  const landedRef = useRef(false);

  const params = useMemo(() => ({
    throwSpinX: 5 + Math.random() * 8,
    throwSpinZ: (Math.random() - 0.5) * 3,
    throwSpinY: (Math.random() - 0.5) * 2,
    throwHeight: 4 + Math.random() * 2.5,
    landX: (index - 1.5) * 1.4 + (Math.random() - 0.5) * 0.5,
    landZ: (Math.random() - 0.5) * 1.0,
    landRotY: (Math.random() - 0.5) * 0.6,
    landRotZ: (Math.random() - 0.5) * 0.25,
    wobbleSpeed: 10 + Math.random() * 5,
    wobbleAmount: 0.04 + Math.random() * 0.04,
  }), [index]);

  // 재질: [둥근면(뒷면), 평평한면(앞면), 캡(옆면)]
  const materials = useMemo(() => {
    const lightTex = createWoodTexture(512, 512, {
      baseColor: [225, 195, 145],
      grainColor: [195, 160, 110],
      darkColor: [170, 135, 85],
      grainDensity: 45,
    });
    const darkTex = createDarkWoodTexture(512, 512);
    const sideTex = createWoodTexture(256, 256, {
      baseColor: [185, 150, 100],
      grainColor: [155, 120, 75],
      darkColor: [130, 95, 55],
    });
    const bumpTex = createWoodBumpMap(256, 256);

    // 둥근 면 (나무 껍질 쪽 - 어둡고 거친)
    const roundMat = new THREE.MeshStandardMaterial({
      map: darkTex,
      bumpMap: bumpTex,
      bumpScale: 0.5,
      roughness: 0.55,
      metalness: 0.02,
    });

    // 평평한 면 (쪼갠 단면 - 밝고 매끈)
    const flatMat = new THREE.MeshStandardMaterial({
      map: lightTex,
      bumpMap: bumpTex,
      bumpScale: 0.15,
      roughness: 0.4,
      metalness: 0.01,
    });

    // 캡 (양쪽 끝)
    const capMat = new THREE.MeshStandardMaterial({
      map: sideTex,
      bumpMap: bumpTex,
      bumpScale: 0.3,
      roughness: 0.55,
      metalness: 0.02,
    });

    return [roundMat, flatMat, capMat];
  }, []);

  const geometry = useMemo(() => createYutGeometry(), []);

  useFrame((_, delta) => {
    if (!groupRef.current || phase === 'idle') return;

    if (phase === 'throwing') {
      timeRef.current += delta;
      const t = Math.max(0, timeRef.current - delay);
      if (t <= 0) return;

      const duration = 1.5;
      const progress = Math.min(t / duration, 1);

      if (progress < 1) {
        // 비행 궤적: 포물선 + 회전
        const heightCurve = Math.sin(progress * Math.PI) * params.throwHeight;
        const xProgress = progress;

        groupRef.current.position.set(
          params.landX * xProgress,
          heightCurve + 0.25,
          params.landZ * xProgress
        );

        // 공중 회전 (X축 기준 주 회전 + Y,Z 보조 회전)
        groupRef.current.rotation.set(
          progress * Math.PI * 2 * params.throwSpinX,
          progress * params.throwSpinY * Math.PI,
          progress * params.throwSpinZ * Math.PI
        );
      } else {
        // 착지: 앞면(flat) = 평평한 면이 위(y=0이 바닥) → rotX=Math.PI
        //       뒷면(round) = 둥근 면이 위 → rotX=0
        const finalRotX = isFlat ? Math.PI : 0;
        const landY = isFlat ? radius() : 0.25;

        groupRef.current.position.set(params.landX, landY, params.landZ);
        groupRef.current.rotation.set(finalRotX, params.landRotY, params.landRotZ);

        // 착지 흔들림
        const wobbleTime = t - duration;
        if (wobbleTime > 0 && wobbleTime < 1.0) {
          const decay = Math.max(0, 1 - wobbleTime / 1.0);
          const wobble = Math.sin(wobbleTime * params.wobbleSpeed) * params.wobbleAmount * decay;
          groupRef.current.rotation.z += wobble;
          groupRef.current.position.y += Math.abs(wobble) * 0.3;
        }

        if (!landedRef.current && wobbleTime > 1.0) {
          landedRef.current = true;
          if (onLanded) onLanded(index);
        }
      }
    }
  });

  useEffect(() => {
    timeRef.current = 0;
    landedRef.current = false;
    if (groupRef.current) {
      if (phase === 'idle') {
        groupRef.current.position.set(0, -5, 0);
      } else {
        groupRef.current.position.set(0, 0, 0);
        groupRef.current.rotation.set(0, 0, 0);
      }
    }
  }, [phase]);

  return (
    <group ref={groupRef} position={[0, phase === 'idle' ? -5 : 0, 0]}>
      <mesh geometry={geometry} material={materials} castShadow receiveShadow />
    </group>
  );
}

function radius() { return 0.35; }

// 바닥
function Ground() {
  const texture = useMemo(() => {
    return createWoodTexture(1024, 1024, {
      baseColor: [200, 170, 125],
      grainColor: [170, 140, 95],
      darkColor: [140, 110, 70],
      grainDensity: 55,
    });
  }, []);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
      <planeGeometry args={[14, 10]} />
      <meshStandardMaterial map={texture} roughness={0.65} metalness={0.02} />
    </mesh>
  );
}

// 메인 씬
function ThrowScene({ phase, stickResults, onAllLanded }) {
  const landedCount = useRef(0);

  useEffect(() => {
    landedCount.current = 0;
  }, [phase]);

  const handleLanded = useCallback(() => {
    landedCount.current++;
    if (landedCount.current >= 4 && onAllLanded) {
      onAllLanded();
    }
  }, [onAllLanded]);

  return (
    <>
      {/* 조명: 자연광 느낌 */}
      <ambientLight intensity={0.35} />
      <directionalLight
        position={[4, 10, 6]}
        intensity={1.4}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={25}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
        shadow-bias={-0.001}
      />
      <directionalLight position={[-4, 5, -3]} intensity={0.25} color="#ffeedd" />
      <pointLight position={[0, 6, 2]} intensity={0.4} color="#fff5e0" />
      {/* 뒤에서 살짝 비추는 림 라이트 */}
      <pointLight position={[0, 3, -4]} intensity={0.2} color="#cce0ff" />

      {[0, 1, 2, 3].map(i => (
        <AnimatedStick
          key={i}
          index={i}
          phase={phase}
          isFlat={stickResults[i]}
          onLanded={handleLanded}
          delay={i * 0.06}
        />
      ))}

      <Ground />
      <ContactShadows
        position={[0, 0, 0]}
        opacity={0.6}
        scale={12}
        blur={2.5}
        far={5}
        color="#3a2510"
      />
      <Environment preset="apartment" />
    </>
  );
}

function YutThrowScene({ isVisible, phase, stickResults, onAllLanded }) {
  if (!isVisible) return null;

  return (
    <div className="yut-throw-3d-canvas">
      <Canvas
        shadows
        camera={{
          position: [0, 4.5, 5.5],
          fov: 38,
          near: 0.1,
          far: 50,
        }}
        gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.1 }}
        style={{ background: 'transparent' }}
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
