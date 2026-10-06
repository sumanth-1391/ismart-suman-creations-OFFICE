async function login(event) {
    event.preventDefault();

    const userId = document
        .getElementById("loginUserId")
        .value
        .trim();

    const password = document
        .getElementById("loginPassword")
        .value;

    const message = document.getElementById("loginMessage");

    message.innerHTML = "";

    if (!userId || !password) {
        message.innerHTML = `
            <div class="error-message">
                Please enter User ID and Password.
            </div>
        `;
        return;
    }

    try {
        const response = await fetch("/api/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                username: userId,
                password: password
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.error || "Invalid User ID or Password"
            );
        }

        const user = data.user;

        // Save real authenticated user
        state.loggedIn = true;
        state.userId = user.id;
        state.username = user.username;
        state.role = user.role;
        state.currentUser = user;

        localStorage.setItem(
            "isc_logged_in",
            "true"
        );

        localStorage.setItem(
            "isc_user_id",
            user.id
        );

        localStorage.setItem(
            "isc_username",
            user.username
        );

        localStorage.setItem(
            "isc_role",
            user.role
        );

        localStorage.setItem(
            "isc_current_user",
            JSON.stringify(user)
        );

        showApplication();

    } catch (error) {

        console.error("LOGIN ERROR:", error);

        message.innerHTML = `
            <div class="error-message">
                ${escapeHTML(error.message)}
            </div>
        `;
    }
}