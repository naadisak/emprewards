let activityChartInstance = null;
let dashRawPraises = [], dashThemes = [], activeThemeFilters = [];
let chartRange = 30, tableRange = 30;
let allPromotions=[]; 

function showAdminLoader() { document.getElementById('adminLoader').classList.add('show'); } 
function hideAdminLoader() { document.getElementById('adminLoader').classList.remove('show'); }

function switchView(v) {
    document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active')); document.getElementById('view-'+v).classList.add('active');
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active')); document.getElementById('nav-'+v).classList.add('active');
    if(v==='dashboard') fetchDashboardStats();
    else if(v==='promotions') fetchPromotions();
}

function getAdminSession() {
    const s = localStorage.getItem('tqm_admin_session');
    if(s) { try { return JSON.parse(decodeURIComponent(atob(s))); } catch(e) { return null; } } return null;
}

window.onload = () => {
    const obj = getAdminSession();
    if(obj) { document.getElementById('loginScreen').style.display='none'; document.getElementById('mainApp').style.display='flex'; switchView('dashboard'); }
};

function doAdminLogin() { 
    const i=document.getElementById('adminId').value.trim(), p=document.getElementById('adminPin').value.trim(); 
    showAdminLoader(); 
    google.script.run.withSuccessHandler(r=>{
        hideAdminLoader();
        if(r&&r.status==='success'){
            localStorage.setItem('tqm_admin_session', btoa(encodeURIComponent(JSON.stringify(r.userData))));
            location.reload();
        } else { alert(r.message); }
    }).gsAdminLogin(i,p); 
}

function doAdminLogout() { localStorage.removeItem('tqm_admin_session'); location.reload(); }

function fetchDashboardStats() { const u=getAdminSession(); if(!u)return; showAdminLoader(); google.script.run.withSuccessHandler(r=>{hideAdminLoader(); if(r&&r.status==='success')renderAdminDashboard(r.data);}).gsAdminGetDashboardStats(u.empId); }

function renderAdminDashboard(d) {
    if(!d) return;
    document.getElementById('dashTotalEmp').innerText = d.totalEmp || 0; document.getElementById('dashActiveEmp').innerText = d.activeEmp || 0; document.getElementById('dashTotalPraises').innerText = d.totalPraises || 0; document.getElementById('dashTotalPoints').innerText = d.totalPoints || 0;
    dashRawPraises = d.rawPraises || []; dashThemes = Object.keys(d.themeCount || {});
    renderThemeBadges(); updateDashboardViews();
}

function renderThemeBadges() {
    const container = document.getElementById('themeFilterBlock');
    let html = `<button onclick="toggleThemeFilter('ALL')" class="border px-4 py-2 rounded-full text-[13px] font-bold">ทั้งหมด</button>`;
    dashThemes.forEach(t => { html += `<button onclick="toggleThemeFilter('${escapeHTML(t)}')" class="border px-4 py-2 rounded-full text-[13px] font-bold">${escapeHTML(t)}</button>`; });
    container.innerHTML = html;
}

function toggleThemeFilter(theme) {
    if(theme === 'ALL') activeThemeFilters = [];
    else { if(activeThemeFilters.includes(theme)) activeThemeFilters = activeThemeFilters.filter(t => t !== theme); else activeThemeFilters.push(theme); }
    renderThemeBadges(); updateDashboardViews(); 
}

function setChartDateRange(days) { chartRange = days; updateDashboardViews(true, false); }
function setTableDateRange(days) { tableRange = days; updateDashboardViews(false, true); }

