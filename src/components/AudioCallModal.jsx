import React from "react";

const AudioCallModal = ({
  callStatus,
  isVideoCallActive,
  selectedUser,
  answerAudioCall,
  toggleMute,
  isMuted,
  endCallCleanUp,
}) => {
  if (callStatus === "idle" || isVideoCallActive) return null;

  return (
    <div style={{
      position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
      backgroundColor: "rgba(0, 0, 0, 0.85)", zIndex: 2000,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "white",
    }}>
      <img
        src={selectedUser.profilePic || "/default-profile.png"}
        width="100" height="100"
        style={{ borderRadius: "50%", objectFit: "cover", marginBottom: "20px", border: "3px solid #7c3aed" }}
        alt={selectedUser.username}
      />
      <h4>{selectedUser.username}</h4>
      <p style={{ fontSize: "16px", opacity: 0.8, marginBottom: "30px" }}>
        {callStatus === "calling" && "Calling..."}
        {callStatus === "incoming" && "Incoming Audio Call..."}
        {callStatus === "connected" && "Connected 🎙️"}
      </p>

      <div className="d-flex" style={{ gap: "20px" }}>
        {callStatus === "incoming" && (
          <button className="btn btn-success btn-lg px-4" onClick={answerAudioCall} style={{ backgroundColor: "#28a745" }}>
            Accept 📞
          </button>
        )}
        {callStatus === "connected" && (
          <button className={`btn btn-lg px-4 ${isMuted ? "btn-warning" : "btn-secondary"}`} onClick={toggleMute}>
            {isMuted ? "Unmute 🔇" : "Mute 🎤"}
          </button>
        )}
        <button className="btn btn-danger btn-lg px-4" onClick={() => endCallCleanUp(true, true)}>
          End Call ❌
        </button>
      </div>
    </div>
  );
};

export default AudioCallModal;