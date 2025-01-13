# YouTube-Video-Downloader
This repo contains a high-performance YouTube video downloader built with Node.js and Express, featuring a clean, responsive frontend built with vanilla JavaScript. It uses youtube-dl-exec for quick video processing, integrates server-side caching to keep things efficient, and relies on Firebase for analytics. 
### - **Currently live [here](https://youtube.sk10codebase.online)**

## Features
![UI Screenshot](https://shorturl.sk10codebase.online/images/Youtube/Youtube.png)
- Multiple quality options (360p to 4k)
- Dark/Light theme support
- Real-time download progress
- YouTube Shorts compatibility
- No registration required
- Clean, ad-free interface

## Quality Options
![UI Screenshot](https://shorturl.sk10codebase.online/images/Youtube/Quality.png)
Downloads available in multiple resolutions:
- 2160p (4K Ultra HD)
- 1440p (2K)
- 1080p (Full HD)
- 720p (HD)
- 480p
- 360p
- 240p
- 144p

## Video Information Display

Once you paste a YouTube URL, the system instantly fetches and displays the following

![Video Info Display](https://shorturl.sk10codebase.online/images/Youtube/UserInterface.png)

- High quality video thumbnail
- Complete video title
- Channel name
- Video duration

This clean preview ensures you're downloading exactly the video you want, presented in a sleek, organized layout before selecting your preferred quality option.

## Core Architecture

The application uses a multi-stage processing pipeline to handle video downloads efficiently

### Video Processing
The backend implements a dual-stream approach, separately processing video and audio streams for optimal quality. Using youtube-dl-exec, it fetches the highest quality streams available, then uses FFmpeg for combining them with optimized settings:

- Concurrent video/audio stream processing
- Smart buffer management (32MB buffer size)
- Ultrafast FFmpeg preset with threading optimization
- Automatic temporary file cleanup
- Chunked transfer encoding for smooth downloads

### Server Infrastructure
The Web App is currently hosted on my VPS with
- Nginx reverse proxy configuration
- Memory-optimized video processing
- Automatic cleanup routines

## Tech Stack
- Html and Css
- Vanilla JavaScript 
- Node.js & Express
- youtube-dl-exec for video processing
- FFmpeg for media handling
- Firebase integration

## Development Status 

This project is currently in its startup phase. The application is running smoothly in production **[here](https://youtube.sk10codebase.online)**, serving users with fast and reliable downloads. As I continue to grow this platform, I will be releasing versions of the source code in the future.

---
Star this repository to stay updated on the source code releases and upcoming features

  
