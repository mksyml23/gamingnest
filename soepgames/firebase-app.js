import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, serverTimestamp, updateDoc, increment, collection, getDocs, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const firebaseConfig = { apiKey: "AIzaSyCwmLK8oB0gxqXU-96b6avE1wIRyy4uyME", authDomain: "gamingnest-accounts.firebaseapp.com", projectId: "gamingnest-accounts", storageBucket: "gamingnest-accounts.firebasestorage.app", messagingSenderId: "23653785300", appId: "1:23653785300:web:4e3295b19556e0a312e541", measurementId: "G-HBLK0LF7PB" };
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const firestore = getFirestore(app);
export { updateDoc, increment, doc, getDoc, setDoc, collection, getDocs, query, orderBy, limit };

window.saveGameData = async (gameId, dataToSave) => {
  const user = auth.currentUser;
  if (!user) return false;
  try {
    const cleanData = JSON.parse(JSON.stringify(dataToSave));
    await setDoc(doc(firestore, "users", user.uid, "games", gameId), { ...cleanData, lastSave: cleanData.lastSave || Date.now(), serverUpdatedAt: serverTimestamp() }, { merge: true });
    return true;
  } catch (error) { console.error("Cloud save error", error); return false; }
};
window.loadGameData = (gameId) => new Promise((resolve) => {
  const unsubscribe = onAuthStateChanged(auth, async (user) => {
    unsubscribe();
    if (!user) return resolve(null);
    try { const snapshot = await getDoc(doc(firestore, "users", user.uid, "games", gameId)); resolve(snapshot.exists() ? snapshot.data() : null); }
    catch (error) { console.error("Cloud load error", error); resolve(null); }
  });
});

