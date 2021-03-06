let videoWidth, videoHeight,
    scatterGLHasInitialized = false, scatterGL, fingerLookupIndices = {
        thumb: [0, 1, 2, 3, 4],
        indexFinger: [0, 5, 6, 7, 8],
        middleFinger: [0, 9, 10, 11, 12],
        ringFinger: [0, 13, 14, 15, 16],
        pinky: [0, 17, 18, 19, 20]
    };
let model;
const VIDEO_WIDTH = 640;
const VIDEO_HEIGHT = 500;
const mobile = false;
let lastSymbol = undefined;
let symbol = undefined;
const data = {
    'rock': [],
    'paper': [],
    'scissor': [],
    'shoot': []
}

function drawKeypoints(ctx, keypoints) {
    function drawPoint(ctx, y, x, r) {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, 2 * Math.PI);
        ctx.fill();
    }

    function drawPath(ctx, points, closePath) {
        const region = new Path2D();
        region.moveTo(points[0][0], points[0][1]);
        for (let i = 1; i < points.length; i++) {
            const point = points[i];
            region.lineTo(point[0], point[1]);
        }

        if (closePath) {
            region.closePath();
        }
        ctx.stroke(region);
    }

    const keypointsArray = keypoints;

    for (let i = 0; i < keypointsArray.length; i++) {
        const y = keypointsArray[i][0];
        const x = keypointsArray[i][1];
        drawPoint(ctx, x - 2, y - 2, 3);
    }

    const fingers = Object.keys(fingerLookupIndices);
    for (let i = 0; i < fingers.length; i++) {
        const finger = fingers[i];
        const points = fingerLookupIndices[finger].map(idx => keypoints[idx]);
        drawPath(ctx, points, false);
    }
}

async function setupCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error(
            'Browser API navigator.mediaDevices.getUserMedia not available');
    }

    const video = document.getElementById('video');
    const stream = await navigator.mediaDevices.getUserMedia({
        'audio': false,
        'video': {
            facingMode: 'user',
            width: mobile ? undefined : VIDEO_WIDTH,
            height: mobile ? undefined : VIDEO_HEIGHT
        },
    });
    video.srcObject = stream;

    return new Promise((resolve) => {
        video.onloadedmetadata = () => {
            resolve(video);
        };
    });
}

async function loadVideo() {
    const video = await setupCamera();
    video.play();
    return video;
}

const main =
    async () => {
        model = await handpose.load();
        let video;

        try {
            video = await loadVideo();
        } catch (e) {
            let info = document.getElementById('info');
            info.textContent = e.message;
            info.style.display = 'block';
            throw e;
        }

        landmarksRealTime(video);
    }

const landmarksRealTime = async (video) => {
    videoWidth = video.videoWidth;
    videoHeight = video.videoHeight;

    const canvas = document.getElementById('output');

    canvas.width = videoWidth;
    canvas.height = videoHeight;

    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, videoWidth, videoHeight);
    ctx.strokeStyle = 'red';
    ctx.fillStyle = 'red';

    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);

    // These anchor points allow the hand pointcloud to resize according to its
    // position in the input.
    const ANCHOR_POINTS = [
        [0, 0, 0], [0, -VIDEO_HEIGHT, 0], [-VIDEO_WIDTH, 0, 0],
        [-VIDEO_WIDTH, -VIDEO_HEIGHT, 0]
    ];

    async function frameLandmarks() {
        ctx.drawImage(
            video, 0, 0, videoWidth, videoHeight, 0, 0, canvas.width,
            canvas.height);
        const predictions = await model.estimateHands(video);
        if (predictions.length > 0) {
            const result = predictions[0].landmarks;
            const annots = predictions[0].annotations;

            if (symbol) {
                const d = captureData(annots);
                data[symbol].push(d);

                console.log(d);
                uncapture();
            }

            drawKeypoints(ctx, result, annots);
        }
        requestAnimationFrame(frameLandmarks);
    };

    frameLandmarks();
};

function captureData(annots) {
    function getPoints(k, prefix, data) {
        for (let i = 0; i < annots[k].length; i++) {
            const colPrefix = `${prefix}${i}`;
            const suf = ['x', 'y', 'z'];
            const arr = annots[k][i];
            for (let j = 0; j < arr.length; j++) {
                const col = `${colPrefix}${suf[j]}`;
                const val = arr[j];
                data[col] = val;
            }
        }
    }

    const data = {};
    getPoints('indexFinger', 'index', data);
    getPoints('middleFinger', 'middle', data);
    getPoints('ringFinger', 'ring', data);
    getPoints('pinky', 'pinky', data);
    getPoints('thumb', 'thumb', data);
    getPoints('palmBase', 'palm', data)
    return data;
}

function capture(s) {
    symbol = s;
}

function uncapture() {
    lastSymbol = symbol;
    symbol = undefined;
}

function undo() {
    data[lastSymbol].pop();
}

function download() {
    function getMsPastEpoch() {
        const now = new Date()  
        const ms = now.getTime()
        return ms;
    }

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data));
    const a = document.getElementById('dlAnchor');
    a.setAttribute('href', dataStr);
    a.setAttribute('download', `data-${getMsPastEpoch()}.json`);
    a.click();
}

navigator.getUserMedia = navigator.getUserMedia ||
    navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

tf.setBackend('webgl').then(() => main());
