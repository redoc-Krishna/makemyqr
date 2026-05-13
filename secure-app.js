const API_ENDPOINTS = {
    bootstrap: "/api/bootstrap",
    signup: "/api/signup",
    login: "/api/login",
    logout: "/api/logout",
    account: "/api/account",
    password: "/api/password",
    history: "/api/history"
};

const MAX_PROFILE_PICTURE_BYTES = 1024 * 1024;

const authView = document.getElementById("authView");
const generatorView = document.getElementById("generatorView");
const historySection = document.getElementById("historySection");
const loginStepsPanel = document.getElementById("loginStepsPanel");
const signupStepsPanel = document.getElementById("signupStepsPanel");
const generatorStepsPanel = document.getElementById("generatorStepsPanel");
const loginTabBtn = document.getElementById("loginTabBtn");
const signupTabBtn = document.getElementById("signupTabBtn");
const showSignupBtn = document.getElementById("showSignupBtn");
const showLoginBtn = document.getElementById("showLoginBtn");
const returnToGeneratorBtn = document.getElementById("returnToGeneratorBtn");
const loginForm = document.getElementById("loginForm");
const signupForm = document.getElementById("signupForm");
const loginUsername = document.getElementById("loginUsername");
const loginPassword = document.getElementById("loginPassword");
const signupUsername = document.getElementById("signupUsername");
const signupPassword = document.getElementById("signupPassword");
const signupPasswordConfirm = document.getElementById("signupPasswordConfirm");
const loginMessage = document.getElementById("loginMessage");
const signupMessage = document.getElementById("signupMessage");
const welcomeName = document.getElementById("welcomeName");
const guestLoginBtn = document.getElementById("guestLoginBtn");
const profileCard = document.getElementById("profileCard");
const profileAvatarImage = document.getElementById("profileAvatarImage");
const profileAvatarFallback = document.getElementById("profileAvatarFallback");
const profileDisplayName = document.getElementById("profileDisplayName");
const profileUsername = document.getElementById("profileUsername");
const moreOptionsBtn = document.getElementById("moreOptionsBtn");
const accountMenu = document.getElementById("accountMenu");
const openAuthFromMenuBtn = document.getElementById("openAuthFromMenuBtn");
const openAccountDetailsBtn = document.getElementById("openAccountDetailsBtn");
const openResetPasswordBtn = document.getElementById("openResetPasswordBtn");
const openDeleteAccountBtn = document.getElementById("openDeleteAccountBtn");
const logoutBtn = document.getElementById("logoutBtn");
const qrForm = document.getElementById("qrForm");
const qrText = document.getElementById("qrText");
const qrBox = document.getElementById("qrBox");
const downloadBtn = document.getElementById("downloadBtn");
const openLink = document.getElementById("openLink");
const statusMessage = document.getElementById("statusMessage");
const historyList = document.getElementById("historyList");
const historyCount = document.getElementById("historyCount");
const clearHistoryBtn = document.getElementById("clearHistoryBtn");
const modalBackdrop = document.getElementById("modalBackdrop");
const launchScreen = document.getElementById("launchScreen");
const launchStatus = document.getElementById("launchStatus");
const accountDetailsModal = document.getElementById("accountDetailsModal");
const resetPasswordModal = document.getElementById("resetPasswordModal");
const deleteAccountModal = document.getElementById("deleteAccountModal");
const accountDetailsForm = document.getElementById("accountDetailsForm");
const accountNameInput = document.getElementById("accountNameInput");
const profilePictureInput = document.getElementById("profilePictureInput");
const picturePicker = document.getElementById("picturePicker");
const chooseProfilePictureBtn = document.getElementById("chooseProfilePictureBtn");
const removeProfilePictureBtn = document.getElementById("removeProfilePictureBtn");
const profilePictureMeta = document.getElementById("profilePictureMeta");
const accountDetailsMessage = document.getElementById("accountDetailsMessage");
const accountPreviewImage = document.getElementById("accountPreviewImage");
const accountPreviewFallback = document.getElementById("accountPreviewFallback");
const accountPreviewName = document.getElementById("accountPreviewName");
const accountPreviewHandle = document.getElementById("accountPreviewHandle");
const saveAccountDetailsBtn = document.getElementById("saveAccountDetailsBtn");
const closeAccountDetailsBtn = document.getElementById("closeAccountDetailsBtn");
const cancelAccountDetailsBtn = document.getElementById("cancelAccountDetailsBtn");
const closeResetPasswordBtn = document.getElementById("closeResetPasswordBtn");
const cancelResetPasswordBtn = document.getElementById("cancelResetPasswordBtn");
const closeDeleteAccountBtn = document.getElementById("closeDeleteAccountBtn");
const cancelDeleteAccountBtn = document.getElementById("cancelDeleteAccountBtn");
const resetPasswordForm = document.getElementById("resetPasswordForm");
const deleteAccountForm = document.getElementById("deleteAccountForm");
const oldPassword = document.getElementById("oldPassword");
const newPassword = document.getElementById("newPassword");
const confirmNewPassword = document.getElementById("confirmNewPassword");
const deletePassword = document.getElementById("deletePassword");
const resetPasswordMessage = document.getElementById("resetPasswordMessage");
const deleteAccountMessage = document.getElementById("deleteAccountMessage");
const passwordToggleButtons = document.querySelectorAll("[data-toggle-password]");

if (welcomeName.textContent === "Hello Guest") {
    statusMessage.textContent = "Log in to save your QR history.";
}

const modals = [accountDetailsModal, resetPasswordModal, deleteAccountModal];
const qrStage = document.createElement("div");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const MIN_LAUNCH_MS = prefersReducedMotion ? 180 : 1900;
const EXIT_LAUNCH_MS = prefersReducedMotion ? 0 : 560;
const MIN_QR_BUILD_MS = prefersReducedMotion ? 0 : 820;
const QR_BUILD_GRID_SIZE = 25;
const launchStartedAt = performance.now();

qrStage.setAttribute("aria-hidden", "true");
qrStage.style.position = "fixed";
qrStage.style.left = "-99999px";
qrStage.style.top = "0";
qrStage.style.width = "0";
qrStage.style.height = "0";
qrStage.style.opacity = "0";
qrStage.style.pointerEvents = "none";
document.body.appendChild(qrStage);

let currentUser = "";
let currentUserRecord = null;
let currentHistory = [];
let pendingProfilePicture = "";
let selectedProfilePictureFile = null;
let removeProfilePictureRequested = false;
let launchDismissed = false;
let activeQrGeneration = 0;

