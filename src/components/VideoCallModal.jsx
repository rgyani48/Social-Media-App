import React from "react";

const VideoCallModal = ({
  isVideoCallActive,
  callStatus,
  remoteVideoRef,
  localVideoRef,
  answerVideoCall,
  toggleMute,
  endCallCleanUp,
  toggleVideo,
  isMuted,
  isVideoOff,
}) => {
  if (!isVideoCallActive) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      backgroundColor: 'rgba(0,0,0,0.95)', zIndex: 9999,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{
        position: 'relative', width: '90%', maxWidth: '900px', height: '70vh',
        backgroundColor: '#000', borderRadius: '16px', overflow: 'hidden', border: '2px solid #7c3aed'
      }}>
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          style={{ width: '100%', height: '100%', objectFit: 'cover', background: '#111' }}
        />

        <div style={{
          position: 'absolute', top: '20px', left: '20px',
          background: 'rgba(0,0,0,0.7)', padding: '8px 16px', borderRadius: '20px',
          color: 'white', fontSize: '15px', fontWeight: '500'
        }}>
          {callStatus === "incoming" ? "Incoming Video Call..." : callStatus}
        </div>

        <div style={{
          position: 'absolute', bottom: '20px', right: '20px',
          width: '140px', height: '180px', backgroundColor: '#222',
          borderRadius: '12px', overflow: 'hidden', border: '2px solid #7c3aed',
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
        }}>
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '20px', marginTop: '25px' }}>
        {callStatus === "incoming" && (
          <button
            onClick={answerVideoCall}
            style={{
              padding: '12px 28px', borderRadius: '30px', border: 'none',
              backgroundColor: '#28a745', color: '#fff', cursor: 'pointer', fontSize: '15px', fontWeight: '600'
            }}
          >
            Accept 📹
          </button>
        )}

        <button
          onClick={toggleMute}
          style={{
            padding: '12px 24px', borderRadius: '30px', border: 'none',
            backgroundColor: isMuted ? '#dc3545' : '#333', color: '#fff', cursor: 'pointer', fontSize: '15px', fontWeight: '600'
          }}
        >
          {isMuted ? 'Unmute 🔇' : 'Mute 🎤'}
        </button>

        <button
          onClick={() => endCallCleanUp(true, true)}
          style={{
            padding: '12px 28px', borderRadius: '30px', border: 'none',
            backgroundColor: '#dc3545', color: '#fff', cursor: 'pointer', fontSize: '15px', fontWeight: '600'
          }}
        >
          End Call ❌
        </button>

        <button
          onClick={toggleVideo}
          style={{
            padding: '12px 24px', borderRadius: '30px', border: 'none',
            backgroundColor: isVideoOff ? '#dc3545' : '#333', color: '#fff', cursor: 'pointer', fontSize: '15px', fontWeight: '600'
          }}
        >
          {isVideoOff ? 'Cam On 📹' : 'Cam Off 🚫'}
        </button>
      </div>
    </div>
  );
};

export default VideoCallModal;