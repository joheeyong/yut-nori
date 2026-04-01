import {
  PLAYER, AI, HOME, FINISHED, ROUTES, ROUTE_NAMES,
} from './constants';
import { getMovablePieces, calculateNewPosition } from './gameLogic';

// AI 난이도별 전략
// 현재: 중급 AI (휴리스틱 기반)

function evaluateMove(state, move, throwValue) {
  let score = 0;
  const opponent = PLAYER;
  const opponentPieces = state.pieces[opponent];

  // 1. 골인 보너스 (최우선)
  if (move.finished) {
    score += 1000;
  }

  // 2. 전진 보너스 (앞으로 갈수록 좋음)
  if (!move.finished) {
    const route = ROUTES[move.newRoute];
    const newIdx = route.indexOf(move.to);
    score += newIdx * 10;
  }

  // 3. 상대 말 잡기 (매우 유리)
  if (!move.finished && move.to !== HOME) {
    const canCapture = opponentPieces.some(
      p => p.position === move.to && !p.finished
    );
    if (canCapture) {
      // 잡을 수 있는 상대 말 수에 비례
      const captureCount = opponentPieces.filter(
        p => p.position === move.to && !p.finished
      ).length;
      score += 500 * captureCount;
    }
  }

  // 4. 위험 회피 (상대가 잡을 수 있는 위치 피하기)
  if (!move.finished && move.to !== HOME) {
    for (const op of opponentPieces) {
      if (op.position === HOME || op.finished) continue;
      // 상대가 1~5칸 이동해서 잡을 수 있는지 확인
      for (let step = 1; step <= 5; step++) {
        const opResult = calculateNewPosition(op, step);
        if (opResult && opResult.position === move.to) {
          score -= 50 * (6 - step); // 가까울수록 위험
        }
      }
    }
  }

  // 5. 업기 보너스 (아군 말과 합치기)
  if (!move.finished && move.to !== HOME) {
    const allyAtDest = state.pieces[AI].filter(
      p => p.id !== move.pieceId && p.position === move.to && !p.finished
    ).length;
    // 업기는 양날의 검: 한꺼번에 잡힐 수 있지만 효율적
    if (allyAtDest > 0) {
      score += 30; // 약간의 보너스
    }
  }

  // 6. 출발 보너스 (HOME에 있는 말 꺼내기)
  if (move.from === HOME) {
    score += 50;
  }

  // 7. 지름길 보너스
  if (move.newRoute !== ROUTE_NAMES.outer) {
    score += 80;
  }

  return score;
}

// AI가 최선의 이동 선택
export function aiChooseMove(state, throwValue) {
  const moves = getMovablePieces(state, throwValue);
  if (moves.length === 0) return null;

  let bestMove = moves[0];
  let bestScore = -Infinity;

  for (const move of moves) {
    const score = evaluateMove(state, move, throwValue);
    // 약간의 랜덤성 추가 (너무 예측 가능하지 않게)
    const randomFactor = (Math.random() - 0.5) * 20;
    const finalScore = score + randomFactor;

    if (finalScore > bestScore) {
      bestScore = finalScore;
      bestMove = move;
    }
  }

  return bestMove;
}
