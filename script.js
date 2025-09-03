const videoElement = document.getElementById('webcam');
const canvasElement = document.getElementById('overlay');
const canvasCtx = canvasElement.getContext('2d');

const infoModal = document.getElementById('info-modal');
const subcategoryButtons = document.getElementById('subcategory-buttons');
const jewelryOptions = document.getElementById('jewelry-options');

let earringImg = null;
let necklaceImg = null;
let braceletImg = null;
let ringImg = null;

let currentType = '';
let smoothedFaceLandmarks = null;
let smoothedHandLandmarks = null;
let camera;
let currentCameraFacingMode = 'user'; // 'user' for front camera, 'environment' for back

// Utility function to load images with a Promise
async function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => {
      console.error(`Failed to load image: ${src}`);
      resolve(null);
    };
    img.src = src;
  });
}

// Updated to handle all jewelry types
async function changeJewelry(type, src) {
  const img = await loadImage(src);
  if (!img) return;

  earringImg = null;
  necklaceImg = null;
  braceletImg = null;
  ringImg = null;

  if (type.includes('earrings')) {
    earringImg = img;
  } else if (type.includes('necklaces')) {
    necklaceImg = img;
  } else if (type.includes('bracelet')) {
    braceletImg = img;
  } else if (type.includes('ring')) {
    ringImg = img;
  }
}

// Handle category buttons
function toggleCategory(category) {
  jewelryOptions.style.display = 'none';
  subcategoryButtons.style.display = 'none';
  currentType = category;

  const isAccessoryCategory = ['bracelet', 'ring'].includes(category);
  if (isAccessoryCategory) {
    const jewelryCounts = { bracelet: 7, ring: 10 };
    const end = jewelryCounts[category] || 5;
    insertJewelryOptions(category, 'jewelry-options', 1, end);
    jewelryOptions.style.display = 'flex';
    startCamera('environment');
  } else {
    subcategoryButtons.style.display = 'flex';
    startCamera('user');
  }
}

// Handle subcategory (Gold/Diamond)
function selectJewelryType(mainType, subType) {
  currentType = `${subType}_${mainType}`;
  subcategoryButtons.style.display = 'none';
  jewelryOptions.style.display = 'flex';
  
  earringImg = null;
  necklaceImg = null;

  const jewelryCounts = {
    gold_earrings: 16,
    gold_necklaces: 19,
    diamond_earrings: 9,
    diamond_necklaces: 6,
  };

  const end = jewelryCounts[currentType] || 15;
  insertJewelryOptions(currentType, 'jewelry-options', 1, end);
}

// Insert jewelry options
function insertJewelryOptions(type, containerId, startIndex, endIndex) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  for (let i = startIndex; i <= endIndex; i++) {
    const filename = `${type}${i}.png`;
    const btn = document.createElement('button');
    const img = document.createElement('img');
    img.src = `${type}/${filename}`;
    img.alt = `${type.replace('_', ' ')} ${i}`;
    btn.appendChild(img);
    btn.onclick = () => changeJewelry(type, `${type}/${filename}`);
    container.appendChild(btn);
  }
}

// MediaPipe setup
const faceMesh = new FaceMesh({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
});
faceMesh.setOptions({ maxNumFaces: 1, refineLandmarks: true, minDetectionConfidence: 0.6, minTrackingConfidence: 0.6 });

const hands = new Hands({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
});
hands.setOptions({ maxNumHands: 2, modelComplexity: 1, minDetectionConfidence: 0.6, minTrackingConfidence: 0.6 });

hands.onResults((results) => {
  smoothedHandLandmarks = results.multiHandLandmarks && results.multiHandLandmarks.length > 0 ? results.multiHandLandmarks : null;
});