loginTabBtn.addEventListener("click", () => showAuthMode("login"));
signupTabBtn.addEventListener("click", () => showAuthMode("signup"));
showSignupBtn.addEventListener("click", () => showAuthMode("signup"));
showLoginBtn.addEventListener("click", () => showAuthMode("login"));
returnToGeneratorBtn.addEventListener("click", showGeneratorPage);
guestLoginBtn.addEventListener("click", () => openAuthPage("login"));
openAuthFromMenuBtn.addEventListener("click", () => openAuthPage("login"));
logoutBtn.addEventListener("click", () => {
    void logoutUser();
});
moreOptionsBtn.addEventListener("click", toggleAccountMenu);
openAccountDetailsBtn.addEventListener("click", openAccountDetails);
openResetPasswordBtn.addEventListener("click", () => openModal(resetPasswordModal));
openDeleteAccountBtn.addEventListener("click", () => openModal(deleteAccountModal));
closeAccountDetailsBtn.addEventListener("click", closeModal);
cancelAccountDetailsBtn.addEventListener("click", closeModal);
closeResetPasswordBtn.addEventListener("click", closeModal);
cancelResetPasswordBtn.addEventListener("click", closeModal);
closeDeleteAccountBtn.addEventListener("click", closeModal);
cancelDeleteAccountBtn.addEventListener("click", closeModal);
modalBackdrop.addEventListener("click", closeModal);
clearHistoryBtn.addEventListener("click", () => {
    void clearAllHistory();
});
accountNameInput.addEventListener("input", updateAccountDetailsPreview);
profilePictureInput.addEventListener("change", handleProfilePictureSelection);
chooseProfilePictureBtn.addEventListener("click", () => profilePictureInput.click());
removeProfilePictureBtn.addEventListener("click", clearSelectedProfilePicture);
saveAccountDetailsBtn.addEventListener("click", () => {
    void handleAccountDetailsSave();
});

if (picturePicker) {
    picturePicker.addEventListener("click", (event) => {
        if (!event.target.closest("button")) {
            profilePictureInput.click();
        }
    });

    picturePicker.addEventListener("keydown", (event) => {
        if ((event.key === "Enter" || event.key === " ") && event.target === picturePicker) {
            event.preventDefault();
            profilePictureInput.click();
        }
    });

    picturePicker.addEventListener("dragenter", handlePictureDragEnter);
    picturePicker.addEventListener("dragover", handlePictureDragOver);
    picturePicker.addEventListener("dragleave", handlePictureDragLeave);
    picturePicker.addEventListener("drop", handlePictureDrop);
}

passwordToggleButtons.forEach((button) => {
    button.addEventListener("click", () => togglePasswordVisibility(button));
});

loginForm.addEventListener("submit", (event) => {
    event.preventDefault();
    void handleLogin();
});

signupForm.addEventListener("submit", (event) => {
    event.preventDefault();
    void handleSignup();
});

qrForm.addEventListener("submit", (event) => {
    event.preventDefault();
    generateQRCode();
});

accountDetailsForm.addEventListener("submit", (event) => {
    event.preventDefault();
    void handleAccountDetailsSave();
});

resetPasswordForm.addEventListener("submit", (event) => {
    event.preventDefault();
    void handleResetPassword();
});

deleteAccountForm.addEventListener("submit", (event) => {
    event.preventDefault();
    void handleDeleteAccount();
});

qrText.addEventListener("input", () => {
    activeQrGeneration += 1;
    downloadBtn.hidden = true;
    openLink.hidden = true;
    setStatus("Enter a website link to generate your QR code.", "neutral");

    if (!qrBox.querySelector(".empty-state")) {
        qrBox.innerHTML = '<p class="empty-state">Your QR preview will appear here after you generate one.</p>';
    }
});

const generateBtn = qrForm.querySelector('button[type="submit"]');

loginUsername.addEventListener("focus", () => highlightGuideStep(loginStepsPanel, 1));
loginPassword.addEventListener("focus", () => highlightGuideStep(loginStepsPanel, 2));
signupUsername.addEventListener("focus", () => highlightGuideStep(signupStepsPanel, 1));
signupPassword.addEventListener("focus", () => highlightGuideStep(signupStepsPanel, 2));
signupPasswordConfirm.addEventListener("focus", () => highlightGuideStep(signupStepsPanel, 2));
qrText.addEventListener("focus", () => highlightGuideStep(generatorStepsPanel, 1));
generateBtn.addEventListener("focus", () => highlightGuideStep(generatorStepsPanel, 2));
downloadBtn.addEventListener("focus", () => highlightGuideStep(generatorStepsPanel, 2));
openLink.addEventListener("focus", () => highlightGuideStep(generatorStepsPanel, 2));

const focusableFields = [
    loginUsername, loginPassword, signupUsername, signupPassword, signupPasswordConfirm, 
    qrText, generateBtn, downloadBtn, openLink
];

focusableFields.forEach((field) => {
    field.addEventListener("blur", () => {
        window.setTimeout(() => {
            if (!focusableFields.includes(document.activeElement)) {
                clearGuideStepHighlight();
            }
        }, 0);
    });
});

historyList.addEventListener("click", (event) => {
    const openAuthLink = event.target.closest("[data-action='open-auth']");
    const reuseButton = event.target.closest("[data-action='reuse']");
    const deleteButton = event.target.closest("[data-action='delete']");

    if (openAuthLink) {
        event.preventDefault();
        openAuthPage("login");
        return;
    }

    if (deleteButton) {
        void deleteHistoryEntry(deleteButton.dataset.id || "");
        return;
    }

    if (!reuseButton) {
        return;
    }

    qrText.value = reuseButton.dataset.url || "";
    showGeneratorPage();
    generateQRCode();
});

document.addEventListener("click", (event) => {
    if (!accountMenu.hidden && !event.target.closest(".menu-wrap")) {
        closeAccountMenu();
    }
});

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        closeModal();
        closeAccountMenu();
    }
});

void initializeApp();

async function initializeApp() {
    let launchMessage = "Your QR studio is ready.";

    resetGenerator();
    showAuthMode("login");
    setLaunchStatus("Loading QR studio");

    if (window.location.protocol === "file:") {
        updateUserInterface();
        showGeneratorPage();
        setStatus("Open the full app instead of opening the HTML file directly.", "warning");
        launchMessage = "Use the app server for the full experience.";
        await finishLaunchAnimation(launchMessage);
        return;
    }

    try {
        await refreshSession();
        showGeneratorPage();
        const firstName = welcomeName.textContent.split(" ").slice(1).join(" ");
        setStatus(currentUser ? `Welcome back ${firstName}. Enter a website link to generate your QR code.` : "Log in to save your QR history.", "neutral");
        launchMessage = currentUser ? `Welcome back ${firstName || "again"}.` : "Your QR studio is ready.";
    } catch (error) {
        applyBootstrap(guestBootstrap());
        showGeneratorPage();
        setStatus(error.message, "error");
        launchMessage = "Launching guest mode.";
    } finally {
        await finishLaunchAnimation(launchMessage);
    }
}

function setLaunchStatus(message) {
    if (launchStatus) {
        launchStatus.textContent = message;
    }
}

function delay(ms) {
    return new Promise((resolve) => {
        window.setTimeout(resolve, ms);
    });
}

async function finishLaunchAnimation(message) {
    if (launchDismissed) {
        return;
    }

    launchDismissed = true;
    setLaunchStatus(message);

    const remaining = Math.max(0, MIN_LAUNCH_MS - (performance.now() - launchStartedAt));

    if (remaining > 0) {
        await delay(remaining);
    }

    document.body.classList.add("app-ready");

    if (EXIT_LAUNCH_MS > 0) {
        await delay(EXIT_LAUNCH_MS);
    }

    document.body.classList.remove("app-loading");
    document.body.classList.add("app-loaded");

    if (launchScreen) {
        launchScreen.hidden = true;
        launchScreen.setAttribute("aria-hidden", "true");
    }
}

