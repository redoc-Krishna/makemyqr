const http = require("http");
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");

const HOST = process.env.HOST || "0.0.0.0";
const PORT = Number(process.env.PORT || 3000);
const APP_DIR = __dirname;
const DATA_DIR = path.join(APP_DIR, "data");
const VAULT_PATH = path.join(DATA_DIR, "vault.json");
const SECRET_PATH = path.join(DATA_DIR, "app-secret.key");
const SESSION_COOKIE_NAME = "mmq_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const LOGIN_WINDOW_MS = 1000 * 60 * 10;
const MAX_FAILED_LOGINS = 5;
const LOCKOUT_MS = 1000 * 60 * 5;
const MAX_BODY_SIZE = 1024 * 1024 * 2;
const MAX_HISTORY_ITEMS = 250;
const MAX_PROFILE_PICTURE_BYTES = 1024 * 1024;
const MAX_HTML_BYTES = 256 * 1024;
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 6000;
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) MakeMyQR/2.1";

const sessions = new Map();
const loginAttempts = new Map();

ensureDataDirectory();
const dataKey = loadDataKey();
ensureVaultFile();

setInterval(cleanExpiredSessions, 60 * 60 * 1000).unref();
setInterval(cleanExpiredLoginAttempts, 10 * 60 * 1000).unref();

const server = http.createServer(async (req, res) => {
    try {
        setCommonHeaders(res);

        const requestOrigin = getRequestOrigin(req);
        const requestUrl = new URL(req.url || "/", requestOrigin);

        if (requestUrl.pathname === "/site-logo") {
            await handleSiteLogoRequest(req, res, requestUrl);
            return;
        }

        if (requestUrl.pathname.startsWith("/api/")) {
            await handleApiRequest(req, res, requestUrl);
            return;
        }

        if (!["GET", "HEAD"].includes(req.method || "")) {
            sendText(res, 405, "Method Not Allowed");
            return;
        }

        serveStaticFile(res, requestUrl.pathname, req.method === "HEAD");
    } catch (error) {
        console.error("Unhandled request error:", error);
        sendJson(res, 500, {
            message: "The server ran into a problem. Please try again."
        });
    }
});

server.listen(PORT, HOST, () => {
    const urls = [`http://localhost:${PORT}`];

    if (HOST === "0.0.0.0") {
        getNetworkAddresses().forEach((address) => {
            urls.push(`http://${address}:${PORT}`);
        });
    }

    console.log("Make My QR secure sync server is running.");
    urls.forEach((url) => console.log(`  ${url}`));

    if (!process.env.QR_APP_SECRET) {
        console.log(`Using local app secret at ${SECRET_PATH}`);
        console.log("Set QR_APP_SECRET before public deployment so the encryption key is not tied to the local file.");
    }
});

