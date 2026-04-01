import React, { useState, useCallback, useEffect, useRef } from 'react';
import YutThrowScene from './YutThrowScene';
import { YUT_NAMES, EXTRA_THROW_VALUES, AI } from '../game/constants';

function YutThrow({ onThrowResult, disabled, autoThrow, currentPlayer, pendingThrows, isOverlay }) {
  const [phase, setPhase] = useState('idle'); // idle | throwing | result
  const [displayResult, setDisplayResult] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const autoThrowTriggered = useRef(false);

  // 플레이어 수동 던지기
  const handleThrow = useCallback(() => {
    if (disabled || phase !== 'idle') return;
    setDisplayResult(null);
    setShowResult(false);
    setPhase('throwing');
  }, [disabled, phase]);

  // AI 자동 던지기
  useEffect(() => {
    if (autoThrow && phase === 'idle' && !autoThrowTriggered.current) {
      autoThrowTriggered.current = true;
      setDisplayResult(null);
      setShowResult(false);
      setPhase('throwing');
    }
    if (!autoThrow) {
      autoThrowTriggered.current = false;
    }
  }, [autoThrow, phase]);

  // 3D 물리에서 결과 확정
  const handleResult = useCallback((value) => {
    setDisplayResult(value);
    if (onThrowResult) onThrowResult(value);
  }, [onThrowResult]);

  // 모든 윷이 착지 + 결과 확정 후 표시
  const handleAllLanded = useCallback(() => {
    setShowResult(true);
    setTimeout(() => {
      setPhase('idle');
      setShowResult(false);
      setDisplayResult(null);
    }, 1800);
  }, []);

  const isSceneVisible = phase === 'throwing' || showResult;
  const isAI = currentPlayer === AI;

  return (
    <div className={`yut-throw ${isOverlay ? 'yut-throw-overlay' : ''}`}>
      {/* 던지기 버튼 (플레이어 턴에만) */}
      {phase === 'idle' && !showResult && !isAI && (
        <button
          className="throw-button"
          onClick={handleThrow}
          disabled={disabled}
        >
          {disabled ? '대기 중...' : '윷 던지기'}
        </button>
      )}

      {/* AI 던지기 중 표시 */}
      {phase === 'throwing' && isAI && (
        <div className="ai-throwing-label">AI가 던지는 중...</div>
      )}

      {/* 3D 윷 씬 */}
      <YutThrowScene
        isVisible={isSceneVisible}
        phase={phase === 'throwing' ? 'throwing' : 'idle'}
        onResult={handleResult}
        onAllLanded={handleAllLanded}
      />

      {/* 결과 표시 */}
      {showResult && displayResult && (
        <div className="yut-result-overlay">
          <span className="yut-result-name">
            {isAI ? 'AI: ' : ''}{YUT_NAMES[displayResult]}
          </span>
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
