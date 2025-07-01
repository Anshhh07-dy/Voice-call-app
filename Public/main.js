const wsProtocol = location.protocol === "https:" ? "wss" : "ws";
const ws = new WebSocket(`${wsProtocol}://${location.host}`);

const peer = new RTCPeerConnection();
let localStream;

navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
  localStream = stream;
  stream.getTracks().forEach(track => peer.addTrack(track, stream));

  peer.ontrack = event => {
    const remoteAudio = new Audio();
    remoteAudio.srcObject = event.streams[0];
    remoteAudio.play();
  };
});

peer.onicecandidate = event => {
  if (event.candidate) {
    ws.send(JSON.stringify({ ice: event.candidate }));
  }
};

ws.onmessage = async event => {
  const data = JSON.parse(event.data);
  if (data.offer) {
    await peer.setRemoteDescription(new RTCSessionDescription(data.offer));
    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);
    ws.send(JSON.stringify({ answer }));
  } else if (data.answer) {
    await peer.setRemoteDescription(new RTCSessionDescription(data.answer));
  } else if (data.ice) {
    try {
      await peer.addIceCandidate(data.ice);
    } catch (e) {
      console.error("ICE error:", e);
    }
  }
};

document.getElementById("callBtn").onclick = async () => {
  const offer = await peer.createOffer();
  await peer.setLocalDescription(offer);
  ws.send(JSON.stringify({ offer }));
};

document.getElementById("endBtn").onclick = () => {
  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
  }
  peer.getSenders().forEach(sender => peer.removeTrack(sender));
  peer.close();
  alert("Call ended.");
};