const copy = {
  en: { langLabel: "Language", subtitle: "Because you should be doing your homework.", seoTitle: "Play Free Games Online Without Downloading", seoText: "Play free online browser games instantly. No downloads. Just click and play action, idle, strategy and multiplayer games.", games: "{count} games ready to play", accountTitle: "Create your account", accountIntro: "Save your progress across GamingNest.", google: "Continue with Google", or: "OR", email: "Email address", password: "Password", create: "Create account", haveAccount: "Already have an account?", login: "Log in", noAccount: "New here?", logout: "Log out", welcome: "Welcome back!", guest: "GamingNest player", play: "PLAY", playNow: "PLAY NOW", popular: "Popular", liked: "Most Liked", newest: "New", all: "All Games", search: "Search free browser games...", invalid: "Enter a valid email address.", passwordShort: "Your password needs at least 6 characters.", working: "One moment...", popup: "Google sign-in could not open here. Redirecting you securely instead...", emailInUse: "That email already has an account. Try logging in instead.", wrongPassword: "That email or password is incorrect.", notFound: "No account exists for that email yet.", network: "Connection problem. Check your internet and try again.", generic: "Something went wrong. Please try again." },
  nl: { langLabel: "Taal", subtitle: "Omdat je eigenlijk huiswerk hoort te maken.", seoTitle: "Speel gratis games online, zonder downloaden", seoText: "Speel gratis browsergames meteen in je browser. Geen downloads. Klik en speel actie-, idle-, strategie- en multiplayergames.", games: "{count} games klaar om te spelen", accountTitle: "Maak je account", accountIntro: "Bewaar je voortgang op heel GamingNest.", google: "Doorgaan met Google", or: "OF", email: "E-mailadres", password: "Wachtwoord", create: "Account maken", haveAccount: "Heb je al een account?", login: "Inloggen", noAccount: "Nieuw hier?", logout: "Uitloggen", welcome: "Welkom terug!", guest: "GamingNest-speler", play: "SPELEN", playNow: "NU SPELEN", popular: "Populair", liked: "Meest geliket", newest: "Nieuw", all: "Alle games", search: "Zoek gratis browsergames...", invalid: "Vul een geldig e-mailadres in.", passwordShort: "Je wachtwoord moet minstens 6 tekens hebben.", working: "Momentje...", popup: "Google-inloggen kan hier niet als pop-up openen. Je wordt veilig doorgestuurd...", emailInUse: "Dit e-mailadres heeft al een account. Probeer in te loggen.", wrongPassword: "Dit e-mailadres of wachtwoord klopt niet.", notFound: "Er bestaat nog geen account met dit e-mailadres.", network: "Verbindingsprobleem. Controleer je internet en probeer opnieuw.", generic: "Er ging iets mis. Probeer het opnieuw." }
};
const locale = () => document.getElementById("language-select")?.value || localStorage.getItem("gn_locale") || "en";
const text = (key, values = {}) => (copy[locale()] || copy.en)[key].replace(/\{(\w+)\}/g, (_, name) => values[name] ?? "");
const setText = (selector, value) => { const node = document.querySelector(selector); if (node) node.textContent = value; };
const replaceText = (root, replacements) => {
  if (!root) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  [...Array.from({ length: 0 })];
  const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach((node) => { const source = node.nodeValue; const trimmed = source.trim(); if (replacements[trimmed]) node.nodeValue = source.replace(trimmed, replacements[trimmed]); });
};
function applyLocale() {
  const picker = document.getElementById("language-select");
  if (!picker) return;
  const active = locale();
  document.documentElement.lang = active;
  picker.setAttribute("aria-label", text("langLabel"));
  picker.title = text("langLabel");
  setText("#funny-subtitle", text("subtitle"));
  setText("header .hero-desc h2", text("seoTitle"));
  const heroText = document.querySelector("header .hero-desc p"); if (heroText) heroText.textContent = text("seoText");
  const summary = document.getElementById("results-summary"); if (summary) { const count = document.querySelectorAll(".game-card").length || document.querySelectorAll("article").length; summary.textContent = text("games", { count }); }
  const search = document.getElementById("search"); if (search) search.placeholder = text("search");
  replaceText(document.querySelector(".categories"), { Popular: text("popular"), "Most Liked": text("liked"), New: text("newest"), "All Games": text("all") });
  replaceText(document, { PLAY: text("play"), "PLAY NOW": text("playNow") });
  refreshAccountCopy();
}
function installLanguageUI() {
  const style = document.createElement("style");
  style.textContent = `#language-select.language-select{appearance:none!important;position:fixed!important;top:16px!important;left:16px!important;z-index:1000!important;min-width:88px!important;padding:10px 34px 10px 14px!important;border-radius:14px!important;border:1px solid rgba(117,221,255,.62)!important;background:linear-gradient(135deg,rgba(13,25,48,.96),rgba(8,12,25,.96))!important;color:#f5fbff!important;font:800 .76rem/1 Poppins,Arial,sans-serif!important;letter-spacing:.08em!important;box-shadow:0 10px 28px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.14)!important;background-image:linear-gradient(45deg,transparent 50%,#75ddff 50%),linear-gradient(135deg,#75ddff 50%,transparent 50%),linear-gradient(135deg,rgba(13,25,48,.96),rgba(8,12,25,.96))!important;background-position:calc(100% - 16px) 15px,calc(100% - 11px) 15px,0 0!important;background-size:5px 5px,5px 5px,100% 100%!important;background-repeat:no-repeat!important}#language-select.language-select:hover{border-color:#fff!important;transform:translateY(-1px)}#language-select.language-select:focus-visible{outline:3px solid #fff!important;outline-offset:3px!important}@media(max-width:650px){#language-select.language-select{top:12px!important;left:12px!important;min-width:76px!important;padding:9px 30px 9px 12px!important}}`;
  document.head.append(style);
  const picker = document.getElementById("language-select");
  if (picker) picker.addEventListener("change", () => setTimeout(applyLocale, 0));
  window.addEventListener("load", () => { applyLocale(); new MutationObserver(() => requestAnimationFrame(applyLocale)).observe(document.body, { childList: true, subtree: true }); });
}

