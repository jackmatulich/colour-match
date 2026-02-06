/**
 * WebRTC Connection Management
 * Handles peer-to-peer connection setup and data channel communication
 */

class WebRTCConnection {
    constructor() {
        this.pc = null;
        this.dataChannel = null;
        this.isInitiator = false;
        this.onMessageCallback = null;
        this.onConnectionStateCallback = null;
        this.onDataChannelCallback = null;
    }

    /**
     * Initialize as offerer (phone side)
     * Creates offer and sets up data channel
     */
    async initAsOfferer() {
        this.isInitiator = true;
        
        // Create RTCPeerConnection with STUN servers for NAT traversal
        const configuration = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        };

        this.pc = new RTCPeerConnection(configuration);

        // Create data channel for sending color data
        this.dataChannel = this.pc.createDataChannel('colors', {
            ordered: true
        });

        this.setupDataChannel(this.dataChannel);

        // Handle ICE candidates
        this.pc.onicecandidate = (event) => {
            if (event.candidate) {
                // ICE candidate generated, can be sent to peer
                // In this implementation, we'll include it in the offer/answer
            }
        };

        // Handle connection state changes
        this.pc.onconnectionstatechange = () => {
            if (this.onConnectionStateCallback) {
                this.onConnectionStateCallback(this.pc.connectionState);
            }
        };

        // Create offer
        const offer = await this.pc.createOffer();
        await this.pc.setLocalDescription(offer);

        // Wait for ICE gathering to complete
        await this.waitForIceGathering();

        return this.pc.localDescription;
    }

    /**
     * Initialize as answerer (iPad side)
     * Creates answer from received offer
     */
    async initAsAnswerer(offerSdp) {
        this.isInitiator = false;

        const configuration = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        };

        this.pc = new RTCPeerConnection(configuration);

        // Handle incoming data channel
        this.pc.ondatachannel = (event) => {
            this.dataChannel = event.channel;
            this.setupDataChannel(this.dataChannel);
        };

        // Handle ICE candidates
        this.pc.onicecandidate = (event) => {
            if (event.candidate) {
                // ICE candidate generated
            }
        };

        // Handle connection state changes
        this.pc.onconnectionstatechange = () => {
            if (this.onConnectionStateCallback) {
                this.onConnectionStateCallback(this.pc.connectionState);
            }
        };

        // Set remote description (offer)
        await this.pc.setRemoteDescription(new RTCSessionDescription(offerSdp));

        // Create answer
        const answer = await this.pc.createAnswer();
        await this.pc.setLocalDescription(answer);

        // Wait for ICE gathering to complete
        await this.waitForIceGathering();

        return this.pc.localDescription;
    }

    /**
     * Set remote description (for completing the connection)
     */
    async setRemoteDescription(sdp) {
        if (this.pc) {
            await this.pc.setRemoteDescription(new RTCSessionDescription(sdp));
        }
    }

    /**
     * Setup data channel event handlers
     */
    setupDataChannel(channel) {
        channel.onopen = () => {
            console.log('Data channel opened');
            if (this.onDataChannelCallback) {
                this.onDataChannelCallback(true);
            }
        };

        channel.onclose = () => {
            console.log('Data channel closed');
            if (this.onDataChannelCallback) {
                this.onDataChannelCallback(false);
            }
        };

        channel.onerror = (error) => {
            console.error('Data channel error:', error);
        };

        channel.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (this.onMessageCallback) {
                    this.onMessageCallback(data);
                }
            } catch (e) {
                console.error('Error parsing message:', e);
            }
        };
    }

    /**
     * Send message through data channel
     */
    sendMessage(data) {
        if (this.dataChannel && this.dataChannel.readyState === 'open') {
            this.dataChannel.send(JSON.stringify(data));
            return true;
        } else {
            console.warn('Data channel not ready');
            return false;
        }
    }

    /**
     * Set callback for incoming messages
     */
    onMessage(callback) {
        this.onMessageCallback = callback;
    }

    /**
     * Set callback for connection state changes
     */
    onConnectionStateChange(callback) {
        this.onConnectionStateCallback = callback;
    }

    /**
     * Set callback for data channel state changes
     */
    onDataChannelStateChange(callback) {
        this.onDataChannelCallback = callback;
    }

    /**
     * Wait for ICE gathering to complete
     */
    waitForIceGathering() {
        return new Promise((resolve) => {
            if (this.pc.iceGatheringState === 'complete') {
                resolve();
                return;
            }

            const checkState = () => {
                if (this.pc.iceGatheringState === 'complete') {
                    resolve();
                } else {
                    setTimeout(checkState, 100);
                }
            };

            this.pc.onicegatheringstatechange = () => {
                if (this.pc.iceGatheringState === 'complete') {
                    resolve();
                }
            };

            // Timeout after 5 seconds
            setTimeout(() => {
                resolve();
            }, 5000);
        });
    }

    /**
     * Close connection
     */
    close() {
        if (this.dataChannel) {
            this.dataChannel.close();
        }
        if (this.pc) {
            this.pc.close();
        }
    }

    /**
     * Check if data channel is ready
     */
    isReady() {
        return this.dataChannel && this.dataChannel.readyState === 'open';
    }
}

