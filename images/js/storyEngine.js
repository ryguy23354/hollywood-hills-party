import {el} from './utils.js';
import {resolveImage} from './imageResolver.js';

async function loadJSON(path){ return fetch(path).then(r=>r.json()); }

let story={};

async function init(){
  story.main = await loadJSON('main_story.json');
  renderScene('scene_00_intro');
}

function renderScene(id){
  const scene = story.main[id];
  const app = document.getElementById('app');
  app.innerHTML = '';

  if(!scene){
    app.textContent = 'Scene not found: ' + id;
    return;
  }

  app.append(el('h1',{},[scene.id||id]));
  app.append(el('p',{},[scene.text||'']));

  const img = el('img',{src: resolveImage(scene.image)});
  app.append(img);

  if(scene.choices){
    for(const [label,next] of Object.entries(scene.choices)){
      const b = el('div',{class:'choice'},[label.replace(/_/g,' ')]);
      b.onclick = ()=> renderScene(next);
      app.append(b);
    }
  }
}

window.addEventListener('DOMContentLoaded', init);
