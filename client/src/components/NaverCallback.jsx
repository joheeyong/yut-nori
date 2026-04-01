import React, { useEffect, useState } from 'react';

function NaverCallback({ onLogin }) {
  const [error, setError] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    const savedState = sessionStorage.getItem('naver_oauth_state');

    if (!code) {
      setError('인증 코드가 없습니다.');
      return;
    }

    if (state !== savedState) {
      setError('잘못된 요청입니다.');
      return;
    }

    fetchNaverProfile(code, state);

    async function fetchNaverProfile(code, state) {
      try {
        const res = await fetch(`/api/naver-login?code=${code}&state=${state}`);
        const data = await res.json();

        if (res.ok && data.name) {
          onLogin(data);
        } else {
          console.error('Naver login error:', data);
          setError(data.error || '로그인에 실패했습니다.');
        }
      } catch (err) {
        console.error('Naver login error:', err);
        setError('로그인 처리 중 오류가 발생했습니다.');
      }
    }
  }, [onLogin]);

  if (error) {
    return (
      <div className="callback-container">
        <div className="callback-card">
          <h2>로그인 실패</h2>
          <p>{error}</p>
          <button className="guest-login-btn" onClick={() => window.location.href = '/'}>
            돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="callback-container">
      <div className="callback-card">
        <h2>로그인 중...</h2>
        <div className="loading-spinner"></div>
      </div>
    </div>
  );
}

export default NaverCallback;
