const mainScreen = document.getElementById('main-screen');
const workoutScreen = document.getElementById('workout-screen');
const startBtn = document.getElementById('start-btn');
const closeWorkoutBtn = document.getElementById('close-workout');
const repsCountEl = document.getElementById('reps-count');
const webcamEl = document.getElementById('webcam');
const canvasEl = document.getElementById('canvas');
const canvasCtx = canvasEl.getContext('2d');

const todayDateEl = document.getElementById('today-date');
const goalIndicator = document.getElementById('goal-indicator');
const goalText = document.getElementById('goal-text');
const goalInput = document.getElementById('goal-input');

let detector;
let reps = 0;
let squatState = 'up'; // 'up' or 'down'

async function init() {
    // Set today's date
    const options = { weekday: 'long', month: 'long', day: 'numeric' };
    todayDateEl.innerText = new Date().toLocaleDateString('en-US', options);

    // Goal input logic
    goalIndicator.addEventListener('click', () => {
        if (goalInput.classList.contains('hidden')) {
            goalText.classList.add('hidden');
            goalInput.classList.remove('hidden');
            goalInput.focus();
        }
    });

    goalInput.addEventListener('blur', () => {
        const goal = goalInput.value;
        if (goal) {
            goalText.innerText = `Goal: ${goal}`;
        } else {
            goalText.innerText = 'No Goal';
        }
        goalInput.classList.add('hidden');
        goalText.classList.remove('hidden');
    });

    goalInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            goalInput.blur();
        }
    });

    const detectorConfig = {
        modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING
    };
    detector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, detectorConfig);
    startBtn.addEventListener('click', startWorkout);
    closeWorkoutBtn.addEventListener('click', stopWorkout);
}

async function startWorkout() {
    mainScreen.classList.add('hidden');
    workoutScreen.classList.remove('hidden');

    const stream = await navigator.mediaDevices.getUserMedia({
        video: true
    });
    webcamEl.srcObject = stream;

    webcamEl.onloadeddata = () => {
        canvasEl.width = webcamEl.videoWidth;
        canvasEl.height = webcamEl.videoHeight;
        detectPose();
    };
}

function stopWorkout() {
    mainScreen.classList.remove('hidden');
    workoutScreen.classList.add('hidden');
    const stream = webcamEl.srcObject;
    if (stream) {
        const tracks = stream.getTracks();
        tracks.forEach(track => track.stop());
        webcamEl.srcObject = null;
    }
    reps = 0;
    repsCountEl.innerText = reps;
}

async function detectPose() {
    if (!detector) return;

    const poses = await detector.estimatePoses(webcamEl);
    canvasCtx.clearRect(0, 0, canvasEl.width, canvasEl.height);

    if (poses.length > 0) {
        const keypoints = poses[0].keypoints;
        drawKeypoints(keypoints);
        calculateSquat(keypoints);
    }

    requestAnimationFrame(detectPose);
}

function drawKeypoints(keypoints) {
    canvasCtx.fillStyle = 'white';
    canvasCtx.strokeStyle = 'white';
    canvasCtx.lineWidth = 2;

    for (const point of keypoints) {
        if (point.score > 0.3) {
            canvasCtx.beginPath();
            canvasCtx.arc(point.x, point.y, 5, 0, 2 * Math.PI);
            canvasCtx.fill();
        }
    }
}

function calculateSquat(keypoints) {
    const leftHip = keypoints.find(p => p.name === 'left_hip');
    const leftKnee = keypoints.find(p => p.name === 'left_knee');
    const leftAnkle = keypoints.find(p => p.name === 'left_ankle');
    const rightHip = keypoints.find(p => p.name === 'right_hip');
    const rightKnee = keypoints.find(p => p.name === 'right_knee');
    const rightAnkle = keypoints.find(p => p.name === 'right_ankle');

    if (leftHip.score > 0.3 && leftKnee.score > 0.3 && leftAnkle.score > 0.3 &&
        rightHip.score > 0.3 && rightKnee.score > 0.3 && rightAnkle.score > 0.3) {

        const leftKneeAngle = getAngle(leftHip, leftKnee, leftAnkle);
        const rightKneeAngle = getAngle(rightHip, rightKnee, rightAnkle);

        if (leftKneeAngle < 100 && rightKneeAngle < 100) {
            squatState = 'down';
        } else if (leftKneeAngle > 160 && rightKneeAngle > 160 && squatState === 'down') {
            squatState = 'up';
            reps++;
            repsCountEl.innerText = reps;
        }
    }
}

function getAngle(p1, p2, p3) {
    const a = Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2);
    const b = Math.pow(p2.x - p3.x, 2) + Math.pow(p2.y - p3.y, 2);
    const c = Math.pow(p3.x - p1.x, 2) + Math.pow(p3.y - p1.y, 2);
    return Math.acos((a + b - c) / Math.sqrt(4 * a * b)) * (180 / Math.PI);
}

init();
