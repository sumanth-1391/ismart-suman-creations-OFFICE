const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = __dirname;
const PUBLIC = path.join(ROOT, "public");
const DATA_DIR = path.join(ROOT, "data");
const DB_FILE = path.join(DATA_DIR, "db.json");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function sendJSON(res, status, data) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(data));
}

function sendFile(res, file) {
  const safeFile = path.basename(file);
  const filePath = path.join(PUBLIC, safeFile);

  if (!fs.existsSync(filePath)) {
    return sendJSON(res, 404, {
      success: false,
      error: "File not found"
    });
  }

  const ext = path.extname(safeFile).toLowerCase();

  const types = {
    ".js": "application/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon"
  };

  res.statusCode = 200;
  res.setHeader(
    "Content-Type",
    types[ext] || "application/octet-stream"
  );

  res.end(fs.readFileSync(filePath));
}

function createId(prefix = "id") {
  return (
    prefix +
    "_" +
    Date.now() +
    "_" +
    crypto.randomBytes(4).toString("hex")
  );
}

function iso() {
  return new Date().toISOString();
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function freshDatabase() {
  return {
    settings: {
      adminWallet: 0,
      dailyDefault: 50
    },

    users: [
      {
        id: "admin",
        username: "iscadmin",
        password: "8125400721",
        name: "ISC Administrator",
        role: "admin",
        active: true,
        dailyPay: 0,
        wallet: 0,
        upi: "",
        phone: "",
        photo: null,
        createdAt: iso()
      }
    ],

    attendance: [],
    videos: [],
    meetings: [],
    vouchers: [],
    withdrawals: [],
    transactions: [],
    notifications: [],
    activity: [],
    smsLog: []
  };
}

function loadDatabase() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      const db = freshDatabase();
      saveDatabase(db);
      return db;
    }

    const db = JSON.parse(
      fs.readFileSync(DB_FILE, "utf8")
    );

    const fresh = freshDatabase();

    Object.keys(fresh).forEach(key => {
      if (!(key in db)) {
        db[key] = fresh[key];
      }
    });

    return db;

  } catch (error) {

    console.error(
      "DATABASE LOAD ERROR:",
      error
    );

    const db = freshDatabase();
    saveDatabase(db);

    return db;
  }
}

function saveDatabase(db) {
  fs.writeFileSync(
    DB_FILE,
    JSON.stringify(db, null, 2),
    "utf8"
  );
}

function safeUser(user) {

  if (!user) return null;

  const copy = {
    ...user
  };

  delete copy.password;

  return copy;
}

function readBody(req) {

  return new Promise((resolve, reject) => {

    let data = "";

    req.on("data", chunk => {
      data += chunk;
    });

    req.on("end", () => {

      if (!data) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(data));
      } catch {
        reject(
          new Error("Invalid JSON request")
        );
      }
    });

    req.on("error", reject);
  });
}

function addActivity(
  db,
  userId,
  action,
  description
) {

  db.activity.unshift({
    id: createId("activity"),
    userId,
    action,
    description,
    createdAt: iso()
  });
}

function addNotification(
  db,
  userId,
  title,
  message,
  type = "info"
) {

  db.notifications.unshift({
    id: createId("notification"),
    userId,
    title,
    message,
    type,
    read: false,
    createdAt: iso()
  });
}


/* =========================================================
   MAIN HANDLER
   ========================================================= */

