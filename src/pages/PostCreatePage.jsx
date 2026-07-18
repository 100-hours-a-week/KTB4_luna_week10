import {
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Link,
  useNavigate,
} from "react-router-dom";

import Header from "../components/Header.jsx";
import { useForm } from "../hooks/useForm.js";
import {
  deleteDraft,
  getCurrentDraft,
  publishDraft,
  saveDraft,
  updateDraft,
} from "../services/draftApi.js";
import { postUpload } from "../services/postApi.js";
import { requireLogin } from "../utils/auth.js";
import { formatDateTime } from "../utils/format.js";

const INITIAL_DRAFT_MESSAGE = {
  text: "작성 중인 글을 임시저장할 수 있습니다.",
  type: "",
};

const titleRules = {
  required: {
    message: "제목을 입력해주세요.",
  },
  validate: (value) => (
    String(value ?? "").trim().length <= 26 ||
    "제목은 최대 26자입니다."
  ),
};

const postBodyRules = {
  required: {
    message: "내용을 입력해주세요.",
  },
};

function isObject(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function getRequestErrorMessage(error) {
  return typeof error?.message === "string"
    ? error.message
    : "요청을 처리하지 못했습니다.";
}

export default function PostCreatePage() {
  const navigate = useNavigate();
  const [draft, setDraft] = useState(null);
  const [isDraftLoaded, setIsDraftLoaded] = (
    useState(false)
  );
  const [isDraftLoadModalOpen, setIsDraftLoadModalOpen] = (
    useState(false)
  );
  const [draftMessage, setDraftMessage] = (
    useState(INITIAL_DRAFT_MESSAGE)
  );
  const [isDeletingDraft, setIsDeletingDraft] = (
    useState(false)
  );
  const loadDraftButtonRef = useRef(null);
  const operationLockRef = useRef(false);
  const draftRequestRef = useRef(undefined);
  const {
    formRef,
    register,
    handleSubmit,
    errors,
    formError,
    isSubmitting,
    setError,
    clearErrors,
    setFormError,
    setValue,
    reset,
  } = useForm({
    defaultValues: {
      title: "",
      postBody: "",
      postImageUrl: "",
    },
  });

  const hasDraft = draft !== null;
  const isWorking = (
    isSubmitting || isDeletingDraft
  );
  const draftUpdatedAt = (
    formatDateTime(draft?.updatedAt) || "최근"
  );

  useEffect(() => {
    document.title = "게시글 작성";

    let request = draftRequestRef.current;

    if (request === undefined) {
      const accessToken = requireLogin(navigate);

      if (!accessToken) {
        draftRequestRef.current = null;
        return undefined;
      }

      request = getCurrentDraft();
      draftRequestRef.current = request;
    }

    if (request === null) {
      return undefined;
    }

    let isActive = true;

    async function loadCurrentDraft() {
      try {
        const result = await request;

        if (!isActive || !isObject(result?.data)) {
          return;
        }

        const currentDraft = result.data;

        setDraft(currentDraft);
        setIsDraftLoaded(false);

        setDraftMessage({
          text: "임시저장 글이 있습니다.",
          type: "success",
        });
        setIsDraftLoadModalOpen(true);
      } catch (error) {
        if (isActive) {
          setDraftMessage({
            text: getRequestErrorMessage(error),
            type: "error",
          });
        }
      }
    }

    loadCurrentDraft();

    return () => {
      isActive = false;
    };
  }, [navigate]);

  useEffect(() => {
    if (isDraftLoadModalOpen) {
      loadDraftButtonRef.current?.focus();
    }
  }, [isDraftLoadModalOpen]);

  function handleInvalidSubmit(nextErrors) {
    const firstErrorName = [
      "title",
      "postBody",
    ].find((name) => nextErrors[name]);

    if (!firstErrorName) {
      return;
    }

    const field = formRef.current?.elements.namedItem(
      firstErrorName,
    );

    if (typeof field?.focus === "function") {
      field.focus();
    }
  }

  function handleLoadDraft() {
    if (!draft) {
      return;
    }

    setValue("title", draft.title || "");
    setValue("postBody", draft.postBody || "");
    setValue(
      "postImageUrl",
      draft.postImageUrl || "",
    );
    setIsDraftLoaded(true);
    clearErrors(["title", "postBody"]);
    setFormError("");
    setIsDraftLoadModalOpen(false);
    setDraftMessage({
      text: "임시저장된 글을 불러왔습니다.",
      type: "success",
    });
  }

  function handleCancelDraftLoad() {
    setIsDraftLoaded(false);
    setIsDraftLoadModalOpen(false);
    setDraftMessage({
      text: (
        "임시저장 글을 불러오지 않았습니다. " +
        "임시저장을 누르면 현재 내용으로 덮어씁니다."
      ),
      type: "",
    });
  }

  async function saveOrUpdateDraft(rawValues) {
    const draftValues = {
      title: rawValues.title.trim(),
      postBody: rawValues.postBody,
      postImageUrl:
        rawValues.postImageUrl.trim() || null,
      version: draft?.version ?? 0,
    };

    if (
      operationLockRef.current ||
      isDeletingDraft
    ) {
      return;
    }

    operationLockRef.current = true;

    try {
      const result = draft === null
        ? await saveDraft(draftValues)
        : await updateDraft(draftValues);

      if (!isObject(result?.data)) {
        setDraftMessage({
          text: "API 응답을 처리하지 못했습니다.",
          type: "error",
        });
        return;
      }

      const savedDraft = result.data;

      setDraft(savedDraft);
      setIsDraftLoaded(true);
      setIsDraftLoadModalOpen(false);
      clearErrors(["title", "postBody"]);
      setDraftMessage({
        text: (
          `임시저장되었습니다. (` +
          `${formatDateTime(savedDraft.updatedAt) || "최근"})`
        ),
        type: "success",
      });
    } catch (error) {
      let hasFieldError = false;

      if (
        typeof error?.data?.title === "string" &&
        error.data.title
      ) {
        setError("title", error.data.title);
        hasFieldError = true;
      }

      if (
        typeof error?.data?.postBody === "string" &&
        error.data.postBody
      ) {
        setError("postBody", error.data.postBody);
        hasFieldError = true;
      }

      if (!hasFieldError) {
        setDraftMessage({
          text: getRequestErrorMessage(error),
          type: "error",
        });
      }
    } finally {
      operationLockRef.current = false;
    }
  }

  async function handleDeleteDraft() {
    if (!draft) {
      return;
    }

    if (
      !window.confirm(
        "임시저장 글을 삭제하시겠습니까?",
      )
    ) {
      return;
    }

    if (
      operationLockRef.current ||
      isSubmitting ||
      isDeletingDraft
    ) {
      return;
    }

    const shouldClearForm = isDraftLoaded;

    operationLockRef.current = true;
    setIsDeletingDraft(true);

    try {
      await deleteDraft();

      setDraft(null);
      setIsDraftLoaded(false);
      setIsDraftLoadModalOpen(false);
      clearErrors(["title", "postBody"]);
      setFormError("");

      if (shouldClearForm) {
        reset();
      }

      setDraftMessage({
        text: "임시저장 글이 삭제되었습니다.",
        type: "success",
      });
    } catch (error) {
      setDraftMessage({
        text: getRequestErrorMessage(error),
        type: "error",
      });
    } finally {
      operationLockRef.current = false;
      setIsDeletingDraft(false);
    }
  }

  async function submitPost(rawValues) {
    const postValues = {
      title: rawValues.title.trim(),
      postBody: rawValues.postBody,
      postImageUrl:
        rawValues.postImageUrl.trim() || null,
    };

    if (
      operationLockRef.current ||
      isDeletingDraft
    ) {
      return;
    }

    operationLockRef.current = true;

    try {
      let result;

      if (draft !== null && isDraftLoaded) {
        result = await publishDraft({
          title: postValues.title,
          postBody: postValues.postBody,
          postImageUrl: postValues.postImageUrl,
          version: draft.version,
        });
      } else {
        result = await postUpload(postValues);
      }

      if (!isObject(result?.data)) {
        setFormError(
          "API 응답을 처리하지 못했습니다.",
        );
        return;
      }

      navigate("/posts");
    } catch (error) {
      let hasFieldError = false;

      if (
        typeof error?.data?.title === "string" &&
        error.data.title
      ) {
        setError("title", error.data.title);
        hasFieldError = true;
      }

      if (
        typeof error?.data?.postBody === "string" &&
        error.data.postBody
      ) {
        setError("postBody", error.data.postBody);
        hasFieldError = true;
      }

      if (!hasFieldError) {
        setFormError(
          getRequestErrorMessage(error),
        );
      }
    } finally {
      operationLockRef.current = false;
    }
  }

  return (
    <>
      <Header />

      <main className="post-create-page">
        <section className="post-create-panel">
          <div className="post-create-title">
            <h1>게시글 작성</h1>
            <p>
              제목과 내용을 입력한 뒤 게시하거나,
              나중에 이어서 작성할 수 있도록
              임시저장할 수 있습니다.
            </p>
          </div>

          <form
            ref={formRef}
            id="uploadForm"
            className="post-create-layout"
            noValidate
            onSubmit={handleSubmit(
              submitPost,
              handleInvalidSubmit,
            )}
          >
            <div className="post-editor-fields">
              <div className="post-field">
                <label htmlFor="title">
                  제목
                </label>
                <input
                  id="title"
                  type="text"
                  placeholder="제목을 입력해주세요."
                  maxLength={26}
                  {...register("title", titleRules)}
                />
                <p
                  id="titleHelper"
                  className={errors.title
                    ? "helper-text error"
                    : "helper-text"}
                >
                  {errors.title || ""}
                </p>
              </div>

              <div className="post-field">
                <label htmlFor="postBody">
                  내용
                </label>
                <textarea
                  id="postBody"
                  className="post-body-input"
                  placeholder="내용을 입력해주세요."
                  {...register(
                    "postBody",
                    postBodyRules,
                  )}
                />
                <p
                  id="postBodyHelper"
                  className={errors.postBody
                    ? "helper-text error"
                    : "helper-text"}
                >
                  {errors.postBody || ""}
                </p>
              </div>

              <div className="post-field">
                <label htmlFor="postImageUrl">
                  이미지 URL
                </label>
                <input
                  id="postImageUrl"
                  type="text"
                  placeholder="선택 사항입니다."
                  {...register("postImageUrl")}
                />
                <p className="helper-text">
                  이미지가 필요 없다면 비워두면 됩니다.
                </p>
              </div>

              <p
                id="uploadMessage"
                className={formError
                  ? "message error"
                  : "message"}
              >
                {formError}
              </p>
            </div>

            <aside className="post-create-side-panel">
              <h2>작성 상태</h2>
              <p
                id="draftMessage"
                className={draftMessage.type
                  ? `message ${draftMessage.type}`
                  : "message"}
              >
                {draftMessage.text}
              </p>

              <div className="post-create-actions">
                <button
                  id="saveDraftButton"
                  type="button"
                  disabled={isWorking}
                  onClick={handleSubmit(
                    saveOrUpdateDraft,
                    handleInvalidSubmit,
                  )}
                >
                  임시저장
                </button>

                <button
                  id="deleteDraftButton"
                  type="button"
                  hidden={!hasDraft}
                  disabled={isWorking}
                  onClick={handleDeleteDraft}
                >
                  임시저장 삭제
                </button>

                <button
                  type="submit"
                  disabled={isWorking}
                >
                  게시하기
                </button>

                <Link
                  className="secondary-link"
                  to="/posts"
                >
                  목록으로 돌아가기
                </Link>
              </div>
            </aside>
          </form>
        </section>
      </main>

      <div
        id="draftLoadModal"
        className="modal-backdrop"
        hidden={!isDraftLoadModalOpen}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            handleCancelDraftLoad();
          }
        }}
      >
        <section
          className="draft-load-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="draftLoadTitle"
        >
          <h2 id="draftLoadTitle">
            임시저장 글 발견
          </h2>
          <p>
            <strong id="draftUpdatedAtText">
              {draftUpdatedAt}
            </strong>
            에 작성한 임시저장 글이 있습니다.
            불러오겠습니까?
          </p>

          <div className="modal-actions">
            <button
              ref={loadDraftButtonRef}
              id="loadDraftButton"
              type="button"
              onClick={handleLoadDraft}
            >
              불러오기
            </button>
            <button
              id="cancelDraftLoadButton"
              className="secondary-button"
              type="button"
              onClick={handleCancelDraftLoad}
            >
              취소
            </button>
          </div>
        </section>
      </div>
    </>
  );
}
