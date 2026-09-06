import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
  query,
  orderBy,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { db } from "../firebase";
import "../App.css";

const Messages = ({ darkMode }) => {
  const navigate = useNavigate();
  const auth = getAuth();
  const currentUser = auth.currentUser;

  const [users, setUsers] = useState([]);
  const [lastMessages, setLastMessages] = useState({});
  const [unreadCounts, setUnreadCounts] = useState({});

  // Fetch users list
  useEffect(() => {
    if (!currentUser) return;
    const unsubscribe = onSnapshot(collection(db, "users"), (snapshot) => {
      const usersList = snapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        .filter((user) => user.id !== currentUser.uid);

      setUsers(usersList);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Fetch last messages
  useEffect(() => {
    if (!currentUser || users.length === 0) return;

    const unsubscribe = onSnapshot(
      query(collection(db, "messages"), orderBy("createdAt", "desc")),
      (snapshot) => {
        const latest = {};

        snapshot.docs.forEach((doc) => {
          const msg = {
            id: doc.id,
            ...doc.data(),
          };

          const otherUser =
            msg.senderId === currentUser.uid ? msg.receiverId : msg.senderId;

          if (
            (msg.senderId === currentUser.uid ||
              msg.receiverId === currentUser.uid) &&
            !latest[otherUser]
          ) {
            latest[otherUser] = msg;
          }
        });

        setLastMessages(latest);
      }
    );

    return () => unsubscribe();
  }, [currentUser, users]);

  // Fetch unread counts
  useEffect(() => {
    if (!currentUser) return;

    const unsubscribe = onSnapshot(query(collection(db, "messages")), (snapshot) => {
      const counts = {};

      snapshot.docs.forEach((doc) => {
        const msg = doc.data();

        if (msg.receiverId === currentUser.uid && !msg.read) {
          counts[msg.senderId] = (counts[msg.senderId] || 0) + 1;
        }
      });

      setUnreadCounts(counts);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Online/Offline status handler
  useEffect(() => {
    if (!currentUser) return;

    const userRef = doc(db, "users", currentUser.uid);
    updateDoc(userRef, {
      online: true,
      lastSeen: serverTimestamp(),
    });

    const handleOffline = () => {
      updateDoc(userRef, {
        online: false,
        lastSeen: serverTimestamp(),
      });
    };

    window.addEventListener("beforeunload", handleOffline);

    return () => {
      window.removeEventListener("beforeunload", handleOffline);
    };
  }, [currentUser]);

  return (
    <div
      className="container mt-4"
      style={{
        color: darkMode ? "#fff" : "#000",
        maxWidth: "700px",
      }}
    >
      <h2 className="mb-4">Messages</h2>

      {users.length === 0 ? (
        <p className="text-muted">No Users Found</p>
      ) : (
        users.map((user) => (
          <div
            key={user.id}
            className={`d-flex align-items-center p-3 mb-2 border rounded ${
              darkMode ? "border-secondary bg-dark text-white" : "bg-white text-dark"
            }`}
            style={{
              cursor: "pointer",
            }}
            onClick={() => navigate(`/chat/${user.id}`)}
          >
            <img
              src={user.profilePic || "/default-profile.png"}
              width="50"
              height="50"
              style={{
                borderRadius: "50%",
                objectFit: "cover",
              }}
              alt={user.username}
            />

            <div className="ms-3 flex-grow-1">
              <div className="d-flex justify-content-between align-items-center">
                <h6 className="mb-0" style={{ fontSize: "16px", fontWeight: "bold" }}>
                  {user.username}
                </h6>

                <div className="d-flex align-items-center">
                  <small className="text-muted me-2" style={{ fontSize: "12px" }}>
                    {lastMessages[user.id]?.createdAt &&
                      lastMessages[user.id].createdAt.toDate().toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                  </small>

                  {unreadCounts[user.id] > 0 && (
                    <span
                      className="badge bg-danger rounded-pill"
                      style={{
                        minWidth: "22px",
                        height: "22px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "12px",
                      }}
                    >
                      {unreadCounts[user.id]}
                    </span>
                  )}
                </div>
              </div>

              <small
                className="text-muted"
                style={{
                  display: "block",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: "400px",
                  fontSize: "13px",
                  marginTop: "4px",
                }}
              >
                {lastMessages[user.id]?.text || "No messages yet"}
              </small>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default Messages;