async function handler(req, res) {

  const url = new URL(
    req.url || "/",
    `http://${req.headers.host || "localhost"}`
  );

  const pathname = url.pathname;

  const db = loadDatabase();


  /* =======================================================
     HEALTH
     ======================================================= */

  if (
    pathname === "/api/health" &&
    req.method === "GET"
  ) {

    return sendJSON(res, 200, {
      success: true,
      app: "ISC OFFICE",
      status: "online",
      time: iso()
    });
  }


  /* =======================================================
     LOGIN
     ======================================================= */

  if (
    pathname === "/api/login" &&
    req.method === "POST"
  ) {

    try {

      const body =
        await readBody(req);

      const username =
        String(body.username || "")
          .trim();

      const password =
        String(body.password || "");

      if (!username || !password) {

        return sendJSON(res, 400, {
          success: false,
          error:
            "User ID and Password are required"
        });
      }


      const user =
        db.users.find(
          x =>
            x.username === username &&
            x.password === password &&
            x.active !== false
        );


      if (!user) {

        return sendJSON(res, 401, {
          success: false,
          error:
            "Invalid User ID or Password"
        });
      }


      addActivity(
        db,
        user.id,
        "LOGIN",
        "Signed in"
      );

      saveDatabase(db);


      return sendJSON(res, 200, {

        success: true,

        user: safeUser(user)

      });

    } catch (error) {

      return sendJSON(res, 400, {
        success: false,
        error: error.message
      });
    }
  }


  /* =======================================================
     GET STATE
     ======================================================= */

  if (
    pathname === "/api/state" &&
    req.method === "POST"
  ) {

    try {

      const body =
        await readBody(req);

      const user =
        db.users.find(
          x => x.id === body.userId
        );


      if (!user) {

        return sendJSON(res, 404, {
          success: false,
          error: "User not found"
        });
      }


      const result = {

        success: true,

        user: safeUser(user),

        settings: db.settings,

        notifications:
          db.notifications.filter(
            n =>
              n.userId === user.id ||
              n.userId === "admin"
          ),

        activity:
          db.activity.filter(
            a =>
              a.userId === user.id ||
              user.role === "admin"
          )
      };


      if (user.role === "admin") {

        result.users =
          db.users
            .filter(x => x.role === "member")
            .map(safeUser);

        result.attendance =
          db.attendance;

        result.videos =
          db.videos;

        result.meetings =
          db.meetings;

        result.vouchers =
          db.vouchers;

        result.withdrawals =
          db.withdrawals;

        result.transactions =
          db.transactions;

        result.smsLog =
          db.smsLog;

      } else {

        result.attendance =
          db.attendance.filter(
            x => x.userId === user.id
          );

        result.videos =
          db.videos.filter(
            x =>
              Array.isArray(x.memberIds) &&
              x.memberIds.includes(user.id)
          );

        result.meetings =
          db.meetings.filter(
            x =>
              !Array.isArray(x.memberIds) ||
              x.memberIds.includes(user.id)
          );

      }


      return sendJSON(
        res,
        200,
        result
      );

    } catch (error) {

      return sendJSON(res, 400, {
        success: false,
        error: error.message
      });
    }
  }


  /* =======================================================
     CREATE TEAM MEMBER
     ======================================================= */

  if (
    pathname === "/api/team" &&
    req.method === "POST"
  ) {

    try {

      const body =
        await readBody(req);


      const name =
        String(body.name || "")
          .trim();

      const username =
        String(body.username || "")
          .trim();

      const password =
        String(body.password || "");

      const phone =
        String(body.phone || "")
          .trim();


      if (
        !name ||
        !username ||
        !password
      ) {

        return sendJSON(res, 400, {
          success: false,
          error:
            "Name, username and password are required"
        });
      }


      const exists =
        db.users.some(
          x => x.username === username
        );


      if (exists) {

        return sendJSON(res, 409, {
          success: false,
          error:
            "User ID already exists"
        });
      }


      const member = {

        id: createId("user"),

        username,

        password,

        name,

        role: "member",

        active: true,

        phone,

        dailyPay:
          Number(body.dailyPay || 50),

        wallet: 0,

        upi: "",

        photo:
          body.photo || null,

        createdAt: iso()

      };


      db.users.push(member);


      addNotification(
        db,
        member.id,
        "Welcome to ISC OFFICE",
        "Your team account was created by Admin."
      );


      addActivity(
        db,
        "admin",
        "TEAM_CREATED",
        `${name} (${username})`
      );


      saveDatabase(db);


      return sendJSON(res, 200, {

        success: true,

        user: safeUser(member)

      });

    } catch (error) {

      return sendJSON(res, 400, {
        success: false,
        error: error.message
      });
    }
  }


  /* =======================================================
     DELETE TEAM MEMBER
     ======================================================= */

  if (
    pathname === "/api/team/delete" &&
    req.method === "POST"
  ) {

    try {

      const body =
        await readBody(req);


      if (!body.id) {

        return sendJSON(res, 400, {
          success: false,
          error:
            "Team member ID is required"
        });
      }


      const index =
        db.users.findIndex(
          x =>
            x.id === body.id &&
            x.role === "member"
        );


      if (index === -1) {

        return sendJSON(res, 404, {
          success: false,
          error:
            "Team member not found"
        });
      }


      const member =
        db.users[index];


      /* Delete user */

      db.users.splice(index, 1);


      /* Delete notifications */

      db.notifications =
        db.notifications.filter(
          n =>
            n.userId !== member.id
        );


      /* Remove from videos */

      db.videos.forEach(video => {

        if (
          Array.isArray(
            video.memberIds
          )
        ) {

          video.memberIds =
            video.memberIds.filter(
              id =>
                id !== member.id
            );
        }
      });


      /* Remove from meetings */

      db.meetings.forEach(meeting => {

        if (
          Array.isArray(
            meeting.memberIds
          )
        ) {

          meeting.memberIds =
            meeting.memberIds.filter(
              id =>
                id !== member.id
            );
        }
      });


      addActivity(
        db,
        "admin",
        "TEAM_DELETED",
        `${member.name} (${member.username})`
      );


      addNotification(
        db,
        "admin",
        "Team Member Deleted",
        `${member.name} was permanently deleted.`,
        "info"
      );


      saveDatabase(db);


      return sendJSON(res, 200, {

        success: true,

        message:
          "Team member deleted successfully",

        deletedId:
          member.id

      });

    } catch (error) {

      return sendJSON(res, 400, {

        success: false,

        error: error.message

      });
    }
  }


  /* =======================================================
     UPDATE TEAM MEMBER
     ======================================================= */

  if (
    pathname === "/api/team/update" &&
    req.method === "POST"
  ) {

    try {

      const body =
        await readBody(req);


      const member =
        db.users.find(
          x =>
            x.id === body.id &&
            x.role === "member"
        );


      if (!member) {

        return sendJSON(res, 404, {
          success: false,
          error:
            "Team member not found"
        });
      }


      if (body.name !== undefined) {
        member.name =
          String(body.name).trim();
      }


      if (body.phone !== undefined) {
        member.phone =
          String(body.phone).trim();
      }


      if (body.password) {
        member.password =
          String(body.password);
      }


      if (
        body.dailyPay !== undefined
      ) {

        member.dailyPay =
          Number(body.dailyPay);
      }


      if (
        body.active !== undefined
      ) {

        member.active =
          Boolean(body.active);
      }


      if (
        body.photo !== undefined
      ) {

        member.photo =
          body.photo;
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

        user: safeUser(member)

      });

    } catch (error) {

      return sendJSON(res, 400, {

        success: false,

        error: error.message

      });
    }
  }


  /* =======================================================
     FRONTEND
     ======================================================= */

  if (
    pathname === "/" ||
    pathname === "/index.html"
  ) {

    return sendFile(
      res,
      "index.html"
    );
  }


  if (
    pathname === "/meeting.html"
  ) {

    return sendFile(
      res,
      "meeting.html"
    );
  }


  if (
    pathname === "/app.js" ||
    pathname === "/style.css"
  ) {

    return sendFile(
      res,
      pathname.slice(1)
    );
  }


  /* =======================================================
     404
     ======================================================= */

  return sendJSON(res, 404, {

    success: false,

    error: "Not found",

    path: pathname

  });
}


/* =========================================================
   EXPORT / LOCAL SERVER
   ========================================================= */

module.exports = handler;


if (require.main === module) {

  const http =
    require("http");

  const PORT =
    process.env.PORT || 3000;


  http
    .createServer(handler)
    .listen(PORT, () => {

      console.log(
        `ISC OFFICE running on http://localhost:${PORT}`
      );

    });
}