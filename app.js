// Demo-only auth, profile details, and history are stored in browser storage so the app works without a backend.
const STORAGE_KEYS = {
    users: "makeMyQrUsers",
    activeUser: "makeMyQrActiveUser",
    history: "makeMyQrHistory"
};

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
const accountDetailsModal = document.getElementById("accountDetailsModal");
const resetPasswordModal = document.getElementById("resetPasswordModal");
const deleteAccountModal = document.getElementById("deleteAccountModal");
const accountDetailsForm = document.getElementById("accountDetailsForm");
const accountNameInput = document.getElementById("accountNameInput");
const profilePictureInput = document.getElementById("profilePictureInput");
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

const modals = [accountDetailsModal, resetPasswordModal, deleteAccountModal];

const qrStage = document.createElement("div");
qrStage.setAttribute("aria-hidden", "true");
qrStage.style.position = "fixed";
qrStage.style.left = "-99999px";
qrStage.style.top = "0";
qrStage.style.width = "0";
qrStage.style.height = "0";
qrStage.style.opacity = "0";
qrStage.style.pointerEvents = "none";
document.body.appendChild(qrStage);

let currentUser = null;
let pendingProfilePicture = "";
let selectedProfilePictureFile = null;
let removeProfilePictureRequested = false;

loginTabBtn.addEventListener("click", () => showAuthMode("login"));
signupTabBtn.addEventListener("click", () => showAuthMode("signup"));
showSignupBtn.addEventListener("click", () => showAuthMode("signup"));
showLoginBtn.addEventListener("click", () => showAuthMode("login"));
returnToGeneratorBtn.addEventListener("click", showGeneratorPage);
guestLoginBtn.addEventListener("click", () => openAuthPage("login"));
openAuthFromMenuBtn.addEventListener("click", () => openAuthPage("login"));
logoutBtn.addEventListener("click", logoutUser);
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
clearHistoryBtn.addEventListener("click", clearAllHistory);
accountNameInput.addEventListener("input", updateAccountDetailsPreview);
profilePictureInput.addEventListener("change", handleProfilePictureSelection);
chooseProfilePictureBtn.addEventListener("click", () => profilePictureInput.click());
removeProfilePictureBtn.addEventListener("click", clearSelectedProfilePicture);
saveAccountDetailsBtn.addEventListener("click", handleAccountDetailsSave);

passwordToggleButtons.forEach((button) => {
    button.addEventListener("click", () => togglePasswordVisibility(button));
});

loginForm.addEventListener("submit", (event) => {
    event.preventDefault();
    handleLogin();
});

signupForm.addEventListener("submit", (event) => {
    event.preventDefault();
    handleSignup();
});

qrForm.addEventListener("submit", (event) => {
    event.preventDefault();
    generateQRCode();
});

accountDetailsForm.addEventListener("submit", (event) => {
    event.preventDefault();
    handleAccountDetailsSave();
});

resetPasswordForm.addEventListener("submit", (event) => {
    event.preventDefault();
    handleResetPassword();
});

deleteAccountForm.addEventListener("submit", (event) => {
    event.preventDefault();
    handleDeleteAccount();
});

qrText.addEventListener("blur", () => {
    const correctedUrl = normalizeUrl(qrText.value);

    if (correctedUrl) {
        qrText.value = correctedUrl;
        return;
    }

    if (qrText.value.trim()) {
        showQrErrorDialog("You entered a wrong URL.<br>Kindly check the URL and enter the URL again.");
        setStatus("You entered a wrong URL. Kindly check the URL and enter the URL again.", "error");
    }
});

qrText.addEventListener("input", () => {
    downloadBtn.hidden = true;
    openLink.hidden = true;
    setStatus("Enter a website link to generate your QR code.", "neutral");

    if (!qrBox.querySelector(".empty-state")) {
        qrBox.innerHTML = '<p class="empty-state">Your QR preview will appear here after you generate one.</p>';
    }
});

