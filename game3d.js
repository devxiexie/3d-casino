let scene, camera, renderer;
let machineGroup, leverGroup, reels = [];
let raycaster, mouse;
let isDraggingLever = false;
let isDraggingScene = false;
let previousMousePosition = { x: 0, y: 0 };
let cameraAngleX = 0;
let cameraAngleY = 0;
let isSpinning = false;
let blinkingLights = [];
let targetZoom = 24;

const SYMBOL_DATA = {
    '1': { value: 1000, weight: 2 },
    '2': { value: 500, weight: 5 },
    '3': { value: 200, weight: 10 },
    '4': { value: 100, weight: 15 },
    '5': { value: 50, weight: 20 },
    '6': { value: 10, weight: 60 }
};
const SYMBOLS = Object.keys(SYMBOL_DATA);

const SYMBOL_IMAGES = {
    '1': 'assets/08.png',
    '2': 'assets/09.png',
    '3': 'assets/10.png',
    '4': 'assets/11.png',
    '5': 'assets/12.png',
    '6': 'assets/13.png',
};
const loadedImages = {};

const REEL_RADIUS = 2.2; 
const REEL_WIDTH = 1.8;
const SEGMENTS = 48; 
const SYMBOLS_PER_REEL = 8; 
const ANGLE_PER_SYMBOL = (Math.PI * 2) / SYMBOLS_PER_REEL;

function createNoiseTexture(width = 512, height = 512, color1 = '#aa0000', color2 = '#880000') {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = color1;
    ctx.fillRect(0, 0, width, height);
    
    for(let i=0; i<80000; i++) {
        ctx.fillStyle = Math.random() > 0.5 ? color2 : '#ffffff'; 
        ctx.globalAlpha = 0.05;
        const x = Math.random() * width;
        const y = Math.random() * height;
        const s = Math.random() * 2 + 1;
        ctx.fillRect(x, y, s, s);
    }
    
    return new THREE.CanvasTexture(canvas);
}

function createBrushedMetalTexture(color = '#dddddd') {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 512, 512);
    
    for(let i=0; i<10000; i++) {
        const gray = Math.floor(Math.random() * 50 + 200);
        ctx.fillStyle = `rgb(${gray},${gray},${gray})`;
        ctx.globalAlpha = 0.1;
        
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        const w = Math.random() * 100 + 50;
        const h = Math.random() * 2 + 1;
        
        ctx.fillRect(x, y, w, h);
    }
    
    return new THREE.CanvasTexture(canvas);
}

function createRoundedExtrusion(width, height, depth, radius) {
    const shape = new THREE.Shape();
    const x = -width / 2;
    const y = -height / 2;
    
    shape.moveTo(x + radius, y);
    shape.lineTo(x + width - radius, y);
    shape.quadraticCurveTo(x + width, y, x + width, y + radius);
    shape.lineTo(x + width, y + height - radius);
    shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    shape.lineTo(x + radius, y + height);
    shape.quadraticCurveTo(x, y + height, x, y + height - radius);
    shape.lineTo(x, y + radius);
    shape.quadraticCurveTo(x, y, x + radius, y);
    
    const extrudeSettings = {
        steps: 2,
        depth: depth,
        bevelEnabled: true,
        bevelThickness: 0.1,
        bevelSize: 0.1,
        bevelOffset: 0,
        bevelSegments: 4
    };
    
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geometry.center();
    return geometry;
}

async function init() {
    await loadAssets();
    
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050505);
    scene.fog = new THREE.Fog(0x000000, 15, 60);

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 1, 18);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ antialias: false });
    const pixelRatio = 4;
    renderer.setSize(window.innerWidth / pixelRatio, window.innerHeight / pixelRatio, false);
    renderer.shadowMap.enabled = true;
    renderer.outputEncoding = THREE.sRGBEncoding;
    document.getElementById('game-container').appendChild(renderer.domElement);

    setupLighting();

    buildMachine();
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();
    window.addEventListener('resize', onWindowResize, false);
    window.addEventListener('mousedown', onMouseDown, false);
    window.addEventListener('mouseup', onMouseUp, false);
    window.addEventListener('mousemove', onMouseMove, false);
    window.addEventListener('wheel', onMouseWheel, { passive: false });

    animate();
}

