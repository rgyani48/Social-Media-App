import { createContext, useReducer, useEffect, useState } from "react";
import { db, auth } from "../firebase";
import {
  addDoc,
  collection,
  getDocs,
  getDoc,
  deleteDoc,
  doc,
  updateDoc,
  query,
  orderBy,
  serverTimestamp,
  onSnapshot,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";

export const PostList = createContext({
  postList: [],
  addPost: () => {},
  addInitialPosts: () => {},
  deletePost: () => {},
  likePost: () => {},
  dislikePost: () => {},
  editPost: () => {},
  addComment: () => {},
  deleteComment: () => {},
  savePost: () => {},
  showToast: () => {},
  dispatchPostList: () => {},
  toast: "",
});

const PostListReducer = (currPostList, action) => {
  let newPostList = currPostList;

  if (action.type === "DELETE_POST") {
    newPostList = currPostList.filter(
      (post) => post.id !== action.payload.postId,
    );
  } else if (action.type === "ADD_INITIAL_POSTS") {
    newPostList = action.payload.posts;
  } else if (action.type === "ADD_POST") {
    newPostList = [action.payload, ...currPostList];
  } else if (action.type === "LIKE_POST") {
    newPostList = currPostList.map((post) => {
      if (post.id !== action.payload.postId) return post;

      let likes = post.reactions.likes;
      let dislikes = post.reactions.dislikes;
      let userReaction = post.userReaction;

      if (userReaction === "like") {
        likes--;
        userReaction = null;
      } else if (userReaction === "dislike") {
        dislikes--;
        likes++;
        userReaction = "like";
      } else {
        likes++;
        userReaction = "like";
      }

      return {
        ...post,
        reactions: {
          likes,
          dislikes,
        },
        userReaction,
      };
    });
  } else if (action.type === "DISLIKE_POST") {
    newPostList = currPostList.map((post) => {
      if (post.id !== action.payload.postId) return post;

      let likes = post.reactions.likes;
      let dislikes = post.reactions.dislikes;
      let userReaction = post.userReaction;

      if (userReaction === "dislike") {
        dislikes--;
        userReaction = null;
      } else if (userReaction === "like") {
        likes--;
        dislikes++;
        userReaction = "dislike";
      } else {
        dislikes++;
        userReaction = "dislike";
      }

      return {
        ...post,
        reactions: {
          likes,
          dislikes,
        },
        userReaction,
      };
    });
  } else if (action.type === "SAVE_POST") {
    newPostList = currPostList.map((post) => {
      if (post.id !== action.payload.postId) return post;

      return {
        ...post,
        saved: !post.saved,
      };
    });
  } else if (action.type === "EDIT_POST") {
    newPostList = currPostList.map((post) => {
      if (post.id !== action.payload.postId) return post;

      return {
        ...post,
        title: action.payload.title,
        body: action.payload.body,
      };
    });
  } else if (action.type === "UPDATE_PROFILE_PIC") {
    return currPostList.map((post) =>
      post.userId === action.payload.userId
        ? {
            ...post,
            profilePic: action.payload.profilePic,
          }
        : post,
    );
  } else if (action.type === "ADD_COMMENT") {
    newPostList = currPostList.map((post) => {
      if (post.id !== action.payload.postId) return post;

      return {
        ...post,
        comments: [...post.comments, action.payload.comment],
      };
    });
  } else if (action.type === "DELETE_COMMENT") {
    newPostList = currPostList.map((post) => {
      if (post.id !== action.payload.postId) return post;

      return {
        ...post,
        comments: post.comments.filter(
          (_, index) => index !== action.payload.commentIndex,
        ),
      };
    });
  }

  return newPostList;
};

const PostListProvider = ({ children }) => {
  const [postList, dispatchPostList] = useReducer(PostListReducer, []);

  const [toast, setToast] = useState("");

  const showToast = (message) => {
    setToast(message);

    setTimeout(() => {
      setToast("");
    }, 2000);
  };

  const fetchPosts = () => {
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, async (querySnapshot) => {
      const postsWithUsers = await Promise.all(
        querySnapshot.docs.map(async (postDoc) => {
          const postData = postDoc.data();

          let username = postData.username || "";
          let profilePic = postData.profilePic || "";

          if (postData.userId) {
            const userRef = doc(db, "users", postData.userId);
            const userSnap = await getDoc(userRef);

            if (userSnap.exists()) {
              const userData = userSnap.data();

              username = userData.username || username;
              profilePic = userData.profilePic || profilePic;
            }
          }

          return {
            id: postDoc.id,
            ...postData,
            username,
            profilePic,
          };
        }),
      );

      dispatchPostList({
        type: "ADD_INITIAL_POSTS",
        payload: {
          posts: postsWithUsers,
        },
      });
    });

    return unsubscribe;
  };

  useEffect(() => {
    const unsubscribe = fetchPosts();

    return () => unsubscribe();
  }, []);

  const addPost = async (
    image,
    userId,
    username,
    profilePic,
    title,
    body,
    reactions,
    tags,
    pinned
  ) => {
    const auth = getAuth();
    const user = auth.currentUser;

    // console.log("TITLE:", title, typeof title);
    // console.log("BODY:", body, typeof body);

    const newPost = {
      image,
      title: title || "",
      body: body || "",
      reactions,
      userId,
      username,
      profilePic,
      tags: tags || [],
      userReaction: null,
      comments: [],
      saved: false,
      createdAt: new Date().toISOString(),
      pinned: pinned,
    };

    try {
      const docRef = await addDoc(collection(db, "posts"), newPost);
      // console.log("✅ Firestore Saved:", docRef.id);
      // console.log(newPost);

      dispatchPostList({
        type: "ADD_POST",
        payload: {
          id: docRef.id,
          ...newPost,
        },
      });

      showToast("✅ Post Added");
    } catch (error) {
      console.error(error);
      showToast("❌ Error Adding Post");
    }
  };

  const addInitialPosts = async (posts) => {
    try {
      const savedPosts = [];

      for (const post of posts) {
        const { id, ...postData } = post;

        const docRef = await addDoc(collection(db, "posts"), postData);

        savedPosts.push({
          id: docRef.id,
          ...postData,
        });
      }

      dispatchPostList({
        type: "ADD_INITIAL_POSTS",
        payload: {
          posts: savedPosts,
        },
      });

      showToast("✅ Dummy Posts Added");
    } catch (error) {
      // console.log(error);
    }
  };
  const deletePost = async (postId) => {
    try {
      // Firestore se delete
      await deleteDoc(doc(db, "posts", postId));

      // UI se delete
      dispatchPostList({
        type: "DELETE_POST",
        payload: {
          postId,
        },
      });

      showToast("🗑️ Post Deleted");
    } catch (error) {
      // console.log(error);
      showToast("❌ Delete Failed");
    }
  };

  const likePost = async (postId) => {
    const post = postList.find((post) => post.id === postId);

    let likes = post.reactions.likes;
    let dislikes = post.reactions.dislikes;
    let userReaction = post.userReaction;

    if (userReaction === "like") {
      likes--;
      userReaction = null;
    } else if (userReaction === "dislike") {
      dislikes--;
      likes++;
      userReaction = "like";
    } else {
      likes++;
      userReaction = "like";
    }

    try {
      await updateDoc(doc(db, "posts", String(postId)), {
        reactions: {
          likes,
          dislikes,
        },
        userReaction,
      });

      const currentUser = auth.currentUser;

      if (
        currentUser &&
        currentUser.uid !== post.userId &&
        userReaction === "like"
      ) {
        await addDoc(collection(db, "notifications"), {
          receiverId: post.userId,
          senderId: currentUser.uid,
          senderName: currentUser.email.split("@")[0],
          postId: post.id,
          type: "like",
          message: `${currentUser.email.split("@")[0]} liked your post ❤️`,
          read: false,
          createdAt: serverTimestamp(),
        });
      }

      dispatchPostList({
        type: "LIKE_POST",
        payload: {
          postId,
        },
      });

      showToast("❤️ Post Liked");
    } catch (error) {
      // console.log(error);
    }
  };

  const dislikePost = async (postId) => {
    const post = postList.find((post) => post.id === postId);

    let likes = post.reactions.likes;
    let dislikes = post.reactions.dislikes;
    let userReaction = post.userReaction;

    if (userReaction === "dislike") {
      dislikes--;
      userReaction = null;
    } else if (userReaction === "like") {
      likes--;
      dislikes++;
      userReaction = "dislike";
    } else {
      dislikes++;
      userReaction = "dislike";
    }

    try {
      await updateDoc(doc(db, "posts", postId), {
        reactions: {
          likes,
          dislikes,
        },
        userReaction,
      });

      dispatchPostList({
        type: "DISLIKE_POST",
        payload: {
          postId,
        },
      });

      showToast("👎 Post Disliked");
    } catch (error) {
      // console.log(error);
      showToast("❌ Error");
    }
  };

  const savePost = async (postId) => {
    const post = postList.find((post) => post.id === postId);

    const updatedSaved = !post.saved;

    try {
      await updateDoc(doc(db, "posts", postId), {
        saved: updatedSaved,
      });

      dispatchPostList({
        type: "SAVE_POST",
        payload: {
          postId,
        },
      });

      if (updatedSaved) {
        showToast("🔖 Post Saved");
      } else {
        showToast("📂 Post Unsaved");
      }
    } catch (error) {
      // console.log(error);
      showToast("❌ Error");
    }
  };

  const editPost = async (postId, title, body) => {
    try {
      await updateDoc(doc(db, "posts", postId), {
        title,
        body,
      });

      dispatchPostList({
        type: "EDIT_POST",
        payload: {
          postId,
          title,
          body,
        },
      });

      showToast("✏️ Post Updated");
    } catch (error) {
      // console.log(error);
      showToast("❌ Update Failed");
    }
  };

  const addComment = async (postId, comment) => {
    const post = postList.find((post) => post.id === postId);

    const userSnap = await getDoc(doc(db, "users", auth.currentUser.uid));

    const username = userSnap.exists() ? userSnap.data().username : "User";

    const newComment = {
      id: crypto.randomUUID(),
      text: comment,
      username: username,
      userId: auth.currentUser.uid,
      createdAt: new Date().toISOString(),
      replies: [],
    };

    const updatedComments = [...post.comments, newComment];

    try {
      await updateDoc(doc(db, "posts", postId), {
        comments: updatedComments,
      });

      // Notification for post owner
      if (post.userId !== auth.currentUser.uid) {
        await addDoc(collection(db, "notifications"), {
          type: "comment",
          senderId: auth.currentUser.uid,
          senderName: username,
          receiverId: post.userId,
          postId: postId,
          commentId: newComment.id,
          commentIndex: updatedComments.length - 1, // 👈 add
          message: "commented on your post 💬",
          read: false,
          createdAt: serverTimestamp(),
        });
      }


      showToast("💬 Comment Added");
    } catch (error) {
      // console.log(error);
      showToast("❌ Comment Failed");
    }
  };

  const deleteComment = async (postId, commentIndex) => {
    const post = postList.find((post) => post.id === postId);

    const updatedComments = post.comments.filter(
      (_, index) => index !== commentIndex,
    );

    try {
      await updateDoc(doc(db, "posts", postId), {
        comments: updatedComments,
      });

      dispatchPostList({
        type: "DELETE_COMMENT",
        payload: {
          postId,
          commentIndex,
        },
      });

      showToast("❌ Comment Deleted");
    } catch (error) {
      // console.log(error);
      showToast("❌ Delete Failed");
    }
  };

  return (
    <PostList.Provider
      value={{
        postList,
        addPost,
        addInitialPosts,
        deletePost,
        likePost,
        dislikePost,
        editPost,
        dispatchPostList,
        addComment,
        deleteComment,
        savePost,
        showToast,
        toast,
      }}
    >
      {children}
    </PostList.Provider>
  );
};

export default PostListProvider;
