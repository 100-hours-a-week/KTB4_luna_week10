# Community React Migration Rules

## 작업 범위

- 수정·생성·삭제가 허용된 위치는 `/Users/luna/Desktop/coding/community-react`뿐이다.
- `/Users/luna/Desktop/coding/frontend`, `/Users/luna/Desktop/coding/backend`, `/Users/luna/Documents/Codex/2026-07-15/community-react-migration-spec/specs/final`은 읽기 전용 참조 자료이며 절대 수정하지 않는다.
- 기존 사용자 변경과 현재 체크포인트에 관계없는 파일을 보존한다.
- Git add, commit, branch 변경 등 Git 상태를 바꾸는 작업은 사용자가 명시적으로 요청한 경우에만 수행한다.

## 명세 적용

- `specs/final/README.md`에 정의된 문서 순서와 우선순위를 따른다.
- 명세 문서끼리 충돌하면 `README.md`의 최종 공통 결정을 우선한다.
- 공통 명세는 `core/01-project-setup.md`부터 `core/07-utilities-and-constants.md`까지 순서대로 적용하고, 페이지 명세는 `pages/10-login-page.md`부터 정해진 순서대로 진행한다.
- 각 체크포인트에서는 필요한 공통 명세와 현재 대상 페이지 명세만 필요한 범위까지 읽으며, 이후 페이지 기능을 미리 구현하지 않는다.
- 명세에서 의도적 변경으로 명시한 부분 외에는 기존 frontend의 UI, 문구, CSS class와 id, 사용자 흐름 및 backend API 계약을 유지한다.

## 구현 원칙

- 한 번에 사용자와 합의한 작은 체크포인트 하나만 구현하며 임의로 범위를 확장하지 않는다.
- 페이지는 도메인별 service 함수를 호출하고 `apiClient` 또는 endpoint를 직접 호출하지 않는다.
- 명세에 없는 `AuthContext`, `AuthProvider`, 별도 route guard 계층, 새로운 전역 상태 구조, 공통 Layout 또는 불필요한 추상화와 라이브러리를 추가하지 않는다.
- 기존 기능에 없는 UI, API 요청, validation 규칙, 상태 또는 사용자 흐름을 임의로 추가하지 않는다.
- 의존성과 lockfile은 명세상 필요한 경우에만 package manager를 통해 변경한다.

## 확인과 중단 조건

- 구현 후 체크포인트에 관련된 검사를 수행하고 `npm run lint`와 `npm run build`를 실행한다.
- 검사 실패를 숨기거나 관련 없는 코드를 수정하여 우회하지 않고 원인과 남은 문제를 보고한다.
- 명세와 기존 frontend 코드 또는 backend 계약이 충돌하거나 요구사항이 불명확하면 추측하지 않는다.
- 충돌·불명확성 또는 체크포인트 범위 문제가 발견되면 구현을 중단하고 근거와 선택지를 제시한 뒤 사용자에게 질문한다.
