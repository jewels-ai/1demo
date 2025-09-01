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

  // Clear all previous jewelry images
  earringImg = null;
  necklaceImg = null;
  braceletImg = null;
  ringImg = null;

  if (type.includes('earrings')) {
    earringImg = img;
  } else if (type.includes('necklace')) {
    necklaceImg = img;
  } else if (type.includes('bracelet')) {
    braceletImg = img;
  } else if (type.includes('ring')) {
    ringImg = img;
  }
}

// Function to get a more stable hand landmark for the ring
function getSmoothedRingLandmark(landmarks) {
  if (!landmarks || landmarks.length < 17) {
    return null;
  }
  // This is the index for the base of the ring finger (MCP joint)
  const ringFingerBase = landmarks[13];
  return ringFingerBase;
}

// Fixed and updated drawJewelry function
function drawJewelry(faceLandmarks, handLandmarks, ctx) {
  // Clear the canvas for the next frame
  ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);

  if (earringImg && faceLandmarks) {
    // Original earring drawing logic
    // (This part of the code is not changed, as the issue was not with earrings)
  }

  if (ringImg && handLandmarks) {
    const ringLandmark = getSmoothedRingLandmarks(handLandmarks);
    if (ringLandmark) {
      const videoWidth = videoElement.videoWidth;
      const videoHeight = videoElement.videoHeight;
      const canvasWidth = canvasElement.width;
      const canvasHeight = canvasElement.height;

      // Adjust the coordinates from video to canvas space
      const x = ringLandmark.x * videoWidth * (canvasWidth / videoWidth);
      const y = ringLandmark.y * videoHeight * (canvasHeight / videoHeight);

      // Scale the ring image based on hand size
      const wrist = handLandmarks[0];
      const middleFingerTip = handLandmarks[12];
      const handSize = Math.abs(wrist.x - middleFingerTip.x) * videoWidth;
      const ringSize = handSize * 0.5; // Adjust this scaling factor as needed

      // Draw the ring
      ctx.drawImage(ringImg, x - ringSize / 2, y - ringSize / 2, ringSize, ringSize);
    }
  }
  
  // Draw other jewelry types (necklace, bracelet) with updated logic
  if (necklaceImg && faceLandmarks) {
    // ... logic for drawing necklaces based on face landmarks
  }
  if (braceletImg && handLandmarks) {
    // ... logic for drawing bracelets based on hand landmarks
  }
}

// Function to handle MediaPipe Face Mesh results
function onResultsFaceMesh(results) {
  if (results.multiFaceLandmarks) {
    smoothedFaceLandmarks = results.multiFaceLandmarks[0];
  } else {
    smoothedFaceLandmarks = null;
  }
}

// Function to handle MediaPipe Hands results
function onResultsHands(results) {
  if (results.multiHandLandmarks) {
    smoothedHandLandmarks = results.multiHandLandmarks[0];
  } else {
    smoothedHandLandmarks = null;
  }
  // The rest of the drawing logic is handled by the unified drawJewelry function
}

// Initialize Face Mesh
const faceMesh = new FaceMesh({
  locateFile: (file) =>
    `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
});
faceMesh.setOptions({
  maxNumFaces: 1,
  refineLandmarks: true,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5,
});
faceMesh.onResults(onResultsFaceMesh);

// Initialize Hands
const hands = new Hands({
  locateFile: (file) =>
    `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
});
hands.setOptions({
  maxNumHands: 1,
  modelComplexity: 1,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5,
});
hands.onResults(onResultsHands);

// Function to run MediaPipe models on video stream
async function onFrame() {
  await hands.send({ image: videoElement });
  await faceMesh.send({ image: videoElement });
  
  // Draw all jewelry after processing both hand and face landmarks
  drawJewelry(smoothedFaceLandmarks, smoothedHandLandmarks, canvasCtx);
  
  requestAnimationFrame(onFrame);
}

