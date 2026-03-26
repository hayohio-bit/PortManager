/**
 * Port Manager - 클라이언트 애플리케이션
 * preload.js에서 노출한 window.portAPI를 통해 메인 프로세스와 IPC 통신한다.
 */

// === 상태 관리 ===
let allPorts = [];
let filteredPorts = [];
let currentFilter = 'all';
let currentSort = { key: 'port', asc: true };
let killTarget = null;

// === DOM 요소 캐싱 ===
const elements = {
  portCount: document.getElementById('portCount'),
  searchInput: document.getElementById('searchInput'),
  btnClear: document.getElementById('btnClear'),
  btnRefresh: document.getElementById('btnRefresh'),
  loading: document.getElementById('loading'),
  errorState: document.getElementById('errorState'),
  errorMessage: document.getElementById('errorMessage'),
  emptyState: document.getElementById('emptyState'),
  tableContainer: document.getElementById('tableContainer'),
  portTableBody: document.getElementById('portTableBody'),
  modalOverlay: document.getElementById('modalOverlay'),
  modalProcessName: document.getElementById('modalProcessName'),
  modalPid: document.getElementById('modalPid'),
  modalPort: document.getElementById('modalPort'),
  modalClose: document.getElementById('modalClose'),
  btnCancel: document.getElementById('btnCancel'),
  btnConfirmKill: document.getElementById('btnConfirmKill'),
  toastContainer: document.getElementById('toastContainer'),
};

// === 데이터 로드 (IPC 통신) ===

/**
 * 포트 목록을 로드하고 화면에 렌더링한다
 */
async function loadPorts() {
  showState('loading');

  try {
    // preload.js에서 노출한 portAPI 사용
    const result = await window.portAPI.getPorts();

    if (!result.success) {
      throw new Error(result.message);
    }

    allPorts = result.data;
    applyFilters();
    showState('table');
  } catch (error) {
    elements.errorMessage.textContent = error.message;
    showState('error');
  }
}

// === 검색 및 필터 ===

/**
 * 검색어와 프로토콜 필터를 적용한다
 */
function applyFilters() {
  const searchTerm = elements.searchInput.value.toLowerCase().trim();

  filteredPorts = allPorts.filter((port) => {
    // 프로토콜 필터
    if (currentFilter !== 'all') {
      if (!port.protocol.toLowerCase().startsWith(currentFilter)) return false;
    }

    // 검색어 필터
    if (searchTerm) {
      const searchTarget = [
        port.port.toString(),
        port.processName.toLowerCase(),
        port.pid.toString(),
        port.address.toLowerCase(),
      ].join(' ');

      return searchTarget.includes(searchTerm);
    }

    return true;
  });

  sortPorts();
  renderTable();
  updatePortCount();
}

/**
 * 현재 정렬 설정으로 포트를 정렬한다
 */
function sortPorts() {
  const { key, asc } = currentSort;

  filteredPorts.sort((a, b) => {
    let valA = a[key];
    let valB = b[key];

    if (typeof valA === 'string') {
      valA = valA.toLowerCase();
      valB = valB.toLowerCase();
      return asc ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }

    return asc ? valA - valB : valB - valA;
  });
}

// === 렌더링 ===

/**
 * 포트 테이블을 렌더링한다
 */
function renderTable() {
  if (filteredPorts.length === 0 && allPorts.length > 0) {
    showState('empty');
    return;
  }

  showState('table');

  const html = filteredPorts.map((port) => {
    const protocolClass = port.protocol.toLowerCase().startsWith('tcp') ? 'tcp' : 'udp';

    return `
      <tr data-pid="${port.pid}">
        <td><span class="badge badge-${protocolClass}">${escapeHtml(port.protocol)}</span></td>
        <td class="address-cell">${escapeHtml(port.address)}</td>
        <td class="port-cell">${port.port}</td>
        <td class="pid-cell">${port.pid}</td>
        <td class="process-cell" title="${escapeHtml(port.processName)}">${escapeHtml(port.processName)}</td>
        <td>
          <button
            class="btn btn-kill-row"
            data-pid="${port.pid}"
            data-name="${escapeHtml(port.processName)}"
            data-port="${port.port}"
          >종료</button>
        </td>
      </tr>
    `;
  }).join('');

  elements.portTableBody.innerHTML = html;
}

