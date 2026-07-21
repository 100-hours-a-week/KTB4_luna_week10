import { useCallback, useEffect } from "react";

import { ReportReason, ReportReasonLabel } from "../../constants/reportReason.js";
import { useForm } from "../../hooks/useForm.js";
import { reportPost } from "../../services/postApi.js";
import { getRequestErrorMessage } from "./postDetailUtils.js";

const reportReasonRules = {
  required: {
    message: "신고 사유를 선택해주세요.",
  },
};

export default function ReportModal({
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

  const closeReportModal = useCallback(() => {
    reset();
    onOpenChange(false);
  }, [onOpenChange, reset]);

  const closeReportModalByUser = useCallback(() => {
    if (isSubmitting) {
      return;
    }

    closeReportModal();
  }, [
    closeReportModal,
    isSubmitting,
  ]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    clearErrors();
    setFormError("");
    formRef.current?.elements
      .namedItem("reason")
      ?.focus();
  }, [
    clearErrors,
    formRef,
    isOpen,
    setFormError,
  ]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        closeReportModalByUser();
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
    closeReportModalByUser,
    isOpen,
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
          closeReportModalByUser();
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
              disabled={isSubmitting}
              onClick={closeReportModalByUser}
            >
              취소
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