/**
 * Generate a short session ID (6 characters)
 */
function generateSessionId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

/**
 * Encode SDP to base64 for storage/sharing
 */
function encodeSdp(sdp) {
    return btoa(JSON.stringify(sdp));
}

/**
 * Decode SDP from base64
 */
function decodeSdp(encoded) {
    try {
        return JSON.parse(atob(encoded));
    } catch (e) {
        console.error('Error decoding SDP:', e);
        return null;
    }
}

/**
 * Store SDP in sessionStorage with session ID
 */
function storeSdp(sessionId, sdp, type) {
    const key = `sdp_${sessionId}_${type}`;
    sessionStorage.setItem(key, encodeSdp(sdp));
    // Also store timestamp to clean up old entries
    sessionStorage.setItem(`${key}_time`, Date.now().toString());
}

/**
 * Retrieve SDP from sessionStorage
 */
function retrieveSdp(sessionId, type) {
    const key = `sdp_${sessionId}_${type}`;
    const encoded = sessionStorage.getItem(key);
    if (encoded) {
        return decodeSdp(encoded);
    }
    return null;
}

/**
 * Generate shareable URL with short session ID
 */
function generateShareableUrl(sessionId, baseUrl = null) {
    // Get the full base URL including path
    if (!baseUrl) {
        // Get the directory path (everything except the filename)
        const pathname = window.location.pathname;
        const directory = pathname.substring(0, pathname.lastIndexOf('/') + 1);
        baseUrl = window.location.origin + directory;
    }
    
    // Use the phone page for offer, iPad page for answer
    const isPhone = window.location.pathname.includes('phone');
    const targetPage = isPhone ? 'ipad.html' : 'phone.html';
    
    // Ensure baseUrl ends with /
    const cleanBase = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
    return `${cleanBase}${targetPage}?session=${sessionId}`;
}

/**
 * Generate shareable URL for answer
 */
function generateAnswerUrl(sessionId, baseUrl = null) {
    // Get the full base URL including path
    if (!baseUrl) {
        // Get the directory path (everything except the filename)
        const pathname = window.location.pathname;
        const directory = pathname.substring(0, pathname.lastIndexOf('/') + 1);
        baseUrl = window.location.origin + directory;
    }
    
    // Ensure baseUrl ends with /
    const cleanBase = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
    return `${cleanBase}phone.html?session=${sessionId}&type=answer`;
}

/**
 * Extract session info from URL parameters
 */
function extractSessionFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session');
    const type = params.get('type') || 'offer'; // default to offer if not specified
    
    if (sessionId) {
        return { sessionId, type };
    }
    return null;
}

// Ensure all functions are available globally
if (typeof window !== 'undefined') {
    window.generateSessionId = generateSessionId;
    window.storeSdp = storeSdp;
    window.retrieveSdp = retrieveSdp;
    window.generateShareableUrl = generateShareableUrl;
    window.generateAnswerUrl = generateAnswerUrl;
    window.extractSessionFromUrl = extractSessionFromUrl;
    window.encodeSdp = encodeSdp;
    window.decodeSdp = decodeSdp;
}

/**
 * Extract SDP from URL parameters (legacy support)
 */
function extractSdpFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const offer = params.get('offer');
    const answer = params.get('answer');
    if (offer) {
        return { type: 'offer', sdp: decodeSdp(offer) };
    }
    if (answer) {
        return { type: 'answer', sdp: decodeSdp(answer) };
    }
    return null;
}

// Ensure all functions are available globally (must be after all function definitions)
if (typeof window !== 'undefined') {
    window.generateSessionId = generateSessionId;
    window.storeSdp = storeSdp;
    window.retrieveSdp = retrieveSdp;
    window.generateShareableUrl = generateShareableUrl;
    window.generateAnswerUrl = generateAnswerUrl;
    window.extractSessionFromUrl = extractSessionFromUrl;
    window.encodeSdp = encodeSdp;
    window.decodeSdp = decodeSdp;
    window.extractSdpFromUrl = extractSdpFromUrl;
}