function guestBootstrap() {
    return {
        authenticated: false,
        user: null,
        history: []
    };
}

async function refreshSession() {
    const payload = await requestJson(API_ENDPOINTS.bootstrap);
    applyBootstrap(payload);
    return payload;
}

function applyBootstrap(payload) {
    const authenticated = Boolean(payload && payload.authenticated && payload.user);

    currentUser = authenticated ? String(payload.user.username || "") : "";
    currentUserRecord = authenticated ? normalizeAccountUser(payload.user) : null;
    currentHistory = authenticated ? normalizeHistory(payload.history) : [];
    pendingProfilePicture = (currentUserRecord && currentUserRecord.profilePicture) || "";
    selectedProfilePictureFile = null;
    removeProfilePictureRequested = false;

    updateUserInterface();
    renderHistory();
}

function normalizeAccountUser(value) {
    return {
        username: String((value && value.username) || ""),
        name: String((value && value.name) || ""),
        profilePicture: String((value && value.profilePicture) || "")
    };
}

function normalizeHistory(value) {
    if (!Array.isArray(value)) {
        return [];
    }

    return value
        .map((entry) => ({
            id: String((entry && entry.id) || ""),
            url: String((entry && entry.url) || ""),
            createdAt: String((entry && entry.createdAt) || "")
        }))
        .filter((entry) => entry.id && entry.url && entry.createdAt);
}

function showAuthMode(mode) {
    const showLogin = mode === "login";

    loginForm.hidden = !showLogin;
    signupForm.hidden = showLogin;
    loginTabBtn.classList.toggle("is-active", showLogin);
    signupTabBtn.classList.toggle("is-active", !showLogin);
    loginStepsPanel.hidden = !showLogin;
    signupStepsPanel.hidden = showLogin;
    clearFormMessage(loginMessage);
    clearFormMessage(signupMessage);
    clearGuideStepHighlight();
}

function clearGuideStepHighlight() {
    const allGuideRows = document.querySelectorAll(".guide-row");
    allGuideRows.forEach((row) => row.classList.remove("is-following"));
}

function highlightGuideStep(panel, stepIndex) {
    clearGuideStepHighlight();

    if (!panel || typeof stepIndex !== "number" || stepIndex < 1) {
        return;
    }

    const guideRows = panel.querySelectorAll(".guide-row");
    const targetRow = guideRows[stepIndex - 1] || guideRows[guideRows.length - 1];

    if (targetRow) {
        targetRow.classList.add("is-following");
    }
}

function openAuthPage(mode = "login") {
    if (window.location.protocol === "file:") {
        showGeneratorPage();
        setStatus("Open the full app instead of reopening the HTML file directly.", "warning");
        return;
    }

    closeModal();
    closeAccountMenu();
    showAuthMode(mode);
    authView.hidden = false;
    generatorView.hidden = true;
    historySection.hidden = true;
    generatorStepsPanel.hidden = true;
}

function showGeneratorPage() {
    closeModal();
    closeAccountMenu();
    authView.hidden = true;
    generatorView.hidden = false;
    historySection.hidden = false;
    loginStepsPanel.hidden = true;
    signupStepsPanel.hidden = true;
    generatorStepsPanel.hidden = false;
    updateUserInterface();
    renderHistory();
    clearGuideStepHighlight();
}

async function handleLogin() {
    const username = loginUsername.value.trim();
    const password = loginPassword.value;

    if (!username || !password) {
        setFormMessage(loginMessage, "Please enter your username and password.", "error");
        return;
    }

    try {
        const payload = await requestJson(API_ENDPOINTS.login, {
            method: "POST",
            body: { username, password }
        });

        clearFormMessage(loginMessage);
        loginForm.reset();
        applyBootstrap(payload);
        showGeneratorPage();
        setStatus("Logged in successfully.", "success");
    } catch (error) {
        showRequestError(loginMessage, error, "We could not log you in right now.");
    }
}

async function handleSignup() {
    const username = signupUsername.value.trim();
    const password = signupPassword.value;
    const confirmedPassword = signupPasswordConfirm.value;

    if (!username || !password || !confirmedPassword) {
        setFormMessage(signupMessage, "Please enter your username and both password fields.", "error");
        return;
    }

    if (password !== confirmedPassword) {
        setFormMessage(signupMessage, "Passwords do not match. Please try again.", "error");
        return;
    }

    try {
        const payload = await requestJson(API_ENDPOINTS.signup, {
            method: "POST",
            body: { username, password }
        });

        clearFormMessage(signupMessage);
        signupForm.reset();
        applyBootstrap(payload);
        showGeneratorPage();
        setStatus("Account created and signed in successfully.", "success");
    } catch (error) {
        showRequestError(signupMessage, error, "We could not create your account right now.");
    }
}

async function logoutUser() {
    try {
        await requestJson(API_ENDPOINTS.logout, { method: "POST" });
    } catch (error) {
        if (error.status !== 401) {
            setStatus(error.message, "error");
            return;
        }
    }

    applyBootstrap(guestBootstrap());
    updateUserInterface();
    showGeneratorPage();
    setStatus("You are browsing as a guest now. Log in to save history.", "neutral");
}

function resetGenerator() {
    activeQrGeneration += 1;
    qrForm.reset();
    qrBox.innerHTML = '<p class="empty-state">Your QR preview will appear here after you generate one.</p>';
    downloadBtn.hidden = true;
    openLink.hidden = true;
    setStatus("Enter a website link to generate your QR code.", "neutral");
}

function generateQRCode() {
    const correctedUrl = normalizeUrl(qrText.value);

    if (!correctedUrl) {
        downloadBtn.hidden = true;
        openLink.hidden = true;
        showQrErrorDialog("You entered a wrong URL.<br>Kindly check the URL and enter the URL again.");
        setStatus("You entered a wrong URL. Kindly check the URL and enter the URL again.", "error");
        return;
    }

    const generationId = ++activeQrGeneration;
    const buildStartedAt = performance.now();

    highlightGuideStep(generatorStepsPanel, 2);
    setStatus("Building your QR blocks and branding the card...", "neutral");

    qrText.value = correctedUrl;
    qrBox.innerHTML = "";
    qrStage.innerHTML = "";

    new QRCode(qrStage, {
        text: correctedUrl,
        width: 220,
        height: 220,
        colorDark: "#111827",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
    });

    openLink.href = correctedUrl;
    openLink.hidden = true;
    showQrBuildAnimation(correctedUrl);

    window.setTimeout(async () => {
        const brandedCanvas = await buildBrandedCanvas(correctedUrl);

        if (generationId !== activeQrGeneration) {
            return;
        }

        if (!brandedCanvas) {
            qrBox.innerHTML = '<p class="empty-state">We could not render the branded QR card. Please try again.</p>';
            downloadBtn.hidden = true;
            setStatus("We could not render the branded QR card. Please try again.", "error");
            return;
        }

        await ensureMinimumQrBuildTime(buildStartedAt);

        if (generationId !== activeQrGeneration) {
            return;
        }

        qrBox.innerHTML = "";
        brandedCanvas.classList.add("qr-art--ready");
        qrBox.appendChild(brandedCanvas);
        setDownloadLink(correctedUrl, brandedCanvas);
        openLink.hidden = false;
        highlightGuideStep(generatorStepsPanel, 2);

        if (!currentUser) {
            setStatus("QR card ready. Download it now, or log in to save it in your history.", "success");
            return;
        }

        try {
            await addHistoryEntry(correctedUrl);
            setStatus("QR card ready. Download it or reuse it from your history.", "success");
        } catch (error) {
            setStatus(`QR card ready, but saving history failed: ${error.message}`, "warning");
        }
    }, 150);
}