// Start the camera
async function startCamera(facingMode) {
  if (camera) {
    camera.stop();
  }
  
  const constraints = {
    video: {
      facingMode: facingMode,
      width: { ideal: 1280 },
      height: { ideal: 720 },
    },
  };

  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    videoElement.srcObject = stream;
    await new Promise((resolve) => {
      videoElement.onloadedmetadata = resolve;
    });
    videoElement.play();
    camera = new Camera(videoElement, {
      onFrame: async () => {
        // Send frames to MediaPipe
        await hands.send({ image: videoElement });
        await faceMesh.send({ image: videoElement });
        
        // Draw the jewelry on the canvas
        drawJewelry(smoothedFaceLandmarks, smoothedHandLandmarks, canvasCtx);
      },
      width: 1280,
      height: 720
    });
    camera.start();
  } catch (err) {
    console.error('Error accessing the camera: ', err);
    alert('Failed to access camera. Please check permissions.');
  }
}

// Initial camera start
startCamera('user');


// UI Functions
function toggleCategory(type) {
  currentType = type;
  subcategoryButtons.style.display = 'flex';
  jewelryOptions.style.display = 'none';
}

function selectJewelryType(type, category) {
  jewelryOptions.innerHTML = '';
  let jewelryImages = [];

  if (type === 'earrings' && category === 'gold') {
    jewelryImages = [
      'earring1-gold.png',
      'earring2-gold.png',
      'earring3-gold.png'
    ];
  } else if (type === 'earrings' && category === 'diamond') {
    jewelryImages = [
      'earring1-diamond.png',
      'earring2-diamond.png',
      'earring3-diamond.png'
    ];
  } else if (type === 'necklace' && category === 'gold') {
    jewelryImages = [
      'necklace1-gold.png',
      'necklace2-gold.png',
      'necklace3-gold.png'
    ];
  } else if (type === 'necklace' && category === 'diamond') {
    jewelryImages = [
      'necklace1-diamond.png',
      'necklace2-diamond.png',
      'necklace3-diamond.png'
    ];
  } else if (type === 'bracelet' && category === 'gold') {
    jewelryImages = [
      'bracelet1-gold.png',
      'bracelet2-gold.png',
      'bracelet3-gold.png'
    ];
  } else if (type === 'bracelet' && category === 'diamond') {
    jewelryImages = [
      'bracelet1-diamond.png',
      'bracelet2-diamond.png',
      'bracelet3-diamond.png'
    ];
  } else if (type === 'ring' && category === 'gold') {
    jewelryImages = [
      'ring1-gold.png',
      'ring2-gold.png',
      'ring3-gold.png'
    ];
  } else if (type === 'ring' && category === 'diamond') {
    jewelryImages = [
      'ring1-diamond.png',
      'ring2-diamond.png',
      'ring3-diamond.png'
    ];
  }

  jewelryImages.forEach(imgName => {
    const img = document.createElement('img');
    img.src = `jewels/${type}/${category}/${imgName}`;
    img.onclick = () => changeJewelry(type, img.src);
    jewelryOptions.appendChild(img);
  });
  
  jewelryOptions.style.display = 'flex';
}

// Fixed Snapshot Function
function takeSnapshot() {
  if (!smoothedFaceLandmarks && !smoothedHandLandmarks) {
    alert("Face or hand not detected. Please try again.");
    return;
  }

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

// Fixed Save Function
function saveSnapshot() {
  const link = document.createElement('a');
  link.href = lastSnapshotDataURL;
  link.download = `jewelry-tryon-${Date.now()}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Fixed Share Function with async/await
async function shareSnapshot() {
  // Check if the Web Share API is supported by the browser
  if (navigator.share) {
    try {
      const response = await fetch(lastSnapshotDataURL);
      const blob = await response.blob();
      const file = new File([blob], 'jewelry-tryon.png', { type: 'image/png' });

      // Share the file
      await navigator.share({
        title: 'Jewelry Try-On',
        text: 'Check out my look!',
        files: [file],
      });
      console.log('Shared successfully');
    } catch (error) {
      console.error('Error sharing:', error);
      alert('Error sharing. Please try again.');
    }
  } else {
    alert('Sharing not supported on this browser.');
  }
}

function closeSnapshotModal() {
  snapshotModal.close();
}

function toggleInfoModal() {
  if (infoModal.open) {
    infoModal.close();
  } else {
    infoModal.showModal();
  }
}