import crypto from 'crypto';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { u, m, c = 10 } = req.query;          
  const target = parseInt(c, 10) || 10;
  if (!u || !m || target <= 0) {
    return res.status(400).json({ error: 'u, m, c harus valid' });
  }


  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  let sent = 0;
  let fail = 0;
  const sendSSE = (type, payload) =>
    res.write(`data: ${JSON.stringify({ type, ...payload })}\n\n`);

  
  while (sent < target && fail < 10) {
    try {
      const deviceId = crypto.randomBytes(21).toString('hex');
      const body = new URLSearchParams({
        username: u,
        question: m,
        deviceId,
        gameSlug: '',
        referrer: ''
      });

      const rsp = await fetch('https://ngl.link/api/submit', {
        method: 'POST',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/109.0',
          Accept: '*/*',
          'Accept-Language': 'en-US,en;q=0.5',
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'X-Requested-With': 'XMLHttpRequest',
          'Sec-Fetch-Dest': 'empty',
          'Sec-Fetch-Mode': 'cors',
          'Sec-Fetch-Site': 'same-origin',
          Referer: `https://ngl.link/${u}`,
          Origin: 'https://ngl.link'
        },
        body,
        mode: 'cors',
        credentials: 'include'
      });

      if (rsp.status === 200) {
        sent++;
        sendSSE('progress', { sent, target });
        if (sent >= target) {
          sendSSE('done', { sent, target });
          break;
        }
        
        await new Promise(r => setTimeout(r, 2000));
      } else {
        fail++;
        sendSSE('retry', { msg: `rate-limited (fail ${fail})` });
        await new Promise(r => setTimeout(r, 25000));
      }
    } catch (err) {
      fail++;
      sendSSE('error', { msg: err.message });
      await new Promise(r => setTimeout(r, 5000));
    }
  }

  if (fail >= 10) sendSSE('abort', { msg: 'Terlalu banyak gagal' });
  res.end();
}
