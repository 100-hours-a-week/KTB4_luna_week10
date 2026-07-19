import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import Header from "../components/Header.jsx";
import { useForm } from "../hooks/useForm.js";
import { modifyPassword } from "../services/userApi.js";
import { getAccessToken, getLoginUser, requireLogin } from "../utils/auth.js";
import { validatePassword, validatePasswordConfirm } from "../utils/validation.js";

const SUCCESS_TOAST_DURATION = 1200;

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

function getValidationMessage(result) {
  return result === true ? null : result;
}

function isObject(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function hasOwn(object, property) {
  return Object.prototype.hasOwnProperty.call(
    object,
    property,
  );
}

function isSuccessfulResponse(result) {
  return (
    isObject(result) &&
    result.message === "password_modify_success" &&
    hasOwn(result, "data") &&
    result.data === null
  );
}

function getRequestErrorMessage(error) {
  return typeof error?.message === "string"
    ? error.message
    : "요청을 처리하지 못했습니다.";
}

export default function PwModifyPage() {
  const navigate = useNavigate();
  const loginUserRef = useRef(undefined);

  if (loginUserRef.current === undefined) {
    loginUserRef.current = getLoginUser();
  }

  const userId = loginUserRef.current.userId;
  const [password, setPassword] = useState("");
  const [ passwordConfirm, setPasswordConfirm ] = useState("");
  const [ isPasswordVisible, setIsPasswordVisible ] = useState(false);
  const [ isPasswordConfirmVisible, setIsPasswordConfirmVisible ] = useState(false);
  const [ isSuccessToastOpen, setIsSuccessToastOpen ] = useState(false);
  const authCheckedRef = useRef(false);
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
    reset,
  } = useForm();

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

  useEffect(() => {
    document.title = "비밀번호 수정";

    if (authCheckedRef.current) {
      return;
    }

    authCheckedRef.current = true;

    if (!requireLogin(navigate)) {
      return;
    }
  }, [navigate]);

  useEffect(() => () => {
    if (successToastTimerRef.current) {
      clearTimeout(successToastTimerRef.current);
    }
  }, []);

  function handlePasswordChange(event) {
    const nextPassword = event.target.value;

    setPassword(nextPassword);
    setFormError("");

    if (!passwordConfirm) {
      setError("passwordConfirm", null);
      return;
    }

    setError(
      "passwordConfirm",
      getValidationMessage(
        validatePasswordConfirm(
          nextPassword,
          passwordConfirm,
        ),
      ),
    );
  }

  function handlePasswordConfirmChange(event) {
    setPasswordConfirm(event.target.value);
    setFormError("");
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

  async function submitModifyPassword(rawValues) {
    if (!getAccessToken() || !userId) {
      return;
    }

    try {
      const result = await modifyPassword({
        userId,
        password: rawValues.password,
        passwordConfirm: rawValues.passwordConfirm,
      });

      if (!isSuccessfulResponse(result)) {
        setFormError(
          "API 응답을 처리하지 못했습니다.",
        );
        return;
      }

      setPassword("");
      setPasswordConfirm("");
      reset();
      openSuccessToast();
    } catch (error) {
      if (
        error.status === 400 &&
        error.message === "invalid_input"
      ) {
        if (isObject(error.data)) {
          let hasFieldError = false;

          if (
            typeof error.data.password === "string" &&
            error.data.password
          ) {
            setError(
              "password",
              error.data.password,
            );
            hasFieldError = true;
          }

          if (
            typeof error.data.passwordConfirm ===
              "string" &&
            error.data.passwordConfirm
          ) {
            setError(
              "passwordConfirm",
              error.data.passwordConfirm,
            );
            hasFieldError = true;
          }

          if (hasFieldError) {
            return;
          }
        }

        if (error.data === null) {
          setFormError(
            "기존 비밀번호와 같은 값은 사용할 수 없습니다.",
          );
          return;
        }
      }

      setFormError(getRequestErrorMessage(error));
    }
  }

  return (
    <>
      <Header />

      <main className="profile-edit-page">
        <section className="profile-edit-panel">
          <div className="profile-edit-title">
            <h1>비밀번호 수정</h1>
            <p>
              새 비밀번호는 기존 비밀번호와 달라야 하며,
              보안 조건을 모두 만족해야 합니다.
            </p>
          </div>

          <form
            ref={formRef}
            id="modifyPwForm"
            className={
              "profile-edit-layout password-edit-layout"
            }
            noValidate
            onSubmit={handleSubmit(
              submitModifyPassword,
            )}
          >
            <div className="profile-edit-fields">
              <div className="profile-field">
                <label htmlFor="password">
                  새 비밀번호
                </label>

                <div className="password-input-row">
                  <input
                    {...register(
                      "password",
                      passwordRules,
                      {
                        controlled: true,
                        shouldValidate: true,
                        onChange:
                          handlePasswordChange,
                      },
                    )}
                    id="password"
                    type={isPasswordVisible
                      ? "text"
                      : "password"}
                    autoComplete="new-password"
                    value={password}
                  />

                  <button
                    type="button"
                    className="password-toggle-button"
                    data-toggle-password="password"
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

              <div className="profile-field">
                <label htmlFor="passwordConfirm">
                  새 비밀번호 확인
                </label>

                <div className="password-input-row">
                  <input
                    {...register(
                      "passwordConfirm",
                      passwordConfirmRules,
                      {
                        controlled: true,
                        shouldValidate: true,
                        onChange:
                          handlePasswordConfirmChange,
                      },
                    )}
                    id="passwordConfirm"
                    type={isPasswordConfirmVisible
                      ? "text"
                      : "password"}
                    autoComplete="new-password"
                    value={passwordConfirm}
                  />

                  <button
                    type="button"
                    className="password-toggle-button"
                    data-toggle-password={
                      "passwordConfirm"
                    }
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

              <div className="password-actions">
                <button
                  type="submit"
                  disabled={isSubmitting}
                >
                  수정하기
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

            <aside className="password-rule-card">
              <h2>비밀번호 조건</h2>

              <ul className="password-rule-list">
                <li
                  id="passwordLengthRule"
                  className={passwordRuleState.length
                    ? "is-valid"
                    : undefined}
                >
                  8자 이상 20자 이하
                </li>
                <li
                  id="passwordUpperRule"
                  className={passwordRuleState.upper
                    ? "is-valid"
                    : undefined}
                >
                  대문자 1개 이상 포함
                </li>
                <li
                  id="passwordLowerRule"
                  className={passwordRuleState.lower
                    ? "is-valid"
                    : undefined}
                >
                  소문자 1개 이상 포함
                </li>
                <li
                  id="passwordNumberRule"
                  className={passwordRuleState.number
                    ? "is-valid"
                    : undefined}
                >
                  숫자 1개 이상 포함
                </li>
                <li
                  id="passwordSpecialRule"
                  className={passwordRuleState.special
                    ? "is-valid"
                    : undefined}
                >
                  특수문자 1개 이상 포함
                </li>
                <li
                  id="passwordConfirmRule"
                  className={passwordRuleState.confirm
                    ? "is-valid"
                    : undefined}
                >
                  비밀번호 확인 일치
                </li>
              </ul>
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
