const videoElement = document.getElementById('videoElement');
const questionButton = document.getElementById('questionButton');
const questionText = document.getElementById('questionText');
const prepTimer = document.getElementById('prepTimer');
const recordTimer = document.getElementById('recordTimer');

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

        mediaRecorder.onstop = async () => {
            const blob = new Blob(recordedChunks, { type: 'video/webm' });
            const videoURL = URL.createObjectURL(blob);  // Create URL for the recorded video
            console.log('Recording stopped, processing video...');
        
            // Process the video after recording
            await processVideo(blob, videoURL);
        };

    } catch (error) {
        console.error("Error accessing webcam: ", error);
    }
}

startWebcam();

function startRecording() {
    recordedChunks = [];
    try {
        mediaRecorder.start();
    } catch (InvalidStateError) {
        
    }
}

function stopRecording() {
    mediaRecorder.stop();
    console.log("Reenabled button")
    questionButton.disabled = false;
}

async function getNextQuestion() {
    const response = await fetch('http://127.0.0.1:5000/api/getPrompt');
    if (!response.ok) {
        throw new Error('Error status: ${response.status}')
    }
    const data = await response.json();
    const prompt = data.prompt;
    const prep = data.prepTime;
    const time = data.answerTime;
    console.log(prompt);
    console.log(prep);
    console.log(time);
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

function updateCounter(element, countdown) {
    const minutes = Math.floor(countdown / 60);
    const seconds = countdown % 60;
    element.innerText = `Time remaining: ${minutes}:${seconds < 10 ? '0' + seconds : seconds}`;
}

function onPrepEnd(time) {
    startRecording();
    startCountdown(recordTimer, time, stopRecording);
}

questionButton.addEventListener('click', async () => {
    questionButton.disabled = true;
    recordedChunks = [];  // Clear previous chunks
    console.log("Button pressed");
    const stream = videoElement.srcObject;
    mediaRecorder = new MediaRecorder(stream);
    const {prompt, prep, time} = await getNextQuestion();
    questionText.innerText = prompt;
    startCountdown(prepTimer, prep, () => onPrepEnd(time));
    updateCounter(recordTimer, time);
  
    mediaRecorder.start();
    console.log('Recording started...');
});

async function processVideo(videoBlob) {
    const { createFFmpeg, fetchFile } = FFmpeg;
    const ffmpeg = createFFmpeg({ log: true });

    // Load FFmpeg
    if (!ffmpeg.isLoaded()) {
        await ffmpeg.load();
    }

    // Write video to FFmpeg virtual filesystem
    const videoData = await fetchFile(videoBlob);
    ffmpeg.FS('writeFile', 'input.webm', videoData);

    // Extract audio as a wav file
    await ffmpeg.run(
        '-i', 'input.webm',  // Input file
        '-vn',               // Ignore video stream
        '-acodec', 'pcm_s16le', '-ar', '44100', '-ac', '1', 'output.wav'
    );

    // Read the audio data and send to backend
    const audioData = ffmpeg.FS('readFile', 'output.wav');
    const audioBlob = new Blob([audioData.buffer], { type: 'audio/wav' });

    // Upload the audio to the backend for transcription
    const transcript = await uploadAudioToBackend(audioBlob);
    console.log('Transcript:', transcript);

    // Extract frames every k-th frame (example: 1 frame per second)
    const frameRate = 1;  // Extract 1 frame per second
    await ffmpeg.run(
        '-i', 'input.webm', 
        '-vf', `fps=${frameRate}`, 
        'frame_%03d.png'
    );

    // Read and display frames
    const framesContainer = document.getElementById('frames');
    framesContainer.innerHTML = '';  // Clear previous frames if any

    for (let i = 1; ; i++) {
        const frameFileName = `frame_${String(i).padStart(3, '0')}.png`;
        try {
            const frameData = ffmpeg.FS('readFile', frameFileName);
            const frameBlob = new Blob([frameData.buffer], { type: 'image/png' });
            const frameURL = URL.createObjectURL(frameBlob);

            // Display the frame on the webpage
            const img = document.createElement('img');
            img.src = frameURL;
            img.style.width = '200px';  // Resize for better UI
            framesContainer.appendChild(img);
        } catch (e) {
            console.log('No more frames available.');
            break;
        }
    }
}

// Upload the audio file to the backend for transcription
async function uploadAudioToBackend(audioBlob) {
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.wav');

    try {
        const response = await fetch('http://127.0.0.1:5000/api/transcribe', {
            method: 'POST',
            body: formData,
        });

        if (response.ok) {
            const data = await response.json();
            return data.transcript;
        } else {
            console.error('Error uploading audio');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}
