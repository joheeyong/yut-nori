import React, { useState } from 'react';
import { YUT_NAMES, EXTRA_THROW_VALUES } from '../game/constants';

function YutThrow({ onThrow, disabled, pendingThrows }) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [displayResult, setDisplayResult] = useState(null);

  const handleThrow = () => {
    if (disabled || isAnimating) return;

    setIsAnimating(true);
    setDisplayResult(null);

    // 던지기 애니메이션 (윷 흔들기)
    let count = 0;
    const interval = setInterval(() => {
      setDisplayResult(Math.floor(Math.random() * 5) + 1);
      count++;
      if (count >= 8) {
        clearInterval(interval);
        const result = onThrow();
        setDisplayResult(result);
        setTimeout(() => {
          setIsAnimating(false);
        }, 500);
      }
    }, 100);
  };

  // 윷 스틱 SVG
  const renderYutStick = (index, isFlat) => {
    const x = 20 + index * 35;
    return (
      <g key={index} transform={`translate(${x}, 10)`}>
        <rect
          width="25"
          height="80"
          rx="5"
          fill={isFlat ? '#f5e6c8' : '#8B4513'}
          stroke="#5C3317"
          strokeWidth="2"
        />
        {isFlat && (
          <line x1="5" y1="40" x2="20" y2="40" stroke="#8B7355" strokeWidth="1" />
        )}
        {!isFlat && (
          <ellipse cx="12.5" cy="40" rx="8" ry="30" fill="#A0522D" opacity="0.3" />
        )}
      </g>
    );
  };

  // 결과에 따른 윷 스틱 상태 (앞면=flat 개수)
  const getStickStates = (value) => {
    if (!value) return [false, false, false, false];
    const flatCount = value === 5 ? 0 : value;
    return Array.from({ length: 4 }, (_, i) => i < flatCount);
  };

  const stickStates = getStickStates(displayResult);

  return (
    <div className="yut-throw">
      <div className="yut-sticks">
        <svg width="160" height="100" viewBox="0 0 160 100">
          {stickStates.map((isFlat, i) => renderYutStick(i, isFlat))}
        </svg>
      </div>

      {displayResult && (
        <div className={`yut-result ${isAnimating ? 'animating' : ''}`}>
          <span className="result-name">{YUT_NAMES[displayResult]}</span>
          <span className="result-steps">({displayResult}칸)</span>
          {EXTRA_THROW_VALUES.includes(displayResult) && !isAnimating && (
            <span className="extra-throw">★ 한 번 더!</span>
          )}
        </div>
      )}

      <button
        className="throw-button"
        onClick={handleThrow}
        disabled={disabled || isAnimating}
      >
        {isAnimating ? '던지는 중...' : '윷 던지기'}
      </button>

      {pendingThrows.length > 0 && (
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
