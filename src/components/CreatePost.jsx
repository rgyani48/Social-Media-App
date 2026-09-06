import { useContext, useRef, useState } from "react";
import { PostList } from "../store/post-list-store";
import { getAuth } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

const CreatePost = () => {
  const { addPost } = useContext(PostList);

  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const imageElement = useRef();
  const userIdElement = useRef();
  const postTitleElement = useRef();
  const postBodyElement = useRef();
  const tagsElement = useRef();
  const likesElement = useRef();
  const dislikesElement = useRef();

  const [preview, setPreview] = useState("");

  const handleImageChange = (e) => {
    const file = e.target.files[0];

    if (!file) {
      setPreview("");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      setPreview(reader.result);
    };

    reader.readAsDataURL(file);
  };

  const handleSubmit = async (event) => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });

    setLoading(true);

    event.preventDefault();

    let imageUrl = "";
    const imageFile = imageElement.current.files[0];

    setLoading(true);

    console.log("Image Size:", (imageFile.size / 1024 / 1024).toFixed(2), "MB");

    // Cloudinary Upload
    if (imageFile) {
      const formData = new FormData();

      formData.append("file", imageFile);
      formData.append("upload_preset", "social-media");

      const response = await fetch(
        "https://api.cloudinary.com/v1_1/c4h26k5s/image/upload",
        {
          method: "POST",
          body: formData,
        },
      );

      const data = await response.json();

      console.log("Cloudinary:", data);

      imageUrl = data.secure_url;
    }

    const postTitle = postTitleElement.current.value;
    const postBody = postBodyElement.current.value;

    const tags = tagsElement.current.value
      ? tagsElement.current.value.split(" ")
      : [];

    const likes = Number(likesElement.current.value) || 0;
    const dislikes = Number(dislikesElement.current.value) || 0;

    // Firebase Auth username

    const auth = getAuth();
    const user = auth.currentUser;
    const username = user ? user.email.split("@")[0] : "unknown_user";
    const userId = user ? user.uid : "guest";
    const userDoc = await getDoc(doc(db, "users", user.uid));

    const profilePic = userDoc.exists() ? userDoc.data().profilePic || "" : "";

    await addPost(
      imageUrl,
      userId,
      username,
      profilePic,
      postTitle,
      postBody,
      {
        likes,
        dislikes,
      },
      tags,
      false,
    );

    console.log("✅ addPost finished");

    setLoading(false);
    alert("✅ Post Uploaded Successfully");
    navigate("/");

    // Reset form

    imageElement.current.value = "";
    userIdElement.current.value = "";
    postTitleElement.current.value = "";
    postBodyElement.current.value = "";
    tagsElement.current.value = "";
    likesElement.current.value = "";
    dislikesElement.current.value = "";

    setPreview("");
  };

  return (
    <form className="CreatePost" onSubmit={handleSubmit}>
      {loading && (
        <div className="alert alert-info">
          ⏳ Please wait... Uploading your post...
        </div>
      )}
      <div className="mb-3">
        <label className="form-label">Upload Image</label>

        <input
          type="file"
          accept="image/*"
          ref={imageElement}
          className="form-control"
          onChange={handleImageChange}
        />

        {preview && (
          <img src={preview} alt="Preview" className="preview-image" />
        )}
      </div>

      <div className="mb-3">
        <label className="form-label">User Id</label>

        <input
          type="text"
          ref={userIdElement}
          className="form-control"
          placeholder="User Id"
        />
      </div>

      <div className="mb-3">
        <label className="form-label">Post Title</label>

        <input
          type="text"
          ref={postTitleElement}
          className="form-control"
          placeholder="Post title"
        />
      </div>

      <div className="mb-3">
        <label className="form-label">Post Content</label>

        <textarea
          rows="4"
          ref={postBodyElement}
          className="form-control"
          placeholder="Write something..."
        />
      </div>

      <div className="mb-3">
        <label className="form-label">Likes</label>

        <input
          type="number"
          ref={likesElement}
          className="form-control"
          placeholder="Likes"
        />
      </div>

      <div className="mb-3">
        <label className="form-label">Dislikes</label>

        <input
          type="number"
          ref={dislikesElement}
          className="form-control"
          placeholder="Dislikes"
        />
      </div>

      <div className="mb-3">
        <label className="form-label">Tags</label>

        <input
          type="text"
          ref={tagsElement}
          className="form-control"
          placeholder="tag1 tag2 tag3"
        />
      </div>

      <button type="submit" className="btn btn-primary">
        Post
      </button>
    </form>
  );
};

export default CreatePost;
