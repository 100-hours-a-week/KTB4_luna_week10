import {
  Fragment,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Link,
  useNavigate,
  useParams,
} from "react-router-dom";

import defaultProfileImage from "../assets/default-profile.png";
import Header from "../components/Header.jsx";
import {
  ReportReason,
  ReportReasonLabel,
} from "../constants/reportReason.js";
import { useForm } from "../hooks/useForm.js";
import {
  deleteComment,
  getCommentList,
  modifyComment,
  postComment,
} from "../services/commentApi.js";
import {
  deletePost,
  getPostDetail,
  likePost,
  reportPost,
  unlikePost,
} from "../services/postApi.js";
import {
  getLoginUser,
  requireLogin,
} from "../utils/auth.js";
import {
  formatCount,
  formatDateTime,
} from "../utils/format.js";

const POSITIVE_INTEGER_PATTERN = /^[1-9]\d*$/;

const commentBodyRules = {
  required: {
    message: "댓글 내용을 입력해주세요.",
  },
};

const reportReasonRules = {
  required: {
    message: "신고 사유를 선택해주세요.",
  },
};

function getRequestErrorMessage(
  error,
  fallback = "요청을 처리하지 못했습니다.",
) {
  return typeof error?.message === "string" &&
    error.message
    ? error.message
    : fallback;
}

function MultilineText({ value }) {
  return String(value ?? "")
    .split("\n")
    .map((line, index) => (
      <Fragment key={`${index}-${line}`}>
        {index > 0 ? <br /> : null}
        {line}
      </Fragment>
    ));
}

function ProfileImage({
  author,
  size,
}) {
  return (
    <img
      className="detail-profile-image"
      src={
        author.profileImageUrl ||
        defaultProfileImage
      }
      alt="프로필 이미지"
      width={size}
      height={size}
    />
  );
}

