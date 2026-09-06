import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import {
  doc,
  getDoc,
  collection,
  addDoc,
  updateDoc,
  serverTimestamp,
  onSnapshot,
  setDoc,
  query,
  orderBy,
  arrayUnion,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { db } from "../firebase";
import VideoCallModal from "./VideoCallModal";
import AudioCallModal from "./AudioCallModal";

const Chat = ({ darkMode, setDarkMode }) => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const auth = getAuth();
  const currentUser = auth.currentUser;

  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [replyMessage, setReplyMessage] = useState(null);
  const [menuOpen, setMenuOpen] = useState(null);
  const [menuPosition, setMenuPosition] = useState("bottom"); // "top" or "bottom"
  const [isTyping, setIsTyping] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(null);
  const [clickedMessageId, setClickedMessageId] = useState(null);

  // Call States (Unified for Audio & Video)
  const [callStatus, setCallStatus] = useState("idle"); 
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isVideoCallActive, setIsVideoCallActive] = useState(false);
  const [currentCallId, setCurrentCallId] = useState(null);

  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const callStartTime = useRef(null);
  const callLoggedRef = useRef(false);
  const callConnectedRef = useRef(false);

  const [isDark, setIsDark] = useState(darkMode ?? false);

  const servers = {
    iceServers: [
      { urls: ["stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"] },
    ],
  };

  useEffect(() => {
    if (darkMode !== undefined) {
      setIsDark(darkMode);
    }
  }, [darkMode]);

  const toggleTheme = () => {
    const nextMode = !isDark;
    setIsDark(nextMode);
    if (setDarkMode) {
      setDarkMode(nextMode);
    }
  };

  const inputRef = useRef(null);
  const menuRef = useRef(null);
  const chatContainerRef = useRef(null);
  const initialScrollDone = useRef(false);
  const isUserSending = useRef(false);

  const reactionEmojis = ["❤️", "😂", "👍", "🔥", "😍", "😢"];

  const chatId =
    currentUser && selectedUser
      ? currentUser.uid > selectedUser.id
        ? currentUser.uid + selectedUser.id
        : selectedUser.id + currentUser.uid
      : null;

  // Real-time listener for Selected User
  useEffect(() => {
    if (!userId) return;
    const unsubscribeUser = onSnapshot(doc(db, "users", userId), (snap) => {
      if (snap.exists()) {
        setSelectedUser({
          id: snap.id,
          ...snap.data(),
        });
      }
    });
    initialScrollDone.current = false;
    return () => unsubscribeUser();
  }, [userId]);

  useEffect(() => {
    if (!chatId || !currentUser) return;

    const callDocRef = doc(db, "calls", chatId);
    const unsubscribe = onSnapshot(callDocRef, async (snapshot) => {
      if (!snapshot.exists()) return;
      const data = snapshot.data();

      if (data.receiverId === currentUser.uid && callStatus === "idle" && data.status === "calling") {
        setCallStatus("incoming");
        callLoggedRef.current = false;
        if (data.isVideo) {
          setIsVideoCallActive(true);
          setCurrentCallId(chatId);
        }
      }

      if (data.status === "connected" && (callStatus === "calling" || callStatus === "incoming")) {
        setCallStatus("connected");
        callConnectedRef.current = true;
        if (data.isVideo) {
          setIsVideoCallActive(true);
        }
        if (!callStartTime.current) callStartTime.current = Date.now();
      }

      if (data.status === "ended" && callStatus !== "idle") {
        endCallCleanUp(false, false);
      }
    });

    return () => unsubscribe();
  }, [chatId, currentUser, callStatus]);

  // ------------------ VIDEO CALL FUNCTIONS ------------------
  const startVideoCall = async () => {
    if (!chatId || !currentUser || !selectedUser) return;
    setCurrentCallId(chatId);
    setIsVideoCallActive(true);
    setCallStatus("calling");
    callLoggedRef.current = false;
    callConnectedRef.current = false;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const pc = new RTCPeerConnection(servers);
      peerConnectionRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      const remoteStream = new MediaStream();
      pc.ontrack = (event) => {
        event.streams[0].getTracks().forEach((track) => remoteStream.addTrack(track));
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
        setCallStatus("connected");
        callConnectedRef.current = true;
        if (!callStartTime.current) callStartTime.current = Date.now();
      };

      const offerCollection = collection(db, "calls", chatId, "offerCandidates");
      const answerCollection = collection(db, "calls", chatId, "answerCandidates");

      pc.onicecandidate = async (event) => {
        if (event.candidate) {
          await addDoc(offerCollection, event.candidate.toJSON());
        }
      };

      const offerDescription = await pc.createOffer();
      await pc.setLocalDescription(offerDescription);

      await setDoc(doc(db, "calls", chatId), {
        offer: { type: offerDescription.type, sdp: offerDescription.sdp },
        callerId: currentUser.uid,
        receiverId: selectedUser.id,
        status: "calling",
        isVideo: true,
        createdAt: serverTimestamp(),
      });

      onSnapshot(doc(db, "calls", chatId), async (snapshot) => {
        const data = snapshot.data();
        try {
          if (pc && pc.signalingState !== "closed" && !pc.currentRemoteDescription && data?.answer) {
            await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
            setCallStatus("connected");
            callConnectedRef.current = true;
            if (!callStartTime.current) callStartTime.current = Date.now();
          }
        } catch (err) {
          console.warn("Ignored remote answer error:", err);
        }
      });

      onSnapshot(answerCollection, (snapshot) => {
        snapshot.docChanges().forEach(async (change) => {
          if (change.type === "added") {
            try {
              if (
                peerConnectionRef.current &&
                peerConnectionRef.current.signalingState !== "closed" &&
                peerConnectionRef.current.remoteDescription &&
                peerConnectionRef.current.remoteDescription.type
              ) {
                const candidateData = change.doc.data();
                if (candidateData && candidateData.candidate) {
                  await peerConnectionRef.current.addIceCandidate(
                    new RTCIceCandidate(candidateData)
                  );
                }
              }
            } catch (e) {
              console.warn("Ignored ICE candidate error:", e);
            }
          }
        });
      });
    } catch (err) {
      console.error("Video Call Start Error:", err);
      alert("Camera/Microphone permission denied or connection error.");
      endCallCleanUp(true, false);
    }
  };

  const answerVideoCall = async () => {
    if (!chatId || !currentUser) return;
    try {
      setCallStatus("connected");
      callConnectedRef.current = true;
      callStartTime.current = Date.now();
      callLoggedRef.current = false;
      setIsVideoCallActive(true);

      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const pc = new RTCPeerConnection(servers);
      peerConnectionRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      const remoteStream = new MediaStream();
      pc.ontrack = (event) => {
        event.streams[0].getTracks().forEach((track) => remoteStream.addTrack(track));
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
      };

      const callDocRef = doc(db, "calls", chatId);
      const callSnapshot = await getDoc(callDocRef);
      const callData = callSnapshot.data();

      const offerCandidates = collection(db, "calls", chatId, "offerCandidates");
      const answerCandidates = collection(db, "calls", chatId, "answerCandidates");

      pc.onicecandidate = async (event) => {
        if (event.candidate) {
          await addDoc(answerCandidates, event.candidate.toJSON());
        }
      };

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(callData.offer));
      } catch (err) {
        console.warn("Ignored remote offer error:", err);
      }

      const answerDescription = await pc.createAnswer();
      await pc.setLocalDescription(answerDescription);

      await updateDoc(callDocRef, {
        answer: { type: answerDescription.type, sdp: answerDescription.sdp },
        status: "connected",
        isVideo: true,
      });

      onSnapshot(offerCandidates, (snapshot) => {
        snapshot.docChanges().forEach(async (change) => {
          if (change.type === "added") {
            try {
              if (
                peerConnectionRef.current &&
                peerConnectionRef.current.signalingState !== "closed" &&
                peerConnectionRef.current.remoteDescription &&
                peerConnectionRef.current.remoteDescription.type
              ) {
                const candidateData = change.doc.data();
                if (candidateData && candidateData.candidate) {
                  await peerConnectionRef.current.addIceCandidate(
                    new RTCIceCandidate(candidateData)
                  );
                }
              }
            } catch (e) {
              console.warn("Ignored ICE candidate error:", e);
            }
          }
        });
      });
    } catch (error) {
      console.error("Answer Video Call Error:", error);
      endCallCleanUp(true, false);
    }
  };

  // ------------------ AUDIO CALL FUNCTIONS ------------------
  const startAudioCall = async () => {
    if (!chatId || !currentUser || !selectedUser) return;
    try {
      setCallStatus("calling");
      setIsVideoCallActive(false);
      callLoggedRef.current = false;
      callConnectedRef.current = false;
      const localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = localStream;

      const pc = new RTCPeerConnection(servers);
      peerConnectionRef.current = pc;

      localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

      pc.ontrack = (event) => {
        remoteStreamRef.current = event.streams[0];
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = event.streams[0];
        }
      };

      const offerCollection = collection(db, "calls", chatId, "offerCandidates");
      const answerCollection = collection(db, "calls", chatId, "answerCandidates");

      pc.onicecandidate = async (event) => {
        if (event.candidate) {
          await addDoc(offerCollection, event.candidate.toJSON());
        }
      };

      const offerDescription = await pc.createOffer();
      await pc.setLocalDescription(offerDescription);

      await setDoc(doc(db, "calls", chatId), {
        offer: { type: offerDescription.type, sdp: offerDescription.sdp },
        callerId: currentUser.uid,
        receiverId: selectedUser.id,
        status: "calling",
        isVideo: false,
        createdAt: serverTimestamp(),
      });

      onSnapshot(doc(db, "calls", chatId), async (snapshot) => {
        const data = snapshot.data();
        try {
          if (pc && pc.signalingState !== "closed" && !pc.currentRemoteDescription && data?.answer) {
            const answerDescription = new RTCSessionDescription(data.answer);
            await pc.setRemoteDescription(answerDescription);
            setCallStatus("connected");
            callConnectedRef.current = true;
            callStartTime.current = Date.now();
          }
        } catch (err) {
          console.warn("Ignored remote answer error:", err);
        }
      });

      onSnapshot(answerCollection, (snapshot) => {
        snapshot.docChanges().forEach(async (change) => {
          if (change.type === "added") {
            try {
              if (
                peerConnectionRef.current &&
                peerConnectionRef.current.signalingState !== "closed" &&
                peerConnectionRef.current.remoteDescription &&
                peerConnectionRef.current.remoteDescription.type
              ) {
                const candidateData = change.doc.data();
                if (candidateData && candidateData.candidate) {
                  await peerConnectionRef.current.addIceCandidate(
                    new RTCIceCandidate(candidateData)
                  );
                }
              }
            } catch (e) {
              console.warn("Ignored ICE candidate error:", e);
            }
          }
        });
      });
    } catch (error) {
      console.error("Audio Call Error:", error);
      alert("Microphone permission denied or connection error.");
      endCallCleanUp(true, false);
    }
  };

  const answerAudioCall = async () => {
    if (!chatId || !currentUser) return;
    try {
      setCallStatus("connected");
      setIsVideoCallActive(false);
      callConnectedRef.current = true;
      callStartTime.current = Date.now();
      callLoggedRef.current = false;

      const localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = localStream;

      const pc = new RTCPeerConnection(servers);
      peerConnectionRef.current = pc;

      localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

      pc.ontrack = (event) => {
        remoteStreamRef.current = event.streams[0];
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = event.streams[0];
        }
      };

      const callDocRef = doc(db, "calls", chatId);
      const callSnapshot = await getDoc(callDocRef);
      const callData = callSnapshot.data();

      const offerCandidates = collection(db, "calls", chatId, "offerCandidates");
      const answerCandidates = collection(db, "calls", chatId, "answerCandidates");

      pc.onicecandidate = async (event) => {
        if (event.candidate) {
          await addDoc(answerCandidates, event.candidate.toJSON());
        }
      };

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(callData.offer));
      } catch (err) {
        console.warn("Ignored remote offer error:", err);
      }

      const answerDescription = await pc.createAnswer();
      await pc.setLocalDescription(answerDescription);

      await updateDoc(callDocRef, {
        answer: { type: answerDescription.type, sdp: answerDescription.sdp },
        status: "connected",
        isVideo: false,
      });

      onSnapshot(offerCandidates, (snapshot) => {
        snapshot.docChanges().forEach(async (change) => {
          if (change.type === "added") {
            try {
              if (
                peerConnectionRef.current &&
                peerConnectionRef.current.signalingState !== "closed" &&
                peerConnectionRef.current.remoteDescription &&
                peerConnectionRef.current.remoteDescription.type
              ) {
                const candidateData = change.doc.data();
                if (candidateData && candidateData.candidate) {
                  await peerConnectionRef.current.addIceCandidate(
                    new RTCIceCandidate(candidateData)
                  );
                }
              }
            } catch (e) {
              console.warn("Ignored ICE candidate error:", e);
            }
          }
        });
      });
    } catch (error) {
      console.error("Answer Call Error:", error);
      endCallCleanUp(true, false);
    }
  };

  // ------------------ CLEANUP & LOGGING ------------------
  const endCallCleanUp = async (updateDb = true, manualEnd = true) => {
    const wasConnected = callConnectedRef.current;
    const isVideo = isVideoCallActive;

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
    localStreamRef.current = null;
    peerConnectionRef.current = null;
    setCallStatus("idle");
    setIsMuted(false);
    setIsVideoOff(false);
    setIsVideoCallActive(false);

    if (updateDb && chatId) {
      try {
        await updateDoc(doc(db, "calls", chatId), { status: "ended" });
      } catch (e) {}
    }

    if (manualEnd && !callLoggedRef.current && currentUser && selectedUser) {
      callLoggedRef.current = true;
      try {
        if (wasConnected && callStartTime.current) {
          const seconds = Math.floor((Date.now() - callStartTime.current) / 1000);
          const mins = Math.floor(seconds / 60);
          const secs = seconds % 60;
          const durationStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

          await addDoc(collection(db, "messages"), {
            senderId: currentUser.uid,
            receiverId: selectedUser.id,
            text: isVideo ? `Video call • ${durationStr}` : `Audio call • ${durationStr}`,
            isCall: true,
            callType: "completed",
            createdAt: serverTimestamp(),
            read: true,
            deletedFor: [],
            deleted: false,
          });
        } else {
          await addDoc(collection(db, "messages"), {
            senderId: currentUser.uid,
            receiverId: selectedUser.id,
            text: isVideo ? "Missed video call" : "Missed audio call",
            isCall: true,
            callType: "missed",
            createdAt: serverTimestamp(),
            read: false,
            deletedFor: [],
            deleted: false,
          });
        }
      } catch (err) {
        console.error("Failed to log call message:", err);
      }
    }
    callStartTime.current = null;
    callConnectedRef.current = false;
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest(".message-menu-container") && !e.target.closest(".settings-menu-container")) {
        setMenuOpen(null);
        setShowReactionPicker(null);
      }
      if (!e.target.closest(".message-bubble")) {
        setClickedMessageId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    if (!selectedUser || !currentUser) return;

    const q = query(collection(db, "messages"), orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const container = chatContainerRef.current;
      const scrollBefore = container ? container.scrollTop : 0;

      const msgs = snapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        .filter(
          (msg) =>
            (msg.senderId === currentUser.uid && msg.receiverId === selectedUser.id) ||
            (msg.senderId === selectedUser.id && msg.receiverId === currentUser.uid)
        );

      const visibleMessages = msgs.filter(
        (msg) => !msg.deletedFor?.includes(currentUser.uid)
      );

      setMessages(visibleMessages);

      requestAnimationFrame(() => {
        if (!chatContainerRef.current) return;

        if (!initialScrollDone.current && visibleMessages.length > 0) {
          scrollToBottom();
          initialScrollDone.current = true;
        } else if (isUserSending.current) {
          scrollToBottom();
        } else {
          const maxScroll = chatContainerRef.current.scrollHeight - chatContainerRef.current.clientHeight;
          chatContainerRef.current.scrollTop = Math.min(scrollBefore, maxScroll);
        }
      });

      msgs.forEach(async (msg) => {
        if (
          msg.receiverId === currentUser.uid &&
          msg.senderId === selectedUser.id &&
          !msg.read
        ) {
          await updateDoc(doc(db, "messages", msg.id), {
            read: true,
          });
        }
      });
    });

    return () => unsubscribe();
  }, [selectedUser, currentUser]);

  useEffect(() => {
    if (!selectedUser || !currentUser || !chatId) return;

    const unsubscribe = onSnapshot(doc(db, "typingStatus", chatId), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.userId !== currentUser.uid) {
          setIsTyping(data.typing);
        }
      }
    });

    return () => unsubscribe();
  }, [selectedUser, currentUser, chatId]);

  useEffect(() => {
    return () => {
      if (currentUser && chatId) {
        setDoc(
          doc(db, "typingStatus", chatId),
          {
            userId: currentUser.uid,
            typing: false,
          },
          { merge: true }
        );
      }
    };
  }, [currentUser, chatId]);

  const scrollToMessage = (id) => {
    const element = document.getElementById(`message-${id}`);
    if (element) {
      element.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      element.classList.add("message-highlight");
      setTimeout(() => {
        element.classList.remove("message-highlight");
      }, 2000);
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim() || !selectedUser || !currentUser) return;

    isUserSending.current = true;
    try {
      await addDoc(collection(db, "messages"), {
        senderId: currentUser.uid,
        receiverId: selectedUser.id,
        text: message,
        createdAt: serverTimestamp(),
        read: false,
        deletedFor: [],
        deleted: false,
        isCall: false,
        replyTo: replyMessage
          ? {
              id: replyMessage.id,
              text: replyMessage.text,
              senderId: replyMessage.senderId,
            }
          : null,
        reactions: {},
      });

      setReplyMessage(null);
      if (chatId) {
        await setDoc(doc(db, "typingStatus", chatId), {
          userId: currentUser.uid,
          typing: false,
        });
      }
      setMessage("");
      setTimeout(() => {
        scrollToBottom();
        isUserSending.current = false;
      }, 100);
    } catch (error) {
      isUserSending.current = false;
      console.error("Message Error:", error);
      alert(error.message);
    }
  };

  const handleReaction = async (messageId, emoji) => {
    try {
      const messageRef = doc(db, "messages", messageId);
      const msg = messages.find((m) => m.id === messageId);
      if (!msg || !currentUser) return;

      const reactions = msg.reactions || {};
      if (reactions[currentUser.uid] === emoji) {
        delete reactions[currentUser.uid];
      } else {
        reactions[currentUser.uid] = emoji;
      }

      await updateDoc(messageRef, { reactions });
      setShowReactionPicker(null);
      setMenuOpen(null);
    } catch (error) {
      console.log("Reaction Error:", error);
    }
  };

  const deleteForMe = async (msgId) => {
    if (!currentUser) return;
    await updateDoc(doc(db, "messages", msgId), {
      deletedFor: arrayUnion(currentUser.uid),
    });
    setMenuOpen(null);
  };

  const deleteForEveryone = async (msgId) => {
    try {
      await updateDoc(doc(db, "messages", msgId), {
        deleted: true,
        text: "This message was deleted",
        reactions: {},
      });
      setMenuOpen(null);
    } catch (error) {
      console.error("Delete for everyone error:", error);
    }
  };

  if (!selectedUser) {
    return <h4 className="text-center mt-5" style={{ color: isDark ? "#fff" : "#000" }}>Loading...</h4>;
  }

  const myMessages = messages.filter((m) => m.senderId === currentUser?.uid);
  const lastMyMessageId = myMessages.length > 0 ? myMessages[myMessages.length - 1].id : null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: isDark 
          ? "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)" 
          : "linear-gradient(135deg, #fbcfe8 0%, #fef3c7 50%, #e0e7ff 100%)",
        color: isDark ? "#ffffff" : "#1f2937",
        display: "flex",
        flexDirection: "column",
        zIndex: 1050,
        overflow: "hidden",
      }}
    >
      <audio ref={remoteAudioRef} autoPlay />

      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .custom-chat-input:focus { border-color: #7c3aed !important; box-shadow: 0 0 10px rgba(124, 58, 237, 0.4) !important; outline: none !important; }
        .theme-toggle-btn { background: transparent; border: none; outline: none; cursor: pointer; font-size: 20px; padding: 4px; transition: transform 0.2s ease; }
        .theme-toggle-btn:hover { transform: scale(1.2); }
      `}</style>

      {/* Top Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 20px",
          background: isDark 
            ? "linear-gradient(90deg, #1e1b4b 0%, #0f172a 100%)" 
            : "linear-gradient(90deg, rgba(255, 255, 255, 0.85) 0%, rgba(254, 243, 199, 0.85) 100%)",
          borderBottom: isDark ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(0, 0, 0, 0.08)",
          flexShrink: 0,
          backdropFilter: "blur(10px)",
        }}
      >
        <button
          className={`btn btn-sm ${isDark ? "btn-outline-light" : "btn-outline-dark"}`}
          onClick={() => navigate("/messages")}
        >
          ← Back
        </button>

        <div className="d-flex align-items-center" style={{ gap: "10px" }}>
          <img
            src={selectedUser.profilePic || "/default-profile.png"}
            width="38"
            height="38"
            style={{ borderRadius: "50%", objectFit: "cover" }}
            alt={selectedUser.username}
          />
          <div className="d-flex align-items-center" style={{ gap: "10px" }}>
            <h5 style={{ margin: 0, fontSize: "16px", fontWeight: "600", color: isDark ? "#fff" : "#111827" }}>
              {selectedUser?.username}
            </h5>
            <span
              style={{
                fontSize: "13px",
                color: selectedUser?.online ? "#16a34a" : (isDark ? "#aaa" : "#4b5563"),
                fontWeight: "500",
              }}
            >
              {selectedUser?.online
                ? "🟢 Online"
                : selectedUser?.lastSeen
                  ? `Last seen ${selectedUser.lastSeen.toDate().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                  : "Offline"}
            </span>
          </div>
        </div>

        {/* Action Buttons & Settings Menu */}
        <div className="d-flex align-items-center settings-menu-container" style={{ gap: "12px", position: "relative" }}>
          <button className="theme-toggle-btn" onClick={startVideoCall} title="Start Video Call">📹</button>
          <button className="theme-toggle-btn" onClick={startAudioCall} title="Start Audio Call">📞</button>
          <button className="theme-toggle-btn" onClick={toggleTheme} title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}>
            {isDark ? "☀️" : "🌙"}
          </button>
          
          <button
            className="theme-toggle-btn"
            onClick={() => setMenuOpen(menuOpen === "settings-menu" ? null : "settings-menu")}
            title="Settings"
            style={{ color: isDark ? "#ffffff" : "#1f2937" }}
          >
            ☰
          </button>

          {menuOpen === "settings-menu" && (
            <div style={{
              position: "absolute", top: "100%", right: "0", marginTop: "8px", zIndex: 1100,
              background: isDark ? "#222" : "white", color: isDark ? "white" : "black",
              border: `1px solid ${isDark ? "#444" : "#ccc"}`, borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.2)", padding: "6px 0", minWidth: "160px",
            }}>
              <div
                style={{ padding: "8px 14px", cursor: "pointer", fontSize: "14px", color: "#dc3545" }}
                onClick={async () => {
                  if (window.confirm("Are you sure you want to clear chat for yourself?")) {
                    setMenuOpen(null);
                    try {
                      const updatePromises = messages.map(async (msg) => {
                        const msgRef = doc(db, "messages", msg.id);
                        await updateDoc(msgRef, {
                          deletedFor: arrayUnion(currentUser.uid)
                        });
                      });
                      await Promise.all(updatePromises);
                      setMessages([]);
                    } catch (err) {
                      console.error("Error clearing chat:", err);
                    }
                  }
                }}
              >
                🗑️ Clear Chat
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Video Call Modal Component */}
      <VideoCallModal
        isVideoCallActive={isVideoCallActive}
        callStatus={callStatus}
        remoteVideoRef={remoteVideoRef}
        localVideoRef={localVideoRef}
        answerVideoCall={answerVideoCall}
        toggleMute={toggleMute}
        endCallCleanUp={endCallCleanUp}
        toggleVideo={toggleVideo}
        isMuted={isMuted}
        isVideoOff={isVideoOff}
      />

      {/* Audio Call Modal Component */}
      <AudioCallModal
        callStatus={callStatus}
        isVideoCallActive={isVideoCallActive}
        selectedUser={selectedUser}
        answerAudioCall={answerAudioCall}
        toggleMute={toggleMute}
        isMuted={isMuted}
        endCallCleanUp={endCallCleanUp}
      />

      {/* Main Chat Body */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "15px", maxWidth: "1000px", width: "100%", margin: "0 auto", overflow: "hidden" }}>
        <div
          ref={chatContainerRef}
          className="hide-scrollbar"
          style={{ 
            flex: 1, 
            overflowY: "auto", 
            padding: "15px 15px 40px 15px", // Extra bottom padding so menu never hides
            border: isDark ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(255, 255, 255, 0.6)", 
            borderRadius: "12px", 
            background: isDark 
              ? "linear-gradient(180deg, rgba(18, 18, 18, 0.8) 0%, rgba(30, 27, 75, 0.6) 100%)" 
              : "linear-gradient(180deg, rgba(255, 255, 255, 0.9) 0%, rgba(243, 244, 246, 0.9) 100%)",
            backdropFilter: "blur(12px)"
          }}
        >
          {messages.length === 0 ? (
            <p className="text-center text-muted">No messages yet</p>
          ) : (
            messages.map((msg) => {
              if (msg.isCall) {
                const isMissed = msg.callType === "missed";
                return (
                  <div key={msg.id} style={{ display: "flex", justifyContent: "center", margin: "15px 0" }}>
                    <span style={{
                      backgroundColor: isDark ? "#242424" : "rgba(255, 255, 255, 0.95)",
                      color: isMissed ? "#dc3545" : isDark ? "#d1d5db" : "#374151",
                      padding: "6px 16px", borderRadius: "20px", fontSize: "13px", fontWeight: "500",
                      border: `1px solid ${isDark ? "#333" : "rgba(0,0,0,0.08)"}`, display: "flex", alignItems: "center", gap: "6px",
                    }}>
                      {isMissed ? `📞 ${msg.text}` : `📞 ${msg.text}`}
                    </span>
                  </div>
                );
              }

              const isMe = msg.senderId === currentUser?.uid;
              const isSelected = clickedMessageId === msg.id;
              const timeString = msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";

              return (
                <div key={msg.id} id={`message-row-${msg.id}`} style={{ display: "flex", justifyContent: isMe ? "flex-end" : "flex-start", marginBottom: "20px" }}>
                  <div style={{ maxWidth: "80%", display: "flex", flexDirection: "column", alignItems: isMe ? "flex-end" : "flex-start" }}>
                    {msg.replyTo && (
                      <div onClick={() => scrollToMessage(msg.replyTo.id)} style={{
                        backgroundColor: isDark ? "#2a2a2a" : "rgba(255, 255, 255, 0.9)", borderLeft: "3px solid #7c3aed",
                        padding: "6px 10px", borderRadius: "4px", marginBottom: "4px", fontSize: "13px", cursor: "pointer", color: isDark ? "#ccc" : "#4b5563",
                      }}>
                        <div style={{ fontWeight: "bold", color: "#7c3aed" }}>{msg.replyTo.senderId === currentUser?.uid ? "You" : selectedUser.username}</div>
                        <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{msg.replyTo.text}</div>
                      </div>
                    )}

                    <div style={{ display: "flex", alignItems: "center", gap: "10px", flexDirection: isMe ? "row" : "row-reverse" }}>
                      <span style={{ fontSize: "11px", opacity: 0.7, whiteSpace: "nowrap" }}>{timeString}</span>

                      <div
                        id={`message-${msg.id}`}
                        className="message-menu-container message-bubble"
                        onClick={() => setClickedMessageId(msg.id)}
                        style={{
                          position: "relative",
                          background: isMe ? "#7c3aed" : isDark ? "#2b2b2b" : "#f8fafc",
                          color: isMe ? "white" : isDark ? "white" : "#1f2937",
                          padding: "12px 36px 12px 16px",
                          borderRadius: isMe ? "14px 14px 0 14px" : "14px 14px 14px 0",
                          boxShadow: isSelected ? "0 0 12px rgba(124, 58, 237, 0.7)" : "0 2px 8px rgba(0,0,0,0.06)",
                          border: isSelected ? "1px solid #7c3aed" : isMe ? "1px solid #7c3aed" : isDark ? "1px solid #2b2b2b" : "1px solid rgba(0, 0, 0, 0.08)",
                          wordBreak: "break-word", minWidth: "110px", fontSize: "15px", cursor: "pointer", transition: "all 0.2s ease-in-out",
                        }}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (menuOpen !== msg.id) {
                              // Smart check: Agar message chat container ke upar wale hisse me hai toh menu neeche khulega, warna upar
                              const bubbleElement = document.getElementById(`message-${msg.id}`);
                              const containerElement = chatContainerRef.current;
                              if (bubbleElement && containerElement) {
                                const bubbleRect = bubbleElement.getBoundingClientRect();
                                const containerRect = containerElement.getBoundingClientRect();
                                // Agar upar se distance kam hai (matlab message screen ke top par hai), toh menu neeche khol do
                                if (bubbleRect.top - containerRect.top < 180) {
                                  setMenuPosition("top");
                                } else {
                                  setMenuPosition("bottom");
                                }
                              }
                              setMenuOpen(msg.id);
                            } else {
                              setMenuOpen(null);
                            }
                            setShowReactionPicker(null);
                          }}
                          style={{
                            position: "absolute", top: "6px", right: "8px", border: "none", background: "transparent",
                            cursor: "pointer", fontSize: "18px", color: isMe ? "white" : isDark ? "#bbb" : "#666", padding: "0 4px", lineHeight: "1",
                          }}
                        >
                          ⋮
                        </button>

                        {menuOpen === msg.id && (
                          <div ref={menuRef} style={{
                            position: "absolute",
                            ...(menuPosition === "bottom" ? { bottom: "100%", marginBottom: "6px" } : { top: "100%", marginTop: "6px" }),
                            [isMe ? "right" : "left"]: "0",
                            zIndex: 1000,
                            background: isDark ? "#222" : "white",
                            color: isDark ? "white" : "black",
                            border: `1px solid ${isDark ? "#444" : "#ccc"}`,
                            borderRadius: "8px",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                            padding: "6px 0",
                            minWidth: "190px",
                          }}>
                            {msg.deleted ? (
                              <div style={{ padding: "8px 14px", cursor: "pointer", fontSize: "14px" }} onClick={() => deleteForMe(msg.id)}>🗑️ Delete for me</div>
                            ) : (
                              <>
                                <div style={{ padding: "8px 14px", cursor: "pointer", fontSize: "14px", borderBottom: `1px solid ${isDark ? "#333" : "#eee"}` }} onClick={() => { setReplyMessage(msg); inputRef.current?.focus(); setMenuOpen(null); }}>↩ Reply</div>
                                <div style={{ padding: "8px 14px", cursor: "pointer", fontSize: "14px", borderBottom: `1px solid ${isDark ? "#333" : "#eee"}` }} onClick={() => setShowReactionPicker(showReactionPicker === msg.id ? null : msg.id)}>😊 React</div>
                                {showReactionPicker === msg.id && (
                                  <div style={{ display: "flex", gap: "6px", padding: "8px 12px", background: isDark ? "#2a2a2a" : "#f1f1f1" }}>
                                    {reactionEmojis.map((emoji) => (
                                      <span key={emoji} style={{ cursor: "pointer", fontSize: "18px" }} onClick={() => handleReaction(msg.id, emoji)}>{emoji}</span>
                                    ))}
                                  </div>
                                )}
                                <div style={{ padding: "8px 14px", cursor: "pointer", fontSize: "14px", borderBottom: `1px solid ${isDark ? "#333" : "#eee"}` }} onClick={() => deleteForMe(msg.id)}>🗑️ Delete for me</div>
                                {isMe && (
                                  <div style={{ padding: "8px 14px", cursor: "pointer", fontSize: "14px", color: "#dc3545" }} onClick={() => deleteForEveryone(msg.id)}>❌ Delete for everyone</div>
                                )}
                              </>
                            )}
                          </div>
                        )}

                        {msg.deleted ? <span style={{ fontStyle: "italic", opacity: 0.8 }}>This message was deleted</span> : <div style={{ textAlign: "left" }}>{msg.text}</div>}

                        {msg.reactions && Object.values(msg.reactions).length > 0 && (
                          <div style={{ position: "absolute", bottom: "-12px", [isMe ? "left" : "right"]: "8px", fontSize: "15px", display: "flex", gap: "2px", zIndex: 5 }}>
                            {Object.values(msg.reactions).join(" ")}
                          </div>
                        )}
                      </div>
                    </div>

                    {isMe && msg.id === lastMyMessageId && (
                      <div style={{ fontSize: "11px", opacity: 0.7, marginTop: "2px", textAlign: "right", width: "100%" }}>
                        {msg.read ? "Seen" : "Sent"}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {isTyping && <div style={{ fontSize: "14px", opacity: "0.7", marginTop: "6px", fontStyle: "italic" }}>{selectedUser.username} is typing...</div>}

        {replyMessage && (
          <div style={{ background: isDark ? "#333" : "rgba(255, 255, 255, 0.9)", color: isDark ? "white" : "#1f2937", padding: "10px", borderRadius: "8px", marginTop: "10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: "12px", opacity: 0.8 }}>Replying to:</div>
              <b style={{ fontSize: "14px" }}>{replyMessage.text}</b>
            </div>
            <button onClick={() => setReplyMessage(null)} style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: "16px", color: isDark ? "white" : "#1f2937" }}>✕</button>
          </div>
        )}

        <div style={{ display: "flex", marginTop: "10px", gap: "8px", flexShrink: 0, paddingBottom: "10px" }}>
          <input
            ref={inputRef}
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="form-control custom-chat-input"
            placeholder="Type message..."
            style={{ background: isDark ? "#222" : "rgba(255, 255, 255, 0.95)", color: isDark ? "white" : "#1f2937", border: isDark ? "1px solid #555" : "1px solid rgba(0,0,0,0.15)", fontSize: "15px" }}
            onKeyDown={(e) => { if (e.key === "Enter") handleSendMessage(); }}
          />
          <button className="btn btn-primary" onClick={handleSendMessage} style={{ backgroundColor: "#7c3aed", borderColor: "#7c3aed" }}>
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chat;