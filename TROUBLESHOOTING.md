# PortManager 빌드 오류 및 트러블슈팅

## 발생한 문제

`dist/PortManager 1.0.0 Portable.exe` 실행 불가

---

## 오류 원인

### 1. 이전 빌드 실패 (build_error.log)

```
Invalid configuration object. electron-builder has been initialized using a
configuration object that does not match the API schema.
- configuration.nsis has an unknown property 'requestedExecutionLevel'.
```

`requestedExecutionLevel` 옵션을 `nsis` 섹션에 잘못 배치한 이전 설정이 원인이었습니다.
이 옵션은 `win` 섹션에 위치해야 합니다.

**잘못된 설정 (이전):**
```json
"nsis": {
  "requestedExecutionLevel": "requireAdministrator"
}
```

**올바른 설정 (현재):**
```json
"win": {
  "requestedExecutionLevel": "requireAdministrator"
}
```

### 2. 오래된 빌드 파일 잔존

빌드가 실패하는 동안 `dist/` 폴더에는 이전 성공 빌드의 exe 파일이 그대로 남아 있었습니다.
해당 파일은 최신 소스와 불일치하는 상태였으며, 실행 시 정상 동작하지 않았습니다.

---

## 해결 방법

### package.json 설정 수정 확인

`requestedExecutionLevel`이 `win` 섹션에 올바르게 위치하는지 확인합니다.

```json
"build": {
  "win": {
    "target": ["portable"],
    "icon": "build/icon.png",
    "requestedExecutionLevel": "requireAdministrator"
  },
  "nsis": {
    "oneClick": false,
    "allowToChangeInstallationDirectory": true,
    "allowElevation": true
  }
}
```

### 재빌드

```bash
npm run build
```

빌드 성공 시 출력 예시:

```
• packaging    platform=win32 arch=x64 electron=33.4.11
• building     target=portable file=dist\PortManager 1.0.0 Portable.exe
```

---

## 실행 시 주의사항

### 실행 권한 및 UAC 알림 (하이브리드 권한 방식)

본 앱은 실행 시에는 **일반 권한**으로 시작하여 Windows의 보안 차단을 회피하며, 실제 **프로세스 종료 기능**이 필요한 시점에만 **관리자 권한**을 요청합니다.

1. **앱 실행**: UAC 프롬프트 없이 즉시 실행됩니다.
2. **프로세스 종료 클릭**: Windows UAC(사용자 계정 컨트롤) 창이 나타납니다. "예"를 클릭해야 프로세스가 강제 종료됩니다.

인터넷이나 다른 PC에서 다운로드받은 `Portable.exe` 파일은 최초 실행 시 SmartScreen 경고가 나타날 수 있습니다.
*(이전 버전에서는 실행이 차단되는 문제가 있었으나, 현재는 하이브리드 권한 방식을 적용하여 "실행" 클릭 시 정상적으로 앱이 구동됩니다.)*

#### 해결 방법
SmartScreen 경고창이 뜨면 다음과 같이 진행하세요:
1. "추가 정보" 클릭
2. "실행" 클릭

---

### 만약 여전히 실행되지 않는다면? (차단 해제)

드문 경우지만, Windows 정책에 따라 실행이 거부될 수 있습니다. 이 경우 파일의 수동 차단 해제가 필요합니다:
1. `PortManager 1.0.0 Portable.exe` 파일을 **우클릭** -> **속성(R)** 클릭
2. 일반 탭 하단의 보안 항목에서 **[차단 해제(K)]** 체크박스 선택
3. **[적용]** 및 **[확인]** 클릭 후 앱 재실행

---

## 빌드 스크립트 정리

| 명령어 | 설명 |
|--------|------|
| `npm start` | 개발 모드로 앱 실행 |
| `npm run build` | Windows용 포터블 exe 빌드 (`dist/` 출력) |
| `npm run pack` | 설치 없이 디렉터리만 패키징 (`dist/win-unpacked/`) |
