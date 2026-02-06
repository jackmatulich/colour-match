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
        this.onIceCandidateCallback = null;
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

        // Handle ICE candidates - send them to answerer
        this.pc.onicecandidate = (event) => {
            if (event.candidate && this.onIceCandidateCallback) {
                this.onIceCandidateCallback(event.candidate);
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
     * Creates answer from received offer and automatically completes connection
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

        // Handle ICE candidates - send them back to offerer
        this.pc.onicecandidate = (event) => {
            if (event.candidate && this.onIceCandidateCallback) {
                this.onIceCandidateCallback(event.candidate);
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

        // Return answer so it can be sent back to offerer
        return this.pc.localDescription;
    }
    
    /**
     * Set callback for ICE candidates
     */
    onIceCandidate(callback) {
        this.onIceCandidateCallback = callback;
    }
    
    /**
     * Add ICE candidate from remote peer
     */
    async addIceCandidate(candidate) {
        if (this.pc && this.pc.remoteDescription) {
            await this.pc.addIceCandidate(candidate);
        }
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
 * Decode SDP from base64 (handles base64url encoding too)
 */
function decodeSdp(encoded) {
    try {
        // Handle base64url encoding (URL-safe)
        const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
        // Add padding if needed
        const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
        return JSON.parse(atob(padded));
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
 * Store SDP on dweet.io and generate short URL
 */
async function generateShareableUrl(sdp, baseUrl = null) {
    // Generate short session ID (6 chars)
    const sessionId = generateSessionId();
    
    // Store SDP on dweet.io
    const thingName = `colormatch-${sessionId}`;
    const dweetUrl = `https://dweet.io/dweet/for/${thingName}`;
    
    try {
        const response = await fetch(dweetUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                type: 'offer',
                sdp: encodeSdp(sdp),
                timestamp: Date.now()
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to store on dweet.io');
        }
        
        // Get the full base URL including path
        if (!baseUrl) {
            const pathname = window.location.pathname;
            const directory = pathname.substring(0, pathname.lastIndexOf('/') + 1);
            baseUrl = window.location.origin + directory;
        }
        
        // Use the phone page for offer, iPad page for answer
        const isPhone = window.location.pathname.includes('phone');
        const targetPage = isPhone ? 'ipad.html' : 'phone.html';
        
        // URL with just the short session ID - MUCH shorter!
        const cleanBase = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
        const url = `${cleanBase}${targetPage}?session=${sessionId}`;
        
        // Also store locally for fallback
        storeSdp(sessionId, sdp, 'offer');
        
        return { url: url, sessionId: sessionId };
    } catch (err) {
        console.error('Error storing on dweet.io:', err);
        // Fallback to local storage only
        const pathname = window.location.pathname;
        const directory = pathname.substring(0, pathname.lastIndexOf('/') + 1);
        const baseUrl = window.location.origin + directory;
        const isPhone = window.location.pathname.includes('phone');
        const targetPage = isPhone ? 'ipad.html' : 'phone.html';
        const cleanBase = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
        const url = `${cleanBase}${targetPage}?session=${sessionId}`;
        storeSdp(sessionId, sdp, 'offer');
        return { url: url, sessionId: sessionId };
    }
}

/**
 * Generate shareable URL with short session ID (legacy, for sessionStorage approach)
 */
function generateShareableUrlWithSession(sessionId, baseUrl = null) {
    if (!baseUrl) {
        const pathname = window.location.pathname;
        const directory = pathname.substring(0, pathname.lastIndexOf('/') + 1);
        baseUrl = window.location.origin + directory;
    }
    const isPhone = window.location.pathname.includes('phone');
    const targetPage = isPhone ? 'ipad.html' : 'phone.html';
    const cleanBase = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
    return `${cleanBase}${targetPage}?session=${sessionId}`;
}

/**
 * Store answer on dweet.io and generate short URL
 */
async function generateAnswerUrl(answer, sessionId, baseUrl = null) {
    if (!sessionId) {
        sessionId = generateSessionId();
    }
    
    // Store answer on dweet.io
    const thingName = `colormatch-${sessionId}-answer`;
    const dweetUrl = `https://dweet.io/dweet/for/${thingName}`;
    
    try {
        const response = await fetch(dweetUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                type: 'answer',
                sdp: encodeSdp(answer),
                timestamp: Date.now()
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to store on dweet.io');
        }
        
        if (!baseUrl) {
            const pathname = window.location.pathname;
            const directory = pathname.substring(0, pathname.lastIndexOf('/') + 1);
            baseUrl = window.location.origin + directory;
        }
        
        // Store locally for fallback
        storeSdp(sessionId, answer, 'answer');
        
        const cleanBase = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
        const url = `${cleanBase}phone.html?session=${sessionId}&type=answer`;
        
        return { url: url, sessionId: sessionId };
    } catch (err) {
        console.error('Error storing answer on dweet.io:', err);
        // Fallback
        if (!baseUrl) {
            const pathname = window.location.pathname;
            const directory = pathname.substring(0, pathname.lastIndexOf('/') + 1);
            baseUrl = window.location.origin + directory;
        }
        storeSdp(sessionId, answer, 'answer');
        const cleanBase = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
        const url = `${cleanBase}phone.html?session=${sessionId}&type=answer`;
        return { url: url, sessionId: sessionId };
    }
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
 * Retrieve SDP from dweet.io using session ID
 */
async function retrieveSdpFromDweet(sessionId, type) {
    const thingName = type === 'answer' 
        ? `colormatch-${sessionId}-answer`
        : `colormatch-${sessionId}`;
    
    try {
        const response = await fetch(`https://dweet.io/get/latest/dweet/for/${thingName}`);
        if (!response.ok) {
            return null;
        }
        
        const data = await response.json();
        if (data.with && data.with.length > 0) {
            const dweet = data.with[0];
            if (dweet.content && dweet.content.sdp) {
                return decodeSdp(dweet.content.sdp);
            }
        }
        return null;
    } catch (err) {
        console.error('Error retrieving from dweet.io:', err);
        return null;
    }
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
    window.retrieveSdpFromDweet = retrieveSdpFromDweet;
}
