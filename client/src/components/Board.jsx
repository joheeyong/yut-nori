import React, { useState, useEffect, useRef } from 'react';
import {
  NODE_POSITIONS, BOARD_LINES, HOME, PLAYER, AI,
} from '../game/constants';

const BOARD_SIZE = 600;
const NODE_RADIUS = 16;
const PIECE_RADIUS = 14;

// 꼭짓점 노드 (0, 5, 10, 15, 22)
const CORNER_NODES = [0, 5, 10, 15, 22];

// 귀여운 캐릭터 이모지
const PLAYER_CHARS = ['🐶', '🐱', '🐰', '🐻'];
const AI_CHARS = ['🦊', '🐸', '🐧', '🐨'];

// 애니메이션 중인 말 추적
function AnimatedPiece({ fromPos, toPos, children, onComplete }) {
  const [pos, setPos] = useState(fromPos || toPos);
  const animRef = useRef(null);
  const startTime = useRef(null);
  const duration = 400; // ms

  useEffect(() => {
    if (!fromPos || (fromPos.x === toPos.x && fromPos.y === toPos.y)) {
      setPos(toPos);
      return;
    }

    startTime.current = performance.now();

    const animate = (now) => {
      const elapsed = now - startTime.current;
      const t = Math.min(elapsed / duration, 1);
      // easeOutBack for bouncy feel
      const ease = 1 + 2.7 * Math.pow(t - 1, 3) + 1.7 * Math.pow(t - 1, 2);

      setPos({
        x: fromPos.x + (toPos.x - fromPos.x) * ease,
        y: fromPos.y + (toPos.y - fromPos.y) * ease,
      });

      if (t < 1) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        setPos(toPos);
        if (onComplete) onComplete();
      }
    };

    animRef.current = requestAnimationFrame(animate);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [fromPos, toPos, onComplete]);

  return children(pos);
}

