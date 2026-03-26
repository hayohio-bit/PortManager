const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { getListeningPorts, killProcess } = require('./src/services/portService');

/**
 * Electron 메인 프로세스
 * 윈도우 생성 및 IPC 핸들러를 통해 포트 관리 기능을 제공한다.
 */

let mainWindow;

/**
 * 메인 윈도우를 생성한다
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 700,
    minHeight: 500,
    title: 'Port Manager',
    backgroundColor: '#0f0f1a',
    // 타이틀바 커스텀을 위해 프레임 유지
    frame: true,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,  // 렌더러와 메인 컨텍스트 격리
      nodeIntegration: false,  // 렌더러에서 Node.js 직접 접근 차단
      sandbox: true,           // 렌더러 프로세스 샌드박스 활성화
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// === IPC 핸들러 (렌더러 프로세스의 요청을 처리) ===

/**
 * 포트 목록 조회 핸들러
 */
ipcMain.handle('ports:getAll', async () => {
  try {
    const ports = await getListeningPorts();
    return { success: true, data: ports, count: ports.length };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

/**
 * 프로세스 종료 핸들러
 */
ipcMain.handle('ports:kill', async (_event, pid) => {
  return await killProcess(pid);
});

// === 앱 생명주기 ===

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