function setupLighting() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambientLight);

    const mainSpot = new THREE.SpotLight(0xffaa00, 1.5);
    mainSpot.position.set(5, 15, 15);
    mainSpot.castShadow = true;
    mainSpot.angle = 0.5;
    mainSpot.penumbra = 0.5;
    scene.add(mainSpot);

    const blueRim = new THREE.DirectionalLight(0x0000ff, 1.0);
    blueRim.position.set(-10, 5, -5);
    scene.add(blueRim);

    const redRim = new THREE.DirectionalLight(0xff0000, 0.8);
    redRim.position.set(10, 5, -5);
    scene.add(redRim);
}

function buildMachine() {
    machineGroup = new THREE.Group();
    scene.add(machineGroup);

    const redNoiseTex = createNoiseTexture(512, 512, '#aa0000', '#660000');
    const brushedGoldTex = createBrushedMetalTexture('#ffd700');
    const brushedChromeTex = createBrushedMetalTexture('#cccccc');

    const chromeMat = new THREE.MeshStandardMaterial({ 
        color: 0xffffff, 
        map: brushedChromeTex,
        metalness: 0.9, 
        roughness: 0.2 
    });
    const goldMat = new THREE.MeshStandardMaterial({ 
        color: 0xffd700, 
        map: brushedGoldTex,
        metalness: 0.8, 
        roughness: 0.3 
    });
    const redPaintMat = new THREE.MeshStandardMaterial({ 
        color: 0xaa0000, 
        map: redNoiseTex,
        bumpMap: redNoiseTex,
        bumpScale: 0.02,
        roughness: 0.4, 
        metalness: 0.1 
    });
    const blackMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });

    const bodyGeo = createRoundedExtrusion(9, 7, 5, 0.5);
    const body = new THREE.Mesh(bodyGeo, redPaintMat);
    body.position.y = 0;
    body.castShadow = true;
    machineGroup.add(body);

    const shelfGeo = createRoundedExtrusion(9.5, 1, 3, 0.2);
    const shelf = new THREE.Mesh(shelfGeo, chromeMat);
    shelf.position.set(0, -3.5, 2.5);
    shelf.rotation.x = 0.2;
    machineGroup.add(shelf);
    
    const shelfPanelGeo = createRoundedExtrusion(8.5, 0.1, 2, 0.1);
    const shelfPanel = new THREE.Mesh(shelfPanelGeo, blackMat);
    shelfPanel.position.set(0, 0.55, 0);
    shelfPanel.rotation.x = -Math.PI / 2;
    shelf.add(shelfPanel);

    const baseGeo = new THREE.CylinderGeometry(5.5, 6, 3, 64); 
    const base = new THREE.Mesh(baseGeo, blackMat);
    base.position.y = -5;
    machineGroup.add(base);

    const topGroup = new THREE.Group();
    topGroup.position.y = 4.5;
    machineGroup.add(topGroup);

    const archGeo = new THREE.CylinderGeometry(4, 4, 8, 32, 1, false, 0, Math.PI);
    archGeo.rotateZ(Math.PI / 2);
    const arch = new THREE.Mesh(archGeo, redPaintMat);
    arch.position.y = 0;
    topGroup.add(arch);
    
    const archBackGeo = new THREE.BoxGeometry(8, 4, 4);
    const archBack = new THREE.Mesh(archBackGeo, redPaintMat);
    archBack.position.y = -2;
    topGroup.add(archBack);

    const topFaceGeo = new THREE.PlaneGeometry(7, 3);
    const topFaceMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x222222, side: THREE.DoubleSide });
    const topFace = new THREE.Mesh(topFaceGeo, topFaceMat);
    topFace.position.set(0, 0, 2.1);
    topGroup.add(topFace);
    
    const trimGeo = new THREE.CylinderGeometry(0.2, 0.2, 7, 16);
    const leftTrim = new THREE.Mesh(trimGeo, goldMat);
    leftTrim.position.set(-4.6, 0, 2.6);
    machineGroup.add(leftTrim);
    
    const rightTrim = new THREE.Mesh(trimGeo, goldMat);
    rightTrim.position.set(4.6, 0, 2.6);
    machineGroup.add(rightTrim);

    const frameGeo = createRoundedExtrusion(8.5, 5.5, 1, 0.3);
    const frame = new THREE.Mesh(frameGeo, goldMat);
    frame.position.z = 2.2;
    machineGroup.add(frame);

    const reelTexture = createReelTexture();
    const reelMaterial = new THREE.MeshStandardMaterial({ 
        map: reelTexture,
        roughness: 0.3,
        metalness: 0.2
    });

    for (let i = 0; i < 3; i++) {
        const reelGeometry = new THREE.CylinderGeometry(REEL_RADIUS, REEL_RADIUS, REEL_WIDTH, SEGMENTS);
        reelGeometry.rotateZ(Math.PI / 2);
        
        const reel = new THREE.Mesh(reelGeometry, reelMaterial);
        reel.position.set((i - 1) * 2.2, 0, 2.5); 
        reels.push(reel);
        machineGroup.add(reel);
    }

    const paylineGeo = new THREE.BoxGeometry(7.5, 0.05, 0.1);
    const paylineMat = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.8 });
    const payline = new THREE.Mesh(paylineGeo, paylineMat);
    payline.position.set(0, 0, 4.8);
    machineGroup.add(payline);
    
    const arrowGeo = new THREE.ConeGeometry(0.3, 0.6, 16);
    
    const arrowMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 2 });
    
    const leftArrow = new THREE.Mesh(arrowGeo, arrowMat);
    leftArrow.rotation.z = -Math.PI / 2;
    leftArrow.position.set(-4, 0, 4.8);
    machineGroup.add(leftArrow);

    const rightArrow = new THREE.Mesh(arrowGeo, arrowMat);
    rightArrow.rotation.z = Math.PI / 2; 
    rightArrow.position.set(4, 0, 4.8);
    machineGroup.add(rightArrow);


    const lightGeo = new THREE.SphereGeometry(0.15, 16, 16);
    const lightMatOn = new THREE.MeshStandardMaterial({ color: 0xffff00, emissive: 0xffff00, emissiveIntensity: 1 });
    
    const positions = [
        [-3.8, 2.4], [-2, 2.4], [0, 2.4], [2, 2.4], [3.8, 2.4],
        [-3.8, -2.4], [-2, -2.4], [0, -2.4], [2, -2.4], [3.8, -2.4],
        [-3.8, 0], [-3.8, 1.2], [-3.8, -1.2],
        [3.8, 0], [3.8, 1.2], [3.8, -1.2]
    ];

    positions.forEach(pos => {
        const light = new THREE.Mesh(lightGeo, lightMatOn.clone());
        light.position.set(pos[0], pos[1], 2.75);
        machineGroup.add(light);
        blinkingLights.push(light);
    });

    buildLever(goldMat, chromeMat);
}