faceMesh.onResults((results) => {
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
    const newLandmarks = results.multiFaceLandmarks[0];
    if (!smoothedFaceLandmarks) {
      smoothedFaceLandmarks = newLandmarks;
    } else {
      const smoothingFactor = 0.2;
      smoothedFaceLandmarks = smoothedFaceLandmarks.map((prev, i) => ({
        x: prev.x * (1 - smoothingFactor) + newLandmarks[i].x * smoothingFactor,
        y: prev.y * (1 - smoothingFactor) + newLandmarks[i].y * smoothingFactor,
        z: prev.z * (1 - smoothingFactor) + newLandmarks[i].z * smoothingFactor,
      }));
    }
  } else {
    smoothedFaceLandmarks = null;
  }
  drawJewelry(smoothedFaceLandmarks, smoothedHandLandmarks, canvasCtx);
});

// Start camera
async function startCamera(facingMode) {
  if (camera) camera.stop();
  camera = new Camera(videoElement, {
    onFrame: async () => {
      await faceMesh.send({ image: videoElement });
      await hands.send({ image: videoElement });
    },
    width: 1280,
    height: 720,
    facingMode: facingMode
  });
  camera.start();
}

document.addEventListener('DOMContentLoaded', () => startCamera('user'));

videoElement.addEventListener('loadedmetadata', () => {
  canvasElement.width = videoElement.videoWidth;
  canvasElement.height = videoElement.videoHeight;
});

// Draw jewelry
function drawJewelry(faceLandmarks, handLandmarks, ctx) {
  const earringScale = 0.07;
  const necklaceScale = 0.18;
  const braceletScale = 0.15;
  const ringScale = 0.05;
  const angleOffset = Math.PI / 2;

  if (faceLandmarks) {
    const leftEarLandmark = faceLandmarks[132];
    const rightEarLandmark = faceLandmarks[361];
    const neckLandmark = faceLandmarks[152];

    const leftEarPos = { x: leftEarLandmark.x * canvasElement.width - 6, y: leftEarLandmark.y * canvasElement.height - 16 };
    const rightEarPos = { x: rightEarLandmark.x * canvasElement.width + 6, y: rightEarLandmark.y * canvasElement.height - 16 };
    const neckPos = { x: neckLandmark.x * canvasElement.width - 8, y: neckLandmark.y * canvasElement.height + 10 };

    if (earringImg) {
      const w = earringImg.width * earringScale, h = earringImg.height * earringScale;
      ctx.drawImage(earringImg, leftEarPos.x - w / 2, leftEarPos.y, w, h);
      ctx.drawImage(earringImg, rightEarPos.x - w / 2, rightEarPos.y, w, h);
    }
    if (necklaceImg) {
      const w = necklaceImg.width * necklaceScale, h = necklaceImg.height * necklaceScale;
      ctx.drawImage(necklaceImg, neckPos.x - w / 2, neckPos.y, w, h);
    }
  }

  if (handLandmarks) {
    handLandmarks.forEach(hand => {
      const wristPos = { x: hand[0].x * canvasElement.width, y: hand[0].y * canvasElement.height };
      const middleFingerPos = { x: hand[9].x * canvasElement.width, y: hand[9].y * canvasElement.height };
      const ringFingerPos = { x: hand[14].x * canvasElement.width, y: hand[14].y * canvasElement.height };

      const angle = Math.atan2(middleFingerPos.y - wristPos.y, middleFingerPos.x - wristPos.x);

      if (braceletImg) {
        const w = braceletImg.width * braceletScale, h = braceletImg.height * braceletScale;
        ctx.save();
        ctx.translate(wristPos.x, wristPos.y);
        ctx.rotate(angle + angleOffset);
        ctx.drawImage(braceletImg, -w / 2, -h / 2, w, h);
        ctx.restore();
      }

      if (ringImg) {
        const w = ringImg.width * ringScale, h = ringImg.height * ringScale;
        ctx.drawImage(ringImg, ringFingerPos.x - w / 2, ringFingerPos.y - h / 2, w, h);
      }
    });
  }
}

// Info modal
function toggleInfoModal() {
  if (infoModal.open) infoModal.close();
  else infoModal.showModal();
}
