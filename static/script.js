const { createFFmpeg, fetchFile } = FFmpeg;  // Destructuring from FFmpeg object
const ffmpeg = createFFmpeg({ log: true });   // Initialize FFmpeg
const videoElement = document.getElementById('videoElement');
const questionButton = document.getElementById('questionButton');
const questionText = document.getElementById('questionText');
const prepTimer = document.getElementById('prepTimer');
const recordTimer = document.getElementById('recordTimer');
let mediaRecorder;
let recordedChunks = []

const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const capturedImage = document.getElementById("capturedImage");

// Access the webcam
navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    .then(stream => {
        video.srcObject = stream;
        mediaRecorder = new MediaRecorder(stream);

        // Store recorded data chunks
        mediaRecorder.ondataavailable = event => {
            if (event.data.size > 0) {
                recordedChunks.push(event.data);
            }
        };

        // When recording stops, process in backend
        mediaRecorder.onstop = async () => {
            const blob = new Blob(recordedChunks, { type: 'video/webm' });
            const videoURL = URL.createObjectURL(blob);  // Create URL for the recorded video
            console.log('Recording stopped, processing video...');
        
            // Process the video after recording
            await processVideo(blob, videoURL);
          };
    })
    .catch(error => {
        console.error("Error accessing webcam:", error);
        alert("Please allow camera access to use this feature.");
    });

function startRecording() {
    recordedChunks = [];
    mediaRecorder.start();
}

function stopRecording() {
    mediaRecorder.stop();
}

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