async function handleApiRequest(req, res, requestUrl) {
    try {
        const { pathname } = requestUrl;
        const method = req.method || "GET";

        if (!["GET", "HEAD"].includes(method) && !isSameOriginRequest(req)) {
            sendJson(res, 403, {
                message: "Cross-site requests are blocked for your safety."
            });
            return;
        }

        if (pathname === "/api/bootstrap" && method === "GET") {
            const auth = getAuthenticatedSession(req);

            if (!auth) {
                clearSessionCookie(res);
                sendJson(res, 200, guestBootstrap());
                return;
            }

            const vault = readVault();
            const userRecord = vault.users[auth.userKey];

            if (!userRecord) {
                destroySession(auth.sessionId);
                clearSessionCookie(res);
                sendJson(res, 200, guestBootstrap());
                return;
            }

            sendJson(res, 200, buildBootstrapPayload(userRecord, auth.userKey));
            return;
        }

        if (pathname === "/api/signup" && method === "POST") {
            const body = await readJsonBody(req);
            const username = normalizeUsername(body.username);
            const password = String(body.password || "");
            const validationError = validateSignupPayload(username, password);

            if (validationError) {
                sendJson(res, 400, { message: validationError });
                return;
            }

            const userKey = getUserKey(username);
            const vault = readVault();

            if (vault.users[userKey]) {
                sendJson(res, 409, {
                    message: "That username already exists. Choose another one."
                });
                return;
            }

            const record = createUserRecord(username, password, userKey);
            vault.users[userKey] = record;
            vault.updatedAt = new Date().toISOString();
            writeVault(vault);

            const sessionId = createSession(userKey);
            setSessionCookie(res, sessionId);
            sendJson(res, 201, buildBootstrapPayload(record, userKey));
            return;
        }

        if (pathname === "/api/login" && method === "POST") {
            const body = await readJsonBody(req);
            const username = normalizeUsername(body.username);
            const password = String(body.password || "");
            const userKey = getUserKey(username);
            const attemptKey = `${getClientIp(req)}:${userKey}`;
            const waitMs = getRemainingLockout(attemptKey);

            if (waitMs > 0) {
                sendJson(res, 429, {
                    message: `Too many login attempts. Try again in ${Math.ceil(waitMs / 1000)} seconds.`
                });
                return;
            }

            if (!username || !password) {
                sendJson(res, 400, {
                    message: "Please enter your username and password."
                });
                return;
            }

            const vault = readVault();
            const record = vault.users[userKey];

            if (!record || !verifyPassword(password, record.password)) {
                registerFailedLogin(attemptKey);
                sendJson(res, 401, {
                    message: "Username or password is incorrect."
                });
                return;
            }

            clearLoginAttempts(attemptKey);
            const sessionId = createSession(userKey);
            setSessionCookie(res, sessionId);
            sendJson(res, 200, buildBootstrapPayload(record, userKey));
            return;
        }

        if (pathname === "/api/logout" && method === "POST") {
            const auth = getAuthenticatedSession(req);

            if (auth) {
                destroySession(auth.sessionId);
            }

            clearSessionCookie(res);
            sendJson(res, 200, { ok: true });
            return;
        }

        if (pathname === "/api/account" && method === "PATCH") {
            const context = requireAuth(req, res);

            if (!context) {
                return;
            }

            const body = await readJsonBody(req);
            const nextName = String(body.name || "").trim();
            const nextProfilePicture = body.profilePicture === undefined ? "" : String(body.profilePicture || "");

            if (nextName.length > 80) {
                sendJson(res, 400, {
                    message: "Display name must stay under 80 characters."
                });
                return;
            }

            if (!isValidProfilePicture(nextProfilePicture)) {
                sendJson(res, 400, {
                    message: "Profile picture must be an image under 1 MB."
                });
                return;
            }

            const profile = normalizeProfile({
                name: nextName,
                profilePicture: nextProfilePicture
            });

            context.record.profileCipher = encryptJson(profile, `profile:${context.userKey}`);
            context.record.updatedAt = new Date().toISOString();
            context.vault.updatedAt = context.record.updatedAt;
            context.vault.users[context.userKey] = context.record;
            writeVault(context.vault);

            sendJson(res, 200, {
                user: buildPublicUser(context.record, context.userKey)
            });
            return;
        }

        if (pathname === "/api/password" && method === "POST") {
            const context = requireAuth(req, res);

            if (!context) {
                return;
            }

            const body = await readJsonBody(req);
            const oldPassword = String(body.oldPassword || "");
            const newPassword = String(body.newPassword || "");

            if (!oldPassword || !newPassword) {
                sendJson(res, 400, {
                    message: "Please complete all password fields."
                });
                return;
            }

            if (!verifyPassword(oldPassword, context.record.password)) {
                sendJson(res, 401, {
                    message: "Previous password is incorrect."
                });
                return;
            }

            const passwordError = validatePassword(newPassword);

            if (passwordError) {
                sendJson(res, 400, { message: passwordError });
                return;
            }

            context.record.password = hashPassword(newPassword);
            context.record.updatedAt = new Date().toISOString();
            context.vault.updatedAt = context.record.updatedAt;
            context.vault.users[context.userKey] = context.record;
            writeVault(context.vault);

            sendJson(res, 200, { ok: true });
            return;
        }

        if (pathname === "/api/account" && method === "DELETE") {
            const context = requireAuth(req, res);

            if (!context) {
                return;
            }

            const body = await readJsonBody(req);
            const password = String(body.password || "");

            if (!password) {
                sendJson(res, 400, {
                    message: "Please enter your password to continue."
                });
                return;
            }

            if (!verifyPassword(password, context.record.password)) {
                sendJson(res, 401, {
                    message: "Password is incorrect."
                });
                return;
            }

            delete context.vault.users[context.userKey];
            context.vault.updatedAt = new Date().toISOString();
            writeVault(context.vault);
            destroyAllSessionsForUser(context.userKey);
            clearSessionCookie(res);
            sendJson(res, 200, { ok: true });
            return;
        }

        if (pathname === "/api/history" && method === "POST") {
            const context = requireAuth(req, res);

            if (!context) {
                return;
            }

            const body = await readJsonBody(req);
            const normalizedUrl = sanitizeQrUrl(body.url);

            if (!normalizedUrl) {
                sendJson(res, 400, {
                    message: "Please enter a valid website URL that starts with http or https."
                });
                return;
            }

            const history = readUserHistory(context.record, context.userKey);
            history.push({
                id: crypto.randomUUID(),
                url: normalizedUrl,
                createdAt: new Date().toISOString()
            });

            while (history.length > MAX_HISTORY_ITEMS) {
                history.shift();
            }

            context.record.historyCipher = encryptJson(history, `history:${context.userKey}`);
            context.record.updatedAt = new Date().toISOString();
            context.vault.updatedAt = context.record.updatedAt;
            context.vault.users[context.userKey] = context.record;
            writeVault(context.vault);

            sendJson(res, 200, { history });
            return;
        }

        if (pathname === "/api/history" && method === "DELETE") {
            const context = requireAuth(req, res);

            if (!context) {
                return;
            }

            context.record.historyCipher = encryptJson([], `history:${context.userKey}`);
            context.record.updatedAt = new Date().toISOString();
            context.vault.updatedAt = context.record.updatedAt;
            context.vault.users[context.userKey] = context.record;
            writeVault(context.vault);

            sendJson(res, 200, { history: [] });
            return;
        }

        if (pathname.startsWith("/api/history/") && method === "DELETE") {
            const context = requireAuth(req, res);

            if (!context) {
                return;
            }

            const entryId = decodeURIComponent(pathname.slice("/api/history/".length));
            const history = readUserHistory(context.record, context.userKey);
            const nextHistory = history.filter((entry) => entry.id !== entryId);

            if (nextHistory.length === history.length) {
                sendJson(res, 404, {
                    message: "That history entry no longer exists."
                });
                return;
            }

            context.record.historyCipher = encryptJson(nextHistory, `history:${context.userKey}`);
            context.record.updatedAt = new Date().toISOString();
            context.vault.updatedAt = context.record.updatedAt;
            context.vault.users[context.userKey] = context.record;
            writeVault(context.vault);

            sendJson(res, 200, { history: nextHistory });
            return;
        }

        sendJson(res, 404, {
            message: "That route does not exist."
        });
    } catch (error) {
        if (error && error.statusCode) {
            sendJson(res, error.statusCode, {
                message: error.message
            });
            return;
        }

        throw error;
    }
}