function showQrBuildAnimation(url) {
    const buildCard = document.createElement("div");
    buildCard.className = "qr-build-card";

    const buildPanel = document.createElement("div");
    buildPanel.className = "qr-build-panel";

    const buildGrid = document.createElement("div");
    buildGrid.className = "qr-build-grid";
    buildGrid.setAttribute("aria-hidden", "true");
    buildGrid.style.setProperty("--qr-grid-size", String(QR_BUILD_GRID_SIZE));

    const seed = hashQrBuildSeed(url);

    for (let row = 0; row < QR_BUILD_GRID_SIZE; row += 1) {
        for (let column = 0; column < QR_BUILD_GRID_SIZE; column += 1) {
            const cell = document.createElement("span");
            const darkCell = isQrBuildDarkCell(row, column, QR_BUILD_GRID_SIZE, seed);

            cell.className = darkCell ? "qr-build-cell is-dark" : "qr-build-cell";
            cell.style.setProperty("--cell-delay", `${getQrBuildDelay(row, column, QR_BUILD_GRID_SIZE, seed)}ms`);
            buildGrid.appendChild(cell);
        }
    }

    buildPanel.appendChild(buildGrid);
    buildCard.appendChild(buildPanel);

    const copy = document.createElement("div");
    copy.className = "qr-build-copy";

    const title = document.createElement("p");
    title.className = "qr-build-title";
    title.textContent = "Generating QR";

    const subtitle = document.createElement("p");
    subtitle.className = "qr-build-subtitle";
    subtitle.textContent = "Assembling blocks to prepare your branded QR code.";

    copy.append(title, subtitle);
    buildCard.appendChild(copy);

    qrBox.innerHTML = "";
    qrBox.appendChild(buildCard);
}

function hashQrBuildSeed(value) {
    let hash = 2166136261;

    for (let index = 0; index < value.length; index += 1) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }

    return hash >>> 0;
}

function qrBuildNoise(seed, row, column) {
    let value = seed ^ Math.imul(row + 1, 374761393) ^ Math.imul(column + 1, 668265263);

    value = Math.imul(value ^ (value >>> 13), 1274126177);
    value ^= value >>> 16;

    return (value >>> 0) / 4294967295;
}

function getFinderCellValue(row, column, startRow, startColumn) {
    if (
        row < startRow ||
        row >= startRow + 7 ||
        column < startColumn ||
        column >= startColumn + 7
    ) {
        return null;
    }

    const localRow = row - startRow;
    const localColumn = column - startColumn;
    const onEdge = localRow === 0 || localRow === 6 || localColumn === 0 || localColumn === 6;
    const inCenter = localRow >= 2 && localRow <= 4 && localColumn >= 2 && localColumn <= 4;

    return onEdge || inCenter;
}

function getAlignmentCellValue(row, column, centerRow, centerColumn) {
    if (Math.abs(row - centerRow) > 2 || Math.abs(column - centerColumn) > 2) {
        return null;
    }

    const distance = Math.max(Math.abs(row - centerRow), Math.abs(column - centerColumn));
    return distance === 2 || distance === 0;
}

function isQrBuildDarkCell(row, column, size, seed) {
    if (row === 0 || column === 0 || row === size - 1 || column === size - 1) {
        return false;
    }

    const finderStarts = [
        [1, 1],
        [1, size - 8],
        [size - 8, 1]
    ];

    for (const [startRow, startColumn] of finderStarts) {
        const finderValue = getFinderCellValue(row, column, startRow, startColumn);

        if (finderValue !== null) {
            return finderValue;
        }
    }

    const alignmentValue = getAlignmentCellValue(row, column, size - 6, size - 6);

    if (alignmentValue !== null) {
        return alignmentValue;
    }

    if (row === 8 && column > 7 && column < size - 8) {
        return column % 2 === 0;
    }

    if (column === 8 && row > 7 && row < size - 8) {
        return row % 2 === 0;
    }

    if (row < 2 || column < 2 || row > size - 3 || column > size - 3) {
        return false;
    }

    return qrBuildNoise(seed, row, column) > 0.62;
}

function getQrBuildDelay(row, column, size, seed) {
    if (prefersReducedMotion) {
        return 0;
    }

    const center = (size - 1) / 2;
    const waveDistance = Math.abs(row - center) + Math.abs(column - center);
    const variation = Math.round(qrBuildNoise(seed ^ 0x9e3779b9, row, column) * 140);

    return Math.round(waveDistance * 15 + variation);
}

async function ensureMinimumQrBuildTime(startedAt) {
    const remaining = Math.max(0, MIN_QR_BUILD_MS - (performance.now() - startedAt));

    if (remaining > 0) {
        await delay(remaining);
    }
}

function setDownloadLink(url, canvas) {
    if (!downloadBtn || !canvas) {
        return;
    }

    const pngDataUrl = canvas.toDataURL("image/png");
    downloadBtn.href = pngDataUrl;
    downloadBtn.download = buildFileName(url);
    downloadBtn.hidden = false;
}

function showQrErrorDialog(message) {
    qrBox.innerHTML = `<h3 class="qr-error-preview">${message}</h3>`;
    downloadBtn.hidden = true;
    openLink.hidden = true;
}

async function buildBrandedCanvas(url) {
    const sourceCanvas = qrStage.querySelector("canvas");
    const sourceImage = qrStage.querySelector("img");
    const source = sourceCanvas || sourceImage;

    if (!source) {
        return null;
    }

    const displayWidth = 320;
    const displayHeight = 382;
    const exportScale = 2;
    const cardRadius = 34;
    const qrSize = 220;
    const qrX = Math.round((displayWidth - qrSize) / 2);
    const qrY = 40;
    const panelInset = 14;
    const labelY = qrY + qrSize + 58;
    const footerY = labelY + 28;

    const outputCanvas = document.createElement("canvas");
    outputCanvas.width = displayWidth * exportScale;
    outputCanvas.height = displayHeight * exportScale;
    outputCanvas.className = "qr-art";
    outputCanvas.style.width = `${displayWidth}px`;
    outputCanvas.style.height = `${displayHeight}px`;

    const ctx = outputCanvas.getContext("2d");

    if (!ctx) {
        return null;
    }

    ctx.scale(exportScale, exportScale);
    ctx.imageSmoothingEnabled = false;

    ctx.save();
    drawRoundedRectPath(ctx, 0, 0, displayWidth, displayHeight, cardRadius);
    ctx.clip();

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, displayWidth, displayHeight);

    ctx.fillStyle = "#f3f6fb";
    drawRoundedRectPath(
        ctx,
        qrX - panelInset,
        qrY - panelInset,
        qrSize + panelInset * 2,
        qrSize + panelInset * 2,
        28
    );
    ctx.fill();

    ctx.drawImage(source, qrX, qrY, qrSize, qrSize);
    await drawQrCenterLogo(ctx, url, qrX, qrY, qrSize);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#0f172a";
    ctx.font = '700 24px "Sora", "Segoe UI", sans-serif';
    ctx.fillText("Make My QR", displayWidth / 2, labelY);

    ctx.fillStyle = "#64748b";
    ctx.font = '500 12px "Sora", "Segoe UI", sans-serif';
    ctx.fillText("Scan to open the saved link", displayWidth / 2, footerY);
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = "rgba(15, 23, 42, 0.08)";
    ctx.lineWidth = 2;
    drawRoundedRectPath(ctx, 1, 1, displayWidth - 2, displayHeight - 2, cardRadius - 1);
    ctx.stroke();
    ctx.restore();

    return outputCanvas;
}

