const handler = require('../server');

module.exports = async (req, res) => {
  try {
    return await handler(req, res);
  } catch (err) {
    console.error('ISC OFFICE VERCEL ERROR:', err);
    if (res.headersSent) return;
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({
      error: 'ISC Office function failed',
      message: err && err.message ? err.message : 'Unknown server error'
    }));
  }
};
