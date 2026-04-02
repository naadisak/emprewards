// ==========================================
// 🚀 API GATEWAY PROXY (เชื่อมต่อหลังบ้าน GAS)
// ==========================================
const GAS_API_URL = "https://script.google.com/macros/s/AKfycbzWP95xfCYx7wqmB3SrmkSoUq6i0ApfZE74_kOAJ_C_LI-TGvRO3I9rG3VddDSjP1Jv/exec"; 

if (typeof window.google === 'undefined') {
    window.google = {
        script: {
            get run() {
                let _success = null;
                let _failure = null;
                const runner = {
                    withSuccessHandler: function(cb) { _success = cb; return new Proxy(this, proxyHandler); },
                    withFailureHandler: function(cb) { _failure = cb; return new Proxy(this, proxyHandler); }
                };
                const proxyHandler = {
                    get: function(target, prop) {
                        if (prop in target) return target[prop];
                        return function(...args) {
                            fetch(GAS_API_URL, {
                                redirect: "follow", method: 'POST',
                                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                                body: JSON.stringify({ action: prop, args: args })
                            })
                            .then(res => res.json())
                            .then(data => { if (_success) _success(data); })
                            .catch(err => { if (_failure) _failure(err); });
                        }
                    }
                };
                return new Proxy(runner, proxyHandler);
            }
        }
    };
}

// Global Variables & Helpers
const IMGBB_API_KEY = 'b37889052f6fd7b7143ff017d07914df';
const DEFAULT_AVATAR = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23cbd5e1'><path d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/></svg>";

function escapeHTML(str){if(!str)return'';return String(str).replace(/[&<>'"]/g,t=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[t]||t));}