# Color Matching Web App

A lightweight, serverless web application for matching physical device colors to iPad display colors. The app uses your phone's camera to capture both an iPad and a physical device, allows you to select a color from the physical device, and then cycles through colors on the iPad to find the best match using perceptually uniform color space algorithms.

## Features

- **Serverless**: Fully client-side, no backend required
- **WebRTC Peer-to-Peer**: Direct communication between phone and iPad
- **Smart Color Matching**: Uses LAB color space and Delta E 2000 for perceptually accurate matching
- **RGB & CMYK Support**: Output colors in both RGB and CMYK formats
- **Lightweight**: Vanilla JavaScript, no heavy frameworks

## How It Works

1. **Phone Side**: 
   - Opens camera view showing both iPad and physical device
   - User clicks on a color from the physical device
   - Generates WebRTC connection offer and displays as QR code
   - Cycles through candidate colors and sends them to iPad

2. **iPad Side**:
   - Scans QR code or enters connection URL from phone
   - Displays colors full-screen as they're received
   - User provides feedback (match/no match)
   - Sends feedback back to phone

3. **Color Matching**:
   - Converts target color to LAB color space (perceptually uniform)
   - Generates candidate colors using multiple strategies:
     - Grid search around target
     - Random sampling
     - LAB space exploration
     - Gradient-based search
   - Uses Delta E 2000 formula to rank candidates
   - Iteratively refines search based on user feedback

## Setup

1. **Host the files**: 
   - Option 1: Use a local web server (Python: `python -m http.server 8000`)
   - Option 2: Deploy to a static hosting service (Netlify, Vercel, GitHub Pages)
   - Option 3: Open files directly (may have limitations with camera access)

2. **Connect devices**:
   - Connect iPad to phone's hotspot
   - Both devices should be on the same local network

3. **Access the app**:
   - Open `phone.html` on your phone
   - Open `ipad.html` on your iPad
   - Both should use the same base URL (e.g., `http://your-ip:8000/phone.html`)

## Usage

### On Phone:

1. Click "Start Connection" to create a WebRTC offer
2. A QR code will appear - this contains the connection URL
3. Either:
   - Have iPad scan the QR code, OR
   - Copy the URL and share it with iPad
4. After iPad connects, you'll see an input field for the answer URL
5. iPad will display a QR code with the answer URL - scan it or manually enter it
6. Once connected, click on the camera view to select a color from the physical device
7. Click "Start Matching" to begin cycling through colors
8. Colors will be sent to iPad automatically

### On iPad:

1. Scan the QR code from phone (or manually enter the connection URL)
2. Click "Connect"
3. After connection, you'll see an answer URL - share this with the phone
4. Once phone completes connection, colors will start appearing
5. Use "Match" or "No Match" buttons to provide feedback
6. The phone will use this feedback to refine the color search

## Technical Details

### Color Spaces

- **RGB**: Standard display color space (0-255 per channel)
- **LAB**: Perceptually uniform color space (better for matching)
- **XYZ**: Intermediate color space for conversions
- **CMYK**: Print color space (0-100% per channel)

### Color Matching Algorithm

The app uses the **Delta E 2000** formula, which is the most perceptually accurate color difference metric. It accounts for:
- Perceptual uniformity (LAB space)
- Human visual sensitivity to different colors
- Chroma and hue differences

### WebRTC Signaling

Since the app is serverless, it uses a manual signaling approach:
1. Phone creates offer → QR code
2. iPad scans offer → creates answer → QR code
3. Phone scans answer → completes connection
4. All subsequent communication is peer-to-peer via WebRTC DataChannel

## Browser Requirements

- Modern browser with WebRTC support (Chrome, Firefox, Safari, Edge)
- Camera access permissions
- HTTPS or localhost (required for camera API)

## Files

- `phone.html` - Phone interface with camera and color picker
- `ipad.html` - iPad interface for displaying colors
- `color-matcher.js` - Color space conversions and matching algorithms
- `webrtc-connection.js` - WebRTC peer connection management

## Limitations

- Manual signaling step required (QR code exchange)
- Works best on local network (phone hotspot)
- Camera quality affects color accuracy
- Screen color profiles may vary between devices

## Future Improvements

- Automatic answer exchange via clipboard or shared storage
- Camera calibration for better color accuracy
- Support for multiple color profiles
- Export matched colors to various formats
