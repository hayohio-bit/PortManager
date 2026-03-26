const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

/**
 * LISTEN 중인 포트 목록을 조회하는 서비스
 * netstat + tasklist 명령어를 조합하여 포트-프로세스 매핑 정보를 반환한다.
 */

/**
 * tasklist를 실행하여 PID → 프로세스 이름 매핑을 생성한다.
 * @returns {Promise<Map<string, string>>} PID를 키로, 프로세스 이름을 값으로 갖는 Map
 */
async function getProcessMap() {
  const processMap = new Map();

  try {
    // chcp 65001: 한글 Windows(CP949) 환경에서도 UTF-8 출력을 강제 설정
    const { stdout } = await execAsync('chcp 65001 >nul 2>&1 && tasklist /FO CSV /NH', {
      encoding: 'utf-8',
      maxBuffer: 1024 * 1024 * 10,
      shell: true,
    });

    const lines = stdout.trim().split('\n');

    for (const line of lines) {
      // CSV 형식: "프로세스이름","PID","세션이름","세션#","메모리"
      const match = line.match(/"([^"]+)","(\d+)"/);
      if (match) {
        processMap.set(match[2], match[1]);
      }
    }
  } catch (error) {
    console.error('tasklist 실행 실패:', error.message);
  }

  return processMap;
}

/**
 * netstat -ano 출력을 파싱하여 LISTENING 중인 포트 정보를 추출한다.
 * @returns {Promise<Array>} 포트 정보 배열
 */
async function getListeningPorts() {
  try {
    // netstat과 tasklist를 병렬로 실행하여 성능 최적화
    // chcp 65001: 한글 Windows(CP949) 환경 UTF-8 강제
    const [netstatResult, processMap] = await Promise.all([
      execAsync('chcp 65001 >nul 2>&1 && netstat -ano', {
        encoding: 'utf-8',
        maxBuffer: 1024 * 1024 * 10,
        shell: true,
      }),
      getProcessMap(),
    ]);

    const lines = netstatResult.stdout.trim().split('\n');
    const ports = [];
    const seen = new Set();

    for (const line of lines) {
      // netstat 출력 형식:
      //   TCP: 프로토콜 로컬주소 외부주소 LISTENING PID  (5컬럼)
      //   UDP: 프로토콜 로컬주소 *:*         PID         (4컬럼, 상태 없음)
      const parts = line.trim().split(/\s+/);
      if (parts.length < 4) continue;

      const protocol = parts[0];
      const isTCP = protocol.toUpperCase().startsWith('TCP');
      const isUDP = protocol.toUpperCase().startsWith('UDP');

      if (!isTCP && !isUDP) continue;

      // TCP는 LISTENING 상태인 행만 처리
      if (isTCP) {
        if (parts.length < 5) continue;
        if (!line.includes('LISTENING')) continue;
      }

      const localAddress = parts[1];
      const pid = isTCP ? parts[4] : parts[3];

      // 로컬 주소에서 포트 번호 추출
      const lastColon = localAddress.lastIndexOf(':');
      if (lastColon === -1) continue;

      const address = localAddress.substring(0, lastColon);
      const port = parseInt(localAddress.substring(lastColon + 1), 10);
      if (isNaN(port)) continue;

      // 중복 제거
      const key = `${protocol}-${port}-${pid}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const processName = processMap.get(pid) || '알 수 없음';

      ports.push({
        protocol,
        address,
        port,
        pid: parseInt(pid, 10),
        processName,
      });
    }

    // 포트 번호 순으로 정렬
    ports.sort((a, b) => a.port - b.port);
    return ports;
  } catch (error) {
    console.error('포트 조회 실패:', error.message);
    throw new Error('포트 목록을 가져올 수 없습니다: ' + error.message);
  }
}

/**
 * 지정된 PID의 프로세스를 강제 종료한다.
 * @param {number} pid - 종료할 프로세스 ID
 * @returns {Promise<{success: boolean, message: string}>}
 */
async function killProcess(pid) {
  // 숫자 타입으로 강제 변환 후 양의 정수인지 검증 (커맨드 인젝션 방지)
  const safePid = Number(pid);
  if (!Number.isInteger(safePid) || safePid <= 0) {
    return { success: false, message: '유효하지 않은 PID입니다.' };
  }

  // PID 4: Windows System 커널 프로세스 보호
  const PROTECTED_PIDS = new Set([4]);
  if (PROTECTED_PIDS.has(safePid)) {
    return { success: false, message: '시스템 핵심 프로세스는 종료할 수 없습니다.' };
  }

  try {
    // PowerShell의 Start-Process -Verb RunAs를 사용하여 개별 명령에 대해서만 관리자 권한 요청 (UAC 트리거)
    // safePid는 검증된 정수이므로 인젝션 위험 없음
    const command = `powershell -Command "Start-Process cmd -ArgumentList '/c taskkill /F /PID ${safePid}' -Verb RunAs -WindowStyle Hidden -Wait"`;
    await execAsync(command, { encoding: 'utf-8' });
    return { success: true, message: `PID ${safePid} 프로세스가 종료되었습니다.` };
  } catch (error) {
    // 사용자가 UAC 프롬프트에서 '아니오'를 누르거나 권한 부족 시 에러 발생
    return { success: false, message: `PID ${safePid} 종료 실패: 관리자 권한이 거부되었거나 프로세스를 종료할 수 없습니다.` };
  }
}

module.exports = { getListeningPorts, killProcess };
