import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import defaultProfileImage from "../assets/default-profile.png";
import Header from "../components/Header.jsx";
import { useForm } from "../hooks/useForm.js";
import { modifyInfo, withdrawn } from "../services/userApi.js";
import { clearLoginUser, getLoginUser, requireLogin } from "../utils/auth.js";
import { validateNickname } from "../utils/validation.js";

const PROFILE_PREVIEW_DELAY = 500;
const SUCCESS_TOAST_DURATION = 1200;

const nicknameRules = {
  validate: (value) => (
    validateNickname(value.trim())
  ),
};

function normalizeStoredProfileImageUrl(value) {
  if (value === null || value === undefined) {
    return "";
  }

  const normalizedValue = String(value).trim();

  if (
    !normalizedValue ||
    normalizedValue === "null" ||
    normalizedValue === "undefined"
  ) {
    return "";
  }

  return normalizedValue;
}

function hasOwn(object, property) {
  return Object.prototype.hasOwnProperty.call(
    object,
    property,
  );
}

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

export default function InfoModifyPage() {
  const navigate = useNavigate();
  const initialUserRef = useRef(null);

  if (initialUserRef.current === null) {
    const loginUser = getLoginUser();

    initialUserRef.current = {
      userId: loginUser.userId,
      nickname: loginUser.nickname ?? "",
      profileImageUrl:
        normalizeStoredProfileImageUrl(
          loginUser.profileImageUrl,
        ),
    };
  }

  const initialUser = initialUserRef.current;
  const [nickname, setNickname] = useState(initialUser.nickname);
  const [profileImageUrl, setProfileImageUrl] = useState(initialUser.profileImageUrl);
  const [debouncedProfileImageUrl, setDebouncedProfileImageUrl] = useState(initialUser.profileImageUrl);
  const [hasPreviewError, setHasPreviewError] = useState(false);
  const [savedValues, setSavedValues] = useState({
    nickname: initialUser.nickname.trim(),
    profileImageUrl:
      initialUser.profileImageUrl.trim() || null,
  });
  const [isSuccessToastOpen, setIsSuccessToastOpen] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const authCheckedRef = useRef(false);
  const modifyRequestLockRef = useRef(false);
  const withdrawRequestLockRef = useRef(false);
  const profilePreviewTimerRef = useRef(null);
  const successToastTimerRef = useRef(null);
  const {
    formRef,
    register,
    handleSubmit,
    errors,
    formError,
    isSubmitting,
    setError,
    setFormError,
  } = useForm();

  const currentValues = {
    nickname: nickname.trim(),
    profileImageUrl:
      profileImageUrl.trim() || null,
  };
  const hasChanges = (
    currentValues.nickname !==
      savedValues.nickname ||
    currentValues.profileImageUrl !==
      savedValues.profileImageUrl
  );
  const previewImageUrl = (
    !debouncedProfileImageUrl ||
    hasPreviewError
  )
    ? defaultProfileImage
    : debouncedProfileImageUrl;

  useEffect(() => {
    document.title = "회원정보 수정";

    if (authCheckedRef.current) {
      return;
    }

    authCheckedRef.current = true;

    if (!requireLogin(navigate)) {
      return;
    }
  }, [navigate]);

  useEffect(() => () => {
    if (profilePreviewTimerRef.current) {
      clearTimeout(profilePreviewTimerRef.current);
    }

    if (successToastTimerRef.current) {
      clearTimeout(successToastTimerRef.current);
    }
  }, []);

  function handleNicknameChange(event) {
    const nextNickname = event.target.value;

    setNickname(nextNickname);

    if (!nextNickname.trim()) {
      setError("nickname", null);
    }
  }

  function handleProfileImageUrlChange(event) {
    const nextProfileImageUrl = event.target.value;
    const nextPreviewImageUrl = (
      nextProfileImageUrl.trim()
    );

    setProfileImageUrl(nextProfileImageUrl);

    if (profilePreviewTimerRef.current) {
      clearTimeout(profilePreviewTimerRef.current);
      profilePreviewTimerRef.current = null;
    }

    if (!nextPreviewImageUrl) {
      setDebouncedProfileImageUrl("");
      setHasPreviewError(false);
      return;
    }

    profilePreviewTimerRef.current = setTimeout(
      () => {
        setDebouncedProfileImageUrl(
          nextPreviewImageUrl,
        );
        setHasPreviewError(false);
        profilePreviewTimerRef.current = null;
      },
      PROFILE_PREVIEW_DELAY,
    );
  }

  function handleClearProfileImage() {
    if (profilePreviewTimerRef.current) {
      clearTimeout(profilePreviewTimerRef.current);
      profilePreviewTimerRef.current = null;
    }

    setProfileImageUrl("");
    setDebouncedProfileImageUrl("");
    setHasPreviewError(false);
  }

  function openSuccessToast() {
    if (successToastTimerRef.current) {
      clearTimeout(successToastTimerRef.current);
    }

    setIsSuccessToastOpen(true);
    successToastTimerRef.current = setTimeout(() => {
      setIsSuccessToastOpen(false);
      successToastTimerRef.current = null;
    }, SUCCESS_TOAST_DURATION);
  }

  async function submitModifyInfo(rawValues) {
    const submittedValues = {
      nickname: rawValues.nickname.trim(),
      profileImageUrl:
        rawValues.profileImageUrl.trim() || null,
    };
    const submittedHasChanges = (
      submittedValues.nickname !==
        savedValues.nickname ||
      submittedValues.profileImageUrl !==
        savedValues.profileImageUrl
    );

    if (
      modifyRequestLockRef.current ||
      withdrawRequestLockRef.current ||
      isWithdrawing ||
      !submittedHasChanges
    ) {
      return;
    }

    modifyRequestLockRef.current = true;
    setFormError("");

    try {
      const result = await modifyInfo({
        userId: initialUser.userId,
        nickname: submittedValues.nickname,
        profileImageUrl:
          submittedValues.profileImageUrl,
      });

      if (!isObject(result) || !isObject(result.data)) {
        setFormError(
          "API 응답을 처리하지 못했습니다.",
        );
        return;
      }

      const responseData = result.data;
      const nextNickname = hasOwn(
        responseData,
        "nickname",
      )
        ? String(responseData.nickname ?? "").trim()
        : submittedValues.nickname;
      const responseProfileImageUrl = hasOwn(
        responseData,
        "profileImageUrl",
      )
        ? responseData.profileImageUrl
        : submittedValues.profileImageUrl;
      const nextProfileImageUrl = (
        normalizeStoredProfileImageUrl(
          responseProfileImageUrl,
        )
      );

      localStorage.setItem("nickname", nextNickname);

      if (nextProfileImageUrl) {
        localStorage.setItem(
          "profileImageUrl",
          nextProfileImageUrl,
        );
      } else {
        localStorage.removeItem("profileImageUrl");
      }

      if (profilePreviewTimerRef.current) {
        clearTimeout(profilePreviewTimerRef.current);
        profilePreviewTimerRef.current = null;
      }

      setNickname(nextNickname);
      setProfileImageUrl(nextProfileImageUrl);
      setDebouncedProfileImageUrl(
        nextProfileImageUrl,
      );
      setHasPreviewError(false);
      setSavedValues({
        nickname: nextNickname,
        profileImageUrl:
          nextProfileImageUrl || null,
      });
      openSuccessToast();
    } catch (error) {
      if (
        error.status === 400 &&
        error.message === "invalid_input" &&
        typeof error.data?.nickname === "string"
      ) {
        setError("nickname", error.data.nickname);
        return;
      }

      if (error.status === 409) {
        setError(
          "nickname",
          "중복된 닉네임입니다",
        );
        return;
      }

      setFormError(getRequestErrorMessage(error));
    } finally {
      modifyRequestLockRef.current = false;
    }
  }

  async function handleWithdraw() {
    if (
      withdrawRequestLockRef.current ||
      modifyRequestLockRef.current ||
      isSubmitting ||
      isWithdrawing
    ) {
      return;
    }

    if (!window.confirm("회원탈퇴 하시겠습니까?")) {
      return;
    }

    withdrawRequestLockRef.current = true;
    setIsWithdrawing(true);
    setFormError("");

    try {
      const result = await withdrawn({
        userId: initialUser.userId,
      });

      if (!isObject(result) || !isObject(result.data)) {
        setFormError(
          "API 응답을 처리하지 못했습니다.",
        );
        return;
      }

      clearLoginUser();
      navigate("/login");
    } catch (error) {
      setFormError(getRequestErrorMessage(error));
    } finally {
      withdrawRequestLockRef.current = false;
      setIsWithdrawing(false);
    }
  }

  return (
    <>
      <Header />

      <main className="profile-edit-page">
        <section className="profile-edit-panel">
          <div className="profile-edit-title">
            <h1>회원정보 수정</h1>
            <p>
              게시글과 댓글에 표시되는 닉네임과
              프로필 이미지를 수정할 수 있습니다.
            </p>
          </div>

          <form
            ref={formRef}
            id="modifyInfoForm"
            className="profile-edit-layout"
            noValidate
            onSubmit={handleSubmit(submitModifyInfo)}
          >
            <div className="profile-edit-fields">
              <div className="profile-field">
                <label htmlFor="nickname">
                  닉네임
                </label>
                <input
                  {...register(
                    "nickname",
                    nicknameRules,
                    {
                      controlled: true,
                      shouldValidate: true,
                      onChange:
                        handleNicknameChange,
                    },
                  )}
                  id="nickname"
                  type="text"
                  maxLength={10}
                  value={nickname}
                />
                <p
                  id="nicknameHelper"
                  className={errors.nickname
                    ? "helper-text error"
                    : "helper-text"}
                >
                  {errors.nickname || ""}
                </p>
              </div>

              <div className="profile-field">
                <label htmlFor="profileImageUrl">
                  프로필 이미지 URL
                </label>
                <input
                  {...register(
                    "profileImageUrl",
                    {},
                    {
                      controlled: true,
                      shouldValidate: false,
                      onChange:
                        handleProfileImageUrlChange,
                    },
                  )}
                  id="profileImageUrl"
                  type="text"
                  value={profileImageUrl}
                />
                <p className="helper-text">
                  이미지 주소 입력 시 잠시 후 오른쪽
                  미리보기에 반영됩니다.
                </p>
              </div>

              <div className="profile-actions">
                <button
                  type="submit"
                  disabled={
                    !hasChanges ||
                    isSubmitting ||
                    isWithdrawing
                  }
                >
                  수정하기
                </button>

                <button
                  id="withdrawButton"
                  type="button"
                  disabled={
                    isSubmitting ||
                    isWithdrawing
                  }
                  onClick={handleWithdraw}
                >
                  회원 탈퇴
                </button>
              </div>

              <p
                id="message"
                className={formError
                  ? "message error"
                  : "message"}
              >
                {formError || ""}
              </p>
            </div>

            <aside className="profile-preview-area">
              <h2>프로필 사진</h2>

              <div className="profile-preview-frame">
                <img
                  id="profilePreviewImage"
                  src={previewImageUrl}
                  alt="프로필 이미지 미리보기"
                  onError={() => {
                    setHasPreviewError(true);
                  }}
                />
              </div>

              <button
                id="clearProfileImageButton"
                className="secondary-button"
                type="button"
                onClick={handleClearProfileImage}
              >
                기본 이미지로 변경
              </button>
            </aside>
          </form>
        </section>
      </main>

      <div
        id="successPopup"
        hidden={!isSuccessToastOpen}
      >
        수정완료
      </div>
    </>
  );
}
