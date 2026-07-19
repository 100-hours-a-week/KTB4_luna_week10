import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import Header from "../components/Header.jsx";
import CommentSection from "../components/post-detail/CommentSection.jsx";
import PostArticle from "../components/post-detail/PostArticle.jsx";
import ReportModal from "../components/post-detail/ReportModal.jsx";
import { getRequestErrorMessage } from "../components/post-detail/postDetailUtils.js";
import { getCommentList } from "../services/commentApi.js";
import { deletePost, getPostDetail, likePost, unlikePost } from "../services/postApi.js";
import { getLoginUser, requireLogin } from "../utils/auth.js";

const POSITIVE_INTEGER_PATTERN = /^[1-9]\d*$/;

export default function PostDetailPage() {
  const navigate = useNavigate();
  const { postId } = useParams();
  const loginUserRef = useRef(undefined);
  const currentVisit = useMemo(
    () => ({ postId }),
    [postId],
  );
  const currentVisitRef = useRef(null);
  const commentRequestSequenceRef = useRef(0);

  if (loginUserRef.current === undefined) {
    loginUserRef.current = getLoginUser();
  }

  const currentUserNickname = (
    loginUserRef.current.nickname
  );
  const [postDetailState, setPostDetailState] = (
    useState({
      visit: null,
      data: null,
    })
  );
  const [commentsState, setCommentsState] = (
    useState({
      visit: null,
      data: null,
    })
  );
  const [pageMessageState, setPageMessageState] = (
    useState({
      visit: null,
      message: "",
    })
  );
  const [isLikePending, setIsLikePending] = useState(false);
  const [isDeletingPost, setIsDeletingPost] = useState(false);
  const [ isReportModalOpen, setIsReportModalOpen ] = useState(false);
  const initializationRef = useRef({
    visit: undefined,
    postRequest: undefined,
    commentRequest: undefined,
    commentRequestSequence: undefined,
  });
  const isMountedRef = useRef(false);
  const likeLockRef = useRef(false);
  const postDeleteLockRef = useRef(false);

  const postDetail = (
    postDetailState.visit === currentVisit
      ? postDetailState.data
      : null
  );
  const comments = (
    commentsState.visit === currentVisit
      ? commentsState.data
      : null
  );
  const pageMessage = (
    pageMessageState.visit === currentVisit
      ? pageMessageState.message
      : ""
  );

  useLayoutEffect(() => {
    currentVisitRef.current = currentVisit;
    commentRequestSequenceRef.current += 1;

    return () => {
      if (currentVisitRef.current === currentVisit) {
        currentVisitRef.current = null;
        commentRequestSequenceRef.current += 1;
      }
    };
  }, [currentVisit]);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    document.title = "게시글 상세";

    if (
      initializationRef.current.visit !==
      currentVisit
    ) {
      initializationRef.current = {
        visit: currentVisit,
        postRequest: undefined,
        commentRequest: undefined,
        commentRequestSequence: undefined,
      };
    }

    const initialization = (
      initializationRef.current
    );

    if (initialization.postRequest === undefined) {
      const accessToken = requireLogin(navigate);

      if (!accessToken) {
        initialization.postRequest = null;
        return undefined;
      }

      if (!postId) {
        initialization.postRequest = null;
        window.alert("게시글 ID가 없습니다.");
        navigate("/posts");
        return undefined;
      }

      if (!POSITIVE_INTEGER_PATTERN.test(postId)) {
        initialization.postRequest = null;
        navigate("/posts");
        return undefined;
      }

      setPostDetailState({
        visit: currentVisit,
        data: null,
      });
      setCommentsState({
        visit: currentVisit,
        data: null,
      });
      setPageMessageState({
        visit: currentVisit,
        message: "",
      });
      setIsLikePending(false);
      setIsDeletingPost(false);
      setIsReportModalOpen(false);
      likeLockRef.current = false;
      postDeleteLockRef.current = false;
      initialization.postRequest = getPostDetail({
        postId,
      });
    }

    if (initialization.postRequest === null) {
      return undefined;
    }

    let isActive = true;

    async function loadPostAndComments() {
      let postResult;

      try {
        postResult = await (
          initialization.postRequest
        );
      } catch (error) {
        if (
          isActive &&
          isCurrentRequest(currentVisit)
        ) {
          setPageMessageState({
            visit: currentVisit,
            message: getRequestErrorMessage(error),
          });
        }

        return;
      }

      if (
        !isActive ||
        !isCurrentRequest(currentVisit)
      ) {
        return;
      }

      setPostDetailState({
        visit: currentVisit,
        data: postResult.data,
      });

      try {
        if (
          initialization.commentRequest ===
          undefined
        ) {
          initialization.commentRequest = (
            getCommentList({
              postId,
            })
          );
          initialization.commentRequestSequence = (
            ++commentRequestSequenceRef.current
          );
        }

        const commentResult = await (
          initialization.commentRequest
        );

        if (
          isActive &&
          isCurrentRequest(currentVisit) &&
          initialization.commentRequestSequence ===
            commentRequestSequenceRef.current
        ) {
          setCommentsState({
            visit: currentVisit,
            data: commentResult.data,
          });
        }
      } catch (error) {
        if (
          isActive &&
          isCurrentRequest(currentVisit) &&
          initialization.commentRequestSequence ===
            commentRequestSequenceRef.current
        ) {
          setPageMessageState({
            visit: currentVisit,
            message: getRequestErrorMessage(error),
          });
        }
      }
    }

    loadPostAndComments();

    return () => {
      isActive = false;
    };
  }, [currentVisit, navigate, postId]);

  async function reloadComments() {
    const requestVisit = currentVisit;
    const requestSequence = (
      ++commentRequestSequenceRef.current
    );
    let result;

    try {
      result = await getCommentList({
        postId: requestVisit.postId,
      });
    } catch (error) {
      if (!isCurrentRequest(requestVisit)) {
        return false;
      }

      if (
        requestSequence !==
        commentRequestSequenceRef.current
      ) {
        return true;
      }

      throw error;
    }

    if (!isCurrentRequest(requestVisit)) {
      return false;
    }

    if (
      requestSequence !==
      commentRequestSequenceRef.current
    ) {
      return true;
    }

    setCommentsState({
      visit: requestVisit,
      data: result.data,
    });
    return true;
  }

  function increaseCommentCount() {
    const requestVisit = currentVisit;

    if (!isCurrentRequest(requestVisit)) {
      return;
    }

    setPostDetailState((previous) => {
      if (
        previous.visit !== requestVisit ||
        !previous.data
      ) {
        return previous;
      }

      return {
        ...previous,
        data: {
          ...previous.data,
          meta: {
            ...(previous.data.meta || {}),
            comments: (
              (Number(
                previous.data.meta?.comments,
              ) || 0) + 1
            ),
          },
        },
      };
    });
  }

  async function handleLike() {
    if (likeLockRef.current || !postDetail) {
      return;
    }

    likeLockRef.current = true;
    const requestVisit = currentVisit;
    setIsLikePending(true);
    setPageMessageState({
      visit: requestVisit,
      message: "",
    });

    try {
      const result = postDetail.meta?.liked
        ? await unlikePost({
            postId: requestVisit.postId,
          })
        : await likePost({
            postId: requestVisit.postId,
          });

      if (!isCurrentRequest(requestVisit)) {
        return;
      }

      setPostDetailState((previous) => {
        if (
          previous.visit !== requestVisit ||
          !previous.data
        ) {
          return previous;
        }

        return {
          ...previous,
          data: {
            ...previous.data,
            meta: {
              ...(previous.data.meta || {}),
              likes: result.data.likes,
              liked: result.data.liked,
            },
          },
        };
      });
    } catch (error) {
      if (isCurrentRequest(requestVisit)) {
        setPageMessageState({
          visit: requestVisit,
          message: getRequestErrorMessage(error),
        });
      }
    } finally {
      if (isCurrentRequest(requestVisit)) {
        setIsLikePending(false);
        likeLockRef.current = false;
      }
    }
  }

  async function handleDeletePost() {
    if (postDeleteLockRef.current) {
      return;
    }

    const confirmed = window.confirm(
      "게시글을 삭제하시겠습니까?",
    );

    if (!confirmed) {
      return;
    }

    postDeleteLockRef.current = true;
    const requestVisit = currentVisit;
    setIsDeletingPost(true);
    setPageMessageState({
      visit: requestVisit,
      message: "",
    });

    try {
      const result = await deletePost({
        postId: requestVisit.postId,
      });

      if (!isCurrentRequest(requestVisit)) {
        return;
      }

      window.alert(
        result?.message ||
        "게시글이 삭제되었습니다.",
      );
      navigate("/posts");
    } catch (error) {
      if (isCurrentRequest(requestVisit)) {
        setPageMessageState({
          visit: requestVisit,
          message: getRequestErrorMessage(error),
        });
      }
    } finally {
      if (isCurrentRequest(requestVisit)) {
        setIsDeletingPost(false);
        postDeleteLockRef.current = false;
      }
    }
  }

  function isCurrentRequest(requestVisit) {
    return (
      isMountedRef.current &&
      currentVisitRef.current === requestVisit
    );
  }

  function setCurrentPageMessage(message) {
    if (isCurrentRequest(currentVisit)) {
      setPageMessageState({
        visit: currentVisit,
        message,
      });
    }
  }

  const isCurrentPostDetail = Boolean(
    postDetail &&
    String(postDetail.post?.postId ?? "") === postId,
  );

  return (
    <>
      <Header />

      <main className="post-detail-page">
        {isCurrentPostDetail ? (
          <>
            <PostArticle
              postDetail={postDetail}
              currentUserNickname={
                currentUserNickname
              }
              isLikePending={isLikePending}
              isDeletingPost={isDeletingPost}
              onLike={handleLike}
              onModify={() => {
                navigate(`/posts/${postId}/modify`);
              }}
              onDelete={handleDeletePost}
              onReport={() => {
                setIsReportModalOpen(true);
              }}
            />

            <CommentSection
              key={postId}
              comments={comments}
              commentCount={
                postDetail.meta?.comments
              }
              currentUserNickname={
                currentUserNickname
              }
              postId={postId}
              pageMessage={pageMessage}
              onIncreaseCommentCount={
                increaseCommentCount
              }
              isRequestCurrent={() => (
                isCurrentRequest(currentVisit)
              )}
              onPageMessage={
                setCurrentPageMessage
              }
              onReloadComments={reloadComments}
            />
          </>
        ) : (
          <p
            id="message"
            className={
              pageMessage
                ? "message error"
                : "message"
            }
          >
            {pageMessage}
          </p>
        )}
      </main>

      <ReportModal
        key={postId}
        isOpen={
          isCurrentPostDetail &&
          isReportModalOpen
        }
        postId={postId}
        isRequestCurrent={() => (
          isCurrentRequest(currentVisit)
        )}
        onOpenChange={setIsReportModalOpen}
      />
    </>
  );
}
