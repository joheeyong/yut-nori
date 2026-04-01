import React, { useState, useCallback, useEffect, useRef } from 'react';
import Board from './Board';
import YutThrow from './YutThrow';
import {
  PLAYER, AI, PHASE, YUT_NAMES,
} from '../game/constants';
import {
  createInitialState, throwYut, isExtraThrow,
  getMovablePieces, movePiece, hasNoValidMoves, skipTurn,
} from '../game/gameLogic';
import { aiChooseMove } from '../game/ai';

function Game({ user, onLogout }) {
  const [gameState, setGameState] = useState(createInitialState());
  const [selectedThrow, setSelectedThrow] = useState(null);
  const [movablePieces, setMovablePieces] = useState([]);
  const [gameLog, setGameLog] = useState([]);
  const aiTimerRef = useRef(null);

  const addLog = useCallback((msg) => {
    setGameLog(prev => [...prev.slice(-19), msg]);
  }, []);

  // 윷 던지기 결과 핸들러 (3D 물리 시뮬레이션에서 결과를 받음)
  const handleThrowResult = useCallback((result) => {
    setGameState(prev => {
      const newThrows = [...prev.pendingThrows, result];
      const extra = isExtraThrow(result);

      addLog(`나: ${YUT_NAMES[result]}! (${result}칸)${extra ? ' ★추가 던지기!' : ''}`);

      if (extra) {
        return {
          ...prev,
          pendingThrows: newThrows,
          phase: PHASE.THROWING,
          message: `${YUT_NAMES[result]}! 한 번 더 던지세요!`,
        };
      }

      return {
        ...prev,
        pendingThrows: newThrows,
        phase: PHASE.MOVING,
        message: '이동할 말을 선택하세요.',
      };
    });
  }, [addLog]);

  // 이동할 윷 선택 시 이동 가능한 말 계산
  useEffect(() => {
    if (gameState.phase === PHASE.MOVING && gameState.currentPlayer === PLAYER) {
      const throws = gameState.pendingThrows;
      if (throws.length === 0) return;

      if (hasNoValidMoves(gameState)) {
        addLog('이동 가능한 말이 없습니다. 턴을 넘깁니다.');
        setTimeout(() => {
          setGameState(prev => skipTurn(prev));
        }, 1000);
        return;
      }

      const throwVal = throws[0];
      setSelectedThrow(throwVal);
      setMovablePieces(getMovablePieces(gameState, throwVal));
    }
  }, [gameState.phase, gameState.pendingThrows, gameState.currentPlayer, addLog, gameState]);

  // 말 선택 핸들러
  const handlePieceClick = useCallback((pieceId) => {
    if (gameState.phase !== PHASE.MOVING || gameState.currentPlayer !== PLAYER) return;
    if (selectedThrow === null) return;

    const moves = getMovablePieces(gameState, selectedThrow);
    const move = moves.find(m => m.pieceId === pieceId);
    if (!move) return;

    const destination = move.finished ? '골인' : `${move.to}번`;
    addLog(`나: ${pieceId + 1}번 말 → ${destination} (${YUT_NAMES[selectedThrow]})`);

    setGameState(prev => movePiece(prev, pieceId, selectedThrow));
    setSelectedThrow(null);
    setMovablePieces([]);
  }, [gameState, selectedThrow, addLog]);

  // 다른 윷 결과 선택
  const handleSelectThrow = useCallback((throwValue) => {
    if (gameState.phase !== PHASE.MOVING || gameState.currentPlayer !== PLAYER) return;
    setSelectedThrow(throwValue);
    setMovablePieces(getMovablePieces(gameState, throwValue));
  }, [gameState]);

  // AI 턴 처리
  useEffect(() => {
    if (gameState.currentPlayer !== AI) return;
    if (gameState.phase === PHASE.GAME_OVER) return;

    if (gameState.phase === PHASE.THROWING) {
      aiTimerRef.current = setTimeout(() => {
        const result = throwYut();
        const extra = isExtraThrow(result);
        addLog(`AI: ${YUT_NAMES[result]}! (${result}칸)${extra ? ' ★추가 던지기!' : ''}`);

        setGameState(prev => {
          const newThrows = [...prev.pendingThrows, result];
          if (extra) {
            return {
              ...prev,
              pendingThrows: newThrows,
              phase: PHASE.THROWING,
              message: `AI: ${YUT_NAMES[result]}! 한 번 더!`,
            };
          }
          return {
            ...prev,
            pendingThrows: newThrows,
            phase: PHASE.MOVING,
            message: 'AI가 이동 중...',
          };
        });
      }, 1000);
    }

    if (gameState.phase === PHASE.MOVING) {
      if (gameState.pendingThrows.length === 0) return;

      if (hasNoValidMoves(gameState)) {
        addLog('AI: 이동 가능한 말이 없어 턴을 넘깁니다.');
        aiTimerRef.current = setTimeout(() => {
          setGameState(prev => skipTurn(prev));
        }, 1000);
        return;
      }

      const throwVal = gameState.pendingThrows[0];
      const move = aiChooseMove(gameState, throwVal);

      if (move) {
        aiTimerRef.current = setTimeout(() => {
          const destination = move.finished ? '골인' : `${move.to}번`;
          addLog(`AI: ${move.pieceId + 1}번 말 → ${destination} (${YUT_NAMES[throwVal]})`);
          setGameState(prev => movePiece(prev, move.pieceId, throwVal));
        }, 800);
      }
    }

    return () => {
      if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    };
  }, [gameState.currentPlayer, gameState.phase, gameState.pendingThrows, addLog, gameState]);

  // 새 게임
  const handleNewGame = () => {
    if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    setGameState(createInitialState());
    setSelectedThrow(null);
    setMovablePieces([]);
    setGameLog([]);
  };

  const isPlayerThrowing = gameState.currentPlayer === PLAYER && gameState.phase === PHASE.THROWING;
  const isPlayerMoving = gameState.currentPlayer === PLAYER && gameState.phase === PHASE.MOVING;

  return (
    <div className="game-container">
      <div className="game-header">
        <h1 className="game-title">윷놀이</h1>
        <div className="user-info">
          {user.picture && <img src={user.picture} alt="" className="user-avatar" />}
          <span className="user-name">{user.name}</span>
          <button className="logout-btn" onClick={onLogout}>로그아웃</button>
        </div>
      </div>

      <div className="game-layout">
        {/* 보드 + 윷 던지기 오버레이 */}
        <div className="board-section">
          <div className="board-wrapper">
            <Board
              pieces={gameState.pieces}
              currentPlayer={gameState.currentPlayer}
              movablePieces={movablePieces}
              onPieceClick={handlePieceClick}
              selectedThrow={selectedThrow}
            />
            {/* 윷 던지기가 보드 위에서 이루어짐 */}
            <YutThrow
              onThrowResult={handleThrowResult}
              disabled={!isPlayerThrowing}
              pendingThrows={gameState.pendingThrows}
              isOverlay={true}
            />
          </div>
        </div>

        <div className="control-section">
          <div className="turn-indicator">
            <div className={`turn-badge ${gameState.currentPlayer === PLAYER ? 'player' : 'ai'}`}>
              {gameState.currentPlayer === PLAYER ? '내 턴' : 'AI 턴'}
            </div>
          </div>

          <div className="message-box">
            {gameState.message}
          </div>

          {isPlayerMoving && gameState.pendingThrows.length > 1 && (
            <div className="throw-selector">
              <span>사용할 윷 선택: </span>
              {gameState.pendingThrows.map((t, i) => (
                <button
                  key={i}
                  className={`throw-select-btn ${selectedThrow === t ? 'selected' : ''}`}
                  onClick={() => handleSelectThrow(t)}
                >
                  {YUT_NAMES[t]}({t})
                </button>
              ))}
            </div>
          )}

          <div className="game-log">
            <h3>게임 로그</h3>
            <div className="log-list">
              {gameLog.map((log, i) => (
                <div key={i} className={`log-entry ${log.startsWith('AI') ? 'ai-log' : 'player-log'}`}>
                  {log}
                </div>
              ))}
            </div>
          </div>

          {gameState.phase === PHASE.GAME_OVER && (
            <div className="game-over-overlay">
              <div className="game-over-content">
                <h2>{gameState.winner === PLAYER ? '🎉 승리!' : '😢 패배'}</h2>
                <p>{gameState.message}</p>
                <button className="new-game-btn" onClick={handleNewGame}>
                  새 게임
                </button>
              </div>
            </div>
          )}

          <button className="new-game-btn small" onClick={handleNewGame}>
            새 게임 시작
          </button>
        </div>
      </div>
    </div>
  );
}

export default Game;
