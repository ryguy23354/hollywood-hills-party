
// Main routing logic
import { StoryEngine } from './storyEngine.js';
import { HP_STATE } from './state.js';

let currentCharacter = null;

export async function startGame() {
    await StoryEngine.loadScenes();
    loadScene('scene_00_intro');
}

export function loadScene(sceneId) {
    const scene = StoryEngine.getScene(sceneId, currentCharacter);
    if (!scene) {
        console.error("Missing scene:", sceneId);
        return;
    }

    renderScene(scene);
}

export function chooseOption(option) {
    if (currentCharacter && option.effect) {
        StoryEngine.applyChoice(currentCharacter, option.effect);
    }

    if (option.nextSceneId) {
        loadScene(option.nextSceneId);
    }
}

function renderScene(scene) {
    const container = document.getElementById('story');
    container.innerHTML = `
        <h2>${scene.title}</h2>
        <p>${scene.text}</p>
        <div class="options"></div>
    `;

    const optionsDiv = container.querySelector('.options');
    scene.options.forEach(opt => {
        const btn = document.createElement('button');
        btn.textContent = opt.text;
        btn.onclick = () => chooseOption(opt);
        optionsDiv.appendChild(btn);
    });
}

export function setActiveCharacter(name) {
    currentCharacter = name;
    HP_STATE.resetFor(name);
}
