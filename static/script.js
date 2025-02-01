const { createFFmpeg, fetchFile } = FFmpeg;  // Destructuring from FFmpeg object
const ffmpeg = createFFmpeg({ log: true });   // Initialize FFmpeg

const videoElement = document.getElementById('webcam');
const startButton = document.getElementById('start-recording');
const stopButton = document.getElementById('stop-recording');
const downloadLink = document.getElementById('download-video');

let mediaRecorder;
let recordedChunks = [];

// Function to start the webcam
async function startWebcam() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        videoElement.srcObject = stream;

        mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) recordedChunks.push(event.data);
        };

        mediaRecorder.onstop = () => {
            const blob = new Blob(recordedChunks, { type: 'video/webm' });
            recordedChunks = [];
            const url = URL.createObjectURL(blob);
            downloadLink.href = url;
            downloadLink.style.display = "block";
            downloadLink.textContent = "Download Video";
        };

    } catch (error) {
        console.error("Error accessing webcam: ", error);
    }
}

startButton.addEventListener('click', () => {
    recordedChunks = [];
    mediaRecorder.start();
    startButton.disabled = true;
    stopButton.disabled = false;
});

stopButton.addEventListener('click', () => {
    mediaRecorder.stop();
    startButton.disabled = false;
    stopButton.disabled = true;
});

startWebcam();

ffmpeg.load().then(() => {
  console.log('FFmpeg loaded');
});

async function getNextQuestion() {
    const response = await fetch('http://127.0.0.1:5000/api/getPrompt');
    if (!response.ok) {
        throw new Error('Error status: ${response.status}')
    }
    const data = await response.json();
    const prompt = data.text;
    const prep = data.prep;
    const time = data.time;
    return {prompt, prep, time};
}

function startCountdown(element, timeInSeconds, callback) {
    let countdown = timeInSeconds;
  
    const interval = setInterval(() => {
      updateCounter(element, countdown)
      if (countdown <= 0) {
        clearInterval(interval);
        if (callback) callback();
      } else {
        countdown--;
      }
    }, 1000);
}

function updateCounter(element, timeInSeconds) {
    const minutes = Math.floor(countdown / 60);
    const seconds = countdown % 60;
    element.innerText = 'Time remaining: ${minutes}:${seconds < 10 ? "0" + seconds : seconds}';
}

function onPrepEnd(time) {
    startRecording();
    startCountdown(recordTimer, time, stopRecording());
}

questionButton.addEventListener('click', () => {
    recordedChunks = [];  // Clear previous chunks
  
    const stream = videoElement.srcObject;
    mediaRecorder = new MediaRecorder(stream);
    const {prompt, prep, time} = getNextQuestion();
    questionText.innerText = prompt;
    startCountdown(prepTimer, prep, onPrepEnd(time));
    updateCounter(recordTimer, time);
  
    mediaRecorder.start();
    console.log('Recording started...');
  });