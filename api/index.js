const handler = require("../server");

module.exports = async (req, res) => {
  try {
    await handler(req, res);
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