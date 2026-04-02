let tempEmpId='', isUserFirstTime=true, dashboardData={}; 
let currentUserSession = null;

function getSession() { 
    if(currentUserSession) return currentUserSession;
    const s = localStorage.getItem('tqm_session'); 
    if(s) { try { currentUserSession = JSON.parse(decodeURIComponent(atob(s))); return currentUserSession; } catch(e) { clearSession(); } } 
    return null;
}
function saveSession(u) { currentUserSession = u; localStorage.setItem('tqm_session', btoa(encodeURIComponent(JSON.stringify(u)))); }
function clearSession() { currentUserSession = null; localStorage.removeItem('tqm_session'); }

function showLoader(){document.getElementById('globalLoader').classList.add('active');} 
function hideLoader(){document.getElementById('globalLoader').classList.remove('active');}
function showToast(m,t='info'){ const c=document.getElementById('toastContainer'); c.innerHTML=m; c.className=`toast-notification bg-slate-800 text-white`; c.classList.add('show'); setTimeout(()=>c.classList.remove('show'),3000); }

window.onload = () => {
    setTimeout(() => { 
        const u = getSession(); 
        if(u) { renderDashboardInfo(u); fetchDashboardData(); } 
    }, 500); 
};

function switchScreen(sId) {
    document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
    document.getElementById(sId).classList.add('active');
    const nav = document.getElementById('mainNavbar'); const fab = document.getElementById('fabPraiseBtn');
    if(nav) {
        if(['screen-dashboard','screen-rewards'].includes(sId)){ nav.classList.remove('hidden'); if(fab) fab.style.display = 'block'; } 
        else { nav.classList.add('hidden'); if(fab) fab.style.display = 'none'; }
    }
}

function goHome() { 
    document.getElementById('screen-profile').classList.remove('active'); 
    document.getElementById('praiseOverlay').classList.remove('active'); 
    document.getElementById('screen-praise').classList.remove('active'); 
    switchScreen('screen-dashboard'); 
}

function checkUser() {
    const id=document.getElementById('empId').value.trim(); if(!id){showToast('กรุณากรอกรหัสพนักงาน','error');return;}
    showLoader();
    google.script.run.withSuccessHandler(r=>{
        hideLoader();
        if(r&&r.status==='success'){
            tempEmpId=id; isUserFirstTime=r.isFirstTime;
            document.getElementById('loginName').innerText=r.name.split(' ')[0];
            document.getElementById('loginAvatar').src=r.avatar||DEFAULT_AVATAR;
            document.getElementById('passwordLabel').innerText=isUserFirstTime?"4 ตัวท้ายเบอร์มือถือ":"ใส่รหัส PIN 6 หลัก";
            switchScreen('screen-login-step2');
        }else{showToast(r.message,'error');}
    }).withFailureHandler(e=>{hideLoader();showToast('เชื่อมต่อล้มเหลว','error');}).gsCheckUser(id);
}

function doLogin() {
    const p=document.getElementById('password').value.trim(); if(!p){showToast('กรุณากรอกรหัสผ่าน','error');return;}
    showLoader();
    google.script.run.withSuccessHandler(r=>{
        hideLoader();
        if(r&&r.status==='success'){
            if(r.isFirstTime) switchScreen('screen-setup-pin');
            else { saveSession(r.userData); renderDashboardInfo(r.userData); fetchDashboardData(); showToast(`ยินดีต้อนรับ`,'success'); }
        } else { showToast(r.message,'error'); }
    }).withFailureHandler(e=>{hideLoader();showToast('เชื่อมต่อล้มเหลว','error');}).gsLogin(tempEmpId,p);
}

function doSetupPin() {
    const p=document.getElementById('newPin').value.trim(); if(p.length!==6){showToast('กรุณากรอก PIN 6 หลัก','error');return;}
    showLoader();
    google.script.run.withSuccessHandler(r=>{
        hideLoader();
        if(r&&r.status==='success'){ saveSession(r.userData); renderDashboardInfo(r.userData); fetchDashboardData(); switchScreen('screen-dashboard'); } 
        else { showToast(r.message,'error'); }
    }).withFailureHandler(e=>{hideLoader();showToast('เชื่อมต่อล้มเหลว','error');}).gsSetPin(tempEmpId,p);
}