function updateDashboardViews(updateChart = true, updateTable = true) {
    let themeFilteredData = dashRawPraises;
    if(activeThemeFilters.length > 0) themeFilteredData = dashRawPraises.filter(p => activeThemeFilters.includes(p.theme));
    const now = new Date(); now.setHours(23,59,59,999);

    if(updateChart) {
        let cutoffChart = new Date(); cutoffChart.setDate(now.getDate() - chartRange + 1); cutoffChart.setHours(0,0,0,0);
        let chartData = themeFilteredData.filter(p => p.timeRaw >= cutoffChart.getTime());
        let labels = [], map = {};
        for(let i = chartRange - 1; i >= 0; i--) { let d = new Date(); d.setDate(now.getDate() - i); let l = d.getDate() + '/' + (d.getMonth()+1); labels.push(l); map[l] = { praises: 0, likes: 0 }; }
        chartData.forEach(p => { let d = new Date(p.timeRaw); let l = d.getDate() + '/' + (d.getMonth()+1); if(map[l]) { map[l].praises += 1; map[l].likes += p.likes || 0; } });
        renderChart(labels, labels.map(l => map[l].praises), labels.map(l => map[l].likes));
    }

    if(updateTable) {
        let cutoffTable = new Date(); cutoffTable.setDate(now.getDate() - tableRange + 1); cutoffTable.setHours(0,0,0,0);
        let tableData = themeFilteredData.filter(p => p.timeRaw >= cutoffTable.getTime());
        renderDashTable(tableData);
    }
}

function renderChart(labels, praises, likes) {
    if(activityChartInstance) activityChartInstance.destroy();
    const ctx = document.getElementById('activityChart').getContext('2d');
    activityChartInstance = new Chart(ctx, {
        type: 'bar',
        data: { labels: labels, datasets: [ { type: 'bar', label: 'Praises', data: praises, backgroundColor: '#3b82f6' }, { type: 'line', label: 'Likes', data: likes, borderColor: '#f59e0b' } ] },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

function renderDashTable(data) {
    const tb = document.getElementById('dashHistoryTable'); tb.innerHTML = '';
    if(data && data.length > 0) {
        data.forEach(p => { tb.innerHTML += `<tr class="border-b"><td>${p.timeStr}</td><td>${escapeHTML(p.senderName)}</td><td>${escapeHTML(p.receiverName)}</td><td>${escapeHTML(p.theme)}</td><td>${escapeHTML(p.msg)}</td><td class="text-center text-rose-500">${p.likes}</td></tr>`; });
    } else { tb.innerHTML = '<tr><td colspan="6" class="text-center py-8">ไม่มีข้อมูล</td></tr>'; }
    filterDashTable();
}

function filterDashTable() {
    const trs = document.querySelectorAll('#dashHistoryTable tr');
    trs.forEach(tr => {
        if(tr.cells.length < 6) return;
        const dText = tr.cells[0].textContent.toLowerCase(), sText = tr.cells[1].textContent.toLowerCase(), rText = tr.cells[2].textContent.toLowerCase(), tText = tr.cells[3].textContent.toLowerCase(), mText = tr.cells[4].textContent.toLowerCase();
        if(dText.includes(document.getElementById('fltDate').value.toLowerCase()) && sText.includes(document.getElementById('fltSender').value.toLowerCase()) && rText.includes(document.getElementById('fltReceiver').value.toLowerCase()) && tText.includes(document.getElementById('fltTheme').value.toLowerCase()) && mText.includes(document.getElementById('fltMsg').value.toLowerCase())) { tr.style.display = ''; } else { tr.style.display = 'none'; }
    });
}

function fetchPromotions() {
    google.script.run.withSuccessHandler(r => {
        const tb = document.getElementById('promoTableBody'); tb.innerHTML = '';
        if (r.status === 'success' && r.data.length > 0) {
            allPromotions = r.data;
            r.data.forEach(p => { tb.innerHTML += `<tr class="border-b"><td>${p.name}</td><td>${p.desc}</td><td class="text-center">${p.quota}</td><td class="text-right"><button onclick="drawPromoWinner('${p.id}')" class="text-emerald-500 mr-2">สุ่ม</button><button onclick="openPromoModal('${p.id}')" class="text-indigo-600 mr-2">Edit</button><button onclick="deletePromo('${p.id}')" class="text-rose-500">Del</button></td></tr>`; });
        } else { tb.innerHTML = `<tr><td colspan="4" class="text-center py-8">ไม่มีแคมเปญ</td></tr>`; }
    }).gsGetAllPromotions();
}
function openPromoModal(id) { document.getElementById('promoModal').classList.add('active'); }
function closePromoModal() { document.getElementById('promoModal').classList.remove('active'); }