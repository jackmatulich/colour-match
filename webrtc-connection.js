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

/** CORS proxy when dweet.cc is blocked from browser (e.g. GitHub Pages). */
function dweetProxyUrl(url) {
    return 'https://corsproxy.org/?' + encodeURIComponent(url);
}

/**
 * Store SDP on dweet.cc for signaling (tries direct, then CORS proxy if blocked).
 */
async function storeSdpOnDweet(sessionId, sdp, type) {
    const thingName = `colormatch-${sessionId}-${type}`;
    const dweetUrl = `https://dweet.cc/dweet/for/${thingName}`;
    const body = JSON.stringify({
        type: type,
        sdp: encodeSdp(sdp),
        timestamp: Date.now()
    });
    const opts = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body };

    try {
        let response;
        try {
            response = await fetch(dweetUrl, opts);
        } catch (err) {
            response = await fetch(dweetProxyUrl(dweetUrl), opts);
        }
        if (!response.ok) throw new Error('Failed to store on dweet.cc');
        return true;
    } catch (err) {
        console.error('Error storing on dweet.cc:', err);
        return false;
    }
}

/**
 * Store ICE candidate on dweet.cc
 */
async function storeIceCandidateOnDweet(sessionId, candidate, isOfferer) {
    const thingName = `colormatch-${sessionId}-ice-${isOfferer ? 'offerer' : 'answerer'}`;
    const dweetUrl = `https://dweet.cc/dweet/for/${thingName}`;
    
    try {
        // Convert RTCIceCandidate to plain object for storage
        const candidateObj = {
            candidate: candidate.candidate || candidate,
            sdpMLineIndex: candidate.sdpMLineIndex !== undefined ? candidate.sdpMLineIndex : null,
            sdpMid: candidate.sdpMid || null
        };
        
        const opts = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ candidate: candidateObj, timestamp: Date.now() })
        };
        let response;
        try {
            response = await fetch(dweetUrl, opts);
        } catch (err) {
            response = await fetch(dweetProxyUrl(dweetUrl), opts);
        }
        return response.ok;
    } catch (err) {
        console.error('Error storing ICE candidate:', err);
        return false;
    }
}

/**
 * Generate shareable URL with short session ID (single-page app: same page with ?s= code)
 */
function generateShareableUrl(sdp, baseUrl = null) {
    const sessionId = generateSessionId();
    if (!baseUrl) {
        const pathname = window.location.pathname;
        const directory = pathname.endsWith('/') ? pathname : pathname.substring(0, pathname.lastIndexOf('/') + 1);
        baseUrl = window.location.origin + directory;
    }
    const cleanBase = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
    const url = `${cleanBase}index.html?s=${sessionId}`;
    return { url: url, sessionId: sessionId };
}

/**
 * Generate shareable URL with session ID (single-page app)
 */
function generateShareableUrlWithSession(sessionId, baseUrl = null) {
    if (!baseUrl) {
        const pathname = window.location.pathname;
        const directory = pathname.endsWith('/') ? pathname : pathname.substring(0, pathname.lastIndexOf('/') + 1);
        baseUrl = window.location.origin + directory;
    }
    const cleanBase = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
    return `${cleanBase}index.html?s=${sessionId}`;
}

/**
 * Generate answer URL (answer is stored on dweet.cc; URL for display only)
 */
function generateAnswerUrl(answer, sessionId, baseUrl = null) {
    if (!sessionId) sessionId = generateSessionId();
    if (!baseUrl) {
        const pathname = window.location.pathname;
        const directory = pathname.endsWith('/') ? pathname : pathname.substring(0, pathname.lastIndexOf('/') + 1);
        baseUrl = window.location.origin + directory;
    }
    const cleanBase = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
    return { url: `${cleanBase}index.html?s=${sessionId}`, sessionId: sessionId };
}

/**
 * Extract session info from URL. Single-page app: ?s=CODE or ?session=CODE means display role.
 */
function extractSessionFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('s') || params.get('session');
    const type = params.get('type') || 'offer';
    if (sessionId) return { sessionId, type };
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
 * Retrieve SDP from dweet.cc using session ID.
 * Retries a few times to handle propagation delay or transient failures.
 */
async function retrieveSdpFromDweet(sessionId, type, maxRetries = 5) {
    const thingName = `colormatch-${encodeURIComponent(sessionId)}-${type}`;
    const url = `https://dweet.cc/get/latest/dweet/for/${thingName}`;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            let response;
            try {
                response = await fetch(url);
            } catch (err) {
                response = await fetch(dweetProxyUrl(url));
            }
            if (!response.ok) {
                if (attempt < maxRetries) {
                    await new Promise(r => setTimeout(r, 1500));
                    continue;
                }
                return null;
            }

            const data = await response.json();
            const dweet = (data.with && data.with[0]) ? data.with[0] : data;
            const content = (dweet && dweet.content) ? dweet.content : dweet;
            const sdpEncoded = content && (content.sdp || content.offer);
            if (sdpEncoded) {
                return decodeSdp(sdpEncoded);
            }
        } catch (err) {
            console.warn('dweet.cc fetch attempt ' + attempt + ' failed:', err.message);
            if (attempt < maxRetries) {
                await new Promise(r => setTimeout(r, 1500));
            } else {
                console.error('Error retrieving from dweet.cc:', err);
                return null;
            }
        }
    }
    return null;
}

/**
 * Retrieve ICE candidates from dweet.cc
 */
async function retrieveIceCandidatesFromDweet(sessionId, isOfferer) {
    const thingName = `colormatch-${sessionId}-ice-${isOfferer ? 'answerer' : 'offerer'}`;
    const url = `https://dweet.cc/get/latest/dweet/for/${thingName}`;
    try {
        let response;
        try {
            response = await fetch(url);
        } catch (err) {
            response = await fetch(dweetProxyUrl(url));
        }
        if (!response.ok) return null;

        const data = await response.json();
        if (data.with && data.with.length > 0) {
            const dweet = data.with[0];
            if (dweet.content && dweet.content.candidate) {
                // Return the full content including timestamp
                return {
                    candidate: dweet.content.candidate,
                    timestamp: dweet.content.timestamp || dweet.created
                };
            }
        }
        return null;
    } catch (err) {
        console.error('Error retrieving ICE candidates:', err);
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
    window.storeSdpOnDweet = storeSdpOnDweet;
    window.storeIceCandidateOnDweet = storeIceCandidateOnDweet;
    window.retrieveIceCandidatesFromDweet = retrieveIceCandidatesFromDweet;
}
