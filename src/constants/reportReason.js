export const ReportReason = Object.freeze({
  SPAM: "SPAM",
  ABUSE: "ABUSE",
  ILLEGAL: "ILLEGAL",
  ETC: "ETC",
});

export const ReportReasonLabel = Object.freeze({
  [ReportReason.SPAM]: "스팸",
  [ReportReason.ABUSE]: "욕설/비방",
  [ReportReason.ILLEGAL]: "불법 정보",
  [ReportReason.ETC]: "기타",
});
