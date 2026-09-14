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
