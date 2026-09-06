import "./App.css";
import { Routes, Route } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min";
import Header from "./components/Header";
import Footer from "./components/Footer";
import Sidebar from "./components/Sidebar";
import CreatePost from "./components/CreatePost";
import PostList from "./components/PostList";
import Toast from "./components/Toast";
import { useState, useContext, useEffect } from "react";
import { PostList as PostContext } from "./store/post-list-store";
import PostListProvider from "./store/post-list-store";
import SignUp from "./components/SignUp";
import Login from "./components/Login";
import ProtectedRoute from "./components/ProtectedRoute";
import Profile from "./components/Profile";
import { useLocation } from "react-router-dom";
import { Navigate } from "react-router-dom";
import UserProfile from "./components/UserProfile";
import Messages from "./components/Messages";
import { onAuthStateChanged } from "firebase/auth";
import { doc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./firebase";
import Chat from "./components/Chat";

function AppContent() {
  const { toast } = useContext(PostContext);

  const location = useLocation();

  const hideLayout =
    location.pathname === "/" ||
    location.pathname === "/login" ||
    location.pathname === "/signup";

  const [searchTerm, setSearchTerm] = useState("");
  const [showSavedPosts, setShowSavedPosts] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem("darkMode");
    return savedTheme ? JSON.parse(savedTheme) : false;
  });

  useEffect(() => {
    localStorage.setItem("darkMode", JSON.stringify(darkMode));
  }, [darkMode]);

  return (
    <>
      <Toast message={toast} />

      <div
        className={`app-container ${darkMode ? "dark-mode" : ""}`}
        style={{
          background: darkMode ? "#121212" : "#ffffff",
          color: darkMode ? "#FFFFFF" : "#212529",
          minHeight: "100vh",
          display: "flex",
        }}
      >
        {!hideLayout && (
          <Sidebar
            showSavedPosts={showSavedPosts}
            setShowSavedPosts={setShowSavedPosts}
            darkMode={darkMode}
            key={auth.currentUser?.uid}
          />
        )}

        <div
          className="content"
          style={{ flex: 1, backgroundColor: darkMode ? "#1E1E1E" : "#FFFFFF" }}
        >
          {!hideLayout && (
            <Header
              setSearchTerm={setSearchTerm}
              showSavedPosts={showSavedPosts}
              setShowSavedPosts={setShowSavedPosts}
              darkMode={darkMode}
              setDarkMode={setDarkMode}
            />
          )}

          <Routes>
            {/* Root par agar user logged in hai toh home jaye, warna login */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Navigate to="/home" replace />
                </ProtectedRoute>
              }
            />

            <Route
              path="/home"
              element={
                <ProtectedRoute>
                  <PostList
                    searchTerm={searchTerm}
                    showSavedPosts={showSavedPosts}
                    darkMode={darkMode}
                  />
                </ProtectedRoute>
              }
            />

            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<SignUp />} />

            <Route
              path="/create"
              element={
                <ProtectedRoute>
                  <CreatePost />
                </ProtectedRoute>
              }
            />

            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile darkMode={darkMode} />
                </ProtectedRoute>
              }
            />

            <Route
              path="/profile/:id"
              element={
                <ProtectedRoute>
                  <Profile darkMode={darkMode} />
                </ProtectedRoute>
              }
            />

            <Route
              path="/user/:id"
              element={
                <ProtectedRoute>
                  <UserProfile darkMode={darkMode} />
                </ProtectedRoute>
              }
            />

            <Route
              path="/saveposts"
              element={
                <ProtectedRoute>
                  <PostList
                    searchTerm={searchTerm}
                    showSavedPosts={true}
                    darkMode={darkMode}
                  />
                </ProtectedRoute>
              }
            />

            <Route
              path="/messages"
              element={
                <ProtectedRoute>
                  <Messages darkMode={darkMode} />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<Navigate to="/login" replace />} />

            <Route path="/messages" element={<Messages />} />
            <Route
              path="/chat/:userId"
              element={<Chat darkMode={darkMode} />}
            />
          </Routes>
          {!hideLayout && <Footer darkMode={darkMode} />}
        </div>
      </div>
    </>
  );
}

function App() {
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        await setDoc(
          doc(db, "users", user.uid),
          {
            online: true,
            lastSeen: serverTimestamp(),
          },
          { merge: true },
        );
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handleBeforeUnload = async () => {
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
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  return (
    <PostListProvider>
      <AppContent />
    </PostListProvider>
  );
}

export default App;
