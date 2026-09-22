# 심궁회 습사 일정표

한양대학교 국궁동아리 심궁회의 습사 일정·회원 관리 웹앱입니다.

## 실행

```bash
npm install
npm run dev
```

Firebase 환경 변수는 `.env.example`을 참고해 설정합니다.

## 관리자 계정 삭제 설정

관리자가 다른 회원을 삭제할 때 Firebase Authentication 계정까지 함께 지우려면
Firebase 콘솔의 **프로젝트 설정 → 서비스 계정 → 새 비공개 키 생성**에서 받은 값을
Vercel 프로젝트의 Environment Variables에 아래 이름으로 등록합니다.

- `FIREBASE_ADMIN_PROJECT_ID`
- `FIREBASE_ADMIN_CLIENT_EMAIL`
- `FIREBASE_ADMIN_PRIVATE_KEY`

비공개 키는 JSON 파일의 `private_key` 전체 값을 입력합니다. 이미 회원 목록에서만
삭제되어 재가입할 수 없는 학번은 회원 탭 아래의 **가입 정보 초기화**에서 정리할 수
있습니다.

## 개발·유지보수 안내

- `app/page.tsx`: 로그인 상태, 회원·습사 데이터와 Firestore 동기화, 상위 화면 연결. 기존 코드가 커서 새 기능은 가능한 한 별도 컴포넌트/순수 함수로 분리합니다.
- `app/components/`: 화면 단위 UI. 화살 재고의 선택 동작은 `ArrowInventory.tsx`, 장비 카드 공통 UI는 `EquipmentCard.tsx`에 있습니다.
- `lib/memberDisplay.ts`: 회원 등급·팀·직책의 **공통 표시 규칙**. 팀장은 직책명만, 일반 팀원은 `등급-팀`, 무소속은 등급만 표시합니다. 역할 탭의 팀 구성 UI는 이 규칙과 별개입니다.
- `lib/equipment.ts`: 활·화살 데이터 타입, 화살 분류, 일괄 삭제 검증. 여러 분류의 화살을 함께 선택할 수 있지만 대여·분실·손상 장비와 대여 기록에 연결된 장비는 삭제할 수 없습니다.
- 장비 상세의 `분실`·`손상`은 대여 중인 경우 대여 기록의 비고도 함께 갱신합니다. `분실물 회수`·`수리 완료` 뒤에도 대여가 진행 중이라면 장비는 다시 `대여 중`으로 돌아갑니다. 과거의 수동 대여 불가능 설정은 기존 장비에서만 해제할 수 있습니다.
- 장비 삭제는 화면에서만 걸러서는 안 됩니다. `app/page.tsx`의 Firestore 트랜잭션에서 최신 데이터로 다시 검증합니다.
- 기능 변경 시 `node --test tests/member-display-equipment.test.mjs tests/membership-history.test.mjs`와 `npm run build`를 실행합니다. 기존 `npm test`의 미리보기 관련 테스트는 현재 누락된 `_sites-preview` 파일에 의존하므로 별도 정리가 필요합니다.

### 心五시 心五중

- 기록 화면은 `app/components/HeartFive.tsx`, 입력값 검증과 통계 계산은 `lib/heartFive.ts`에 있습니다.
- 기록과 포인트는 서버 API(`app/api/heart-five/`)를 통해서만 읽고 씁니다. Firebase 관리자 환경 변수 3개가 Vercel에도 설정돼 있어야 합니다. 타인의 잠긴 기록은 서버가 시위·점수를 내려주지 않습니다.
- 기존 `clubs/heartFive-{uuid}`와 `clubs/simgunghoe/shotRecords` 기록은 첫 조회 시 서버가 `heartFiveRecords`로 옮기고, 5발 이상 완성된 기록마다 소유자에게 2점을 한 번 지급합니다. 새 기록도 첫 5발 완성 시 2점이 한 번만 지급되며, 기록을 삭제하면 2점을 회수합니다. 이미 사용한 경우 잔액이 음수가 될 수 있고 이후 획득 점수로 갚습니다.
- 기록 한 건을 처음 열람할 때 1점을 차감해 영구 열람 권한을 저장합니다. 동일 기록의 재열람은 무료입니다. 입력 중인 기록은 본인만 보며, 완료된 순이 하나라도 있으면 통계에 나타납니다.
- 본인은 한국 시간 기준 기록일 당일까지만 수정·삭제할 수 있고, 관리자는 날짜와 관계없이 삭제할 수 있습니다. 새 기록의 날짜는 오늘 이후여야 합니다. 장소 선택지는 습사 일정의 `practicePlaces`를 공유합니다.
- 기록은 원사·근사를 구분하며 기본값은 원사입니다. 과거 기록은 원사로 처리합니다. 목록은 마지막 조회 결과를 브라우저에 잠시 보관해 즉시 그린 뒤 최신 서버 데이터로 갱신합니다.
- 이 변경은 `firestore.rules`도 함께 배포해야 기존 브라우저 직접 접근을 차단합니다: `firebase deploy --only firestore:rules`. 웹 배포만으로 포인트 열람 제한이 완전히 보호되지 않습니다.
- 기록 입력 화면의 `수정`을 누르면 기존 발을 바꾸거나 마지막 발을 삭제할 수 있습니다. 저장 버튼은 없고 변경 때마다 동기화합니다.
- 계산 검증: `node --test tests/heart-five.test.mjs`.
