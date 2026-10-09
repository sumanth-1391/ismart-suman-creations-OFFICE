const handler = require("../server");

// Vercel Node.js function entry point.
// Keep this file limited to the function wrapper: API route logic lives in server.js.
module.exports = async function iscOfficeApi(req, res) {
  try {
    return await handler(req, res);
  } catch (error) {
    console.error("ISC OFFICE API ERROR:", error);
    if (res.headersSent) return;
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({
      success: false,
      error: "Internal Server Error",
      message: error && error.message ? error.message : "Unknown error"
    }));
  }
};
