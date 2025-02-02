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

        const audioTrack = stream.getAudioTracks()[0];
        if (audioTrack) {
            audioTrack.enabled = false;  // Disable the audio track
        }

        mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
        mediaRecorder.stop()

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                recordedChunks.push(event.data);
                console.log("NEW DATA");
            }
        };

        mediaRecorder.onstop = async () => {
            const blob = new Blob(recordedChunks, { type: 'video/webm' });
            // Process the video after recording
            await processVideo(blob);
        };
    } catch (error) {
        console.error("Error accessing webcam: ", error);
    }
}
startWebcam();

function startRecording() {
    recordedChunks = [];
    try {
        if (mediaRecorder.state === 'inactive') {
            mediaRecorder.start();
            console.log('Recording started...');
        } else {
            console.log('Recorder is already in use or in invalid state:', mediaRecorder.state);
        }
    } catch (error) {
        console.error('Error starting recording:', error);
    }
}

function stopRecording() {
    console.log("Attempting to stop recording...");
    if (mediaRecorder.state === "recording") {
        mediaRecorder.stop();  // This will trigger the onstop event
        console.log("Recording stopped");
        questionButton.disabled = false;  // Re-enable the button
    } else {
        console.log("Cannot stop, mediaRecorder is not in recording state.");
    }
    console.log("Reenabled button")
    questionButton.disabled = false;
}

async function getNextQuestion() {
    const response = await fetch('http://127.0.0.1:5000/api/get-prompt');
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
    const {prompt, prep, time} = await getNextQuestion();
    questionText.innerText = prompt;
    updateCounter(recordTimer, time);
    startCountdown(prepTimer, prep, () => onPrepEnd(time));
});

async function processVideo(blob) {
    //
    //TODO: Go to processing results page
    //
    // Create a FormData object to send the Blob to the Flask backend
    const formData = new FormData();
    formData.append('video', blob, 'video.webm');  // Append the video Blob
    formData.append('question', questionText.innerText)
    try {
        // Send the video to the backend using fetch
        const response = await fetch('http://127.0.0.1:5000/api/process-video', {
            method: 'POST',
            body: formData,
        });
        // Handle the response from the backend
        if (response.ok) {
            console.log('Video successfully sent to backend!');
            //TODO: WAIT THING
            const responseData = await response.json();
            //TODO: ANALYZE button
            console.log('Backend response:', responseData);
        } else {
            console.error('Failed to send video to backend. Status:', response.status);
        }
    } catch (error) {
        console.error('Error during video upload:', error);
    }
}
