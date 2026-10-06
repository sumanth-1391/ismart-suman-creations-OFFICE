"use strict";

/* =========================================================
   ISMART SUMAN CREATIONS OFFICE
   public/app.js
   ========================================================= */

const ADMIN_USER_ID = "iscadmin";
const ADMIN_PASSWORD = "8125400721";

const state = {
    loggedIn: localStorage.getItem("isc_logged_in") === "true",
    userId: localStorage.getItem("isc_user_id") || "",
    page: "dashboard",
    team: JSON.parse(localStorage.getItem("isc_team") || "[]"),
    notifications: JSON.parse(
        localStorage.getItem("isc_notifications") || "[]"
    ),
    attendance: JSON.parse(
        localStorage.getItem("isc_attendance") || "[]"
    ),
    wallet: Number(localStorage.getItem("isc_wallet") || 0),
    salaryPerDay: Number(
        localStorage.getItem("isc_salary_per_day") || 50
    )
};

/* =========================================================
   HELPERS
   ========================================================= */

function $(selector) {
    return document.querySelector(selector);
}

function $$(selector) {
    return document.querySelectorAll(selector);
}

function saveState() {
    localStorage.setItem(
        "isc_logged_in",
        state.loggedIn
    );

    localStorage.setItem(
        "isc_user_id",
        state.userId
    );

    localStorage.setItem(
        "isc_team",
        JSON.stringify(state.team)
    );

    localStorage.setItem(
        "isc_notifications",
        JSON.stringify(state.notifications)
    );

    localStorage.setItem(
        "isc_attendance",
        JSON.stringify(state.attendance)
    );

    localStorage.setItem(
        "isc_wallet",
        state.wallet
    );

    localStorage.setItem(
        "isc_salary_per_day",
        state.salaryPerDay
    );
}

function money(value) {
    return "₹" + Number(value || 0).toLocaleString("en-IN");
}

function today() {
    return new Date().toLocaleDateString("en-IN");
}

function timeNow() {
    return new Date().toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit"
    });
}

