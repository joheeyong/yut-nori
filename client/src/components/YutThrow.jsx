import React, { useState, useEffect, useCallback } from 'react';
import { YUT_NAMES, EXTRA_THROW_VALUES } from '../game/constants';

function YutThrow({ onThrow, disabled, pendingThrows, isOverlay }) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [stickResults, setStickResults] = useState([false, false, false, false]); // true = flat
  const [displayResult, setDisplayResult] = useState(null);
  const [showResult, setShowResult] = useState(false);

  const getStickStates = (value) => {
    if (!value) return [false, false, false, false];
    if (value === 5) return [false, false, false, false]; // 모: 전부 뒷면
    // 도=1, 개=2, 걸=3, 윷=4 (앞면 개수)
    const states = Array(4).fill(false);
    // 랜덤 위치에 앞면 배치
    const indices = [0, 1, 2, 3];
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    for (let i = 0; i < value; i++) {
      states[indices[i]] = true;
    }
    return states;
  };

  const handleThrow = useCallback(() => {
    if (disabled || isAnimating) return;

    setIsAnimating(true);
    setShowResult(false);
    setDisplayResult(null);

    // 결과 미리 계산
    const result = onThrow();
    const states = getStickStates(result);

    // 1단계: 윷 날아가는 애니메이션 (1.2초)
    // 2단계: 착지 후 결과 표시
    setTimeout(() => {
      setStickResults(states);
      setDisplayResult(result);

      setTimeout(() => {
        setShowResult(true);
        setTimeout(() => {
          setIsAnimating(false);
        }, 1200);
      }, 400);
    }, 1200);

    return result;
  }, [disabled, isAnimating, onThrow]);

  // 각 윷 스틱별 랜덤 회전값 생성
  const [rotations] = useState(() =>
    Array.from({ length: 4 }, () => ({
      spinX: 720 + Math.random() * 360,
      spinY: 360 + Math.random() * 720,
      spinZ: Math.random() * 180 - 90,
      offsetX: Math.random() * 60 - 30,
      offsetY: Math.random() * 30 - 15,
      delay: Math.random() * 0.15,
    }))
  );

  // 애니메이션 시작할 때 새 회전값
  const [animRotations, setAnimRotations] = useState(rotations);
  useEffect(() => {
    if (isAnimating) {
      setAnimRotations(
        Array.from({ length: 4 }, () => ({
          spinX: 720 + Math.random() * 360,
          spinY: 360 + Math.random() * 720,
          spinZ: Math.random() * 180 - 90,
          offsetX: Math.random() * 60 - 30,
          offsetY: Math.random() * 30 - 15,
          delay: Math.random() * 0.15,
        }))
      );
    }
  }, [isAnimating]);

  return (
    <div className={`yut-throw ${isOverlay ? 'yut-throw-overlay' : ''}`}>
      {/* 던지기 버튼 (오버레이가 아닌 경우 또는 대기 중일 때) */}
      {!isAnimating && !showResult && (
        <button
          className="throw-button"
          onClick={handleThrow}
          disabled={disabled}
        >
          {disabled ? '대기 중...' : '윷 던지기'}
        </button>
      )}

      {/* 3D 윷 애니메이션 영역 */}
      {(isAnimating || showResult) && (
        <div className="yut-3d-scene">
          <div className="yut-sticks-3d">
            {[0, 1, 2, 3].map((i) => {
              const rot = animRotations[i];
              const isFlat = stickResults[i];
              const landed = displayResult !== null;

              return (
                <div
                  key={i}
                  className={`yut-stick-container ${isAnimating && !landed ? 'throwing' : ''} ${landed ? 'landed' : ''}`}
                  style={{
                    '--spin-x': `${rot.spinX}deg`,
                    '--spin-y': `${rot.spinY}deg`,
                    '--spin-z': `${rot.spinZ}deg`,
                    '--offset-x': `${rot.offsetX}px`,
                    '--offset-y': `${rot.offsetY}px`,
                    '--delay': `${rot.delay}s`,
                    '--land-rotation': isFlat ? '0deg' : '180deg',
                    '--land-offset-x': `${(i - 1.5) * 50}px`,
                  }}
                >
                  <div className={`yut-stick-3d ${landed ? (isFlat ? 'show-flat' : 'show-round') : ''}`}>
                    {/* 앞면 (평평한 면) */}
                    <div className="yut-face yut-flat">
                      <div className="yut-wood-grain"></div>
                      <div className="yut-mark"></div>
                    </div>
                    {/* 뒷면 (둥근 면) */}
                    <div className="yut-face yut-round">
                      <div className="yut-round-highlight"></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 결과 표시 */}
          {showResult && displayResult && (
            <div className="yut-result-overlay">
              <span className="yut-result-name">{YUT_NAMES[displayResult]}</span>
              <span className="yut-result-steps">{displayResult}칸</span>
              {EXTRA_THROW_VALUES.includes(displayResult) && (
                <span className="yut-result-extra">한 번 더!</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* 대기 중인 윷 결과 */}
      {pendingThrows.length > 0 && !isAnimating && (
        <div className="pending-throws">
          <span>사용할 윷: </span>
          {pendingThrows.map((t, i) => (
            <span key={i} className="pending-throw-badge">
              {YUT_NAMES[t]}({t})
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default YutThrow;
