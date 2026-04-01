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

// 보드 노드 좌표 (SVG 600x600 기준, 사각형 형태)
// 0=출발(우하단), 5=우상단, 10=좌상단, 15=좌하단
// 20-28=대각선 지름길
export const NODE_POSITIONS = {
  // 우측 변 (0→5): 아래→위
  0:  { x: 520, y: 520 },
  1:  { x: 520, y: 432 },
  2:  { x: 520, y: 344 },
  3:  { x: 520, y: 256 },
  4:  { x: 520, y: 168 },
  5:  { x: 520, y: 80 },
  // 상단 변 (5→10): 오른쪽→왼쪽
  6:  { x: 432, y: 80 },
  7:  { x: 344, y: 80 },
  8:  { x: 256, y: 80 },
  9:  { x: 168, y: 80 },
  10: { x: 80, y: 80 },
  // 좌측 변 (10→15): 위→아래
  11: { x: 80, y: 168 },
  12: { x: 80, y: 256 },
  13: { x: 80, y: 344 },
  14: { x: 80, y: 432 },
  15: { x: 80, y: 520 },
  // 하단 변 (15→0): 왼쪽→오른쪽
  16: { x: 168, y: 520 },
  17: { x: 256, y: 520 },
  18: { x: 344, y: 520 },
  19: { x: 432, y: 520 },
  // 대각선: 5(우상단)→center
  20: { x: 447, y: 153 },
  21: { x: 373, y: 227 },
  // center
  22: { x: 300, y: 300 },
  // center→15(좌하단)
  23: { x: 227, y: 373 },
  24: { x: 153, y: 447 },
  // 10(좌상단)→center
  25: { x: 153, y: 153 },
  26: { x: 227, y: 227 },
  // center→0(우하단/finish)
  27: { x: 373, y: 373 },
  28: { x: 447, y: 447 },
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
