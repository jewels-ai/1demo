const videoElement = document.getElementById('webcam');
const canvasElement = document.getElementById('overlay');
const canvasCtx = canvasElement.getContext('2d');

const snapshotModal = document.getElementById('snapshot-modal');
const snapshotPreview = document.getElementById('snapshot-preview');
const infoModal = document.getElementById('info-modal');
const subcategoryButtons = document.getElementById('subcategory-buttons');
const jewelryOptions = document.getElementById('jewelry-options');

let earringImg = null;
let necklaceImg = null;
let braceletImg = null;
let ringImg = null;

let lastSnapshotDataURL = '';
let currentType = '';
let smoothedFaceLandmarks = null;
let smoothedHandLandmarks = null;
let camera;

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

// Change jewelry image
async function changeJewelry(type, src) {
  const img = await loadImage(src);
  if (!img) return;

  earringImg = necklaceImg = braceletImg = ringImg = null;

  if (type === 'earrings') earringImg = img;
  if (type === 'necklaces') necklaceImg = img;
  if (type === 'bracelet') braceletImg = img;
  if (type === 'ring') ringImg = img;
}

// Handle category buttons
function toggleCategory(category) {
  currentType = category;
  subcategoryButtons.style.display = 'none';
  jewelryOptions.style.display = 'flex';

  let count = 6; // default number of images

  if (category === 'earrings') count = 10;
  if (category === 'necklaces') count = 8;
  if (category === 'bracelet') count = 6;
  if (category === 'ring') count = 6;

  insertJewelryOptions(category, 'jewelry-options', 1, count);
}

// Insert jewelry options into container
function insertJewelryOptions(type, containerId, start, end) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  for (let i = start; i <= end; i++) {
    const filename = `${type}${i}.png`;
    const path = `${type}/${filename}`;

    const btn = document.createElement('button');
    const img = document.createElement('img');
    img.src = path;
    img.alt = `${type} ${i}`;
    btn.appendChild(img);
    btn.onclick = () => changeJewelry(type, path);
    container.appendChild(btn);
  }
}

// MediaPipe setup
const faceMesh = new FaceMesh({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
});
faceMesh.setOptions({
  maxNumFaces: 1,
  refineLandmarks: true,
  minDetectionConfidence: 0.6,
  minTrackingConfidence: 0.6
});

const hands = new Hands({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
});
hands.setOptions({
  maxNumHands: 2,
  modelComplexity: 1,
  minDetectionConfidence: 0.6,
  minTrackingConfidence: 0.6
});

hands.onResults((results) => {
  smoothedHandLandmarks = results.multiHandLandmarks || null;
});

faceMesh.onResults((results) => {
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  smoothedFaceLandmarks = results.multiFaceLandmarks ? results.multiFaceLandmarks[0] : null;
  drawJewelry(smoothedFaceLandmarks, smoothedHandLandmarks, canvasCtx);
});

// Start camera
async function startCamera() {
  if (camera) camera.stop();
  camera = new Camera(videoElement, {
    onFrame: async () => {
      await faceMesh.send({ image: videoElement });
      await hands.send({ image: videoElement });
    },
    width: 1280,
    height: 720,
  });
  camera.start();
}

document.addEventListener('DOMContentLoaded', () => startCamera());

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

  if (faceLandmarks) {
    const leftEar = faceLandmarks[132];
    const rightEar = faceLandmarks[361];
    const neck = faceLandmarks[152];

    if (earringImg) {
      const w = earringImg.width * earringScale;
      const h = earringImg.height * earringScale;
      ctx.drawImage(earringImg, leftEar.x * canvasElement.width - w / 2, leftEar.y * canvasElement.height, w, h);
      ctx.drawImage(earringImg, rightEar.x * canvasElement.width - w / 2, rightEar.y * canvasElement.height, w, h);
    }
    if (necklaceImg) {
      const w = necklaceImg.width * necklaceScale;
      const h = necklaceImg.height * necklaceScale;
      ctx.drawImage(necklaceImg, neck.x * canvasElement.width - w / 2, neck.y * canvasElement.height, w, h);
    }
  }

  if (handLandmarks) {
    handLandmarks.forEach(hand => {
      const wrist = hand[0];
      const ringFinger = hand[16];
      if (braceletImg) {
        const w = braceletImg.width * braceletScale;
        const h = braceletImg.height * braceletScale;
        ctx.drawImage(braceletImg, wrist.x * canvasElement.width - w / 2, wrist.y * canvasElement.height - h / 2, w, h);
      }
      if (ringImg) {
        const w = ringImg.width * ringScale;
        const h = ringImg.height * ringScale;
        ctx.drawImage(ringImg, ringFinger.x * canvasElement.width - w / 2, ringFinger.y * canvasElement.height - h / 2, w, h);
      }
    });
  }
}

// Snapshot
function takeSnapshot() {
  const snapshotCanvas = document.createElement('canvas');
  const ctx = snapshotCanvas.getContext('2d');
  snapshotCanvas.width = videoElement.videoWidth;
  snapshotCanvas.height = videoElement.videoHeight;
  ctx.drawImage(videoElement, 0, 0, snapshotCanvas.width, snapshotCanvas.height);
  drawJewelry(smoothedFaceLandmarks, smoothedHandLandmarks, ctx);
  lastSnapshotDataURL = snapshotCanvas.toDataURL('image/png');
  snapshotPreview.src = lastSnapshotDataURL;
  snapshotModal.showModal();
}

function saveSnapshot() {
  const link = document.createElement('a');
  link.href = lastSnapshotDataURL;
  link.download = `jewelry-tryon-${Date.now()}.png`;
  link.click();
}

function shareSnapshot() {
  if (navigator.share) {
    fetch(lastSnapshotDataURL)
      .then(res => res.blob())
      .then(blob => {
        const file = new File([blob], 'jewelry-tryon.png', { type: 'image/png' });
        navigator.share({
          title: 'Jewelry Try-On',
          text: 'Check out my look!',
          files: [file]
        });
      })
      .catch(err => console.error('Share failed', err));
  } else {
    navigator.clipboard.writeText(lastSnapshotDataURL)
      .then(() => alert("Image link copied! Paste it to share."))
      .catch(() => alert("Sharing not supported in this browser."));
  }
}

function closeSnapshotModal() {
  snapshotModal.close();
}

function toggleInfoModal() {
  infoModal.open ? infoModal.close() : infoModal.showModal();
}
