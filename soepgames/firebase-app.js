import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import {
    getAuth, GoogleAuthProvider, signInWithPopup,
    createUserWithEmailAndPassword, signInWithEmailAndPassword,
    signOut, onAuthStateChanged, sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import {
    getFirestore, doc, setDoc, getDoc, serverTimestamp,
    updateDoc, increment, collection, getDocs, query, orderBy, limit
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCwmLK8oB0gxqXU-96b6avE1wIRyy4uyME",
    authDomain: "gamingnest-accounts.firebaseapp.com",
    projectId: "gamingnest-accounts",
    storageBucket: "gamingnest-accounts.firebasestorage.app",
    messagingSenderId: "23653785300",
    appId: "1:23653785300:web:4e3295b19556e0a312e541",
    measurementId: "G-HBLK0LF7PB"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const firestore = getFirestore(app);

// ==========================================
// GLOBALE GAME FUNCTIES (Werkt in álle games!)
// ==========================================

// Sla game data op (met automatische filtering van undefined)
window.saveGameData = async function(gameId, dataToSave) {
    const user = auth.currentUser;
    if (!user) {
        console.log("Gast-speler: Niet opgeslagen in cloud.");
        return false;
    }
    try {
        // Filtert alle 'undefined' waarden weg zodat Firebase nooit meer crasht
        const cleanData = JSON.parse(JSON.stringify(dataToSave));

        const gameRef = doc(firestore, "users", user.uid, "games", gameId);
        await setDoc(gameRef, {
            ...cleanData,
            lastSave: cleanData.lastSave || Date.now(),
            serverUpdatedAt: serverTimestamp()
        }, { merge: true });
        console.log(`Cloud Save gelukt voor ${gameId}!`);
        return true;
    } catch (error) {
        console.error("Save error:", error);
        return false;
    }
};

// Laad game data in
window.loadGameData = async function(gameId) {
    return new Promise((resolve) => {
        // Wacht tot Firebase klaar is met controleren of iemand is ingelogd
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            unsubscribe(); // Sluit listener direct af na de eerste check
            if (!user) {
                resolve(null);
                return;
            }
            try {
                const gameRef = doc(firestore, "users", user.uid, "games", gameId);
                const docSnap = await getDoc(gameRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    console.log(`Cloud Save geladen voor ${gameId}!`, data);
                    resolve(data);
                } else {
                    resolve(null);
                }
            } catch (error) {
                console.error("Load error:", error);
                resolve(null);
            }
        });
    });
};

// ==========================================
// ACCOUNT UI LOGICA (Alleen actief als knoppen bestaan)
// ==========================================
const googleBtn = document.getElementById("google-login");
const submitBtn = document.getElementById("account-submit");
const resetBtn = document.getElementById("account-reset");
let accountBusy = false;
let accountReady = false;
function setAccountBusy(busy) {
    accountBusy = busy;
    for (const button of [submitBtn, googleBtn, resetBtn]) if (button) button.disabled = busy || !accountReady;
    const switchButton = document.getElementById("account-switch-button");
    if (switchButton) switchButton.disabled = busy;
}
function clearAccountMessage() {
    const box = document.getElementById("account-error");
    if (box) { box.style.display = "none"; box.textContent = ""; }
}
function accountMessage(text) {
    const box = document.getElementById("account-error");
    if (box) { box.textContent = text; box.style.display = "block"; }
}
// Authentication succeeds independently of the optional Firestore profile write.
function afterSignIn(user) {
    updateAccountUI(user);
    Promise.resolve().then(() => createUserDocument(user)).catch(() => {
        console.warn("Account profile could not be initialized; authentication remains active.");
    });
}
async function runAccountAction(action) {
    if (accountBusy || !accountReady) return;
    clearAccountMessage();
    setAccountBusy(true);
    try { await action(); } catch (error) { showAccountError(error); }
    finally { setAccountBusy(false); }
}
if (googleBtn) {
    const provider = new GoogleAuthProvider();
    googleBtn.addEventListener("click", () => runAccountAction(async () => {
        const result = await signInWithPopup(auth, provider);
        afterSignIn(result.user);
    }));
}
if (submitBtn) {
    submitBtn.addEventListener("click", () => runAccountAction(async () => {
        const email = document.getElementById("account-email")?.value.trim() || "";
        const password = document.getElementById("account-password")?.value || "";
        if (!email || !password) { accountMessage("Enter your email and password."); return; }
        const mode = window.accountMode;
        if (mode !== "signup" && mode !== "login") {
            accountMessage("The account form is not ready. Please reload the page."); return;
        }
        const result = mode === "signup"
            ? await createUserWithEmailAndPassword(auth, email, password)
            : await signInWithEmailAndPassword(auth, email, password);
        afterSignIn(result.user);
    }));
}
for (const id of ["account-email", "account-password"]) {
    document.getElementById(id)?.addEventListener("keydown", event => {
        if (event.key === "Enter" && submitBtn && !submitBtn.disabled) { event.preventDefault(); submitBtn.click(); }
    });
}
if (resetBtn) {
    resetBtn.addEventListener("click", () => runAccountAction(async () => {
        const email = document.getElementById("account-email")?.value.trim() || "";
        if (!email) { accountMessage("Enter your email address first."); return; }
        try { await sendPasswordResetEmail(auth, email); }
        catch (error) { if (error?.code !== "auth/user-not-found") throw error; }
        accountMessage("If an account exists for this email, a reset email may arrive shortly.");
    }));
}

