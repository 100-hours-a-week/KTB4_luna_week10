import { Fragment } from "react";

import defaultProfileImage from "../../assets/default-profile.png";

export function MultilineText({ value }) {
  return String(value ?? "")
    .split("\n")
    .map((line, index) => (
      <Fragment key={`${index}-${line}`}>
        {index > 0 ? <br /> : null}
        {line}
      </Fragment>
    ));
}

export function ProfileImage({
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
