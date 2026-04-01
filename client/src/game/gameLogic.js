import {
  HOME, FINISHED, PLAYER, AI, PHASE, PIECE_COUNT,
  YUT_PROBABILITIES, EXTRA_THROW_VALUES, ROUTES, ROUTE_NAMES, CORNERS,
} from './constants';

// 윷 던지기 (가중치 랜덤)
export function throwYut() {
  const rand = Math.random();
  let cumulative = 0;
  for (const { value, weight } of YUT_PROBABILITIES) {
    cumulative += weight;
    if (rand < cumulative) return value;
  }
  return 1; // fallback
}

// 추가 던지기 여부
export function isExtraThrow(value) {
  return EXTRA_THROW_VALUES.includes(value);
}

// 초기 게임 상태 생성
export function createInitialState() {
  const makePieces = () =>
    Array.from({ length: PIECE_COUNT }, (_, i) => ({
      id: i,
      position: HOME,
      route: ROUTE_NAMES.outer,
      finished: false,
    }));

  return {
    currentPlayer: PLAYER,
    phase: PHASE.THROWING,
    pieces: {
      [PLAYER]: makePieces(),
      [AI]: makePieces(),
    },
    pendingThrows: [],   // 사용할 윷 결과들
    winner: null,
    message: '윷을 던져주세요!',
  };
}

// 말 이동 후 위치 계산
export function calculateNewPosition(piece, steps) {
  if (piece.finished) return null;

  const route = ROUTES[piece.route];

  let currentIdx;
  if (piece.position === HOME) {
    currentIdx = -1; // 출발 전이므로 0번(출발점) 앞에서 시작
  } else {
    currentIdx = route.indexOf(piece.position);
    if (currentIdx === -1) return null; // 에러
  }

  const newIdx = currentIdx + steps;

  // 경로 끝을 넘으면 골인
  if (newIdx >= route.length) {
    return { position: FINISHED, route: piece.route, finished: true };
  }

  const newPosition = route[newIdx];
  let newRoute = piece.route;

  // 꼭짓점에 정확히 도착하면 지름길로 경로 변경
  if (newPosition in CORNERS && piece.route === ROUTE_NAMES.outer) {
    newRoute = CORNERS[newPosition];
  }

  return { position: newPosition, route: newRoute, finished: false };
}

// 이동 가능한 말 목록
export function getMovablePieces(state, throwValue) {
  const player = state.currentPlayer;
  const pieces = state.pieces[player];
  const movable = [];

  for (const piece of pieces) {
    if (piece.finished) continue;

    const result = calculateNewPosition(piece, throwValue);
    if (!result) continue;

    // 같은 팀 말이 이미 있는 위치로 이동하는 것은 허용 (업기)
    // 단, FINISHED로 가는 것도 허용
    movable.push({
      pieceId: piece.id,
      from: piece.position,
      to: result.position,
      newRoute: result.route,
      finished: result.finished,
    });
  }

  return movable;
}

// 말 이동 실행
export function movePiece(state, pieceId, throwValue) {
  const player = state.currentPlayer;
  const opponent = player === PLAYER ? AI : PLAYER;
  const newState = JSON.parse(JSON.stringify(state));

  const piece = newState.pieces[player].find(p => p.id === pieceId);
  if (!piece) return state;

  const result = calculateNewPosition(piece, throwValue);
  if (!result) return state;

  // 같은 위치에 있는 아군 말 찾기 (업힌 말 함께 이동)
  const stackedPieces = piece.position !== HOME
    ? newState.pieces[player].filter(
        p => p.id !== piece.id && p.position === piece.position && !p.finished
      )
    : [];

  // 메인 말 이동
  piece.position = result.position;
  piece.route = result.route;
  piece.finished = result.finished;

  // 업힌 말도 함께 이동
  for (const sp of stackedPieces) {
    sp.position = result.position;
    sp.route = result.route;
    sp.finished = result.finished;
  }

  let captured = false;

  // 상대 말 잡기 (FINISHED가 아닌 경우만)
  if (!result.finished && result.position !== HOME) {
    const capturedPieces = newState.pieces[opponent].filter(
      p => p.position === result.position && !p.finished
    );
    if (capturedPieces.length > 0) {
      captured = true;
      for (const cp of capturedPieces) {
        cp.position = HOME;
        cp.route = ROUTE_NAMES.outer;
        cp.finished = false;
      }
    }
  }

  // 사용한 윷 결과 제거
  const throwIdx = newState.pendingThrows.indexOf(throwValue);
  if (throwIdx !== -1) {
    newState.pendingThrows.splice(throwIdx, 1);
  }

  // 말을 잡으면 추가 던지기
  if (captured) {
    newState.phase = PHASE.THROWING;
    newState.message = `${player === PLAYER ? '상대' : '내'} 말을 잡았습니다! 한 번 더 던지세요!`;
    // pendingThrows가 남아있으면 먼저 소진
    if (newState.pendingThrows.length > 0) {
      newState.phase = PHASE.MOVING;
      newState.message = `말을 잡았습니다! 남은 윷을 사용하세요.`;
    }
  }

  // 승리 체크
  const allFinished = newState.pieces[player].every(p => p.finished);
  if (allFinished) {
    newState.phase = PHASE.GAME_OVER;
    newState.winner = player;
    newState.message = player === PLAYER ? '축하합니다! 승리!' : 'AI가 승리했습니다!';
    return newState;
  }

  // 남은 윷이 없고 잡기도 안 했으면 턴 넘기기
  if (!captured && newState.pendingThrows.length === 0) {
    newState.currentPlayer = opponent;
    newState.phase = PHASE.THROWING;
    newState.message = opponent === PLAYER ? '윷을 던져주세요!' : 'AI가 던지는 중...';
  } else if (newState.pendingThrows.length > 0) {
    newState.phase = PHASE.MOVING;
    newState.message = '이동할 말을 선택하세요.';
  }

  return newState;
}

// 모든 말이 이동 불가능한지 체크
export function hasNoValidMoves(state) {
  for (const throwValue of state.pendingThrows) {
    if (getMovablePieces(state, throwValue).length > 0) return false;
  }
  return true;
}

// 턴 스킵 (이동 가능한 말이 없을 때)
export function skipTurn(state) {
  const opponent = state.currentPlayer === PLAYER ? AI : PLAYER;
  return {
    ...state,
    currentPlayer: opponent,
    pendingThrows: [],
    phase: PHASE.THROWING,
    message: opponent === PLAYER ? '윷을 던져주세요!' : 'AI가 던지는 중...',
  };
}
