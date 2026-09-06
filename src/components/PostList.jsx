import { useContext } from "react";
import Post from "./Post";
import { PostList as PostListData } from "../store/post-list-store";
import WelcomeMessage from "./WelcomMessage";
import { useLocation } from "react-router-dom";
import { useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const PostList = ({ searchTerm, showSavedPosts, darkMode }) => {
  const { postList, addInitialPosts } = useContext(PostListData);
  const location = useLocation();
  const postRefs = useRef({});
  const navigate = useNavigate();

  const selectedPostId = location.state?.postId || null;
  const selectedCommentId = location.state?.commentId || null;
  const selectedReplyId = location.state?.replyId || null;

  const handleGetPostClick = () => {
    if (postList.length > 0) return;

    fetch("https://dummyjson.com/posts")
      .then((res) => res.json())
      .then((data) => {
        const postsWithImages = data.posts.map((post) => ({
          ...post,
          image: `https://picsum.photos/400/300?random=${post.id}`,
          userReaction: null,
          comments: [],
          createdAt: new Date().toISOString(),
          saved: false,
        }));

        addInitialPosts(postsWithImages);
      });
  };

  // console.log("Current PostList for filtering:", postList);
  // console.log("Current Search Term:", searchTerm);

  // 🔍 Search Filter
  // 🔍 Search Filter
  const filteredPosts = postList.filter((post) => {
    // console.log("Pehla post object check:", postList[0]);
    const title =
      typeof post.title === "string" ? post.title.toLowerCase() : "";
    const body = typeof post.body === "string" ? post.body.toLowerCase() : "";
    const username =
      typeof post.username === "string" ? post.username.toLowerCase() : "";

    const searchText = (searchTerm || "").toLowerCase();

    return (
      title.includes(searchText) ||
      body.includes(searchText) ||
      username.includes(searchText) ||
      name.includes(searchText)
    );
  });

  const displayPosts = showSavedPosts
    ? filteredPosts.filter((post) => post.saved)
    : filteredPosts;

  useEffect(() => {
    if (selectedPostId && postRefs.current[selectedPostId]) {
      postRefs.current[selectedPostId].scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [selectedPostId, displayPosts]);

  return (
    <div className="items" onClick={() => navigate("/home")}>
      {postList.length === 0 ? (
        <WelcomeMessage onGetPostClick={handleGetPostClick} />
      ) : displayPosts.length === 0 ? (
        <h3 className="text-center mt-5">
          {showSavedPosts ? "No Saved Posts 🔖" : "No Posts Found 😔"}
        </h3>
      ) : (
        displayPosts.map((post) => (
          <div key={post.id} ref={(el) => (postRefs.current[post.id] = el)}>
            <Post
              post={post}
              darkMode={darkMode}
              highlight={post.id === selectedPostId}
              highlightCommentId={selectedCommentId}
              highlightReplyId={selectedReplyId}
            />
          </div>
        ))
      )}
    </div>
  );
};

export default PostList;
