
// Debug Overlay System
(function(){
  // Add ?debug=1 support
  const params = new URLSearchParams(window.location.search);
  if(params.get("debug") === "1"){
    HP_CONFIG.DEBUG_MODE = true;
  }

  function ensureOverlay(){
    let d=document.getElementById("hp-debug");
    if(!d){
      d=document.createElement("div");
      d.id="hp-debug";
      d.style.cssText="position:fixed;top:10px;right:10px;background:rgba(0,0,0,0.6);color:#0f0;padding:8px;font-size:12px;z-index:9999;white-space:pre;font-family:monospace;max-width:220px;border:1px solid #0f0;border-radius:6px;";
      document.body.appendChild(d);
    }
    return d;
  }

  window.hpDebugRender = function(){
    if(!HP_CONFIG.DEBUG_MODE){
      const d=document.getElementById("hp-debug");
      if(d) d.style.display="none";
      return;
    }
    const d=ensureOverlay();
    d.style.display="block";

    let loc = HP_STATE?.currentLocation || "(unknown)";
    let s = "DEBUG MODE\n";
    s += "Location: " + loc + "\n\n";
    for(const c in HP_AFFINITY){
      s += c + ": " + HP_AFFINITY[c] + "\n";
    }
    d.textContent = s;
  };

  // Keyboard toggle
  document.addEventListener("keydown",(e)=>{
    if(e.key==="D" && e.shiftKey){
      HP_CONFIG.DEBUG_MODE = !HP_CONFIG.DEBUG_MODE;
      hpDebugRender();
    }
  });

  // Activate after DOM load
  document.addEventListener("DOMContentLoaded",()=>{
    if(HP_CONFIG.DEBUG_MODE) hpDebugRender();
  });
})();
