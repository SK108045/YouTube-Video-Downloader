
const videoUrlInput = document.getElementById('videoUrl');
const fetchBtn = document.getElementById('fetchBtn');
const downloadBtn = document.getElementById('downloadBtn');
const videoInfo = document.getElementById('videoInfo');
const downloadOptions = document.getElementById('downloadOptions');
const thumbnail = document.getElementById('thumbnail');
const videoTitle = document.getElementById('videoTitle');
const videoDuration = document.getElementById('videoDuration');
const videoAuthor = document.getElementById('videoAuthor');

let currentVideoFormats = [];

function showToast(message, type = 'error') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-check';
    
    toast.innerHTML = `
        <i class="fas ${icon}"></i>
        <span>${message}</span>
    `;
    
    document.getElementById('toast-container').appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

fetchBtn.addEventListener('click', async function() {
    const url = videoUrlInput.value.trim();
    const progressBar = document.getElementById('progressBar');
   
    const existingProgressBars = document.querySelectorAll('.download-progress');
    existingProgressBars.forEach(bar => bar.remove());
    downloadBtn.style.display = 'block';
   
    if (!isValidYouTubeUrl(url)) {
        showToast('Enter a valid YouTube URL', 'error');
        return;
    }

    try {
        fetchBtn.textContent = 'Fetching...';
        fetchBtn.disabled = true;
       
        const fetchPromise = fetch(`/api/video-info?url=${encodeURIComponent(url)}`);
       
        const progressAnimation = (async () => {
            const steps = [
                { percent: 10, delay: 300 },
                { percent: 20, delay: 600 },
                { percent: 30, delay: 300 },
                { percent: 40, delay: 1000 },
                { percent: 50, delay: 400 },
                { percent: 60, delay: 600 },
                { percent: 70, delay: 1000 },
                { percent: 80, delay: 300 },
                { percent: 90, delay: 400 }
            ];
   
            for (let step of steps) {
                progressBar.style.width = `${step.percent}%`;
                await new Promise(resolve => setTimeout(resolve, step.delay));
            }
        })();
   
        const response = await fetchPromise;
        const data = await response.json();
   
        if (response.ok) {
            progressBar.style.width = '100%';
            displayVideoInfo(data);
            currentVideoFormats = data.formats;
            populateQualityOptions(data.formats);
            showToast('Video fetched successfully!', 'success');
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        showToast('Error fetching video info: ' + error.message, 'error');
    } finally {
        fetchBtn.textContent = 'Fetch Video';
        fetchBtn.disabled = false;
        setTimeout(() => {
            progressBar.style.width = '0';
        }, 1000);
    }
});

downloadBtn.addEventListener('click', async function() {
    const selectedQuality = document.querySelector('input[name="quality"]:checked');
   
    if (!selectedQuality) {
        showToast('Please select a video quality', 'error');
        return;
    }

    const url = videoUrlInput.value.trim();
    const format = currentVideoFormats.find(f => f.quality === selectedQuality.value);
   
    if (!format) {
        showToast('Selected quality not available', 'error');
        return;
    }

    const progressContainer = document.createElement('div');
    progressContainer.className = 'download-progress';
    progressContainer.innerHTML = `
        <div class="progress-bar-container">
            <div class="progress-bar-fill" style="width: 0%"></div>
        </div>
        <div class="progress-text">Starting download...</div>
    `;
   
    downloadBtn.parentNode.insertBefore(progressContainer, downloadBtn.nextSibling);
    downloadBtn.style.display = 'none';

    const steps = [
        { percent: 10, delay: 300, text: 'Downloading: 10%' },
        { percent: 20, delay: 600, text: 'Downloading: 20%' },
        { percent: 30, delay: 300, text: 'Downloading: 30%' },
        { percent: 40, delay: 1000, text: 'Downloading: 40%' },
        { percent: 50, delay: 400, text: 'Downloading: 50%' },
        { percent: 60, delay: 600, text: 'Downloading: 60%' },
        { percent: 70, delay: 1000, text: 'Downloading: 70%' },
        { percent: 80, delay: 300, text: 'Downloading: 80%' },
        { percent: 90, delay: 600, text: 'Downloading: 90%' },
        { percent: 95, delay: 500, text: 'Preparing download...' }
    ];

    const progressAnimation = (async () => {
        let currentPercent = 0;
       
        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            const previousPercent = currentPercent;
            const targetPercent = step.percent;
            const incrementCount = 20;
            const incrementSize = (targetPercent - previousPercent) / incrementCount;
           
            for (let j = 0; j < incrementCount; j++) {
                currentPercent += incrementSize;
                progressContainer.querySelector('.progress-bar-fill').style.width = `${currentPercent}%`;
                progressContainer.querySelector('.progress-text').textContent = step.text;
                await new Promise(resolve => setTimeout(resolve, step.delay / incrementCount));
            }
           
            progressContainer.querySelector('.progress-bar-fill').style.width = `${step.percent}%`;
            await new Promise(resolve => setTimeout(resolve, step.delay));
        }
    })();

    try {
        const downloadFrame = document.createElement('iframe');
        downloadFrame.style.display = 'none';
        document.body.appendChild(downloadFrame);

        downloadFrame.onload = function() {
            progressContainer.remove();
            downloadBtn.style.display = 'block';
            downloadFrame.remove();
            showToast('Download completed successfully!', 'success');
        };

        downloadFrame.src = `/api/download?url=${encodeURIComponent(url)}&formatId=${format.formatId}`;
       
    } catch (error) {
        progressContainer.remove();
        downloadBtn.style.display = 'block';
        showToast('Download failed: ' + error.message, 'error');
    }
});

function isValidYouTubeUrl(url) {
    const pattern = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
    return pattern.test(url);
}

function displayVideoInfo(data) {
    thumbnail.src = data.thumbnail;
    videoTitle.textContent = data.title;
    videoDuration.textContent = `Duration: ${formatDuration(data.duration)}`;
    videoAuthor.textContent = `Channel: ${data.author}`;

    videoInfo.style.display = 'block';
    downloadOptions.style.display = 'block';
}

function populateQualityOptions(formats) {
    const qualityContainer = document.querySelector('.quality-options');
    qualityContainer.innerHTML = '';
   
    formats.forEach((format, index) => {
        const fileSizeMB = format.filesize ? format.filesize.toFixed(2) : 'Unknown';
        const option = document.createElement('div');
        option.className = 'option';
        option.innerHTML = `
            <input type="radio" name="quality" id="quality-${index}" value="${format.quality}" ${index === 0 ? 'checked' : ''}>
            <label for="quality-${index}">${format.quality} (${fileSizeMB} MB)</label>
        `;
        qualityContainer.appendChild(option);
    });
}

function formatDuration(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}