let accountMode = "signup";
const account = () => ({ title: document.getElementById("account-title"), subtitle: document.getElementById("account-subtitle"), error: document.getElementById("account-error"), google: document.getElementById("google-login"), email: document.getElementById("account-email"), password: document.getElementById("account-password"), submit: document.getElementById("account-submit"), divider: document.querySelector(".account-divider"), switchBox: document.querySelector(".account-switch"), switchText: document.getElementById("account-switch-text"), switchButton: document.getElementById("account-switch-button") });
function showAccountError(error) {
  const box = account().error; if (!box) return;
  const codes = { "auth/email-already-in-use": "emailInUse", "auth/invalid-credential": "wrongPassword", "auth/wrong-password": "wrongPassword", "auth/user-not-found": "notFound", "auth/network-request-failed": "network" };
  box.textContent = text(codes[error?.code] || "generic"); box.style.display = "block";
}
function clearAccountError() { const box = account().error; if (box) { box.textContent = ""; box.style.display = "none"; } }
function setBusy(busy) { const { submit, google } = account(); [submit, google].filter(Boolean).forEach((button) => { button.disabled = busy; button.dataset.label ||= button.textContent; if (busy) button.textContent = text("working"); else button.textContent = button.dataset.label; }); }
async function ensureProfile(user) { try { const ref = doc(firestore, "users", user.uid); if (!(await getDoc(ref)).exists()) await setDoc(ref, { email: user.email || "", displayName: user.displayName || "", photoURL: user.photoURL || "", createdAt: serverTimestamp() }); } catch (error) { console.warn("Profile setup skipped", error); } }
function showSignedOut() {
  const ui = account(); if (!ui.title) return;
  ui.title.textContent = accountMode === "signup" ? text("accountTitle") : text("login");
  if (ui.subtitle) ui.subtitle.textContent = accountMode === "signup" ? text("accountIntro") : text("accountIntro");
  if (ui.google) { ui.google.style.display = ""; ui.google.innerHTML = `<i class="fab fa-google"></i>&nbsp; ${text("google")}`; }
  if (ui.divider) ui.divider.style.display = "";
  if (ui.email) { ui.email.style.display = ""; ui.email.placeholder = text("email"); }
  if (ui.password) { ui.password.style.display = ""; ui.password.placeholder = text("password"); ui.password.autocomplete = accountMode === "signup" ? "new-password" : "current-password"; }
  if (ui.submit) { ui.submit.style.display = ""; ui.submit.textContent = accountMode === "signup" ? text("create") : text("login"); }
  if (ui.switchBox) ui.switchBox.innerHTML = `<span id="account-switch-text">${accountMode === "signup" ? text("haveAccount") : text("noAccount")}</span> <button id="account-switch-button" class="account-switch-button" type="button">${accountMode === "signup" ? text("login") : text("create")}</button>`;
  document.getElementById("account-switch-button")?.addEventListener("click", () => { accountMode = accountMode === "signup" ? "login" : "signup"; clearAccountError(); showSignedOut(); });
}
function updateAccountUI(user) {
  const ui = account(); if (!ui.title) return;
  clearAccountError(); ui.title.textContent = text("welcome"); if (ui.subtitle) ui.subtitle.textContent = user.email || user.displayName || text("guest");
  [ui.google, ui.divider, ui.email, ui.password, ui.submit].filter(Boolean).forEach((node) => node.style.display = "none");
  if (ui.switchBox) { ui.switchBox.innerHTML = `<button id="logout-button" class="account-switch-button" type="button">${text("logout")}</button>`; document.getElementById("logout-button")?.addEventListener("click", async () => { await signOut(auth); showSignedOut(); }); }
}
function refreshAccountCopy() { if (auth.currentUser) updateAccountUI(auth.currentUser); else showSignedOut(); }
async function emailSignIn() {
  const { email, password } = account(); const address = email?.value.trim() || ""; const secret = password?.value || ""; clearAccountError();
  if (!/^\S+@\S+\.\S+$/.test(address)) return showAccountError({ code: "invalid" }), account().error.textContent = text("invalid");
  if (secret.length < 6) return showAccountError({ code: "invalid" }), account().error.textContent = text("passwordShort");
  setBusy(true); try { const result = accountMode === "signup" ? await createUserWithEmailAndPassword(auth, address, secret) : await signInWithEmailAndPassword(auth, address, secret); await ensureProfile(result.user); updateAccountUI(result.user); } catch (error) { showAccountError(error); } finally { setBusy(false); }
}
async function googleSignIn() {
  clearAccountError(); const provider = new GoogleAuthProvider(); provider.setCustomParameters({ prompt: "select_account" }); setBusy(true);
  try { const result = await signInWithPopup(auth, provider); await ensureProfile(result.user); updateAccountUI(result.user); }
  catch (error) { if (["auth/popup-blocked", "auth/operation-not-supported-in-this-environment"].includes(error.code)) { const box = account().error; if (box) { box.textContent = text("popup"); box.style.display = "block"; } await signInWithRedirect(auth, provider); return; } showAccountError(error); } finally { setBusy(false); }
}
function installAccountUI() {
  const ui = account(); if (!ui.title) return;
  if (ui.google) { ui.google.type = "button"; ui.google.addEventListener("click", googleSignIn); }
  if (ui.submit) { ui.submit.type = "button"; ui.submit.addEventListener("click", emailSignIn); }
  [ui.email, ui.password].filter(Boolean).forEach((input) => input.addEventListener("keydown", (event) => { if (event.key === "Enter") { event.preventDefault(); emailSignIn(); } }));
  getRedirectResult(auth).then(async (result) => { if (result?.user) { await ensureProfile(result.user); updateAccountUI(result.user); } }).catch(showAccountError);
  onAuthStateChanged(auth, (user) => user ? updateAccountUI(user) : showSignedOut());
}
installLanguageUI();
installAccountUI();
