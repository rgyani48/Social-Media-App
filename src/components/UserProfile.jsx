import { useEffect, useState, useContext } from "react";
import { useParams } from "react-router-dom";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  arrayUnion,
  arrayRemove,
  setDoc,
  addDoc,
  documentId,
  serverTimestamp,
} from "firebase/firestore";

import { getAuth } from "firebase/auth";
import { db } from "../firebase";
import { PostList } from "../store/post-list-store";
import Post from "./Post";
import { useNavigate } from "react-router-dom";

const UserProfile = ({ darkMode }) => {
  const navigate = useNavigate();
  const { id } = useParams();

  const { postList } = useContext(PostList);

  const [userData, setUserData] = useState(null);
  const [userPosts, setUserPosts] = useState([]);

  const auth = getAuth();
  const currentUser = auth.currentUser;

  const [isFollowing, setIsFollowing] = useState(false);

  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);

  const [followersList, setFollowersList] = useState([]);
  const [followingList, setFollowingList] = useState([]);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const userSnap = await getDoc(doc(db, "users", id));

        if (userSnap.exists()) {
          const data = userSnap.data();

          setUserData(data);

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
        }

        const q = query(collection(db, "posts"), where("userId", "==", id));

        const postSnap = await getDocs(q);

        setUserPosts(
          postSnap.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })),
        );
      } catch (error) {
        console.log("User profile error:", error);
      }
    };

    fetchUserProfile();
  }, [id]);

  useEffect(() => {
    const checkFollow = async () => {
      if (!currentUser || !id) return;

      const snap = await getDoc(doc(db, "users", currentUser.uid));

      if (snap.exists()) {
        const data = snap.data();

        setIsFollowing(data.following?.includes(id));
      }
    };

    checkFollow();
  }, [id]);

  if (!userData) {
    return <h3 className="text-center mt-5">Loading...</h3>;
  }

  const handleFollow = async () => {
    if (!currentUser) return;

    const currentRef = doc(db, "users", currentUser.uid);

    const targetRef = doc(db, "users", id);

    if (isFollowing) {
      await updateDoc(currentRef, {
        following: arrayRemove(id),
      });

      await updateDoc(targetRef, {
        followers: arrayRemove(currentUser.uid),
      });

      setIsFollowing(false);
    } else {
      await setDoc(
        currentRef,
        {
          following: arrayUnion(id),
        },
        { merge: true },
      );

      await setDoc(
        targetRef,
        {
          followers: arrayUnion(currentUser.uid),
        },
        { merge: true },
      );

      setIsFollowing(true);

      // Follow Notification

      const userSnap = await getDoc(doc(db, "users", currentUser.uid));

      const username = userSnap.exists() ? userSnap.data().username : "Someone";

      const q = query(
        collection(db, "notifications"),
        where("receiverId", "==", id),
        where("senderId", "==", currentUser.uid),
        where("type", "==", "follow"),
      );

      const existingNotification = await getDocs(q);

      if (existingNotification.empty) {
        await addDoc(collection(db, "notifications"), {
          receiverId: id,
          senderId: currentUser.uid,
          type: "follow",
          message: `${username} started following you`,
          read: false,
          createdAt: serverTimestamp(),
        });
      }
    }
  };

  return (
    <div className="container mt-4">
      <div
        className="card shadow p-4 text-center"
        style={{
          backgroundColor: darkMode ? "#1E1E1E" : "#fff",
          color: darkMode ? "#fff" : "#000",
        }}
      >
        <div
          className="card shadow p-4 text-center d-flex flex-column align-items-center"
          style={{
            backgroundColor: darkMode ? "#1E1E1E" : "#fff",
            color: darkMode ? "#fff" : "#000",
          }}
        >
          <img
            src={userData?.profilePic || "/default-profile.png"}
            width="100"
            height="100"
            className="rounded-circle"
            style={{
              objectFit: "cover",
            }}
          />

          <h3 className="mt-3 text-center">{userData?.username || "User"}</h3>
        </div>

        {currentUser?.uid !== id && (
          <button
            className={`btn mt-3 ${
              isFollowing ? "btn-secondary" : "btn-primary"
            }`}
            onClick={handleFollow}
          >
            {isFollowing ? "Following" : "Follow"}
          </button>
        )}

        <div className="d-flex justify-content-center gap-5 mt-4">
          <div
            style={{ cursor: "pointer" }}
            onClick={() => setShowFollowers(true)}
          >
            <h5>{userData?.followers?.length || 0}</h5>
            <span>Followers</span>
          </div>

          <div
            style={{ cursor: "pointer" }}
            onClick={() => setShowFollowing(true)}
          >
            <h5>{userData?.following?.length || 0}</h5>
            <span>Following</span>
          </div>
        </div>
      </div>

      <h3
        className="text-center mt-4"
        style={{
          color: darkMode ? "#fff" : "#000",
        }}
      >
        Posts
      </h3>

      {userPosts.length === 0 ? (
        <div className="alert text-center">No Posts Yet</div>
      ) : (
        userPosts.map((post) => (
          <Post key={post.id} post={post} darkMode={darkMode} />
        ))
      )}

      {/* Followers Modal */}

      {showFollowers && (
        <div
          className="modal d-block"
          style={{
            backgroundColor: "rgba(0,0,0,0.5)",
          }}
        >
          <div className="modal-dialog">
            <div
              className="modal-content"
              style={{
                backgroundColor: darkMode ? "#1E1E1E" : "#fff",
                color: darkMode ? "#fff" : "#000",
              }}
            >
              <div className="modal-header">
                <h5>Followers</h5>

                <button
                  className="btn-close"
                  onClick={() => setShowFollowers(false)}
                />
              </div>

              <div className="modal-body">
                {followersList.length === 0 ? (
                  <p className="text-center">No Followers</p>
                ) : (
                  followersList.map((person) => (
                    <div
                      key={person.id}
                      className="d-flex align-items-center mb-3"
                      style={{
                        cursor: "pointer",
                      }}
                      onClick={() => {
                        setShowFollowers(false);
                        navigate(`/user/${person.id}`);
                      }}
                    >
                      <img
                        src={person.profilePic || "/default-profile.png"}
                        width="45"
                        height="45"
                        style={{
                          borderRadius: "50%",
                          objectFit: "cover",
                        }}
                      />

                      <h6 className="ms-3 mb-0">{person.username || "User"}</h6>
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
          className="modal d-block"
          style={{
            backgroundColor: "rgba(0,0,0,0.5)",
          }}
        >
          <div className="modal-dialog">
            <div
              className="modal-content"
              style={{
                backgroundColor: darkMode ? "#1E1E1E" : "#fff",
                color: darkMode ? "#fff" : "#000",
              }}
            >
              <div className="modal-header">
                <h5>Following</h5>

                <button
                  className="btn-close"
                  onClick={() => setShowFollowing(false)}
                />
              </div>

              <div className="modal-body">
                {followingList.length === 0 ? (
                  <p className="text-center">Not Following Anyone</p>
                ) : (
                  followingList.map((person) => (
                    <div
                      key={person.id}
                      className="d-flex align-items-center mb-3"
                      style={{
                        cursor: "pointer",
                      }}
                      onClick={() => {
                        setShowFollowing(false);
                        navigate(`/user/${person.id}`);
                      }}
                    >
                      <div className="text-center">
                        <img
                          src={person.profilePic || "/default-profile.png"}
                          width="45"
                          height="45"
                          style={{
                            borderRadius: "50%",
                            objectFit: "cover",
                            aspectRatio: "1 / 1",
                          }}
                        />
                      </div>

                      <h6 className="ms-3 mb-0">{person.username || "User"}</h6>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfile;
