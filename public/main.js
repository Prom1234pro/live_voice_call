const joinRoomButton = document.getElementById('joinRoom');
const roomNameInput = document.getElementById('roomName');
const startCallButton = document.getElementById('startCall');
const endCallButton = document.getElementById('endCall');

const socket = new WebSocket('ws://localhost:3000');
const peerConnection = new RTCPeerConnection({
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
});

let localStream;
let room;

// Handle WebSocket messages
socket.onmessage = async (event) => {
    const data = JSON.parse(event.data);

    switch (data.type) {
        case 'signal':
            await peerConnection.setRemoteDescription(new RTCSessionDescription(data.data));
            if (data.data.type === 'offer') {
                const answer = await peerConnection.createAnswer();
                await peerConnection.setLocalDescription(answer);
                socket.send(JSON.stringify({ type: 'signal', targetRoom: room, signalData: answer }));
            }
            break;

        case 'call-started':
            alert(`A user in room "${data.room}" has started a call.`);
            break;

        default:
            console.log('Unknown message type:', data.type);
    }
};

// Handle ICE candidates
peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
        socket.send(JSON.stringify({
            type: 'signal',
            targetRoom: room,
            signalData: { candidate: event.candidate },
        }));
    }
};

// Handle receiving remote streams
peerConnection.ontrack = (event) => {
    const audio = document.createElement('audio');
    audio.srcObject = event.streams[0];
    audio.autoplay = true;
    document.body.appendChild(audio);
};

// Join room
joinRoomButton.onclick = () => {
    room = roomNameInput.value.trim();
    if (room) {
        socket.send(JSON.stringify({ type: 'join', room }));
        startCallButton.disabled = false;
        console.log(`Joined room: ${room}`);
    }
};

// Start call
startCallButton.onclick = async () => {
    localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    localStream.getTracks().forEach((track) => peerConnection.addTrack(track, localStream));

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    // Notify all users in the room that the call has started
    socket.send(JSON.stringify({ type: 'call-started', room }));

    // Send signaling data
    socket.send(JSON.stringify({ type: 'signal', targetRoom: room, signalData: offer }));

    startCallButton.disabled = true;
    endCallButton.disabled = false;
};

// End call
endCallButton.onclick = () => {
    peerConnection.close();
    localStream.getTracks().forEach((track) => track.stop());
    socket.close();

    startCallButton.disabled = false;
    endCallButton.disabled = true;
};
