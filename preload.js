const { contextBridge, ipcRenderer } = require('electron');

/**
 * Preload 스크립트
 * contextBridge를 통해 렌더러 프로세스에 안전한 API를 노출한다.
 * nodeIntegration을 비활성화한 상태에서도 메인 프로세스와 통신 가능.
 */
contextBridge.exposeInMainWorld('portAPI', {
  /**
   * LISTEN 중인 포트 목록을 조회한다
   * @returns {Promise<{success: boolean, data: Array, count: number}>}
   */
  getPorts: () => ipcRenderer.invoke('ports:getAll'),

  /**
   * 지정된 PID의 프로세스를 종료한다
   * @param {number} pid - 종료할 프로세스 ID
   * @returns {Promise<{success: boolean, message: string}>}
   */
  killProcess: (pid) => ipcRenderer.invoke('ports:kill', pid),
});