/**
 * 포트 카운트를 업데이트한다
 */
function updatePortCount() {
  const total = allPorts.length;
  const filtered = filteredPorts.length;

  elements.portCount.textContent = total === filtered
    ? `${total}개 포트`
    : `${filtered} / ${total}개 포트`;
}

/**
 * 화면 상태를 전환한다
 */
function showState(state) {
  // hidden 클래스를 사용하여 CSP 규정 준수 (인라인 스타일 제거)
  elements.loading.classList.toggle('hidden', state !== 'loading');
  elements.errorState.classList.toggle('hidden', state !== 'error');
  elements.emptyState.classList.toggle('hidden', state !== 'empty');
  elements.tableContainer.classList.toggle('hidden', state !== 'table');
}

// === 모달 ===

function openKillModal(pid, processName, port) {
  killTarget = { pid, processName, port };
  elements.modalProcessName.textContent = processName;
  elements.modalPid.textContent = pid;
  elements.modalPort.textContent = port;
  elements.modalOverlay.classList.add('active');
}

function closeModal() {
  elements.modalOverlay.classList.remove('active');
  killTarget = null;
}

/**
 * Kill 확인 시 IPC를 통해 프로세스를 종료한다
 */
async function confirmKill() {
  if (!killTarget) return;

  const { pid, processName } = killTarget;
  closeModal();

  try {
    // preload.js에서 노출한 portAPI 사용
    const result = await window.portAPI.killProcess(pid);

    if (result.success) {
      showToast(`✅ ${processName} (PID: ${pid}) 종료됨`, 'success');

      const row = elements.portTableBody.querySelector(`tr[data-pid="${pid}"]`);
      if (row) {
        row.classList.add('row-removing');
        setTimeout(() => loadPorts(), 500);
      } else {
        loadPorts();
      }
    } else {
      showToast(`❌ ${result.message}`, 'error');
    }
  } catch (error) {
    showToast(`❌ 오류: ${error.message}`, 'error');
  }
}

// === 토스트 알림 ===

function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  elements.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('toast-out');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// === 유틸리티 ===

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// === 이벤트 바인딩 ===

let searchTimeout;
elements.searchInput.addEventListener('input', () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(applyFilters, 200);
});

elements.btnClear.addEventListener('click', () => {
  elements.searchInput.value = '';
  applyFilters();
  elements.searchInput.focus();
});

elements.btnRefresh.addEventListener('click', loadPorts);

// 포트 테이블 - 이벤트 위임 (종료 버튼)
elements.portTableBody.addEventListener('click', (e) => {
  const btn = e.target.closest('.btn-kill-row');
  if (!btn) return;
  const pid = parseInt(btn.dataset.pid, 10);
  const name = btn.dataset.name;
  const port = parseInt(btn.dataset.port, 10);
  openKillModal(pid, name, port);
});

document.querySelectorAll('.filter-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelector('.filter-btn.active').classList.remove('active');
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    applyFilters();
  });
});

document.querySelectorAll('.port-table th.sortable').forEach((th) => {
  th.addEventListener('click', () => {
    const key = th.dataset.sort;

    if (currentSort.key === key) {
      currentSort.asc = !currentSort.asc;
    } else {
      currentSort = { key, asc: true };
    }

    document.querySelectorAll('.port-table th').forEach((h) => h.classList.remove('sorted'));
    th.classList.add('sorted');
    th.querySelector('.sort-icon').textContent = currentSort.asc ? '▲' : '▼';

    applyFilters();
  });
});

elements.modalClose.addEventListener('click', closeModal);
elements.btnCancel.addEventListener('click', closeModal);
elements.btnConfirmKill.addEventListener('click', confirmKill);

elements.modalOverlay.addEventListener('click', (e) => {
  if (e.target === elements.modalOverlay) closeModal();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

// === 초기 로드 ===
loadPorts();