function requireAuth(req, res) {
    const auth = getAuthenticatedSession(req);

    if (!auth) {
        clearSessionCookie(res);
        sendJson(res, 401, {
            message: "Please log in to continue."
        });
        return null;
    }

    const vault = readVault();
    const record = vault.users[auth.userKey];

    if (!record) {
        destroySession(auth.sessionId);
        clearSessionCookie(res);
        sendJson(res, 401, {
            message: "Your session expired. Please log in again."
        });
        return null;
    }

    return {
        sessionId: auth.sessionId,
        userKey: auth.userKey,
        vault,
        record
    };
}

function guestBootstrap() {
    return {
        authenticated: false,
        user: null,
        history: []
    };
}

function buildBootstrapPayload(record, userKey) {
    return {
        authenticated: true,
        user: buildPublicUser(record, userKey),
        history: readUserHistory(record, userKey)
    };
}

function buildPublicUser(record, userKey) {
    const profile = readUserProfile(record, userKey);

    return {
        username: record.username,
        name: profile.name,
        profilePicture: profile.profilePicture
    };
}

function createUserRecord(username, password, userKey) {
    const timestamp = new Date().toISOString();

    return {
        username,
        password: hashPassword(password),
        profileCipher: encryptJson({
            name: "",
            profilePicture: ""
        }, `profile:${userKey}`),
        historyCipher: encryptJson([], `history:${userKey}`),
        createdAt: timestamp,
        updatedAt: timestamp
    };
}

function readUserProfile(record, userKey) {
    return normalizeProfile(decryptJson(record.profileCipher, `profile:${userKey}`) || {});
}

