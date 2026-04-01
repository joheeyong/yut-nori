export default async function handler(req, res) {
  const { code, state } = req.query;

  if (!code) {
    return res.status(400).json({ error: 'code is required' });
  }

  const CLIENT_ID = process.env.NAVER_CLIENT_ID;
  const CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET;

  try {
    // 1. 토큰 발급
    const tokenUrl = `https://nid.naver.com/oauth2.0/token?grant_type=authorization_code&client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}&code=${code}&state=${state}`;
    const tokenRes = await fetch(tokenUrl);
    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
      return res.status(401).json({ error: 'Token exchange failed', detail: tokenData });
    }

    // 2. 프로필 조회
    const profileRes = await fetch('https://openapi.naver.com/v1/nid/me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profileData = await profileRes.json();

    if (profileData.response) {
      return res.status(200).json({
        provider: 'naver',
        name: profileData.response.name || profileData.response.nickname || '네이버 사용자',
        email: profileData.response.email || '',
        picture: profileData.response.profile_image || '',
      });
    }

    return res.status(500).json({ error: 'Profile fetch failed', detail: profileData });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
