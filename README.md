# PortManager

> Windows에서 LISTEN 중인 포트를 실시간으로 조회하고, 원클릭으로 프로세스를 종료하는 데스크톱 앱

[![Electron](https://img.shields.io/badge/Electron-33-47848F?logo=electron&logoColor=white)](https://www.electronjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Platform](https://img.shields.io/badge/Platform-Windows%2010%2F11-0078D4?logo=windows&logoColor=white)](https://www.microsoft.com/windows)
[![License](https://img.shields.io/badge/License-MIT-green)](./LICENSE)
[![Release](https://img.shields.io/github/v/release/[계정]/PortManager)](https://github.com/[계정]/PortManager/releases/latest)

---

## 목차

- [소개](#소개)
- [주요 기능](#주요-기능)
- [다운로드](#다운로드)
- [실행 방법](#실행-방법)
- [화면 구성](#화면-구성)
- [동작 원리](#동작-원리)
- [프로젝트 구조](#프로젝트-구조)
- [개발 환경 설정](#개발-환경-설정)
- [빌드](#빌드)
- [보안 설계](#보안-설계)
- [트러블슈팅](#트러블슈팅)
- [기여](#기여)
- [라이선스](#라이선스)

---

## 소개

개발하다 보면 포트 충돌이 자주 발생합니다.

```
Error: listen EADDRINUSE: address already in use :::3000
```

이 메시지가 뜰 때마다 `netstat -ano`를 치고, PID를 찾아 `taskkill`을 실행하는 과정이 번거로웠습니다.
**PortManager**는 이 작업을 GUI로 만들어 클릭 한 번에 해결합니다.

- 설치 불필요 — exe 파일 하나로 바로 실행
- `netstat` + `tasklist` 명령어를 내부적으로 실행하여 포트-프로세스 정보를 조합
- 프로세스 종료 전 확인 모달로 실수 방지

---

## 주요 기능

| 기능 | 설명 |
|------|------|
| **실시간 포트 조회** | LISTEN 중인 TCP/UDP 포트를 전체 목록으로 표시 |
| **통합 검색** | 포트 번호, 프로세스 이름, PID, 주소 동시 검색 (디바운싱 200ms 적용) |
| **프로토콜 필터** | 전체 / TCP / UDP 탭으로 빠른 필터링 |
| **컬럼 정렬** | 프로토콜, 주소, 포트, PID, 프로세스 이름 기준 오름/내림차순 정렬 |
| **프로세스 종료** | Kill 버튼 클릭 → 확인 모달 → 강제 종료 (`taskkill /F`) |
| **시스템 프로세스 보호** | Windows 커널 프로세스(PID 4 등) 종료 차단 |
| **토스트 알림** | 성공/실패 결과를 화면 우측 하단에 3초간 표시 |
| **포터블 실행** | 설치 없이 exe 하나로 즉시 실행 |

---

## 다운로드

**[최신 릴리즈 다운로드 →](https://github.com/[계정]/PortManager/releases/latest)**

| 파일 | 설명 |
|------|------|
| `PortManager 1.0.0 Portable.exe` | 설치 불필요, 바로 실행 가능 |

**시스템 요구사항**
- Windows 10 / 11 (x64)
- 관리자 권한 (UAC 승인 필요)

---

## 실행 방법

1. 위 링크에서 `PortManager x.x.x Portable.exe` 다운로드
2. 파일을 더블클릭
3. **Windows UAC 창에서 "예" 클릭** (포트 조회 및 프로세스 종료에 관리자 권한 필요)
4. 앱이 실행되며 포트 목록이 자동으로 로드됩니다

> **Windows SmartScreen 경고가 뜨는 경우**
> 코드 서명이 없는 exe에서 발생합니다.
> "추가 정보" → "실행" 을 클릭하면 정상 실행됩니다.

---

## 화면 구성

```
┌─────────────────────────────────────────────────────────────┐
│  ⚡ Port Manager          [127개 포트]        [🔄 새로고침]  │  ← 헤더
├─────────────────────────────────────────────────────────────┤
│  🔍 [포트 번호 또는 프로세스 이름으로 검색...    ] [✕]       │
│  [전체]  [TCP]  [UDP]                                        │  ← 검색 & 필터
├──────────┬───────────┬───────┬───────┬────────────┬─────────┤
│ 프로토콜 │   주소    │  포트 │  PID  │  프로세스  │  작업   │  ← 정렬 가능
├──────────┼───────────┼───────┼───────┼────────────┼─────────┤
│  TCP ▌   │ 0.0.0.0   │  3000 │  1234 │  node.exe  │ [종료]  │
│  TCP ▌   │ 0.0.0.0   │  5432 │  5678 │ postgres   │ [종료]  │
│  UDP ▌   │ 0.0.0.0   │  5353 │   912 │  svchost   │ [종료]  │
│   ...    │    ...    │  ...  │  ...  │    ...     │   ...   │
└──────────┴───────────┴───────┴───────┴────────────┴─────────┘
                                              ┌──────────────────┐
                                              │  ✅ node.exe     │  ← 토스트
                                              │  (PID: 1234) 종료│
                                              └──────────────────┘
```

**종료 확인 모달**

```
┌─────────────────────────┐
│  프로세스 종료       [✕] │
├─────────────────────────┤
│         ⚠️              │
│  이 프로세스를 정말      │
│  종료하시겠습니까?       │
│                         │
│  프로세스  node.exe      │
│  PID       1234         │
│  포트      3000         │
│                         │
│  ⚡ 강제 종료 시 관련    │
│  서비스가 중단됩니다.    │
├─────────────────────────┤
│  [취소]     [종료하기]  │
└─────────────────────────┘
```

---

## 동작 원리

### 포트-프로세스 매핑 방식

`netstat -ano`와 `tasklist`를 **병렬 실행**해 결과를 조합합니다.

```
netstat -ano                     tasklist /FO CSV /NH
─────────────────                ────────────────────────
TCP  0.0.0.0:3000  LISTENING 1234    "node.exe","1234",...
TCP  0.0.0.0:5432  LISTENING 5678    "postgres","5678",...
           ↓ PID 기준 매핑
     포트 3000 → node.exe (PID 1234)
     포트 5432 → postgres (PID 5678)
```

```js
// 두 명령어를 병렬 실행해 성능 최적화
const [netstatResult, processMap] = await Promise.all([
  execAsync('netstat -ano'),
  getProcessMap(),        // tasklist 결과를 Map<PID, 이름>으로 변환
]);
```

### IPC 통신 구조 (Electron)

```
┌─────────────────┐    contextBridge    ┌──────────────────┐
│  Renderer 프로세스│ ←─────────────────→ │  Main 프로세스    │
│  (app.js)       │    window.portAPI   │  (main.js)       │
│                 │                    │                  │
│  portAPI        │   IPC invoke       │  ipcMain.handle  │
│  .getPorts()   ──────────────────────→  ports:getAll    │
│  .killProcess() ──────────────────────→  ports:kill     │
└─────────────────┘                    └──────────────────┘
                                                │
                                       ┌────────┴────────┐
                                       │  portService.js  │
                                       │  - netstat       │
                                       │  - tasklist      │
                                       │  - taskkill      │
                                       └─────────────────┘
```

---

## 프로젝트 구조

```
PortManager/
├── main.js                     # Electron 메인 프로세스 (윈도우 생성, IPC 핸들러)
├── preload.js                  # contextBridge로 렌더러에 API 노출
├── package.json                # 의존성 및 빌드 설정
├── package-lock.json           # 의존성 버전 고정
│
├── src/
│   └── services/
│       └── portService.js      # netstat/tasklist 실행 및 파싱, 프로세스 종료
│
├── renderer/                   # UI (렌더러 프로세스)
│   ├── index.html              # 앱 레이아웃
│   ├── css/
│   │   └── style.css           # 스타일
│   ├── js/
│   │   └── app.js              # 검색/필터/정렬/모달/토스트 로직
│   └── fonts/                  # Inter 폰트
│
├── build/
│   └── icon.png                # 앱 아이콘 (빌드 시 사용)
│
├── README.md
├── TROUBLESHOOTING.md          # 빌드 오류 해결 기록
├── GIT_UPLOAD_GUIDE.md         # Git 업로드 가이드
├── BLOG_PUBLISH_GUIDE.md       # 블로그 게시 가이드
└── .gitignore
```

---

## 개발 환경 설정

### 사전 요구사항

- [Node.js](https://nodejs.org/) 20 이상
- Windows 10 / 11

### 설치 및 실행

```bash
# 1. 저장소 클론
git clone https://github.com/[계정]/PortManager.git
cd PortManager

# 2. 의존성 설치
npm install

# 3. 개발 모드 실행 (관리자 권한 터미널에서 실행)
npm start
```

> 개발 모드에서도 `netstat`, `taskkill` 실행에 관리자 권한이 필요합니다.
> 관리자 권한으로 터미널을 열고 실행하세요.

### 의존성

| 패키지 | 버전 | 용도 |
|--------|------|------|
| `electron` | ^33.4.11 | 데스크톱 앱 프레임워크 |
| `electron-builder` | ^25.1.8 | 배포용 exe 빌드 |
| `@fontsource/inter` | ^5.2.8 | Inter 폰트 (로컬 번들링) |

---

## 빌드

```bash
# 포터블 exe 빌드 (dist/ 폴더에 생성)
npm run build

# 설치 없이 디렉터리만 생성 (빠른 테스트용)
npm run pack
```

빌드 결과물:

```
dist/
├── PortManager 1.0.0 Portable.exe   # 배포용 포터블 실행 파일
└── win-unpacked/                    # 압축 해제된 앱 (직접 실행 가능)
    └── PortManager.exe
```

### 빌드 설정 요약 (`package.json`)

```json
"build": {
  "win": {
    "target": ["portable"],
    "requestedExecutionLevel": "requireAdministrator"
  },
  "portable": {
    "artifactName": "${productName} ${version} Portable.${ext}"
  },
  "asar": true
}
```

- **`requestedExecutionLevel: requireAdministrator`** — UAC 권한 요청을 실행 파일에 내장
- **`asar: true`** — 소스 파일을 단일 아카이브로 패키징

---

## 보안 설계

Electron 앱은 기본 설정 그대로 쓰면 렌더러에서 Node.js 전체에 접근 가능해 XSS 시 시스템 명령 실행까지 이어질 수 있습니다. 이를 방지하기 위해 아래 설계를 적용했습니다.

### 렌더러 프로세스 격리

```js
// main.js
webPreferences: {
  contextIsolation: true,   // 렌더러와 Node.js 컨텍스트 분리
  nodeIntegration: false,   // 렌더러에서 require() 차단
  sandbox: true,            // 렌더러 프로세스 OS 수준 샌드박스
  preload: './preload.js',  // 허용된 API만 노출
}
```

### contextBridge를 통한 최소 권한 API

```js
// preload.js — 렌더러에 노출하는 API를 명시적으로 허용
contextBridge.exposeInMainWorld('portAPI', {
  getPorts:    () => ipcRenderer.invoke('ports:getAll'),
  killProcess: (pid) => ipcRenderer.invoke('ports:kill', pid),
});
// 렌더러는 portAPI.getPorts(), portAPI.killProcess()만 사용 가능
```

### 커맨드 인젝션 방지

```js
// portService.js — PID는 반드시 정수 검증 후 사용
const safePid = Number(pid);
if (!Number.isInteger(safePid) || safePid <= 0) {
  return { success: false, message: '유효하지 않은 PID입니다.' };
}
await execAsync(`taskkill /PID ${safePid} /F`);
```

### Content Security Policy

```html
<!-- index.html -->
<meta http-equiv="Content-Security-Policy"
  content="default-src 'self'; style-src 'self'; font-src 'self';">
```

인라인 스크립트, 외부 리소스 로딩을 모두 차단합니다.

### 시스템 프로세스 보호

```js
const PROTECTED_PIDS = new Set([4]); // Windows 커널 프로세스
if (PROTECTED_PIDS.has(safePid)) {
  return { success: false, message: '시스템 핵심 프로세스는 종료할 수 없습니다.' };
}
```

---

## 트러블슈팅

자세한 내용은 [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)를 참고하세요.

### 앱이 실행되지 않는 경우

| 증상 | 원인 | 해결 |
|------|------|------|
| 아무 반응 없음 | UAC 창을 취소했거나 SmartScreen 차단 | SmartScreen: "추가 정보" → "실행" 클릭 |
| 포트 목록이 비어있음 | 관리자 권한 없이 실행 | 우클릭 → "관리자 권한으로 실행" |
| 프로세스 종료 실패 | 대상 프로세스가 더 높은 권한을 가짐 | 앱 자체를 관리자로 실행 |

### 빌드 실패 시

```
configuration.nsis has an unknown property 'requestedExecutionLevel'
```

`requestedExecutionLevel`이 `nsis` 섹션이 아닌 `win` 섹션에 있어야 합니다.

```json
// ❌ 잘못된 위치
"nsis": { "requestedExecutionLevel": "requireAdministrator" }

// ✅ 올바른 위치
"win": { "requestedExecutionLevel": "requireAdministrator" }
```

---

## 기여

버그 리포트, 기능 제안, PR 모두 환영합니다.

1. 이 저장소를 Fork
2. 새 브랜치 생성: `git checkout -b feat/기능명`
3. 변경사항 커밋: `git commit -m "feat: 기능 설명"`
4. 브랜치 푸시: `git push origin feat/기능명`
5. Pull Request 생성

### 커밋 메시지 규칙

```
feat:     새 기능 추가
fix:      버그 수정
refactor: 코드 구조 개선 (기능 변화 없음)
docs:     문서 수정
chore:    빌드/설정 변경
```

---

## 라이선스

[MIT License](./LICENSE) © 2025 PortManager
