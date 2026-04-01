import React, { useState, useCallback } from 'react';
import YutThrowScene from './YutThrowScene';
import { YUT_NAMES, EXTRA_THROW_VALUES } from '../game/constants';

function YutThrow({ onThrow, disabled, pendingThrows, isOverlay }) {
  const [phase, setPhase] = useState('idle'); // idle | throwing | result
  const [stickResults, setStickResults] = useState([false, false, false, false]);
  const [displayResult, setDisplayResult] = useState(null);
  const [showResult, setShowResult] = useState(false);

  const getStickStates = (value) => {
    if (!value) return [false, false, false, false];
    const flatCount = value === 5 ? 0 : value;
    const states = Array(4).fill(false);
    const indices = [0, 1, 2, 3];
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    for (let i = 0; i < flatCount; i++) {
      states[indices[i]] = true;
    }
    return states;
  };

  const handleThrow = useCallback(() => {
    if (disabled || phase !== 'idle') return;

    const result = onThrow();
    const states = getStickStates(result);

    setStickResults(states);
    setDisplayResult(result);
    setShowResult(false);
    setPhase('throwing');

    return result;
  }, [disabled, phase, onThrow]);

  // 모든 윷이 착지하면 결과 표시
  const handleAllLanded = useCallback(() => {
    setShowResult(true);
    setTimeout(() => {
      setPhase('idle');
      setShowResult(false);
      setDisplayResult(null);
    }, 1800);
  }, []);

  const isSceneVisible = phase === 'throwing' || showResult;

  return (
    <div className={`yut-throw ${isOverlay ? 'yut-throw-overlay' : ''}`}>
      {/* 던지기 버튼 */}
      {phase === 'idle' && !showResult && (
        <button
          className="throw-button"
          onClick={handleThrow}
          disabled={disabled}
        >
          {disabled ? '대기 중...' : '윷 던지기'}
        </button>
      )}

      {/* 3D 윷 씬 */}
      <YutThrowScene
        isVisible={isSceneVisible}
        phase={phase === 'throwing' ? 'throwing' : 'idle'}
        stickResults={stickResults}
        onAllLanded={handleAllLanded}
      />

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

      {/* 대기 중인 윷 결과 */}
      {pendingThrows.length > 0 && phase === 'idle' && (
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
