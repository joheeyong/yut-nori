import React, { useEffect, useState } from 'react';

const NAVER_CLIENT_ID = process.env.REACT_APP_NAVER_CLIENT_ID;
const NAVER_CLIENT_SECRET = process.env.REACT_APP_NAVER_CLIENT_SECRET;

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

    // Naver 토큰 교환 → 프로필 조회
    // CORS 제한으로 프록시 또는 백엔드 필요 → 현재는 프록시 사용
    fetchNaverProfile(code, state);

    async function fetchNaverProfile(code, state) {
      try {
        // Naver API는 CORS를 허용하지 않으므로 프록시 사용
        const tokenUrl = `https://nid.naver.com/oauth2.0/token?grant_type=authorization_code&client_id=${NAVER_CLIENT_ID}&client_secret=${NAVER_CLIENT_SECRET}&code=${code}&state=${state}`;

        // CORS 프록시를 통해 토큰 요청
        const tokenRes = await fetch(`https://corsproxy.io/?${encodeURIComponent(tokenUrl)}`);
        const tokenData = await tokenRes.json();

        if (!tokenData.access_token) {
          setError('토큰 발급에 실패했습니다.');
          return;
        }

        // 프로필 조회
        const profileRes = await fetch(`https://corsproxy.io/?${encodeURIComponent('https://openapi.naver.com/v1/nid/me')}`, {
          headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        const profileData = await profileRes.json();

        if (profileData.response) {
          onLogin({
            provider: 'naver',
            name: profileData.response.name || profileData.response.nickname || '네이버 사용자',
            email: profileData.response.email || '',
            picture: profileData.response.profile_image || '',
            token: tokenData.access_token,
          });
        } else {
          setError('프로필 조회에 실패했습니다.');
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
