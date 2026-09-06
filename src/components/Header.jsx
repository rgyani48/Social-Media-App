import React, { useState, useEffect, useRef } from "react";
import { CiLight } from "react-icons/ci";
import { MdDarkMode } from "react-icons/md";
import { Link } from "react-router-dom";
import { auth, db } from "../firebase";
import { useNavigate } from "react-router-dom";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  updateDoc,
  doc,
  deleteDoc,
} from "firebase/firestore";
import {
  IoNotificationsOutline,
  IoChatbubbleEllipsesOutline,
} from "react-icons/io5";

import { FaUserCircle } from "react-icons/fa";

const Header = ({
  setSearchTerm,
  showSavedPosts,
  setShowSavedPosts,
  darkMode,
  setDarkMode,
}) => {
  // 🔔 Notifications ke liye state aur data
  const navigate = useNavigate();

  const handleNotificationItemClick = (notification) => {
    if (notification.type === "follow") {
      navigate(`/user/${notification.senderId}`);
    } else {
      navigate("/home", {
        state: {
          postId: notification.postId,
          commentId: notification.commentId || null,
          replyId: notification.replyId || null,
        },
      });
    }

    setShowNotifications(false);
  };

  const [unreadMessages, setUnreadMessages] = useState(0);

  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const notificationRef = useRef(null);

  const currentUser = auth.currentUser;

  const getTimeAgo = (timestamp) => {
    if (!timestamp) return "";

    const seconds = Math.floor((Date.now() - timestamp.toDate()) / 1000);

    if (seconds < 60) return "Just now";

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour ago`;

    const days = Math.floor(hours / 24);
    return `${days} day ago`;
  };

  // Bahar click karne par dropdown band karne ke liye
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, "messages"),
      where("receiverId", "==", currentUser.uid),
      where("read", "==", false),
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUnreadMessages(snapshot.size);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleNotificationClick = async (e) => {
    e.preventDefault();

    const willOpen = !showNotifications;
    setShowNotifications(willOpen);

    if (willOpen) {
      for (const n of notifications) {
        if (!n.read) {
          try {
            await updateDoc(doc(db, "notifications", n.id), {
              read: true,
            });

            console.log("Updated Successfully");
          } catch (err) {
            console.error(err);
          }
        }
      }
    }
  };

  const handleClearAll = async () => {
    try {
      for (const n of notifications) {
        await deleteDoc(doc(db, "notifications", n.id));
      }

      setNotifications([]);
    } catch (error) {
      console.error("Clear All Error:", error);
    }
  };

  const handleDeleteNotification = async (id) => {
    try {
      await deleteDoc(doc(db, "notifications", id));
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, "notifications"),
      where("receiverId", "==", currentUser.uid),
      orderBy("createdAt", "desc"),
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notificationList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setNotifications(notificationList);
    });

    return () => unsubscribe();
  }, [currentUser]);

  return (
    <header
      className={`d-flex flex-wrap justify-content-center py-3 mb-4 border-bottom ${darkMode ? "text-white" : "text-dark"}`}
      style={{ backgroundColor: darkMode ? "#1E1E1E" : "#FFFFFF" }}
    >
      <div className="container">
        <div className="d-flex flex-wrap align-items-center justify-content-center justify-content-lg-start">
          {/* Brand / Logo */}
          <Link
            to="/"
            className={`d-flex align-items-center mb-2 mb-lg-0 text-decoration-none ${darkMode ? "text-white" : "text-dark"}`}
          >
            <svg
              className="bi me-2"
              width="40"
              height="32"
              role="img"
              aria-label="Bootstrap"
            >
              <use xlinkHref="#bootstrap"></use>
            </svg>
          </Link>

          {/* Search Bar */}
          <form
            className="col-12 col-lg-auto mb-3 mb-lg-0 me-lg-3"
            role="search"
          >
            <input
              type="search"
              className={`form-control Search ${darkMode ? "text-white" : "text-dark"}`}
              style={{
                width: "520px",
                backgroundColor: darkMode ? "#2C2C2C" : "#FFFFFF",
                border: darkMode ? "1px solid #424242" : "1px solid #ced4da",
                color: darkMode ? "#ffffff" : "#000000",
              }}
              placeholder="🔍 Search post..."
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {darkMode && (
              <style>{`
                .Search::placeholder {
                  color: #A0A0A0 !important;
                  opacity: 1;
                }
              `}</style>
            )}
          </form>

          {/* Action Buttons & Theme Toggle */}
          <div className="d-flex align-items-center ms-auto gap-4">
            {/* Notification */}

            <div
              style={{
                position: "relative",
                cursor: "pointer",
              }}
              ref={notificationRef}
            >
              <IoNotificationsOutline
                size={27}
                onClick={handleNotificationClick}
              />

              {unreadCount > 0 && (
                <span className="notification-badge">{unreadCount}</span>
              )}

              {showNotifications && (
                <div className="notification-dropdown">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <h6 className="mb-0">Notifications</h6>

                    {notifications.length > 0 && (
                      <button
                        className="clear-notification-btn"
                        onClick={handleClearAll}
                      >
                        Clear All
                      </button>
                    )}
                  </div>

                  {notifications.length === 0 ? (
                    <div className="notification-item">No Notifications</div>
                  ) : (
                    notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`notification-item d-flex align-items-center gap-2 ${
                          !notification.read ? "unread-notification" : ""
                        }`}
                        onClick={() =>
                          handleNotificationItemClick(notification)
                        }
                      >
                        {notification.senderPic ? (
                          <img
                            src={notification.senderPic}
                            alt="profile"
                            style={{
                              width: "35px",
                              height: "35px",
                              borderRadius: "50%",
                              objectFit: "cover",
                            }}
                          />
                        ) : (
                          <FaUserCircle size={35} />
                        )}

                        <div style={{ flex: 1 }}>
                          <div>
                            <b>{notification.senderName || "User"}</b>{" "}
                            {notification.message}
                          </div>

                          <small
                            className="text-muted"
                            style={{
                              display: "block",
                              marginTop: "5px",
                              fontSize: "12px",
                            }}
                          >
                            {getTimeAgo(notification.createdAt)}
                          </small>
                        </div>

                        <button
                          className="delete-notification-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteNotification(notification.id);
                          }}
                        >
                          ❌
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Message */}

            <div
              style={{
                position: "relative",
                cursor: "pointer",
              }}
              onClick={() => navigate("/messages")}
            >
              <IoChatbubbleEllipsesOutline size={25} />

              {unreadMessages > 0 && (
                <span
                  className="badge bg-danger"
                  style={{
                    position: "absolute",
                    top: "-8px",
                    right: "-8px",
                    fontSize: "10px",
                  }}
                >
                  {unreadMessages}
                </span>
              )}
            </div>
            {/* Dark */}

            <button
              className="theme-btn"
              onClick={() => setDarkMode(!darkMode)}
            >
              {darkMode ? (
                <MdDarkMode size={24} color="#FFD700" />
              ) : (
                <CiLight size={24} color="#000000" />
              )}
            </button>

            {/* Profile */}

            <Link to="/profile" className="profile-btn">
              <FaUserCircle size={32} />
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
