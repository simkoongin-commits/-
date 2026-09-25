"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "simgunghoe:pwa-install-dismissed-date";

const localDateKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

const launchedFromHomeScreen = () => {
  if (typeof window === "undefined") return false;
  const iosStandalone = Boolean(
    (navigator as Navigator & { standalone?: boolean }).standalone,
  );
  return window.matchMedia("(display-mode: standalone)").matches || iosStandalone;
};

export default function PwaRegistration() {
  const [signedIn, setSignedIn] = useState(false);
  const [standalone] = useState(launchedFromHomeScreen);
  const [visible, setVisible] = useState(false);
  const [closed, setClosed] = useState(false);
  const [installedThisVisit, setInstalledThisVisit] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [guide, setGuide] = useState("");

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const register = () => {
      void navigator.serviceWorker.register("/sw.js", {
        scope: "/",
        updateViaCache: "none",
      });
    };
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
    return () => window.removeEventListener("load", register);
  }, []);

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      setSignedIn(Boolean(user));
      if (!user) setVisible(false);
    });
  }, []);

  useEffect(() => {
    const capturePrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const markInstalled = () => {
      setInstalledThisVisit(true);
      setVisible(false);
      setInstallPrompt(null);
    };
    window.addEventListener("beforeinstallprompt", capturePrompt);
    window.addEventListener("appinstalled", markInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", capturePrompt);
      window.removeEventListener("appinstalled", markInstalled);
    };
  }, []);

  useEffect(() => {
    const shouldPrompt =
      !signedIn ||
      standalone ||
      closed ||
      installedThisVisit ||
      window.localStorage.getItem(DISMISS_KEY) === localDateKey();
    if (shouldPrompt) return;
    const timer = window.setTimeout(() => setVisible(true), 700);
    return () => window.clearTimeout(timer);
  }, [closed, installedThisVisit, signedIn, standalone]);

  const install = async () => {
    if (!installPrompt) {
      const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
      setGuide(
        isIos
          ? "공유 버튼을 누른 뒤 ‘홈 화면에 추가’를 선택해주세요."
          : "Chrome 메뉴(⋮)에서 ‘앱 설치’ 또는 ‘홈 화면에 추가’를 선택해주세요. 이미 설치했다면 홈 화면 아이콘으로 실행해주세요.",
      );
      return;
    }
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    setInstallPrompt(null);
    if (choice.outcome === "accepted") {
      setInstalledThisVisit(true);
      setVisible(false);
    }
  };

  const dismissToday = () => {
    window.localStorage.setItem(DISMISS_KEY, localDateKey());
    setVisible(false);
    setClosed(true);
  };

  if (!visible) return null;

  return (
    <div className="install-prompt-backdrop">
      <section className="install-prompt-card" role="dialog" aria-modal="true" aria-labelledby="install-prompt-title">
        <button type="button" className="install-prompt-close" aria-label="설치 안내 닫기" onClick={() => { setVisible(false); setClosed(true); }}>×</button>
        <img src="/icon-192.png" alt="" />
        <h2 id="install-prompt-title">홈화면에 설치해서 사용하세요!</h2>
        <p>심궁회 일정을 앱처럼 더 빠르고 편하게 확인할 수 있어요.</p>
        {guide && <small>{guide}</small>}
        <button type="button" className="install-prompt-primary" onClick={() => void install()}>설치하기</button>
        <button type="button" className="install-prompt-today" onClick={dismissToday}>오늘 하루 보지 않기</button>
      </section>
    </div>
  );
}