function readUserHistory(record, userKey) {
    const history = decryptJson(record.historyCipher, `history:${userKey}`);

    if (!Array.isArray(history)) {
        return [];
    }

    return history
        .map((entry) => normalizeHistoryEntry(entry))
        .filter(Boolean);
}

function normalizeHistoryEntry(value) {
    if (!value || typeof value !== "object") {
        return null;
    }

    const id = String(value.id || "");
    const url = sanitizeQrUrl(value.url);
    const createdAt = String(value.createdAt || "");

    if (!id || !url || !createdAt) {
        return null;
    }

    return { id, url, createdAt };
}

function normalizeProfile(value) {
    return {
        name: String(value.name || "").trim().slice(0, 80),
        profilePicture: String(value.profilePicture || "")
    };
}

function validateSignupPayload(username, password) {
    if (!username || !password) {
        return "Please enter your username and password.";
    }

    if (!/^[a-zA-Z0-9._-]{3,32}$/.test(username)) {
        return "Username must be 3 to 32 characters and use only letters, numbers, dots, dashes, or underscores.";
    }

    return validatePassword(password);
}

function validatePassword(password) {
    if (password.length < 8) {
        return "Password must be at least 8 characters long.";
    }

    if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
        return "Password must include at least one letter and one number.";
    }

    return "";
}

function isValidProfilePicture(value) {
    if (!value) {
        return true;
    }

    const match = /^data:image\/[a-zA-Z0-9.+-]+;base64,([A-Za-z0-9+/=]+)$/.exec(value);

    if (!match) {
        return false;
    }

    try {
        const bytes = Buffer.from(match[1], "base64");
        return bytes.length <= MAX_PROFILE_PICTURE_BYTES;
    } catch (error) {
        return false;
    }
}

function sanitizeQrUrl(value) {
    if (typeof value !== "string") {
        return "";
    }

    const trimmedValue = value.trim();

    if (!trimmedValue) {
        return "";
    }

    try {
        const url = new URL(trimmedValue);

        if (!["http:", "https:"].includes(url.protocol)) {
            return "";
        }

        return url.href;
    } catch (error) {
        return "";
    }
}

function getAuthenticatedSession(req) {
    const cookies = parseCookies(req.headers.cookie || "");
    const sessionId = cookies[SESSION_COOKIE_NAME];

    if (!sessionId) {
        return null;
    }

    const session = sessions.get(sessionId);

    if (!session) {
        return null;
    }

    if (session.expiresAt <= Date.now()) {
        sessions.delete(sessionId);
        return null;
    }

    session.expiresAt = Date.now() + SESSION_TTL_MS;

    return {
        sessionId,
        userKey: session.userKey
    };
}

function createSession(userKey) {
    cleanExpiredSessions();

    const sessionId = crypto.randomBytes(32).toString("base64url");
    sessions.set(sessionId, {
        userKey,
        expiresAt: Date.now() + SESSION_TTL_MS
    });

    return sessionId;
}

function destroySession(sessionId) {
    sessions.delete(sessionId);
}

function destroyAllSessionsForUser(userKey) {
    sessions.forEach((session, sessionId) => {
        if (session.userKey === userKey) {
            sessions.delete(sessionId);
        }
    });
}

function cleanExpiredSessions() {
    const now = Date.now();

    sessions.forEach((session, sessionId) => {
        if (session.expiresAt <= now) {
            sessions.delete(sessionId);
        }
    });
}

function getRemainingLockout(attemptKey) {
    const attempt = loginAttempts.get(attemptKey);

    if (!attempt) {
        return 0;
    }

    if (attempt.lockedUntil > Date.now()) {
        return attempt.lockedUntil - Date.now();
    }

    return 0;
}

function registerFailedLogin(attemptKey) {
    const now = Date.now();
    const current = loginAttempts.get(attemptKey);
    const baseAttempt = current && current.windowEndsAt > now
        ? current
        : {
            count: 0,
            windowEndsAt: now + LOGIN_WINDOW_MS,
            lockedUntil: 0
        };

    baseAttempt.count += 1;

    if (baseAttempt.count >= MAX_FAILED_LOGINS) {
        baseAttempt.count = 0;
        baseAttempt.lockedUntil = now + LOCKOUT_MS;
        baseAttempt.windowEndsAt = now + LOGIN_WINDOW_MS;
    }

    loginAttempts.set(attemptKey, baseAttempt);
}

function clearLoginAttempts(attemptKey) {
    loginAttempts.delete(attemptKey);
}

