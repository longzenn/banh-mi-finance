/* ==========================================================================
   BANH MI FINANCE - APPLICATION LOGIC
   Featuring SPA views, Custom Calculator, Tab Syncing & SVG Statistics Charts
   ========================================================================== */

// 1. DỮ LIỆU DANH MỤC MẶC ĐỊNH
const DEFAULT_CATEGORIES = [
  // Loại Chi (Expense)
  { name: 'Ăn uống', type: 'expense', color: '#ff9800' }, // Cam
  { name: 'Xăng - Đi lại', type: 'expense', color: '#78909c' }, // Xám xanh
  { name: 'Mua sắm', type: 'expense', color: '#e91e63' }, // Hồng
  { name: 'Nhà cửa', type: 'expense', color: '#9c27b0' }, // Tím
  { name: 'Giải trí', type: 'expense', color: '#03a9f4' }, // Xanh dương
  { name: 'Sức khỏe', type: 'expense', color: '#ef5350' }, // Đỏ
  { name: 'Học tập', type: 'expense', color: '#4caf50' }, // Xanh lá
  
  // Loại Thu (Income)
  { name: 'Lương', type: 'income', color: '#2e7d32' }, // Xanh lá đậm
  { name: 'Thưởng', type: 'income', color: '#4caf50' }, // Xanh lá vừa
  { name: 'Quà tặng', type: 'income', color: '#fbc02d' }, // Vàng
  { name: 'Khác', type: 'income', color: '#9e9e9e' } // Xám
];

// Preset màu sắc cho việc thêm danh mục mới
const PRESET_COLORS = [
  '#ef5350', '#ec407a', '#ab47bc', '#7e57c2', '#5c6bc0',
  '#29b6f6', '#26c6da', '#26a69a', '#9ccc65', '#d4e157',
  '#ffee58', '#ffca28', '#ffa726', '#ff7043', '#8d6e63',
  '#bdbdbd', '#78909c', '#4caf50', '#ff9800', '#00bcd4'
];

