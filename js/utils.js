// Small DOM + helper utilities

function hpSetStatus(message, isError = false) {
  const el = document.getElementById("status");
  if (!el) return;
  el.textContent = message || "";
  el.style.color = isError ? "#ff6666" : "#44ff88";
}