function cleanExpiredLoginAttempts() {
    const now = Date.now();

    loginAttempts.forEach((attempt, attemptKey) => {
        if (attempt.lockedUntil <= now && attempt.windowEndsAt <= now) {
            loginAttempts.delete(attemptKey);
        }
    });
}

function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString("base64url");
    const hash = crypto.scryptSync(password, salt, 64).toString("base64url");

    return { salt, hash };
}

function verifyPassword(password, storedPassword) {
    if (!storedPassword || !storedPassword.salt || !storedPassword.hash) {
        return false;
    }

    try {
        const expected = Buffer.from(storedPassword.hash, "base64url");
        const actual = crypto.scryptSync(password, storedPassword.salt, 64);
        return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
    } catch (error) {
        return false;
    }
}

function encryptJson(value, purpose) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", dataKey, iv);
    cipher.setAAD(Buffer.from(purpose, "utf8"));
    const encrypted = Buffer.concat([
        cipher.update(JSON.stringify(value), "utf8"),
        cipher.final()
    ]);
    const tag = cipher.getAuthTag();

    return {
        iv: iv.toString("base64url"),
        tag: tag.toString("base64url"),
        data: encrypted.toString("base64url")
    };
}

function decryptJson(payload, purpose) {
    if (!payload || !payload.iv || !payload.tag || !payload.data) {
        return null;
    }

    try {
        const decipher = crypto.createDecipheriv(
            "aes-256-gcm",
            dataKey,
            Buffer.from(payload.iv, "base64url")
        );

        decipher.setAAD(Buffer.from(purpose, "utf8"));
        decipher.setAuthTag(Buffer.from(payload.tag, "base64url"));

        const decrypted = Buffer.concat([
            decipher.update(Buffer.from(payload.data, "base64url")),
            decipher.final()
        ]).toString("utf8");

        return JSON.parse(decrypted);
    } catch (error) {
        return null;
    }
}