// Helper lấy ngày động tương đối so với ngày hiện tại (YYYY-MM-DD)
function getRelativeDateString(daysOffset) {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// 2. DỮ LIỆU GIAO DỊCH MẶC ĐỊNH (Khớp chính xác với hình mẫu và số liệu)
// Giả định ngày hiện tại là ngày chạy app (hôm nay).
// Hôm nay: Bánh mì x2 (-50k, Nong)
// Hôm qua: Gửi xe nz (-5k, Nong), Bánh mì (-20k, Nong)
// Ngày kia (01/06/2026 tương đối): Gửi xe nz (-5k, Nong), Bún riêu (-56.5k, Dung), Mì trộn (-17k, Nong), Cà phê sữa (-43k, Dung)
// Ngoài ra có khoản lương để có số dư 21,358,118 đ (Tổng thu = 21,554,618 đ)
const getDefaultTransactions = () => [
  {
    id: 'tx_default_1',
    description: 'Bánh mì x2',
    amount: 50000,
    type: 'expense',
    date: getRelativeDateString(0), // Hôm nay
    category: 'Ăn uống',
    member: 'Nong'
  },
  {
    id: 'tx_default_2',
    description: 'Gửi xe nz',
    amount: 5000,
    type: 'expense',
    date: getRelativeDateString(-1), // Hôm qua
    category: 'Xăng - Đi lại',
    member: 'Nong'
  },
  {
    id: 'tx_default_3',
    description: 'Bánh mì',
    amount: 20000,
    type: 'expense',
    date: getRelativeDateString(-1), // Hôm qua
    category: 'Ăn uống',
    member: 'Nong'
  },
  {
    id: 'tx_default_4',
    description: 'Gửi xe nz',
    amount: 5000,
    type: 'expense',
    date: getRelativeDateString(-2), // 2 ngày trước (Ví dụ: 01/06/2026)
    category: 'Xăng - Đi lại',
    member: 'Nong'
  },
  {
    id: 'tx_default_5',
    description: 'Bún riêu',
    amount: 56500,
    type: 'expense',
    date: getRelativeDateString(-2),
    category: 'Ăn uống',
    member: 'Dung'
  },
  {
    id: 'tx_default_6',
    description: 'Mì trộn',
    amount: 17000,
    type: 'expense',
    date: getRelativeDateString(-2),
    category: 'Ăn uống',
    member: 'Nong'
  },
  {
    id: 'tx_default_7',
    description: 'Cà phê sữa',
    amount: 43000,
    type: 'expense',
    date: getRelativeDateString(-2),
    category: 'Ăn uống',
    member: 'Dung'
  },
  {
    id: 'tx_default_8',
    description: 'Nhận lương tháng 5',
    amount: 21554618,
    type: 'income',
    date: getRelativeDateString(-2),
    category: 'Lương',
    member: 'Dung'
  }
];

// 3. QUẢN LÝ TRẠNG THÁI (APPLICATION STATE)
let state = {
  transactions: [],
  categories: [],
  activeMember: 'both', // 'both' | 'Nong' | 'Dung' (dành cho bộ lọc xem)
  currentUserPerspective: 'Nong', // 'Nong' | 'Dung' (người dùng mặc định khi nhập liệu)
  
  // Trạng thái bộ lọc thời gian
  currentRange: 'month', // 'day' | 'week' | 'month' | 'year' | 'all'
  currentDateOffset: 0, // 0 = hiện tại, -1 = trước đó, +1 = tiếp theo
  
  // Trạng thái màn hình nhập liệu
  txForm: {
    id: null, // null nghĩa là thêm mới, có ID là đang sửa
    type: 'expense', // 'expense' | 'income'
    description: '',
    category: '',
    date: getRelativeDateString(0),
    member: 'Nong',
    amountRaw: '0', // Chuỗi biểu thức gõ trên bàn phím (ví dụ: '20000+5000')
    amountVal: 0 // Giá trị số thực tế sau khi tính toán
  },
  
  // Trạng thái báo cáo
  reportType: 'expense', // 'expense' | 'income'
  reportRange: 'month',
  reportDateOffset: 0,
  
  // Trạng thái tìm kiếm
  searchActive: false,
  searchQuery: '',
  
  selectedTxId: null, // Giao dịch đang được chọn để Sửa/Xóa
  keyboardActive: false, // Bàn phím ảo ẩn/hiện
  calendarSheetDate: new Date(), // Tháng/Năm hiện tại của lịch chọn ngày
  theme: 'light', // 'light' | 'dark'

  // Trạng thái Supabase
  supabaseConfig: {
    url: '',
    key: ''
  },
  isCloudActive: false,
  
  // Trạng thái bộ lọc tháng trên trang chủ
  homeMonthOffset: 0
};

// Khởi tạo BroadcastChannel để đồng bộ đa tab
const syncChannel = new BroadcastChannel('banhmi_finance_sync');

// --- KẾT NỐI VÀ ĐỒNG BỘ ĐÁM MÂY SUPABASE ---
let supabaseClient = null;
let realtimeSubscription = null;

// Hàm khởi tạo kết nối Supabase
async function initSupabase(url, key) {
  if (!url || !key) {
    setCloudStatus('offline');
    return false;
  }
  
  setCloudStatus('connecting');
  
  try {
    // Khởi tạo client
    supabaseClient = supabase.createClient(url, key);
    
    // Kiểm tra kết nối bằng cách đọc bảng transactions thử
    const { data, error } = await supabaseClient.from('transactions').select('id').limit(1);
    
    if (error) {
      throw error;
    }
    
    state.supabaseConfig.url = url;
    state.supabaseConfig.key = key;
    state.isCloudActive = true;
    
    localStorage.setItem('banhmi_supabase_url', url);
    localStorage.setItem('banhmi_supabase_key', key);
    
    setCloudStatus('online');
    updateSupabaseUIState(true);
    
    // Đăng ký realtime lắng nghe thay đổi
    subscribeRealtime();
    
    // Tải dữ liệu từ Supabase và thực hiện migration nếu cần
    await syncDataFromCloud();
    
    return true;
  } catch (err) {
    console.error('Lỗi kết nối Supabase:', err);
    setCloudStatus('offline', 'Kết nối thất bại: ' + err.message);
    state.isCloudActive = false;
    supabaseClient = null;
    updateSupabaseUIState(false);
    return false;
  }
}

function setCloudStatus(status, message = '') {
  const badge = document.getElementById('supabase-status-badge');
  const dot = badge.querySelector('.status-dot');
  const text = badge.querySelector('.status-text');
  
  badge.className = 'cloud-status-badge ' + status;
  
  if (status === 'online') {
    text.innerText = 'Đã kết nối đám mây (Trực tuyến)';
  } else if (status === 'connecting') {
    text.innerText = 'Đang kết nối...';
  } else {
    text.innerText = message || 'Đang chạy Ngoại tuyến (Local Only)';
  }
}

function updateSupabaseUIState(connected) {
  const connBtn = document.getElementById('supabase-connect-btn');
  const disconnBtn = document.getElementById('supabase-disconnect-btn');
  const urlInput = document.getElementById('supabase-url');
  const keyInput = document.getElementById('supabase-key');
  
  if (connected) {
    connBtn.style.display = 'none';
    disconnBtn.style.display = 'block';
    urlInput.disabled = true;
    keyInput.disabled = true;
    urlInput.value = state.supabaseConfig.url;
    keyInput.value = state.supabaseConfig.key;
  } else {
    connBtn.style.display = 'block';
    disconnBtn.style.display = 'none';
    urlInput.disabled = false;
    keyInput.disabled = false;
  }
}

// Lắng nghe thay đổi thời gian thực
function subscribeRealtime() {
  if (!supabaseClient) return;
  
  if (realtimeSubscription) {
    supabaseClient.removeChannel(realtimeSubscription);
  }
  
  // Lắng nghe thay đổi trên cả bảng transactions và categories
  realtimeSubscription = supabaseClient.channel('schema-db-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, (payload) => {
      console.log('Phát hiện thay đổi transactions trên cloud:', payload);
      fetchTransactionsFromCloud();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, (payload) => {
      console.log('Phát hiện thay đổi categories trên cloud:', payload);
      fetchCategoriesFromCloud();
    })
    .subscribe();
}

// Tải và đồng bộ dữ liệu từ Supabase về
async function syncDataFromCloud() {
  if (!supabaseClient) return;
  
  setCloudStatus('connecting');
  
  try {
    // 1. Đẩy các thay đổi ngoại tuyến lên cloud (Push)
    
    // a. Xử lý xóa giao dịch ngoại tuyến
    const deletedTxIds = getDeletedTxIds();
    for (const id of deletedTxIds) {
      const { error } = await supabaseClient.from('transactions').delete().eq('id', id);
      if (!error) {
        dequeueDeletedTx(id);
      }
    }
    
    // b. Xử lý xóa danh mục ngoại tuyến
    const deletedCats = getDeletedCats();
    for (const cat of deletedCats) {
      const { error } = await supabaseClient.from('categories').delete().eq('name', cat.name).eq('type', cat.type);
      if (!error) {
        dequeueDeletedCat(cat.name, cat.type);
      }
    }
    
    // c. Xử lý thêm/sửa giao dịch ngoại tuyến
    const unsyncedTxIds = getUnsyncedTxIds();
    for (const id of unsyncedTxIds) {
      const tx = state.transactions.find(t => t.id === id);
      if (tx) {
        const { error } = await supabaseClient.from('transactions').upsert(tx);
        if (!error) {
          dequeueUnsyncedTx(id);
        }
      } else {
        dequeueUnsyncedTx(id);
      }
    }
    
    // d. Xử lý thêm danh mục ngoại tuyến
    const unsyncedCats = getUnsyncedCats();
    for (const cat of unsyncedCats) {
      const existsInLocal = state.categories.find(c => c.name === cat.name && c.type === cat.type);
      if (existsInLocal) {
        const { error } = await supabaseClient.from('categories').upsert(cat);
        if (!error) {
          dequeueUnsyncedCat(cat.name, cat.type);
        }
      } else {
        dequeueUnsyncedCat(cat.name, cat.type);
      }
    }
    
    // 2. Tải dữ liệu mới nhất từ cloud về (Pull)
    const { data: cloudCats, error: catError } = await supabaseClient.from('categories').select('*');
    if (catError) throw catError;
    
    const { data: cloudTxs, error: txError } = await supabaseClient.from('transactions').select('*');
    if (txError) throw txError;
    
    // Nếu cả hai bảng đều trống, thực hiện migrate dữ liệu local lên cloud
    if (cloudCats.length === 0 && cloudTxs.length === 0) {
      console.log('Phát hiện database trống, tiến hành đồng bộ dữ liệu local lên cloud...');
      await migrateLocalToCloud();
    } else {
      // 3. Hợp nhất dữ liệu đám mây với các phần tử cục bộ chưa kịp đồng bộ (Merge)
      
      // Merge Categories:
      let mergedCats = cloudCats.map(c => ({ name: c.name, type: c.type, color: c.color }));
      const remainingUnsyncedCats = getUnsyncedCats();
      remainingUnsyncedCats.forEach(uc => {
        if (!mergedCats.some(c => c.name === uc.name && c.type === uc.type)) {
          mergedCats.push(uc);
        }
      });
      const remainingDeletedCats = getDeletedCats();
      mergedCats = mergedCats.filter(c => !remainingDeletedCats.some(dc => dc.name === c.name && dc.type === c.type));
      
      state.categories = mergedCats;
      localStorage.setItem('banhmi_categories', JSON.stringify(state.categories));
      
      // Merge Transactions:
      let mergedTxs = cloudTxs.map(t => ({
        id: t.id,
        description: t.description,
        amount: Number(t.amount),
        type: t.type,
        date: t.date,
        category: t.category,
        member: t.member
      }));
      const remainingUnsyncedTxIds = getUnsyncedTxIds();
      remainingUnsyncedTxIds.forEach(id => {
        const localTx = state.transactions.find(t => t.id === id);
        if (localTx && !mergedTxs.some(t => t.id === id)) {
          mergedTxs.push(localTx);
        }
      });
      const remainingDeletedTxIds = getDeletedTxIds();
      mergedTxs = mergedTxs.filter(t => !remainingDeletedTxIds.includes(t.id));
      
      state.transactions = mergedTxs;
      localStorage.setItem('banhmi_transactions', JSON.stringify(state.transactions));
      
      setCloudStatus('online');
      renderAll();
    }
  } catch (err) {
    console.error('Lỗi khi đồng bộ dữ liệu đám mây:', err);
    setCloudStatus('offline', 'Không thể kết nối để đồng bộ: ' + err.message);
  }
}

async function fetchTransactionsFromCloud() {
  if (!supabaseClient) return;
  const { data: cloudTxs, error } = await supabaseClient.from('transactions').select('*');
  if (!error && cloudTxs) {
    let mergedTxs = cloudTxs.map(t => ({
      id: t.id,
      description: t.description,
      amount: Number(t.amount),
      type: t.type,
      date: t.date,
      category: t.category,
      member: t.member
    }));
    
    const remainingUnsyncedTxIds = getUnsyncedTxIds();
    remainingUnsyncedTxIds.forEach(id => {
      const localTx = state.transactions.find(t => t.id === id);
      if (localTx && !mergedTxs.some(t => t.id === id)) {
        mergedTxs.push(localTx);
      }
    });
    
    const remainingDeletedTxIds = getDeletedTxIds();
    mergedTxs = mergedTxs.filter(t => !remainingDeletedTxIds.includes(t.id));
    
    state.transactions = mergedTxs;
    localStorage.setItem('banhmi_transactions', JSON.stringify(state.transactions));
    renderAll();
  }
}

async function fetchCategoriesFromCloud() {
  if (!supabaseClient) return;
  const { data: cloudCats, error } = await supabaseClient.from('categories').select('*');
  if (!error && cloudCats) {
    let mergedCats = cloudCats.map(c => ({ name: c.name, type: c.type, color: c.color }));
    
    const remainingUnsyncedCats = getUnsyncedCats();
    remainingUnsyncedCats.forEach(uc => {
      if (!mergedCats.some(c => c.name === uc.name && c.type === uc.type)) {
        mergedCats.push(uc);
      }
    });
    
    const remainingDeletedCats = getDeletedCats();
    mergedCats = mergedCats.filter(c => !remainingDeletedCats.some(dc => dc.name === c.name && dc.type === c.type));
    
    state.categories = mergedCats;
    localStorage.setItem('banhmi_categories', JSON.stringify(state.categories));
    renderCategoriesManageView();
    renderModalCategories();
  }
}

// Đẩy dữ liệu cục bộ lên đám mây (Migration)
async function migrateLocalToCloud() {
  if (!supabaseClient) return;
  
  try {
    // 1. Đẩy danh mục
    if (state.categories.length > 0) {
      const catsToInsert = state.categories.map(c => ({ name: c.name, type: c.type, color: c.color }));
      const { error } = await supabaseClient.from('categories').insert(catsToInsert);
      if (error) console.error('Lỗi khi migrate categories:', error);
    }
    
    // 2. Đẩy giao dịch
    if (state.transactions.length > 0) {
      const txsToInsert = state.transactions.map(t => ({
        id: t.id,
        description: t.description,
        amount: t.amount,
        type: t.type,
        date: t.date,
        category: t.category,
        member: t.member
      }));
      const { error } = await supabaseClient.from('transactions').insert(txsToInsert);
      if (error) console.error('Lỗi khi migrate transactions:', error);
    }
    
    console.log('Migrate dữ liệu thành công!');
  } catch (err) {
    console.error('Lỗi trong quá trình migrate:', err);
  }
}

// Ngắt kết nối Supabase, quay lại offline
function disconnectSupabase() {
  if (supabaseClient && realtimeSubscription) {
    supabaseClient.removeChannel(realtimeSubscription);
  }
  
  supabaseClient = null;
  realtimeSubscription = null;
  state.isCloudActive = false;
  state.supabaseConfig.url = '';
  state.supabaseConfig.key = '';
  
  localStorage.removeItem('banhmi_supabase_url');
  localStorage.removeItem('banhmi_supabase_key');
  
  setCloudStatus('offline');
  updateSupabaseUIState(false);
  
  // Tải lại dữ liệu offline từ localStorage
  loadDataFromStorage();
  renderAll();
}

// ==========================================================================
// 4. KHỞI TẠO VÀ LƯU TRỮ DỮ LIỆU
// ==========================================================================

function initApp() {
  // Tải danh mục
  const storedCats = localStorage.getItem('banhmi_categories');
  if (storedCats) {
    state.categories = JSON.parse(storedCats);
  } else {
    state.categories = [...DEFAULT_CATEGORIES];
    localStorage.setItem('banhmi_categories', JSON.stringify(state.categories));
  }

  // Tải giao dịch
  const storedTxs = localStorage.getItem('banhmi_transactions');
  if (storedTxs) {
    state.transactions = JSON.parse(storedTxs);
  } else {
    state.transactions = getDefaultTransactions();
    localStorage.setItem('banhmi_transactions', JSON.stringify(state.transactions));
  }

  // Tải theme
  const storedTheme = localStorage.getItem('banhmi_theme');
  if (storedTheme) {
    state.theme = storedTheme;
  } else {
    state.theme = 'light';
  }
  
  // Áp dụng theme ban đầu
  applyTheme();

  // Tải tài khoản hoạt động mặc định
  const storedActiveMember = localStorage.getItem('banhmi_active_member');
  if (storedActiveMember) {
    state.activeMember = storedActiveMember;
  }

  // Tải người dùng mặc định khi nhập liệu
  const storedDefaultInputMember = localStorage.getItem('banhmi_default_input_member');
  if (storedDefaultInputMember) {
    state.currentUserPerspective = storedDefaultInputMember;
  } else {
    state.currentUserPerspective = (state.activeMember && state.activeMember !== 'both') ? state.activeMember : 'Nong';
  }

  // Thiết lập mặc định ngày nhập liệu là hôm nay
  state.txForm.date = getRelativeDateString(0);
  state.txForm.member = state.currentUserPerspective;

  // Lắng nghe đồng bộ từ tab khác
  syncChannel.onmessage = (event) => {
    if (event.data && event.data.type === 'SYNC_DATA') {
      loadDataFromStorage();
      renderAll();
    }
  };

  // Đăng ký toàn bộ sự kiện
  registerEventListeners();

  // Chọn danh mục đầu tiên làm mặc định trong form
  resetForm();

  // Tải cấu hình Supabase và kết nối nếu có
  const cloudUrl = localStorage.getItem('banhmi_supabase_url') || '';
  const cloudKey = localStorage.getItem('banhmi_supabase_key') || '';
  
  if (cloudUrl && cloudKey) {
    state.supabaseConfig.url = cloudUrl;
    state.supabaseConfig.key = cloudKey;
    initSupabase(cloudUrl, cloudKey);
  }

  // Render giao diện lần đầu
  renderAll();
  updateSyncQueueUI();
}

function loadDataFromStorage() {
  state.categories = JSON.parse(localStorage.getItem('banhmi_categories')) || [...DEFAULT_CATEGORIES];
  state.transactions = JSON.parse(localStorage.getItem('banhmi_transactions')) || getDefaultTransactions();
  
  const storedActiveMember = localStorage.getItem('banhmi_active_member');
  if (storedActiveMember) {
    state.activeMember = storedActiveMember;
  }
}

// --- CÁC HÀM QUẢN LÝ HÀNG ĐỢI ĐỒNG BỘ NGOẠI TUYẾN ---
function getUnsyncedTxIds() {
  return JSON.parse(localStorage.getItem('banhmi_unsynced_tx_ids')) || [];
}
function saveUnsyncedTxIds(ids) {
  localStorage.setItem('banhmi_unsynced_tx_ids', JSON.stringify(ids));
  updateSyncQueueUI();
}
function enqueueUnsyncedTx(id) {
  const ids = getUnsyncedTxIds();
  if (!ids.includes(id)) {
    ids.push(id);
    saveUnsyncedTxIds(ids);
  }
}
function dequeueUnsyncedTx(id) {
  const ids = getUnsyncedTxIds().filter(x => x !== id);
  saveUnsyncedTxIds(ids);
}

function getDeletedTxIds() {
  return JSON.parse(localStorage.getItem('banhmi_deleted_tx_ids')) || [];
}
function saveDeletedTxIds(ids) {
  localStorage.setItem('banhmi_deleted_tx_ids', JSON.stringify(ids));
  updateSyncQueueUI();
}
function enqueueDeletedTx(id) {
  const ids = getDeletedTxIds();
  if (!ids.includes(id)) {
    ids.push(id);
    saveDeletedTxIds(ids);
  }
  dequeueUnsyncedTx(id);
}
function dequeueDeletedTx(id) {
  const ids = getDeletedTxIds().filter(x => x !== id);
  saveDeletedTxIds(ids);
}

function getUnsyncedCats() {
  return JSON.parse(localStorage.getItem('banhmi_unsynced_cats')) || [];
}
function saveUnsyncedCats(cats) {
  localStorage.setItem('banhmi_unsynced_cats', JSON.stringify(cats));
  updateSyncQueueUI();
}
function enqueueUnsyncedCat(name, type, color) {
  const cats = getUnsyncedCats();
  if (!cats.some(c => c.name === name && c.type === type)) {
    cats.push({ name, type, color });
    saveUnsyncedCats(cats);
  }
}
function dequeueUnsyncedCat(name, type) {
  const cats = getUnsyncedCats().filter(c => !(c.name === name && c.type === type));
  saveUnsyncedCats(cats);
}

function getDeletedCats() {
  return JSON.parse(localStorage.getItem('banhmi_deleted_cats')) || [];
}
function saveDeletedCats(cats) {
  localStorage.setItem('banhmi_deleted_cats', JSON.stringify(cats));
  updateSyncQueueUI();
}
function enqueueDeletedCat(name, type) {
  const cats = getDeletedCats();
  if (!cats.some(c => c.name === name && c.type === type)) {
    cats.push({ name, type });
    saveDeletedCats(cats);
  }
  dequeueUnsyncedCat(name, type);
}
function dequeueDeletedCat(name, type) {
  const cats = getDeletedCats().filter(c => !(c.name === name && c.type === type));
  saveDeletedCats(cats);
}

function updateSyncQueueUI() {
  const unsyncedTxs = getUnsyncedTxIds().length;
  const deletedTxs = getDeletedTxIds().length;
  const unsyncedCats = getUnsyncedCats().length;
  const deletedCats = getDeletedCats().length;
  
  const totalPending = unsyncedTxs + deletedTxs + unsyncedCats + deletedCats;
  const queueStatusEl = document.getElementById('supabase-queue-status');
  
  if (!queueStatusEl) return;
  
  if (totalPending > 0) {
    queueStatusEl.innerText = `Chờ đồng bộ: ${unsyncedTxs + deletedTxs} giao dịch, ${unsyncedCats + deletedCats} nhãn`;
    queueStatusEl.style.display = 'block';
  } else {
    queueStatusEl.style.display = 'none';
  }
}

function saveAndSync() {
  localStorage.setItem('banhmi_categories', JSON.stringify(state.categories));
  localStorage.setItem('banhmi_transactions', JSON.stringify(state.transactions));
  localStorage.setItem('banhmi_active_member', state.activeMember);
  
  // Bắn tín hiệu sang các tab khác
  syncChannel.postMessage({ type: 'SYNC_DATA' });
}

function applyTheme() {
  const body = document.body;
  const themeToggle = document.getElementById('theme-toggle');
  const sunIcon = themeToggle.querySelector('.sun-icon');
  const moonIcon = themeToggle.querySelector('.moon-icon');

  if (state.theme === 'dark') {
    body.classList.add('dark-theme');
    sunIcon.style.display = 'none';
    moonIcon.style.display = 'block';
  } else {
    body.classList.remove('dark-theme');
    sunIcon.style.display = 'block';
    moonIcon.style.display = 'none';
  }
  localStorage.setItem('banhmi_theme', state.theme);
}

// ==========================================================================
// 5. MÁY TÍNH & ĐỊNH DẠNG TIỀN TỆ (CALCULATOR & FORMATTERS)
// ==========================================================================

// Định dạng tiền tệ VNĐ (ví dụ: 21,358,118 đ)
function formatMoney(amount, showSign = false, type = '') {
  const formatted = Math.abs(amount).toLocaleString('en-US'); // dùng dấu phẩy cho hàng nghìn giống screenshot
  const sign = showSign ? (amount > 0 ? '+ ' : (amount < 0 ? '- ' : '')) : '';
  return `${sign}${formatted} đ`;
}

// Tính toán biểu thức số học cơ bản một cách an toàn
function evaluateExpression(expr) {
  // Thay thế ký hiệu nhân chia
  let cleanExpr = expr.replace(/×/g, '*').replace(/÷/g, '/');
  
  // Chỉ cho phép chữ số, các toán tử +, -, *, /, dấu chấm thập phân và khoảng trắng
  if (!/^[0-9+\-*/.\s]+$/.test(cleanExpr)) {
    return 0;
  }
  
  try {
    // Sử dụng Function để tính toán an toàn sau khi đã lọc qua Regex
    const calcFn = new Function(`return (${cleanExpr})`);
    const result = calcFn();
    return typeof result === 'number' && isFinite(result) ? Math.round(result) : 0;
  } catch (e) {
    return 0;
  }
}

// Định dạng chuỗi số khi đang gõ máy tính (Thêm dấu phẩy cho phần số nguyên)
function formatCalculatorDisplay(expr) {
  if (expr === '0' || expr === '') return '0';
  
  // Tách biểu thức thành các phần số và toán tử để định dạng riêng các phần số
  return expr.replace(/([0-9.]+)/g, (match) => {
    if (match.includes('.')) {
      const parts = match.split('.');
      const integerPart = parseInt(parts[0], 10);
      return isNaN(integerPart) ? match : integerPart.toLocaleString('en-US') + '.' + parts[1];
    } else {
      const integerPart = parseInt(match, 10);
      return isNaN(integerPart) ? match : integerPart.toLocaleString('en-US');
    }
  });
}

// ==========================================================================
// 6. XỬ LÝ LỌC THỜI GIAN (DATE FILTER RANGE ENGINE)
// ==========================================================================

// Lấy thông tin khoảng ngày bắt đầu và kết thúc dựa trên Bộ lọc và Offset
function getDateRange(rangeType, offset) {
  const today = new Date();
  let start = new Date(today);
  let end = new Date(today);

  switch (rangeType) {
    case 'day':
      start.setDate(today.getDate() + offset);
      end.setDate(today.getDate() + offset);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;

    case 'week':
      // Tính ngày Thứ 2 của tuần này
      const dayOfWeek = today.getDay(); // 0 (CN) đến 6 (T7)
      const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      start.setDate(today.getDate() + diffToMonday + (offset * 7));
      end.setDate(start.getDate() + 6);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;

    case 'month':
      start = new Date(today.getFullYear(), today.getMonth() + offset, 1);
      end = new Date(today.getFullYear(), today.getMonth() + offset + 1, 0);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;

    case 'year':
      start = new Date(today.getFullYear() + offset, 0, 1);
      end = new Date(today.getFullYear() + offset, 11, 31);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;

    case 'all':
    default:
      start = new Date(0); // Từ lúc bắt đầu thời gian máy tính
      end = new Date(2100, 11, 31);
      break;
  }

  return { start, end };
}

// Format hiển thị văn bản mô tả khoảng thời gian lọc
function getRangeDisplayText(rangeType, offset, start, end) {
  const today = new Date();
  
  if (rangeType === 'all') {
    return 'Toàn thời gian';
  }

  // Kiểm tra xem khoảng thời gian đó có phải là "Hiện tại" (hôm nay, tuần này, tháng này, năm nay)
  const isCurrent = offset === 0;

  const formatShortDate = (date) => {
    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
  };

  switch (rangeType) {
    case 'day':
      if (isCurrent) return 'Hôm nay';
      if (offset === -1) return 'Hôm qua';
      return `${String(start.getDate()).padStart(2, '0')}/${String(start.getMonth() + 1).padStart(2, '0')}/${start.getFullYear()}`;
      
    case 'week':
      if (isCurrent) return 'Tuần này';
      return `Tuần ${formatShortDate(start)} - ${formatShortDate(end)}`;

    case 'month':
      if (isCurrent) return 'Tháng này';
      return `Tháng ${start.getMonth() + 1}/${start.getFullYear()}`;

    case 'year':
      if (isCurrent) return 'Năm nay';
      return `Năm ${start.getFullYear()}`;
  }
}

// Lọc các giao dịch theo khoảng thời gian và thành viên hoạt động
function getFilteredTransactions(rangeType, offset, isReport = false) {
  let txs = [];
  
  if (!isReport) {
    if (state.searchActive && state.searchQuery.trim() !== '') {
      txs = [...state.transactions];
    } else {
      const { start, end } = getDateRange('month', state.homeMonthOffset);
      txs = state.transactions.filter(tx => {
        const txDate = new Date(tx.date);
        txDate.setHours(0,0,0,0);
        return txDate >= start && txDate <= end;
      });
    }
  } else {
    // Trang báo cáo thống kê lọc theo thời gian được chọn
    const { start, end } = getDateRange(rangeType, offset);
    txs = state.transactions.filter(tx => {
      const txDate = new Date(tx.date);
      txDate.setHours(0,0,0,0);
      return txDate >= start && txDate <= end;
    });
  }

  // Áp dụng bộ lọc tìm kiếm nếu đang ở View Sổ thu chi và có nhập ô Tìm kiếm
  if (!isReport && state.searchActive && state.searchQuery.trim() !== '') {
    const q = state.searchQuery.toLowerCase().trim();
    txs = txs.filter(tx => {
      return tx.description.toLowerCase().includes(q) || 
             tx.category.toLowerCase().includes(q) ||
             tx.amount.toString().includes(q) ||
             tx.member.toLowerCase().includes(q);
    });
  }

  // Áp dụng bộ lọc thành viên (chỉ lọc ở Sổ Giao Dịch, Báo cáo luôn hiển thị tổng của nhóm "Bánh Mì")
  if (!isReport && state.activeMember !== 'both') {
    txs = txs.filter(tx => tx.member === state.activeMember);
  }

  // Sắp xếp ngày giảm dần (mới nhất lên trên), cùng ngày thì sắp xếp ID giảm dần
  return txs.sort((a, b) => {
    const dateDiff = new Date(b.date) - new Date(a.date);
    if (dateDiff !== 0) return dateDiff;
    return b.id.localeCompare(a.id);
  });
}

function getHomeMonthLabel(offset) {
  const date = new Date();
  date.setMonth(date.getMonth() + offset);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  
  if (offset === 0) {
    return 'Tháng<br>này';
  } else if (offset === -1) {
    return 'Tháng<br>trước';
  } else {
    return `Tháng<br>${mm}/${yyyy}`;
  }
}

function renderHomeSummary() {
  const { start, end } = getDateRange('month', state.homeMonthOffset);
  
  let monthTxs = state.transactions.filter(tx => {
    const txDate = new Date(tx.date);
    txDate.setHours(0,0,0,0);
    return txDate >= start && txDate <= end;
  });
  
  if (state.activeMember !== 'both') {
    monthTxs = monthTxs.filter(tx => tx.member === state.activeMember);
  }

  let totalExpense = 0;
  let totalIncome = 0;

  monthTxs.forEach(tx => {
    if (tx.type === 'expense') totalExpense += tx.amount;
    else totalIncome += tx.amount;
  });

  document.getElementById('home-month-display').innerHTML = getHomeMonthLabel(state.homeMonthOffset);
  document.getElementById('home-total-expense').innerText = formatMoney(totalExpense);
  document.getElementById('home-total-income').innerText = formatMoney(totalIncome);
}

// ==========================================================================
// 7. VẼ BIỂU ĐỒ TRÒN DỰA TRÊN SVG DỰA VÀO DỮ LIỆU THỰC (DYNAMIC SVG DONUT)
// ==========================================================================

function drawDonutChart(categoryData) {
  const svg = document.getElementById('donut-chart');
  
  // Xóa sạch các segment cũ (chỉ giữ lại vòng tròn rỗng ban đầu)
  const circles = svg.querySelectorAll('.chart-segment');
  circles.forEach(c => c.remove());

  const total = categoryData.reduce((sum, item) => sum + item.amount, 0);

  if (total === 0) {
    // Nếu không có dữ liệu, vẽ một hình tròn xám rỗng
    const emptyCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    emptyCircle.setAttribute('cx', '100');
    emptyCircle.setAttribute('cy', '100');
    emptyCircle.setAttribute('r', '70');
    emptyCircle.setAttribute('fill', 'transparent');
    emptyCircle.setAttribute('stroke', 'var(--border)');
    emptyCircle.setAttribute('stroke-width', '20');
    emptyCircle.setAttribute('class', 'chart-segment');
    svg.appendChild(emptyCircle);
    
    document.getElementById('donut-center-percent').innerText = '0%';
    document.getElementById('donut-center-label').innerText = 'Không có dữ liệu';
    return;
  }

  const r = 70;
  const circumference = 2 * Math.PI * r; // ~439.82
  let accumulatedPercent = 0;

  categoryData.forEach((item, index) => {
    const percent = item.amount / total;
    const strokeLength = percent * circumference;
    const strokeOffset = -accumulatedPercent * circumference;
    
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', '100');
    circle.setAttribute('cy', '100');
    circle.setAttribute('r', r.toString());
    circle.setAttribute('fill', 'transparent');
    circle.setAttribute('stroke', item.color);
    circle.setAttribute('stroke-width', '20');
    circle.setAttribute('stroke-dasharray', `${strokeLength} ${circumference}`);
    circle.setAttribute('stroke-dashoffset', strokeOffset.toString());
    circle.setAttribute('class', 'chart-segment');
    
    // Lưu thông tin danh mục vào element để hover / click
    circle.addEventListener('mouseenter', () => {
      document.getElementById('donut-center-percent').innerText = `${Math.round(percent * 100)}%`;
      document.getElementById('donut-center-label').innerText = item.name;
    });

    circle.addEventListener('mouseleave', () => {
      // Khi rê ra ngoài, hiển thị danh mục lớn nhất
      setCenterToLargest(categoryData, total);
    });

    svg.appendChild(circle);
    accumulatedPercent += percent;
  });

  // Thiết lập hiển thị ở giữa là danh mục lớn nhất
  setCenterToLargest(categoryData, total);
}

function setCenterToLargest(categoryData, total) {
  if (categoryData.length > 0) {
    const largest = categoryData[0];
    const pct = Math.round((largest.amount / total) * 100);
    document.getElementById('donut-center-percent').innerText = `${pct}%`;
    document.getElementById('donut-center-label').innerText = largest.name;
  } else {
    document.getElementById('donut-center-percent').innerText = '0%';
    document.getElementById('donut-center-label').innerText = 'Không có dữ liệu';
  }
}

// ==========================================================================
// 8. RENDER CÁC THÀNH PHẦN GIAO DIỆN (UI RENDERERS)
// ==========================================================================

function renderAll() {
  renderHeaderAndBalance();
  renderHomeSummary();
  renderTransactionsList();
  renderReportView();
  renderMembersView();
  renderCategoriesManageView();
}

// Render số dư chung và thông tin thành viên trên header
function renderHeaderAndBalance() {
  // Tính tổng số dư = Tổng Thu - Tổng Chi toàn bộ thời gian
  let totalIncome = 0;
  let totalExpense = 0;

  state.transactions.forEach(tx => {
    if (tx.type === 'income') totalIncome += tx.amount;
    else totalExpense += tx.amount;
  });

  const balance = totalIncome - totalExpense;
  const balanceEl = document.getElementById('total-balance');
  balanceEl.innerText = formatMoney(balance);
  
  // Đổi màu số dư nếu bị âm (đỏ) hoặc dương (trắng/xanh)
  if (balance < 0) {
    balanceEl.style.color = 'var(--expense)';
  } else {
    balanceEl.style.color = 'var(--white)';
  }

  // Cập nhật text thành viên ở Header
  const activeMemberText = document.getElementById('header-active-member');
  if (state.activeMember === 'both') {
    activeMemberText.innerText = 'Cả hai thành viên ▾';
  } else {
    activeMemberText.innerText = `${state.activeMember} ▾`;
  }
}

// Render danh sách giao dịch ở Sổ thu chi (Hiển thị toàn bộ lịch sử)
function renderTransactionsList() {
  const container = document.getElementById('transactions-list');
  const txs = getFilteredTransactions(null, null, false);

  if (txs.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="8" y1="12" x2="16" y2="12"></line>
        </svg>
        <p>Không có giao dịch nào trong khoảng thời gian này.</p>
      </div>
    `;
    return;
  }

  // Nhóm giao dịch theo ngày
  const grouped = {};
  txs.forEach(tx => {
    if (!grouped[tx.date]) {
      grouped[tx.date] = [];
    }
    grouped[tx.date].push(tx);
  });

  let html = '';
  // Duyệt qua các ngày đã được sắp xếp giảm dần
  const sortedDates = Object.keys(grouped).sort((a, b) => new Date(b) - new Date(a));
  
  sortedDates.forEach(dateStr => {
    // Đổi hiển thị ngày đẹp: Hôm nay, Hôm qua, hoặc DD/MM/YYYY
    let dayLabel = '';
    const todayStr = getRelativeDateString(0);
    const yesterdayStr = getRelativeDateString(-1);
    
    if (dateStr === todayStr) {
      dayLabel = 'Hôm nay';
    } else if (dateStr === yesterdayStr) {
      dayLabel = 'Hôm qua';
    } else {
      const d = new Date(dateStr);
      dayLabel = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    }

    html += `
      <div class="date-group">
        <div class="date-header">${dayLabel}</div>
    `;

    grouped[dateStr].forEach(tx => {
      const catColor = getCategoryColor(tx.category, tx.type);
      const isExpense = tx.type === 'expense';
      const amountFormatted = (isExpense ? '' : '+') + tx.amount.toLocaleString('en-US');
      const amountClass = isExpense ? 'text-expense' : 'text-income';
      const iconText = tx.description.charAt(0).toUpperCase();

      html += `
        <div class="transaction-card" data-id="${tx.id}">
          <div class="tx-icon-wrapper ${tx.type}">
            ${isExpense ? '−' : '+'}
          </div>
          <div class="tx-details">
            <span class="tx-description">${tx.description}</span>
            <div class="tx-meta-row">
              <span class="category-tag" style="background-color: ${catColor};">${tx.category}</span>
            </div>
          </div>
          <div class="tx-right">
            <span class="tx-amount ${amountClass}">${amountFormatted}</span>
            <span class="tx-member-badge">${tx.member}</span>
          </div>
        </div>
      `;
    });

    html += `</div>`;
  });

  container.innerHTML = html;

  // Lắng nghe sự kiện click vào mỗi transaction card để mở bottom sheet sửa/xóa
  container.querySelectorAll('.transaction-card').forEach(card => {
    card.addEventListener('click', () => {
      const txId = card.getAttribute('data-id');
      openActionSheet(txId);
    });
  });
}

// Render View Báo cáo thống kê
function renderReportView() {
  const txs = getFilteredTransactions(state.reportRange, state.reportDateOffset, true);
  const { start, end } = getDateRange(state.reportRange, state.reportDateOffset);
  
  // Hiển thị text kỳ lọc báo cáo
  document.getElementById('report-range-display-text').innerText = getRangeDisplayText(state.reportRange, state.reportDateOffset, start, end);

  // Tính số lượng giao dịch và tổng số tiền của từng tab Chi/Thu
  let totalIncome = 0;
  let countIncome = 0;
  let totalExpense = 0;
  let countExpense = 0;

  txs.forEach(tx => {
    if (tx.type === 'income') {
      totalIncome += tx.amount;
      countIncome++;
    } else {
      totalExpense += tx.amount;
      countExpense++;
    }
  });

  document.getElementById('report-total-expense').innerText = `- ${totalExpense.toLocaleString('en-US')} đ`;
  document.getElementById('report-count-expense').innerText = `${countExpense} giao dịch`;
  
  document.getElementById('report-total-income').innerText = `+ ${totalIncome.toLocaleString('en-US')} đ`;
  document.getElementById('report-count-income').innerText = `${countIncome} giao dịch`;

  // Phân tích theo nhóm danh mục dựa trên loại đang chọn (Chi hoặc Thu)
  const filteredTxsByType = txs.filter(tx => tx.type === state.reportType);
  const catTotals = {};

  // Khởi tạo tất cả danh mục hiện có cho loại này để đảm bảo hiển thị đầy đủ
  const allCatsOfType = state.categories.filter(c => c.type === state.reportType);
  allCatsOfType.forEach(cat => {
    catTotals[cat.name] = { amount: 0, count: 0, color: cat.color };
  });

  // Cộng dồn giao dịch thực tế vào các danh mục tương ứng
  filteredTxsByType.forEach(tx => {
    if (catTotals[tx.category]) {
      catTotals[tx.category].amount += tx.amount;
      catTotals[tx.category].count++;
    } else {
      // Trường hợp dự phòng nếu giao dịch dùng danh mục đã bị xóa trong cấu hình
      catTotals[tx.category] = {
        amount: tx.amount,
        count: 1,
        color: getCategoryColor(tx.category, tx.type)
      };
    }
  });

  // Chuyển sang dạng mảng, lọc bỏ các mục không có thu/chi và sắp xếp số tiền giảm dần
  const catDataArray = Object.keys(catTotals).map(name => ({
    name,
    amount: catTotals[name].amount,
    count: catTotals[name].count,
    color: catTotals[name].color
  }))
  .filter(item => item.amount > 0) // Chỉ hiển thị danh mục có phát sinh thu/chi
  .sort((a, b) => b.amount - a.amount);

  // Vẽ biểu đồ Donut Chart
  drawDonutChart(catDataArray);

  // Render danh sách chi tiết các danh mục bên dưới biểu đồ
  const listContainer = document.getElementById('report-category-list');
  const grandTotal = state.reportType === 'expense' ? totalExpense : totalIncome;

  if (catDataArray.length === 0) {
    listContainer.innerHTML = `
      <div class="empty-state">
        <p>Không có giao dịch phân tích cho mục này.</p>
      </div>
    `;
    return;
  }

  let html = '';
  catDataArray.forEach(item => {
    const percent = grandTotal > 0 ? Math.round((item.amount / grandTotal) * 100) : 0;
    const amountStr = (state.reportType === 'expense' ? '-' : '+') + item.amount.toLocaleString('en-US') + ' đ';
    const amountClass = state.reportType === 'expense' ? 'text-expense' : 'text-income';

    // Lọc lấy các giao dịch chi tiết thuộc danh mục này trong kỳ báo cáo
    const txsInCat = filteredTxsByType.filter(tx => tx.category === item.name);
    let txsHtml = '';
    
    txsInCat.forEach(tx => {
      const d = new Date(tx.date);
      const dateStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
      const txAmountFormatted = (tx.type === 'expense' ? '-' : '+') + tx.amount.toLocaleString('en-US') + ' đ';
      
      txsHtml += `
        <div class="report-cat-tx-row">
          <div class="report-cat-tx-left">
            <span class="report-cat-tx-desc">${tx.description}</span>
            <span class="report-cat-tx-meta">${dateStr} • ${tx.member}</span>
          </div>
          <div class="report-cat-tx-amount ${amountClass}">${txAmountFormatted}</div>
        </div>
      `;
    });

    html += `
      <div class="report-cat-item">
        <div class="report-cat-header-wrapper">
          <div class="report-cat-header">
            <div class="report-cat-name-group">
              <span class="report-cat-color-dot" style="background-color: ${item.color};"></span>
              <span class="report-cat-name">${item.name}</span>
              <span class="report-cat-count">${item.count}</span>
            </div>
            <div class="report-cat-amount-group">
              <span class="report-cat-amount ${amountClass}">${amountStr}</span>
              <span class="report-cat-percent">(${percent}%)</span>
              <span class="report-cat-chevron">▾</span>
            </div>
          </div>
          <div class="report-cat-progress-bg">
            <div class="report-cat-progress-fill" style="width: ${percent}%; background-color: ${item.color};"></div>
          </div>
        </div>
        <div class="report-cat-txs-list" style="display: none;">
          ${txsHtml}
        </div>
      </div>
    `;
  });

  listContainer.innerHTML = html;

  // Đăng ký sự kiện click mở rộng danh mục để xem các mục thu chi chi tiết
  listContainer.querySelectorAll('.report-cat-item').forEach(card => {
    card.addEventListener('click', () => {
      const txsListEl = card.querySelector('.report-cat-txs-list');
      const isVisible = txsListEl.style.display === 'block';

      if (isVisible) {
        txsListEl.style.display = 'none';
        card.classList.remove('expanded');
      } else {
        txsListEl.style.display = 'block';
        card.classList.add('expanded');
      }
    });
  });
}

// Render View Thành Viên
function renderMembersView() {
  let nongExpense = 0, nongIncome = 0;
  let dungExpense = 0, dungIncome = 0;

  state.transactions.forEach(tx => {
    if (tx.member === 'Nong') {
      if (tx.type === 'expense') nongExpense += tx.amount;
      else nongIncome += tx.amount;
    } else if (tx.member === 'Dung') {
      if (tx.type === 'expense') dungExpense += tx.amount;
      else dungIncome += tx.amount;
    }
  });

  document.getElementById('stat-nong-expense').innerText = formatMoney(nongExpense);
  document.getElementById('stat-nong-income').innerText = formatMoney(nongIncome);
  document.getElementById('stat-dung-expense').innerText = formatMoney(dungExpense);
  document.getElementById('stat-dung-income').innerText = formatMoney(dungIncome);

  // Cập nhật class Active viền xanh lá cho người dùng hiện tại
  const nongCard = document.getElementById('card-member-nong');
  const dungCard = document.getElementById('card-member-dung');

  if (state.currentUserPerspective === 'Nong') {
    nongCard.classList.add('active');
    dungCard.classList.remove('active');
  } else {
    dungCard.classList.add('active');
    nongCard.classList.remove('active');
  }
}

// Render quản lý Danh mục (Cài đặt nhãn)
function renderCategoriesManageView() {
  const container = document.getElementById('categories-manage-list');
  const activeTab = document.querySelector('.category-types-tabs .cat-tab.active');
  const listType = activeTab ? activeTab.getAttribute('data-cat-list-type') : 'expense';

  const filteredCats = state.categories.filter(cat => cat.type === listType);

  let html = '';
  filteredCats.forEach(cat => {
    html += `
      <div class="manage-cat-tag" style="background-color: ${cat.color};">
        <span>${cat.name}</span>
        <button class="delete-cat-btn" data-cat-name="${cat.name}" data-cat-type="${cat.type}" title="Xóa nhãn này">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    `;
  });

  container.innerHTML = html || `<p style="font-size:0.8rem; color:var(--text-muted);">Không có danh mục nào.</p>`;

  // Sự kiện xóa danh mục
  container.querySelectorAll('.delete-cat-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const catName = btn.getAttribute('data-cat-name');
      const catType = btn.getAttribute('data-cat-type');
      deleteCategory(catName, catType);
    });
  });
}

// Helper tìm màu sắc của danh mục
function getCategoryColor(name, type) {
  const cat = state.categories.find(c => c.name.toLowerCase() === name.toLowerCase() && c.type === type);
  return cat ? cat.color : '#9e9e9e'; // Trả về màu xám nếu không thấy
}

// ==========================================================================
// 9. QUẢN LÝ BIỂU MẪU NHẬP LIỆU & BÀN PHÍM MÁY TÍNH
// ==========================================================================

function openTransactionModal(txId = null) {
  const modal = document.getElementById('add-transaction-modal');
  const titleText = document.getElementById('modal-title-text');
  
  state.keyboardActive = false; // Mặc định ẩn bàn phím khi mở form
  
  if (txId) {
    // Chế độ Sửa (Edit)
    const tx = state.transactions.find(t => t.id === txId);
    if (!tx) return;

    state.txForm.id = tx.id;
    state.txForm.type = tx.type;
    state.txForm.description = tx.description;
    state.txForm.category = tx.category;
    state.txForm.date = tx.date;
    state.txForm.member = tx.member;
    state.txForm.amountVal = tx.amount;
    state.txForm.amountRaw = tx.amount.toString();
    
    titleText.innerText = 'Sửa Giao Dịch';
  } else {
    // Chế độ Thêm mới
    resetForm();
    titleText.innerText = 'Nhập Thu Chi';
  }

  updateModalUI();
  modal.classList.add('active');
}

function closeTransactionModal() {
  const modal = document.getElementById('add-transaction-modal');
  modal.classList.remove('active');
  resetForm();
}

function resetForm() {
  state.txForm.id = null;
  state.txForm.type = 'expense';
  state.txForm.description = '';
  state.txForm.date = getRelativeDateString(0);
  state.txForm.member = state.currentUserPerspective;
  state.txForm.amountRaw = '0';
  state.txForm.amountVal = 0;
  state.keyboardActive = false;
  
  // Chọn mặc định danh mục đầu tiên của loại 'expense'
  const firstCat = state.categories.find(c => c.type === 'expense');
  state.txForm.category = firstCat ? firstCat.name : '';
}

function updateModalUI() {
  // Cập nhật Tab Chi / Thu
  const expTab = document.getElementById('modal-tab-expense');
  const incTab = document.getElementById('modal-tab-income');
  if (state.txForm.type === 'expense') {
    expTab.classList.add('active');
    incTab.classList.remove('active');
    document.getElementById('tx-amount-display').className = 'amount-val text-expense';
    document.getElementById('tx-amount-currency').className = 'amount-currency text-expense';
  } else {
    incTab.classList.add('active');
    expTab.classList.remove('active');
    document.getElementById('tx-amount-display').className = 'amount-val text-income';
    document.getElementById('tx-amount-currency').className = 'amount-currency text-income';
  }

  // Mô tả
  document.getElementById('tx-description').value = state.txForm.description;

  // Lịch Ngày tháng
  updateDateDisplay();

  // Thành viên trả tiền
  document.getElementById('tx-member-display').innerText = state.txForm.member;

  // Render Danh sách thẻ Danh mục
  renderModalCategories();

  // Cập nhật Số tiền gõ
  updateCalculatorDisplay();

  // Cập nhật trạng thái bàn phím ảo
  updateKeyboardVisibility();
}

function updateDateDisplay() {
  const dateVal = state.txForm.date;
  const todayStr = getRelativeDateString(0);
  const yesterdayStr = getRelativeDateString(-1);
  const displayLabel = document.getElementById('tx-date-display');
  
  if (dateVal === todayStr) {
    displayLabel.innerText = 'Hôm nay (' + formatDateShort(dateVal) + ')';
  } else if (dateVal === yesterdayStr) {
    displayLabel.innerText = 'Hôm qua (' + formatDateShort(dateVal) + ')';
  } else {
    displayLabel.innerText = formatDateFull(dateVal);
  }
}

function formatDateShort(dateStr) {
  const parts = dateStr.split('-');
  return `${parts[2]}/${parts[1]}`;
}

function formatDateFull(dateStr) {
  const parts = dateStr.split('-');
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

// --- CÁC HÀM CHO BỘ CHỌN NGÀY TỰ VẼ (CALENDAR SHEET) ---
function openCalendarSheet() {
  const dateStr = state.txForm.date; // định dạng YYYY-MM-DD
  const parts = dateStr.split('-');
  // Khởi tạo tháng xem của lịch khớp với ngày hiện tại trong form
  state.calendarSheetDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, 1);
  
  renderCalendarSheet();
  document.getElementById('calendar-sheet-overlay').classList.add('active');
}

function closeCalendarSheet() {
  document.getElementById('calendar-sheet-overlay').classList.remove('active');
}

function renderCalendarSheet() {
  const viewDate = state.calendarSheetDate;
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth(); // 0-11
  
  // Hiển thị tiêu đề Tháng MM/YYYY
  const monthTitle = `Tháng ${String(month + 1).padStart(2, '0')}/${year}`;
  document.getElementById('calendar-month-year-text').innerText = monthTitle;
  
  // Tính ngày đầu tiên của tháng là thứ mấy (0: CN, 1: T2, ..., 6: T7)
  const firstDayIndex = new Date(year, month, 1).getDay();
  
  // Tính số ngày của tháng
  const totalDays = new Date(year, month + 1, 0).getDate();
  
  const grid = document.getElementById('calendar-days-grid');
  let html = '';
  
  // Vẽ các ô trống đệm trước ngày 1
  for (let i = 0; i < firstDayIndex; i++) {
    html += `<div class="cal-day-cell empty"></div>`;
  }
  
  const todayStr = getRelativeDateString(0); // Hôm nay YYYY-MM-DD
  const selectedDateStr = state.txForm.date; // Ngày đã chọn trong form YYYY-MM-DD
  
  // Vẽ các ngày từ 1 đến N
  for (let day = 1; day <= totalDays; day++) {
    const currentDayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const isSelected = currentDayStr === selectedDateStr;
    const isFuture = currentDayStr > todayStr;
    
    let cellClass = 'cal-day-cell';
    if (isSelected) cellClass += ' selected';
    if (isFuture) cellClass += ' future';
    
    html += `
      <div class="${cellClass}" data-date="${currentDayStr}">
        ${day}
      </div>
    `;
  }
  
  grid.innerHTML = html;
  
  // Đăng ký sự kiện click cho các ô ngày
  grid.querySelectorAll('.cal-day-cell:not(.empty)').forEach(cell => {
    cell.addEventListener('click', () => {
      const clickedDate = cell.getAttribute('data-date');
      state.txForm.date = clickedDate;
      updateDateDisplay();
      closeCalendarSheet();
    });
  });
}

function renderModalCategories() {
  const grid = document.getElementById('modal-category-grid');
  const filteredCats = state.categories.filter(c => c.type === state.txForm.type);
  
  let html = '';
  filteredCats.forEach(cat => {
    const isSelected = state.txForm.category === cat.name;
    const selectClass = isSelected ? 'selected' : '';
    html += `
      <div class="modal-cat-tag ${selectClass}" data-cat-name="${cat.name}" style="background-color: ${cat.color};">
        ${cat.name}
      </div>
    `;
  });

  grid.innerHTML = html;

  // Đăng ký sự kiện click chọn danh mục
  grid.querySelectorAll('.modal-cat-tag').forEach(tag => {
    tag.addEventListener('click', () => {
      state.txForm.category = tag.getAttribute('data-cat-name');
      renderModalCategories();
    });
  });
}

// Xử lý logic nhấn phím trên Máy tính ảo
function handleCalculatorKeyPress(key) {
  let raw = state.txForm.amountRaw;

  // Nhấn nút xóa lùi (Backspace)
  if (key === 'backspace') {
    if (raw.length > 1) {
      state.txForm.amountRaw = raw.slice(0, -1);
    } else {
      state.txForm.amountRaw = '0';
    }
  } 
  // Phím gõ số 000
  else if (key === '000') {
    // Không cho gõ 3 số 0 nếu đang là số 0 mặc định hoặc sau một toán tử
    const lastChar = raw.slice(-1);
    if (raw !== '0' && !['+', '-', '*', '/', '÷', '×'].includes(lastChar)) {
      state.txForm.amountRaw += '000';
    }
  } 
  // Các toán tử cộng trừ nhân chia
  else if (['+', '-', '*', '/'].includes(key)) {
    const lastChar = raw.slice(-1);
    // Nếu ký tự cuối đã là toán tử thì thay thế bằng toán tử mới
    if (['+', '-', '×', '÷', '*', '/'].includes(lastChar)) {
      raw = raw.slice(0, -1);
    }
    
    let displayOp = key;
    if (key === '*') displayOp = '×';
    if (key === '/') displayOp = '÷';
    
    state.txForm.amountRaw = (raw === '0' ? '0' : raw) + displayOp;
  } 
  // Gõ số bình thường
  else {
    if (raw === '0') {
      state.txForm.amountRaw = key;
    } else {
      state.txForm.amountRaw += key;
    }
  }

  // Cập nhật giá trị thực tế sau tính toán
  const expression = state.txForm.amountRaw;
  const hasOperator = /[+\-×÷]/.test(expression);
  
  if (hasOperator) {
    // Nếu có toán tử, tính thử kết quả và hiển thị preview
    const evaluated = evaluateExpression(expression);
    state.txForm.amountVal = evaluated;
    document.getElementById('calc-preview').innerText = '= ' + evaluated.toLocaleString('en-US') + ' đ';
  } else {
    state.txForm.amountVal = parseInt(expression, 10) || 0;
    document.getElementById('calc-preview').innerText = '';
  }

  updateCalculatorDisplay();
}

function updateCalculatorDisplay() {
  const formatted = formatCalculatorDisplay(state.txForm.amountRaw);
  document.getElementById('tx-amount-display').innerText = formatted;
}

function updateKeyboardVisibility() {
  const keyboard = document.querySelector('.calculator-keyboard');
  const amountContainer = document.querySelector('.amount-display-container');
  if (state.keyboardActive) {
    keyboard.classList.add('active');
    amountContainer.classList.add('keyboard-focused');
    
    // Cuộn xuống để thấy rõ bàn phím trên thiết bị di động
    const modalContent = document.querySelector('.modal-content');
    setTimeout(() => {
      modalContent.scrollTop = modalContent.scrollHeight;
    }, 50);
  } else {
    keyboard.classList.remove('active');
    amountContainer.classList.remove('keyboard-focused');
  }
}

// Lưu giao dịch (Lưu cả chế độ thêm mới và sửa đổi)
function saveTransaction() {
  const desc = document.getElementById('tx-description').value.trim() || 'Không có mô tả';
  const dateVal = state.txForm.date;
  
  // Tính toán biểu thức cuối cùng trước khi lưu
  const finalAmount = evaluateExpression(state.txForm.amountRaw);
  const amountToSave = finalAmount > 0 ? finalAmount : (parseInt(state.txForm.amountRaw, 10) || 0);

  if (amountToSave <= 0) {
    alert('Vui lòng nhập số tiền lớn hơn 0.');
    return;
  }

  if (!state.txForm.category) {
    alert('Vui lòng tạo hoặc chọn một Nhãn danh mục.');
    return;
  }

  if (state.txForm.id) {
    // CHẾ ĐỘ SỬA
    const index = state.transactions.findIndex(t => t.id === state.txForm.id);
    if (index !== -1) {
      state.transactions[index] = {
        ...state.transactions[index],
        description: desc,
        amount: amountToSave,
        type: state.txForm.type,
        date: dateVal,
        category: state.txForm.category,
        member: state.txForm.member
      };

      // Đưa vào hàng đợi ngoại tuyến
      enqueueUnsyncedTx(state.txForm.id);

      // ĐỒNG BỘ SUPABASE (SỬA)
      if (state.isCloudActive && supabaseClient) {
        supabaseClient.from('transactions').upsert(state.transactions[index]).then(({ error }) => {
          if (!error) {
            dequeueUnsyncedTx(state.txForm.id);
          } else {
            console.error('Lỗi cập nhật transaction trên cloud:', error);
          }
        });
      }
    }
  } else {
    // CHẾ ĐỘ THÊM MỚI
    const newTx = {
      id: 'tx_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      description: desc,
      amount: amountToSave,
      type: state.txForm.type,
      date: dateVal,
      category: state.txForm.category,
      member: state.txForm.member
    };
    state.transactions.push(newTx);

    // Đưa vào hàng đợi ngoại tuyến
    enqueueUnsyncedTx(newTx.id);

    // ĐỒNG BỘ SUPABASE (THÊM)
    if (state.isCloudActive && supabaseClient) {
      supabaseClient.from('transactions').insert([newTx]).then(({ error }) => {
        if (!error) {
          dequeueUnsyncedTx(newTx.id);
        } else {
          console.error('Lỗi thêm transaction trên cloud:', error);
        }
      });
    }
  }

  // Lưu trữ và đồng bộ hóa đa tab
  saveAndSync();
  
  // Đóng modal và render lại giao diện
  closeTransactionModal();
  renderAll();
}

// Xóa giao dịch
function deleteTransaction(txId) {
  if (confirm('Bạn có chắc chắn muốn xóa giao dịch này không?')) {
    state.transactions = state.transactions.filter(t => t.id !== txId);
    saveAndSync();

    // Đưa vào hàng đợi xóa ngoại tuyến
    enqueueDeletedTx(txId);

    // ĐỒNG BỘ SUPABASE (XÓA)
    if (state.isCloudActive && supabaseClient) {
      supabaseClient.from('transactions').delete().eq('id', txId).then(({ error }) => {
        if (!error) {
          dequeueDeletedTx(txId);
        } else {
          console.error('Lỗi xóa transaction trên cloud:', error);
        }
      });
    }

    closeActionSheet();
    renderAll();
  }
}

// ==========================================================================
// 10. CONTEXT MENU & BOTTOM ACTION SHEET
// ==========================================================================

function openActionSheet(txId) {
  state.selectedTxId = txId;
  const tx = state.transactions.find(t => t.id === txId);
  if (!tx) return;

  const overlay = document.getElementById('action-sheet-overlay');
  
  document.getElementById('sheet-tx-description').innerText = tx.description;
  
  const d = new Date(tx.date);
  const dateFormatted = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  document.getElementById('sheet-tx-meta').innerText = `${tx.category} • ${dateFormatted} • Tạo bởi: ${tx.member}`;
  
  const amountStr = (tx.type === 'expense' ? '-' : '+') + tx.amount.toLocaleString('en-US') + ' đ';
  const amountEl = document.getElementById('sheet-tx-amount');
  amountEl.innerText = amountStr;
  amountEl.className = 'sheet-tx-amount ' + (tx.type === 'expense' ? 'text-expense' : 'text-income');

  overlay.classList.add('active');
}

function closeActionSheet() {
  const overlay = document.getElementById('action-sheet-overlay');
  overlay.classList.remove('active');
  state.selectedTxId = null;
}

// ==========================================================================
// 11. QUẢN LÝ THÀNH VIÊN VÀ QUẢN LÝ DANH MỤC
// ==========================================================================

function changeActiveMember(member) {
  state.activeMember = member;
  if (member !== 'both') {
    state.currentUserPerspective = member;
  }
  
  // Lưu cục bộ và đồng bộ tab
  saveAndSync();
  renderAll();
}

function changeCurrentUserPerspective(member) {
  state.currentUserPerspective = member;
  localStorage.setItem('banhmi_default_input_member', member);
  renderMembersView();
}

function addCategory(name, type, color) {
  // Kiểm tra trùng lặp
  const exists = state.categories.some(c => c.name.toLowerCase() === name.toLowerCase() && c.type === type);
  if (exists) {
    alert('Tên danh mục này đã tồn tại!');
    return;
  }

  state.categories.push({ name, type, color });
  saveAndSync();

  // Đưa vào hàng đợi ngoại tuyến
  enqueueUnsyncedCat(name, type, color);

  // ĐỒNG BỘ SUPABASE (THÊM CATEGORY)
  if (state.isCloudActive && supabaseClient) {
    supabaseClient.from('categories').insert([{ name, type, color }]).then(({ error }) => {
      if (!error) {
        dequeueUnsyncedCat(name, type);
      } else {
        console.error('Lỗi thêm category trên cloud:', error);
      }
    });
  }

  renderCategoriesManageView();
  renderModalCategories();
}

function deleteCategory(name, type) {
  // Kiểm tra xem danh mục có đang được dùng bởi giao dịch nào không
  const isUsed = state.transactions.some(tx => tx.category === name && tx.type === type);
  if (isUsed) {
    alert(`Không thể xóa! Nhãn "${name}" đang được sử dụng trong các giao dịch.`);
    return;
  }

  if (confirm(`Bạn có chắc chắn muốn xóa nhãn danh mục "${name}"?`)) {
    state.categories = state.categories.filter(c => !(c.name === name && c.type === type));
    saveAndSync();

    // Đưa vào hàng đợi xóa ngoại tuyến
    enqueueDeletedCat(name, type);

    // ĐỒNG BỘ SUPABASE (XÓA CATEGORY)
    if (state.isCloudActive && supabaseClient) {
      supabaseClient.from('categories').delete().eq('name', name).eq('type', type).then(({ error }) => {
        if (!error) {
          dequeueDeletedCat(name, type);
        } else {
          console.error('Lỗi xóa category trên cloud:', error);
        }
      });
    }

    renderCategoriesManageView();
    renderModalCategories();
  }
}

// ==========================================================================
// 12. ĐĂNG KÝ CÁC SỰ KIỆN (EVENT LISTENERS)
// ==========================================================================

function registerEventListeners() {
  
  // --- CHUYỂN TABS CHÍNH ---
  const navButtons = document.querySelectorAll('.app-nav .nav-item:not(.nav-item-fab)');
  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetViewId = btn.getAttribute('data-view');
      
      // Đổi class active ở Menu Nav
      navButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Ẩn toàn bộ view và hiển thị view đích
      document.querySelectorAll('.app-view').forEach(view => {
        view.classList.remove('active');
      });
      document.getElementById(targetViewId).classList.add('active');

      // Tắt thanh search nếu chuyển tab
      if (targetViewId !== 'view-transactions') {
        hideSearchBar();
      }
    });
  });

  // --- DARK/LIGHT MODE TOGGLE ---
  document.getElementById('theme-toggle').addEventListener('click', () => {
    state.theme = state.theme === 'light' ? 'dark' : 'light';
    applyTheme();
  });

  // --- KẾT NỐI VÀ ĐỒNG BỘ ĐÁM MÂY SUPABASE ---
  const connectBtn = document.getElementById('supabase-connect-btn');
  const disconnectBtn = document.getElementById('supabase-disconnect-btn');
  const urlInput = document.getElementById('supabase-url');
  const keyInput = document.getElementById('supabase-key');

  connectBtn.addEventListener('click', async () => {
    const url = urlInput.value.trim();
    const key = keyInput.value.trim();

    if (!url || !key) {
      alert('Vui lòng nhập cả Supabase URL và Anon Key.');
      return;
    }

    const success = await initSupabase(url, key);
    if (success) {
      alert('Kết nối cơ sở dữ liệu Supabase thành công và đã bật đồng bộ thời gian thực!');
    } else {
      alert('Kết nối thất bại. Vui lòng kiểm tra lại URL và Anon Key, hoặc đảm bảo các bảng database đã được tạo đúng.');
    }
  });

  disconnectBtn.addEventListener('click', () => {
    if (confirm('Bạn có chắc chắn muốn ngắt kết nối đám mây? Dữ liệu sẽ quay lại hoạt động ngoại tuyến (local).')) {
      disconnectSupabase();
      alert('Đã ngắt kết nối đám mây, dữ liệu hiện tại quay lại lưu ngoại tuyến.');
    }
  });

  // --- ĐIỀU HƯỚNG THÁNG TRÊN TRANG CHỦ ---
  document.getElementById('home-prev-month').addEventListener('click', () => {
    state.homeMonthOffset--;
    renderHomeSummary();
    renderTransactionsList();
  });

  document.getElementById('home-next-month').addEventListener('click', () => {
    state.homeMonthOffset++;
    renderHomeSummary();
    renderTransactionsList();
  });

  // --- DROPDOWN CHỌN NHANH THÀNH VIÊN TRÊN HEADER ---
  const dropdownBtn = document.getElementById('member-dropdown-btn');
  const dropdownMenu = document.getElementById('header-member-menu');

  dropdownBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdownMenu.classList.toggle('active');
  });

  // Đóng dropdown khi click ra ngoài
  document.addEventListener('click', () => {
    dropdownMenu.classList.remove('active');
  });

  // Sự kiện chọn trên menu dropdown
  dropdownMenu.querySelectorAll('.dropdown-item').forEach(item => {
    item.addEventListener('click', () => {
      // Đổi active UI
      dropdownMenu.querySelectorAll('.dropdown-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');

      const selectedMember = item.getAttribute('data-member');
      changeActiveMember(selectedMember);
    });
  });

  // --- TÌM KIẾM GIAO DỊCH ---
  const searchBtn = document.getElementById('search-btn');
  const searchBarContainer = document.getElementById('search-bar-container');
  const searchInput = document.getElementById('search-input');
  const clearSearchBtn = document.getElementById('clear-search-btn');

  searchBtn.addEventListener('click', () => {
    // Chuyển về tab ví trước nếu đang ở tab khác
    document.getElementById('nav-btn-wallet').click();
    
    searchBarContainer.classList.add('active');
    state.searchActive = true;
    searchInput.focus();
  });

  searchInput.addEventListener('input', (e) => {
    state.searchQuery = e.target.value;
    renderTransactionsList();
  });

  clearSearchBtn.addEventListener('click', () => {
    hideSearchBar();
  });

  function hideSearchBar() {
    searchBarContainer.classList.remove('active');
    searchInput.value = '';
    state.searchQuery = '';
    state.searchActive = false;
    renderTransactionsList();
  }

  // --- LỌC KHOẢNG THỜI GIAN NHANH Ở BÁO CÁO ---
  const rangePills = document.querySelectorAll('.filter-pills .pill-btn');
  rangePills.forEach(pill => {
    pill.addEventListener('click', () => {
      rangePills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');

      state.reportRange = pill.getAttribute('data-range');
      state.reportDateOffset = 0; // Reset offset
      renderReportView();
    });
  });

  // --- NÚT DI CHUYỂN KỲ TRƯỚC/SAU Ở TRANG BÁO CÁO ---
  document.getElementById('report-prev-range').addEventListener('click', () => {
    state.reportDateOffset--;
    renderReportView();
  });

  document.getElementById('report-next-range').addEventListener('click', () => {
    state.reportDateOffset++;
    renderReportView();
  });

  // --- CHỌN TAB CHI / THU Ở BÁO CÁO ---
  const reportTabs = document.querySelectorAll('.report-tabs .report-tab');
  reportTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      reportTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      state.reportType = tab.getAttribute('data-report-type');
      renderReportView();
    });
  });

  // --- MỞ/ĐÓNG MODAL THÊM GIAO DỊCH (+ FAB) ---
  document.getElementById('open-add-modal-btn').addEventListener('click', () => {
    openTransactionModal();
  });

  document.getElementById('modal-close-btn').addEventListener('click', () => {
    closeTransactionModal();
  });

  // --- ĐỔI TAB CHI/THU TRÊN BIỂU MẪU NHẬP LIỆU ---
  document.getElementById('modal-tab-expense').addEventListener('click', () => {
    state.txForm.type = 'expense';
    // Đổi mặc định danh mục đầu tiên
    const firstCat = state.categories.find(c => c.type === 'expense');
    state.txForm.category = firstCat ? firstCat.name : '';
    updateModalUI();
  });

  document.getElementById('modal-tab-income').addEventListener('click', () => {
    state.txForm.type = 'income';
    const firstCat = state.categories.find(c => c.type === 'income');
    state.txForm.category = firstCat ? firstCat.name : '';
    updateModalUI();
  });

  // --- MỞ BỘ CHỌN NGÀY TỰ VẼ (CALENDAR SHEET) ---
  const calendarPicker = document.querySelector('.calendar-picker');
  calendarPicker.addEventListener('click', () => {
    openCalendarSheet();
  });

  // --- SỰ KIỆN TRONG CALENDAR SHEET ---
  document.getElementById('calendar-cancel-btn').addEventListener('click', () => {
    closeCalendarSheet();
  });

  document.getElementById('calendar-sheet-overlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('calendar-sheet-overlay')) {
      closeCalendarSheet();
    }
  });

  // Nút Lùi tháng
  document.getElementById('cal-prev-month-btn').addEventListener('click', () => {
    state.calendarSheetDate.setMonth(state.calendarSheetDate.getMonth() - 1);
    renderCalendarSheet();
  });

  // Nút Tiến tháng
  document.getElementById('cal-next-month-btn').addEventListener('click', () => {
    state.calendarSheetDate.setMonth(state.calendarSheetDate.getMonth() + 1);
    renderCalendarSheet();
  });

  // Chọn nhanh Hôm qua
  document.getElementById('cal-btn-yesterday').addEventListener('click', () => {
    state.txForm.date = getRelativeDateString(-1);
    updateDateDisplay();
    closeCalendarSheet();
  });

  // Chọn nhanh Hôm nay
  document.getElementById('cal-btn-today').addEventListener('click', () => {
    state.txForm.date = getRelativeDateString(0);
    updateDateDisplay();
    closeCalendarSheet();
  });

  // --- ẨN/HIỆN BÀN PHÍM NHẬP SỐ TIỀN ---
  const amountContainer = document.querySelector('.amount-display-container');
  amountContainer.addEventListener('click', (e) => {
    e.stopPropagation();
    state.keyboardActive = !state.keyboardActive;
    updateKeyboardVisibility();
  });

  // Khi người dùng tập trung vào ô nhập diễn giải, ẩn bàn phím số
  document.getElementById('tx-description').addEventListener('focus', () => {
    state.keyboardActive = false;
    updateKeyboardVisibility();
  });

  // --- ĐỔI NGƯỜI CHI TRẢ TRÊN FORM (DIALOG PICKER) ---
  const memberPickerBtn = document.getElementById('tx-member-picker-btn');
  const memberPickerDialog = document.getElementById('member-picker-dialog-overlay');
  
  memberPickerBtn.addEventListener('click', () => {
    memberPickerDialog.classList.add('active');
  });

  memberPickerDialog.querySelectorAll('.dialog-member-option').forEach(opt => {
    opt.addEventListener('click', () => {
      const selected = opt.getAttribute('data-dialog-member');
      state.txForm.member = selected;
      document.getElementById('tx-member-display').innerText = selected;
      
      // Lưu làm người nhập mặc định của thiết bị này
      state.currentUserPerspective = selected;
      localStorage.setItem('banhmi_default_input_member', selected);
      
      memberPickerDialog.classList.remove('active');
      renderMembersView();
    });
  });

  document.getElementById('member-picker-dialog-cancel').addEventListener('click', () => {
    memberPickerDialog.classList.remove('active');
  });

  // --- BÀN PHÍM MÁY TÍNH ẢO ---
  document.querySelectorAll('.calculator-keyboard .calc-key').forEach(keyBtn => {
    keyBtn.addEventListener('click', () => {
      const keyVal = keyBtn.getAttribute('data-key');
      handleCalculatorKeyPress(keyVal);
    });
  });

  // --- NÚT LƯU TRÊN FORM ---
  document.getElementById('modal-save-btn').addEventListener('click', () => {
    saveTransaction();
  });

  // --- HÀNH ĐỘNG TRÊN BOTTOM SHEET SỬA/XÓA ---
  document.getElementById('sheet-cancel-btn').addEventListener('click', () => {
    closeActionSheet();
  });

  document.getElementById('action-sheet-overlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('action-sheet-overlay')) {
      closeActionSheet();
    }
  });

  document.getElementById('sheet-edit-btn').addEventListener('click', () => {
    const txId = state.selectedTxId;
    closeActionSheet();
    openTransactionModal(txId);
  });

  document.getElementById('sheet-delete-btn').addEventListener('click', () => {
    const txId = state.selectedTxId;
    deleteTransaction(txId);
  });

  // --- THAY ĐỔI VIEW THÀNH VIÊN ---
  document.querySelectorAll('.select-member-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const member = btn.getAttribute('data-select-member');
      changeCurrentUserPerspective(member);
    });
  });

  // --- THÊM DANH MỤC MỚI ---
  const addCatForm = document.getElementById('add-category-form');
  const presetsContainer = document.getElementById('color-presets-container');
  let selectedPresetColor = PRESET_COLORS[0];

  // Vẽ các preset màu
  function renderColorPresets() {
    presetsContainer.innerHTML = '';
    PRESET_COLORS.forEach(color => {
      const isSelected = color === selectedPresetColor;
      const selectClass = isSelected ? 'selected' : '';
      const dot = document.createElement('div');
      dot.className = `color-dot ${selectClass}`;
      dot.style.backgroundColor = color;
      dot.setAttribute('data-color', color);
      
      dot.addEventListener('click', () => {
        selectedPresetColor = color;
        renderColorPresets();
      });

      presetsContainer.appendChild(dot);
    });
  }

  renderColorPresets();

  addCatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const nameInput = document.getElementById('new-category-name');
    const typeSelect = document.getElementById('new-category-type');

    const name = nameInput.value.trim();
    const type = typeSelect.value;

    if (name) {
      addCategory(name, type, selectedPresetColor);
      nameInput.value = '';
    }
  });

  // --- TABS QUẢN LÝ DANH MỤC ---
  const catListTabs = document.querySelectorAll('.category-types-tabs .cat-tab');
  catListTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      catListTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderCategoriesManageView();
    });
  });

  // Lắng nghe sự kiện online để tự động đồng bộ hàng đợi
  window.addEventListener('online', () => {
    console.log('Thiết bị đã kết nối mạng trở lại! Đang tiến hành đồng bộ hàng đợi...');
    if (state.isCloudActive && supabaseClient) {
      syncDataFromCloud();
    }
  });
}

// ==========================================================================
// 13. KHỞI CHẠY ỨNG DỤNG
// ==========================================================================
window.addEventListener('DOMContentLoaded', () => {
  initApp();
});
