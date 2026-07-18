import { request } from "../apiClient.js";

export async function getCurrentDraft() {
  return request("/api/draft-post/current", {
    method: "GET",
  });
}

export async function saveDraft({
  title,
  postBody,
  postImageUrl,
  version,
}) {
  return request("/api/draft-post", {
    method: "POST",
    body: {
      title,
      postBody,
      postImageUrl,
      version,
    },
  });
}

export async function updateDraft({
  title,
  postBody,
  postImageUrl,
  version,
}) {
  return request("/api/draft-post", {
    method: "PATCH",
    body: {
      title,
      postBody,
      postImageUrl,
      version,
    },
  });
}

export async function publishDraft({
  title,
  postBody,
  postImageUrl,
  version,
}) {
  return request("/api/draft-post/publish", {
    method: "POST",
    body: {
      title,
      postBody,
      postImageUrl,
      version,
    },
  });
}

export async function deleteDraft() {
  return request("/api/draft-post", {
    method: "DELETE",
  });
}
