import {
  useEffect,
  useState,
} from "react";
import {
  Link,
  useNavigate,
} from "react-router-dom";

import defaultProfileImage from "../assets/default-profile.png";
import { useForm } from "../hooks/useForm.js";
import { signup } from "../services/userApi.js";
import { redirectIfLoggedIn } from "../utils/auth.js";
import {
  validateEmail,
  validateNickname,
  validatePassword,
  validatePasswordConfirm,
} from "../utils/validation.js";

const FOCUS_ORDER = [
  "email",
  "password",
  "passwordConfirm",
  "nickname",
  "profileImageUrl",
];

const emailRules = {
  validate: (value) => validateEmail(value.trim()),
};

const passwordRules = {
  validate: (value) => validatePassword(value),
};

const passwordConfirmRules = {
  validate: (value, allRawValues) => (
    validatePasswordConfirm(
      allRawValues.password,
      value,
    )
  ),
};

const nicknameRules = {
  validate: (value) => (
    validateNickname(value.trim())
  ),
};

function getErrorMessage(validationResult) {
  return validationResult === true
    ? null
    : validationResult;
}

export default function SignupPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [
    passwordConfirm,
    setPasswordConfirm,
  ] = useState("");
  const [
    profileImageUrl,
    setProfileImageUrl,
  ] = useState("");
  const [
    previewImageUrl,
    setPreviewImageUrl,
  ] = useState(defaultProfileImage);
  const [
    isPasswordVisible,
    setIsPasswordVisible,
  ] = useState(false);
  const [
    isPasswordConfirmVisible,
    setIsPasswordConfirmVisible,
  ] = useState(false);
  const [
    isSuccessDialogOpen,
    setIsSuccessDialogOpen,
  ] = useState(false);
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

  useEffect(() => {
    document.title = "회원가입";
    redirectIfLoggedIn(navigate);
  }, [navigate]);

  useEffect(() => {
    const nextImageUrl = profileImageUrl.trim();

    if (!nextImageUrl) {
      setPreviewImageUrl(defaultProfileImage);
      return undefined;
    }

    const timerId = setTimeout(() => {
      setPreviewImageUrl(nextImageUrl);
    }, 500);

    return () => {
      clearTimeout(timerId);
    };
  }, [profileImageUrl]);

  function handlePasswordChange(event) {
    const nextPassword = event.target.value;

    setPassword(nextPassword);
    setError(
      "passwordConfirm",
      passwordConfirm
        ? getErrorMessage(
          validatePasswordConfirm(
            nextPassword,
            passwordConfirm,
          ),
        )
        : null,
    );
  }

  function handlePasswordConfirmChange(event) {
    setPasswordConfirm(event.target.value);
  }

  function handleProfileImageUrlChange(event) {
    setProfileImageUrl(event.target.value);
  }

  function handleInvalidSubmit(nextErrors) {
    const firstErrorName = FOCUS_ORDER.find(
      (name) => nextErrors[name],
    );
    const firstErrorField = firstErrorName
      ? formRef.current?.elements.namedItem(
        firstErrorName,
      )
      : null;

    firstErrorField?.focus();
  }

  async function submitSignup(rawValues) {
    if (isSuccessDialogOpen) {
      return;
    }

    try {
      await signup({
        email: rawValues.email.trim(),
        password: rawValues.password,
        passwordConfirm: rawValues.passwordConfirm,
        nickname: rawValues.nickname.trim(),
        profileImageUrl: (
          rawValues.profileImageUrl.trim() || null
        ),
      });

      setIsSuccessDialogOpen(true);
    } catch (error) {
      if (error.status === 409) {
        const duplicateMessage = (
          "이메일 또는 닉네임 중 중복되는 값이 있습니다."
        );

        setError("email", duplicateMessage);
        setError("nickname", duplicateMessage);
        return;
      }

      setFormError(error.message);
    }
  }

  const passwordRuleState = {
    length: (
      password.length >= 8 &&
      password.length <= 20
    ),
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*]/.test(password),
    confirm: (
      Boolean(passwordConfirm) &&
      password === passwordConfirm
    ),
  };

  return (
    <>
      <main className="auth-page auth-page-wide">
        <section className="auth-panel">
          <div className="auth-title">
            <h1>회원가입</h1>
            <p>
              커뮤니티에서 사용할 계정 정보를
              입력해주세요.
            </p>
          </div>

          <form
            id="signupForm"
            ref={formRef}
            className="auth-signup-layout"
            noValidate
            onSubmit={handleSubmit(
              submitSignup,
              handleInvalidSubmit,
            )}
          >
            <div className="auth-form-fields">
              <div className="auth-field">
                <label htmlFor="signupEmail">
                  이메일
                </label>
                <input
                  id="signupEmail"
                  type="email"
                  autoComplete="email"
                  {...register("email", emailRules)}
                />
                <p
                  id="emailHelper"
                  className={errors.email
                    ? "helper-text error"
                    : "helper-text"}
                >
                  {errors.email || ""}
                </p>
              </div>

              <div className="auth-field">
                <label htmlFor="signupPassword">
                  비밀번호
                </label>
                <div className="password-input-row">
                  <input
                    id="signupPassword"
                    type={isPasswordVisible
                      ? "text"
                      : "password"}
                    autoComplete="new-password"
                    {...register(
                      "password",
                      passwordRules,
                      {
                        controlled: true,
                        shouldValidate: true,
                        onChange: handlePasswordChange,
                      },
                    )}
                    value={password}
                  />
                  <button
                    type="button"
                    className="password-toggle-button"
                    data-toggle-password="signupPassword"
                    onClick={() => {
                      setIsPasswordVisible(
                        (isVisible) => !isVisible,
                      );
                    }}
                  >
                    {isPasswordVisible
                      ? "숨기기"
                      : "보기"}
                  </button>
                </div>
                <p
                  id="passwordHelper"
                  className={errors.password
                    ? "helper-text error"
                    : "helper-text"}
                >
                  {errors.password || ""}
                </p>
              </div>

              <div className="auth-field">
                <label
                  htmlFor="signupPasswordConfirm"
                >
                  비밀번호 확인
                </label>
                <div className="password-input-row">
                  <input
                    id="signupPasswordConfirm"
                    type={isPasswordConfirmVisible
                      ? "text"
                      : "password"}
                    autoComplete="new-password"
                    {...register(
                      "passwordConfirm",
                      passwordConfirmRules,
                      {
                        controlled: true,
                        shouldValidate: true,
                        onChange: (
                          handlePasswordConfirmChange
                        ),
                      },
                    )}
                    value={passwordConfirm}
                  />
                  <button
                    type="button"
                    className="password-toggle-button"
                    data-toggle-password={(
                      "signupPasswordConfirm"
                    )}
                    onClick={() => {
                      setIsPasswordConfirmVisible(
                        (isVisible) => !isVisible,
                      );
                    }}
                  >
                    {isPasswordConfirmVisible
                      ? "숨기기"
                      : "보기"}
                  </button>
                </div>
                <p
                  id="passwordConfirmHelper"
                  className={errors.passwordConfirm
                    ? "helper-text error"
                    : "helper-text"}
                >
                  {errors.passwordConfirm || ""}
                </p>
              </div>

              <div className="auth-field">
                <label htmlFor="signupNickname">
                  닉네임
                </label>
                <input
                  id="signupNickname"
                  type="text"
                  maxLength={10}
                  {...register(
                    "nickname",
                    nicknameRules,
                  )}
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

              <div className="auth-field">
                <label
                  htmlFor="signupProfileImageUrl"
                >
                  프로필 이미지 URL
                </label>
                <input
                  id="signupProfileImageUrl"
                  type="text"
                  {...register(
                    "profileImageUrl",
                    {},
                    {
                      controlled: true,
                      shouldValidate: false,
                      onChange: (
                        handleProfileImageUrlChange
                      ),
                    },
                  )}
                  value={profileImageUrl}
                />
                <p className="helper-text">
                  선택 사항입니다. 비워두면 기본
                  이미지가 사용됩니다.
                </p>
              </div>

              <button
                type="submit"
                disabled={(
                  isSubmitting ||
                  isSuccessDialogOpen
                )}
              >
                회원가입
              </button>

              <p
                id="signupMessage"
                className={formError
                  ? "message error"
                  : "message"}
              >
                {formError || ""}
              </p>

              <p className="auth-switch">
                이미 계정이 있나요?{" "}
                <Link to="/login">로그인</Link>
              </p>
            </div>

            <aside className="signup-side-panel">
              <h2>프로필 미리보기</h2>

              <div className="auth-profile-preview">
                <img
                  id="signupProfilePreviewImage"
                  src={previewImageUrl}
                  alt="프로필 이미지 미리보기"
                  onError={() => {
                    if (
                      previewImageUrl !==
                      defaultProfileImage
                    ) {
                      setPreviewImageUrl(
                        defaultProfileImage,
                      );
                    }
                  }}
                />
              </div>

              <h2>비밀번호 조건</h2>

              <ul className="password-rule-list">
                <li
                  id="signupPasswordLengthRule"
                  className={passwordRuleState.length
                    ? "is-valid"
                    : ""}
                >
                  8자 이상 20자 이하
                </li>
                <li
                  id="signupPasswordUpperRule"
                  className={passwordRuleState.upper
                    ? "is-valid"
                    : ""}
                >
                  대문자 1개 이상 포함
                </li>
                <li
                  id="signupPasswordLowerRule"
                  className={passwordRuleState.lower
                    ? "is-valid"
                    : ""}
                >
                  소문자 1개 이상 포함
                </li>
                <li
                  id="signupPasswordNumberRule"
                  className={passwordRuleState.number
                    ? "is-valid"
                    : ""}
                >
                  숫자 1개 이상 포함
                </li>
                <li
                  id="signupPasswordSpecialRule"
                  className={passwordRuleState.special
                    ? "is-valid"
                    : ""}
                >
                  특수문자 1개 이상 포함
                </li>
                <li
                  id="signupPasswordConfirmRule"
                  className={passwordRuleState.confirm
                    ? "is-valid"
                    : ""}
                >
                  비밀번호 확인 일치
                </li>
              </ul>
            </aside>
          </form>
        </section>
      </main>

      {isSuccessDialogOpen && (
        <div className="modal-backdrop">
          <section
            className="draft-load-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="signupSuccessTitle"
          >
            <h2 id="signupSuccessTitle">
              회원가입 완료
            </h2>
            <p>회원가입이 완료되었습니다.</p>
            <div className="modal-actions">
              <button
                type="button"
                onClick={() => {
                  setIsSuccessDialogOpen(false);
                  navigate("/login");
                }}
              >
                확인
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
