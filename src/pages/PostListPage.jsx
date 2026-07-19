import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import Header from "../components/Header.jsx";
import { getPostList } from "../services/postApi.js";
import { requireLogin } from "../utils/auth.js";
import { formatCount, formatDateTime } from "../utils/format.js";

function PostListItem({ item }) {
  const author = item.author || {};
  const post = item.post || {};
  const postId = post.postId ?? "";
  const title = post.title || "제목 없음";
  const nickname = author.nickname || "알 수 없음";
  const likeCount = Number(post.likes) || 0;
  const commentCount = Number(post.comments) || 0;
  const createdAt = post.createdAt || "";

  return (
    <article className="post-row">
      <Link
        className="post-row-link"
        to={`/posts/${postId}`}
      >
        <span className="post-like-cell">
          {likeCount > 0 ? (
            <span className="post-like-badge">
              ♥ {formatCount(likeCount)}
            </span>
          ) : null}
        </span>

        <span className="post-id-cell">
          {postId}
        </span>

        <span className="post-title-cell">
          <span className="post-title-text">
            {title}
          </span>
          {commentCount > 0 ? (
            <span className="post-comment-badge">
              [{formatCount(commentCount)}]
            </span>
          ) : null}
        </span>

        <span className="post-author-cell">
          {nickname}
        </span>

        <time
          className="post-time-cell"
          dateTime={createdAt}
        >
          {formatDateTime(createdAt)}
        </time>

        <span className="post-views-cell">
          {formatCount(post.views)}
        </span>
      </Link>
    </article>
  );
}

export default function PostListPage() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const postListRequestRef = useRef(undefined);

  useEffect(() => {
    document.title = "게시글 목록";

    let request = postListRequestRef.current;

    if (request === undefined) {
      const accessToken = requireLogin(navigate);

      if (!accessToken) {
        postListRequestRef.current = null;
        return undefined;
      }

      setErrorMessage("");
      request = getPostList();
      postListRequestRef.current = request;
    }

    if (request === null) {
      return undefined;
    }

    let isActive = true;

    async function loadPosts() {
      try {
        const result = await request;

        if (isActive) {
          setPosts(result.data);
        }
      } catch (error) {
        if (isActive) {
          setErrorMessage(error.message);
        }
      }
    }

    loadPosts();

    return () => {
      isActive = false;
    };
  }, [navigate]);

  return (
    <>
      <Header />

      <main className="post-list-page">
        <h1>게시글 목록</h1>

        <button
          id="postWriteButton"
          type="button"
          onClick={() => {
            navigate("/posts/create");
          }}
        >
          게시글 작성
        </button>

        <section id="postList">
          {posts !== null ? (
            <>
              <div className="post-list-header">
                <span>좋아요</span>
                <span>번호</span>
                <span>제목</span>
                <span>작성자</span>
                <span>작성시간</span>
                <span>조회수</span>
              </div>

              {posts.length > 0 ? (
                posts.map((item) => (
                  <PostListItem
                    key={item.post?.postId}
                    item={item}
                  />
                ))
              ) : (
                <p className="post-list-empty">
                  게시글이 없습니다.
                </p>
              )}
            </>
          ) : null}
        </section>

        <p id="message">
          {errorMessage}
        </p>
      </main>
    </>
  );
}