function PostArticle({
  postDetail,
  currentUserNickname,
  isLikePending,
  isDeletingPost,
  onLike,
  onModify,
  onDelete,
  onReport,
}) {
  const author = postDetail.author || {};
  const post = postDetail.post || {};
  const meta = postDetail.meta || {};
  const isPostOwner = (
    author.nickname === currentUserNickname
  );
  const isLiked = meta.liked === true;

  return (
    <article
      id="postDetail"
      className="post-detail-article"
    >
      <div id="postDetailContent">
        <header className="post-detail-header">
          <div className="post-detail-heading">
            <Link
              className="post-detail-back-link"
              to="/posts"
            >
              목록으로
            </Link>

            <div className="post-detail-title-row">
              <h1>{post.title || "제목 없음"}</h1>
              <span className="post-detail-view-count">
                조회수 {formatCount(meta.views)}
              </span>
            </div>

            <div className="post-detail-author">
              <ProfileImage
                author={author}
                size={44}
              />

              <div>
                <strong>
                  {author.nickname || "알 수 없음"}
                </strong>

                <div className="post-detail-date">
                  <span>
                    작성일 {formatDateTime(
                      post.createdAt,
                    )}
                  </span>

                  {post.modified && post.modifiedAt ? (
                    <span>
                      수정일 {formatDateTime(
                        post.modifiedAt,
                      )}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div className="post-header-actions">
            {isPostOwner ? (
              <>
                <button
                  id="postModifyButton"
                  type="button"
                  onClick={onModify}
                >
                  수정
                </button>

                <button
                  id="postDeleteButton"
                  type="button"
                  disabled={isDeletingPost}
                  onClick={onDelete}
                >
                  삭제
                </button>
              </>
            ) : null}

            <button
              id="reportOpenButton"
              className="secondary-button"
              type="button"
              onClick={onReport}
            >
              신고하기
            </button>
          </div>
        </header>

        {post.postImageUrl ? (
          <figure className="post-detail-image-wrap">
            <img
              src={post.postImageUrl}
              alt="게시글 이미지"
            />
          </figure>
        ) : null}

        <section className="post-detail-body">
          <MultilineText value={post.postBody} />
        </section>
      </div>

      <footer className="post-detail-like-area">
        <button
          id="likeButton"
          className={
            `post-like-button${
              isLiked ? " active" : ""
            }`
          }
          type="button"
          aria-pressed={isLiked}
          disabled={isLikePending}
          onClick={onLike}
        >
          <span
            className="post-like-icon"
            aria-hidden="true"
          >
            ♥
          </span>
          <span id="likeText">
            {isLiked ? "좋아요 취소" : "좋아요"}
          </span>
          <strong id="likeCount">
            {formatCount(meta.likes)}
          </strong>
        </button>
      </footer>
    </article>
  );
}

function CommentItem({
  item,
  postId,
  currentUserNickname,
  isRequestCurrent,
  onReloadComments,
  onPageMessage,
}) {
  const author = item.author || {};
  const comment = item.comment || {};
  const [isEditing, setIsEditing] = (
    useState(false)
  );
  const [editBody, setEditBody] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = (
    useState(false)
  );
  const saveLockRef = useRef(false);
  const deleteLockRef = useRef(false);
  const isOwner = (
    author.nickname === currentUserNickname
  );
  const isDeleted = comment.deleted === true;
  const canModify = isOwner && !isDeleted;

  function handleEdit() {
    setEditBody(comment.commentBody || "");
    setIsEditing(true);
  }

  function handleCancelEdit() {
    setIsEditing(false);
  }

  async function handleSaveComment() {
    if (saveLockRef.current) {
      return;
    }

    const nextCommentBody = editBody.trim();

    if (!nextCommentBody) {
      onPageMessage(
        "댓글 내용을 입력해주세요.",
      );
      return;
    }

    saveLockRef.current = true;
    setIsSaving(true);
    onPageMessage("");

    try {
      await modifyComment({
        postId,
        commentId: comment.commentId,
        commentBody: nextCommentBody,
      });

      if (!isRequestCurrent()) {
        return;
      }

      const didReload = await onReloadComments();

      if (didReload !== false) {
        setIsEditing(false);
      }
    } catch (error) {
      if (isRequestCurrent()) {
        onPageMessage(
          getRequestErrorMessage(error),
        );
      }
    } finally {
      setIsSaving(false);
      saveLockRef.current = false;
    }
  }

  async function handleDeleteComment() {
    if (deleteLockRef.current) {
      return;
    }

    const confirmed = window.confirm(
      "댓글을 삭제하시겠습니까?",
    );

    if (!confirmed) {
      return;
    }

    deleteLockRef.current = true;
    setIsDeleting(true);
    onPageMessage("");

    try {
      await deleteComment({
        postId,
        commentId: comment.commentId,
      });

      if (!isRequestCurrent()) {
        return;
      }

      await onReloadComments();
    } catch (error) {
      if (isRequestCurrent()) {
        onPageMessage(
          getRequestErrorMessage(error),
        );
      }
    } finally {
      setIsDeleting(false);
      deleteLockRef.current = false;
    }
  }

  return (
    <article
      className={
        `comment-item${
          isDeleted ? " is-deleted" : ""
        }`
      }
      data-comment-id={comment.commentId ?? ""}
    >
      <header className="comment-header">
        <div className="comment-author">
          <ProfileImage
            author={author}
            size={28}
          />

          <div>
            <strong>
              {author.nickname || "알 수 없음"}
            </strong>
            <small>
              {formatDateTime(comment.createdAt)}
            </small>
          </div>
        </div>

        {canModify && !isEditing ? (
          <div className="comment-actions">
            <button
              className="comment-edit-button"
              type="button"
              disabled={isDeleting}
              onClick={handleEdit}
            >
              수정
            </button>
            <button
              className="comment-delete-button"
              type="button"
              disabled={isDeleting}
              onClick={handleDeleteComment}
            >
              삭제
            </button>
          </div>
        ) : null}
      </header>

      {isEditing && !isDeleted ? (
        <div className="comment-edit-form">
          <textarea
            className="comment-edit-input"
            value={editBody}
            disabled={isSaving}
            onChange={(event) => {
              setEditBody(event.target.value);
            }}
          />

          <div className="comment-actions">
            <button
              className="comment-save-button"
              type="button"
              disabled={isSaving}
              onClick={handleSaveComment}
            >
              저장
            </button>
            <button
              className="comment-cancel-button"
              type="button"
              disabled={isSaving}
              onClick={handleCancelEdit}
            >
              취소
            </button>
          </div>
        </div>
      ) : (
        <p className="comment-body">
          <MultilineText
            value={comment.commentBody}
          />
        </p>
      )}
    </article>
  );
}

function CommentSection({
  comments,
  commentCount,
  currentUserNickname,
  postId,
  pageMessage,
  onIncreaseCommentCount,
  isRequestCurrent,
  onPageMessage,
  onReloadComments,
}) {
  const [commentBody, setCommentBody] = (
    useState("")
  );
  const {
    formRef,
    register,
    handleSubmit,
    errors,
    isSubmitting,
  } = useForm({
    defaultValues: {
      commentBody: "",
    },
  });

  function handleCommentBodyChange(event) {
    setCommentBody(event.target.value);
  }

  function handleInvalidCommentSubmit(
    nextErrors,
  ) {
    if (nextErrors.commentBody) {
      formRef.current?.elements
        .namedItem("commentBody")
        ?.focus();
    }
  }

  async function submitComment(rawValues) {
    onPageMessage("");

    try {
      await postComment({
        postId,
        commentBody: rawValues.commentBody.trim(),
      });

      if (!isRequestCurrent()) {
        return;
      }

      setCommentBody("");
      const didReload = await onReloadComments();

      if (didReload !== false) {
        onIncreaseCommentCount();
      }
    } catch (error) {
      if (isRequestCurrent()) {
        onPageMessage(
          getRequestErrorMessage(error),
        );
      }
    }
  }

  const commentBodyField = register(
    "commentBody",
    commentBodyRules,
    {
      controlled: true,
      shouldValidate: false,
      onChange: handleCommentBodyChange,
    },
  );
  const message = (
    errors.commentBody || pageMessage
  );

  return (
    <>
      <section
        id="commentWriteSection"
        className="post-comment-write"
      >
        <h2>댓글 작성</h2>

        <form
          id="commentForm"
          ref={formRef}
          className="post-comment-form"
          noValidate
          onSubmit={handleSubmit(
            submitComment,
            handleInvalidCommentSubmit,
          )}
        >
          <textarea
            id="commentBody"
            {...commentBodyField}
            value={commentBody}
            placeholder="댓글을 남겨주세요"
            required
          />

          <button
            type="submit"
            disabled={
              !commentBody.trim() ||
              isSubmitting
            }
          >
            댓글 등록
          </button>
        </form>
      </section>

      <section
        id="commentSection"
        className="post-comment-section"
      >
        <div className="comment-section-title">
          <h2>
            댓글
            <span
              id="commentCount"
              className="comment-count-badge"
            >
              [{formatCount(commentCount)}]
            </span>
          </h2>
        </div>

        <div id="commentList">
          {comments === null ? null : (
            comments.length > 0 ? (
              comments.map((item, index) => (
                <CommentItem
                  key={
                    item.comment?.commentId ??
                    index
                  }
                  item={item}
                  postId={postId}
                  currentUserNickname={
                    currentUserNickname
                  }
                  isRequestCurrent={
                    isRequestCurrent
                  }
                  onReloadComments={
                    onReloadComments
                  }
                  onPageMessage={onPageMessage}
                />
              ))
            ) : (
              <p className="comment-empty">
                댓글이 없습니다.
              </p>
            )
          )}
        </div>
      </section>

      <p
        id="message"
        className={
          message ? "message error" : "message"
        }
      >
        {message}
      </p>
    </>
  );
}

function ReportModal({
  isOpen,
  postId,
  isRequestCurrent,
  onOpenChange,
}) {
  const {
    formRef,
    register,
    handleSubmit,
    errors,
    formError,
    isSubmitting,
    clearErrors,
    setFormError,
    reset,
  } = useForm({
    defaultValues: {
      reason: "",
      description: "",
    },
  });

  function closeReportModal() {
    reset();
    onOpenChange(false);
  }

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    clearErrors();
    setFormError("");
    formRef.current?.elements
      .namedItem("reason")
      ?.focus();

    function handleEscape(event) {
      if (event.key === "Escape") {
        reset();
        onOpenChange(false);
      }
    }

    document.addEventListener(
      "keydown",
      handleEscape,
    );

    return () => {
      document.removeEventListener(
        "keydown",
        handleEscape,
      );
    };
  }, [
    clearErrors,
    formRef,
    isOpen,
    onOpenChange,
    reset,
    setFormError,
  ]);

  function handleInvalidReportSubmit(
    nextErrors,
  ) {
    if (nextErrors.reason) {
      formRef.current?.elements
        .namedItem("reason")
        ?.focus();
    }
  }

  async function submitReport(rawValues) {
    try {
      const result = await reportPost({
        postId,
        reason: rawValues.reason,
        description: (
          rawValues.description.trim()
        ),
      });

      if (!isRequestCurrent()) {
        return;
      }

      closeReportModal();
      window.alert(
        result?.message ||
        "신고가 접수되었습니다.",
      );
    } catch (error) {
      if (!isRequestCurrent()) {
        return;
      }

      const errorMessage = getRequestErrorMessage(
        error,
        "신고 처리 중 문제가 발생했습니다.",
      );

      if (
        error?.status === 409 ||
        errorMessage === "already_reported" ||
        errorMessage.includes("409")
      ) {
        setFormError(
          "이미 신고한 게시글입니다.",
        );
        return;
      }

      setFormError(errorMessage);
    }
  }

  if (!isOpen) {
    return null;
  }

  const reportMessage = (
    errors.reason || formError
  );

  return (
    <div
      id="reportModal"
      className="modal-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          closeReportModal();
        }
      }}
    >
      <section
        className="report-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reportModalTitle"
      >
        <h2 id="reportModalTitle">
          게시글 신고
        </h2>
        <p className="report-modal-description">
          신고 사유를 선택하고 필요한 경우 상세
          내용을 입력해주세요.
        </p>

        <form
          id="reportForm"
          ref={formRef}
          className="post-report-form"
          noValidate
          onSubmit={handleSubmit(
            submitReport,
            handleInvalidReportSubmit,
          )}
        >
          <div>
            <label htmlFor="reportReason">
              신고 사유
            </label>
            <select
              id="reportReason"
              {...register(
                "reason",
                reportReasonRules,
              )}
              required
            >
              <option value="">
                신고 사유 선택
              </option>
              {Object.values(ReportReason).map(
                (reason) => (
                  <option
                    key={reason}
                    value={reason}
                  >
                    {ReportReasonLabel[reason]}
                  </option>
                ),
              )}
            </select>
          </div>

          <div>
            <label htmlFor="reportDescription">
              상세 사유
            </label>
            <textarea
              id="reportDescription"
              {...register("description")}
              placeholder="상세 사유를 입력하세요"
            />
          </div>

          <p
            id="reportMessage"
            className={
              reportMessage
                ? "message error"
                : "message"
            }
            aria-live="polite"
          >
            {reportMessage}
          </p>

          <div className="report-actions">
            <button
              type="submit"
              disabled={isSubmitting}
            >
              신고 제출
            </button>
            <button
              id="reportCancelButton"
              className="secondary-button"
              type="button"
              onClick={closeReportModal}
            >
              취소
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

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
  const [isLikePending, setIsLikePending] = (
    useState(false)
  );
  const [isDeletingPost, setIsDeletingPost] = (
    useState(false)
  );
  const [
    isReportModalOpen,
    setIsReportModalOpen,
  ] = useState(false);
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