async function createUserDocument(user) {
    const userRef = doc(firestore, "users", user.uid);
    const userSnapshot = await getDoc(userRef);
    if (!userSnapshot.exists()) {
        await setDoc(userRef, {
            email: user.email || "",
            displayName: user.displayName || "",
            photoURL: user.photoURL || "",
            createdAt: serverTimestamp(),
        });
    }
}

let accountWasSignedIn = false;
const originalAccountSwitch = document.querySelector(".account-switch")?.innerHTML;
setAccountBusy(false);
onAuthStateChanged(auth, (user) => {
    accountReady = true;
    setAccountBusy(accountBusy);
    if (!document.getElementById("account-title")) return;
    if (user) {
        accountWasSignedIn = true;
        updateAccountUI(user);
    } else if (accountWasSignedIn) {
        accountWasSignedIn = false;
        restoreSignedOutAccountUI();
    }
}, () => {
    accountReady = false;
    setAccountBusy(accountBusy);
    accountMessage("Account service is unavailable. Please reload and try again.");
});

function restoreSignedOutAccountUI() {
    const title = document.getElementById("account-title");
    const subtitle = document.getElementById("account-subtitle");
    const submit = document.getElementById("account-submit");
    const login = window.accountMode === "login";
    if (title) title.innerText = login ? "Welcome back" : "Create your account";
    if (subtitle) subtitle.innerText = login ? "Log in to continue your GamingNest journey." : "Create an account or log in to GamingNest.";
    if (submit) submit.innerText = login ? "Log In" : "Create Account";
    for (const el of [submit, resetBtn, googleBtn, document.querySelector(".account-divider"), document.getElementById("account-email"), document.getElementById("account-password")]) {
        if (el) el.style.display = "";
    }
    const switchBox = document.querySelector(".account-switch");
    if (switchBox && originalAccountSwitch !== undefined) {
        switchBox.innerHTML = originalAccountSwitch;
        const text = document.getElementById("account-switch-text");
        const button = document.getElementById("account-switch-button");
        if (text) text.innerText = login ? "Don't have an account?" : "Already have an account?";
        if (button) button.innerText = login ? "Create account" : "Log in";
        if (button) button.disabled = accountBusy;
    }
    const password = document.getElementById("account-password");
    if (password) password.autocomplete = login ? "current-password" : "new-password";
    clearAccountMessage();
}

function updateAccountUI(user) {
    const title = document.getElementById("account-title");
    if (!title) return;
    
    title.innerText = "Welcome back!";
    
    const subtitle = document.getElementById("account-subtitle");
    if (subtitle) subtitle.innerText = user.email || user.displayName || "GamingNest player";
    
    const submit = document.getElementById("account-submit");
    if (submit) submit.style.display = "none";
    
    const reset = document.getElementById("account-reset");
    if (reset) reset.style.display = "none";

    const google = document.getElementById("google-login");
    if (google) google.style.display = "none";
    
    const divider = document.querySelector(".account-divider");
    if (divider) divider.style.display = "none";
    
    const emailEl = document.getElementById("account-email");
    if (emailEl) emailEl.style.display = "none";
    
    const passEl = document.getElementById("account-password");
    if (passEl) { passEl.value = ""; passEl.style.display = "none"; }
    
    const switchBox = document.querySelector(".account-switch");
    if (switchBox) {
        switchBox.innerHTML = `<button type="button" id="logout-button" class="account-switch-button cursor-pointer text-red-400 hover:underline">Log out</button>`;
        const logoutBtn = document.getElementById("logout-button");
        if (logoutBtn) {
            logoutBtn.addEventListener("click", async () => {
                try { await signOut(auth); }
                catch (error) { showAccountError(error); }
            });
        }
    }
}

function showAccountError(error) {
    const messages = {
        "auth/invalid-email": "Enter a valid email address.",
        "auth/invalid-credential": "Email or password is incorrect.",
        "auth/wrong-password": "Email or password is incorrect.",
        "auth/user-not-found": "Email or password is incorrect.",
        "auth/email-already-in-use": "This email is already in use. Try logging in instead.",
        "auth/weak-password": "Choose a stronger password.",
        "auth/user-disabled": "This account is disabled.",
        "auth/operation-not-allowed": "This sign-in method is unavailable. Please contact support.",
        "auth/too-many-requests": "Too many attempts. Please try again later.",
        "auth/network-request-failed": "Network error. Check your connection and try again.",
        "auth/popup-closed-by-user": "The Google sign-in window was closed.",
        "auth/unauthorized-domain": "Sign-in is not available on this domain. Please contact support."
    };
    accountMessage(messages[error?.code] || "Sign-in could not be completed. Please try again.");
}
// ==========================================
// EXPORTS VOOR INDEX.HTML (Stats & Hall of Fame)
// ==========================================
export { updateDoc, increment, doc, getDoc, setDoc, collection, getDocs, query, orderBy, limit };