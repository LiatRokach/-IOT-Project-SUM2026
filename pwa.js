const installButton = document.getElementById("installButton");
const installHelp = document.getElementById("installHelp");
const offlineNotice = document.getElementById("offlineNotice");
let installPrompt;
const standalone = window.matchMedia("(display-mode: standalone)");
const isAppleMobile = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

function updateInstallButton() {
  installButton.hidden = standalone.matches || navigator.standalone || (!installPrompt && !isAppleMobile);
}
window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  installPrompt = event;
  updateInstallButton();
});
installButton.addEventListener("click", async () => {
  if (installPrompt) {
    await installPrompt.prompt();
    await installPrompt.userChoice;
    installPrompt = null;
    updateInstallButton();
  } else {
    installHelp.hidden = !installHelp.hidden;
  }
});
window.addEventListener("appinstalled", () => {
  installPrompt = null;
  installButton.hidden = true;
  installHelp.hidden = true;
});
standalone.addEventListener("change", updateInstallButton);
updateInstallButton();

function updateNetworkNotice() { offlineNotice.hidden = navigator.onLine; }
window.addEventListener("online", updateNetworkNotice);
window.addEventListener("offline", updateNetworkNotice);
updateNetworkNotice();

if ("serviceWorker" in navigator && window.isSecureContext) {
  navigator.serviceWorker.register("/sw.js").catch(() => {
    installHelp.textContent = "Offline setup couldn’t finish. Reopen the app when connected to the internet.";
    installHelp.hidden = false;
  });
}