function escapeHTML(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

/* =========================================================
   LOGIN
   ========================================================= */

function showLogin() {

    document.body.innerHTML = `
        <div class="login-screen">

            <div class="login-card">

                <div class="login-logo">
                    ISC
                </div>

                <h1>ISMART OFFICE</h1>
                <p>SUMAN CREATIONS</p>

                <form id="loginForm">

                    <div class="form-group">
                        <label>User ID</label>

                        <input
                            id="loginUserId"
                            type="text"
                            placeholder="Enter User ID"
                            autocomplete="username"
                            required
                        >
                    </div>

                    <div class="form-group">
                        <label>Password</label>

                        <input
                            id="loginPassword"
                            type="password"
                            placeholder="Enter Password"
                            autocomplete="current-password"
                            required
                        >
                    </div>

                    <button
                        class="primary-btn"
                        type="submit"
                    >
                        LOGIN
                    </button>

                    <div id="loginMessage"></div>

                </form>

            </div>

        </div>
    `;

    $("#loginForm").addEventListener(
        "submit",
        login
    );
}

function login(event) {

    event.preventDefault();

    const userId =
        $("#loginUserId").value.trim();

    const password =
        $("#loginPassword").value;

    const message =
        $("#loginMessage");

    message.innerHTML = "";

    if (
        userId !== ADMIN_USER_ID ||
        password !== ADMIN_PASSWORD
    ) {

        message.innerHTML = `
            <div class="error-message">
                Invalid User ID or Password
            </div>
        `;

        return;
    }

    state.loggedIn = true;
    state.userId = ADMIN_USER_ID;

    saveState();

    showApplication();
}

/* =========================================================
   APPLICATION
   ========================================================= */

function showApplication() {

    document.body.innerHTML = `

        <div class="app">

            <aside class="sidebar">

                <div class="brand">

                    <div class="brand-logo">
                        ISC
                    </div>

                    <div>
                        <strong>
                            ISMART OFFICE
                        </strong>

                        <small>
                            SUMAN CREATIONS
                        </small>
                    </div>

                </div>

                <nav>

                    <button
                        class="nav-btn active"
                        data-page="dashboard"
                    >
                        🏠 Dashboard
                    </button>

                    <button
                        class="nav-btn"
                        data-page="attendance"
                    >
                        📍 Attendance
                    </button>

                    <button
                        class="nav-btn"
                        data-page="team"
                    >
                        👥 Team
                    </button>

                    <button
                        class="nav-btn"
                        data-page="salary"
                    >
                        💰 Salary
                    </button>

                    <button
                        class="nav-btn"
                        data-page="wallet"
                    >
                        💳 Wallet
                    </button>

                    <button
                        class="nav-btn"
                        data-page="meetings"
                    >
                        🎥 Meetings
                    </button>

                    <button
                        class="nav-btn"
                        data-page="notifications"
                    >
                        🔔 Notifications
                    </button>

                </nav>

                <button
                    id="logoutBtn"
                    class="logout-btn"
                >
                    🚪 Logout
                </button>

            </aside>

            <main class="main">

                <header class="topbar">

                    <div>
                        <h2 id="pageTitle">
                            Dashboard
                        </h2>

                        <span>
                            ${today()}
                        </span>
                    </div>

                    <div class="admin-user">

                        <div class="avatar">
                            A
                        </div>

                        <div>
                            <strong>Admin</strong>

                            <small>
                                ${escapeHTML(state.userId)}
                            </small>
                        </div>

                    </div>

                </header>

                <section id="content"></section>

            </main>

        </div>
    `;

    $$(".nav-btn").forEach(button => {

        button.addEventListener(
            "click",
            () => showPage(button.dataset.page)
        );

    });

    $("#logoutBtn").addEventListener(
        "click",
        logout
    );

    showPage("dashboard");
}

/* =========================================================
   PAGE NAVIGATION
   ========================================================= */

function showPage(page) {

    state.page = page;

    $$(".nav-btn").forEach(button => {

        button.classList.toggle(
            "active",
            button.dataset.page === page
        );

    });

    const titles = {
        dashboard: "Dashboard",
        attendance: "Attendance",
        team: "Team Management",
        salary: "Salary",
        wallet: "Wallet",
        meetings: "Meetings",
        notifications: "Notifications"
    };

    $("#pageTitle").textContent =
        titles[page] || "Dashboard";

    const content = $("#content");

    if (!content) return;

    switch (page) {

        case "dashboard":
            renderDashboard(content);
            break;

        case "attendance":
            renderAttendance(content);
            break;

        case "team":
            renderTeam(content);
            break;

        case "salary":
            renderSalary(content);
            break;

        case "wallet":
            renderWallet(content);
            break;

        case "meetings":
            renderMeetings(content);
            break;

        case "notifications":
            renderNotifications(content);
            break;

    }
}

/* =========================================================
   DASHBOARD
   ========================================================= */

function renderDashboard(content) {

    const present =
        state.attendance.filter(
            item =>
                item.date === today() &&
                item.status === "present"
        ).length;

    content.innerHTML = `

        <div class="page">

            <div class="welcome">

                <div>
                    <h1>
                        Welcome back, Admin 👋
                    </h1>

                    <p>
                        Manage ISMART SUMAN CREATIONS
                        from one place.
                    </p>
                </div>

                <div class="live-status">
                    ● SYSTEM ONLINE
                </div>

            </div>

            <div class="stats-grid">

                <div class="stat-card">
                    <span>👥</span>
                    <small>Total Team</small>
                    <strong>
                        ${state.team.length}
                    </strong>
                </div>

                <div class="stat-card">
                    <span>📍</span>
                    <small>Present Today</small>
                    <strong>
                        ${present}
                    </strong>
                </div>

                <div class="stat-card">
                    <span>💰</span>
                    <small>Salary / Day</small>
                    <strong>
                        ${money(state.salaryPerDay)}
                    </strong>
                </div>

                <div class="stat-card">
                    <span>💳</span>
                    <small>Admin Wallet</small>
                    <strong>
                        ${money(state.wallet)}
                    </strong>
                </div>

            </div>

            <div class="section-card">

                <div class="section-header">
                    <h3>Quick Actions</h3>
                </div>

                <div class="quick-actions">

                    <button
                        onclick="showPage('attendance')"
                    >
                        📍 Attendance
                    </button>

                    <button
                        onclick="openAddTeamModal()"
                    >
                        👤 Add Team
                    </button>

                    <button
                        onclick="showPage('salary')"
                    >
                        💰 Salary
                    </button>

                    <button
                        onclick="showPage('meetings')"
                    >
                        🎥 Meeting
                    </button>

                </div>

            </div>

            <div class="section-card">

                <div class="section-header">
                    <h3>Recent Notifications</h3>

                    <button
                        class="text-btn"
                        onclick="showPage('notifications')"
                    >
                        View All
                    </button>
                </div>

                ${renderNotificationList(3)}

            </div>

        </div>
    `;
}

/* =========================================================
   ATTENDANCE
   ========================================================= */

function renderAttendance(content) {

    const records =
        [...state.attendance].reverse();

    content.innerHTML = `

        <div class="page">

            <div class="page-header">

                <div>
                    <h1>Attendance</h1>
                    <p>
                        Office attendance and
                        location verification.
                    </p>
                </div>

            </div>

            <div class="attendance-card">

                <div class="scanner">

                    <div class="scanner-circle">
                        <span>●</span>
                    </div>

                    <h2>
                        ISC OFFICE SCANNER
                    </h2>

                    <p>
                        Team members must be within
                        <strong>50 meters</strong>
                        of the Admin transmitter.
                    </p>

                </div>

                <div class="attendance-actions">

                    <button
                        id="checkInBtn"
                        class="primary-btn"
                        onclick="checkIn()"
                    >
                        📍 CHECK IN
                    </button>

                    <button
                        id="checkOutBtn"
                        class="secondary-btn"
                        onclick="checkOut()"
                    >
                        🚪 CHECK OUT
                    </button>

                </div>

                <div id="attendanceMessage"></div>

            </div>

            <div class="section-card">

                <h3>
                    Attendance Records
                </h3>

                ${
                    records.length

                    ? records.map(item => `

                        <div class="record-row">

                            <div>
                                <strong>
                                    ${escapeHTML(item.user)}
                                </strong>

                                <small>
                                    ${item.date}
                                </small>
                            </div>

                            <div>
                                <span class="status-badge">
                                    ${item.status}
                                </span>

                                <small>
                                    ${item.time}
                                </small>
                            </div>

                        </div>

                    `).join("")

                    : `
                        <div class="empty">
                            No attendance records yet.
                        </div>
                    `
                }

            </div>

        </div>
    `;
}

function checkIn() {

    const button =
        $("#checkInBtn");

    if (!button) return;

    button.disabled = true;

    $("#attendanceMessage").innerHTML = `
        <div class="scanner-message">
            🔍 Searching for ISC Admin transmitter...
        </div>
    `;

    setTimeout(() => {

        const record = {

            id: Date.now(),

            user: state.userId,

            date: today(),

            time: timeNow(),

            status: "present",

            checkInTime: Date.now()

        };

        state.attendance.push(record);

        addNotification(
            "Attendance",
            "Check-in completed successfully."
        );

        saveState();

        renderAttendance($("#content"));

    }, 1000);
}

function checkOut() {

    const latest =
        [...state.attendance]
            .reverse()
            .find(
                item =>
                    item.user === state.userId &&
                    item.date === today() &&
                    item.status === "present"
            );

    if (!latest) {

        toast(
            "Please check in first."
        );

        return;
    }

    const elapsed =
        Date.now() - latest.checkInTime;

    const minimum =
        5 * 60 * 60 * 1000;

    if (elapsed < minimum) {

        const remaining =
            minimum - elapsed;

        const hours =
            Math.ceil(
                remaining / 3600000
            );

        toast(
            `Checkout available after 5 hours. ${hours} hour(s) remaining.`
        );

        return;
    }

    latest.status = "checked-out";

    latest.checkOut =
        timeNow();

    latest.checkOutTime =
        Date.now();

    addNotification(
        "Attendance",
        "Check-out completed successfully."
    );

    saveState();

    renderAttendance($("#content"));
}

/* =========================================================
   TEAM
   ========================================================= */

function renderTeam(content) {

    content.innerHTML = `

        <div class="page">

            <div class="page-header">

                <div>
                    <h1>Team Management</h1>

                    <p>
                        Manage ISC team members.
                    </p>
                </div>

                <button
                    class="primary-btn"
                    onclick="openAddTeamModal()"
                >
                    + Add Team Member
                </button>

            </div>

            <div class="team-grid">

                ${
                    state.team.length

                    ? state.team.map(member => `

                        <div class="team-card">

                            <div class="member-avatar">
                                ${escapeHTML(
                                    member.name
                                        .charAt(0)
                                        .toUpperCase()
                                )}
                            </div>

                            <h3>
                                ${escapeHTML(member.name)}
                            </h3>

                            <p>
                                ${escapeHTML(member.userId)}
                            </p>

                            <span class="status-badge">
                                Active
                            </span>

                        </div>

                    `).join("")

                    : `
                        <div class="empty">
                            No team members added yet.
                        </div>
                    `
                }

            </div>

        </div>
    `;
}

function openAddTeamModal() {

    const overlay =
        document.createElement("div");

    overlay.className =
        "modal-overlay";

    overlay.innerHTML = `

        <div class="modal">

            <button
                class="modal-close"
                id="closeTeamModal"
            >
                ×
            </button>

            <h2>
                Add Team Member
            </h2>

            <form id="teamForm">

                <label>
                    Name
                </label>

                <input
                    id="memberName"
                    required
                    placeholder="Full name"
                >

                <label>
                    User ID
                </label>

                <input
                    id="memberId"
                    required
                    placeholder="User ID"
                >

                <label>
                    Password
                </label>

                <input
                    id="memberPassword"
                    type="password"
                    required
                    placeholder="Password"
                >

                <button
                    class="primary-btn"
                    type="submit"
                >
                    Add Member
                </button>

            </form>

        </div>
    `;

    document.body.appendChild(
        overlay
    );

    $("#closeTeamModal").onclick =
        () => overlay.remove();

    $("#teamForm").addEventListener(
        "submit",
        event => {

            event.preventDefault();

            const member = {

                id: Date.now(),

                name:
                    $("#memberName")
                        .value
                        .trim(),

                userId:
                    $("#memberId")
                        .value
                        .trim(),

                password:
                    $("#memberPassword")
                        .value,

                createdAt:
                    new Date().toISOString()

            };

            state.team.push(member);

            addNotification(
                "Team",
                `${member.name} added to the team.`
            );

            saveState();

            overlay.remove();

            showPage("team");

        }
    );
}

/* =========================================================
   SALARY
   ========================================================= */

function renderSalary(content) {

    const total =
        state.team.length *
        state.salaryPerDay;

    content.innerHTML = `

        <div class="page">

            <div class="page-header">

                <div>
                    <h1>
                        Salary Management
                    </h1>

                    <p>
                        Daily team salary management.
                    </p>
                </div>

            </div>

            <div class="stats-grid">

                <div class="stat-card">
                    <span>💵</span>
                    <small>Daily Rate</small>
                    <strong>
                        ${money(state.salaryPerDay)}
                    </strong>
                </div>

                <div class="stat-card">
                    <span>👥</span>
                    <small>Team Members</small>
                    <strong>
                        ${state.team.length}
                    </strong>
                </div>

                <div class="stat-card">
                    <span>📊</span>
                    <small>Daily Requirement</small>
                    <strong>
                        ${money(total)}
                    </strong>
                </div>

            </div>

            <div class="section-card">

                <h3>
                    Current Salary Rule
                </h3>

                <p>
                    Every active team member earns
                    <strong>
                        ${money(state.salaryPerDay)}
                        per working day
                    </strong>.
                </p>

                <button
                    class="secondary-btn"
                    onclick="openSalaryModal()"
                >
                    Change Daily Rate
                </button>

            </div>

        </div>
    `;
}

function openSalaryModal() {

    openInputModal(
        "Change Daily Salary",
        "Daily salary amount",
        state.salaryPerDay,
        value => {

            const amount =
                Number(value);

            if (
                !Number.isFinite(amount) ||
                amount < 0
            ) {
                toast(
                    "Enter a valid amount."
                );
                return false;
            }

            state.salaryPerDay =
                amount;

            addNotification(
                "Salary",
                `Daily salary changed to ${money(amount)}.`
            );

            saveState();

            showPage("salary");

            return true;
        }
    );
}

/* =========================================================
   WALLET
   ========================================================= */

function renderWallet(content) {

    content.innerHTML = `

        <div class="page">

            <div class="page-header">

                <div>
                    <h1>
                        Admin Wallet
                    </h1>

                    <p>
                        Manage office funds.
                    </p>
                </div>

                <button
                    class="primary-btn"
                    onclick="openWalletModal()"
                >
                    Adjust Wallet
                </button>

            </div>

            <div class="wallet-card">

                <small>
                    Available Balance
                </small>

                <strong>
                    ${money(state.wallet)}
                </strong>

                <span>
                    ISC Office Admin Wallet
                </span>

            </div>

        </div>
    `;
}

function openWalletModal() {

    openInputModal(
        "Adjust Admin Wallet",
        "Amount (+ add / - subtract)",
        "",
        value => {

            const amount =
                Number(value);

            if (
                !Number.isFinite(amount)
            ) {
                toast(
                    "Enter a valid amount."
                );
                return false;
            }

            if (
                state.wallet + amount < 0
            ) {
                toast(
                    "Wallet cannot go below ₹0."
                );
                return false;
            }

            state.wallet += amount;

            addNotification(
                "Wallet",
                `Wallet adjusted by ${money(amount)}.`
            );

            saveState();

            showPage("wallet");

            return true;
        }
    );
}

/* =========================================================
   MEETINGS
   ========================================================= */

function renderMeetings(content) {

    content.innerHTML = `

        <div class="page">

            <div class="page-header">

                <div>
                    <h1>
                        ISC Meetings
                    </h1>

                    <p>
                        Internal team meeting platform.
                    </p>
                </div>

                <button
                    class="primary-btn"
                    onclick="createMeeting()"
                >
                    + Create Meeting
                </button>

            </div>

            <div class="meeting-card">

                <div class="meeting-icon">
                    🎥
                </div>

                <h2>
                    Internal Meeting Room
                </h2>

                <p>
                    Create an internal ISC meeting room
                    for your team.
                </p>

                <button
                    class="primary-btn"
                    onclick="createMeeting()"
                >
                    Create Meeting
                </button>

            </div>

        </div>
    `;
}

function createMeeting() {

    const id =
        "ISC-" +
        Math.random()
            .toString(36)
            .substring(2, 8)
            .toUpperCase();

    const url =
        `${location.origin}/meeting.html?room=${id}`;

    addNotification(
        "Meeting",
        `Meeting ${id} created.`
    );

    saveState();

    contentMeetingCreated(url);
}

function contentMeetingCreated(url) {

    const content =
        $("#content");

    content.innerHTML = `

        <div class="page">

            <div class="meeting-created">

                <div class="success-icon">
                    ✓
                </div>

                <h1>
                    Meeting Created
                </h1>

                <p>
                    Share this meeting link
                    with your team.
                </p>

                <div class="meeting-link">
                    ${escapeHTML(url)}
                </div>

                <button
                    class="primary-btn"
                    id="copyMeetingBtn"
                >
                    📋 Copy Meeting Link
                </button>

                <button
                    class="secondary-btn"
                    id="openMeetingBtn"
                >
                    🎥 Open Meeting
                </button>

            </div>

        </div>
    `;

    $("#copyMeetingBtn").onclick =
        () => copyMeetingLink(url);

    $("#openMeetingBtn").onclick =
        () => window.open(
            url,
            "_blank"
        );
}

function copyMeetingLink(url) {

    navigator.clipboard
        .writeText(url)
        .then(() =>
            toast(
                "Meeting link copied."
            )
        )
        .catch(() =>
            toast(
                "Copy failed."
            )
        );
}

/* =========================================================
   NOTIFICATIONS
   ========================================================= */

function addNotification(
    title,
    message
) {

    state.notifications.unshift({

        id: Date.now(),

        title,

        message,

        time:
            new Date().toISOString(),

        active: true

    });

    cleanupNotifications();

    saveState();
}

function cleanupNotifications() {

    const now =
        Date.now();

    state.notifications.forEach(
        item => {

            const age =
                now -
                new Date(
                    item.time
                ).getTime();

            if (
                age >
                24 * 60 * 60 * 1000
            ) {
                item.active = false;
            }

        }
    );
}

function renderNotifications(content) {

    cleanupNotifications();

    content.innerHTML = `

        <div class="page">

            <div class="page-header">

                <div>
                    <h1>
                        Notifications
                    </h1>

                    <p>
                        Office activity notifications.
                    </p>
                </div>

                <button
                    class="secondary-btn"
                    onclick="clearNotifications()"
                >
                    Clear Active
                </button>

            </div>

            <div class="section-card">

                ${renderNotificationList()}

            </div>

        </div>
    `;
}

function renderNotificationList(
    limit
) {

    cleanupNotifications();

    const list =
        state.notifications
            .filter(
                item => item.active
            )
            .slice(
                0,
                limit ||
                state.notifications.length
            );

    if (!list.length) {

        return `
            <div class="empty">
                No active notifications.
            </div>
        `;
    }

    return list.map(
        item => `

        <div class="notification-item">

            <div class="notification-icon">
                🔔
            </div>

            <div>

                <strong>
                    ${escapeHTML(item.title)}
                </strong>

                <p>
                    ${escapeHTML(item.message)}
                </p>

                <small>
                    ${new Date(
                        item.time
                    ).toLocaleString("en-IN")}
                </small>

            </div>

        </div>

    `).join("");
}

function clearNotifications() {

    state.notifications.forEach(
        item =>
            item.active = false
    );

    saveState();

    showPage(
        "notifications"
    );
}

/* =========================================================
   INTERNAL MODAL
   ========================================================= */

function openInputModal(
    title,
    label,
    value,
    submit
) {

    const overlay =
        document.createElement("div");

    overlay.className =
        "modal-overlay";

    overlay.innerHTML = `

        <div class="modal">

            <button
                class="modal-close"
                id="closeInputModal"
            >
                ×
            </button>

            <h2>
                ${escapeHTML(title)}
            </h2>

            <form id="inputModalForm">

                <label>
                    ${escapeHTML(label)}
                </label>

                <input
                    id="modalInput"
                    value="${escapeHTML(value)}"
                    required
                    autofocus
                >

                <button
                    class="primary-btn"
                    type="submit"
                >
                    Save
                </button>

            </form>

        </div>
    `;

    document.body.appendChild(
        overlay
    );

    $("#closeInputModal").onclick =
        () => overlay.remove();

    $("#inputModalForm").onsubmit =
        event => {

            event.preventDefault();

            const result =
                submit(
                    $("#modalInput").value
                );

            if (result !== false) {
                overlay.remove();
            }
        };
}

/* =========================================================
   TOAST
   ========================================================= */

function toast(message) {

    const old =
        document.querySelector(
            ".isc-toast"
        );

    if (old) old.remove();

    const element =
        document.createElement("div");

    element.className =
        "isc-toast";

    element.textContent =
        message;

    document.body.appendChild(
        element
    );

    setTimeout(
        () => element.remove(),
        3000
    );
}

/* =========================================================
   LOGOUT
   ========================================================= */

function logout() {

    state.loggedIn = false;
    state.userId = "";

    localStorage.removeItem(
        "isc_logged_in"
    );

    localStorage.removeItem(
        "isc_user_id"
    );

    showLogin();
}

/* =========================================================
   START APP
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        if (state.loggedIn) {
            showApplication();
        } else {
            showLogin();
        }

    }
);