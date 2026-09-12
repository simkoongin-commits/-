"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import type { User } from "firebase/auth";
import {
  createUserWithEmailAndPassword,
  deleteUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  setDoc,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { auth, db, storage } from "@/lib/firebase";

type Member = {
  id: string;
  name: string;
  joinTerm: string;
  grade: "예비신사" | "신사" | "구사";
  role: "관리자" | "회원";
  position?: "대표" | "부대표" | "교육팀장" | "장비팀장" | "홍보팀장" | "";
  practicePermission?: boolean;
};
type Practice = {
  id: number;
  type: "regular" | "general" | "competition";
  title: string;
  round?: number;
  date: string;
  start: string;
  end: string;
  place: string;
  leader?: string;
  deadline: string;
  capacity: number;
  mandatory?: boolean;
  applicants: string[];
  note?: string;
  timeNote?: string;
  updated?: string[];
  timetable?: string;
  createdBy?: string;
};
type PublicPost = {
  id: string;
  title: string;
  body: string;
  date: string;
  cover?: string;
  media?: string[];
};
type PublicQuestion = {
  id: string;
  title: string;
  body: string;
  nickname?: string;
  status: "waiting" | "answered" | "discarded";
  answer?: string;
  answeredBy?: string;
  createdAt: string;
};
type PromoScene = {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  theme: "sky" | "ink" | "foam";
  image?: string;
};
type EducationSlot = {
  educators: string[];
  learners: string[];
};
type EducationSchedule = {
  id: string;
  startDate: string;
  endDate: string;
  place: string;
  slots: Record<string, EducationSlot>;
  createdBy: string;
};
type Mentor = {
  memberId: string;
  name: string;
  side: "좌궁" | "우궁";
  range: string;
  capacity: number;
  mentees: string[];
};

const initialMembers: Member[] = [
  {
    id: "20231234",
    name: "변수인",
    joinTerm: "23-1",
    grade: "구사",
    role: "관리자",
    position: "교육팀장",
  },
  {
    id: "20261234",
    name: "조성현",
    joinTerm: "26-2",
    grade: "예비신사",
    role: "회원",
  },
  {
    id: "20251234",
    name: "한예희",
    joinTerm: "26-1",
    grade: "신사",
    role: "회원",
  },
  {
    id: "20241234",
    name: "신상학",
    joinTerm: "25-2",
    grade: "구사",
    role: "회원",
  },
  {
    id: "20239999",
    name: "Lotte",
    joinTerm: "25-1",
    grade: "구사",
    role: "회원",
  },
];
const defaultPromoScenes: PromoScene[] = [
  {
    id: "welcome",
    eyebrow: "한양대학교 국궁동아리",
    title: "활을 쏘는 순간,\n마음이 한곳에 모입니다.",
    body: "심궁회는 국궁을 함께 배우고, 꾸준히 수련하는 한양대학교 중앙동아리입니다.",
    theme: "sky",
  },
  {
    id: "practice",
    eyebrow: "정규 습사",
    title: "처음이어도\n함께라서 괜찮아요.",
    body: "기초부터 차근차근. 예비신사 교육과 정규 습사를 통해 안전하게 활을 배웁니다.",
    theme: "foam",
  },
  {
    id: "community",
    eyebrow: "심궁회의 시간",
    title: "활 하나로 이어지는\n우리의 계절.",
    body: "자유 습사, 대회, 그리고 함께 나누는 일상까지. 심궁회의 이야기를 만나보세요.",
    theme: "ink",
  },
];
const defaultPublicPosts: PublicPost[] = [
  {
    id: "welcome-post",
    title: "심궁회에 오신 것을 환영합니다",
    body: "한양대학교 국궁동아리 심궁회는 국궁을 사랑하는 사람들이 함께 성장하는 공간입니다.",
    date: "2026. 09. 13.",
  },
  {
    id: "recruit-post",
    title: "2026년 2학기 신입부원 안내",
    body: "국궁이 처음이어도 괜찮습니다. Q&A에서 편하게 문의해주세요.",
    date: "2026. 09. 10.",
  },
];

const termIndex = (term: string) => {
  const [year, semester] = term.split("-").map(Number);
  return year * 2 + semester - 1;
};
const gradeFor = (joinTerm: string, currentTerm: string): Member["grade"] => {
  const gap = termIndex(currentTerm) - termIndex(joinTerm);
  return gap <= 0 ? "예비신사" : gap === 1 ? "신사" : "구사";
};
const seedPractices: Practice[] = [
  {
    id: 1,
    type: "regular",
    title: "정규습사 1회차",
    round: 1,
    date: "2026-09-12",
    start: "09:00",
    end: "11:00",
    place: "부천정",
    leader: "변수인",
    deadline: "2026-09-11T23:59",
    capacity: 12,
    mandatory: true,
    timetable: "09:00 동아리방에서 출발\n10:00 부천정 도착\n11:00 마무리",
    applicants: ["조성현", "한예희", "신상학"],
    note: "함께 가고싶은 신구사분들은 댓글로 이름 적어주세요!",
  },
  {
    id: 2,
    type: "general",
    title: "난지 습사",
    date: "2026-09-27",
    start: "14:00",
    end: "16:30",
    place: "난지국궁장",
    deadline: "2026-09-20T23:59",
    capacity: 10,
    applicants: ["조성현", "한예희", "신상학", "Lotte"],
    note: "예비신사 교육이 같이 이루어집니다!!",
    timeNote: "시간 바뀔 수 있음",
    updated: ["장소: 난자국궁장 → 난지국궁장"],
  },
  {
    id: 3,
    type: "general",
    title: "야간 자유습사",
    date: "2026-09-09",
    start: "18:30",
    end: "20:30",
    place: "살곶이정",
    deadline: "2026-09-08T22:00",
    capacity: 8,
    applicants: ["변수인", "한예희"],
    note: "개인 활과 장비를 챙겨주세요.",
  },
];

const koDate = (date: string) => {
  const d = new Date(`${date}T12:00:00`);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${"일월화수목금토"[d.getDay()]})`;
};
const shortDate = (date: string) => {
  const d = new Date(`${date}T12:00:00`);
  return `${d.getMonth() + 1}/${d.getDate()} (${"일월화수목금토"[d.getDay()]})`;
};
const deadlineText = (value: string, regular: boolean) => {
  const d = new Date(value);
  const base = `${d.getMonth() + 1}월 ${d.getDate()}일(${"일월화수목금토"[d.getDay()]})`;
  return regular
    ? `${base} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")} 전까지 작성해주세요!`
    : `${base} 까지 작성해주세요!`;
};
const deadlineCardText = (value: string) => {
  const d = new Date(value);
  return `${d.getMonth() + 1}월 ${d.getDate()}일(${"일월화수목금토"[d.getDay()]}) ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};
const defaultCopyFormats = {
  reminder: "{date} {time} {place}에서 습사 예정입니다!",
  added: "{name} {date} 습사 참여합니다!",
  announcementRegular:
    "{title}\n\n일시: {date} {start}-{end}\n\n장소: {place}\n인솔: {leader}\n\n마감일: {deadline}\n\n{timetable}\n\n{note}",
  announcementGeneral:
    "{title}\n\n일시: {date} {start}~{end}\n장소: {place}\n\n{applicants}\n\n마감일: {deadline}\n\n{note}",
  announcementCompetition:
    "{title}\n\n일시: {date} {start}~{end}\n장소: {place}\n\n{applicants}\n\n마감일: {deadline}\n\n{note}",
};
type CopyFormats = typeof defaultCopyFormats;
function announcement(p: Practice, formats: CopyFormats) {
  const names = [...p.applicants, ""]
    .map((n, i) => `${i + 1}. ${n}`)
    .join("\n");
  const template =
    p.type === "regular"
      ? formats.announcementRegular
      : p.type === "competition"
        ? formats.announcementCompetition
        : formats.announcementGeneral;
  const values: Record<string, string> = {
    title: p.type === "regular" ? `{정규습사 ${p.round}회차}` : `{${p.title}}`,
    date: p.type === "regular" ? koDate(p.date) : shortDate(p.date),
    start: p.start,
    end: p.end,
    place: p.place,
    leader: p.leader || "미정",
    deadline: deadlineText(p.deadline, p.type === "regular"),
    timetable: p.timetable || `${p.start} ${p.place} 습사\n${p.end} 마무리`,
    applicants: names,
    note: p.note || "",
  };
  return Object.entries(values).reduce(
    (text, [key, value]) => text.split(`{${key}}`).join(value),
    template,
  );
}

const authEmail = (studentId: string) => `${studentId.trim()}@simgunghoe.local`;

function LoginScreen({
  error,
  onRegister,
  initialMode = "login",
  onClose,
}: {
  error?: string;
  onRegister: (details: {
    studentId: string;
    password: string;
    name: string;
    joinTerm: string;
  }) => Promise<void>;
  initialMode?: "login" | "signup";
  onClose?: () => void;
}) {
  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [joinTerm, setJoinTerm] = useState("26-2");
  const [mode, setMode] = useState<"login" | "signup">(initialMode);
  const [message, setMessage] = useState(error || "");
  const [submitting, setSubmitting] = useState(false);
  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage("");
    try {
      await signInWithEmailAndPassword(auth, authEmail(studentId), password);
    } catch {
      setMessage("학번 또는 비밀번호를 다시 확인해주세요.");
    } finally {
      setSubmitting(false);
    }
  };
  const register = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage("");
    try {
      await onRegister({ studentId, password, name, joinTerm });
    } catch (registrationError: unknown) {
      const code =
        typeof registrationError === "object" &&
        registrationError &&
        "code" in registrationError
          ? String(registrationError.code)
          : "";
      setMessage(
        code === "auth/email-already-in-use"
          ? "이미 가입된 학번입니다. 로그인해주세요."
          : "회원가입을 완료하지 못했어요. 잠시 후 다시 시도해주세요.",
      );
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <main className="login-screen">
      <section className="login-card">
        {onClose && (
          <button
            className="login-close"
            onClick={onClose}
            aria-label="홍보 페이지로 돌아가기"
          >
            ×
          </button>
        )}
        <span className="brandmark">
          <img src="/hanyang-mark.png" alt="한양대학교 마크" />
        </span>
        <p className="eyebrow">한양대학교 국궁동아리</p>
        <h1>
          심궁회
          <br />
          <em>습사 일정표</em>
        </h1>
        <p>
          {mode === "login"
            ? "학번과 비밀번호로 로그인해주세요."
            : "가입 후 바로 습사 일정표를 이용할 수 있어요."}
        </p>
        <form onSubmit={mode === "login" ? login : register}>
          <label>
            학번
            <input
              value={studentId}
              onChange={(e) => setStudentId(e.target.value.replace(/\D/g, ""))}
              inputMode="numeric"
              maxLength={10}
              placeholder="학번"
              required
            />
          </label>
          {mode === "signup" && (
            <>
              <label>
                이름
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="이름"
                  required
                />
              </label>
              <label>
                입부 시기
                <input
                  value={joinTerm}
                  onChange={(e) => setJoinTerm(e.target.value)}
                  placeholder="예: 26-2"
                  pattern="[0-9]{2}-[12]"
                  required
                />
              </label>
            </>
          )}
          <label>
            비밀번호
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              placeholder="비밀번호"
              required
            />
          </label>
          {message && <small className="login-error">{message}</small>}
          <button className="primary" disabled={submitting}>
            {submitting ? "처리 중" : mode === "login" ? "로그인" : "회원가입"}
          </button>
          <button
            className="text-button"
            type="button"
            onClick={() => {
              setMode(mode === "login" ? "signup" : "login");
              setMessage("");
            }}
          >
            {mode === "login" ? "회원가입" : "로그인"}
          </button>
        </form>
      </section>
    </main>
  );
}

function PublicPortal({
  signedIn,
  onAuth,
  onMember,
  initialTab = "home",
  session,
  scenes,
  posts,
  questions,
  onQuestion,
  onSavePost,
  onDeletePost,
  onAnswer,
  onDiscard,
  onSaveScenes,
}: {
  signedIn: boolean;
  onAuth: (mode: "login" | "signup") => void;
  onMember?: () => void;
  session?: Member;
  initialTab?: "home" | "qa" | "posts";
  scenes?: PromoScene[];
  posts?: PublicPost[];
  questions?: PublicQuestion[];
  onQuestion?: (
    question: Omit<PublicQuestion, "id" | "status" | "createdAt">,
  ) => Promise<void>;
  onSavePost?: (post: PublicPost, files: File[]) => Promise<void>;
  onDeletePost?: (id: string) => void;
  onAnswer?: (question: PublicQuestion, answer: string) => void;
  onDiscard?: (id: string) => void;
  onSaveScenes?: (scenes: PromoScene[]) => void;
}) {
  const [tab, setTab] = useState<"home" | "qa" | "posts">(initialTab);
  const [questionSent, setQuestionSent] = useState(false);
  const [question, setQuestion] = useState({
    title: "",
    body: "",
    nickname: "",
  });
  const [editingHome, setEditingHome] = useState(false);
  const [sceneDrafts, setSceneDrafts] = useState<PromoScene[]>(
    scenes || defaultPromoScenes,
  );
  const [postEditor, setPostEditor] = useState(false);
  const [postDraft, setPostDraft] = useState({ title: "", body: "" });
  const [postFiles, setPostFiles] = useState<File[]>([]);
  const [answerTarget, setAnswerTarget] = useState<PublicQuestion | null>(null);
  const [answer, setAnswer] = useState("");
  const isResponder = session?.role === "관리자" || session?.grade === "구사";
  const publicQuestions = (questions || []).filter(
    (item) => item.status === "answered",
  );
  const waitingQuestions = (questions || []).filter(
    (item) => item.status === "waiting",
  );
  const shownScenes = scenes?.length ? scenes : defaultPromoScenes;
  const shownPosts = posts?.length ? posts : defaultPublicPosts;
  return (
    <main className="public-shell">
      <header className="public-topbar">
        <a className="brand" href="#top">
          <span className="brandmark">
            <img src="/hanyang-mark.png" alt="한양대학교 마크" />
          </span>
          <b>심궁회</b>
        </a>
        <div className="public-actions">
          {signedIn ? (
            <button className="member-link" onClick={onMember}>
              회원 전용
            </button>
          ) : (
            <>
              <button className="plain-link" onClick={() => onAuth("login")}>
                로그인
              </button>
              <button className="public-join" onClick={() => onAuth("signup")}>
                회원가입
              </button>
            </>
          )}
        </div>
      </header>
      <nav className="public-nav" aria-label="홍보 메뉴">
        <button
          className={tab === "home" ? "active" : ""}
          onClick={() => setTab("home")}
        >
          홈
        </button>
        <button
          className={tab === "qa" ? "active" : ""}
          onClick={() => setTab("qa")}
        >
          Q&amp;A
        </button>
        <button
          className={tab === "posts" ? "active" : ""}
          onClick={() => setTab("posts")}
        >
          게시물
        </button>
      </nav>
      {signedIn && session?.role === "관리자" && (
        <div className="promo-adminbar">
          <span>홍보 페이지 관리</span>
          {tab === "home" && (
            <button
              onClick={() => {
                setSceneDrafts(shownScenes);
                setEditingHome(true);
              }}
            >
              홈 편집
            </button>
          )}
          {tab === "posts" && (
            <button onClick={() => setPostEditor(true)}>게시물 추가</button>
          )}
          {tab === "qa" && (
            <span className="question-count">
              답변 대기 {waitingQuestions.length}
            </span>
          )}
        </div>
      )}
      {tab === "home" && (
        <section id="top" className="promo-home">
          {shownScenes.map((scene, index) => (
            <article key={scene.id} className={`promo-scene ${scene.theme}`}>
              {scene.image && (
                <img className="promo-scene-image" src={scene.image} alt="" />
              )}
              <div className="scene-orbit" aria-hidden="true" />
              <p>{scene.eyebrow}</p>
              <h1>
                {scene.title.split("\n").map((line) => (
                  <span key={line}>{line}</span>
                ))}
              </h1>
              <div className="scene-copy">
                <span>0{index + 1}</span>
                <p>{scene.body}</p>
              </div>
            </article>
          ))}
          <article className="promo-cta">
            <p>SIMKOONG ARCHERY CLUB</p>
            <h2>
              우리의 다음 화살은
              <br />
              당신과 함께.
            </h2>
            <button onClick={() => setTab("qa")}>궁금한 점 물어보기</button>
          </article>
        </section>
      )}
      {tab === "qa" && (
        <section className="public-content">
          <div className="public-heading">
            <p>Q&amp;A</p>
            <h1>
              궁금한 점을
              <br />
              편하게 물어보세요.
            </h1>
            <span>답변이 등록된 질문은 모든 사람에게 공개됩니다.</span>
          </div>
          <form
            className="question-form"
            onSubmit={async (event) => {
              event.preventDefault();
              if (onQuestion) await onQuestion(question);
              setQuestionSent(true);
              setQuestion({ title: "", body: "", nickname: "" });
            }}
          >
            <label>
              질문 제목
              <input
                required
                value={question.title}
                onChange={(e) =>
                  setQuestion({ ...question, title: e.target.value })
                }
                placeholder="예: 국궁을 처음 해보는데 가입할 수 있나요?"
              />
            </label>
            <label>
              질문 내용
              <textarea
                required
                value={question.body}
                onChange={(e) =>
                  setQuestion({ ...question, body: e.target.value })
                }
                placeholder="궁금한 내용을 적어주세요."
              />
            </label>
            <label>
              닉네임 <small>선택</small>
              <input
                value={question.nickname}
                onChange={(e) =>
                  setQuestion({ ...question, nickname: e.target.value })
                }
                placeholder="공개될 이름"
              />
            </label>
            <button className="public-submit">질문 보내기</button>
            {questionSent && (
              <p className="form-success">
                질문을 접수했어요. 운영진이 확인 후 답변합니다.
              </p>
            )}
          </form>
          {isResponder && waitingQuestions.length > 0 && (
            <div className="qa-list pending">
              <p className="list-label">답변 대기</p>
              {waitingQuestions.map((item) => (
                <article key={item.id}>
                  <b>Q. {item.title}</b>
                  <p>{item.body}</p>
                  <small>
                    {item.nickname || "익명"} · {item.createdAt}
                  </small>
                  <div className="qa-actions">
                    <button
                      onClick={() => {
                        setAnswerTarget(item);
                        setAnswer("");
                      }}
                    >
                      답변하기
                    </button>
                    <button
                      className="danger"
                      onClick={() => onDiscard?.(item.id)}
                    >
                      폐기
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
          <div className="qa-list">
            <p className="list-label">답변된 질문</p>
            {publicQuestions.length ? (
              publicQuestions.map((item) => (
                <article key={item.id}>
                  <b>Q. {item.title}</b>
                  <p>A. {item.answer}</p>
                  <small>
                    {item.answeredBy || "심궁회"} · {item.createdAt}
                  </small>
                </article>
              ))
            ) : (
              <article>
                <b>아직 공개된 질문이 없어요.</b>
                <p>첫 질문을 남겨보세요.</p>
              </article>
            )}
          </div>
        </section>
      )}
      {tab === "posts" && (
        <section className="public-content">
          <div className="public-heading">
            <p>STORIES</p>
            <h1>
              심궁회의
              <br />
              새로운 소식.
            </h1>
          </div>
          <div className="public-posts">
            {shownPosts.map((post, index) => (
              <article key={post.id} className={`public-post post-${index}`}>
                <div
                  className="post-cover"
                  style={
                    post.cover
                      ? { backgroundImage: `url(${post.cover})` }
                      : undefined
                  }
                >
                  <span>{post.cover ? "" : "SIMKOONG"}</span>
                </div>
                <div>
                  <small>{post.date}</small>
                  <h2>{post.title}</h2>
                  <p>{post.body}</p>
                  {post.media?.map((url) =>
                    url.match(/\.(mp4|webm|mov)(\?|$)/i) ? (
                      <video
                        key={url}
                        className="post-media"
                        controls
                        src={url}
                      />
                    ) : (
                      <img
                        key={url}
                        className="post-media"
                        src={url}
                        alt="게시물 첨부 이미지"
                      />
                    ),
                  )}
                  {session?.role === "관리자" && (
                    <button
                      className="post-delete"
                      onClick={() => onDeletePost?.(post.id)}
                    >
                      삭제
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
      {editingHome && (
        <div className="modal-back">
          <section className="modal promo-editor">
            <div className="modal-head">
              <h2>홍보 홈 편집</h2>
              <button onClick={() => setEditingHome(false)}>×</button>
            </div>
            {sceneDrafts.map((scene, index) => (
              <div className="scene-editor" key={scene.id}>
                <b>장면 {index + 1}</b>
                <label>
                  작은 제목
                  <input
                    value={scene.eyebrow}
                    onChange={(e) =>
                      setSceneDrafts((all) =>
                        all.map((item) =>
                          item.id === scene.id
                            ? { ...item, eyebrow: e.target.value }
                            : item,
                        ),
                      )
                    }
                  />
                </label>
                <label>
                  큰 제목
                  <textarea
                    value={scene.title}
                    onChange={(e) =>
                      setSceneDrafts((all) =>
                        all.map((item) =>
                          item.id === scene.id
                            ? { ...item, title: e.target.value }
                            : item,
                        ),
                      )
                    }
                  />
                </label>
                <label>
                  설명
                  <textarea
                    value={scene.body}
                    onChange={(e) =>
                      setSceneDrafts((all) =>
                        all.map((item) =>
                          item.id === scene.id
                            ? { ...item, body: e.target.value }
                            : item,
                        ),
                      )
                    }
                  />
                </label>
                <label>
                  배경 사진 주소 <small>선택</small>
                  <input
                    value={scene.image || ""}
                    onChange={(e) =>
                      setSceneDrafts((all) =>
                        all.map((item) =>
                          item.id === scene.id
                            ? { ...item, image: e.target.value }
                            : item,
                        ),
                      )
                    }
                    placeholder="https://..."
                  />
                </label>
                <label>
                  화면 분위기
                  <select
                    value={scene.theme}
                    onChange={(e) =>
                      setSceneDrafts((all) =>
                        all.map((item) =>
                          item.id === scene.id
                            ? {
                                ...item,
                                theme: e.target.value as PromoScene["theme"],
                              }
                            : item,
                        ),
                      )
                    }
                  >
                    <option value="sky">밝은 파랑</option>
                    <option value="foam">밝은 물결</option>
                    <option value="ink">짙은 파랑</option>
                  </select>
                </label>
              </div>
            ))}
            <div className="modal-actions">
              <button onClick={() => setEditingHome(false)}>취소</button>
              <button
                className="primary"
                onClick={() => {
                  onSaveScenes?.(sceneDrafts);
                  setEditingHome(false);
                }}
              >
                게시
              </button>
            </div>
          </section>
        </div>
      )}
      {postEditor && (
        <div className="modal-back">
          <form
            className="modal"
            onSubmit={async (e) => {
              e.preventDefault();
              await onSavePost?.(
                {
                  id: String(Date.now()),
                  title: postDraft.title,
                  body: postDraft.body,
                  date: new Date().toLocaleDateString("ko-KR"),
                },
                postFiles,
              );
              setPostEditor(false);
              setPostDraft({ title: "", body: "" });
              setPostFiles([]);
            }}
          >
            <div className="modal-head">
              <h2>게시물 추가</h2>
              <button type="button" onClick={() => setPostEditor(false)}>
                ×
              </button>
            </div>
            <label>
              제목
              <input
                required
                value={postDraft.title}
                onChange={(e) =>
                  setPostDraft({ ...postDraft, title: e.target.value })
                }
              />
            </label>
            <label>
              본문
              <textarea
                required
                value={postDraft.body}
                onChange={(e) =>
                  setPostDraft({ ...postDraft, body: e.target.value })
                }
              />
            </label>
            <label>
              사진·영상
              <input
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={(e) => setPostFiles(Array.from(e.target.files || []))}
              />
            </label>
            <div className="modal-actions">
              <button type="button" onClick={() => setPostEditor(false)}>
                취소
              </button>
              <button className="primary">게시</button>
            </div>
          </form>
        </div>
      )}
      {answerTarget && (
        <div className="modal-back">
          <section className="modal">
            <div className="modal-head">
              <h2>Q&amp;A 답변</h2>
              <button onClick={() => setAnswerTarget(null)}>×</button>
            </div>
            <p>
              <b>{answerTarget.title}</b>
            </p>
            <p>{answerTarget.body}</p>
            <label>
              답변
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
              />
            </label>
            <div className="modal-actions">
              <button onClick={() => setAnswerTarget(null)}>취소</button>
              <button
                className="primary"
                disabled={!answer.trim()}
                onClick={() => {
                  onAnswer?.(answerTarget, answer);
                  setAnswerTarget(null);
                }}
              >
                공개 답변
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

function BootstrapAdmin({
  studentId,
  onSave,
}: {
  studentId: string;
  onSave: (member: Member) => void;
}) {
  const [name, setName] = useState("");
  const [joinTerm, setJoinTerm] = useState("26-2");
  return (
    <main className="login-screen">
      <section className="login-card">
        <span className="brandmark">
          <img src="/hanyang-mark.png" alt="한양대학교 마크" />
        </span>
        <p className="eyebrow">최초 설정</p>
        <h1>
          첫 관리자
          <br />
          <em>등록하기</em>
        </h1>
        <p>
          회원 목록이 비어 있습니다. 본인 정보를 입력해 첫 관리자로
          등록해주세요.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSave({
              id: studentId,
              name,
              joinTerm,
              grade: gradeFor(joinTerm, "26-2"),
              role: "관리자",
              position: "교육팀장",
            });
          }}
        >
          <label>
            이름
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="이름"
              required
            />
          </label>
          <label>
            입부 시기
            <input
              value={joinTerm}
              onChange={(e) => setJoinTerm(e.target.value)}
              placeholder="예: 26-2"
              pattern="[0-9]{2}-[12]"
              required
            />
          </label>
          <button className="primary">첫 관리자 등록</button>
        </form>
      </section>
    </main>
  );
}

export default function Home() {
  const [practices, setPractices] = useState<Practice[]>(seedPractices);
  const [view, setView] = useState<
    "education" | "cards" | "calendar" | "members"
  >("cards");
  const [sort, setSort] = useState<"asc" | "desc">("asc");
  const [filter, setFilter] = useState<
    "all" | "regular" | "general" | "competition"
  >("all");
  const [toast, setToast] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Practice | null>(null);
  const [participants, setParticipants] = useState<Practice | null>(null);
  const [cancelTarget, setCancelTarget] = useState<number | null>(null);
  const [cardMenu, setCardMenu] = useState<number | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [copyFormats, setCopyFormats] =
    useState<CopyFormats>(defaultCopyFormats);
  const [clubMembers, setClubMembers] = useState<Member[]>(initialMembers);
  const [session, setSession] = useState<Member>(initialMembers[0]);
  const [currentTerm, setCurrentTerm] = useState("26-2");
  const [ready, setReady] = useState(false);
  const [authUser, setAuthUser] = useState<User | null | undefined>(undefined);
  const [accessError, setAccessError] = useState("");
  const [needsBootstrap, setNeedsBootstrap] = useState(false);
  const [topTab, setTopTab] = useState<"public" | "member">("member");
  const [promoStartTab, setPromoStartTab] = useState<"home" | "qa" | "posts">(
    "home",
  );
  const [authOverlay, setAuthOverlay] = useState<"login" | "signup" | null>(
    null,
  );
  const [publicScenes, setPublicScenes] =
    useState<PromoScene[]>(defaultPromoScenes);
  const [publicPosts, setPublicPosts] =
    useState<PublicPost[]>(defaultPublicPosts);
  const [publicQuestions, setPublicQuestions] = useState<PublicQuestion[]>([]);
  const [educationSchedules, setEducationSchedules] = useState<
    EducationSchedule[]
  >([]);
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const cloudState = useRef("");
  const registrationInProgress = useRef(false);
  useEffect(() => {
    return onAuthStateChanged(auth, setAuthUser);
  }, []);
  useEffect(
    () =>
      onSnapshot(doc(db, "public", "simgunghoe"), (snapshot) => {
        if (!snapshot.exists()) return;
        const data = snapshot.data();
        if (Array.isArray(data.scenes))
          setPublicScenes(data.scenes as PromoScene[]);
        if (Array.isArray(data.posts))
          setPublicPosts(data.posts as PublicPost[]);
      }),
    [],
  );
  useEffect(
    () =>
      onSnapshot(collection(db, "public", "simgunghoe", "qa"), (snapshot) => {
        setPublicQuestions(
          snapshot.docs.map(
            (item) => ({ id: item.id, ...item.data() }) as PublicQuestion,
          ),
        );
      }),
    [],
  );
  useEffect(() => {
    if (!authUser || !(session.role === "관리자" || session.grade === "구사"))
      return;
    return onSnapshot(
      collection(db, "clubs", "simgunghoe", "questions"),
      (snapshot) => {
        const waiting = snapshot.docs
          .map((item) => ({ id: item.id, ...item.data() }) as PublicQuestion)
          .filter((item) => item.status === "waiting");
        setPublicQuestions((published) => [
          ...published.filter((item) => item.status === "answered"),
          ...waiting,
        ]);
      },
    );
  }, [authUser, session.role, session.grade]);
  useEffect(() => {
    if (!authUser) return;
    const clubDoc = doc(db, "clubs", "simgunghoe");
    return onSnapshot(
      clubDoc,
      (snapshot) => {
        if (!snapshot.exists()) {
          void setDoc(clubDoc, {
            practices: seedPractices,
            members: [],
          currentTerm: "26-2",
          copyFormats: defaultCopyFormats,
          educationSchedules: [],
          mentors: [],
          }).catch(() => {
            setAccessError(
              "공동 일정판을 준비하지 못했어요. 다시 로그인한 뒤 시도해주세요.",
            );
            void signOut(auth);
          });
          return;
        }
        const data = snapshot.data();
        const term =
          typeof data.currentTerm === "string" ? data.currentTerm : "26-2";
        const members = Array.isArray(data.members)
          ? (data.members as Member[]).map((m) => ({
              ...m,
              grade: gradeFor(m.joinTerm, term),
            }))
          : initialMembers;
        const studentId = authUser.email?.split("@")[0];
        if (members.length === 0 && studentId) {
          const emptyState = {
            practices: Array.isArray(data.practices)
              ? (data.practices as Practice[])
              : seedPractices,
            members: [],
            currentTerm: term,
            copyFormats: { ...defaultCopyFormats, ...(data.copyFormats || {}) },
            educationSchedules: Array.isArray(data.educationSchedules)
              ? (data.educationSchedules as EducationSchedule[])
              : [],
            mentors: Array.isArray(data.mentors) ? (data.mentors as Mentor[]) : [],
          };
          cloudState.current = JSON.stringify(emptyState);
          setPractices(emptyState.practices);
          setClubMembers([]);
          setCurrentTerm(term);
          setCopyFormats(emptyState.copyFormats);
          setNeedsBootstrap(true);
          setReady(true);
          return;
        }
        const member = members.find((m) => m.id === studentId);
        if (!member) {
          if (registrationInProgress.current) return;
          setAccessError("등록된 회원이 아닙니다. 관리자에게 문의해주세요.");
          void signOut(auth);
          return;
        }
        const next = {
          practices: Array.isArray(data.practices)
            ? (data.practices as Practice[])
            : seedPractices,
          members,
          currentTerm: term,
          copyFormats: { ...defaultCopyFormats, ...(data.copyFormats || {}) },
          educationSchedules: Array.isArray(data.educationSchedules)
            ? (data.educationSchedules as EducationSchedule[])
            : [],
          mentors: Array.isArray(data.mentors) ? (data.mentors as Mentor[]) : [],
        };
        cloudState.current = JSON.stringify(next);
        setPractices(next.practices);
        setClubMembers(next.members);
        setCurrentTerm(next.currentTerm);
        setCopyFormats(next.copyFormats);
        setEducationSchedules(next.educationSchedules);
        setMentors(next.mentors);
        setSession(member);
        setReady(true);
      },
      () => {
        setAccessError(
          "공동 일정 데이터를 불러오지 못했어요. 다시 로그인한 뒤 시도해주세요.",
        );
        void signOut(auth);
      },
    );
  }, [authUser]);
  useEffect(() => {
    if (!ready || !authUser) return;
    const next = JSON.stringify({
      practices,
      members: clubMembers,
      currentTerm,
      copyFormats,
      educationSchedules,
      mentors,
    });
    if (cloudState.current === next) return;
    cloudState.current = next;
    void setDoc(doc(db, "clubs", "simgunghoe"), {
      practices,
      members: clubMembers,
      currentTerm,
      copyFormats,
    }).catch(() => {
      cloudState.current = "";
      setAccessError(
        "공동 데이터 저장에 실패했어요. 잠시 후 다시 시도해주세요.",
      );
    });
  }, [practices, clubMembers, currentTerm, copyFormats, educationSchedules, mentors, ready, authUser]);
  const finishBootstrap = async (member: Member) => {
    const next = { practices, members: [member], currentTerm, copyFormats, educationSchedules, mentors };
    try {
      await setDoc(doc(db, "clubs", "simgunghoe"), next);
      cloudState.current = JSON.stringify(next);
      setClubMembers([member]);
      setSession(member);
      setNeedsBootstrap(false);
    } catch {
      setAccessError(
        "첫 관리자 등록에 실패했어요. 다시 로그인한 뒤 시도해주세요.",
      );
      await signOut(auth);
    }
  };
  const registerMember = async ({
    studentId,
    password,
    name,
    joinTerm,
  }: {
    studentId: string;
    password: string;
    name: string;
    joinTerm: string;
  }) => {
    registrationInProgress.current = true;
    try {
      await createUserWithEmailAndPassword(
        auth,
        authEmail(studentId),
        password,
      );
      const clubDoc = doc(db, "clubs", "simgunghoe");
      const snapshot = await getDoc(clubDoc);
      if (!snapshot.exists()) throw new Error("club-not-ready");
      const data = snapshot.data();
      const term =
        typeof data.currentTerm === "string" ? data.currentTerm : "26-2";
      const existing = Array.isArray(data.members)
        ? (data.members as Member[])
        : [];
      if (existing.some((member) => member.id === studentId))
        throw new Error("duplicate-member");
      const member: Member = {
        id: studentId,
        name: name.trim(),
        joinTerm,
        grade: gradeFor(joinTerm, term),
        role: "회원",
        position: "",
      };
      await setDoc(
        clubDoc,
        { members: [...existing, member] },
        { merge: true },
      );
    } finally {
      registrationInProgress.current = false;
    }
  };
  const today = new Date();
  const visible = useMemo(
    () =>
      practices
        .filter((p) => {
          if (
            new Date(`${p.date}T${p.end || "23:59"}`).getTime() <
            today.getTime() - 24 * 60 * 60 * 1000
          )
            return false;
          if (filter === "regular" && p.type !== "regular") return false;
          if (filter === "general" && p.type !== "general") return false;
          if (filter === "competition" && p.type !== "competition")
            return false;
          return true;
        })
        .sort(
          (a, b) => (sort === "asc" ? 1 : -1) * a.date.localeCompare(b.date),
        ),
    [practices, filter, sort],
  );
  const nextPractice = useMemo(
    () =>
      practices
        .filter((p) => new Date(`${p.date}T23:59:59`) >= today)
        .sort((a, b) =>
          `${a.date}T${a.start}`.localeCompare(`${b.date}T${b.start}`),
        )[0],
    [practices],
  );
  const submitPublicQuestion = async (
    item: Omit<PublicQuestion, "id" | "status" | "createdAt">,
  ) => {
    await addDoc(collection(db, "clubs", "simgunghoe", "questions"), {
      ...item,
      status: "waiting",
      createdAt: new Date().toLocaleDateString("ko-KR"),
    });
  };
  if (authUser === undefined)
    return (
      <main className="login-screen">
        <p>심궁회 일정을 준비하고 있어요.</p>
      </main>
    );
  if (!authUser)
    return (
      <>
        {authOverlay ? (
          <LoginScreen
            error={accessError}
            onRegister={registerMember}
            initialMode={authOverlay}
            onClose={() => setAuthOverlay(null)}
          />
        ) : (
          <PublicPortal
            signedIn={false}
            onAuth={setAuthOverlay}
            scenes={publicScenes}
            posts={publicPosts}
            questions={publicQuestions}
            onQuestion={submitPublicQuestion}
          />
        )}
      </>
    );
  if (!ready)
    return (
      <main className="login-screen">
        <p>공동 일정을 불러오고 있어요.</p>
      </main>
    );
  if (needsBootstrap)
    return (
      <BootstrapAdmin
        studentId={authUser.email?.split("@")[0] || ""}
        onSave={(member) => {
          void finishBootstrap(member);
        }}
      />
    );
  const nextRegularRound =
    Math.max(
      0,
      ...practices.filter((p) => p.type === "regular").map((p) => p.round || 0),
    ) + 1;
  const nextLabel = nextPractice
    ? (() => {
        const eventDate = new Date(`${nextPractice.date}T12:00:00`);
        const diff = Math.round(
          (eventDate.getTime() - today.getTime()) / 86400000,
        );
        const [hour, minute] = nextPractice.start.split(":").map(Number);
        const time = `${hour < 12 ? "오전" : "오후"} ${hour > 12 ? hour - 12 : hour}${minute ? `:${String(minute).padStart(2, "0")}` : "시"}`;
        return `${diff === 0 ? "오늘" : diff === 1 ? "내일" : `${eventDate.getMonth() + 1}월 ${eventDate.getDate()}일`}, ${time}`;
      })()
    : "예정된 습사가 없어요";
  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 1900);
  };
  const copy = async (text: string, message = "공지 내용을 복사했어요") => {
    await navigator.clipboard.writeText(text);
    notify(message);
  };
  const toggleJoin = (id: number) => {
    if (session.grade === "예비신사" && !session.practicePermission) {
      notify("예비신사는 운영진이 습사 권한을 부여한 뒤 신청할 수 있어요");
      return;
    }
    const practice = practices.find((item) => item.id === id);
    if (practice?.applicants.includes(session.name)) {
      setCancelTarget(id);
      return;
    }
    if (
      practice &&
      practice.capacity > 0 &&
      practice.applicants.length >= practice.capacity
    ) {
      notify("정원이 모두 찼어요");
      return;
    }
    setPractices((all) =>
      all.map((p) =>
        p.id === id ? { ...p, applicants: [...p.applicants, session.name] } : p,
      ),
    );
    notify("참가 신청했어요");
  };
  const confirmCancellation = () => {
    if (cancelTarget === null) return;
    setPractices((all) =>
      all.map((p) =>
        p.id === cancelTarget
          ? {
              ...p,
              applicants: p.applicants.filter((name) => name !== session.name),
            }
          : p,
      ),
    );
    setCancelTarget(null);
    notify("신청을 취소했어요");
  };
  if (topTab === "public")
    return (
      <>
        <div className="top-switch">
          <button className="active" onClick={() => setTopTab("public")}>
            홍보
          </button>
          <button onClick={() => setTopTab("member")}>회원 전용</button>
        </div>
        <PublicPortal
          signedIn
          initialTab={promoStartTab}
          onAuth={() => undefined}
          onMember={() => setTopTab("member")}
          session={session}
          scenes={publicScenes}
          posts={publicPosts}
          questions={publicQuestions}
          onQuestion={submitPublicQuestion}
          onSaveScenes={(scenes) => {
            setPublicScenes(scenes);
            void setDoc(
              doc(db, "public", "simgunghoe"),
              { scenes },
              { merge: true },
            );
            notify("홍보 홈을 게시했어요");
          }}
          onSavePost={async (post, files) => {
            const urls: string[] = [];
            for (const file of files) {
              const target = ref(
                storage,
                `public-posts/${post.id}/${file.name}`,
              );
              await uploadBytes(target, file);
              urls.push(await getDownloadURL(target));
            }
            const nextPost = {
              ...post,
              cover: urls.find((_, i) => files[i]?.type.startsWith("image/")),
              media: urls,
            };
            const next = [nextPost, ...publicPosts];
            setPublicPosts(next);
            await setDoc(
              doc(db, "public", "simgunghoe"),
              { posts: next },
              { merge: true },
            );
            notify("게시물을 올렸어요");
          }}
          onDeletePost={(id) => {
            const next = publicPosts.filter((item) => item.id !== id);
            setPublicPosts(next);
            void setDoc(
              doc(db, "public", "simgunghoe"),
              { posts: next },
              { merge: true },
            );
            notify("게시물을 삭제했어요");
          }}
          onAnswer={(question, answer) => {
            const published = {
              ...question,
              status: "answered" as const,
              answer,
              answeredBy: session.position || session.name,
            };
            void setDoc(
              doc(db, "public", "simgunghoe", "qa", question.id),
              published,
            );
            void deleteDoc(
              doc(db, "clubs", "simgunghoe", "questions", question.id),
            );
            notify("답변을 공개했어요");
          }}
          onDiscard={(id) => {
            void deleteDoc(doc(db, "clubs", "simgunghoe", "questions", id));
            notify("질문을 폐기했어요");
          }}
        />
      </>
    );
  return (
    <main>
      <div className="top-switch">
        <button
          onClick={() => {
            setPromoStartTab("home");
            setTopTab("public");
          }}
        >
          홍보
        </button>
        <button className="active" onClick={() => setTopTab("member")}>
          회원 전용
        </button>
      </div>
      <header className="topbar">
        <a className="brand" href="#">
          <span className="brandmark">
            <img src="/hanyang-mark.png" alt="한양대학교 마크" />
          </span>
          <span>
            <b>심궁회</b>
            <small>습사 일정 관리</small>
          </span>
        </a>
        <div className="account">
          {(session.role === "관리자" || session.grade === "구사") &&
            publicQuestions.some((item) => item.status === "waiting") && (
              <button
                className="notification-bell"
                onClick={() => {
                  setPromoStartTab("qa");
                  setTopTab("public");
                }}
                aria-label={`답변 대기 질문 ${publicQuestions.filter((item) => item.status === "waiting").length}개`}
              >
                ♧
                <i>
                  {
                    publicQuestions.filter((item) => item.status === "waiting")
                      .length
                  }
                </i>
              </button>
            )}
          <button
            className="avatar profile-trigger"
            onClick={() => setProfileOpen(true)}
            aria-label="내 프로필 열기"
          >
            {session.name[0]}
          </button>
          <span className="account-copy">
            <b>{session.name}</b>
            <small>
              {session.role === "관리자" && session.position
                ? session.position
                : session.grade}{" "}
              · {session.role}
            </small>
          </span>
          <button className="logout" onClick={() => void signOut(auth)}>
            로그아웃
          </button>
        </div>
      </header>
      <section className="hero">
        <img
          className="hero-logo"
          src="/simkoong-heart.png"
          alt="심궁회 로고"
        />
        <div>
          <p className="eyebrow">한양대학교 국궁동아리</p>
          <h1>
            습사 <em>일정표</em>
          </h1>
          <p className="hero-copy">다가오는 습사를 확인하고 참여하세요.</p>
        </div>
        <button
          className="next-box"
          onClick={() => {
            if (nextPractice) {
              setView("cards");
              window.setTimeout(
                () =>
                  document
                    .getElementById(`practice-${nextPractice.id}`)
                    ?.scrollIntoView({ behavior: "smooth", block: "center" }),
                80,
              );
            }
          }}
        >
          <span>가장 가까운 습사</span>
          <strong>{nextLabel}</strong>
          <p>
            {nextPractice
              ? `${nextPractice.place} · ${nextPractice.title}`
              : "새 일정을 등록해주세요"}
          </p>
          <div className="progress">
            <i
              style={{
                width: nextPractice
                  ? `${Math.min(100, (nextPractice.applicants.length / (nextPractice.capacity > 0 ? nextPractice.capacity : 10)) * 100)}%`
                  : "0%",
              }}
            />
          </div>
          <small>
            {nextPractice
              ? `${nextPractice.applicants.length}명 신청 · ${nextPractice.capacity > 0 ? `${Math.max(0, nextPractice.capacity - nextPractice.applicants.length)}자리 남음` : "정원 제한 없음"}`
              : "등록된 일정 없음"}
          </small>
        </button>
      </section>
      <nav className="tabs" aria-label="하단 메뉴">
        <button
          className={view === "education" ? "active" : ""}
          onClick={() => setView("education")}
        >
          <span>✦</span>교육
        </button>
        <button
          className={view === "cards" ? "active" : ""}
          onClick={() => setView("cards")}
        >
          <span>⌂</span>습사
        </button>
        <button
          className={view === "calendar" ? "active" : ""}
          onClick={() => setView("calendar")}
        >
          <span>▦</span>달력
        </button>
        <button
          className={view === "members" ? "active" : ""}
          onClick={() => setView("members")}
        >
          <span>♙</span>회원
        </button>
      </nav>
      {view === "cards" && (
        <section className="content">
          <div className="section-head">
            <div>
              <h2>습사 일정</h2>
              <p>지난 습사는 종료 후 하루 동안 표시돼요.</p>
            </div>
            <button
              className="primary add-button"
              onClick={() => {
                if (
                  session.grade === "예비신사" &&
                  !session.practicePermission
                ) {
                  notify(
                    "예비신사는 운영진이 습사 권한을 부여한 뒤 일정을 추가할 수 있어요",
                  );
                  return;
                }
                setShowForm(true);
              }}
              aria-label="습사 등록"
            >
              <span aria-hidden="true">＋</span>
            </button>
          </div>
          <div className="toolbar">
            <div className="chips">
              <button
                className={filter === "all" ? "selected" : ""}
                onClick={() => setFilter("all")}
              >
                전체
              </button>
              <button
                className={filter === "regular" ? "selected" : ""}
                onClick={() => setFilter("regular")}
              >
                정규습사
              </button>
              <button
                className={filter === "general" ? "selected" : ""}
                onClick={() => setFilter("general")}
              >
                자유습사
              </button>
              <button
                className={filter === "competition" ? "selected" : ""}
                onClick={() => setFilter("competition")}
              >
                대회
              </button>
            </div>
            <button
              className="sort"
              onClick={() => setSort(sort === "asc" ? "desc" : "asc")}
            >
              습사일 {sort === "asc" ? "가까운 순 ↑" : "먼 순 ↓"}
            </button>
          </div>
          <div className="cards">
            {visible.map((p) => {
              const past = new Date(`${p.date}T${p.end || "23:59"}`) < today;
              const joined = p.applicants.includes(session.name);
              return (
                <article
                  id={`practice-${p.id}`}
                  key={p.id}
                  className={`card ${past ? "past" : ""} ${p.mandatory ? "mandatory" : ""}`}
                >
                  <div className="card-top">
                    <span className={`badge ${past ? "ended" : p.type}`}>
                      {past
                        ? "지난 습사"
                        : p.type === "regular"
                          ? "정규습사"
                          : p.type === "competition"
                            ? "대회"
                            : "자유습사"}
                    </span>
                    {p.mandatory && (
                      <span className="mandatory-badge">필수 참여</span>
                    )}
                    <div className="more-wrap">
                      <button
                        className="more-button"
                        onClick={() =>
                          setCardMenu(cardMenu === p.id ? null : p.id)
                        }
                        aria-label="게시물 더보기"
                      >
                        •••
                      </button>
                      {cardMenu === p.id && (
                        <div className="card-menu">
                          <button
                            onClick={() => {
                              const d = new Date(`${p.date}T12:00:00`);
                              copy(
                                copyFormats.reminder
                                  .replace(
                                    "{date}",
                                    `${d.getMonth() + 1}월 ${d.getDate()}일`,
                                  )
                                  .replace("{time}", `${p.start}~${p.end}`)
                                  .replace("{place}", p.place),
                                "일정 리마인드를 복사했어요",
                              );
                              setCardMenu(null);
                            }}
                          >
                            일정 리마인드 복사
                          </button>
                          <button
                            disabled={!p.applicants.length}
                            onClick={() => {
                              const d = new Date(`${p.date}T12:00:00`);
                              copy(
                                copyFormats.added
                                  .replace("{name}", p.applicants.at(-1) || "")
                                  .replace(
                                    "{date}",
                                    `${d.getMonth() + 1}월 ${d.getDate()}일`,
                                  ),
                                "최근 추가 인원을 복사했어요",
                              );
                              setCardMenu(null);
                            }}
                          >
                            인원 추가 복사
                          </button>
                          {(session.role === "관리자" ||
                            p.createdBy === session.id) && (
                            <>
                              <button
                                onClick={() => {
                                  setEditing(p);
                                  setCardMenu(null);
                                }}
                              >
                                일정 수정
                              </button>
                              <button
                                className="danger"
                                onClick={() => {
                                  if (
                                    window.confirm(
                                      `'${p.title}' 게시물을 삭제할까요?`,
                                    )
                                  ) {
                                    setPractices((all) =>
                                      all.filter((item) => item.id !== p.id),
                                    );
                                    notify("게시물을 삭제했어요");
                                  }
                                  setCardMenu(null);
                                }}
                              >
                                일정 삭제
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="date-block">
                    <b className="date-full">{koDate(p.date)}</b>
                  </div>
                  <h3>{p.title}</h3>
                  <p className="meta">
                    <span>
                      ◷ {p.start}–{p.end}
                    </span>
                    <span>⌖ {p.place}</span>
                    {p.type !== "general" &&
                      p.leader &&
                      p.leader !== "null" && <span>인솔: {p.leader}</span>}
                    <span>마감: {deadlineCardText(p.deadline)}</span>
                    {p.timeNote && <span>{p.timeNote}</span>}
                  </p>
                  {p.type === "regular" && p.timetable && (
                    <div className="card-timetable">
                      {p.timetable
                        .split("\n")
                        .filter(Boolean)
                        .map((item) => (
                          <span key={item}>{item}</span>
                        ))}
                    </div>
                  )}
                  {p.note && <p className="note">{p.note}</p>}
                  <button
                    className="people"
                    onClick={() => setParticipants(p)}
                    aria-label={`${p.title} 참여인원 보기`}
                  >
                    <div className="faces">
                      {p.applicants.slice(0, 4).map((n, i) => (
                        <span key={n} style={{ zIndex: 5 - i }}>
                          {n[0]}
                        </span>
                      ))}
                    </div>
                    <b>{p.applicants.length}명</b>
                    <small>
                      {p.capacity > 0 ? ` / ${p.capacity}명` : " · 제한 없음"}
                    </small>
                    <span className="people-arrow">›</span>
                  </button>
                  <div className="card-actions">
                    <button
                      className="copy"
                      onClick={() => copy(announcement(p, copyFormats))}
                    >
                      공지 복사
                    </button>
                    <button
                      className={joined ? "joined" : "join"}
                      disabled={past}
                      onClick={() => toggleJoin(p.id)}
                    >
                      {past ? "종료됨" : joined ? "신청 취소" : "참가 신청"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
          <button
            className="copy-all"
            onClick={() =>
              copy(
                visible
                  .map((practice) => announcement(practice, copyFormats))
                  .join("\n\n──────────\n\n"),
                "표시된 습사를 모두 복사했어요",
              )
            }
          >
            ▣ 현재 목록 전체 복사
          </button>
        </section>
      )}
      {view === "education" && (
        <Education
          schedules={educationSchedules}
          mentors={mentors}
          session={session}
          onSchedules={setEducationSchedules}
          onMentors={setMentors}
          notify={notify}
        />
      )}
      {view === "calendar" && (
        <Calendar
          practices={practices}
          onSelect={(id) => {
            setView("cards");
            window.setTimeout(
              () =>
                document
                  .getElementById(`practice-${id}`)
                  ?.scrollIntoView({ behavior: "smooth", block: "center" }),
              80,
            );
          }}
        />
      )}
      {view === "members" && (
        <Members
          members={clubMembers}
          session={session}
          currentTerm={currentTerm}
          onCurrentTermChange={(term) => {
            setCurrentTerm(term);
            setClubMembers((all) =>
              all.map((m) => ({ ...m, grade: gradeFor(m.joinTerm, term) })),
            );
            setSession((s) => ({ ...s, grade: gradeFor(s.joinTerm, term) }));
            notify(`현재 학기를 ${term}로 변경했어요`);
          }}
          onAddMember={(member) => {
            if (clubMembers.some((m) => m.id === member.id)) {
              notify("이미 등록된 학번이에요");
              return false;
            }
            setClubMembers((all) => [...all, member]);
            notify("회원을 등록했어요");
            return true;
          }}
          onUpdateMember={(member) => {
            setClubMembers((all) =>
              all.map((m) => (m.id === member.id ? member : m)),
            );
            if (session.id === member.id) setSession(member);
            notify("회원 정보를 수정했어요");
          }}
          onRoleChange={(id, role) => {
            const target = clubMembers.find((member) => member.id === id);
            if (
              role === "회원" &&
              clubMembers.filter((m) => m.role === "관리자").length === 1
            ) {
              notify("다른 관리자를 먼저 승급해주세요");
              return;
            }
            if (
              !window.confirm(
                `${target?.name || "해당 회원"}님을 ${role === "관리자" ? "관리자로 승급" : "관리자에서 해제"}할까요?`,
              )
            )
              return;
            const next = clubMembers.map((m) =>
              m.id === id
                ? { ...m, role, position: role === "회원" ? "" : m.position }
                : m,
            );
            setClubMembers(next);
            if (session.id === id)
              setSession({
                ...session,
                role,
                position: role === "회원" ? "" : session.position,
              });
            notify(
              role === "관리자"
                ? "관리자로 승급했어요"
                : "관리자 권한을 포기했어요",
            );
          }}
          onDeleteMember={(member) => {
            if (member.id === session.id) {
              notify("내 계정은 프로필에서 탈퇴해주세요");
              return;
            }
            if (
              member.role === "관리자" &&
              clubMembers.filter((m) => m.role === "관리자").length === 1
            ) {
              notify("마지막 관리자는 삭제할 수 없어요");
              return;
            }
            if (
              !window.confirm(`${member.name} 회원의 계정 데이터를 삭제할까요?`)
            )
              return;
            const remaining = clubMembers.filter(
              (item) => item.id !== member.id,
            );
            void setDoc(
              doc(db, "clubs", "simgunghoe"),
              { members: remaining },
              { merge: true },
            )
              .then(() => {
                setClubMembers(remaining);
                notify("회원 계정 데이터를 삭제했어요");
              })
              .catch(() =>
                notify("회원 삭제에 실패했어요. 다시 시도해주세요."),
              );
          }}
        />
      )}
      {participants && (
        <Participants
          practice={participants}
          members={clubMembers}
          onClose={() => setParticipants(null)}
        />
      )}
      {cancelTarget !== null && (
        <div
          className="modal-back cancel-confirm"
          role="dialog"
          aria-modal="true"
        >
          <section className="modal confirm-card">
            <p>정말 취소하시겠어요? 😢</p>
            <div className="modal-actions">
              <button onClick={() => setCancelTarget(null)}>아니오</button>
              <button className="primary" onClick={confirmCancellation}>
                네
              </button>
            </div>
          </section>
        </div>
      )}
      {profileOpen && (
        <ProfilePanel
          member={session}
          currentTerm={currentTerm}
          copyFormats={copyFormats}
          onFormats={setCopyFormats}
          onClose={() => setProfileOpen(false)}
          onSave={(updated) => {
            setSession(updated);
            setClubMembers((all) =>
              all.map((m) => (m.id === updated.id ? updated : m)),
            );
            notify("회원 정보를 저장했어요");
          }}
          onRelinquish={() => {
            if (clubMembers.filter((m) => m.role === "관리자").length === 1) {
              notify("다른 관리자를 먼저 승급해주세요");
              return;
            }
            const updated = {
              ...session,
              role: "회원" as const,
              position: "" as const,
            };
            setSession(updated);
            setClubMembers((all) =>
              all.map((m) => (m.id === updated.id ? updated : m)),
            );
            setProfileOpen(false);
            notify("관리자 권한과 운영진 역할을 포기했어요");
          }}
          onWithdraw={async () => {
            if (
              !window.confirm(
                "정말 탈퇴할까요? 회원 정보와 일정표 접근 권한이 삭제됩니다.",
              )
            )
              return;
            const remaining = clubMembers.filter((m) => m.id !== session.id);
            if (
              session.role === "관리자" &&
              !remaining.some((m) => m.role === "관리자")
            ) {
              notify("다른 관리자를 먼저 승급해주세요");
              return;
            }
            await setDoc(
              doc(db, "clubs", "simgunghoe"),
              { members: remaining },
              { merge: true },
            );
            try {
              if (auth.currentUser) await deleteUser(auth.currentUser);
            } catch {
              /* 회원 기록 삭제 후에는 일정표 접근이 차단됩니다. */
            }
            await signOut(auth);
          }}
        />
      )}
      {(showForm || editing) && (
        <PracticeForm
          initial={editing || undefined}
          nextRegularRound={nextRegularRound}
          onClose={() => {
            setShowForm(false);
            setEditing(null);
          }}
          onSave={(p) => {
            if (editing) {
              setPractices((v) =>
                v.map((item) =>
                  item.id === editing.id
                    ? { ...item, ...p, updated: ["습사 정보가 수정되었습니다"] }
                    : item,
                ),
              );
              notify("습사 내용을 수정했어요");
            } else {
              setPractices((v) => [
                ...v,
                { ...p, id: Date.now(), applicants: [], createdBy: session.id },
              ]);
              notify("새 습사를 등록했어요");
            }
            setShowForm(false);
            setEditing(null);
          }}
        />
      )}
      {toast && <div className="toast">✓ {toast}</div>}
    </main>
  );
}

function ProfilePanel({
  member,
  currentTerm,
  copyFormats,
  onFormats,
  onClose,
  onSave,
  onRelinquish,
  onWithdraw,
}: {
  member: Member;
  currentTerm: string;
  copyFormats: CopyFormats;
  onFormats: (v: CopyFormats) => void;
  onClose: () => void;
  onSave: (m: Member) => void;
  onRelinquish: () => void;
  onWithdraw: () => Promise<void>;
}) {
  const [tab, setTab] = useState<"info" | "admin">("info");
  const [draft, setDraft] = useState(member);
  return (
    <div
      className="modal-back"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <section className="modal profile-sheet">
        <div className="modal-head">
          <div>
            <p className="eyebrow">내 프로필</p>
            <h2>{member.name}</h2>
          </div>
          <button onClick={onClose}>×</button>
        </div>
        <div className="profile-tabs">
          <button
            className={tab === "info" ? "active" : ""}
            onClick={() => setTab("info")}
          >
            회원 정보 수정
          </button>
          <button
            className={tab === "admin" ? "active" : ""}
            onClick={() => setTab("admin")}
          >
            관리자 권한
          </button>
        </div>
        {tab === "info" ? (
          <div className="profile-body">
            <label>
              이름
              <input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </label>
            <label>
              입부 학기
              <input
                value={draft.joinTerm}
                pattern="[0-9]{2}-[12]"
                onChange={(e) =>
                  setDraft({ ...draft, joinTerm: e.target.value })
                }
              />
            </label>
            <button
              className="sheet-close"
              onClick={() =>
                onSave({
                  ...draft,
                  grade: gradeFor(draft.joinTerm, currentTerm),
                })
              }
            >
              정보 저장
            </button>
          </div>
        ) : (
          <div className="profile-body">
            {member.role === "관리자" ? (
              <>
                <label>
                  운영진 역할
                  <select
                    value={draft.position || ""}
                    onChange={(e) => {
                      const updated = {
                        ...draft,
                        position: e.target.value as Member["position"],
                      };
                      setDraft(updated);
                      onSave(updated);
                    }}
                  >
                    <option value="">역할 없음</option>
                    {["대표", "부대표", "교육팀장", "장비팀장", "홍보팀장"].map(
                      (v) => (
                        <option key={v}>{v}</option>
                      ),
                    )}
                  </select>
                </label>
                <label>
                  일정 리마인드 형식
                  <textarea
                    value={copyFormats.reminder}
                    onChange={(e) =>
                      onFormats({ ...copyFormats, reminder: e.target.value })
                    }
                  />
                  <small className="field-help">
                    사용 가능: {"{date} {time} {place}"}
                  </small>
                </label>
                <label>
                  인원 추가 형식
                  <textarea
                    value={copyFormats.added}
                    onChange={(e) =>
                      onFormats({ ...copyFormats, added: e.target.value })
                    }
                  />
                  <small className="field-help">
                    사용 가능: {"{name} {date}"}
                  </small>
                </label>
                <label>
                  정규습사 공지 형식
                  <textarea
                    value={copyFormats.announcementRegular}
                    onChange={(e) =>
                      onFormats({
                        ...copyFormats,
                        announcementRegular: e.target.value,
                      })
                    }
                  />
                </label>
                <label>
                  자유습사 공지 형식
                  <textarea
                    value={copyFormats.announcementGeneral}
                    onChange={(e) =>
                      onFormats({
                        ...copyFormats,
                        announcementGeneral: e.target.value,
                      })
                    }
                  />
                </label>
                <label>
                  대회 공지 형식
                  <textarea
                    value={copyFormats.announcementCompetition}
                    onChange={(e) =>
                      onFormats({
                        ...copyFormats,
                        announcementCompetition: e.target.value,
                      })
                    }
                  />
                  <small className="field-help">
                    사용 가능:{" "}
                    {
                      "{title} {date} {start} {end} {place} {leader} {deadline} {timetable} {applicants} {note}"
                    }
                  </small>
                </label>
                <button className="relinquish" onClick={onRelinquish}>
                  관리자 권한 포기
                </button>
              </>
            ) : (
              <p className="empty-list">현재 관리자 권한이 없습니다.</p>
            )}
          </div>
        )}
        {tab === "info" && (
          <button
            className="relinquish withdraw"
            onClick={() => void onWithdraw()}
          >
            계정 탈퇴
          </button>
        )}
      </section>
    </div>
  );
}

function Participants({
  practice,
  members,
  onClose,
}: {
  practice: Practice;
  members: Member[];
  onClose: () => void;
}) {
  return (
    <div
      className="modal-back"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <section className="modal participant-sheet">
        <div className="modal-head">
          <div>
            <p className="eyebrow">{practice.title}</p>
            <h2>참여인원 {practice.applicants.length}명</h2>
          </div>
          <button onClick={onClose}>×</button>
        </div>
        <div className="participant-list">
          {practice.applicants.length ? (
            practice.applicants.map((name, index) => {
              const member = members.find((m) => m.name === name);
              return (
                <div key={`${name}-${index}`}>
                  <span className="avatar">{name[0]}</span>
                  <div>
                    <b>{name}</b>
                    <small>
                      {member?.role === "관리자" && member.position
                        ? member.position
                        : member?.grade || "회원"}
                    </small>
                  </div>
                  <span>{index + 1}</span>
                </div>
              );
            })
          ) : (
            <p className="empty-list">아직 신청한 인원이 없어요.</p>
          )}
        </div>
        <button className="sheet-close" onClick={onClose}>
          확인
        </button>
      </section>
    </div>
  );
}

function Education({
  schedules,
  mentors,
  session,
  onSchedules,
  onMentors,
  notify,
}: {
  schedules: EducationSchedule[];
  mentors: Mentor[];
  session: Member;
  onSchedules: (value: EducationSchedule[]) => void;
  onMentors: (value: Mentor[]) => void;
  notify: (message: string) => void;
}) {
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [openSchedule, setOpenSchedule] = useState<EducationSchedule | null>(null);
  const [showMentorForm, setShowMentorForm] = useState(false);
  const canManageSchedule =
    session.role === "관리자" || session.position === "교육팀장";
  const canUseMentoring = session.grade !== "예비신사";
  const mine = mentors.find((mentor) => mentor.memberId === session.id);
  const myMentor = mentors.find((mentor) => mentor.mentees.includes(session.id));
  return (
    <section className="content education-page">
      <div className="section-head">
        <div>
          <h2>교육</h2>
        </div>
      </div>
      <section className="education-section">
        <div className="education-title-row">
          <div>
            <p className="list-label">교육 시간표</p>
            <span>교육팀 가능 시간과 예비신사 신청 현황</span>
          </div>
          {canManageSchedule && (
            <button className="primary compact" onClick={() => setShowScheduleForm(true)}>
              시간표 추가
            </button>
          )}
        </div>
        <div className="education-cards">
          {schedules.length ? (
            schedules
              .slice()
              .sort((a, b) => a.startDate.localeCompare(b.startDate))
              .map((schedule) => (
                <button
                  className="education-schedule-card"
                  key={schedule.id}
                  onClick={() => setOpenSchedule(schedule)}
                >
                  <b>{shortScheduleLabel(schedule)}</b>
                  <span>시간표 열기 ›</span>
                </button>
              ))
          ) : (
            <p className="education-empty">등록된 교육 시간표가 없어요.</p>
          )}
        </div>
      </section>
      <section className="education-section mentorship-section">
        <div className="education-title-row">
          <div>
            <p className="list-label">도제 프로그램</p>
            <span>원하는 선배에게 선착순으로 멘티를 신청하세요.</span>
          </div>
          {canUseMentoring && !mine && (
            <button className="outline compact" onClick={() => setShowMentorForm(true)}>
              멘토 신청
            </button>
          )}
        </div>
        {!canUseMentoring && (
          <p className="education-empty">도제 프로그램은 신사부터 참여할 수 있어요.</p>
        )}
        {canUseMentoring && myMentor && (
          <p className="my-mentor">내 멘토 · {myMentor.name} ({myMentor.side})</p>
        )}
        <div className="mentor-grid">
          {mentors.map((mentor) => {
            const isMine = mentor.memberId === session.id;
            const isMentee = mentor.mentees.includes(session.id);
            const full = mentor.mentees.length >= mentor.capacity;
            return (
              <article className="mentor-card" key={mentor.memberId}>
                <div>
                  <b>{mentor.name}</b>
                  <span>{mentor.side}</span>
                </div>
                <p>자주 가는 활터 · {mentor.range}</p>
                <small>멘티 {mentor.mentees.length} / {mentor.capacity}명</small>
                {isMine ? (
                  <button
                    className="text-button"
                    onClick={() => setShowMentorForm(true)}
                  >
                    내 멘토 정보 수정
                  </button>
                ) : isMentee ? (
                  <button
                    className="outline"
                    onClick={() => {
                      onMentors(mentors.map((item) => item.memberId === mentor.memberId ? { ...item, mentees: item.mentees.filter((id) => id !== session.id) } : item));
                      notify("멘티 신청을 취소했어요");
                    }}
                  >멘티 신청 취소</button>
                ) : (
                  <button
                    className="primary"
                    disabled={Boolean(myMentor) || full}
                    onClick={() => {
                      if (myMentor) return;
                      onMentors(mentors.map((item) => item.memberId === mentor.memberId ? { ...item, mentees: [...item.mentees, session.id] } : item));
                      notify(`${mentor.name} 멘토에게 신청했어요`);
                    }}
                  >{full ? "모집 마감" : "멘티 신청"}</button>
                )}
              </article>
            );
          })}
          {canUseMentoring && !mentors.length && <p className="education-empty">아직 신청한 멘토가 없어요.</p>}
        </div>
      </section>
      {showScheduleForm && (
        <ScheduleForm
          session={session}
          onClose={() => setShowScheduleForm(false)}
          onSave={(schedule) => {
            onSchedules([...schedules, schedule]);
            setShowScheduleForm(false);
            notify("교육 시간표를 등록했어요");
          }}
        />
      )}
      {openSchedule && (
        <ScheduleSheet
          schedule={openSchedule}
          session={session}
          canManage={canManageSchedule}
          onClose={() => setOpenSchedule(null)}
          onSave={(next) => {
            onSchedules(schedules.map((item) => item.id === next.id ? next : item));
            setOpenSchedule(next);
          }}
          onDelete={() => {
            onSchedules(schedules.filter((item) => item.id !== openSchedule.id));
            setOpenSchedule(null);
            notify("교육 시간표를 폐기했어요");
          }}
        />
      )}
      {showMentorForm && (
        <MentorForm
          initial={mine}
          session={session}
          onClose={() => setShowMentorForm(false)}
          onSave={(mentor) => {
            onMentors(mine ? mentors.map((item) => item.memberId === mentor.memberId ? mentor : item) : [...mentors, mentor]);
            setShowMentorForm(false);
            notify(mine ? "멘토 정보를 수정했어요" : "멘토 신청을 완료했어요");
          }}
        />
      )}
    </section>
  );
}

const educationTimes = Array.from({ length: 16 }, (_, index) => {
  const minutes = 10 * 60 + index * 30;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
});
const dateKey = (date: Date) => date.toISOString().slice(0, 10);
const mondayOf = (source: Date) => {
  const date = new Date(source.getFullYear(), source.getMonth(), source.getDate());
  const offset = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - offset);
  return date;
};
const weekDates = (startDate: string) => {
  const start = new Date(`${startDate}T12:00:00`);
  return Array.from({ length: 5 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
};
const shortScheduleLabel = (schedule: EducationSchedule) => {
  const start = new Date(`${schedule.startDate}T12:00:00`);
  const end = new Date(`${schedule.endDate}T12:00:00`);
  return `${start.getMonth() + 1}/${start.getDate()}~${end.getMonth() + 1}/${end.getDate()} 시간표`;
};
const slotKey = (date: string, time: string) => `${date}_${time}`;

function ScheduleForm({
  session,
  onClose,
  onSave,
}: {
  session: Member;
  onClose: () => void;
  onSave: (schedule: EducationSchedule) => void;
}) {
  const [startDate, setStartDate] = useState(dateKey(mondayOf(new Date())));
  const [place, setPlace] = useState("");
  return (
    <div className="modal-back">
      <section className="modal education-modal">
        <div className="modal-head"><div><p className="eyebrow">교육 시간표</p><h2>시간표 추가</h2></div><button onClick={onClose}>×</button></div>
        <label>시작일 (월요일)<input type="date" value={startDate} onChange={(e) => setStartDate(dateKey(mondayOf(new Date(`${e.target.value}T12:00:00`))))} /></label>
        <label>장소<input value={place} onChange={(e) => setPlace(e.target.value)} placeholder="예: 동아리방" required /></label>
        <p className="form-hint">월~금, 10:00~18:00의 30분 단위 시간표가 생성됩니다.</p>
        <button className="primary" disabled={!place.trim()} onClick={() => {
          const start = new Date(`${startDate}T12:00:00`); const end = new Date(start); end.setDate(start.getDate() + 4);
          onSave({ id: String(Date.now()), startDate, endDate: dateKey(end), place: place.trim(), slots: {}, createdBy: session.id });
        }}>시간표 만들기</button>
      </section>
    </div>
  );
}

function ScheduleSheet({
  schedule,
  session,
  canManage,
  onClose,
  onSave,
  onDelete,
}: {
  schedule: EducationSchedule;
  session: Member;
  canManage: boolean;
  onClose: () => void;
  onSave: (schedule: EducationSchedule) => void;
  onDelete: () => void;
}) {
  const dates = weekDates(schedule.startDate);
  const isPreliminary = session.grade === "예비신사";
  const toggle = (date: string, time: string) => {
    const key = slotKey(date, time);
    const current = schedule.slots[key] || { educators: [], learners: [] };
    const isEducator = canManage && !isPreliminary;
    const field = isEducator ? "educators" : "learners";
    if (!isEducator && !isPreliminary) return;
    if (!isEducator && current.educators.length === 0) return;
    const values = current[field];
    const nextValues = values.includes(session.name) ? values.filter((name) => name !== session.name) : [...values, session.name];
    onSave({ ...schedule, slots: { ...schedule.slots, [key]: { ...current, [field]: nextValues } } });
  };
  return (
    <div className="modal-back">
      <section className="modal schedule-sheet">
        <div className="modal-head"><div><p className="eyebrow">{shortScheduleLabel(schedule)}</p><h2>{schedule.place}</h2></div><button onClick={onClose}>×</button></div>
        <div className="schedule-legend"><span className="educator">교육팀</span><span className="learner">예비신사</span></div>
        <div className="weekly-table-wrap"><table className="weekly-table"><thead><tr><th>시간</th><th>구분</th>{dates.map((date) => <th key={dateKey(date)}>{date.getMonth() + 1}/{date.getDate()}<small>({"월화수목금"[date.getDay() - 1]})</small></th>)}</tr></thead><tbody>{educationTimes.map((time) => <Fragment key={time}><tr><th rowSpan={2}>{time} - {addThirty(time)}</th><th className="educator">교육팀</th>{dates.map((date) => { const key = slotKey(dateKey(date), time); const slot = schedule.slots[key]; return <td key={key} className="educator-cell"><button onClick={() => toggle(dateKey(date), time)} disabled={!canManage || isPreliminary}>{slot?.educators.join("\n") || (canManage && !isPreliminary ? "+" : "")}</button></td>; })}</tr><tr><th className="learner">예비신사</th>{dates.map((date) => { const key = slotKey(dateKey(date), time); const slot = schedule.slots[key]; return <td key={key} className="learner-cell"><button onClick={() => toggle(dateKey(date), time)} disabled={!isPreliminary || !slot?.educators.length}>{slot?.learners.join("\n") || ""}</button></td>; })}</tr></Fragment>)}</tbody></table></div>
        {canManage && <button className="danger-button" onClick={() => { if (window.confirm("이 시간표를 폐기할까요?")) onDelete(); }}>시간표 폐기</button>}
      </section>
    </div>
  );
}

function MentorForm({ initial, session, onClose, onSave }: { initial?: Mentor; session: Member; onClose: () => void; onSave: (mentor: Mentor) => void }) {
  const [side, setSide] = useState<Mentor["side"]>(initial?.side || "좌궁");
  const [range, setRange] = useState(initial?.range || "");
  const [capacity, setCapacity] = useState(initial?.capacity || 1);
  return <div className="modal-back"><section className="modal education-modal"><div className="modal-head"><div><p className="eyebrow">도제 프로그램</p><h2>{initial ? "멘토 정보 수정" : "멘토 신청"}</h2></div><button onClick={onClose}>×</button></div><label>좌궁 / 우궁<select value={side} onChange={(e) => setSide(e.target.value as Mentor["side"])}><option>좌궁</option><option>우궁</option></select></label><label>자주 가는 활터<input value={range} onChange={(e) => setRange(e.target.value)} placeholder="예: 난지국궁장" /></label><label>최대 멘티 수<input type="number" min="1" max="20" value={capacity} onChange={(e) => setCapacity(Math.max(1, Number(e.target.value)))} /></label><button className="primary" disabled={!range.trim()} onClick={() => onSave({ memberId: session.id, name: session.name, side, range: range.trim(), capacity, mentees: initial?.mentees || [] })}>{initial ? "저장" : "멘토로 신청하기"}</button></section></div>;
}

function addThirty(time: string) {
  const [hour, minute] = time.split(":").map(Number);
  const total = hour * 60 + minute + 30;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function Calendar({
  practices,
  onSelect,
}: {
  practices: Practice[];
  onSelect: (id: number) => void;
}) {
  const [month, setMonth] = useState(new Date(2026, 8, 1));
  const year = month.getFullYear();
  const monthNumber = month.getMonth();
  const firstDay = new Date(year, monthNumber, 1).getDay();
  const lastDate = new Date(year, monthNumber + 1, 0).getDate();
  const days = Array.from({ length: 42 }, (_, i) => i - firstDay + 1);
  return (
    <section className="content calendar-wrap">
      <div className="section-head">
        <div>
          <h2>
            {year}년 {monthNumber + 1}월
          </h2>
          <p>날짜별 습사 일정을 확인하세요.</p>
        </div>
        <div className="month-nav">
          <button onClick={() => setMonth(new Date(year, monthNumber - 1, 1))}>
            ‹
          </button>
          <button onClick={() => setMonth(new Date(2026, 8, 1))}>오늘</button>
          <button onClick={() => setMonth(new Date(year, monthNumber + 1, 1))}>
            ›
          </button>
        </div>
      </div>
      <div className="calendar">
        <div className="week">
          {"일월화수목금토".split("").map((d) => (
            <b key={d}>{d}</b>
          ))}
        </div>
        <div className="days">
          {days.map((d, i) => {
            const key = `${year}-${String(monthNumber + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
            const p = practices.find((x) => x.date === key);
            return (
              <div key={i} className={key === "2026-09-11" ? "today" : ""}>
                {d > 0 && d <= lastDate && (
                  <>
                    <span>{d}</span>
                    {p && (
                      <button className={p.type} onClick={() => onSelect(p.id)}>
                        {p.start}
                        <br />
                        {p.title}
                      </button>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
function Members({
  members,
  session,
  currentTerm,
  onCurrentTermChange,
  onAddMember,
  onUpdateMember,
  onRoleChange,
  onDeleteMember,
}: {
  members: Member[];
  session: Member;
  currentTerm: string;
  onCurrentTermChange: (term: string) => void;
  onAddMember: (member: Member) => boolean;
  onUpdateMember: (member: Member) => void;
  onRoleChange: (id: string, role: Member["role"]) => void;
  onDeleteMember: (member: Member) => void;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [termYear, termSemester] = currentTerm.split("-").map(Number);
  const moveTerm = (direction: 1 | -1) => {
    const nextSemester = termSemester + direction;
    const nextYear =
      nextSemester === 3
        ? termYear + 1
        : nextSemester === 0
          ? termYear - 1
          : termYear;
    onCurrentTermChange(
      `${String(Math.max(0, nextYear)).padStart(2, "0")}-${nextSemester === 3 ? 1 : nextSemester === 0 ? 2 : nextSemester}`,
    );
  };
  return (
    <section className="content">
      <div className="section-head">
        <div>
          <h2>
            회원 <span className="member-count">{members.length}명</span>
          </h2>
        </div>
        {session.role === "관리자" && (
          <button
            className="primary add-button"
            onClick={() => setShowAdd(true)}
            aria-label="회원 등록"
          >
            <span>＋</span>
          </button>
        )}
      </div>
      <div className="term-setting">
        <div>
          <b>현재 학기</b>
        </div>
        {session.role === "관리자" ? (
          <div className="term-stepper" aria-label="현재 학기 설정">
            <b>{currentTerm}</b>
            <span className="term-controls">
              <button onClick={() => moveTerm(1)} aria-label="다음 학기">
                +
              </button>
              <button onClick={() => moveTerm(-1)} aria-label="이전 학기">
                −
              </button>
            </span>
          </div>
        ) : (
          <strong>{currentTerm}</strong>
        )}
      </div>
      <div className="member-list">
        {members.map((m) => (
          <div key={m.id}>
            <span className="avatar">{m.name[0]}</span>
            <div>
              <b>{m.name}</b>
              <small>
                {session.role === "관리자" && <>{m.id} · </>}
                {m.joinTerm} 입부
              </small>
            </div>
            <span className="grade">
              {m.role === "관리자" && m.position ? m.position : m.grade}
            </span>
            <span className="role">{m.role}</span>
            {session.role === "관리자" && (
              <div className="member-actions">
                <button onClick={() => setEditingMember(m)}>정보 수정</button>
                <button
                  onClick={() =>
                    onRoleChange(m.id, m.role === "관리자" ? "회원" : "관리자")
                  }
                >
                  {m.role === "관리자"
                    ? m.id === session.id
                      ? "권한 포기"
                      : "관리자 해제"
                    : "관리자 승급"}
                </button>
                <button className="danger" onClick={() => onDeleteMember(m)}>
                  계정 삭제
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
      {showAdd && (
        <MemberForm
          currentTerm={currentTerm}
          onClose={() => setShowAdd(false)}
          onSave={(member) => {
            if (onAddMember(member)) setShowAdd(false);
          }}
        />
      )}
      {editingMember && (
        <MemberForm
          initial={editingMember}
          currentTerm={currentTerm}
          onClose={() => setEditingMember(null)}
          onSave={(member) => {
            onUpdateMember(member);
            setEditingMember(null);
          }}
        />
      )}
    </section>
  );
}
function MemberForm({
  initial,
  currentTerm,
  onClose,
  onSave,
}: {
  initial?: Member;
  currentTerm: string;
  onClose: () => void;
  onSave: (member: Member) => void;
}) {
  const [joinTerm, setJoinTerm] = useState(initial?.joinTerm || currentTerm);
  const grade = /^\d{2}-[12]$/.test(joinTerm)
    ? gradeFor(joinTerm, currentTerm)
    : "예비신사";
  return (
    <div
      className="modal-back"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <form
        className="modal member-form"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          onSave({
            id: String(f.get("id")),
            name: String(f.get("name")),
            joinTerm,
            grade,
            role: initial?.role || "회원",
            position: initial?.position || "",
          });
        }}
      >
        <div className="modal-head">
          <div>
            <p className="eyebrow">회원 관리</p>
            <h2>{initial ? "회원 정보 수정" : "새 회원 등록"}</h2>
          </div>
          <button type="button" onClick={onClose}>
            ×
          </button>
        </div>
        <label>
          이름
          <input
            name="name"
            required
            placeholder="홍길동"
            defaultValue={initial?.name}
          />
        </label>
        <label>
          학번
          <input
            name="id"
            required
            inputMode="numeric"
            pattern="[0-9]+"
            placeholder="2026123456"
            defaultValue={initial?.id}
            readOnly={Boolean(initial)}
          />
        </label>
        <label>
          입부 학기
          <input
            required
            value={joinTerm}
            onChange={(e) => setJoinTerm(e.target.value)}
            pattern="[0-9]{2}-[12]"
            placeholder="26-2"
          />
          <small className="field-help">
            연도-학기 형식으로 입력해주세요. 예: 26-2
          </small>
        </label>
        <div className="grade-preview">
          <span>자동 지정 등급</span>
          <b>{grade}</b>
          <small>현재 학기 {currentTerm} 기준</small>
        </div>
        <div className="modal-actions">
          <button type="button" onClick={onClose}>
            취소
          </button>
          <button className="primary">
            {initial ? "수정 완료" : "등록하기"}
          </button>
        </div>
      </form>
    </div>
  );
}

const halfHourTimes = Array.from(
  { length: 48 },
  (_, index) =>
    `${String(Math.floor(index / 2)).padStart(2, "0")}:${index % 2 ? "30" : "00"}`,
);
function TimeSelect({
  name,
  value,
  onChange,
}: {
  name?: string;
  value: string;
  onChange?: (value: string) => void;
}) {
  return onChange ? (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      {halfHourTimes.map((time) => (
        <option key={time}>{time}</option>
      ))}
    </select>
  ) : (
    <select name={name} defaultValue={value}>
      {halfHourTimes.map((time) => (
        <option key={time}>{time}</option>
      ))}
    </select>
  );
}
const timetableItems = (timetable?: string) => {
  const parsed = (timetable || "")
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^(\d{1,2}:\d{2})\s*(.*)$/);
      return {
        time: match?.[1]?.padStart(5, "0") || "09:00",
        content: match?.[2] || line,
      };
    });
  return parsed.length ? parsed : [{ time: "09:00", content: "" }];
};
function PracticeForm({
  initial,
  nextRegularRound,
  onClose,
  onSave,
}: {
  initial?: Practice;
  nextRegularRound: number;
  onClose: () => void;
  onSave: (p: Omit<Practice, "id" | "applicants">) => void;
}) {
  const [type, setType] = useState<"regular" | "general" | "competition">(
    initial?.type || "general",
  );
  const [unlimited, setUnlimited] = useState(initial?.capacity === 0);
  const [mandatory, setMandatory] = useState(initial?.mandatory || false);
  const [scheduleItems, setScheduleItems] = useState(() =>
    timetableItems(initial?.timetable),
  );
  const localToday = new Date();
  const todayDate = `${localToday.getFullYear()}-${String(localToday.getMonth() + 1).padStart(2, "0")}-${String(localToday.getDate()).padStart(2, "0")}`;
  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const base = {
      type,
      title:
        type === "regular"
          ? `정규습사 ${String(f.get("round") || nextRegularRound)}회차`
          : type === "competition"
            ? "대회"
            : "자유 습사",
      date: String(f.get("date")),
      start: String(f.get("start")),
      end: String(f.get("end")),
      place: String(f.get("place")),
      deadline: `${String(f.get("deadlineDate"))}T${String(f.get("deadlineTime"))}`,
      capacity: unlimited ? 0 : Number(f.get("capacity")),
      mandatory,
      note: String(f.get("note")),
      timetable:
        type === "regular"
          ? scheduleItems
              .filter((item) => item.content.trim())
              .map((item) => `${item.time} ${item.content.trim()}`)
              .join("\n")
          : "",
    };
    onSave(
      type === "regular"
        ? {
            ...base,
            round: Number(f.get("round")),
            leader: String(f.get("leader") || "").trim(),
          }
        : base,
    );
  };
  return (
    <div
      className="modal-back"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <form className="modal practice-form" onSubmit={submit}>
        <div className="modal-head">
          <div>
            <p className="eyebrow">{initial ? "일정 관리" : "새 일정"}</p>
            <h2>{initial ? "습사 수정" : "습사 등록"}</h2>
          </div>
          <button type="button" onClick={onClose}>
            ×
          </button>
        </div>
        <label>
          습사 종류
          <div className="type-select">
            <button
              type="button"
              className={type === "regular" ? "active" : ""}
              onClick={() => setType("regular")}
            >
              정규습사
            </button>
            <button
              type="button"
              className={type === "general" ? "active" : ""}
              onClick={() => setType("general")}
            >
              자유습사
            </button>
            <button
              type="button"
              className={type === "competition" ? "active" : ""}
              onClick={() => setType("competition")}
            >
              대회
            </button>
          </div>
        </label>
        <label>
          참여 구분
          <div className="attendance-select">
            <button
              type="button"
              className={mandatory ? "active required" : ""}
              onClick={() => setMandatory(true)}
            >
              필수 참여
            </button>
            <button
              type="button"
              className={!mandatory ? "active" : ""}
              onClick={() => setMandatory(false)}
            >
              자유 참여
            </button>
          </div>
        </label>
        {type === "regular" && (
          <div className="form-row">
            <label>
              회차
              <input
                name="round"
                type="number"
                min="1"
                defaultValue={initial?.round || nextRegularRound}
              />
            </label>
          </div>
        )}
        <div className="form-row three">
          <label>
            날짜
            <input
              name="date"
              type="date"
              required
              defaultValue={initial?.date || todayDate}
            />
          </label>
          <label>
            시작
            <TimeSelect name="start" value={initial?.start || "14:00"} />
          </label>
          <label>
            종료
            <TimeSelect name="end" value={initial?.end || "16:00"} />
          </label>
        </div>
        <div className="form-row">
          <label>
            장소
            <input name="place" required defaultValue={initial?.place || ""} />
          </label>
          {type === "regular" && (
            <label>
              인솔자
              <input name="leader" defaultValue={initial?.leader || ""} />
            </label>
          )}
        </div>
        {type === "regular" && (
          <div className="timetable-editor">
            <b>시간별 일정</b>
            {scheduleItems.map((item, index) => (
              <div className="timetable-item" key={index}>
                <TimeSelect
                  value={item.time}
                  onChange={(time) =>
                    setScheduleItems((all) =>
                      all.map((current, i) =>
                        i === index ? { ...current, time } : current,
                      ),
                    )
                  }
                />
                <input
                  value={item.content}
                  onChange={(e) =>
                    setScheduleItems((all) =>
                      all.map((current, i) =>
                        i === index
                          ? { ...current, content: e.target.value }
                          : current,
                      ),
                    )
                  }
                  placeholder="내용 입력"
                />
                {scheduleItems.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      setScheduleItems((all) =>
                        all.filter((_, i) => i !== index),
                      )
                    }
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              className="timetable-add"
              onClick={() =>
                setScheduleItems((all) => [
                  ...all,
                  { time: all.at(-1)?.time || "09:00", content: "" },
                ])
              }
            >
              ＋
            </button>
          </div>
        )}
        <div className="form-row">
          <label>
            신청 마감
            <div className="deadline-inputs">
              <input
                name="deadlineDate"
                type="date"
                required
                defaultValue={initial?.deadline?.slice(0, 10) || todayDate}
              />
              <TimeSelect
                name="deadlineTime"
                value={initial?.deadline?.slice(11, 16) || "23:30"}
              />
            </div>
          </label>
          <label>
            정원
            <input
              name="capacity"
              type="number"
              min="1"
              required={!unlimited}
              disabled={unlimited}
              defaultValue={initial?.capacity || ""}
            />
            <span className="unlimited-check">
              <input
                type="checkbox"
                checked={unlimited}
                onChange={(e) => setUnlimited(e.target.checked)}
              />{" "}
              제한 없음
            </span>
          </label>
        </div>
        <label>
          추가 안내
          <textarea name="note" rows={3} defaultValue={initial?.note || ""} />
        </label>
        <div className="modal-actions">
          <button type="button" onClick={onClose}>
            취소
          </button>
          <button className="primary">
            {initial ? "수정 완료" : "등록하기"}
          </button>
        </div>
      </form>
    </div>
  );
}
