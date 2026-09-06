import Post from "./Post";
import { useState, useEffect } from "react";
import { onAuthStateChanged, getAuth } from "firebase/auth";
import { useContext } from "react";
import { PostList } from "../store/post-list-store";
import { useNavigate } from "react-router-dom";
import { useParams } from "react-router-dom";
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  setDoc,
  documentId,
  arrayUnion,
  arrayRemove,
  updateDoc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { useUser } from "../store/user-context";

const Profile = ({ darkMode }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { dispatchPostList } = useContext(PostList);

  const { postList } = useContext(PostList);
  const auth = getAuth();
  const [user, setUser] = useState(null);
  const [profilePic, setProfilePic] = useState("");

  const [username, setUsername] = useState("");

  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);

  const [followersList, setFollowersList] = useState([]);
  const [followingList, setFollowingList] = useState([]);

  const {
    setProfilePic: setGlobalProfilePic,
    setUsername: setGlobalUsername,
    setEmail: setGlobalEmail,
  } = useUser();

  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState("");

  const myPosts = postList
    .filter((post) => post.userId === user?.uid)
    .sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return 0;
    });

  const pinnedPosts = myPosts.filter((post) => post.pinned);

  const normalPosts = myPosts.filter((post) => !post.pinned);

  const [totalLikes, setTotalLikes] = useState(0);

  const handleFollowBack = async (targetId) => {
    console.log("FOLLOW BACK CLICKED:", targetId);

    if (!user) return;

    try {
      const alreadyFollowing = followingList.some(
        (person) => person.id === targetId,
      );

      const currentUserRef = doc(db, "users", user.uid);
      const targetUserRef = doc(db, "users", targetId);

      if (alreadyFollowing) {
        await updateDoc(currentUserRef, {
          following: arrayRemove(targetId),
        });

        await updateDoc(targetUserRef, {
          followers: arrayRemove(user.uid),
        });
      } else {
        await setDoc(
          currentUserRef,
          {
            following: arrayUnion(targetId),
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
      }

      // Follow notification

      const userSnap = await getDoc(doc(db, "users", user.uid));

      const username = userSnap.exists() ? userSnap.data().username : "Someone";

      const q = query(
        collection(db, "notifications"),
        where("receiverId", "==", targetId),
        where("senderId", "==", user.uid),
        where("type", "==", "follow"),
      );

      const existingNotification = await getDocs(q);

      if (existingNotification.empty) {
        await addDoc(collection(db, "notifications"), {
          receiverId: targetId,
          senderId: user.uid,
          type: "follow",
          message: `${username} started following you`,
          read: false,
          createdAt: serverTimestamp(),
        });
      }

      setFollowingList((prev) =>
        alreadyFollowing
          ? prev.filter((item) => item.id !== targetId)
          : [...prev, followersList.find((item) => item.id === targetId)],
      );

      setFollowingCount((prev) => (alreadyFollowing ? prev - 1 : prev + 1));
    } catch (error) {
      console.log(error);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];

    if (file) {
      setImage(file);

      const reader = new FileReader();

      reader.onload = () => {
        setPreview(reader.result);
      };

      reader.readAsDataURL(file);
    }
  };

  const uploadProfile = async () => {
    if (!image) {
      alert("Please select image");
      return;
    }

    setLoading(true);

    const formData = new FormData();

    formData.append("file", image);
    formData.append("upload_preset", "social-media");

    try {
      const response = await fetch(
        "https://api.cloudinary.com/v1_1/c4h26k5s/image/upload",
        {
          method: "POST",
          body: formData,
        },
      );

      const data = await response.json();

      const imageUrl = data.secure_url;

      await setDoc(
        doc(db, "users", user.uid),
        {
          profilePic: imageUrl,
        },
        { merge: true },
      );

      dispatchPostList({
        type: "UPDATE_PROFILE_PIC",
        payload: {
          userId: user.uid,
          profilePic: imageUrl,
        },
      });

      const userSnap = await getDoc(doc(db, "users", user.uid));

      if (userSnap.exists()) {
        const data = userSnap.data();

        setGlobalUsername(data.username || "");
        setGlobalEmail(data.email || "");
      }

      setGlobalProfilePic(imageUrl);

      setProfilePic(imageUrl);

      alert("✅ Profile Picture Updated");
    } catch (error) {
      // console.log("PROFILE UPLOAD ERROR:", error);
      alert(error.message);
    }

    setLoading(false);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchMyPosts = async () => {
      if (!user) return;

      try {
        const userSnap = await getDoc(doc(db, "users", user.uid));

        if (userSnap.exists()) {
          const data = userSnap.data();

          // console.log("User document:", data);

          setProfilePic(data.profilePic || "");

          setFollowersCount(data.followers?.length || 0);

          setFollowingCount(data.following?.length || 0);

          // Followers List
          if (data.followers?.length > 0) {
            const followersQuery = query(
              collection(db, "users"),
              where(documentId(), "in", data.followers),
            );

            const followersSnap = await getDocs(followersQuery);

            setFollowersList(
              followersSnap.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
              })),
            );
          } else {
            setFollowersList([]);
          }

          // Following List
          if (data.following?.length > 0) {
            const followingQuery = query(
              collection(db, "users"),
              where(documentId(), "in", data.following),
            );

            const followingSnap = await getDocs(followingQuery);

            setFollowingList(
              followingSnap.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
              })),
            );
          } else {
            setFollowingList([]);
          }

          setGlobalProfilePic(data.profilePic || "");
          setUsername(data.username || "");
          setGlobalUsername(data.username || "");

          setGlobalEmail(data.email || "");
        }

        const likes = myPosts.reduce(
          (total, post) => total + (post.reactions?.likes || 0),
          0,
        );

        setTotalLikes(likes);
      } catch (error) {
        console.log("Profile fetch error:", error);
      }
    };

    fetchMyPosts();
  }, [user, myPosts]);

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <>
      {loading && (
        <div
          className={`alert text-center ${darkMode ? "alert-warning text-warning" : "alert-warning"}`}
          style={{
            backgroundColor: darkMode ? "#2C2C2C" : undefined,
            borderColor: darkMode ? "#424242" : undefined,
          }}
        >
          ⏳ Please wait... Uploading profile picture...
        </div>
      )}

      <div className="container mt-4 profile-container">
        {/* Profile Card */}
        <div
          className="card shadow p-4 mb-4 text-center profile-card"
          style={{
            backgroundColor: darkMode ? "#1E1E1E" : "#FFFFFF",
            color: darkMode ? "#FFFFFF" : "#212529",
            borderColor: darkMode ? "#424242" : "#dee2e6",
          }}
        >
          <img
            src={profilePic || "/default-profile.png"}
            className="profile-image"
            alt="profile"
          />

          <h2 className="profile-name">{username}</h2>
          <p
            className="profile-email"
            style={{ color: darkMode ? "#A0A0A0" : "#6c757d" }}
          >
            {user?.email}
          </p>

          <div className="profile-follow-stats">
            <div
              onClick={() => setShowFollowers(true)}
              style={{ cursor: "pointer" }}
            >
              <h5>{followersCount}</h5>
              <span>Followers</span>
            </div>

            <div
              onClick={() => setShowFollowing(true)}
              style={{ cursor: "pointer" }}
            >
              <h5>{followingCount}</h5>
              <span>Following</span>
            </div>
          </div>

          <div className="row mt-4 profile-stats">
            <div className="col-md-6">
              <div
                className="card text-white"
                style={{
                  backgroundColor: darkMode ? "#2C2C2C" : "#0d6efd",
                  borderColor: darkMode ? "#424242" : "#0d6efd",
                }}
              >
                <div className="card-body">
                  <h3>{myPosts.length}</h3>
                  <p>Total Posts</p>
                </div>
              </div>
            </div>

            <div className="col-md-6">
              <div
                className="card text-white"
                style={{
                  backgroundColor: darkMode ? "#2C2C2C" : "#dc3545",
                  borderColor: darkMode ? "#424242" : "#dc3545",
                }}
              >
                <div className="card-body">
                  <h3>{totalLikes}</h3>
                  <p>Total Likes</p>
                </div>
              </div>
            </div>
          </div>

          <hr
            style={{
              border: "none",
              height: "1px",
              backgroundColor: darkMode ? "#424242" : "#dee2e6",
              margin: "1.5rem 0",
            }}
          />

          <input
            type="file"
            accept="image/*"
            className="form-control mt-3"
            style={{
              backgroundColor: darkMode ? "#2C2C2C" : "#FFFFFF",
              color: darkMode ? "#FFFFFF" : "#212529",
              borderColor: darkMode ? "#424242" : "#ced4da",
            }}
            onChange={handleImageChange}
          />

          <button
            className={`btn mt-3 ${darkMode ? "btn-outline-light" : "btn-primary"}`}
            onClick={uploadProfile}
            disabled={loading}
          >
            {loading ? "Uploading..." : "Update Profile Picture"}
          </button>
        </div>

        {/* <h3
          className="mb-3 text-center"
          style={{ color: darkMode ? "#FFFFFF" : "inherit" }}
          id="my-posts-heading"
        >
          My Posts
        </h3> */}

        <div className="my-posts">
          {myPosts.length === 0 ? (
            <div
              className="alert text-center"
              style={{
                backgroundColor: darkMode ? "#1E1E1E" : "#cff4fc",
                color: darkMode ? "#FFFFFF" : "#055160",
                borderColor: darkMode ? "#424242" : "#b6effb",
              }}
            >
              No Posts Yet
            </div>
          ) : (
            <div className="my-posts">
              {myPosts.length === 0 ? (
                <div
                  className="alert text-center"
                  style={{
                    backgroundColor: darkMode ? "#1E1E1E" : "#cff4fc",
                    color: darkMode ? "#FFFFFF" : "#055160",
                    borderColor: darkMode ? "#424242" : "#b6effb",
                  }}
                >
                  No Posts Yet
                </div>
              ) : (
                <>
                  {myPosts.some((post) => post.pinned) && (
                    <>
                      <h5
                        className="mb-3"
                        style={{
                          textAlign: "center",
                          width: "100%",
                        }}
                      >
                        📌 Pinned Posts
                      </h5>

                      {myPosts
                        .filter((post) => post.pinned)
                        .map((post) => (
                          <Post key={post.id} post={post} darkMode={darkMode} />
                        ))}
                    </>
                  )}

                  {normalPosts.length > 0 && (
                    <>
                      <h5
                        className="mt-4 mb-3"
                        style={{
                          textAlign: "center",
                          width: "100%",
                        }}
                      >
                        📝 All Posts
                      </h5>

                      {normalPosts.map((post) => (
                        <Post key={post.id} post={post} darkMode={darkMode} />
                      ))}
                    </>
                  )}
                </>
              )}
            </div>
          )}
        </div>
        {/* Followers Modal */}
        {showFollowers && (
          <div
            className="modal fade show d-block"
            tabIndex="-1"
            style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          >
            <div className="modal-dialog modal-dialog-centered">
              <div
                className="modal-content"
                style={{
                  backgroundColor: darkMode ? "#1E1E1E" : "#fff",
                  color: darkMode ? "#fff" : "#000",
                }}
              >
                <div className="modal-header">
                  <h5 className="modal-title">Followers</h5>

                  <button
                    className="btn-close"
                    onClick={() => setShowFollowers(false)}
                    style={{
                      filter: darkMode ? "invert(1)" : "none",
                    }}
                  ></button>
                </div>

                <div
                  className="modal-body"
                  style={{
                    maxHeight: "400px",
                    overflowY: "auto",
                  }}
                >
                  {followersList.length === 0 ? (
                    <p className="text-center">No Followers Yet</p>
                  ) : (
                    followersList.map((person) => (
                      <div
                        key={person.id}
                        className="d-flex align-items-center mb-3"
                      >
                        <img
                          src={person.profilePic || "/default-profile.png"}
                          width="45"
                          height="45"
                          style={{
                            borderRadius: "50%",
                            objectFit: "cover",
                            cursor: "pointer",
                          }}
                          onClick={() => navigate(`/user/${person.id}`)}
                        />

                        <div className="ms-3">
                          <h6
                            className="mb-1"
                            style={{ cursor: "pointer" }}
                            onClick={() => navigate(`/user/${person.id}`)}
                          >
                            {person.username || "User"}
                          </h6>

                          {person.id !== user.uid && (
                            <button
                              className="btn btn-sm btn-primary"
                              onClick={() => handleFollowBack(person.id)}
                            >
                              {followingList.some(
                                (item) => item.id === person.id,
                              )
                                ? "Following"
                                : "Follow Back"}
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Following Modal */}
        {showFollowing && (
          <div
            className="modal fade show d-block"
            tabIndex="-1"
            style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          >
            <div className="modal-dialog modal-dialog-centered">
              <div
                className="modal-content"
                style={{
                  backgroundColor: darkMode ? "#1E1E1E" : "#fff",
                  color: darkMode ? "#fff" : "#000",
                }}
              >
                <div className="modal-header">
                  <h5 className="modal-title">Following</h5>

                  <button
                    className="btn-close"
                    onClick={() => setShowFollowing(false)}
                    style={{
                      filter: darkMode ? "invert(1)" : "none",
                    }}
                  ></button>
                </div>

                <div
                  className="modal-body"
                  style={{
                    maxHeight: "400px",
                    overflowY: "auto",
                  }}
                >
                  {followingList.length === 0 ? (
                    <p className="text-center">Not Following Anyone</p>
                  ) : (
                    followingList.map((person) => (
                      <div
                        key={person.id}
                        className="d-flex align-items-center mb-3"
                      >
                        <img
                          src={person.profilePic || "/default-profile.png"}
                          width="45"
                          height="45"
                          style={{
                            borderRadius: "50%",
                            objectFit: "cover",
                            cursor: "pointer",
                          }}
                          onClick={() => navigate(`/user/${person.id}`)}
                        />

                        <div className="ms-3">
                          <h6
                            className="mb-1"
                            style={{ cursor: "pointer" }}
                            onClick={() => navigate(`/user/${person.id}`)}
                          >
                            {person.username || "User"}
                          </h6>

                          {person.id !== user.uid && (
                            <button
                              className="btn btn-sm btn-primary"
                              onClick={() => handleFollowBack(person.id)}
                            >
                              {followingList.some(
                                (item) => item.id === person.id,
                              )
                                ? "Following"
                                : "Follow Back"}
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Profile;
