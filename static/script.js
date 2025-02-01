const videoElement = document.getElementById('videoElement');
const questionButton = document.getElementById('questionButton');
const chooseQuestionButton = document.getElementById('chooseQuestionButton');
const recordButton = document.getElementById('recordButton');
const recordTimer = document.getElementById('recordTimer');

let mediaRecorder;
let recordedChunks = [];
let recordingInterval;

async function startWebcam() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        videoElement.srcObject = stream;
        mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                recordedChunks.push(event.data);
            }
        };

        mediaRecorder.onstop = async () => {
            const blob = new Blob(recordedChunks, { type: 'video/webm' });
            await processVideo(blob);
            resetRecordingUI();
        };
    } catch (error) {
        console.error("Error accessing webcam: ", error);
    }
}

startWebcam();

function startRecording() {
    recordedChunks = [];
    mediaRecorder.start();
    console.log('Recording started...');
    recordButton.innerText = "Stop Recording";
    recordButton.classList.add('btn-danger');
    recordTimer.style.display = 'block';
    startCountdown(120, stopRecording);
}

function stopRecording() {
    if (mediaRecorder.state === "recording") {
        mediaRecorder.stop();
        console.log("Recording stopped");
    }
}

function resetRecordingUI() {
    recordButton.innerText = "Start Recording";
    recordButton.classList.remove('btn-danger');
    recordTimer.style.display = 'none';
}

function startCountdown(timeInSeconds, callback) {
    let countdown = timeInSeconds;
    recordTimer.innerText = `Time remaining: ${Math.floor(countdown / 60)}:${countdown % 60}`;
    recordingInterval = setInterval(() => {
        countdown--;
        if (countdown <= 0) {
            clearInterval(recordingInterval);
            callback();
        }
        recordTimer.innerText = `Time remaining: ${Math.floor(countdown / 60)}:${countdown % 60}`;
    }, 1000);
}

async function processVideo(blob) {
    const formData = new FormData();
    formData.append('video', blob, 'video.webm');
    try {
        const response = await fetch('http://127.0.0.1:5000/api/process-video', {
            method: 'POST',
            body: formData,
        });
        if (response.ok) {
            console.log('Video successfully sent to backend!');
        } else {
            console.error('Failed to send video to backend.');
        }
    } catch (error) {
        console.error('Error during video upload:', error);
    }
}

recordButton.addEventListener('click', () => {
    if (mediaRecorder.state === 'inactive') {
        startRecording();
    } else {
        stopRecording();
    }
});
