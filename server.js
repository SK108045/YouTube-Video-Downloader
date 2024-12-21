const express = require('express');
const cors = require('cors');
const youtubeDl = require('youtube-dl-exec');
const db = require('./config/firebase.config');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const os = require('os');

// Initialize express
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Serve frontend files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Get video info
app.get('/api/video-info', async (req, res) => {
    try {
        const videoUrl = req.query.url;
        
        const videoInfo = await youtubeDl(videoUrl, {
            dumpSingleJson: true,
            noCheckCertificates: true,
            noWarnings: true,
            format: 'bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4] / bv*+ba/b',
            cookies: '/path/to/your/cookies.txt', // Update this path
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        });

        const formats = videoInfo.formats
            .filter(format => {
                return (format.ext === 'mp4' && format.height && format.filesize_approx) ||
                       (format.format_id === '18' && format.filesize);
            })
            .map(format => {
                const rawSize = format.filesize || format.filesize_approx || 0;
                const sizeInMB = (rawSize / (1024 * 1024));
                const adjustedSize = sizeInMB + 2;
                return {
                    quality: `${format.height}p`,
                    formatId: format.format_id,
                    filesize: Math.round(adjustedSize * 100) / 100,
                    itag: format.format_id
                };
            })
            .sort((a, b) => parseInt(b.quality) - parseInt(a.quality));

        const uniqueFormats = Array.from(new Set(formats.map(f => f.quality)))
            .map(quality => formats.find(f => f.quality === quality))
            .filter(format => format);

        const response = {
            title: videoInfo.title,
            thumbnail: videoInfo.thumbnail,
            duration: videoInfo.duration,
            author: videoInfo.uploader,
            formats: uniqueFormats
        };

        console.log('Video info fetched:', response.title);
        res.json(response);
    } catch (error) {
        console.log('Error details:', error);
        res.status(400).json({ error: 'Video fetch failed', details: error.message });
    }
});

// Download video
app.get('/api/download', async (req, res) => {
    const tempDir = process.env.DOWNLOAD_DIR || '/tmp/youtube-downloads';
    
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }

    const tempFileName = crypto.randomBytes(16).toString('hex') + '.mp4';
    const tempFilePath = path.join(tempDir, tempFileName);

    try {
        const { url, formatId } = req.query;

        const videoInfo = await youtubeDl(url, {
            dumpSingleJson: true,
            noCheckCertificates: true,
            noWarnings: true,
            cookies: '/path/to/your/cookies.txt', // Update this path
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        });

        await youtubeDl(url, {
            format: formatId,
            output: `${tempFilePath}.video`,
            cookies: '/path/to/your/cookies.txt', // Update this path
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            limitRate: '1.4M',
            retries: 10,
            concurrent: 2,
            maxDownloads: 1,
            bufferSize: '1M'
        });

        await youtubeDl(url, {
            format: 'bestaudio[ext=m4a]',
            output: `${tempFilePath}.audio`,
            cookies: '/path/to/your/cookies.txt', // Update this path
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            limitRate: '1.4M',
            retries: 10,
            concurrent: 2,
            maxDownloads: 1,
            bufferSize: '1M'
        });

        const { execSync } = require('child_process');
        execSync(`ffmpeg -i "${tempFilePath}.video" -i "${tempFilePath}.audio" -c:v copy -c:a aac -preset ultrafast -movflags +faststart -bufsize 32M -maxrate 32M -threads 4 -b:a 256k "${tempFilePath}"`);

        fs.unlinkSync(`${tempFilePath}.video`);
        fs.unlinkSync(`${tempFilePath}.audio`);

        if (fs.existsSync(tempFilePath)) {
            const stats = fs.statSync(tempFilePath);
            
            res.setHeader('Content-Type', 'video/mp4');
            res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(videoInfo.title)}.mp4"`);
            res.setHeader('Content-Length', stats.size);
            res.setHeader('Accept-Ranges', 'bytes');
            res.setHeader('Cache-Control', 'public, max-age=31536000');
            res.setHeader('X-Content-Type-Options', 'nosniff');

            const fileStream = fs.createReadStream(tempFilePath, {
                highWaterMark: 2 * 1024 * 1024
            });
            
            fileStream.pipe(res);
            fileStream.on('end', () => {
                fs.unlinkSync(tempFilePath);
            });
        } else {
            throw new Error('Merged file not found');
        }
    } catch (error) {
        console.error('Download error:', error);
        res.status(400).json({ error: 'Download failed', details: error.message });
        
        [tempFilePath, `${tempFilePath}.video`, `${tempFilePath}.audio`].forEach(file => {
            if (fs.existsSync(file)) fs.unlinkSync(file);
        });
    }
});

// Get download history
app.get('/api/history', async (req, res) => {
    try {
        const historyRef = db.ref('downloads');
        const snapshot = await historyRef.orderByChild('timestamp').limitToLast(10).once('value');
        const history = [];
        
        snapshot.forEach(child => {
            history.unshift({
                id: child.key,
                ...child.val()
            });
        });
        
        res.json(history);
    } catch (error) {
        res.status(500).json({ error: 'History fetch failed' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
