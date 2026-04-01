import React, { useEffect, useCallback } from 'react';

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;
const NAVER_CLIENT_ID = process.env.REACT_APP_NAVER_CLIENT_ID;

function Login({ onLogin }) {
  // Google 로그인 초기화
  useEffect(() => {
    if (!window.google) return;

    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: (response) => {
        const payload = parseJwt(response.credential);
        onLogin({
          provider: 'google',
          name: payload.name,
          email: payload.email,
          picture: payload.picture,
          token: response.credential,
        });
      },
    });

    window.google.accounts.id.renderButton(
      document.getElementById('google-login-btn'),
      { theme: 'outline', size: 'large', width: 300, text: 'signin_with' }
    );
  }, [onLogin]);

  // Naver 로그인
  const handleNaverLogin = useCallback(() => {
    const state = Math.random().toString(36).substring(2);
    sessionStorage.setItem('naver_oauth_state', state);
    const redirectUri = encodeURIComponent(window.location.origin + '/callback/naver');
    const url = `https://nid.naver.com/oauth2.0/authorize?response_type=code&client_id=${NAVER_CLIENT_ID}&redirect_uri=${redirectUri}&state=${state}`;
    window.location.href = url;
  }, []);

  return (
    <div className="login-container">
      <div className="login-card">
        <h1 className="login-title">윷놀이</h1>
        <p className="login-subtitle">한국 전통 보드게임</p>

        <div className="login-buttons">
          <div id="google-login-btn" className="login-btn-wrapper"></div>

          <button className="naver-login-btn" onClick={handleNaverLogin}>
            <svg viewBox="0 0 24 24" width="20" height="20" style={{ marginRight: 8 }}>
              <path fill="white" d="M16.273 12.845L7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727z"/>
            </svg>
            네이버로 로그인
          </button>

          <button
            className="guest-login-btn"
            onClick={() => onLogin({ provider: 'guest', name: '게스트', email: '', picture: '' })}
          >
            게스트로 시작
          </button>
        </div>
      </div>
    </div>
  );
}

// JWT 디코딩 (Google ID Token)
function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return {};
  }
}

export default Login;
