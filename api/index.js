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
/* =======================================================
   TEAM MEMBER UPDATE
   ======================================================= */

if (
  pathname === "/api/team/update" &&
  req.method === "POST"
) {

  try {

    const body = await readBody(req);

    if (!body.id) {
      return sendJSON(res, 400, {
        success: false,
        error: "Team member ID is required"
      });
    }

    const member = db.users.find(
      x =>
        x.id === body.id &&
        x.role === "member"
    );

    if (!member) {
      return sendJSON(res, 404, {
        success: false,
        error: "Team member not found"
      });
    }


    /* NAME */

    if (body.name !== undefined) {
      const name = String(body.name).trim();

      if (!name) {
        return sendJSON(res, 400, {
          success: false,
          error: "Name cannot be empty"
        });
      }

      member.name = name;
    }


    /* PHONE */

    if (body.phone !== undefined) {
      member.phone =
        String(body.phone).trim();
    }


    /* PASSWORD */

    if (body.password !== undefined) {

      const password =
        String(body.password);

      if (password.length < 4) {
        return sendJSON(res, 400, {
          success: false,
          error:
            "Password must contain at least 4 characters"
        });
      }

      member.password = password;
    }


    /* DAILY SALARY */

    if (body.dailyPay !== undefined) {

      const salary =
        Number(body.dailyPay);

      if (
        !Number.isFinite(salary) ||
        salary < 0
      ) {
        return sendJSON(res, 400, {
          success: false,
          error:
            "Invalid daily salary"
        });
      }

      member.dailyPay = salary;
    }


    /* ACTIVE / INACTIVE */

    if (body.active !== undefined) {
      member.active =
        Boolean(body.active);
    }


    /* PROFILE PHOTO */

    if (body.photo !== undefined) {
      member.photo = body.photo;
    }


    addActivity(
      db,
      "admin",
      "TEAM_UPDATED",
      `${member.name} (${member.username})`
    );


    saveDatabase(db);


    return sendJSON(res, 200, {

      success: true,

      message:
        "Team member updated successfully",

      user:
        safeUser(member)

    });

  } catch (error) {

    console.error(
      "TEAM UPDATE ERROR:",
      error
    );

    return sendJSON(res, 500, {

      success: false,

      error:
        "Unable to update team member"

    });
  }
}