async function drawQrCenterLogo(context, url, qrX, qrY, qrSize) {
    const badgeSize = 56;
    const badgeX = qrX + (qrSize - badgeSize) / 2;
    const badgeY = qrY + (qrSize - badgeSize) / 2;
    const innerSize = 38;
    const innerX = badgeX + (badgeSize - innerSize) / 2;
    const innerY = badgeY + (badgeSize - innerSize) / 2;

    context.save();
    context.fillStyle = "rgba(15, 23, 42, 0.16)";
    drawRoundedRectPath(context, badgeX, badgeY + 3, badgeSize, badgeSize, 18);
    context.fill();
    context.restore();

    context.save();
    context.fillStyle = "#ffffff";
    drawRoundedRectPath(context, badgeX, badgeY, badgeSize, badgeSize, 18);
    context.fill();
    context.lineWidth = 1.5;
    context.strokeStyle = "rgba(148, 163, 184, 0.28)";
    context.stroke();
    context.restore();

    const siteLogo = await loadSiteLogoBadge(url);

    if (siteLogo) {
        try {
            drawImageBadge(context, siteLogo.image, innerX, innerY, innerSize);
            return;
        } finally {
            siteLogo.cleanup();
        }
    }

    const brand = getBrandDefinition(url);

    if (brand.kind === "youtube") {
        drawYoutubeBadge(context, innerX, innerY, innerSize);
        return;
    }

    if (brand.kind === "instagram") {
        drawInstagramBadge(context, innerX, innerY, innerSize);
        return;
    }

    drawTextBadge(context, brand, innerX, innerY, innerSize);
}

async function loadSiteLogoBadge(url) {
    if (window.location.protocol === "file:") {
        return null;
    }

    try {
        const response = await fetch(buildSiteLogoUrl(url), {
            credentials: "same-origin"
        });

        if (!response.ok) {
            return null;
        }

        const logoBlob = await response.blob();

        if (!logoBlob.size) {
            return null;
        }

        const objectUrl = URL.createObjectURL(logoBlob);

        try {
            const image = await loadImageElement(objectUrl);

            return {
                image,
                cleanup: () => URL.revokeObjectURL(objectUrl)
            };
        } catch (error) {
            URL.revokeObjectURL(objectUrl);
            return null;
        }
    } catch (error) {
        return null;
    }
}

function buildSiteLogoUrl(url) {
    return `/site-logo?url=${encodeURIComponent(url)}`;
}

function loadImageElement(source) {
    return new Promise((resolve, reject) => {
        const image = new Image();

        image.decoding = "async";
        image.addEventListener("load", () => resolve(image), { once: true });
        image.addEventListener("error", () => reject(new Error("Image failed to load.")), { once: true });
        image.src = source;
    });
}

function drawImageBadge(context, image, x, y, size) {
    const sourceWidth = image.naturalWidth || image.width;
    const sourceHeight = image.naturalHeight || image.height;

    if (!sourceWidth || !sourceHeight) {
        return;
    }

    const maxSize = size - 4;
    const scale = Math.min(maxSize / sourceWidth, maxSize / sourceHeight);
    const drawWidth = Math.max(18, sourceWidth * scale);
    const drawHeight = Math.max(18, sourceHeight * scale);
    const drawX = x + (size - drawWidth) / 2;
    const drawY = y + (size - drawHeight) / 2;

    context.save();
    drawRoundedRectPath(context, x, y, size, size, 12);
    context.clip();
    context.drawImage(image, drawX, drawY, drawWidth, drawHeight);
    context.restore();
}

function drawYoutubeBadge(context, x, y, size) {
    context.save();
    context.fillStyle = "#ff0033";
    drawRoundedRectPath(context, x, y + 4, size, size - 8, 12);
    context.fill();

    context.beginPath();
    context.moveTo(x + size * 0.41, y + size * 0.31);
    context.lineTo(x + size * 0.41, y + size * 0.69);
    context.lineTo(x + size * 0.72, y + size * 0.5);
    context.closePath();
    context.fillStyle = "#ffffff";
    context.fill();
    context.restore();
}

function drawInstagramBadge(context, x, y, size) {
    const gradient = context.createLinearGradient(x, y, x + size, y + size);
    gradient.addColorStop(0, "#f58529");
    gradient.addColorStop(0.5, "#dd2a7b");
    gradient.addColorStop(1, "#515bd4");

    context.save();
    context.fillStyle = gradient;
    drawRoundedRectPath(context, x, y, size, size, 12);
    context.fill();

    context.lineWidth = 2.6;
    context.strokeStyle = "#ffffff";
    drawRoundedRectPath(context, x + 8, y + 8, size - 16, size - 16, 10);
    context.stroke();

    context.beginPath();
    context.arc(x + size / 2, y + size / 2, size * 0.16, 0, Math.PI * 2);
    context.stroke();

    context.beginPath();
    context.arc(x + size * 0.73, y + size * 0.27, size * 0.05, 0, Math.PI * 2);
    context.fillStyle = "#ffffff";
    context.fill();
    context.restore();
}

function drawTextBadge(context, brand, x, y, size) {
    context.save();
    context.fillStyle = brand.background;
    drawRoundedRectPath(context, x, y, size, size, 12);
    context.fill();

    context.fillStyle = brand.foreground;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.font = brand.label.length > 1
        ? '800 15px "Sora", "Segoe UI", sans-serif'
        : '800 20px "Sora", "Segoe UI", sans-serif';
    context.fillText(brand.label, x + size / 2, y + size / 2 + 1);
    context.restore();
}

