/**
 * THE FARNUM | Global Video Sharing (Supabase Edition)
 */

// --- CONFIGURATION ---
let SUPABASE_URL = localStorage.getItem('sb_url') || 'https://pgicgdnqmvrdjbhsjmms.supabase.co';
let SUPABASE_ANON_KEY = localStorage.getItem('sb_key') || 'sb_publishable_yle17i6a3oZdWL8eDlIlAA_6I6PWTEJ';
let TELEGRAM_GROUP_LINK = localStorage.getItem('tg_link') || '';
let GAMING_LINK = localStorage.getItem('gaming_link') || '';
let PAYSTACK_KEY = localStorage.getItem('paystack_key') || 'pk_live_4a40bfb9b3e57c0919bef6958579ae74829ce7be';
let IS_ADMIN = localStorage.getItem('is_admin') === 'true';

// Check for Secret URL access: ?admin=true
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('admin') === 'true' || localStorage.getItem('is_admin') === 'true') {
    IS_ADMIN = true;
    localStorage.setItem('is_admin', 'true');
    // We need to wait for DOM to show the link
    document.addEventListener('DOMContentLoaded', () => {
        const adminLink = document.getElementById('sidebar-admin-link');
        if (adminLink) adminLink.style.display = 'flex';
    });
}

let supabaseClient = null;

function initSupabase() {
    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
        try {
            supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        } catch (e) {
            console.error("Supabase Init Error:", e);
        }
    }
}
initSupabase();