function buildLever(goldMat, chromeMat) {
    leverGroup = new THREE.Group();
    leverGroup.position.set(6.0, -1, 1.0); 
    leverGroup.rotation.y = -Math.PI / 12; 
    machineGroup.add(leverGroup);

    const connGeo = new THREE.CylinderGeometry(0.5, 0.5, 2, 16);
    connGeo.rotateZ(Math.PI / 2);
    const conn = new THREE.Mesh(connGeo, chromeMat);
    conn.position.x = -1;
    leverGroup.add(conn);

    const housingGeo = new THREE.BoxGeometry(1, 2, 2);
    const housing = new THREE.Mesh(housingGeo, goldMat);
    leverGroup.add(housing);

    const armPivot = new THREE.Group();
    leverGroup.add(armPivot);

    const armGeo = new THREE.CylinderGeometry(0.3, 0.3, 5, 32);
    const arm = new THREE.Mesh(armGeo, chromeMat);
    arm.position.y = 2.5;
    arm.rotation.x = Math.PI / 12; 
    armPivot.add(arm);

    const handleGeo = new THREE.SphereGeometry(0.8, 64, 64);
    const handleMat = new THREE.MeshStandardMaterial({ color: 0xff0000, roughness: 0.1, metalness: 0.5 });
    const handle = new THREE.Mesh(handleGeo, handleMat);
    handle.position.set(0, 4.8, 1.3); 
    handle.userData = { interactable: true, type: 'lever' };
    armPivot.add(handle);

    leverGroup.userData = { pivot: armPivot };
}

function loadAssets() {
    const promises = [];
    
    Object.keys(SYMBOL_IMAGES).forEach(symbol => {
        const src = SYMBOL_IMAGES[symbol];
        if (src) {
            const p = new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => {
                    loadedImages[symbol] = img;
                    resolve();
                };
                img.onerror = (e) => {
                    console.error("Failed to load image:", src, e);
                    resolve(); 
                };
                img.src = src;
            });
            promises.push(p);
        }
    });
    
    return Promise.all(promises);
}

function createReelTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 256; 
    const ctx = canvas.getContext('2d');

    ctx.imageSmoothingEnabled = false;

    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, '#e0e0e0');
    grad.addColorStop(0.5, '#ffffff');
    grad.addColorStop(1, '#e0e0e0');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

   
    ctx.font = '100px "Press Start 2P", cursive'; 
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const step = canvas.width / SYMBOLS_PER_REEL;
    
    const textureSymbols = [];
    for(let i=0; i<SYMBOLS_PER_REEL; i++) {
        textureSymbols.push(SYMBOLS[i % SYMBOLS.length]);
    }
    
    for (let i = 0; i < SYMBOLS_PER_REEL; i++) {
        const symbol = textureSymbols[i];
        const cx = i * step + step / 2;
        const cy = canvas.height / 2;
        
        ctx.strokeStyle = '#aaaaaa';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(i * step, 0);
        ctx.lineTo(i * step, canvas.height);
        ctx.stroke();

        ctx.save();
        
        ctx.translate(cx, cy);
        
        ctx.rotate(Math.PI / 2);
        
        if (loadedImages[symbol]) {
            const img = loadedImages[symbol];
            const size = 180;
            ctx.drawImage(img, -size/2, -size/2, size, size);
        } else {
            ctx.fillStyle = '#000';
            ctx.fillText(symbol, 0, 0);
        }
        
        ctx.restore();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    
    texture.minFilter = THREE.NearestFilter;
    texture.magFilter = THREE.NearestFilter;
    
    texture.userData = { symbolSequence: textureSymbols };
    
    return texture;
}

function animate() {
    requestAnimationFrame(animate);

    
    if (!isDraggingScene) {
        cameraAngleX += (0 - cameraAngleX) * 0.05;
        cameraAngleY += (0 - cameraAngleY) * 0.05;
    }

    
    const radius = targetZoom; 
    const desiredX = Math.sin(cameraAngleX) * radius * Math.cos(cameraAngleY);
    const desiredY = Math.sin(cameraAngleY) * radius; 
    const desiredZ = Math.cos(cameraAngleX) * radius * Math.cos(cameraAngleY);
    
    camera.position.x = desiredX;
    camera.position.y = desiredY;
    camera.position.z = desiredZ;

    camera.lookAt(0, 0, 0);
    const time = Date.now() * 0.005;
    blinkingLights.forEach((light, i) => {
        const intensity = (Math.sin(time + i) + 1) * 0.5 + 0.5;
        light.material.emissiveIntensity = intensity;
    });

    renderer.render(scene, camera);
}
function onWindowResize() {
    camera.updateProjectionMatrix();PIXEL_ATIOPIXEL_ATIO
    
    const pixelRatio = 4;
    renderer.setSize(window.innerWidth / pixelRatio, window.innerHeight / pixelRatio, false);
}

function onMouseWheel(event) {
    event.preventDefault();
    
    const zoomSpeed = 0.05;
    
    targetZoom += event.deltaY * zoomSpeed;
    
    targetZoom = Math.max(8, Math.min(40, targetZoom));
}

function onMouseDown(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(machineGroup.children, true);

    let clickedInteractable = false;
    
    for (let i = 0; i < intersects.length; i++) {
        let object = intersects[i].object;
        
        while (object && object !== scene) {
            if (object.userData && object.userData.interactable) {
                if (object.userData.type === 'lever' && !isSpinning) {
                    pullLever();
                    clickedInteractable = true;
                }
                break;
            }
            object = object.parent;
        }
        
        if (clickedInteractable) break;
    }
    
    if (!clickedInteractable) {
        isDraggingScene = true;
        previousMousePosition = { x: event.clientX, y: event.clientY };
    }
}

function onMouseUp() {
    isDraggingScene = false;
}

function onMouseMove(event) {
    if (isDraggingScene) {
        const deltaMove = {
            x: event.clientX - previousMousePosition.x,
            y: event.clientY - previousMousePosition.y
        };

        const rotationSpeed = 0.005;
        cameraAngleX -= deltaMove.x * rotationSpeed;
        cameraAngleY += deltaMove.y * rotationSpeed;
        
        cameraAngleX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, cameraAngleX));
        
        cameraAngleY = Math.max(0, Math.min(Math.PI / 2, cameraAngleY));

        previousMousePosition = { x: event.clientX, y: event.clientY };
    }
}

function pullLever() {
    if (isSpinning) return;
    
    const pivot = leverGroup.userData.pivot;
    const duration = 500;
    const start = 0;
    const end = Math.PI / 4; 
    
    let startTime = null;
    
    function animateLever(time) {
        if (!startTime) startTime = time;
        const progress = (time - startTime) / 300; 
        
        if (progress < 1) {
            pivot.rotation.x = start + (end - start) * Math.sin(progress * Math.PI); 
            requestAnimationFrame(animateLever);
        } else {
            pivot.rotation.x = 0; 
            startSpin();
        }
    }
    requestAnimationFrame(animateLever);
}