function getBrandDefinition(url) {
    const fallbackBrand = {
        kind: "generic",
        label: "QR",
        background: "#0f172a",
        foreground: "#ffffff"
    };

    try {
        const parsedUrl = new URL(url);
        const hostname = parsedUrl.hostname.replace(/^www\./, "").toLowerCase();

        if (hostname === "youtu.be" || hostname.endsWith("youtube.com")) {
            return { kind: "youtube" };
        }

        if (hostname.endsWith("instagram.com")) {
            return { kind: "instagram" };
        }

        if (hostname.endsWith("facebook.com") || hostname === "fb.com") {
            return { kind: "generic", label: "f", background: "#1877f2", foreground: "#ffffff" };
        }

        if (hostname.endsWith("linkedin.com")) {
            return { kind: "generic", label: "in", background: "#0a66c2", foreground: "#ffffff" };
        }

        if (hostname.endsWith("github.com")) {
            return { kind: "generic", label: "GH", background: "#111827", foreground: "#ffffff" };
        }

        if (hostname.endsWith("x.com") || hostname.endsWith("twitter.com")) {
            return { kind: "generic", label: "X", background: "#111827", foreground: "#ffffff" };
        }

        if (hostname.endsWith("whatsapp.com") || hostname === "wa.me") {
            return { kind: "generic", label: "WA", background: "#22c55e", foreground: "#ffffff" };
        }

        if (hostname.endsWith("spotify.com")) {
            return { kind: "generic", label: "S", background: "#1ed760", foreground: "#06230f" };
        }

        const hostLabel = hostname.split(".")[0].replace(/[^a-z0-9]/gi, "").slice(0, 2).toUpperCase();

        return {
            ...fallbackBrand,
            label: hostLabel || "QR"
        };
    } catch (error) {
        return fallbackBrand;
    }
}

function drawRoundedRectPath(context, x, y, width, height, radius) {
    const safeRadius = Math.min(radius, width / 2, height / 2);

    context.beginPath();
    context.moveTo(x + safeRadius, y);
    context.arcTo(x + width, y, x + width, y + height, safeRadius);
    context.arcTo(x + width, y + height, x, y + height, safeRadius);
    context.arcTo(x, y + height, x, y, safeRadius);
    context.arcTo(x, y, x + width, y, safeRadius);
    context.closePath();
}

function buildFileName(url) {
    try {
        const host = new URL(url).hostname.replace(/^www\./, "").replace(/[^\w-]+/g, "-");
        return `${host || "qr-code"}.png`;
    } catch (error) {
        return "qr-code.png";
    }
}

function normalizeUrl(value) {
    const trimmedValue = value.trim();

    if (!trimmedValue) {
        return "";
    }

    if (/\s/.test(trimmedValue)) {
        return "";
    }

    const hasScheme = /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(trimmedValue);
    const candidate = hasScheme ? trimmedValue : `https://${trimmedValue}`;

    try {
        const url = new URL(candidate);
        const hostname = url.hostname;

        if (!["http:", "https:"].includes(url.protocol)) {
            return "";
        }

        if (!hostname) {
            return "";
        }

        const isLocalHost = hostname === "localhost";
        const isIpV4 = /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname);
        const isIpV6 = /^\[[0-9a-fA-F:.]+\]$/.test(hostname);

        if (!hasScheme && !isLocalHost && !isIpV4 && !isIpV6 && !hostname.includes(".")) {
            return "";
        }

        return url.href;
    } catch (error) {
        return "";
    }
}

async function addHistoryEntry(url) {
    if (!currentUser) {
        return;
    }

    const payload = await requestJson(API_ENDPOINTS.history, {
        method: "POST",
        body: { url }
    });

    currentHistory = normalizeHistory(payload.history);
    renderHistory();
}

async function deleteHistoryEntry(entryId) {
    if (!currentUser || !entryId) {
        return;
    }

    try {
        const payload = await requestJson(`${API_ENDPOINTS.history}/${encodeURIComponent(entryId)}`, {
            method: "DELETE"
        });

        currentHistory = normalizeHistory(payload.history);
        renderHistory();
        setStatus("History item deleted.", "success");
    } catch (error) {
        setStatus(error.message, error.status === 401 ? "warning" : "error");
    }
}

async function clearAllHistory() {
    if (!currentUser) {
        return;
    }

    try {
        const payload = await requestJson(API_ENDPOINTS.history, {
            method: "DELETE"
        });

        currentHistory = normalizeHistory(payload.history);
        renderHistory();
        setStatus("All saved history cleared.", "success");
    } catch (error) {
        setStatus(error.message, error.status === 401 ? "warning" : "error");
    }
}

function toggleAccountMenu(event) {
    event.stopPropagation();
    const willOpen = accountMenu.hidden;

    accountMenu.hidden = !willOpen;
    moreOptionsBtn.setAttribute("aria-expanded", String(willOpen));
}

function closeAccountMenu() {
    accountMenu.hidden = true;
    moreOptionsBtn.setAttribute("aria-expanded", "false");
}

function openModal(modal) {
    closeAccountMenu();
    clearFormMessage(accountDetailsMessage);
    clearFormMessage(resetPasswordMessage);
    clearFormMessage(deleteAccountMessage);

    if (modal === accountDetailsModal) {
        populateAccountDetailsForm();
    } else {
        accountDetailsForm.reset();
        profilePictureInput.value = "";
        selectedProfilePictureFile = null;
        removeProfilePictureRequested = false;
    }

    if (modal !== resetPasswordModal) {
        resetPasswordForm.reset();
    }

    if (modal !== deleteAccountModal) {
        deleteAccountForm.reset();
    }

    modalBackdrop.hidden = false;
    modals.forEach((entry) => {
        entry.hidden = entry !== modal;
    });
}

function closeModal() {
    modalBackdrop.hidden = true;
    modals.forEach((entry) => {
        entry.hidden = true;
    });
    clearFormMessage(accountDetailsMessage);
    clearFormMessage(resetPasswordMessage);
    clearFormMessage(deleteAccountMessage);
    resetPasswordForm.reset();
    deleteAccountForm.reset();
    profilePictureInput.value = "";
    selectedProfilePictureFile = null;
    removeProfilePictureRequested = false;
    setPictureDragState(false);
    updateProfilePictureMeta();
}

function openAccountDetails() {
    if (!currentUser) {
        openAuthPage("login");
        return;
    }

    openModal(accountDetailsModal);
}

function populateAccountDetailsForm() {
    const userRecord = getCurrentUserRecord();
    const displayName = getDisplayName(currentUser, userRecord);

    accountDetailsForm.reset();
    accountNameInput.value = (userRecord && userRecord.name) || "";
    pendingProfilePicture = (userRecord && userRecord.profilePicture) || "";
    selectedProfilePictureFile = null;
    removeProfilePictureRequested = false;
    accountPreviewHandle.textContent = currentUser ? `@${currentUser}` : "@guest";
    accountPreviewName.textContent = displayName;
    syncAvatar(accountPreviewImage, accountPreviewFallback, displayName, pendingProfilePicture);
    setPictureDragState(false);
    updateProfilePictureMeta();
}

function handleProfilePictureSelection() {
    const file = profilePictureInput.files && profilePictureInput.files[0];

    if (!file) {
        selectedProfilePictureFile = null;
        updateAccountDetailsPreview();
        updateProfilePictureMeta();
        return;
    }

    loadProfilePictureFile(file);
}

function clearSelectedProfilePicture() {
    selectedProfilePictureFile = null;
    removeProfilePictureRequested = true;
    pendingProfilePicture = "";
    profilePictureInput.value = "";
    setPictureDragState(false);
    clearFormMessage(accountDetailsMessage);
    updateAccountDetailsPreview();
    updateProfilePictureMeta();
}