function Board({ pieces, currentPlayer, movablePieces, onPieceClick, selectedThrow }) {
  const playerPieces = pieces[PLAYER];
  const aiPieces = pieces[AI];

  // 이전 위치 기록 (애니메이션용)
  const prevPositions = useRef({});

  useEffect(() => {
    const newPositions = {};
    playerPieces.forEach(p => {
      newPositions[`${PLAYER}-${p.id}`] = p.position;
    });
    aiPieces.forEach(p => {
      newPositions[`${AI}-${p.id}`] = p.position;
    });

    // 약간의 딜레이 후 이전 위치 갱신
    const timer = setTimeout(() => {
      prevPositions.current = newPositions;
    }, 500);
    return () => clearTimeout(timer);
  }, [playerPieces, aiPieces]);

  // 같은 위치에 있는 말들 그룹핑
  const getPiecesAtNode = (nodeId) => {
    const result = [];
    playerPieces.forEach(p => {
      if (p.position === nodeId && !p.finished) {
        result.push({ ...p, owner: PLAYER });
      }
    });
    aiPieces.forEach(p => {
      if (p.position === nodeId && !p.finished) {
        result.push({ ...p, owner: AI });
      }
    });
    return result;
  };

  // 이동 가능한 말인지 확인
  const isMovable = (owner, pieceId) => {
    if (owner !== currentPlayer) return false;
    return movablePieces.some(m => m.pieceId === pieceId);
  };

  // 이전 위치 가져오기
  const getPrevPos = (owner, pieceId) => {
    const key = `${owner}-${pieceId}`;
    const prevNodeId = prevPositions.current[key];
    if (prevNodeId !== undefined && prevNodeId !== HOME && NODE_POSITIONS[prevNodeId]) {
      return NODE_POSITIONS[prevNodeId];
    }
    return null;
  };

  // 말 렌더링 (한 노드에 여러 말이 있을 때 오프셋)
  const renderPiecesAtNode = (nodeId) => {
    const piecesHere = getPiecesAtNode(nodeId);
    if (piecesHere.length === 0) return null;

    const targetPos = NODE_POSITIONS[nodeId];
    const offsets = [
      { dx: 0, dy: 0 },
      { dx: 16, dy: 0 },
      { dx: -16, dy: 0 },
      { dx: 0, dy: 16 },
    ];

    return piecesHere.map((piece, idx) => {
      const offset = offsets[idx] || { dx: 0, dy: 0 };
      const movable = isMovable(piece.owner, piece.id);
      const chars = piece.owner === PLAYER ? PLAYER_CHARS : AI_CHARS;
      const emoji = chars[piece.id % chars.length];
      const prevPos = getPrevPos(piece.owner, piece.id);
      const finalPos = { x: targetPos.x + offset.dx, y: targetPos.y + offset.dy };
      const fromPos = prevPos ? { x: prevPos.x + offset.dx, y: prevPos.y + offset.dy } : null;

      return (
        <AnimatedPiece
          key={`${piece.owner}-${piece.id}`}
          fromPos={fromPos}
          toPos={finalPos}
        >
          {(pos) => (
            <g
              style={{ cursor: movable ? 'pointer' : 'default' }}
              onClick={() => movable && onPieceClick(piece.id)}
              className={movable ? 'piece-movable' : ''}
            >
              {/* 그림자 */}
              <ellipse
                cx={pos.x}
                cy={pos.y + PIECE_RADIUS + 2}
                rx={PIECE_RADIUS * 0.7}
                ry={4}
                fill="rgba(0,0,0,0.15)"
              />
              {/* 말 배경 원 */}
              <circle
                cx={pos.x}
                cy={pos.y}
                r={PIECE_RADIUS}
                fill={piece.owner === PLAYER ? '#FFE0E0' : '#E0EEFF'}
                stroke={movable ? '#FFD700' : (piece.owner === PLAYER ? '#FF8A8A' : '#8AB4FF')}
                strokeWidth={movable ? 3 : 2}
                filter={movable ? 'url(#glow)' : ''}
              />
              {/* 캐릭터 이모지 */}
              <text
                x={pos.x}
                y={pos.y + 1}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="16"
                pointerEvents="none"
              >
                {emoji}
              </text>
            </g>
          )}
        </AnimatedPiece>
      );
    });
  };

  // HOME에 있는 말 렌더링
  const renderHomePieces = (owner) => {
    const homePieces = pieces[owner].filter(p => p.position === HOME && !p.finished);
    if (homePieces.length === 0) return null;

    const isPlayer = owner === PLAYER;
    const baseX = isPlayer ? 100 : 500;
    const baseY = 580;
    const chars = isPlayer ? PLAYER_CHARS : AI_CHARS;
    const label = isPlayer ? 'MY' : 'AI';

    return (
      <g>
        <text x={baseX} y={baseY - 28} textAnchor="middle" fill="#888" fontSize="11" fontWeight="600">
          {label}
        </text>
        {homePieces.map((piece, idx) => {
          const movable = isMovable(owner, piece.id);
          const emoji = chars[piece.id % chars.length];
          return (
            <g
              key={`home-${owner}-${piece.id}`}
              style={{ cursor: movable ? 'pointer' : 'default' }}
              onClick={() => movable && onPieceClick(piece.id)}
              className={movable ? 'piece-movable' : ''}
            >
              <circle
                cx={baseX - 30 + idx * 22}
                cy={baseY}
                r={PIECE_RADIUS}
                fill={isPlayer ? '#FFE0E0' : '#E0EEFF'}
                stroke={movable ? '#FFD700' : (isPlayer ? '#FF8A8A' : '#8AB4FF')}
                strokeWidth={movable ? 3 : 2}
                filter={movable ? 'url(#glow)' : ''}
              />
              <text
                x={baseX - 30 + idx * 22}
                y={baseY + 1}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="15"
                pointerEvents="none"
              >
                {emoji}
              </text>
            </g>
          );
        })}
      </g>
    );
  };

  // 골인한 말 렌더링
  const renderFinishedPieces = (owner) => {
    const finished = pieces[owner].filter(p => p.finished);
    if (finished.length === 0) return null;

    const isPlayer = owner === PLAYER;
    const baseX = isPlayer ? 220 : 380;
    const baseY = 580;
    const chars = isPlayer ? PLAYER_CHARS : AI_CHARS;

    return (
      <g>
        <text x={baseX} y={baseY - 28} textAnchor="middle" fill="#4CAF50" fontSize="11" fontWeight="600">
          GOAL ({finished.length}/{pieces[owner].length})
        </text>
        {finished.map((piece, idx) => {
          const emoji = chars[piece.id % chars.length];
          return (
            <g key={`fin-${owner}-${piece.id}`} opacity={0.7}>
              <circle
                cx={baseX - 20 + idx * 22}
                cy={baseY}
                r={12}
                fill={isPlayer ? '#FFE0E0' : '#E0EEFF'}
                stroke="#4CAF50"
                strokeWidth={2}
              />
              <text
                x={baseX - 20 + idx * 22}
                y={baseY + 1}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="13"
                pointerEvents="none"
              >
                {emoji}
              </text>
            </g>
          );
        })}
      </g>
    );
  };

  return (
    <svg width={BOARD_SIZE} height={BOARD_SIZE + 50} viewBox={`0 0 ${BOARD_SIZE} ${BOARD_SIZE + 50}`}>
      <defs>
        {/* 글로우 필터 (선택 가능한 말) */}
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {/* 노드 그림자 */}
        <filter id="nodeShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#00000020" />
        </filter>
        {/* 보드 배경 그라데이션 */}
        <linearGradient id="boardBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFF8EE" />
          <stop offset="100%" stopColor="#F5ECDC" />
        </linearGradient>
        {/* 코너 노드 그라데이션 */}
        <radialGradient id="cornerGrad">
          <stop offset="0%" stopColor="#6B5B4A" />
          <stop offset="100%" stopColor="#4A3C2E" />
        </radialGradient>
        {/* 일반 노드 그라데이션 */}
        <radialGradient id="nodeGrad">
          <stop offset="0%" stopColor="#F0DFC0" />
          <stop offset="100%" stopColor="#DCCBA5" />
        </radialGradient>
      </defs>

      {/* 배경 */}
      <rect width={BOARD_SIZE} height={BOARD_SIZE + 50} fill="url(#boardBg)" rx="16" />

      {/* 장식 테두리 */}
      <rect
        x="12" y="12"
        width={BOARD_SIZE - 24} height={BOARD_SIZE - 24 + 50}
        fill="none" stroke="#D4C4A8" strokeWidth="1.5" rx="12"
        strokeDasharray="6 3"
      />

      {/* 보드 선 */}
      {BOARD_LINES.map(([from, to], idx) => {
        const p1 = NODE_POSITIONS[from];
        const p2 = NODE_POSITIONS[to];
        const isDiagonal = from >= 20 || to >= 20 || (from === 5 && to === 20) ||
          (from === 10 && to === 25) || (from === 22) || (to === 22);
        return (
          <line
            key={`line-${idx}`}
            x1={p1.x} y1={p1.y}
            x2={p2.x} y2={p2.y}
            stroke={isDiagonal ? '#C4A87C' : '#B8A080'}
            strokeWidth={isDiagonal ? 1.5 : 2}
            strokeLinecap="round"
            opacity={isDiagonal ? 0.6 : 0.8}
          />
        );
      })}

      {/* 보드 노드 */}
      {Object.entries(NODE_POSITIONS).map(([id, pos]) => {
        const nodeId = parseInt(id);
        const isCorner = CORNER_NODES.includes(nodeId);
        const isStart = nodeId === 0;
        const isCenter = nodeId === 22;
        const r = isCorner ? NODE_RADIUS + 5 : NODE_RADIUS;

        return (
          <g key={`node-${id}`} filter="url(#nodeShadow)">
            {/* 노드 원 */}
            <circle
              cx={pos.x}
              cy={pos.y}
              r={r}
              fill={isStart ? '#2C3E50' : isCenter ? '#8B6914' : isCorner ? 'url(#cornerGrad)' : 'url(#nodeGrad)'}
              stroke={isCorner ? '#5C4A36' : '#C4B090'}
              strokeWidth={isCorner ? 2.5 : 1.5}
            />
            {/* 코너 장식 (내부 원) */}
            {isCorner && !isStart && (
              <circle
                cx={pos.x}
                cy={pos.y}
                r={r - 5}
                fill="none"
                stroke="rgba(255,255,255,0.2)"
                strokeWidth={1}
              />
            )}
            {/* 출발 텍스트 */}
            {isStart && (
              <text
                x={pos.x} y={pos.y + 1}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="white"
                fontSize="11"
                fontWeight="bold"
              >
                출발
              </text>
            )}
            {/* 중앙 텍스트 */}
            {isCenter && (
              <text
                x={pos.x} y={pos.y + 1}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="white"
                fontSize="9"
                fontWeight="bold"
              >
                센터
              </text>
            )}
          </g>
        );
      })}

      {/* 보드 위의 말 */}
      {Object.keys(NODE_POSITIONS).map(id => renderPiecesAtNode(parseInt(id)))}

      {/* 하단 구분선 */}
      <line x1="40" y1="555" x2="560" y2="555" stroke="#D4C4A8" strokeWidth="1" opacity="0.5" />

      {/* HOME 대기 말 */}
      {renderHomePieces(PLAYER)}
      {renderHomePieces(AI)}

      {/* 골인 말 */}
      {renderFinishedPieces(PLAYER)}
      {renderFinishedPieces(AI)}
    </svg>
  );
}

export default Board;
