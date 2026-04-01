// 윷놀이 게임 상수 정의

// 말 상태
export const HOME = -1;    // 출발 전
export const FINISHED = 99; // 골인 완료

// 플레이어
export const PLAYER = 'player';
export const AI = 'ai';

// 게임 페이즈
export const PHASE = {
  THROWING: 'throwing',
  MOVING: 'moving',
  GAME_OVER: 'gameOver',
};

// 윷 결과
export const YUT_NAMES = {
  1: '도',
  2: '개',
  3: '걸',
  4: '윷',
  5: '모',
};

// 윷 던지기 확률 (각 윷의 앞면 확률 60%)
export const YUT_PROBABILITIES = [
  { value: 1, weight: 0.1536 },  // 도
  { value: 2, weight: 0.3456 },  // 개
  { value: 3, weight: 0.3456 },  // 걸
  { value: 4, weight: 0.1296 },  // 윷
  { value: 5, weight: 0.0256 },  // 모
];

// 추가 던지기가 가능한 결과 (윷, 모)
export const EXTRA_THROW_VALUES = [4, 5];

// 말 개수
export const PIECE_COUNT = 4;

// 보드 노드 좌표 (SVG 600x600 기준, 다이아몬드 형태)
// 0=출발(하단), 5=우측꼭짓점, 10=상단, 15=좌측꼭짓점
// 20-28=대각선 지름길
export const NODE_POSITIONS = {
  0:  { x: 300, y: 550 },
  1:  { x: 350, y: 500 },
  2:  { x: 400, y: 450 },
  3:  { x: 450, y: 400 },
  4:  { x: 500, y: 350 },
  5:  { x: 550, y: 300 },
  6:  { x: 500, y: 250 },
  7:  { x: 450, y: 200 },
  8:  { x: 400, y: 150 },
  9:  { x: 350, y: 100 },
  10: { x: 300, y: 50 },
  11: { x: 250, y: 100 },
  12: { x: 200, y: 150 },
  13: { x: 150, y: 200 },
  14: { x: 100, y: 250 },
  15: { x: 50, y: 300 },
  16: { x: 100, y: 350 },
  17: { x: 150, y: 400 },
  18: { x: 200, y: 450 },
  19: { x: 250, y: 500 },
  // 대각선: 5→center
  20: { x: 467, y: 300 },
  21: { x: 383, y: 300 },
  // center
  22: { x: 300, y: 300 },
  // center→15
  23: { x: 217, y: 300 },
  24: { x: 133, y: 300 },
  // 10→center
  25: { x: 300, y: 133 },
  26: { x: 300, y: 217 },
  // center→0(finish)
  27: { x: 300, y: 383 },
  28: { x: 300, y: 467 },
};

// 보드 위의 선 연결 (렌더링용)
export const BOARD_LINES = [
  // 외곽선
  [0, 1], [1, 2], [2, 3], [3, 4], [4, 5],
  [5, 6], [6, 7], [7, 8], [8, 9], [9, 10],
  [10, 11], [11, 12], [12, 13], [13, 14], [14, 15],
  [15, 16], [16, 17], [17, 18], [18, 19], [19, 0],
  // 대각선 (5→center→15)
  [5, 20], [20, 21], [21, 22], [22, 23], [23, 24], [24, 15],
  // 대각선 (10→center→0)
  [10, 25], [25, 26], [26, 22], [22, 27], [27, 28], [28, 0],
];

// 경로 정의
// 외곽 경로 (지름길 안 탈 때)
export const ROUTE_OUTER = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];

// 꼭짓점 5에서 대각선 (5→center→15→외곽)
export const ROUTE_DIAG_5 = [0, 1, 2, 3, 4, 5, 20, 21, 22, 23, 24, 15, 16, 17, 18, 19];

// 꼭짓점 10에서 대각선 (외곽→10→center→finish)
export const ROUTE_DIAG_10 = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 25, 26, 22, 27, 28];

// 경로 이름
export const ROUTE_NAMES = {
  outer: 'outer',
  diag5: 'diag5',
  diag10: 'diag10',
};

// 경로 맵
export const ROUTES = {
  [ROUTE_NAMES.outer]: ROUTE_OUTER,
  [ROUTE_NAMES.diag5]: ROUTE_DIAG_5,
  [ROUTE_NAMES.diag10]: ROUTE_DIAG_10,
};

// 꼭짓점 (지름길 분기점)
export const CORNERS = {
  5: ROUTE_NAMES.diag5,
  10: ROUTE_NAMES.diag10,
};