// --- CLOUD CORE ---
async function uploadToCloud(id, file, title, description) {
    if (!supabaseClient) {
        alert('Please configure your Supabase URL and Key first!');
        throw new Error('Supabase not configured');
    }

    const cleanFileName = `${id}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    const { data: uploadData, error: uploadError } = await supabaseClient.storage
        .from('videos')
        .upload(cleanFileName, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabaseClient.storage
        .from('videos')
        .getPublicUrl(cleanFileName);

    const { error: dbError } = await supabaseClient
        .from('videos')
        .insert([{
            id,
            title: title || file.name,
            description: description,
            video_url: publicUrl,
            play_link: arguments[4], // Capture the play link from arguments
            price: arguments[5] || 0 // Capture the price from arguments
        }]);

    if (dbError) throw dbError;
}

async function fetchVideo(id) {
    if (!supabaseClient) return null;
    const { data, error } = await supabaseClient
        .from('videos')
        .select('*')
        .eq('id', id)
        .single();
    
    if (error) return null;
    return data;
}

async function fetchRecentVideos() {
    if (!supabaseClient) return [];
    try {
        const { data, error } = await supabaseClient
            .from('videos')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(20);
        
        if (error) throw error;
        return data;
    } catch (e) {
        console.error("Fetch Error:", e);
        return [];
    }
}

// --- UTILS ---
function generateID() {
    return Math.random().toString(36).substring(2, 9);
}

function getShareLink(id) {
    const url = new URL(window.location.href);
    const path = url.pathname.substring(0, url.pathname.lastIndexOf('/') + 1);
    return `${url.origin}${path}watch.html?id=${id}`;
}

// --- GLOBAL INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    // 1. Setup Configuration Inputs
    const platformTools = document.getElementById('platform-tools');

    // Mouse spotlight tracker
    document.addEventListener('mousemove', e => {
        const x = (e.clientX / window.innerWidth) * 100;
        const y = (e.clientY / window.innerHeight) * 100;
        document.documentElement.style.setProperty('--mouse-x', `${x}%`);
        document.documentElement.style.setProperty('--mouse-y', `${y}%`);
    });

    if (IS_ADMIN && platformTools) {
        platformTools.style.display = 'block';
    }

    const tgInput = document.getElementById('tg-config-input');
    const sbUrlInput = document.getElementById('sb-url-input');
    const sbKeyInput = document.getElementById('sb-key-input');
    const gamingInput = document.getElementById('gaming-link-input');
    const paystackInput = document.getElementById('paystack-key-input');
    const saveBtn = document.getElementById('save-config-btn');
    const statusMsg = document.getElementById('config-status');

    // Pre-fill values
    if (tgInput) tgInput.value = TELEGRAM_GROUP_LINK;
    if (sbUrlInput) sbUrlInput.value = SUPABASE_URL;
    if (sbKeyInput) sbKeyInput.value = SUPABASE_ANON_KEY;
    if (gamingInput) gamingInput.value = GAMING_LINK;
    if (paystackInput) paystackInput.value = PAYSTACK_KEY;

    // Save Logic
    if (saveBtn) {
        saveBtn.onclick = () => {
            TELEGRAM_GROUP_LINK = tgInput.value.trim();
            SUPABASE_URL = sbUrlInput.value.trim();
            SUPABASE_ANON_KEY = sbKeyInput.value.trim();
            GAMING_LINK = gamingInput.value.trim();
            if (paystackInput) PAYSTACK_KEY = paystackInput.value.trim();

            localStorage.setItem('tg_link', TELEGRAM_GROUP_LINK);
            localStorage.setItem('sb_url', SUPABASE_URL);
            localStorage.setItem('sb_key', SUPABASE_ANON_KEY);
            localStorage.setItem('gaming_link', GAMING_LINK);
            localStorage.setItem('paystack_key', PAYSTACK_KEY);

            initSupabase();
            
            statusMsg.style.display = 'block';
            setTimeout(() => statusMsg.style.display = 'none', 3000);
            
            renderHistory();
        };
    }

    // --- AUTHENTICATION MODULE ---
    const authOverlay = document.getElementById('auth-overlay');
    const headerLoginBtn = document.getElementById('header-login-btn');
    const googleLoginBtn = document.getElementById('google-login-btn');
    const userProfile = document.getElementById('user-profile');
    const userName = document.getElementById('user-name');
    const userAvatar = document.getElementById('user-avatar');

    const updateAuthUI = (user) => {
        if (user) {
            if (headerLoginBtn) headerLoginBtn.style.display = 'none';
            if (authOverlay) authOverlay.style.display = 'none';
            if (userProfile) {
                userProfile.style.display = 'flex';
                userName.textContent = user.user_metadata.full_name || user.email;
                if (user.user_metadata.avatar_url) {
                    userAvatar.style.backgroundImage = `url(${user.user_metadata.avatar_url})`;
                    userAvatar.style.backgroundSize = 'cover';
                }
            }
        } else {
            if (headerLoginBtn) headerLoginBtn.style.display = 'block';
            if (userProfile) userProfile.style.display = 'none';
        }
    };

    if (headerLoginBtn) headerLoginBtn.onclick = () => authOverlay.style.display = 'flex';
    
    if (googleLoginBtn) {
        googleLoginBtn.onclick = async () => {
            const ageCheck = document.getElementById('age-confirm-checkbox');
            if (ageCheck && !ageCheck.checked) {
                alert('Please confirm you are 18 years or older by ticking the checkbox to proceed.');
                return;
            }
            if (!supabaseClient) { alert('System Offline: Connect Supabase first.'); return; }
            const { data, error } = await supabaseClient.auth.signInWithOAuth({
                provider: 'google',
            });
            if (error) console.error('Auth Error:', error.message);
        };
    }

    if (userProfile) {
        userProfile.onclick = async () => {
            if (confirm('Do you want to sign out?')) {
                await supabaseClient.auth.signOut();
                window.location.reload();
            }
        };
    }

    // Listen for Auth State Changes
    if (supabaseClient) {
        supabaseClient.auth.onAuthStateChange((event, session) => {
            updateAuthUI(session?.user);
        });

        // Check current session on load
        supabaseClient.auth.getUser().then(({ data: { user } }) => {
            updateAuthUI(user);
        });
    }

    // --- NEW FUNCTIONALITY: Search & Filters ---
    window.setFilter = (category, el) => {
        const chips = document.querySelectorAll('.filter-chip');
        chips.forEach(c => c.classList.remove('active'));
        el.classList.add('active');
        renderHistory(category === 'All' ? '' : category);
    };

    window.showSection = (sectionName) => {
        const sections = ['main-gallery', 'leaderboard-section', 'history-section', 'admin-dashboard'];
        sections.forEach(s => {
            const el = document.getElementById(s);
            if (el) el.style.display = 'none';
        });

        if (sectionName === 'home') {
            document.getElementById('main-gallery').style.display = 'block';
            renderHistory();
        } else if (sectionName === 'leaderboard') {
            document.getElementById('leaderboard-section').style.display = 'block';
            renderLeaderboard();
        } else if (sectionName === 'history') {
            document.getElementById('history-section').style.display = 'block';
            renderLocalHistory();
        } else if (sectionName === 'admin-dashboard') {
            if (!IS_ADMIN) return; // Hard stop for non-admins
            document.getElementById('admin-dashboard').style.display = 'block';
            refreshAdminStats();
        }
    };

    const refreshAdminStats = async () => {
        if (!supabaseClient) return;
        const { data, count, error } = await supabaseClient
            .from('videos')
            .select('*', { count: 'exact', head: true });
        
        if (!error) {
            const statVideoEl = document.getElementById('stat-total-videos');
            if (statVideoEl) statVideoEl.textContent = count || 0;
        }
    };

    const renderLeaderboard = () => {
        const body = document.getElementById('leaderboard-body');
        const mockPlayers = [
            { rank: 1, name: 'CyberKing', earnings: '$12,450', level: 'ELITE' },
            { rank: 2, name: 'ShadowByte', earnings: '$9,120', level: 'PROFESSIONAL' },
            { rank: 3, name: 'NeonPulse', earnings: '$7,800', level: 'ADVANCED' },
            { rank: 4, name: 'GlitchMaster', earnings: '$5,200', level: 'INTERMEDIATE' },
            { rank: 5, name: 'ZenGamer', earnings: '$3,100', level: 'NOVICE' }
        ];

        body.innerHTML = mockPlayers.map(p => `
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                <td style="padding: 1.2rem; font-weight: 900; color: var(--accent-color);">#${p.rank}</td>
                <td style="padding: 1.2rem;">${p.name}</td>
                <td style="padding: 1.2rem; font-family: monospace; color: #4ade80;">${p.earnings}</td>
                <td style="padding: 1.2rem; font-size: 0.7rem; letter-spacing: 0.1em;"><span style="background: rgba(255,255,255,0.1); padding: 4px 8px; border-radius: 4px;">${p.level}</span></td>
            </tr>
        `).join('');
    };

    const renderLocalHistory = () => {
        const historyList = document.getElementById('history-list');
        const historyData = JSON.parse(localStorage.getItem('academy_history') || '[]');
        
        if (historyData.length === 0) {
            historyList.innerHTML = '<div style="color: var(--text-secondary); padding: 2rem;">No watch history yet. Start learning!</div>';
            return;
        }

        historyList.innerHTML = historyData.reverse().map(v => `
            <div class="video-card-visual" onclick="window.location.href='watch.html?id=${v.id}'">
                <div class="video-preview-box">
                    <img src="https://images.unsplash.com/photo-1614332284683-517b1ec0f0c0?auto=format&fit=crop&q=80&w=400" style="width: 100%; height: 100%; object-fit: cover;">
                </div>
                <div class="video-card-info" style="padding: 1rem;">
                    <div class="video-name" style="font-size: 0.9rem;">${v.title}</div>
                    <div class="video-meta-text" style="font-size: 0.75rem;">Watched recently</div>
                </div>
            </div>
        `).join('');
    };

    const searchInput = document.querySelector('.search-bar input');
    const searchBtn = document.querySelector('.search-btn');

    const handleSearch = () => {
        const query = searchInput.value.toLowerCase().trim();
        renderHistory(query);
    };

    if (searchBtn) searchBtn.onclick = handleSearch;
    if (searchInput) {
        searchInput.onkeyup = (e) => { if (e.key === 'Enter') handleSearch(); };
    }

    // Category Chips
    const chips = document.querySelectorAll('.main-content [style*="cursor: pointer"]');
    chips.forEach(chip => {
        chip.addEventListener('click', () => {
            // Reset active state simple way
            chips.forEach(c => {
                c.style.background = '#272727';
                c.style.color = '#fff';
            });
            chip.style.background = '#fff';
            chip.style.color = '#000';

            const category = chip.textContent.trim();
            renderHistory(category === 'All' ? '' : category);
        });
    });

    // Sidebar Navigation Mock
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (item.classList.contains('active')) return;
            document.querySelectorAll('.nav-item').forEach(ni => ni.classList.remove('active'));
            item.classList.add('active');
            renderHistory(); // Refresh to "Home" state
        });
    });

    // 2. Setup Upload Page Logic (if on index.html)
    if (document.getElementById('drop-zone')) {
        const dropZone = document.getElementById('drop-zone');
        const fileInput = document.getElementById('file-input');
        const statusText = document.getElementById('status-text');
        const uploadActionContainer = document.getElementById('upload-action-container');
        const finalUploadBtn = document.getElementById('final-upload-btn');

        let stagedFile = null;

        dropZone.addEventListener('click', () => fileInput.click());
        dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
        dropZone.addEventListener('dragleave', () => { dropZone.classList.remove('drag-over'); });
        
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
            if (e.dataTransfer.files.length) stageFile(e.dataTransfer.files[0]);
        });

        fileInput.addEventListener('change', (e) => { 
            if (e.target.files.length) stageFile(e.target.files[0]); 
        });

        function stageFile(file) {
            if (!file.type.startsWith('video/')) { alert('Please select a valid video file.'); return; }
            stagedFile = file;
            
            // Visually update the dropzone
            const p = dropZone.querySelector('p');
            const icon = dropZone.querySelector('i');
            if (p) {
                p.textContent = `${file.name}`;
                p.style.color = '#4ade80';
                p.style.fontWeight = '700';
            }
            if (icon) {
                icon.setAttribute('data-lucide', 'check-circle');
                icon.style.color = '#4ade80';
                lucide.createIcons();
            }
            
            if (statusText) statusText.textContent = `✓ SELECTED: ${file.name}`;
            if (uploadActionContainer) uploadActionContainer.style.display = 'block';
            finalUploadBtn.innerText = 'PUBLISH TO THE FARNUM';
        }

        finalUploadBtn.addEventListener('click', async () => {
            if (!stagedFile) return;
            if (!supabaseClient) { alert('Please configure your Supabase first!'); return; }
            
            await handleUpload(stagedFile);
        });

        async function handleUpload(file) {
            const titleInput = document.getElementById('video-title-input');
            const descInput = document.getElementById('video-desc-input');
            const playLinkInput = document.getElementById('video-play-link');
            const priceInput = document.getElementById('video-price-input');
            const priceVal = priceInput && priceInput.value ? parseFloat(priceInput.value) : 0;
            
            finalUploadBtn.disabled = true;
            finalUploadBtn.innerText = 'UPLOADING... DO NOT CLOSE!';
            if (statusText) statusText.textContent = 'UPLOADING TO THE CLOUD (DO NOT CLOSE)...';
            const id = generateID();

            try {
                await uploadToCloud(id, file, titleInput.value, descInput.value, playLinkInput.value, priceVal);
                showSuccess(id);
                renderHistory();
                // Reset UI
                titleInput.value = '';
                descInput.value = '';
                stagedFile = null;
                
                const p = dropZone.querySelector('p');
                const icon = dropZone.querySelector('i');
                if (p) { p.textContent = 'DRAG & DROP MODULE'; p.style.color = ''; p.style.fontWeight = ''; }
                if (icon) { icon.setAttribute('data-lucide', 'upload-cloud'); icon.style.color = ''; lucide.createIcons(); }
                
                if (uploadActionContainer) uploadActionContainer.style.display = 'none';
                if (statusText) statusText.textContent = '';
            } catch (err) {
                console.error(err);
                alert('Error uploading. Make sure your bucket is public and table is created.');
            } finally {
                finalUploadBtn.disabled = false;
                finalUploadBtn.innerText = 'PUBLISH TO THE FARNUM';
            }
        }

        function showSuccess(id) {
            const overlay = document.getElementById('overlay');
            const linkElem = document.getElementById('generated-link');
            const previewBtn = document.getElementById('preview-btn');
            const link = getShareLink(id);
            
            linkElem.textContent = link;
            if (previewBtn) previewBtn.href = link;
            
            overlay.style.display = 'flex';
            document.getElementById('copy-btn').onclick = () => {
                navigator.clipboard.writeText(link);
                alert('Link copied!');
            };
            document.getElementById('tg-return-btn').href = TELEGRAM_GROUP_LINK;
        }

        renderHistory();
    }

    // 3. Setup Watch Page Logic (if on watch.html)
    if (document.getElementById('main-video')) {
        const video = document.getElementById('main-video');
        const playPauseBtn = document.getElementById('play-pause');
        const progressBar = document.getElementById('progress-bar');
        const progressFilled = document.getElementById('progress-filled');
        const timeDisplay = document.getElementById('time-display');
        const fullscreenBtn = document.getElementById('fullscreen-btn');

        const params = new URLSearchParams(window.location.search);
        const id = params.get('id');

        if (id) {
            fetchVideo(id).then(data => {
                if (data) {
                    const paywallOverlay = document.getElementById('paywall-overlay');
                    const videoElem = document.getElementById('main-video');
                    const payBtn = document.getElementById('pay-unlock-btn');
                    const priceSpan = document.getElementById('paywall-price');

                    document.getElementById('video-title').textContent = data.title;
                    document.getElementById('video-meta').textContent = data.description || 'Uploaded via The Farnum System';
                    document.getElementById('tg-return-btn-watch').href = TELEGRAM_GROUP_LINK;
                    
                    if (document.getElementById('gaming-cta-btn')) {
                        const finalLink = data.play_link || GAMING_LINK || '#';
                        document.getElementById('gaming-cta-btn').href = finalLink;
                        document.getElementById('gaming-cta-btn').innerHTML = `<i data-lucide="play-circle" style="margin-right: 0.5rem; width: 1.2rem;"></i> CLICK HERE TO PLAY THIS GAME`;
                        lucide.createIcons();
                    }

                    if (data.price > 0 && paywallOverlay) {
                        videoElem.style.display = 'none';
                        paywallOverlay.style.display = 'flex';
                        priceSpan.textContent = data.price;

                        payBtn.onclick = () => {
                            if (!PAYSTACK_KEY) { alert('Paystack API Key is missing. Please contact the administrator.'); return; }
                            
                            const email = prompt('Enter your email to receive access to this premium module:', 'player@thefarnum.com');
                            if (!email) return;

                            let handler = PaystackPop.setup({
                                key: PAYSTACK_KEY,
                                email: email,
                                amount: parseFloat(data.price) * 100, // Converts to lowest currency denominator
                                currency: 'USD', // Can be NGN, GHS, ZAR, or USD depending on Paystack account
                                ref: 'FARNUM_' + Math.floor((Math.random() * 1000000000) + 1),
                                callback: function(response){
                                    paywallOverlay.style.display = 'none';
                                    videoElem.style.display = 'block';
                                    videoElem.src = data.video_url;
                                    videoElem.play();
                                },
                                onClose: function(){
                                    // User closed window without paying
                                }
                            });
                            handler.openIframe();
                        };
                    } else {
                        videoElem.src = data.video_url;
                    }
                } else {
                    document.getElementById('video-title').textContent = 'Video Not Found';
                }
            });
        }

        function togglePlay() { if (video.paused) video.play(); else video.pause(); }
        video.addEventListener('play', () => { playPauseBtn.innerHTML = '<i data-lucide="pause"></i>'; lucide.createIcons(); });
        video.addEventListener('pause', () => { playPauseBtn.innerHTML = '<i data-lucide="play"></i>'; lucide.createIcons(); });
        playPauseBtn.addEventListener('click', togglePlay);
        video.addEventListener('click', togglePlay);
        video.addEventListener('timeupdate', () => {
            const percent = (video.currentTime / video.duration) * 100;
            progressFilled.style.width = `${percent}%`;
            timeDisplay.textContent = `${formatTime(video.currentTime)} / ${formatTime(video.duration || 0)}`;
        });
        function formatTime(s) { return new Date(s * 1000).toISOString().substr(11, 8).replace(/^00:/, ''); }
        progressBar.addEventListener('click', (e) => { video.currentTime = (e.offsetX / progressBar.offsetWidth) * video.duration; });
        fullscreenBtn.addEventListener('click', () => { if (video.requestFullscreen) video.requestFullscreen(); });

        // Watch Page Feed & Counters
        fetchRecentVideos().then(videos => {
            const currentVideo = videos.find(v => v.id == videoId);
            if (currentVideo) {
                // Save to history
                let history = JSON.parse(localStorage.getItem('academy_history') || '[]');
                if (!history.find(h => h.id == currentVideo.id)) {
                    history.push({ id: currentVideo.id, title: currentVideo.title });
                    localStorage.setItem('academy_history', JSON.stringify(history));
                }
            }

            const sidebar = document.getElementById('sidebar-recents');
            if (sidebar) {
                sidebar.innerHTML = videos.slice(0, 5).map(v => `
                    <a href="watch.html?id=${v.id}" class="nav-item" style="gap: 0.8rem; padding: 0.5rem;">
                        <div style="width: 80px; aspect-ratio: 16/9; background: #000; border-radius: 4px; overflow: hidden; flex-shrink: 0;">
                            <video src="${v.video_url}" style="width: 100%; height: 100%; object-fit: cover;"></video>
                        </div>
                        <div style="font-size: 0.8rem; font-weight: 500; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.2;">
                            ${v.title}
                        </div>
                    </a>
                `).join('');
            }
        });

        // Event listeners for watch buttons
        document.querySelectorAll('.watch-layout [data-lucide="thumbs-up"]').forEach(btn => {
            btn.parentElement.onclick = () => alert('Added to Liked Videos!');
        });
        document.querySelectorAll('.watch-layout [data-lucide="share-2"]').forEach(btn => {
            btn.parentElement.onclick = () => {
                navigator.clipboard.writeText(window.location.href);
                alert('Watch link copied to clipboard!');
            };
        });
        const subBtn = document.querySelector('.main-content button');
        if (subBtn && subBtn.textContent === 'Subscribe') {
            subBtn.onclick = () => {
                subBtn.textContent = 'Subscribed';
                subBtn.style.background = '#272727';
                subBtn.style.color = '#aaa';
            };
        }

        // Auto-play next module logic
        video.addEventListener('ended', () => {
            const nextVideo = document.querySelector('#sidebar-recents a');
            if (nextVideo) {
                const nextTitle = nextVideo.querySelector('div:last-child').textContent.trim();
                const statusBox = document.getElementById('desc-box');
                if (statusBox) {
                    statusBox.innerHTML = `<div style="color: var(--accent-color); font-weight: 800; margin-bottom: 0.5rem; text-transform: uppercase; font-size: 0.75rem;">Up next: ${nextTitle}</div>` + statusBox.innerHTML;
                }
                setTimeout(() => {
                    window.location.href = nextVideo.href;
                }, 3500);
            }
        });
    }

    // Setup Edit Save Button
    const saveEditBtn = document.getElementById('save-edit-btn');
    if (saveEditBtn) {
        saveEditBtn.onclick = async () => {
            const id = document.getElementById('edit-id').value;
            const title = document.getElementById('edit-title').value;
            const desc = document.getElementById('edit-desc').value;

            if (!supabaseClient) { alert('Cloud not connected'); return; }
            const { error } = await supabaseClient
                .from('videos')
                .update({ title, description: desc })
                .eq('id', id);

            if (error) {
                alert('Error updating broadcast.');
                console.error(error);
            } else {
                document.getElementById('edit-overlay').style.display = 'none';
                renderHistory();
            }
        };
    }
});

async function renderHistory(filter = '') {
    const list = document.getElementById('video-list');
    if (!list) return;

    let videos = await fetchRecentVideos();
    
    // Apply client-side filtering for search/categories
    if (filter) {
        const query = filter.toLowerCase();
        videos = videos.filter(v => 
            v.title?.toLowerCase().includes(query) || 
            v.description?.toLowerCase().includes(query) ||
            (v.category && v.category.toLowerCase().includes(query))
        );
    }

    if (videos.length === 0) {
        list.innerHTML = '<div class="editorial" style="color: var(--text-secondary); text-align: center; padding: 2rem;">No uploads yet.</div>';
        return;
    }

    list.innerHTML = `<div class="video-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem 1rem;">${videos.map((v, index) => {
        const link = getShareLink(v.id);
        const delay = index * 0.05;
        return `
            <div class="video-card-visual" style="animation: entrance 0.4s ease-out backwards; animation-delay: ${delay}s" onclick="window.location.href='${link}'">
                <div class="video-preview-box">
                    <video src="${v.video_url}" preload="metadata" muted loop onmouseover="this.play()" onmouseout="this.pause()"></video>
                    <div style="position: absolute; bottom: 8px; right: 8px; background: rgba(0,0,0,0.8); color: #fff; padding: 2px 4px; border-radius: 4px; font-size: 0.75rem; font-weight: 500;"> ${Math.floor(Math.random() * 10 + 5)}:12 </div>
                    ${v.price > 0 ? `<div style="position: absolute; top: 8px; right: 8px; background: var(--accent-secondary); color: #fff; padding: 4px 8px; border-radius: 4px; font-size: 0.7rem; font-weight: 800; letter-spacing: 0.05em; display: flex; align-items: center; gap: 0.3rem; box-shadow: 0 0 10px rgba(112,0,255,0.4);"><i data-lucide="lock" style="width: 10px; height: 10px;"></i> $${v.price}</div>` : `<div style="position: absolute; top: 8px; right: 8px; background: var(--accent-color); color: #000; padding: 4px 8px; border-radius: 4px; font-size: 0.7rem; font-weight: 800; letter-spacing: 0.05em; display: flex; align-items: center; gap: 0.3rem;"><i data-lucide="unlock" style="width: 10px; height: 10px;"></i> FREE</div>`}
                </div>
                <div class="video-card-info">
                    <div class="channel-avatar"></div>
                    <div class="video-meta-block">
                        <h3 class="video-name">${v.title || 'Untitled Module'}</h3>
                        <div class="video-meta-text">The Farnum Elite</div>
                        <div class="video-meta-text">${Math.floor(Math.random() * 100 + 1)}K views • ${Math.floor(Math.random() * 5 + 1)} days ago</div>
                        
                        ${IS_ADMIN ? `
                            <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem;">
                                <button class="btn-icon" style="padding: 2px 6px; font-size: 0.7rem;" onclick="event.stopPropagation(); window.startEdit('${v.id}', '${v.title ? v.title.replace(/'/g, "\\'") : ''}', '${v.description ? v.description.replace(/'/g, "\\'") : ''}')">
                                    EDIT
                                </button>
                                <button class="btn-icon btn-danger" style="padding: 2px 6px; font-size: 0.7rem;" onclick="event.stopPropagation(); window.confirmDelete('${v.id}')">
                                    DELETE
                                </button>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('')}</div>`;
    lucide.createIcons();
}

// Ensure Edit/Delete are globally accessible
window.startEdit = (id, title, desc) => {
    document.getElementById('edit-id').value = id;
    document.getElementById('edit-title').value = title;
    document.getElementById('edit-desc').value = desc;
    document.getElementById('edit-overlay').style.display = 'flex';
};

window.confirmDelete = async (id) => {
    if (confirm('Are you sure you want to delete this broadcast? This cannot be undone.')) {
        if (!supabaseClient) return;
        const { error } = await supabaseClient
            .from('videos')
            .delete()
            .eq('id', id);
        
        if (error) {
            alert('Error deleting video.');
            console.error(error);
        } else {
            renderHistory();
        }
    }
};
