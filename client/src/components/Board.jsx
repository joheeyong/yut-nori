import React from 'react';
import {
  NODE_POSITIONS, BOARD_LINES, HOME, FINISHED, PLAYER, AI,
} from '../game/constants';

const BOARD_SIZE = 600;
const NODE_RADIUS = 16;
const PIECE_RADIUS = 12;

// 꼭짓점 노드 (0, 5, 10, 15, 22)
const CORNER_NODES = [0, 5, 10, 15, 22];

function Board({ pieces, currentPlayer, movablePieces, onPieceClick, selectedThrow }) {
  const playerPieces = pieces[PLAYER];
  const aiPieces = pieces[AI];

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

  // 말 렌더링 (한 노드에 여러 말이 있을 때 오프셋)
  const renderPiecesAtNode = (nodeId) => {
    const piecesHere = getPiecesAtNode(nodeId);
    if (piecesHere.length === 0) return null;

    const pos = NODE_POSITIONS[nodeId];
    const offsets = [
      { dx: 0, dy: 0 },
      { dx: 14, dy: 0 },
      { dx: -14, dy: 0 },
      { dx: 0, dy: 14 },
      { dx: 7, dy: -12 },
      { dx: -7, dy: -12 },
      { dx: 7, dy: 12 },
      { dx: -7, dy: 12 },
    ];

    return piecesHere.map((piece, idx) => {
      const offset = offsets[idx] || { dx: 0, dy: 0 };
      const movable = isMovable(piece.owner, piece.id);
      const color = piece.owner === PLAYER ? '#e74c3c' : '#3498db';
      const strokeColor = movable ? '#f1c40f' : 'white';
      const strokeWidth = movable ? 3 : 1.5;

      return (
        <g
          key={`${piece.owner}-${piece.id}`}
          style={{ cursor: movable ? 'pointer' : 'default' }}
          onClick={() => movable && onPieceClick(piece.id)}
        >
          <circle
            cx={pos.x + offset.dx}
            cy={pos.y + offset.dy}
            r={PIECE_RADIUS}
            fill={color}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            className={movable ? 'piece-movable' : ''}
          />
          <text
            x={pos.x + offset.dx}
            y={pos.y + offset.dy + 1}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="white"
            fontSize="10"
            fontWeight="bold"
            pointerEvents="none"
          >
            {piece.id + 1}
          </text>
        </g>
      );
    });
  };

  // HOME에 있는 말 렌더링
  const renderHomePieces = (owner) => {
    const homePieces = pieces[owner].filter(p => p.position === HOME && !p.finished);
    if (homePieces.length === 0) return null;

    const isPlayer = owner === PLAYER;
    const baseX = isPlayer ? 80 : 520;
    const baseY = 580;
    const color = isPlayer ? '#e74c3c' : '#3498db';
    const label = isPlayer ? '나' : 'AI';

    return (
      <g>
        <text x={baseX} y={baseY - 25} textAnchor="middle" fill="#666" fontSize="12">
          {label} 대기
        </text>
        {homePieces.map((piece, idx) => {
          const movable = isMovable(owner, piece.id);
          return (
            <g
              key={`home-${owner}-${piece.id}`}
              style={{ cursor: movable ? 'pointer' : 'default' }}
              onClick={() => movable && onPieceClick(piece.id)}
            >
              <circle
                cx={baseX - 25 + idx * 18}
                cy={baseY}
                r={PIECE_RADIUS}
                fill={color}
                stroke={movable ? '#f1c40f' : 'white'}
                strokeWidth={movable ? 3 : 1.5}
                className={movable ? 'piece-movable' : ''}
              />
              <text
                x={baseX - 25 + idx * 18}
                y={baseY + 1}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="white"
                fontSize="10"
                fontWeight="bold"
                pointerEvents="none"
              >
                {piece.id + 1}
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
    const baseX = isPlayer ? 170 : 430;
    const baseY = 580;
    const color = isPlayer ? '#e74c3c' : '#3498db';

    return (
      <g>
        <text x={baseX} y={baseY - 25} textAnchor="middle" fill="#27ae60" fontSize="12">
          골인 ({finished.length}/{pieces[owner].length})
        </text>
        {finished.map((piece, idx) => (
          <circle
            key={`fin-${owner}-${piece.id}`}
            cx={baseX - 20 + idx * 16}
            cy={baseY}
            r={10}
            fill={color}
            stroke="#27ae60"
            strokeWidth={2}
            opacity={0.7}
          />
        ))}
      </g>
    );
  };

  return (
    <svg width={BOARD_SIZE} height={BOARD_SIZE + 50} viewBox={`0 0 ${BOARD_SIZE} ${BOARD_SIZE + 50}`}>
      {/* 배경 */}
      <rect width={BOARD_SIZE} height={BOARD_SIZE + 50} fill="#f5e6c8" rx="10" />

      {/* 보드 선 */}
      {BOARD_LINES.map(([from, to], idx) => {
        const p1 = NODE_POSITIONS[from];
        const p2 = NODE_POSITIONS[to];
        return (
          <line
            key={`line-${idx}`}
            x1={p1.x} y1={p1.y}
            x2={p2.x} y2={p2.y}
            stroke="#8B7355"
            strokeWidth={2}
          />
        );
      })}

      {/* 보드 노드 */}
      {Object.entries(NODE_POSITIONS).map(([id, pos]) => {
        const nodeId = parseInt(id);
        const isCorner = CORNER_NODES.includes(nodeId);
        const isStart = nodeId === 0;
        const r = isCorner ? NODE_RADIUS + 4 : NODE_RADIUS;

        return (
          <g key={`node-${id}`}>
            <circle
              cx={pos.x}
              cy={pos.y}
              r={r}
              fill={isStart ? '#2c3e50' : isCorner ? '#8B7355' : '#d4b896'}
              stroke="#8B7355"
              strokeWidth={isCorner ? 2.5 : 1.5}
            />
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
          </g>
        );
      })}

      {/* 보드 위의 말 */}
      {Object.keys(NODE_POSITIONS).map(id => renderPiecesAtNode(parseInt(id)))}

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