function ensureDataDirectory() {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadDataKey() {
    const secretMaterial = process.env.QR_APP_SECRET || ensureLocalSecret();
    return crypto.createHash("sha256").update(secretMaterial, "utf8").digest();
}

function ensureLocalSecret() {
    if (fs.existsSync(SECRET_PATH)) {
        return fs.readFileSync(SECRET_PATH, "utf8").trim();
    }

    const secret = crypto.randomBytes(32).toString("hex");
    fs.writeFileSync(SECRET_PATH, `${secret}\n`, "utf8");
    return secret;
}

function ensureVaultFile() {
    if (fs.existsSync(VAULT_PATH)) {
        return;
    }

    writeVault({
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        users: {}
    });
}

function readVault() {
    try {
        const rawValue = fs.readFileSync(VAULT_PATH, "utf8");
        const parsedValue = JSON.parse(rawValue);

        return {
            version: 1,
            createdAt: String(parsedValue.createdAt || new Date().toISOString()),
            updatedAt: String(parsedValue.updatedAt || new Date().toISOString()),
            users: parsedValue && typeof parsedValue.users === "object" && parsedValue.users
                ? parsedValue.users
                : {}
        };
    } catch (error) {
        return {
            version: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            users: {}
        };
    }
}

function writeVault(vault) {
    fs.writeFileSync(VAULT_PATH, JSON.stringify(vault, null, 2), "utf8");
}

function normalizeUsername(value) {
    return String(value || "").trim();
}

function getUserKey(username) {
    return normalizeUsername(username).toLowerCase();
}

function parseCookies(cookieHeader) {
    return cookieHeader
        .split(";")
        .map((entry) => entry.trim())
        .filter(Boolean)
        .reduce((cookies, entry) => {
            const separatorIndex = entry.indexOf("=");

            if (separatorIndex <= 0) {
                return cookies;
            }

            const key = entry.slice(0, separatorIndex).trim();
            const value = entry.slice(separatorIndex + 1).trim();
            cookies[key] = decodeURIComponent(value);
            return cookies;
        }, {});
}

function setSessionCookie(res, sessionId) {
    const parts = [
        `${SESSION_COOKIE_NAME}=${encodeURIComponent(sessionId)}`,
        "Path=/",
        "HttpOnly",
        "SameSite=Strict",
        `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`
    ];

    if (process.env.COOKIE_SECURE === "true") {
        parts.push("Secure");
    }

    res.setHeader("Set-Cookie", parts.join("; "));
}

function clearSessionCookie(res) {
    const parts = [
        `${SESSION_COOKIE_NAME}=`,
        "Path=/",
        "HttpOnly",
        "SameSite=Strict",
        "Max-Age=0"
    ];

    if (process.env.COOKIE_SECURE === "true") {
        parts.push("Secure");
    }

    res.setHeader("Set-Cookie", parts.join("; "));
}

function isSameOriginRequest(req) {
    const origin = req.headers.origin;

    if (!origin) {
        return true;
    }

    return origin === getRequestOrigin(req);
}

function getRequestOrigin(req) {
    const protocol = String(req.headers["x-forwarded-proto"] || "http").split(",")[0].trim() || "http";
    const host = req.headers.host || `localhost:${PORT}`;
    return `${protocol}://${host}`;
}

function getClientIp(req) {
    const forwarded = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
    return forwarded || req.socket.remoteAddress || "unknown";
}

async function readJsonBody(req) {
    const chunks = [];
    let totalBytes = 0;

    for await (const chunk of req) {
        const chunkBuffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        totalBytes += chunkBuffer.length;

        if (totalBytes > MAX_BODY_SIZE) {
            const error = new Error("Payload too large.");
            error.statusCode = 413;
            throw error;
        }

        chunks.push(chunkBuffer);
    }

    if (!chunks.length) {
        return {};
    }

    const rawBody = Buffer.concat(chunks).toString("utf8").trim();

    if (!rawBody) {
        return {};
    }

    try {
        return JSON.parse(rawBody);
    } catch (error) {
        const parseError = new Error("Request body must be valid JSON.");
        parseError.statusCode = 400;
        throw parseError;
    }
}

async function handleSiteLogoRequest(req, res, requestUrl) {
    const isHeadRequest = req.method === "HEAD";

    if (!["GET", "HEAD"].includes(req.method || "")) {
        sendText(res, 405, "Method Not Allowed", isHeadRequest);
        return;
    }

    const targetUrl = normalizeSiteUrl(requestUrl.searchParams.get("url") || "");

    if (!targetUrl) {
        sendJson(res, 400, {
            message: "Enter a valid http or https URL."
        }, isHeadRequest);
        return;
    }

    const logoAsset = await resolveSiteLogo(targetUrl);

    if (!logoAsset) {
        sendJson(res, 404, {
            message: "We could not find a site logo for that URL."
        }, isHeadRequest);
        return;
    }

    res.statusCode = 200;
    res.setHeader("Content-Type", logoAsset.contentType);
    res.setHeader("Content-Length", logoAsset.buffer.length);
    res.setHeader("Cache-Control", "public, max-age=43200");

    if (isHeadRequest) {
        res.end();
        return;
    }

    res.end(logoAsset.buffer);
}

async function resolveSiteLogo(siteUrl) {
    const pageMetadata = await fetchPageMetadata(siteUrl);
    const candidates = [
        ...pageMetadata.icons,
        ...buildFallbackIconCandidates(siteUrl, pageMetadata.finalUrl)
    ];
    const seen = new Set();

    for (const candidate of candidates) {
        if (!candidate || seen.has(candidate)) {
            continue;
        }

        seen.add(candidate);

        const imageAsset = await fetchImageAsset(candidate);

        if (imageAsset) {
            return imageAsset;
        }
    }

    return null;
}

async function fetchPageMetadata(siteUrl) {
    try {
        const response = await fetchWithTimeout(siteUrl, {
            headers: {
                "Accept": "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
                "User-Agent": USER_AGENT
            },
            redirect: "follow"
        });
        const finalUrl = response.url || siteUrl;

        if (!response.ok) {
            return { finalUrl, icons: [] };
        }

        const contentType = (response.headers.get("content-type") || "").toLowerCase();
        const contentLength = Number(response.headers.get("content-length") || 0);

        if (!contentType.includes("text/html") || (contentLength && contentLength > MAX_HTML_BYTES)) {
            return { finalUrl, icons: [] };
        }

        const html = (await response.text()).slice(0, MAX_HTML_BYTES);

        return {
            finalUrl,
            icons: extractIconCandidates(html, finalUrl)
        };
    } catch (error) {
        return {
            finalUrl: siteUrl,
            icons: []
        };
    }
}

function extractIconCandidates(html, baseUrl) {
    const tagPattern = /<link\b[^>]*>/gi;
    const rankedIcons = [];
    let tagMatch = tagPattern.exec(html);

    while (tagMatch) {
        const tag = tagMatch[0];
        const rel = getAttributeValue(tag, "rel");
        const href = getAttributeValue(tag, "href");

        if (rel && href && rel.toLowerCase().includes("icon")) {
            const resolvedHref = resolveUrl(baseUrl, href);

            if (resolvedHref) {
                rankedIcons.push({
                    href: resolvedHref,
                    score: scoreIconCandidate(rel, getAttributeValue(tag, "sizes"), href)
                });
            }
        }

        tagMatch = tagPattern.exec(html);
    }

    rankedIcons.sort((left, right) => right.score - left.score);

    return rankedIcons
        .map((entry) => entry.href)
        .filter((href, index, values) => values.indexOf(href) === index);
}

function scoreIconCandidate(rel, sizes, href) {
    const normalizedRel = String(rel || "").toLowerCase();
    const normalizedHref = String(href || "").toLowerCase();
    let score = 0;

    if (normalizedRel.includes("apple-touch-icon")) {
        score += 60;
    }

    if (normalizedRel.includes("shortcut")) {
        score += 45;
    }

    if (normalizedRel.includes("icon")) {
        score += 40;
    }

    if (normalizedRel.includes("mask-icon")) {
        score -= 25;
    }

    if (normalizedHref.endsWith(".svg")) {
        score += 30;
    } else if (normalizedHref.endsWith(".png")) {
        score += 20;
    } else if (normalizedHref.endsWith(".ico")) {
        score += 10;
    }

    const sizeMatches = String(sizes || "").match(/\d+/g) || [];
    const numericSizes = sizeMatches.map((value) => Number(value)).filter((value) => Number.isFinite(value));
    const largestSize = numericSizes.length ? Math.max(...numericSizes) : 0;

    if (largestSize) {
        score += Math.min(largestSize, 256) / 4;
    }

    if (String(sizes || "").toLowerCase().includes("any")) {
        score += 24;
    }

    return score;
}

function buildFallbackIconCandidates(siteUrl, finalUrl) {
    const candidates = [];

    [finalUrl, siteUrl].forEach((value) => {
        try {
            const parsedUrl = new URL(value);

            candidates.push(new URL("/favicon.ico", parsedUrl.origin).href);
            candidates.push(new URL("/apple-touch-icon.png", parsedUrl.origin).href);
            candidates.push(new URL("/apple-touch-icon-precomposed.png", parsedUrl.origin).href);
        } catch (error) {
            // Ignore invalid fallback URLs.
        }
    });

    return candidates.filter((href, index, values) => values.indexOf(href) === index);
}

async function fetchImageAsset(candidateUrl) {
    try {
        const response = await fetchWithTimeout(candidateUrl, {
            headers: {
                "Accept": "image/*,*/*;q=0.8",
                "User-Agent": USER_AGENT
            },
            redirect: "follow"
        });
        const finalUrl = response.url || candidateUrl;

        if (!response.ok) {
            return null;
        }

        const contentTypeHeader = (response.headers.get("content-type") || "")
            .split(";")[0]
            .trim()
            .toLowerCase();
        const contentLength = Number(response.headers.get("content-length") || 0);

        if (contentLength && contentLength > MAX_IMAGE_BYTES) {
            return null;
        }

        if (!isSupportedImageResponse(contentTypeHeader, finalUrl)) {
            return null;
        }

        const buffer = Buffer.from(await response.arrayBuffer());

        if (!buffer.length || buffer.length > MAX_IMAGE_BYTES) {
            return null;
        }

        return {
            buffer,
            contentType: normalizeImageContentType(contentTypeHeader, finalUrl)
        };
    } catch (error) {
        return null;
    }
}

function isSupportedImageResponse(contentType, assetUrl) {
    if (contentType.startsWith("image/")) {
        return true;
    }

    try {
        const pathname = new URL(assetUrl).pathname.toLowerCase();
        return [".ico", ".png", ".svg", ".jpg", ".jpeg", ".webp", ".gif"].some((extension) => pathname.endsWith(extension));
    } catch (error) {
        return false;
    }
}

function normalizeImageContentType(contentType, assetUrl) {
    if (contentType.startsWith("image/")) {
        return contentType;
    }

    try {
        const pathname = new URL(assetUrl).pathname.toLowerCase();

        if (pathname.endsWith(".svg")) {
            return "image/svg+xml";
        }

        if (pathname.endsWith(".png")) {
            return "image/png";
        }

        if (pathname.endsWith(".jpg") || pathname.endsWith(".jpeg")) {
            return "image/jpeg";
        }

        if (pathname.endsWith(".webp")) {
            return "image/webp";
        }

        if (pathname.endsWith(".gif")) {
            return "image/gif";
        }
    } catch (error) {
        // Fall through to the default.
    }

    return "image/x-icon";
}

async function fetchWithTimeout(resource, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
        return await fetch(resource, {
            ...options,
            signal: controller.signal
        });
    } finally {
        clearTimeout(timeoutId);
    }
}

