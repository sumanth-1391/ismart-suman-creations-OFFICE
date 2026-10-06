const api = require('../server');
module.exports = async (req, res) => {
  try { return await api(req, res); }
  catch (err) {
    console.error('API ERROR:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type','application/json; charset=utf-8');
    res.end(JSON.stringify({error:'Server error', detail: err.message}));
  }
};
