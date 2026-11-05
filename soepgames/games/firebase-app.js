import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import {
    getAuth, GoogleAuthProvider, signInWithPopup,
    createUserWithEmailAndPassword, signInWithEmailAndPassword,
    signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import {
    getFirestore, doc, setDoc, getDoc, serverTimestamp
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
if (googleBtn) {
    const provider = new GoogleAuthProvider();
    googleBtn.addEventListener("click", async () => {
        try {
            const result = await signInWithPopup(auth, provider);
            await createUserDocument(result.user);
            updateAccountUI(result.user);
        } catch (error) {
            showAccountError(error);
        }
    });
}

const submitBtn = document.getElementById("account-submit");
if (submitBtn) {
    submitBtn.addEventListener("click", async () => {
        const emailInput = document.getElementById("account-email");
        const passwordInput = document.getElementById("account-password");
        
        const email = emailInput ? emailInput.value.trim() : "";
        const password = passwordInput ? passwordInput.value : "";

        if (!email || !password) {
            showAccountError({ message: "Vul een email en wachtwoord in." });
            return;
        }

        try {
            let result;
            if (window.accountMode === "signup") {
                result = await createUserWithEmailAndPassword(auth, email, password);
            } else {
                result = await signInWithEmailAndPassword(auth, email, password);
            }
            await createUserDocument(result.user);
            updateAccountUI(result.user);
        } catch (error) {
            showAccountError(error);
        }
    });
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

onAuthStateChanged(auth, (user) => {
    if (user && document.getElementById("account-title")) {
        updateAccountUI(user);
    }
});

function updateAccountUI(user) {
    const title = document.getElementById("account-title");
    if (!title) return;
    
    title.innerText = "Welcome back!";
    
    const subtitle = document.getElementById("account-subtitle");
    if (subtitle) subtitle.innerText = user.email || user.displayName || "GamingNest player";
    
    const submit = document.getElementById("account-submit");
    if (submit) submit.style.display = "none";
    
    const google = document.getElementById("google-login");
    if (google) google.style.display = "none";
    
    const divider = document.querySelector(".account-divider");
    if (divider) divider.style.display = "none";
    
    const emailEl = document.getElementById("account-email");
    if (emailEl) emailEl.style.display = "none";
    
    const passEl = document.getElementById("account-password");
    if (passEl) passEl.style.display = "none";
    
    const switchBox = document.querySelector(".account-switch");
    if (switchBox) {
        switchBox.innerHTML = `<span id="logout-button" class="account-switch-button cursor-pointer text-red-400 hover:underline">Log out</span>`;
        const logoutBtn = document.getElementById("logout-button");
        if (logoutBtn) {
            logoutBtn.addEventListener("click", async () => {
                await signOut(auth);
                location.reload();
            });
        }
    }
}

function showAccountError(error) {
    const errorBox = document.getElementById("account-error");
    if (errorBox) {
        errorBox.style.display = "block";
        errorBox.innerText = error.message || "Something went wrong.";
    }
}