function getAttributeValue(tag, attributeName) {
    const attributePattern = new RegExp(`\\b${attributeName}\\s*=\\s*(?:\"([^\"]+)\"|'([^']+)'|([^\\s>]+))`, "i");
    const attributeMatch = tag.match(attributePattern);

    return attributeMatch
        ? attributeMatch[1] || attributeMatch[2] || attributeMatch[3] || ""
        : "";
}

function resolveUrl(baseUrl, href) {
    try {
        return new URL(href, baseUrl).href;
    } catch (error) {
        return "";
    }
}

function normalizeSiteUrl(value) {
    try {
        const parsedUrl = new URL(String(value || ""));

        if (!["http:", "https:"].includes(parsedUrl.protocol)) {
            return "";
        }

        return parsedUrl.href;
    } catch (error) {
        return "";
    }
}

function serveStaticFile(res, pathname, isHeadRequest) {
    const requestedPath = pathname === "/" ? "/index.html" : pathname;
    const resolvedPath = path.resolve(APP_DIR, `.${requestedPath}`);

    if (!resolvedPath.startsWith(APP_DIR)) {
        sendText(res, 403, "Forbidden");
        return;
    }

    let stat;

    try {
        stat = fs.statSync(resolvedPath);
    } catch (error) {
        sendText(res, 404, "Not Found");
        return;
    }

    if (!stat.isFile()) {
        sendText(res, 404, "Not Found");
        return;
    }

    const extension = path.extname(resolvedPath).toLowerCase();
    const contentType = getContentType(extension);
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", extension === ".html" ? "no-cache" : "public, max-age=86400");
    res.writeHead(200);

    if (isHeadRequest) {
        res.end();
        return;
    }

    fs.createReadStream(resolvedPath).pipe(res);
}

