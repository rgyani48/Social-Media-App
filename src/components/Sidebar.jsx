import { signOut } from "firebase/auth";
import { auth, db } from "../firebase";
import { useNavigate } from "react-router-dom";
import { Link, NavLink } from "react-router-dom";
import { useEffect } from "react";
import {
  doc,
  onSnapshot,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useUser } from "../store/user-context";
import { FiLogOut } from "react-icons/fi";
import {
  FaHome,
  FaPlusCircle,
  FaUser,
  FaBookmark,
  FaCompass,
  FaCog,
  FaSignOutAlt,
} from "react-icons/fa";

const Sidebar = ({ showSavedPosts, setShowSavedPosts, darkMode }) => {
  const { profilePic, setProfilePic, username, setUsername, setEmail } =
    useUser();

  useEffect(() => {
    let userUnsubscribe;

    const authUnsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setProfilePic("");
        setUsername("");
        setEmail("");
        return;
      }

      console.log("AUTH USER UID:", user.uid); // 👈 yahan

      const userRef = doc(db, "users", user.uid);

      userUnsubscribe = onSnapshot(userRef, (docSnap) => {
        if (docSnap.exists()) {
          // console.log("SNAPSHOT DOC UID:", docSnap.id); // 👈 aur yahan

          const data = docSnap.data();

          setProfilePic(data.profilePic || "");
          setUsername(data.username || "User");
          setEmail(data.email || "");
        }
      });
    });

    return () => {
      authUnsubscribe();

      if (userUnsubscribe) {
        userUnsubscribe();
      }
    };
  }, []);

  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      const currentUser = auth.currentUser;

      if (currentUser) {
        await setDoc(
          doc(db, "users", currentUser.uid),
          {
            online: false,
            lastSeen: serverTimestamp(),
          },
          { merge: true },
        );
      }

      await signOut(auth);

      alert("👋 Logged Out Successfully");
      navigate("/login");
    } catch (error) {
      console.log("Logout Error:", error);
      alert(error.message);
    }
  };

  return (
    <div
      className={`d-flex flex-column flex-shrink-0 p-3 sidebar border-end ${
        darkMode ? "text-white" : "bg-white text-dark"
      }`}
      style={{
        width: "240px",
        minHeight: "100vh",
        backgroundColor: darkMode ? "#1E1E1E" : "#FFFFFF",
        borderColor: darkMode ? "#424242 !important" : "#dee2e6",
      }}
    >
      {/* Brand Logo */}
      <Link
        to="/"
        className={`d-flex align-items-center mb-3 mb-md-0 me-md-auto text-decoration-none ${
          darkMode ? "text-white" : "text-dark"
        }`}
      >
        <svg className="bi pe-none me-2" width="40" height="32">
          <use xlinkHref="#bootstrap"></use>
        </svg>

        <span className="fs-4">
          <b className="Logo">GYANI</b>
        </span>
      </Link>

      <hr
        style={{
          margin: "0 -1rem",
          border: "none",
          height: "1px",
          backgroundColor: darkMode ? "#424242" : "#c8c6c6",
          opacity: 1,
          marginTop: "19px",
        }}
      />

      {/* Nav Links */}
      <ul className="nav nav-pills flex-column mb-auto mt-4">
        <li className="mb-2">
          <NavLink
            to="/home"
            end
            className={({ isActive }) =>
              isActive ? "sidebar-link active" : "sidebar-link"
            }
          >
            <FaHome />
            <span>Home </span>
          </NavLink>
        </li>

        <li className="mb-2">
          <NavLink
            to="/create"
            className={({ isActive }) =>
              `sidebar-link ${isActive ? "active" : ""}`
            }
          >
            <FaPlusCircle />
            <span>Create Post</span>
          </NavLink>
        </li>

        <li className="mb-2">
          <NavLink
            to="/profile"
            className={({ isActive }) =>
              `sidebar-link ${isActive ? "active" : ""}`
            }
          >
            <FaUser />
            <span>Profile</span>
          </NavLink>
        </li>

        <li className="mb-2">
          <NavLink
            to="/saveposts"
            className={({ isActive }) =>
              `sidebar-link ${isActive ? "active" : ""}`
            }
          >
            <FaBookmark />
            <span>Saved</span>
          </NavLink>
        </li>

        <li className="mb-2">
          <a href="#" className="sidebar-link">
            <FaCompass />
            <span>Explore</span>
          </a>
        </li>

        <li className="mb-2">
          <a href="#" className="sidebar-link">
            <FaCog />
            <span>Settings</span>
          </a>
        </li>
      </ul>

      <div className="sidebar-profile">
        <div className="dropdown mt-auto mb-3">
          <small className="profile-status"> Online 🟢</small>
          <a
            href="#"
            className={`d-flex align-items-center text-decoration-none dropdown-toggle ${
              darkMode ? "text-white" : "text-dark"
            }`}
            data-bs-toggle="dropdown"
          >
            <div className="d-flex align-items-center w-100">
              <img
                src={profilePic || "https://i.pravatar.cc/40"}
                alt="Profile"
                className="rounded-circle me-2"
                style={{ width: "32px", height: "32px", objectFit: "cover" }}
              />
              <span
                className="text-truncate username"
                style={{ maxWidth: "130px" }}
              >
                {username || "User"}
              </span>

              <div className="profile-info"></div>
            </div>
          </a>

          <ul
            className={`dropdown-menu shadow ${
              darkMode ? "text-white" : "bg-white"
            }`}
            style={{
              backgroundColor: darkMode ? "#2C2C2C" : "#FFFFFF",
              border: darkMode
                ? "1px solid #424242"
                : "1px solid rgba(0,0,0,.15)",
            }}
          >
            <li>
              <button
                className="dropdown-item text-danger"
                onClick={handleLogout}
                style={{ backgroundColor: "transparent" }}
              >
                <FiLogOut size={18} className="me-2" />
                Sign Out
              </button>
            </li>
          </ul>
        </div>
      </div>

      {/* Profile Dropdown */}
    </div>
  );
};

export default Sidebar;