function updateAccountDetailsPreview() {
    const userRecord = getCurrentUserRecord();
    const typedName = accountNameInput.value.trim();
    const displayName = typedName || getDisplayName(currentUser, userRecord);
    const previewPicture = removeProfilePictureRequested
        ? ""
        : pendingProfilePicture || (userRecord && userRecord.profilePicture) || "";

    accountPreviewName.textContent = displayName || "Guest";
    accountPreviewHandle.textContent = currentUser ? `@${currentUser}` : "@guest";
    syncAvatar(
        accountPreviewImage,
        accountPreviewFallback,
        displayName || currentUser || "Guest",
        previewPicture
    );
}

async function handleAccountDetailsSave() {
    if (!currentUser) {
        setFormMessage(accountDetailsMessage, "Please log in before saving account details.", "error");
        return;
    }

    saveAccountDetailsBtn.disabled = true;
    saveAccountDetailsBtn.textContent = "Saving...";

    try {
        const profilePicture = removeProfilePictureRequested
            ? ""
            : selectedProfilePictureFile
                ? await readFileAsDataUrl(selectedProfilePictureFile)
                : pendingProfilePicture || (currentUserRecord && currentUserRecord.profilePicture) || "";

        const payload = await requestJson(API_ENDPOINTS.account, {
            method: "PATCH",
            body: {
                name: accountNameInput.value.trim(),
                profilePicture
            }
        });

        currentUserRecord = normalizeAccountUser({
            username: currentUser,
            ...payload.user
        });
        pendingProfilePicture = currentUserRecord.profilePicture;
        selectedProfilePictureFile = null;
        removeProfilePictureRequested = false;
        updateUserInterface();
        updateAccountDetailsPreview();
        updateProfilePictureMeta();
        setFormMessage(accountDetailsMessage, "Account details saved successfully.", "success");

        window.setTimeout(() => {
            closeModal();
            setStatus("Account details updated successfully.", "success");
        }, 350);
    } catch (error) {
        showRequestError(accountDetailsMessage, error, "We could not save your account details.");
    } finally {
        saveAccountDetailsBtn.disabled = false;
        saveAccountDetailsBtn.textContent = "Save Details";
    }
}

function togglePasswordVisibility(button) {
    const targetId = button.dataset.togglePassword;
    const targetInput = targetId ? document.getElementById(targetId) : null;

    if (!targetInput) {
        return;
    }

    const shouldShow = targetInput.type === "password";
    targetInput.type = shouldShow ? "text" : "password";
    button.setAttribute("aria-label", shouldShow ? "Hide password" : "Show password");
}

async function handleResetPassword() {
    if (!currentUser) {
        return;
    }

    const previousPassword = oldPassword.value;
    const updatedPassword = newPassword.value;
    const confirmedUpdatedPassword = confirmNewPassword.value;

    if (!previousPassword || !updatedPassword || !confirmedUpdatedPassword) {
        setFormMessage(resetPasswordMessage, "Please complete all password fields.", "error");
        return;
    }

    if (updatedPassword !== confirmedUpdatedPassword) {
        setFormMessage(resetPasswordMessage, "New passwords do not match.", "error");
        return;
    }

    try {
        await requestJson(API_ENDPOINTS.password, {
            method: "POST",
            body: {
                oldPassword: previousPassword,
                newPassword: updatedPassword
            }
        });

        closeModal();
        setStatus("Password updated successfully.", "success");
    } catch (error) {
        showRequestError(resetPasswordMessage, error, "We could not update your password.");
    }
}

async function handleDeleteAccount() {
    if (!currentUser) {
        return;
    }

    const password = deletePassword.value;

    if (!password) {
        setFormMessage(deleteAccountMessage, "Please enter your password to continue.", "error");
        return;
    }

    try {
        await requestJson(API_ENDPOINTS.account, {
            method: "DELETE",
            body: { password }
        });

        applyBootstrap(guestBootstrap());
        closeModal();
        updateUserInterface();
        showGeneratorPage();
        setStatus("Account deleted. You can still make QR codes as a guest.", "success");
    } catch (error) {
        showRequestError(deleteAccountMessage, error, "We could not delete your account.");
    }
}

function renderHistory() {
    historyList.innerHTML = "";
    historyList.classList.toggle("history-list--guest", !currentUser);
    historyList.classList.remove("history-list--empty");

    if (!currentUser) {
        historyCount.textContent = "Guest mode";
        clearHistoryBtn.hidden = true;
        historyList.classList.add("history-list--empty");

        if (window.location.protocol === "file:") {
            historyList.innerHTML = `
                <div class="guest-history-card">
                    <p class="guest-history-copy">Open the full app to save account details and history.</p>
                </div>
            `;
            return;
        }

        historyList.innerHTML = `
            <div class="guest-history-card">
                <p class="guest-history-copy">
                    History starts after you
                    <a href="#login" class="history-login-link" data-action="open-auth">log in</a>.
                </p>
            </div>
        `;
        return;
    }

    historyCount.textContent = `${currentHistory.length} ${currentHistory.length === 1 ? "item" : "items"}`;
    clearHistoryBtn.hidden = currentHistory.length === 0;

    if (!currentHistory.length) {
        historyList.classList.add("history-list--empty");
        historyList.innerHTML = '<p class="empty-state">No QR codes saved yet.</p>';
        return;
    }

    currentHistory
        .slice()
        .reverse()
        .forEach((entry) => {
            const item = document.createElement("article");
            item.className = "history-item";

            const meta = document.createElement("div");
            meta.className = "history-item__meta";

            const urlText = document.createElement("p");
            urlText.className = "history-url";
            urlText.textContent = entry.url;

            const timeText = document.createElement("p");
            timeText.className = "history-time";
            timeText.textContent = formatTimestamp(entry.createdAt);

            meta.append(urlText, timeText);

            const actions = document.createElement("div");
            actions.className = "history-item__actions";

            const reuseButton = document.createElement("button");
            reuseButton.type = "button";
            reuseButton.className = "mini-btn";
            reuseButton.dataset.action = "reuse";
            reuseButton.dataset.url = entry.url;
            reuseButton.textContent = "Use again";

            const openAnchor = document.createElement("a");
            openAnchor.className = "mini-link";
            openAnchor.href = entry.url;
            openAnchor.target = "_blank";
            openAnchor.rel = "noreferrer";
            openAnchor.textContent = "Open";

            const deleteButton = document.createElement("button");
            deleteButton.type = "button";
            deleteButton.className = "mini-btn mini-btn--danger";
            deleteButton.dataset.action = "delete";
            deleteButton.dataset.id = entry.id;
            deleteButton.textContent = "Delete";

            actions.append(reuseButton, openAnchor, deleteButton);
            item.append(meta, actions);
            historyList.append(item);
        });
}

