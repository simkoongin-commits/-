"use client";

import { useEffect, useMemo, useState } from "react";

type Member = {
  id: string;
  name: string;
  joinTerm: string;
  grade: "예비신사" | "신사" | "구사";
  role: "관리자" | "회원";
  position?: "대표" | "부대표" | "교육팀장" | "장비팀장" | "홍보팀장" | "";
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
function announcement(p: Practice) {
  if (p.type === "regular")
    return `{정규습사 ${p.round}회차}\n\n일시: ${koDate(p.date)} ${p.start}-${p.end}\n\n장소: ${p.place}\n인솔: ${p.leader || "미정"}\n\n마감일: ${deadlineText(p.deadline, true)}\n\n${p.timetable || `${p.start} ${p.place} 습사\n${p.end} 마무리`}\n\n${p.note || "함께 가고싶은 신구사분들은 댓글로 이름 적어주세요!"}`;
  const names = [...p.applicants, ""]
    .map((n, i) => `${i + 1}. ${n}`)
    .join("\n");
  return `{${p.title}}\n\n일시: ${shortDate(p.date)} ${p.start}~${p.end}${p.timeNote ? `(${p.timeNote})` : ""}\n장소: ${p.place}\n\n${names}\n\n마감일: ${deadlineText(p.deadline, false)}\n\n${p.note ? `- ${p.note}` : ""}`;
}

export default function Home() {
  const [practices, setPractices] = useState<Practice[]>(seedPractices);
  const [view, setView] = useState<"cards" | "calendar" | "members">("cards");
  const [sort, setSort] = useState<"asc" | "desc">("asc");
  const [filter, setFilter] = useState<"all" | "open" | "regular">("all");
  const [toast, setToast] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Practice | null>(null);
  const [participants, setParticipants] = useState<Practice | null>(null);
  const [cardMenu, setCardMenu] = useState<number | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [copyFormats, setCopyFormats] = useState({
    reminder: "{date} {time} {place}에서 습사 예정입니다!",
    added: "{name} {date} 습사 참여합니다!",
  });
  const [clubMembers, setClubMembers] = useState<Member[]>(initialMembers);
  const [session, setSession] = useState<Member>(initialMembers[0]);
  const [currentTerm, setCurrentTerm] = useState("26-2");
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const saved = localStorage.getItem("simgung-practices");
    const savedMembers = localStorage.getItem("simgung-members");
    const savedTerm = localStorage.getItem("simgung-current-term") || "26-2";
    const savedFormats = localStorage.getItem("simgung-copy-formats");
    const userId = localStorage.getItem("simgung-session");
    if (saved) setPractices(JSON.parse(saved));
    if (savedFormats) setCopyFormats(JSON.parse(savedFormats));
    if (savedMembers) {
      const parsed = (JSON.parse(savedMembers) as Member[]).map((m) => {
        const joinTerm =
          m.joinTerm ||
          (m.grade === "예비신사"
            ? "26-2"
            : m.grade === "신사"
              ? "26-1"
              : "25-2");
        return { ...m, joinTerm, grade: gradeFor(joinTerm, savedTerm) };
      });
      setClubMembers(parsed);
      setSession(parsed.find((m) => m.id === userId) || parsed[0]);
    } else if (userId)
      setSession(
        initialMembers.find((m) => m.id === userId) || initialMembers[0],
      );
    setCurrentTerm(savedTerm);
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready)
      localStorage.setItem("simgung-practices", JSON.stringify(practices));
  }, [practices, ready]);
  useEffect(() => {
    if (ready) localStorage.setItem("simgung-session", session.id);
  }, [session, ready]);
  useEffect(() => {
    if (ready)
      localStorage.setItem("simgung-members", JSON.stringify(clubMembers));
  }, [clubMembers, ready]);
  useEffect(() => {
    if (ready) localStorage.setItem("simgung-current-term", currentTerm);
  }, [currentTerm, ready]);
  useEffect(() => {
    if (ready)
      localStorage.setItem("simgung-copy-formats", JSON.stringify(copyFormats));
  }, [copyFormats, ready]);
  const today = new Date("2026-09-11T12:00:00");
  const visible = useMemo(
    () =>
      practices
        .filter((p) => {
          const age = Math.floor(
            (today.getTime() - new Date(`${p.date}T23:59:59`).getTime()) /
              86400000,
          );
          if (age > 3) return false;
          if (filter === "regular" && p.type !== "regular") return false;
          if (filter === "open" && new Date(p.deadline) < today) return false;
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
  const toggleJoin = (id: number) =>
    setPractices((all) =>
      all.map((p) => {
        if (p.id !== id) return p;
        const joined = p.applicants.includes(session.name);
        if (!joined && p.capacity > 0 && p.applicants.length >= p.capacity) {
          notify("정원이 모두 찼어요");
          return p;
        }
        notify(joined ? "신청을 취소했어요" : "참가 신청했어요");
        return {
          ...p,
          applicants: joined
            ? p.applicants.filter((n) => n !== session.name)
            : [...p.applicants, session.name],
        };
      }),
    );
  return (
    <main>
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
          <select
            aria-label="데모 계정 전환"
            value={session.id}
            onChange={(e) =>
              setSession(clubMembers.find((m) => m.id === e.target.value)!)
            }
          >
            {clubMembers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
      </header>
      <section className="hero">
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
                width:
                  nextPractice && nextPractice.capacity > 0
                    ? `${Math.min(100, (nextPractice.applicants.length / nextPractice.capacity) * 100)}%`
                    : nextPractice
                      ? "18%"
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
              <p>지난 습사는 3일 동안 흐리게 표시돼요.</p>
            </div>
            {session.role === "관리자" && (
              <button
                className="primary add-button"
                onClick={() => setShowForm(true)}
                aria-label="습사 등록"
              >
                <span aria-hidden="true">＋</span>
              </button>
            )}
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
                className={filter === "open" ? "selected" : ""}
                onClick={() => setFilter("open")}
              >
                신청 가능
              </button>
              <button
                className={filter === "regular" ? "selected" : ""}
                onClick={() => setFilter("regular")}
              >
                정규습사
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
              const past = new Date(`${p.date}T23:59:59`) < today;
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
                          {session.role === "관리자" && (
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
                    <b>{new Date(`${p.date}T12:00:00`).getDate()}</b>
                    <span>
                      {new Date(`${p.date}T12:00:00`).getMonth() + 1}월 ·{" "}
                      {
                        "일월화수목금토"[
                          new Date(`${p.date}T12:00:00`).getDay()
                        ]
                      }
                      요일
                    </span>
                  </div>
                  <h3>{p.title}</h3>
                  <p className="meta">
                    <span>
                      ◷ {p.start}–{p.end}
                    </span>
                    <span>⌖ {p.place}</span>
                    {p.type !== "general" && p.leader && p.leader !== "null" && (
                      <span>인솔 {p.leader}</span>
                    )}
                  </p>
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
                      onClick={() => copy(announcement(p))}
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
                visible.map(announcement).join("\n\n──────────\n\n"),
                "표시된 습사를 모두 복사했어요",
              )
            }
          >
            ▣ 현재 목록 전체 복사
          </button>
        </section>
      )}
      {view === "calendar" && (
        <Calendar
          practices={visible}
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
            if (
              role === "회원" &&
              clubMembers.filter((m) => m.role === "관리자").length === 1
            ) {
              notify("다른 관리자를 먼저 승급해주세요");
              return;
            }
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
        />
      )}
      {participants && (
        <Participants
          practice={participants}
          members={clubMembers}
          onClose={() => setParticipants(null)}
        />
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
                { ...p, id: Date.now(), applicants: [] },
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
}: {
  member: Member;
  currentTerm: string;
  copyFormats: { reminder: string; added: string };
  onFormats: (v: { reminder: string; added: string }) => void;
  onClose: () => void;
  onSave: (m: Member) => void;
  onRelinquish: () => void;
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
                <button className="relinquish" onClick={onRelinquish}>
                  관리자 권한 포기
                </button>
              </>
            ) : (
              <p className="empty-list">현재 관리자 권한이 없습니다.</p>
            )}
          </div>
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
}: {
  members: Member[];
  session: Member;
  currentTerm: string;
  onCurrentTermChange: (term: string) => void;
  onAddMember: (member: Member) => boolean;
  onUpdateMember: (member: Member) => void;
  onRoleChange: (id: string, role: Member["role"]) => void;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  return (
    <section className="content">
      <div className="section-head">
        <div>
          <h2>회원</h2>
          <p>입부 학기를 기준으로 등급이 자동 지정돼요.</p>
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
          <small>등급 계산 기준</small>
        </div>
        {session.role === "관리자" ? (
          <select
            value={currentTerm}
            onChange={(e) => onCurrentTermChange(e.target.value)}
          >
            {[
              "27-2",
              "27-1",
              "26-2",
              "26-1",
              "25-2",
              "25-1",
              "24-2",
              "24-1",
            ].map((term) => (
              <option key={term}>{term}</option>
            ))}
          </select>
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
      <div className="security-note">
        <b>로그인 안내</b>
        <p>
          현재 로컬 시제품은 계정 전환으로 기능을 확인할 수 있습니다. 실제 배포
          시에는 학번과 최초 비밀번호를 사용하고 로그인 상태를 안전하게
          유지합니다.
        </p>
      </div>
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
  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    onSave({
      type,
      title: String(f.get("title")),
      round: type === "regular" ? Number(f.get("round")) : undefined,
      date: String(f.get("date")),
      start: String(f.get("start")),
      end: String(f.get("end")),
      place: String(f.get("place")),
      leader:
        type === "general"
          ? undefined
          : String(f.get("leader") || "").trim() || undefined,
      deadline: String(f.get("deadline")),
      capacity: unlimited ? 0 : Number(f.get("capacity")),
      mandatory,
      note: String(f.get("note")),
      timetable: type === "regular" ? String(f.get("timetable")) : "",
    });
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
        <div className="form-row">
          <label>
            제목
            <input
              name="title"
              required
              defaultValue={
                initial?.title ||
                (type === "regular"
                  ? `정규습사 ${nextRegularRound}회차`
                  : type === "competition"
                    ? "대회"
                    : "자유 습사")
              }
            />
          </label>
          {type === "regular" && (
            <label>
              회차
              <input
                name="round"
                type="number"
                min="1"
                defaultValue={initial?.round || nextRegularRound}
              />
            </label>
          )}
        </div>
        <div className="form-row three">
          <label>
            날짜
            <input
              name="date"
              type="date"
              required
              defaultValue={initial?.date || "2026-10-03"}
            />
          </label>
          <label>
            시작
            <input
              name="start"
              type="time"
              required
              defaultValue={initial?.start || "14:00"}
            />
          </label>
          <label>
            종료
            <input
              name="end"
              type="time"
              required
              defaultValue={initial?.end || "16:00"}
            />
          </label>
        </div>
        <div className="form-row">
          <label>
            장소
            <input
              name="place"
              required
              defaultValue={initial?.place || "부천정"}
            />
          </label>
          {type !== "general" && (
            <label>
              인솔자
              <input name="leader" defaultValue={initial?.leader || "변수인"} />
            </label>
          )}
        </div>
        {type === "regular" && (
          <label>
            시간별 일정
            <textarea
              name="timetable"
              rows={4}
              defaultValue={
                initial?.timetable ||
                "09:00 동아리방에서 출발\n10:00 난지 국궁장 도착\n13:00 해산"
              }
            />
            <small className="field-help">
              한 줄에 하나씩 시간과 내용을 적어주세요.
            </small>
          </label>
        )}
        <div className="form-row">
          <label>
            신청 마감
            <input
              name="deadline"
              type="datetime-local"
              required
              defaultValue={initial?.deadline || "2026-10-02T23:59"}
            />
          </label>
          <label>
            정원
            <input
              name="capacity"
              type="number"
              min="1"
              disabled={unlimited}
              defaultValue={initial?.capacity || 12}
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
          <textarea
            name="note"
            rows={3}
            placeholder="예비신사 교육이 같이 이루어집니다!!"
            defaultValue={initial?.note || ""}
          />
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
