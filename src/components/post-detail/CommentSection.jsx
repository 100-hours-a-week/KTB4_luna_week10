import { useState } from "react";

import { useForm } from "../../hooks/useForm.js";
import { postComment } from "../../services/commentApi.js";
import { formatCount } from "../../utils/format.js";
import CommentItem from "./CommentItem.jsx";
import { getRequestErrorMessage } from "./postDetailUtils.js";

const commentBodyRules = {
  required: {
    message: "댓글 내용을 입력해주세요.",
  },
};

export default function CommentSection({
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
  const [commentBody, setCommentBody] = useState("");
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
