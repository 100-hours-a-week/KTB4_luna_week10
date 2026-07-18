export function validateEmail(email) {
  const emailRegex = (
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  );

  if (!email) {
    return "이메일을 입력해주세요.";
  }

  if (!emailRegex.test(email)) {
    return (
      "올바른 이메일 형식으로 입력해주세요."
    );
  }

  return true;
}

export function validatePassword(password) {
  if (!password || !password.trim()) {
    return "비밀번호를 입력해주세요.";
  }

  if (
    password.length < 8 ||
    password.length > 20
  ) {
    return (
      "비밀번호는 8자 이상, 20자 이하로 입력해주세요."
    );
  }

  if (!/[A-Z]/.test(password)) {
    return (
      "비밀번호는 대문자를 최소 1개 포함해야 합니다."
    );
  }

  if (!/[a-z]/.test(password)) {
    return (
      "비밀번호는 소문자를 최소 1개 포함해야 합니다."
    );
  }

  if (!/[0-9]/.test(password)) {
    return (
      "비밀번호는 숫자를 최소 1개 포함해야 합니다."
    );
  }

  if (!/[!@#$%^&*]/.test(password)) {
    return (
      "비밀번호는 특수문자를 최소 1개 포함해야 합니다."
    );
  }

  return true;
}

export function validatePasswordConfirm(
  password,
  passwordConfirm,
) {
  if (
    !passwordConfirm ||
    !passwordConfirm.trim()
  ) {
    return "비밀번호 확인을 입력해주세요.";
  }

  if (password !== passwordConfirm) {
    return "비밀번호가 일치하지 않습니다.";
  }

  return true;
}

export function validateNickname(nickname) {
  if (!nickname) {
    return "닉네임을 입력해주세요.";
  }

  if (nickname.length > 10) {
    return (
      "닉네임은 최대 10자까지 입력가능합니다."
    );
  }

  if (/\s/.test(nickname)) {
    return (
      "닉네임에는 띄어쓰기를 사용할 수 없습니다."
    );
  }

  return true;
}