function renderDashboardInfo(u) {
    if(!u)return; switchScreen('screen-dashboard');
    document.getElementById('txtFirstName').innerText=u.name.split(' ')[0]; document.getElementById('imgAvatar').src=u.avatar||DEFAULT_AVATAR;
    document.getElementById('txtFullName').innerText=u.name; document.getElementById('txtDept').innerText=u.dept||'ไม่ระบุแผนก';
    document.getElementById('txtCardNumbers').innerText=`${u.empId} ${u.mobilePhone} ${u.intPhone}`;
}

function fetchDashboardData() {
    const u=getSession(); if(!u)return;
    google.script.run.withSuccessHandler(r=>{
        if(r&&r.status==='success'){
            dashboardData=r.data;
            document.getElementById('cardTotalPts').innerText=r.data.myTotalPoints||0;
            document.getElementById('rewardsAvailablePts').innerText=r.data.myTotalPoints||0;
            checkSpecialCampaign();
        }
    }).gsGetDashboardData(u.empId);
}

function openProfile() {
    const u=getSession(); if(!u)return;
    document.getElementById('editIntPhone').value=u.intPhone; document.getElementById('editMobilePhone').value=u.mobilePhone; document.getElementById('editEmail').value=u.email;
    document.getElementById('editAvatarPreview').src=u.avatar||DEFAULT_AVATAR;
    updateLineStatusUI();
    document.getElementById('screen-profile').classList.add('active');
}

function closeProfile() { document.getElementById('screen-profile').classList.remove('active'); }

function updateLineStatusUI() {
    const u = getSession(); if(!u) return;
    const txt = document.getElementById('lineStatusText'); const btnC = document.getElementById('btnConnectLine'); const btnU = document.getElementById('btnUnlinkLine');
    if (u.lineId && u.lineId !== '-' && u.lineId !== '') { txt.innerText = 'เชื่อมต่อแล้ว'; txt.className = 'text-[10px] text-[#00B900] font-bold'; btnC.classList.add('hidden'); btnU.classList.remove('hidden'); } 
    else { txt.innerText = 'ยังไม่ได้เชื่อมต่อ'; txt.className = 'text-[10px] text-slate-500'; btnC.classList.remove('hidden'); btnU.classList.add('hidden'); }
}

function connectLine() {
    const u = getSession(); if(!u) return;
    const lineAuthUrl = "https://liff.line.me/YOUR_LIFF_ID?empId=" + u.empId; 
    Swal.fire({ title: 'เชื่อมต่อ LINE', text: 'ระบบจะเปิดหน้าต่างใหม่เพื่อเชื่อมต่อ LINE', icon: 'info', showCancelButton: true, confirmButtonText: 'เชื่อมต่อเลย' }).then((result) => { if (result.isConfirmed) { window.open(lineAuthUrl, '_blank'); } });
}

function unlinkLine() {
    const u = getSession(); if(!u) return;
    showLoader();
    google.script.run.withSuccessHandler(r => { hideLoader(); if(r.status === 'success') { u.lineId = ''; saveSession(u); updateLineStatusUI(); showToast('ยกเลิกสำเร็จ'); } }).gsUnlinkLine(u.empId);
}

function checkSpecialCampaign() {
    const u = getSession(); if (!u) return;
    google.script.run.withSuccessHandler(r => {
        const block = document.getElementById('rewardJackpotBlock'); const banner = document.getElementById('promoWinnerBanner');
        if (r.status !== 'success' || r.isCampaignActive === false) { block.classList.add('hidden'); banner.classList.add('hidden'); return; }
        if (r.winnerId && r.winnerId !== '') { block.classList.add('hidden'); banner.classList.remove('hidden'); document.getElementById('winnerBannerName').innerText = r.winnerName; document.getElementById('winnerBannerContact').innerText = r.contactName; return; }
        block.classList.remove('hidden'); banner.classList.add('hidden');
        let count = r.currentCount || 0; let max = r.maxQuota || 50;
        document.getElementById('rewardProgressBar').style.width = ((count/max)*100) + '%';
        document.getElementById('rewardProgressText').innerText = `เหลืออีก ${max-count} ที่!`;
    }).gsGetActivePromotionStatus(u.empId);
}

function logout() { clearSession(); location.reload(); }