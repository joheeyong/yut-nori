import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { createWoodTexture, createDarkWoodTexture, createWoodBumpMap } from '../game/textures';

// 윷 스틱 3D 모델 - 반원기둥 형태 (평평한 면 + 둥근 면)
function YutStick3D({ isFlat, position = [0, 0, 0], rotation = [0, 0, 0] }) {
  const meshRef = useRef();

  // 텍스처 생성 (메모이제이션)
  const { flatMaterial, roundMaterial, sideMaterial } = useMemo(() => {
    const lightWoodTex = createWoodTexture(512, 512);
    const darkWoodTex = createDarkWoodTexture(512, 512);
    const bumpMap = createWoodBumpMap(256, 256);

    const flatMat = new THREE.MeshStandardMaterial({
      map: lightWoodTex,
      bumpMap: bumpMap,
      bumpScale: 0.3,
      roughness: 0.65,
      metalness: 0.02,
      side: THREE.FrontSide,
    });

    const roundMat = new THREE.MeshStandardMaterial({
      map: darkWoodTex,
      bumpMap: bumpMap,
      bumpScale: 0.4,
      roughness: 0.5,
      metalness: 0.03,
      side: THREE.FrontSide,
    });

    const sideMat = new THREE.MeshStandardMaterial({
      map: createWoodTexture(256, 256, {
        baseColor: [180, 140, 90],
        grainColor: [150, 110, 65],
        darkColor: [120, 85, 50],
      }),
      bumpMap: bumpMap,
      bumpScale: 0.2,
      roughness: 0.6,
      metalness: 0.02,
    });

    return { flatMaterial: flatMat, roundMaterial: roundMat, sideMaterial: sideMat };
  }, []);

  // 윷 스틱 지오메트리: 반원기둥 (D형 단면)
  const geometry = useMemo(() => {
    const stickLength = 3.2;
    const stickWidth = 0.65;
    const stickDepth = 0.35;
    const segments = 24;
    const lengthSegments = 1;

    // D형 단면 Shape
    const shape = new THREE.Shape();
    // 평평한 바닥면
    shape.moveTo(-stickWidth / 2, 0);
    shape.lineTo(stickWidth / 2, 0);
    // 둥근 윗면 (반원)
    const steps = segments;
    for (let i = 0; i <= steps; i++) {
      const angle = Math.PI * (1 - i / steps);
      const x = (stickWidth / 2) * Math.cos(angle);
      const y = stickDepth * Math.sin(angle);
      shape.lineTo(x, y);
    }
    shape.closePath();

    // 양쪽 끝을 약간 둥글게 테이퍼링하여 Extrude
    const extrudeSettings = {
      steps: lengthSegments,
      depth: stickLength,
      bevelEnabled: true,
      bevelThickness: 0.08,
      bevelSize: 0.05,
      bevelSegments: 4,
    };

    const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);

    // 센터 정렬
    geo.translate(0, 0, -stickLength / 2);

    // 면별 material index 할당을 위해 groups 설정
    // ExtrudeGeometry의 기본 groups: 0=front, 1=back, 2=side
    // 우리는 별도 처리하므로 단일 geometry 사용

    return geo;
  }, []);

  return (
    <group position={position} rotation={rotation}>
      <mesh ref={meshRef} geometry={geometry} castShadow receiveShadow>
        <meshStandardMaterial
          attach="material"
          map={isFlat ? flatMaterial.map : roundMaterial.map}
          bumpMap={flatMaterial.bumpMap}
          bumpScale={0.3}
          roughness={0.6}
          metalness={0.02}
        />
      </mesh>
    </group>
  );
}

export default YutStick3D;