function getContentType(extension) {
    const types = {
        ".css": "text/css; charset=utf-8",
        ".html": "text/html; charset=utf-8",
        ".js": "application/javascript; charset=utf-8",
        ".json": "application/json; charset=utf-8",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".ico": "image/x-icon",
        ".svg": "image/svg+xml",
        ".webp": "image/webp"
    };

    return types[extension] || "application/octet-stream";
}

function setCommonHeaders(res) {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
    res.setHeader("Permissions-Policy", "camera=(), geolocation=(), microphone=()");
    res.setHeader(
        "Content-Security-Policy",
        [
            "default-src 'self'",
            "img-src 'self' data: blob:",
            "style-src 'self' 'unsafe-inline'",
            "script-src 'self' https://cdnjs.cloudflare.com",
            "connect-src 'self'",
            "font-src 'self'",
            "base-uri 'self'",
            "form-action 'self'",
            "frame-ancestors 'none'",
            "object-src 'none'"
        ].join("; ")
    );
}

function sendJson(res, statusCode, payload, isHeadRequest = false) {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.writeHead(statusCode);

    if (isHeadRequest) {
        res.end();
        return;
    }

    res.end(JSON.stringify(payload));
}

function sendText(res, statusCode, body, isHeadRequest = false) {
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.writeHead(statusCode);

    if (isHeadRequest) {
        res.end();
        return;
    }

    res.end(body);
}

function getNetworkAddresses() {
    return Object.values(os.networkInterfaces())
        .flat()
        .filter((detail) => detail && detail.family === "IPv4" && !detail.internal)
        .map((detail) => detail.address);
}

process.on("uncaughtException", (error) => {
    console.error("Uncaught exception:", error);
});

process.on("unhandledRejection", (error) => {
    console.error("Unhandled rejection:", error);
});