function updateUserInterface() {
    const userRecord = getCurrentUserRecord();
    const isLoggedIn = Boolean(currentUser && userRecord);
    const displayName = isLoggedIn ? getDisplayName(currentUser, userRecord) : "Hello";
    const welcomeLabel = isLoggedIn ? "Hello " + getFirstName(displayName) : "Hello Guest";

    welcomeName.textContent = welcomeLabel;
    guestLoginBtn.hidden = isLoggedIn;
    profileCard.hidden = !isLoggedIn;
    moreOptionsBtn.hidden = !isLoggedIn;
    openAuthFromMenuBtn.hidden = true;
    openAccountDetailsBtn.hidden = !isLoggedIn;
    openResetPasswordBtn.hidden = !isLoggedIn;
    openDeleteAccountBtn.hidden = !isLoggedIn;
    logoutBtn.hidden = !isLoggedIn;

    if (!isLoggedIn) {
        profileDisplayName.textContent = "Guest";
        profileUsername.textContent = "@guest";
        syncAvatar(profileAvatarImage, profileAvatarFallback, "Guest", "");
        return;
    }

    profileDisplayName.textContent = getFirstName(displayName);
    profileUsername.textContent = `@${currentUser}`;
    syncAvatar(profileAvatarImage, profileAvatarFallback, displayName, userRecord.profilePicture);

    setStatus("Enter a website link to generate your QR code.", "neutral");
}

function getDisplayName(username, userRecord) {
    if (!username) {
        return "guest";
    }

    const name = (userRecord && userRecord.name && userRecord.name.trim()) || "";
    return name || username;
}

function getFirstName(value) {
    const trimmedValue = (value || "").trim();

    if (!trimmedValue) {
        return "";
    }

    return trimmedValue.split(/\s+/)[0];
}

function getCurrentUserRecord() {
    return currentUserRecord;
}

function syncAvatar(imageElement, fallbackElement, label, profilePicture) {
    fallbackElement.textContent = getInitials(label);

    if (profilePicture) {
        imageElement.src = profilePicture;
        imageElement.hidden = false;
        fallbackElement.hidden = true;
        return;
    }

    imageElement.removeAttribute("src");
    imageElement.hidden = true;
    fallbackElement.hidden = false;
}

function getInitials(value) {
    const cleanedValue = (value || "Guest").trim();
    const parts = cleanedValue.split(/\s+/).filter(Boolean).slice(0, 2);
    const joined = parts.map((part) => part[0].toUpperCase()).join("");

    return joined || cleanedValue.charAt(0).toUpperCase() || "G";
}

function updateProfilePictureMeta(label) {
    if (removeProfilePictureRequested) {
        profilePictureMeta.textContent = "Profile picture will be removed.";
        removeProfilePictureBtn.hidden = true;
        return;
    }

    if (label) {
        profilePictureMeta.textContent = label;
        removeProfilePictureBtn.hidden = false;
        return;
    }

    if (selectedProfilePictureFile) {
        profilePictureMeta.textContent = selectedProfilePictureFile.name;
        removeProfilePictureBtn.hidden = false;
        return;
    }

    if (pendingProfilePicture) {
        profilePictureMeta.textContent = "Current profile picture selected.";
        removeProfilePictureBtn.hidden = false;
        return;
    }

    profilePictureMeta.textContent = "No picture selected";
    removeProfilePictureBtn.hidden = true;
}

function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.addEventListener("load", () => {
            if (typeof reader.result === "string") {
                resolve(reader.result);
                return;
            }

            reject(new Error("Could not read image data."));
        });

        reader.addEventListener("error", () => {
            reject(new Error("Could not read image data."));
        });

        reader.readAsDataURL(file);
    });
}

function formatTimestamp(value) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "Recently";
    }

    return new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short"
    }).format(date);
}

function setFormMessage(element, message, state) {
    element.textContent = message;
    element.dataset.state = state;
    element.hidden = false;
}

function clearFormMessage(element) {
    element.textContent = "";
    element.dataset.state = "";
    element.hidden = true;
}

function setStatus(message, state) {
    let fullMessage = message;

    if (state !== "error" && message === "Enter a website link to generate your QR code." && currentUser) {
        const firstName = welcomeName.textContent.split(" ").slice(1).join(" ");

        if (firstName) {
            fullMessage = `Welcome back ${firstName}. ${message}`;
        }
    }

    statusMessage.textContent = fullMessage;
    statusMessage.dataset.state = state;
}

function showRequestError(element, error, fallbackMessage) {
    const state = error.status === 429 || error.status === 401 ? "warning" : "error";
    setFormMessage(element, error.message || fallbackMessage, state);

    if (error.status === 401 && currentUser) {
        setStatus("Your session expired. Please log in again.", "warning");
        showAuthMode("login");
    }
}

function handlePictureDragEnter(event) {
    event.preventDefault();
    setPictureDragState(true);
}

function handlePictureDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    setPictureDragState(true);
}

function handlePictureDragLeave(event) {
    if (!picturePicker || picturePicker.contains(event.relatedTarget)) {
        return;
    }

    setPictureDragState(false);
}

function handlePictureDrop(event) {
    event.preventDefault();
    setPictureDragState(false);

    const file = (event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0]) || null;

    if (!file) {
        return;
    }

    loadProfilePictureFile(file);
}

function setPictureDragState(isDragging) {
    if (picturePicker) {
        picturePicker.classList.toggle("is-drag-over", isDragging);
    }
}

function loadProfilePictureFile(file) {
    if (!file.type.startsWith("image/")) {
        profilePictureInput.value = "";
        selectedProfilePictureFile = null;
        setFormMessage(accountDetailsMessage, "Please choose an image file for your profile picture.", "error");
        updateProfilePictureMeta();
        return;
    }

    if (file.size > MAX_PROFILE_PICTURE_BYTES) {
        profilePictureInput.value = "";
        selectedProfilePictureFile = null;
        setFormMessage(accountDetailsMessage, "Please choose an image under 1 MB for your profile picture.", "error");
        updateProfilePictureMeta();
        return;
    }

    selectedProfilePictureFile = file;
    removeProfilePictureRequested = false;
    updateProfilePictureMeta(file.name);

    const reader = new FileReader();

    reader.addEventListener("load", () => {
        pendingProfilePicture = typeof reader.result === "string" ? reader.result : "";
        clearFormMessage(accountDetailsMessage);
        updateAccountDetailsPreview();
    });

    reader.addEventListener("error", () => {
        setFormMessage(accountDetailsMessage, "We could not load that image. Please try another one.", "error");
    });

    reader.readAsDataURL(file);
}

async function requestJson(url, options = {}) {
    const { method = "GET", body } = options;
    const headers = {
        Accept: "application/json"
    };

    if (body !== undefined) {
        headers["Content-Type"] = "application/json";
    }

    let response;

    try {
        response = await fetch(url, {
            method,
            headers,
            credentials: "same-origin",
            body: body !== undefined ? JSON.stringify(body) : undefined
        });
    } catch (error) {
        throw new Error("Could not connect right now. Please reload and try again.");
    }

    const rawText = await response.text();
    let payload = {};

    if (rawText) {
        try {
            payload = JSON.parse(rawText);
        } catch (error) {
            payload = { message: rawText };
        }
    }

    if (!response.ok) {
        const requestError = new Error(payload.message || `Request failed with status ${response.status}.`);
        requestError.status = response.status;

        if (response.status === 401 && url !== API_ENDPOINTS.login && url !== API_ENDPOINTS.signup) {
            applyBootstrap(guestBootstrap());
        }

        throw requestError;
    }

    return payload;
}
