import React, { useRef, useEffect, useMemo, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { ContactShadows, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { createWoodTexture, createDarkWoodTexture, createWoodBumpMap } from '../game/textures';

// 단일 윷 스틱 (물리 기반 애니메이션)
function AnimatedStick({ index, phase, isFlat, onLanded, delay = 0 }) {
  const groupRef = useRef();
  const timeRef = useRef(0);
  const landedRef = useRef(false);

  // 각 스틱별 랜덤 파라미터
  const params = useMemo(() => ({
    throwSpinX: 4 + Math.random() * 6,
    throwSpinZ: (Math.random() - 0.5) * 4,
    throwHeight: 3.5 + Math.random() * 2,
    landX: (index - 1.5) * 1.2 + (Math.random() - 0.5) * 0.4,
    landZ: (Math.random() - 0.5) * 0.8,
    landRotZ: (Math.random() - 0.5) * 0.3,
    wobbleSpeed: 8 + Math.random() * 4,
    wobbleAmount: 0.03 + Math.random() * 0.03,
  }), [index]);

  // 텍스처
  const { flatMat, roundMat } = useMemo(() => {
    const lightTex = createWoodTexture(512, 512);
    const darkTex = createDarkWoodTexture(512, 512);
    const bumpTex = createWoodBumpMap(256, 256);

    return {
      flatMat: new THREE.MeshStandardMaterial({
        map: lightTex, bumpMap: bumpTex, bumpScale: 0.25,
        roughness: 0.62, metalness: 0.02,
      }),
      roundMat: new THREE.MeshStandardMaterial({
        map: darkTex, bumpMap: bumpTex, bumpScale: 0.35,
        roughness: 0.48, metalness: 0.03,
      }),
    };
  }, []);

  // D형 단면 지오메트리
  const geometry = useMemo(() => {
    const length = 3.0;
    const width = 0.6;
    const depth = 0.32;

    const shape = new THREE.Shape();
    shape.moveTo(-width / 2, 0);
    shape.lineTo(width / 2, 0);
    for (let i = 0; i <= 20; i++) {
      const angle = Math.PI * (1 - i / 20);
      shape.lineTo(
        (width / 2) * Math.cos(angle),
        depth * Math.sin(angle)
      );
    }
    shape.closePath();

    const geo = new THREE.ExtrudeGeometry(shape, {
      steps: 1,
      depth: length,
      bevelEnabled: true,
      bevelThickness: 0.06,
      bevelSize: 0.04,
      bevelSegments: 3,
    });

    geo.translate(0, 0, -length / 2);
    // 윷은 길이방향이 X축이 되도록 회전
    geo.rotateY(Math.PI / 2);

    return geo;
  }, []);

  useFrame((_, delta) => {
    if (!groupRef.current || phase === 'idle') return;

    if (phase === 'throwing') {
      timeRef.current += delta;
      const t = Math.max(0, timeRef.current - delay);

      if (t <= 0) return;

      const duration = 1.4;
      const progress = Math.min(t / duration, 1);

      if (progress < 1) {
        // 포물선 운동 + 회전
        const heightCurve = Math.sin(progress * Math.PI) * params.throwHeight;
        const spinProgress = progress * Math.PI * 2 * params.throwSpinX;
        const lateralProgress = progress;

        groupRef.current.position.set(
          params.landX * lateralProgress,
          heightCurve + 0.2,
          params.landZ * lateralProgress
        );

        groupRef.current.rotation.set(
          spinProgress,
          progress * params.throwSpinZ,
          params.landRotZ * progress
        );
      } else {
        // 착지
        const finalRotX = isFlat ? 0 : Math.PI;
        groupRef.current.position.set(params.landX, 0.18, params.landZ);
        groupRef.current.rotation.set(finalRotX, 0, params.landRotZ);

        // 착지 후 미세한 흔들림
        const wobbleTime = t - duration;
        if (wobbleTime > 0 && wobbleTime < 0.8) {
          const wobble = Math.sin(wobbleTime * params.wobbleSpeed)
            * params.wobbleAmount
            * Math.max(0, 1 - wobbleTime / 0.8);
          groupRef.current.rotation.z += wobble;
          groupRef.current.position.y += Math.abs(wobble) * 0.5;
        }

        if (!landedRef.current && wobbleTime > 0.8) {
          landedRef.current = true;
          if (onLanded) onLanded(index);
        }
      }
    }
  });

  // 리셋
  useEffect(() => {
    if (phase === 'idle') {
      timeRef.current = 0;
      landedRef.current = false;
      if (groupRef.current) {
        groupRef.current.position.set(0, -5, 0);
      }
    }
    if (phase === 'throwing') {
      timeRef.current = 0;
      landedRef.current = false;
      if (groupRef.current) {
        groupRef.current.position.set(0, 0, 0);
        groupRef.current.rotation.set(0, 0, 0);
      }
    }
  }, [phase]);

  return (
    <group ref={groupRef} position={[0, phase === 'idle' ? -5 : 0, 0]}>
      <mesh geometry={geometry} material={isFlat ? flatMat : roundMat} castShadow />
      {/* 앞면 장식 마크 (평평한 면일 때) */}
      {isFlat && (
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.06, 16]} />
          <meshStandardMaterial color="#6B4E16" roughness={0.8} />
        </mesh>
      )}
    </group>
  );
}

// 바닥 (나무판 느낌)
function Ground() {
  const texture = useMemo(() => {
    return createWoodTexture(1024, 1024, {
      baseColor: [195, 160, 110],
      grainColor: [165, 130, 85],
      darkColor: [135, 100, 60],
      grainDensity: 60,
    });
  }, []);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
      <planeGeometry args={[12, 8]} />
      <meshStandardMaterial
        map={texture}
        roughness={0.7}
        metalness={0.02}
      />
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
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[5, 8, 5]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-far={20}
        shadow-camera-left={-5}
        shadow-camera-right={5}
        shadow-camera-top={5}
        shadow-camera-bottom={-5}
      />
      <directionalLight position={[-3, 6, -4]} intensity={0.3} />
      <pointLight position={[0, 4, 0]} intensity={0.5} />

      {[0, 1, 2, 3].map(i => (
        <AnimatedStick
          key={i}
          index={i}
          phase={phase}
          isFlat={stickResults[i]}
          onLanded={handleLanded}
          delay={i * 0.05}
        />
      ))}

      <Ground />
      <ContactShadows
        position={[0, 0, 0]}
        opacity={0.5}
        scale={10}
        blur={2}
        far={4}
      />
      <Environment preset="apartment" />
    </>
  );
}

// 3D 윷 던지기 컴포넌트
function YutThrowScene({ isVisible, phase, stickResults, onAllLanded }) {
  if (!isVisible) return null;

  return (
    <div className="yut-throw-3d-canvas">
      <Canvas
        shadows
        camera={{ position: [0, 5.5, 5], fov: 40, near: 0.1, far: 50 }}
        gl={{ antialias: true, alpha: true }}
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