async function startSpin() {
    if (isSpinning) return;
    isSpinning = true;
    
    const messageEl = document.getElementById('message');
    const creditsEl = document.getElementById('credits');
    
    let credits = parseInt(creditsEl.textContent);
    if (credits < 10) {
        messageEl.textContent = "NO CREDITS!";
        isSpinning = false;
        return;
    }
    
    credits -= 10;
    creditsEl.textContent = credits;
    messageEl.textContent = "SPINNING...";
    messageEl.style.color = "#ff00ff";
    
    const results = [getWeightedSymbol(), getWeightedSymbol(), getWeightedSymbol()];
    
    const spinPromises = reels.map((reel, index) => spinReel3D(reel, results[index], 1500 + index * 500));
    
    await Promise.all(spinPromises);
    
    checkWin(results[0], results[1], results[2]);
    isSpinning = false;
}

function getWeightedSymbol() {
    const totalWeight = Object.values(SYMBOL_DATA).reduce((sum, item) => sum + item.weight, 0);
    let random = Math.floor(Math.random() * totalWeight);
    for (const symbol of SYMBOLS) {
        random -= SYMBOL_DATA[symbol].weight;
        if (random < 0) return symbol;
    }
    return SYMBOLS[SYMBOLS.length - 1];
}

function spinReel3D(reel, targetSymbol, duration) {
    return new Promise(resolve => {
        const startTime = Date.now();
        const initialRotation = reel.rotation.x;
        
        const textureSymbols = reel.material.map.userData.symbolSequence;
        
        let targetIndex = textureSymbols.indexOf(targetSymbol);
        if (targetIndex === -1) targetIndex = 0;
        
        const fullSpins = 4;
        const anglePerSymbol = (Math.PI * 2) / SYMBOLS_PER_REEL;
        const offset = 0 + (ANGLE_PER_SYMBOL / 2); 
        
        const targetAngle = (targetIndex * anglePerSymbol) + offset;
        
        const currentMod = initialRotation % (Math.PI * 2);
        const dist = (targetAngle - currentMod + (Math.PI * 2)) % (Math.PI * 2);
        
        const finalRotation = initialRotation + (Math.PI * 2 * fullSpins) + dist;

        function animateSpin() {
            const now = Date.now();
            const progress = Math.min((now - startTime) / duration, 1);
            
            const t = progress - 1;
            const ease = Math.sqrt(1 - t * t); 
            
            const easeCubic = 1 - Math.pow(1 - progress, 3);

            reel.rotation.x = initialRotation + (finalRotation - initialRotation) * easeCubic;
            
            if (progress < 1) {
                requestAnimationFrame(animateSpin);
            } else {
                resolve();
            }
        }
        animateSpin();
    });
}

function checkWin(s1, s2, s3) {
    const messageEl = document.getElementById('message');
    const creditsEl = document.getElementById('credits');
    let credits = parseInt(creditsEl.textContent);
    
    if (s1 === s2 && s2 === s3) {
        const winAmount = SYMBOL_DATA[s1].value;
        credits += winAmount;
        messageEl.textContent = `JACKPOT! +${winAmount}`;
        messageEl.style.color = "yellow";
        triggerWinLights();
    } else if (s1 === s2 || s2 === s3 || s1 === s3) {
         let matchSymbol = (s1 === s2) ? s1 : s3;
         const winAmount = Math.floor(SYMBOL_DATA[matchSymbol].value * 0.2);
         credits += winAmount;
         messageEl.textContent = `MATCH! +${winAmount}`;
         messageEl.style.color = "#00ffff";
         triggerWinLights();
    } else {
        messageEl.textContent = "TRY AGAIN";
        messageEl.style.color = "#ff00ff";
    }
    creditsEl.textContent = credits;
}

function triggerWinLights() {
    const duration = 2000;
    const start = Date.now();
    const originalColors = blinkingLights.map(l => l.material.emissive.getHex());
    
    function flash() {
        const now = Date.now();
        if (now - start > duration) {
            blinkingLights.forEach((l, i) => l.material.emissive.setHex(originalColors[i]));
            return;
        }
        
        const isOn = Math.floor(now / 100) % 2 === 0;
        blinkingLights.forEach(l => {
            l.material.emissive.setHex(isOn ? 0xffffff : 0x000000);
        });
        requestAnimationFrame(flash);
    }
    flash();
}

init();