loginUsername.addEventListener("focus", () => highlightGuideStep(loginStepsPanel, 1));
loginPassword.addEventListener("focus", () => highlightGuideStep(loginStepsPanel, 2));
signupUsername.addEventListener("focus", () => highlightGuideStep(signupStepsPanel, 1));
signupPassword.addEventListener("focus", () => highlightGuideStep(signupStepsPanel, 2));
signupPasswordConfirm.addEventListener("focus", () => highlightGuideStep(signupStepsPanel, 2));
qrText.addEventListener("focus", () => highlightGuideStep(generatorStepsPanel, 1));

[loginUsername, loginPassword, signupUsername, signupPassword, signupPasswordConfirm, qrText].forEach((field) => {
    field.addEventListener("blur", () => {
        window.setTimeout(() => {
            if (![loginUsername, loginPassword, signupUsername, signupPassword, signupPasswordConfirm, qrText].includes(document.activeElement)) {
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
        deleteHistoryEntry(deleteButton.dataset.id || "");
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

initializeApp();

function initializeApp() {
    const storedActiveUser = localStorage.getItem(STORAGE_KEYS.activeUser);
    const users = readUsers();

    resetGenerator();
    showAuthMode("login");

    if (storedActiveUser && users[storedActiveUser]) {
        currentUser = storedActiveUser;
    } else {
        localStorage.removeItem(STORAGE_KEYS.activeUser);
        currentUser = null;
    }

    updateUserInterface();
    showGeneratorPage();
    renderHistory();
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

function handleLogin() {
    const username = loginUsername.value.trim();
    const password = loginPassword.value;
    const users = readUsers();
    const userRecord = users[username];

    if (!username || !password) {
        setFormMessage(loginMessage, "Please enter your username and password.", "error");
        return;
    }

    if (!userRecord) {
        setFormMessage(loginMessage, "User not found. Please sign up first.", "error");
        return;
    }

    if (userRecord.password !== password) {
        setFormMessage(loginMessage, "You entered a wrong password. Please try again.", "error");
        return;
    }

    clearFormMessage(loginMessage);
    loginPassword.value = "";
    loginUser(username);
}

function handleSignup() {
    const username = signupUsername.value.trim();
    const password = signupPassword.value;
    const confirmedPassword = signupPasswordConfirm.value;
    const users = readUsers();

    if (!username || !password || !confirmedPassword) {
        setFormMessage(signupMessage, "Please enter your username and both password fields.", "error");
        return;
    }

    if (password !== confirmedPassword) {
        setFormMessage(signupMessage, "Passwords do not match. Please try again.", "error");
        return;
    }

    if (users[username]) {
        setFormMessage(signupMessage, "That username already exists. Choose another one.", "error");
        return;
    }

    users[username] = {
        password,
        name: "",
        profilePicture: ""
    };
    writeUsers(users);
    signupForm.reset();
    clearFormMessage(signupMessage);
    loginUser(username);
    setStatus("Account created and signed in successfully.", "success");
}

function loginUser(username) {
    currentUser = username;
    localStorage.setItem(STORAGE_KEYS.activeUser, username);
    loginForm.reset();
    signupForm.reset();
    updateUserInterface();
    showGeneratorPage();
}

function logoutUser() {
    currentUser = null;
    localStorage.removeItem(STORAGE_KEYS.activeUser);
    updateUserInterface();
    showGeneratorPage();
    setStatus("You are browsing as a guest now. Login-in to save history.", "neutral");
}

function resetGenerator() {
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

    highlightGuideStep(generatorStepsPanel, 2);
    setStatus("Checking site...", "neutral");

    checkSiteReachable(correctedUrl).then(isReachable => {
        if (!isReachable) {
            downloadBtn.hidden = true;
            openLink.hidden = true;
            showQrErrorDialog("You entered a wrong URL.<br>Kindly check the URL and enter the URL again.");
            setStatus("You entered a wrong URL. Kindly check the URL and enter the URL again.", "error");
            return;
        }

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
        openLink.hidden = false;
        setStatus("Creating your branded QR card...", "neutral");

        window.setTimeout(async () => {
            const brandedCanvas = await buildBrandedCanvas(correctedUrl);

            if (!brandedCanvas) {
                qrBox.innerHTML = '<p class="empty-state">We could not render the branded QR card. Please try again.</p>';
                downloadBtn.hidden = true;
                setStatus("We could not render the branded QR card. Please try again.", "error");
                return;
            }

            qrBox.innerHTML = "";
            qrBox.appendChild(brandedCanvas);
            setDownloadLink(correctedUrl, brandedCanvas);
            highlightGuideStep(generatorStepsPanel, 3);

            if (currentUser) {
                addHistoryEntry(correctedUrl);
                setStatus("QR card ready. Download it or reuse it from your saved history.", "success");
                return;
            }

            setStatus("QR card ready. Download it now, or Login-in to save it in history.", "success");
        }, 150);
    });
}

function checkSiteReachable(url) {
    return new Promise((resolve) => {
        const timeout = setTimeout(() => {
            resolve(false);
        }, 3000); // 3 second timeout

        fetch(url, {
            method: 'HEAD',
            mode: 'no-cors'
        })
        .then(() => {
            clearTimeout(timeout);
            resolve(true);
        })
        .catch(() => {
            clearTimeout(timeout);
            resolve(false);
        });
    });
}

function setDownloadLink(url, canvas) {
    if (!downloadBtn || !canvas) {
        return;
    }

    const pngDataUrl = canvas.toDataURL("image/png");
    downloadBtn.href = pngDataUrl;
    downloadBtn.download = "make-my-qr.png";
    downloadBtn.hidden = false;
}

function showQrErrorDialog(message) {
    qrBox.innerHTML = `<h3 class="qr-error-preview">${message}</h3>`;
    downloadBtn.hidden = true;
    openLink.hidden = true;
}

function resetQrBoxState() {
    qrBox.innerHTML = '<p class="empty-state">Your QR preview will appear here after you generate one.</p>';
    downloadBtn.hidden = true;
    openLink.hidden = true;
    setStatus("Enter a website link to generate your QR code.", "neutral");
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
            label: hostLabel || "QR",
            background: "#0f172a",
            foreground: "#ffffff"
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

    const compactValue = trimmedValue.replace(/\s+/g, "");
    const hasScheme = /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(compactValue);
    const candidate = hasScheme ? compactValue : `https://${compactValue}`;

    try {
        const url = new URL(candidate);
        const hostname = url.hostname;

        const isLocalhost = hostname === "localhost";
        const isIpV4 = /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname);
        const isIpV6 = /^\[[0-9a-fA-F:\.]+\]$/.test(hostname);

        if (!hostname) {
            return "";
        }

        if (isLocalhost || isIpV4 || isIpV6) {
            return url.href;
        }

        // Check for valid domain format with reasonable TLD
        const parts = hostname.split('.');
        if (parts.length < 2) {
            return "";
        }

        const tld = parts[parts.length - 1].toLowerCase();
        // List of common valid TLDs (reject obviously invalid ones)
        const validTlds = ['com', 'org', 'net', 'edu', 'gov', 'mil', 'info', 'biz', 'name', 'pro', 'coop', 'aero', 'museum', 'travel', 'jobs', 'mobi', 'cat', 'tel', 'asia', 'post', 'xxx', 'dev', 'io', 'co', 'uk', 'de', 'fr', 'it', 'es', 'jp', 'cn', 'in', 'au', 'ca', 'mx', 'br', 'ar', 'cl', 'pe', 'uy', 'py', 'bo', 'ec', 've', 'co', 'pa', 'cr', 'ni', 'hn', 'sv', 'gt', 'bz', 'ht', 'do', 'dm', 'lc', 'vc', 'gd', 'ag', 'kn', 'ms', 'tt', 'bb', 'jm', 'bs', 'cu', 'ht', 'pr', 'vi', 'ky', 'bm', 'tc', 'vg', 'ai', 'fk', 'gs', 'sh', 'pn', 'ac', 'io', 'sh', 'tm', 'st', 'sc', 'so', 'nr', 'tv', 'ws', 'vg', 'cc', 'cx', 'nf', 'hm', 'aq', 'gs', 'tf', 'pn', 'bv', 'sj', 'um', 'vi', 'mp', 'gu', 'as', 'pw', 'fm', 'mh', 'mp', 'um', 'us', 'ca', 'mx'];

        if (!validTlds.includes(tld)) {
            return "";
        }

        return url.href;
    } catch (error) {
        return "";
    }
}

function addHistoryEntry(url) {
    if (!currentUser) {
        return;
    }

    const histories = readHistory();
    const userHistory = histories[currentUser] || [];

    userHistory.push({
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        url,
        createdAt: new Date().toISOString()
    });

    histories[currentUser] = userHistory;
    writeHistory(histories);
    renderHistory();
}

function deleteHistoryEntry(entryId) {
    if (!currentUser || !entryId) {
        return;
    }

    const histories = readHistory();
    const userHistory = histories[currentUser] || [];
    histories[currentUser] = userHistory.filter((entry) => entry.id !== entryId);
    writeHistory(histories);
    renderHistory();
    setStatus("History item deleted.", "success");
}

function clearAllHistory() {
    if (!currentUser) {
        return;
    }

    const histories = readHistory();
    histories[currentUser] = [];
    writeHistory(histories);
    renderHistory();
    setStatus("All saved history cleared.", "success");
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
    accountNameInput.value = userRecord?.name || "";
    pendingProfilePicture = userRecord?.profilePicture || "";
    selectedProfilePictureFile = null;
    removeProfilePictureRequested = false;
    accountPreviewHandle.textContent = currentUser ? `@${currentUser}` : "@guest";
    accountPreviewName.textContent = displayName;
    syncAvatar(accountPreviewImage, accountPreviewFallback, displayName, pendingProfilePicture);
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

    if (!file.type.startsWith("image/")) {
        profilePictureInput.value = "";
        selectedProfilePictureFile = null;
        setFormMessage(accountDetailsMessage, "Please choose an image file for your profile picture.", "error");
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

function clearSelectedProfilePicture() {
    selectedProfilePictureFile = null;
    removeProfilePictureRequested = true;
    pendingProfilePicture = "";
    profilePictureInput.value = "";
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
        : pendingProfilePicture || userRecord?.profilePicture || "";

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
        setFormMessage(accountDetailsMessage, "Please Login-in before saving account details.", "error");
        return;
    }

    saveAccountDetailsBtn.disabled = true;
    saveAccountDetailsBtn.textContent = "Saving...";

    const users = readUsers();
    const userRecord = users[currentUser];

    if (!userRecord) {
        setFormMessage(accountDetailsMessage, "We could not find your account details. Please Login-in again.", "error");
        saveAccountDetailsBtn.disabled = false;
        saveAccountDetailsBtn.textContent = "Save Details";
        return;
    }

    try {
        userRecord.name = accountNameInput.value.trim();

        if (removeProfilePictureRequested) {
            userRecord.profilePicture = "";
        } else if (selectedProfilePictureFile) {
            userRecord.profilePicture = await readFileAsDataUrl(selectedProfilePictureFile);
        } else {
            userRecord.profilePicture = pendingProfilePicture || userRecord.profilePicture || "";
        }

        users[currentUser] = userRecord;
        writeUsers(users);
        localStorage.setItem(STORAGE_KEYS.activeUser, currentUser);
        pendingProfilePicture = userRecord.profilePicture;
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
        setFormMessage(accountDetailsMessage, "We could not save your picture. Please try again.", "error");
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

    const isVisible = targetInput.type === "text";
    targetInput.type = isVisible ? "password" : "text";
    button.classList.toggle("is-visible", !isVisible);
    button.setAttribute("aria-label", isVisible ? "Show password" : "Hide password");
}

function handleResetPassword() {
    if (!currentUser) {
        return;
    }

    const previousPassword = oldPassword.value;
    const updatedPassword = newPassword.value;
    const confirmedUpdatedPassword = confirmNewPassword.value;
    const users = readUsers();
    const userRecord = users[currentUser];

    if (!previousPassword || !updatedPassword || !confirmedUpdatedPassword) {
        setFormMessage(resetPasswordMessage, "Please complete all password fields.", "error");
        return;
    }

    if (!userRecord || userRecord.password !== previousPassword) {
        setFormMessage(resetPasswordMessage, "Previous password is incorrect.", "error");
        return;
    }

    if (updatedPassword !== confirmedUpdatedPassword) {
        setFormMessage(resetPasswordMessage, "New passwords do not match.", "error");
        return;
    }

    userRecord.password = updatedPassword;
    users[currentUser] = userRecord;
    writeUsers(users);
    closeModal();
    setStatus("Password updated successfully.", "success");
}

function handleDeleteAccount() {
    if (!currentUser) {
        return;
    }

    const password = deletePassword.value;
    const users = readUsers();
    const userRecord = users[currentUser];

    if (!password) {
        setFormMessage(deleteAccountMessage, "Please enter your password to continue.", "error");
        return;
    }

    if (!userRecord || userRecord.password !== password) {
        setFormMessage(deleteAccountMessage, "Password is incorrect.", "error");
        return;
    }

    delete users[currentUser];
    writeUsers(users);

    const histories = readHistory();
    delete histories[currentUser];
    writeHistory(histories);

    currentUser = null;
    localStorage.removeItem(STORAGE_KEYS.activeUser);
    closeModal();
    updateUserInterface();
    showGeneratorPage();
    setStatus("Account deleted. You can still make QR codes as a guest.", "success");
}

function renderHistory() {
    historyList.innerHTML = "";
    historyList.classList.toggle("history-list--guest", !currentUser);
    historyList.classList.remove("history-list--empty");

    if (!currentUser) {
        historyCount.textContent = "Guest mode";
        clearHistoryBtn.hidden = true;
        historyList.classList.add("history-list--empty");
        historyList.innerHTML = `
            <div class="guest-history-card">
                <p class="guest-history-copy">
                    History is saved only after you
                    <a href="#login" class="history-login-link" data-action="open-auth">Login-in</a>.
                </p>
            </div>
        `;
        return;
    }

    const histories = readHistory();
    const userHistory = histories[currentUser] || [];

    historyCount.textContent = `${userHistory.length} ${userHistory.length === 1 ? "item" : "items"}`;
    clearHistoryBtn.hidden = userHistory.length === 0;

    if (!userHistory.length) {
        historyList.classList.add("history-list--empty");
        historyList.innerHTML = '<p class="empty-state">No QR codes saved yet.</p>';
        return;
    }

    userHistory
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
    const displayName = isLoggedIn ? getDisplayName(currentUser, userRecord) : "guest";

    welcomeName.textContent = displayName;
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
}

function getDisplayName(username, userRecord) {
    if (!username) {
        return "guest";
    }

    const name = userRecord?.name?.trim();
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
    if (!currentUser) {
        return null;
    }

    const users = readUsers();
    return users[currentUser] || null;
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
    return new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short"
    }).format(new Date(value));
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
    statusMessage.textContent = message;
    statusMessage.dataset.state = state;
}

function readUsers() {
    const rawUsers = readJson(localStorage, STORAGE_KEYS.users);
    const normalizedUsers = {};

    Object.entries(rawUsers).forEach(([username, value]) => {
        normalizedUsers[username] = normalizeUserRecord(value);
    });

    return normalizedUsers;
}

function writeUsers(users) {
    localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(users));
}

function normalizeUserRecord(value) {
    if (typeof value === "string") {
        return {
            password: value,
            name: "",
            profilePicture: ""
        };
    }

    if (value && typeof value === "object") {
        return {
            password: String(value.password || ""),
            name: String(value.name || ""),
            profilePicture: String(value.profilePicture || "")
        };
    }

    return {
        password: "",
        name: "",
        profilePicture: ""
    };
}

function readHistory() {
    return readJson(localStorage, STORAGE_KEYS.history);
}

function writeHistory(histories) {
    localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(histories));
}

function readJson(storage, key) {
    try {
        return JSON.parse(storage.getItem(key) || "{}");
    } catch (error) {
        return {};
    }
}
