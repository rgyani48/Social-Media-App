import { useContext, useState, useEffect, useRef } from "react";
import { MdDelete } from "react-icons/md";
import { PostList } from "../store/post-list-store";
import { IoClose } from "react-icons/io5";
import { PiShareFatFill } from "react-icons/pi";
import { BsSave2 } from "react-icons/bs";
import { BsSave2Fill } from "react-icons/bs";
import { FaUserPlus, FaUserCheck } from "react-icons/fa6";
import { getAuth } from "firebase/auth";
import { FaThumbtack } from "react-icons/fa";

import {
  doc,
  arrayRemove,
  updateDoc,
  arrayUnion,
  getDoc,
  setDoc,
  addDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
const usernames = [
  "rahul_verma",
  "gyani_kumar",
  "alex_sharma",
  "priya_01",
  "rohan_dev",
  "coding_world",
  "travel_lovers",
  "tech_guru",
];

const Post = ({
  post,
  highlight,
  darkMode,
  highlightCommentId,
  highlightReplyId,
}) => {
  const userKey = String(post.userId);
  const [isFollowing, setIsFollowing] = useState(false);
  const auth = getAuth();
  const user = auth.currentUser;

  const replyBoxRef = useRef(null);

  const commentRefs = useRef({});
  const replyRefs = useRef({});

  const [showReplies, setShowReplies] = useState({});

  const { postList, dispatchPostList, showToast } = useContext(PostList);

  const [currentUsername, setCurrentUsername] = useState("");

  const [showHeart, setShowHeart] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);

  const [clickCount, setClickCount] = useState(0);

  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState("");

  const [replies, setReplies] = useState({});

  const handlePinPost = async () => {
    try {
      await updateDoc(doc(db, "posts", post.id), {
        pinned: !post.pinned,
      });

      showToast(post.pinned ? "📌 Post Unpinned" : "📌 Post Pinned");
    } catch (error) {
      console.log(error);
    }
  };

  const handleFollow = async () => {
    if (!user) return;

    try {
      const currentUserRef = doc(db, "users", user.uid);
      const targetUserRef = doc(db, "users", post.userId);

      if (isFollowing) {
        // UNFOLLOW
        await updateDoc(targetUserRef, {
          followers: arrayRemove(user.uid),
        });

        await updateDoc(currentUserRef, {
          following: arrayRemove(post.userId),
        });

        setIsFollowing(false);
      } else {
        // FOLLOW

        // console.log("CURRENT USER UID:", user.uid);
        // console.log("TARGET USER UID:", post.userId);

        await setDoc(
          currentUserRef,
          {
            following: arrayUnion(post.userId),
          },
          { merge: true },
        );

        await setDoc(
          targetUserRef,
          {
            followers: arrayUnion(user.uid),
          },
          { merge: true },
        );

        setIsFollowing(true);

        const userSnap = await getDoc(doc(db, "users", user.uid));

        const username = userSnap.exists()
          ? userSnap.data().username
          : "Someone";

        //         console.log("FOLLOW USERNAME:", username);
        //         console.log("CURRENT USER DATA:", user.uid);
        // console.log("CURRENT USERNAME FROM AUTH:", user.displayName);

        console.log("🔥 Follow clicked");

        const q = query(
          collection(db, "notifications"),
          where("receiverId", "==", post.userId),
          where("senderId", "==", user.uid),
          where("type", "==", "follow"),
        );

        const existingNotification = await getDocs(q);

        console.log("Existing Notification Empty:", existingNotification.empty);

        if (existingNotification.empty) {
          try {
            await addDoc(collection(db, "notifications"), {
              receiverId: post.userId,
              senderId: user.uid,
              senderName: username,
              senderPic: user.photoURL || "",
              type: "follow",
              message: "started following you",
              read: false,
              createdAt: serverTimestamp(),
            });

            console.log("✅ Notification Created");
          } catch (err) {
            console.log("❌ Notification Error:", err);
          }
        }

        setIsFollowing(true);
      }
    } catch (error) {
      console.log(error);
    }
    // console.log("CURRENT USER UID:", user.uid);
    // console.log("TARGET USER UID:", post.userId);
  };

  //   const [profilePic, setProfilePic] = useState("");
  // const [username, setUsername] = useState("");

  // Parent component jahan aap posts fetch karte hain
  // Jahan aap posts fetch kar rahe hain (jaise useEffect mein ya snapshot listener mein)
  //  const fetchPosts = async () => {
  //   const querySnapshot = await getDocs(collection(db, "posts"));

  //   const postsWithUsers = await Promise.all(
  //     querySnapshot.docs.map(async (postDoc) => {
  //       const postData = postDoc.data();
  //       let fetchedUsername = "";
  //       let fetchedProfilePic = "";

  //       if (postData.userId) {
  //         const userDocRef = doc(db, "users", postData.userId);
  //         const userDocSnap = await getDoc(userDocRef);

  //         if (userDocSnap.exists()) {
  //           const userData = userDocSnap.data();

  //           fetchedUsername = userData.username || "";
  //           fetchedProfilePic = userData.profilePic || "";
  //         }
  //       }

  //       return {
  //         id: postDoc.id,
  //         ...postData,
  //         username: fetchedUsername,
  //         profilePic: fetchedProfilePic,
  //       };
  //     }),
  //   );

  //   setPostList(postsWithUsers);
  // };

  const {
    deletePost,
    likePost,
    editPost,
    dislikePost,
    addComment,
    deleteComment,
    savePost,
  } = useContext(PostList);

  const [isEditing, setIsEditing] = useState(false);
  const [newTitle, setNewTitle] = useState(post.title);
  const [newBody, setNewBody] = useState(post.body);
  const [comment, setComment] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const emojis = ["😀", "😂", "❤️", "🔥", "👍", "😍", "😎", "🎉"];
  const [showMore, setShowMore] = useState(false);
  // const [showHeart, setShowHeart] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const sharePost = async () => {
    const postUrl = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({
          title: post.title,
          text: post.body,
          url: postUrl,
        });
      } catch (error) {
        // console.log("Share cancelled");
      }
    } else {
      navigator.clipboard.writeText(postUrl);
      alert("Link copied ✅");
    }
  };

  const [replyMessage, setReplyMessage] = useState(null);

  const handleReply = (msg) => {
    setReplyMessage(msg);
    // setMenuOpen(null);
  };

  const addReply = async (postId, commentIndex) => {
    if (!replyText.trim()) return;

    const post = postList.find((post) => post.id === postId);

    const updatedComments = [...post.comments];

    const newReply = {
      id: crypto.randomUUID(),
      text: replyText,
      username: currentUsername || "User",
      userId: user.uid,
      createdAt: new Date().toISOString(),
    };

    updatedComments[commentIndex].replies = [
      ...(updatedComments[commentIndex].replies || []),
      newReply,
    ];

    try {
      await updateDoc(doc(db, "posts", post.id), {
        comments: updatedComments,
      });

      // Notification for comment owner
      const commentOwnerId = updatedComments[commentIndex].userId;

      if (commentOwnerId !== user.uid) {
        await addDoc(collection(db, "notifications"), {
          type: "reply",
          senderId: user.uid,
          senderName: currentUsername,
          receiverId: commentOwnerId,
          postId: post.id,
          commentId: updatedComments[commentIndex].id,
          replyId: newReply.id,
          message: "replied to your comment ↩️",
          read: false,
          createdAt: serverTimestamp(),
        });
      }

      setReplyText("");
      setReplyingTo(null);

      showToast("↩️ Reply Added");
    } catch (error) {
      console.log(error);
      showToast("❌ Reply Failed");
    }
  };

  const deleteReply = async (postId, commentIndex, replyIndex) => {
    try {
      const post = postList.find((post) => post.id === postId);

      if (!post) return;

      const updatedComments = [...post.comments];

      // reply remove
      updatedComments[commentIndex].replies.splice(replyIndex, 1);

      await updateDoc(doc(db, "posts", postId), {
        comments: updatedComments,
      });

      dispatchPostList({
        type: "UPDATE_COMMENTS",
        payload: {
          postId,
          comments: updatedComments,
        },
      });

      showToast("🗑️ Reply Deleted");
    } catch (error) {
      console.log(error);
      showToast("❌ Delete Failed");
    }
  };

  const getTimeAgo = (date) => {
    if (!date) return "Just now";

    const seconds = Math.floor((currentTime - new Date(date).getTime()) / 1000);

    if (seconds < 60) return "Just now";

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60)
      return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;

    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} ${days === 1 ? "day" : "days"} ago`;

    return new Date(date).toLocaleDateString();
  };
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 60000); // 1 minute

    return () => clearInterval(interval);
  }, []);

  // console.log("POST USER DATA:", {
  //   userId: post.userId,
  //   username: post.username,
  //   profilePic: post.profilePic,
  // });

  const getDisplayUsername = () => {
    return post.username || "User";
  };

  useEffect(() => {
    const checkFollowing = async () => {
      if (!user || !post.userId) return;

      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const data = userSnap.data();

        setIsFollowing(data.following?.includes(post.userId));
      }
    };

    checkFollowing();
  }, [post.userId]);

  useEffect(() => {
    if (clickCount === 0) return;

    const timer = setTimeout(() => {
      if (clickCount === 1) {
        setShowImageModal(true);
      } else if (clickCount === 2) {
        likePost(post.id);

        setShowHeart(true);

        setTimeout(() => {
          setShowHeart(false);
        }, 700);
      }

      setClickCount(0);
    }, 250);

    return () => clearTimeout(timer);
  }, [clickCount]);

  useEffect(() => {
    const fetchUsername = async () => {
      if (!user) return;

      const userSnap = await getDoc(doc(db, "users", user.uid));

      if (userSnap.exists()) {
        setCurrentUsername(userSnap.data().username);
      }
    };

    fetchUsername();
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (replyBoxRef.current && !replyBoxRef.current.contains(event.target)) {
        setReplyingTo(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (highlightReplyId && replyRefs.current[highlightReplyId]) {
        replyRefs.current[highlightReplyId].scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      } else if (
        highlightCommentId &&
        commentRefs.current[highlightCommentId]
      ) {
        commentRefs.current[highlightCommentId].scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [highlightCommentId, highlightReplyId]);

  const downloadImage = async () => {
    try {
      const response = await fetch(post.image);
      const blob = await response.blob();

      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `${post.title || "image"}.jpg`;

      document.body.appendChild(link);
      link.click();

      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.log(error);
      alert("Unable to download image.");
    }
  };

  return (
    <div
      className={`${highlight ? "post-highlight" : ""} card Mycard insta-card`}
      style={{
        backgroundColor: darkMode ? "#1E1E1E" : "#ffffff",
        color: darkMode ? "#FFFFFF" : "#000000",
      }}
    >
      <div className="post-header">
        <div className="profile-section">
          <img
            src={post.profilePic || "https://i.pravatar.cc/40"}
            className="profile-img"
            alt="profile"
          />

          <div>
            <h6>{getDisplayUsername()}</h6>

            <small>🕒 {getTimeAgo(post.createdAt)}</small>
          </div>
        </div>
      </div>

      <div className="post-options">
        <div
          className="menu-container"
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          {user?.uid !== post.userId && (
            <div
              className="follow"
              onClick={handleFollow}
              style={{
                color: darkMode ? "#ffffff" : "#000000",
                cursor: "pointer",
              }}
            >
              {isFollowing ? <FaUserCheck /> : <FaUserPlus />}
            </div>
          )}

          {post.userId === user?.uid && (
            <button
              onClick={handlePinPost}
              className={`pin-toggle-btn ${post.pinned ? "pinned" : ""}`}
              style={{
                color: darkMode ? "#fff" : "#333",
                borderColor: darkMode ? "#555" : "#ddd",
                backgroundColor: darkMode ? "#2b2b2b" : "transparent",
              }}
            >
              <span>{post.pinned ? "📌" : "📍"}</span>
              {post.pinned ? "Pinned" : "Pin"}
            </button>
          )}

          <button
            className="menu-btn"
            onClick={() => setShowMenu(!showMenu)}
            style={{
              background: "none",
              border: "none",
              color: darkMode ? "#FFFFFF" : "#000000",
              fontSize: "20px",
              cursor: "pointer",
            }}
          >
            ⋮
          </button>

          {showMenu && (
            <div
              className="post-menu"
              style={{
                position: "absolute",
                right: "100%", // 👈 Yahan '0' ki jagah '100%' karein
                top: 0, // 👈 Yahan '30px' ki jagah '0' karein
                backgroundColor: darkMode ? "#2C2C2C" : "#ffffff",
                border: `1px solid ${darkMode ? "#424242" : "#ccc"}`,
                borderRadius: "8px",
                boxShadow: darkMode
                  ? "0px 4px 12px rgba(0,0,0,0.5)"
                  : "0px 4px 12px rgba(0,0,0,0.1)",
                zIndex: 10,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                minWidth: "120px",
              }}
            >
              <button
                onClick={() => {
                  setIsEditing(true);
                  setShowMenu(false);
                }}
                style={{
                  background: "none",
                  border: "none",
                  padding: "10px 15px",
                  textAlign: "left",
                  color: darkMode ? "#FFFFFF" : "#000000",
                  cursor: "pointer",
                  borderBottom: `1px solid ${darkMode ? "#424242" : "#f0f0f0"}`,
                }}
              >
                ✏️ Edit
              </button>

              <button
                onClick={() => {
                  deletePost(post.id);
                  setShowMenu(false);
                }}
                style={{
                  background: "none",
                  border: "none",
                  padding: "10px 15px",
                  textAlign: "left",
                  color: darkMode ? "#ff5252" : "#d9534f",
                  cursor: "pointer",
                }}
              >
                🗑 Delete
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="card-body">
        {isEditing ? (
          <>
            <input
              className="form-control mb-1"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
            />

            <textarea
              className="form-control mb-1"
              value={newBody}
              onChange={(e) => setNewBody(e.target.value)}
            />

            <button
              className="btn btn-success me-1"
              onClick={() => {
                editPost(post.id, newTitle, newBody);
                setIsEditing(false);
              }}
            >
              Save
            </button>

            <button
              className="btn btn-danger"
              onClick={() => deletePost(post.id)}
            >
              <MdDelete /> Delete
            </button>
          </>
        ) : (
          <>
            <div className="d-flex justify-content-between mt-1">
              <div className="image-container">
                <img
                  src={post.image}
                  className="card-img-top MyImage"
                  alt={post.title}
                  style={{ cursor: "zoom-in" }}
                  onClick={() => {
                    setClickCount((prev) => prev + 1);
                  }}
                />

                {showHeart && <div className="heart-animation">❤️</div>}
              </div>

              {showImageModal && (
                <div
                  className="image-modal"
                  onClick={() => setShowImageModal(false)}
                >
                  <span
                    className="close-image"
                    onClick={() => setShowImageModal(false)}
                  >
                    ✖
                  </span>

                  <img
                    src={post.image}
                    alt={post.title}
                    className="zoom-image"
                    onClick={(e) => e.stopPropagation()}
                  />

                  <button
                    className="download-image-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadImage();
                    }}
                  >
                    ⬇ Download
                  </button>
                </div>
              )}
            </div>

            <div className="reaction">
              <div className="reaction-left">
                <span
                  className={`icon-btn ${
                    post.userReaction === "like" ? "liked" : ""
                  }`}
                  onClick={() => likePost(post.id)}
                >
                  ❤️
                </span>

                <span className="count">{post.reactions.likes}</span>

                <span
                  className={`icon-btn ${
                    post.userReaction === "dislike" ? "disliked" : ""
                  }`}
                  onClick={() => dislikePost(post.id)}
                >
                  👎
                </span>

                <span className="icon-btn share-btn" onClick={sharePost}>
                  ➤
                </span>
              </div>

              <span className="save-icon" onClick={() => savePost(post.id)}>
                {post.saved ? <BsSave2Fill /> : <BsSave2 />}
              </span>
            </div>

            <h5>{post.title}</h5>

            <p>
              {showMore
                ? String(post.body)
                : `${String(post.body).slice(0, 80)}...`}

              {post.body.length > 80 && (
                <span
                  className="read-more"
                  onClick={() => setShowMore(!showMore)}
                >
                  {showMore ? " Read Less" : " Read More"}
                </span>
              )}
            </p>
          </>
        )}

        <div className="comment-area">
          <div className="comment-input-box">
            <button
              className="emoji-btn"
              onClick={() => setShowEmoji(!showEmoji)}
            >
              😊
            </button>

            <input
              className="comment-input"
              placeholder="Add a comment..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  if (comment.trim().length > 0) {
                    addComment(post.id, comment);
                    setComment("");
                    setShowEmoji(false);
                  }
                }
              }}
            />

            <button
              className="comment-btn"
              onClick={() => {
                if (comment.trim()) {
                  addComment(post.id, comment);
                  setComment("");
                  setShowEmoji(false);
                }
              }}
            >
              Post
            </button>
          </div>
        </div>

        {showEmoji && (
          <div className="emoji-box">
            {emojis.map((emoji) => (
              <span
                key={emoji}
                onClick={() => setComment((prev) => prev + emoji)}
                className="emoji"
              >
                {emoji}
              </span>
            ))}
          </div>
        )}

        <div className="fw-bold mt-3 mb-2">
          💬{" "}
          {post.comments?.reduce(
            (total, comment) => total + 1 + (comment.replies?.length || 0),
            0,
          )}{" "}
          Comments
        </div>

        <div className="comments-container">
          {post.comments &&
            post.comments.map((item, index) => (
              <div
                key={item.id}
                ref={(el) => {
                  if (el) commentRefs.current[item.id] = el;
                }}
                className="d-flex justify-content-between align-items-center py-2 px-3 mb-2 rounded comments-list comment-item"
                style={{
                  backgroundColor:
                    item.id === highlightCommentId
                      ? "#fff3cd"
                      : darkMode
                        ? "#2C2C2C"
                        : "#f8f9fa",
                  color: darkMode ? "#FFFFFF" : "#212529",
                  border: `1px solid ${darkMode ? "#424242" : "#dee2e6"}`,
                }}
              >
                <div className="comment-content">
                  <strong>
                    {item.username?.replace(/[0-9]/g, "") || "GYANI"}
                  </strong>
                  <span>{item.text}</span>

                  <small>{getTimeAgo(item.createdAt)}</small>

                  <button
                    onClick={() => {
                      const open = replyingTo !== index;

                      setReplyingTo(open ? index : null);

                      if (open) {
                        setTimeout(() => {
                          replyBoxRef.current?.scrollIntoView({
                            behavior: "smooth",
                            block: "center",
                          });
                          replyBoxRef.current?.querySelector("input")?.focus();
                        }, 100);
                      }
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      padding: 0,
                      cursor: "pointer",
                      color: "#0d6efd",
                      textAlign: "left",
                      width: "fit-content",
                    }}
                  >
                    Reply
                  </button>

                  {replyingTo === index && (
                    <div className="mt-2 d-flex gap-2" ref={replyBoxRef}>
                      <input
                        type="text"
                        placeholder="Write a reply..."
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        className="form-control"
                      />

                      <button
                        onClick={() => addReply(post.id, index)}
                        style={{
                          backgroundColor: "#0d6efd",
                          color: "#fff",
                          border: "none",
                          padding: "6px 15px",
                          borderRadius: "20px",
                          cursor: "pointer",
                        }}
                      >
                        Send
                      </button>
                    </div>
                  )}

                  {item.replies?.length > 0 && (
                    <button
                      onClick={() =>
                        setShowReplies((prev) => ({
                          ...prev,
                          [index]: !prev[index],
                        }))
                      }
                      style={{
                        background: "none",
                        border: "none",
                        color: "#0d6efd",
                        cursor: "pointer",
                        marginLeft: "25px",
                      }}
                    >
                      {showReplies[index]
                        ? "Hide replies"
                        : `View all ${item.replies.length} replies`}
                    </button>
                  )}

                  {item.replies &&
                    (showReplies[index]
                      ? item.replies
                      : item.replies.slice(0, 0)
                    ).map((reply, replyIndex) => (
                      <div
                        key={reply.id}
                        ref={(el) => {
                          if (el) replyRefs.current[reply.id] = el;
                        }}
                        style={{
                          position: "relative",
                          marginLeft: "25px",
                          marginTop: "8px",
                          padding: "8px 30px 8px 8px",
                          borderLeft: "3px solid #0d6efd",
                          backgroundColor:
                            reply.id === highlightReplyId
                              ? "#fff3cd"
                              : darkMode
                                ? "#1f1f1f"
                                : "#ffffff",
                          borderRadius: "5px",
                        }}
                      >
                        <strong>{reply.username?.replace(/[0-9]/g, "")}</strong>

                        <div>{reply.text}</div>

                        {(reply.userId === user?.uid ||
                          post.userId === user?.uid) && (
                          <button
                            onClick={() =>
                              deleteReply(post.id, index, replyIndex)
                            }
                            style={{
                              position: "absolute",
                              top: "5px",
                              right: "5px",
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              fontSize: "16px",
                              color: darkMode ? "#aaa" : "#666",
                            }}
                          >
                            <IoClose />
                          </button>
                        )}

                        <small
                          style={{
                            color: darkMode ? "#aaa" : "#666",
                          }}
                        >
                          {getTimeAgo(reply.createdAt)}
                        </small>
                      </div>
                    ))}
                </div>

                {(item.userId === user?.uid || post.userId === user?.uid) && (
                  <button
                    onClick={() => deleteComment(post.id, index)}
                    style={{
                      position: "absolute",
                      top: "5px",
                      right: "8px",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontSize: "18px",
                      color: darkMode ? "#A0A0A0" : "#666",
                    }}
                  >
                    <IoClose />
                  </button>
                )}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default Post;
