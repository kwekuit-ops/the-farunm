/**
 * ====================================================
 * CONFIGURATION SECTION
 * ====================================================
 * Easily edit your WhatsApp link and settings here.
 */
const CONFIG = {
    // Paste your WhatsApp Channel link exactly as it is here
    channelLink: "https://whatsapp.com/channel/0029Vb8Gkjt9sBIHGPzbBc2z", 
    
    // Paste your Telegram Channel link exactly as it is here
    telegramLink: "https://t.me/thefarunm",
    
    // Fake live activity settings (will randomly pick a number between min and max)
    minActivity: 8,
    maxActivity: 25
};

// Return the direct channel URL
const getWhatsAppUrl = () => {
    return CONFIG.channelLink;
};

/**
 * ====================================================
 * APP LOGIC
 * ====================================================
 */
document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Theme Toggle (Dark/Light Mode)
    const themeToggleBtn = document.getElementById('theme-toggle');
    const themeIcon = themeToggleBtn.querySelector('i');
    
    // Check local storage for theme preference or use system preference (default dark)
    const currentTheme = localStorage.getItem('theme') || 'dark';
    
    document.documentElement.setAttribute('data-theme', currentTheme);
    updateThemeIcon(currentTheme);

    themeToggleBtn.addEventListener('click', () => {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const newTheme = isDark ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeIcon(newTheme);
    });

    function updateThemeIcon(theme) {
        if (theme === 'dark') {
            themeIcon.className = 'fas fa-sun';
        } else {
            themeIcon.className = 'fas fa-moon';
        }
    }

    // 2. Welcome Popup Management
    const popup = document.getElementById('welcome-popup');
    const closePopupBtn = document.getElementById('close-popup');

    // Show popup after 2.5 seconds
    setTimeout(() => {
        popup.classList.add('show');
    }, 2500);

    closePopupBtn.addEventListener('click', () => {
        popup.classList.remove('show');
    });

    // 3. Fake Live Activity Text
    const activityText = document.querySelector('#live-activity span:nth-child(2)');
    const randomCount = Math.floor(Math.random() * (CONFIG.maxActivity - CONFIG.minActivity + 1)) + CONFIG.minActivity;
    activityText.textContent = `${randomCount} people joined today`;

    // 4. Join Button Redirect with Smooth Effect
    const joinBtn = document.getElementById('join-btn');
    const telegramBtn = document.getElementById('join-telegram-btn');
    const redirectOverlay = document.getElementById('redirect-overlay');
    const redirectIcon = document.getElementById('redirect-icon');
    const redirectText = document.getElementById('redirect-text');

    function handleRedirect(button, url, platform) {
        const btnText = button.querySelector('.btn-text');
        const loader = button.querySelector('.loader');
        const btnIcon = button.querySelector('i');

        // Show loading state on button
        btnText.style.display = 'none';
        btnIcon.style.display = 'none';
        loader.style.display = 'block';

        // Set overlay content
        if (platform === 'telegram') {
            redirectIcon.className = 'fab fa-telegram-plane whatsapp-icon'; 
            redirectIcon.style.color = '#2AABEE';
            redirectText.textContent = 'Redirecting to Telegram...';
        } else {
            redirectIcon.className = 'fab fa-whatsapp whatsapp-icon';
            redirectIcon.style.color = 'var(--accent-color)';
            redirectText.textContent = 'Redirecting to WhatsApp...';
        }

        // After small delay, show overlay
        setTimeout(() => {
            redirectOverlay.classList.add('active');
            
            // Redirect after showing overlay
            setTimeout(() => {
                window.location.href = url;
                
                // Reset UI in case user navigates back
                setTimeout(() => {
                    redirectOverlay.classList.remove('active');
                    btnText.style.display = 'block';
                    btnIcon.style.display = 'block';
                    loader.style.display = 'none';
                }, 1000);
            }, 1800);
        }, 400);
    }

    joinBtn.addEventListener('click', () => {
        handleRedirect(joinBtn, getWhatsAppUrl(), 'whatsapp');
    });

    if (telegramBtn) {
        telegramBtn.addEventListener('click', () => {
            handleRedirect(telegramBtn, CONFIG.telegramLink, 'telegram');
        });
    }

    // 5. Copy Link Button
    const copyBtn = document.getElementById('copy-btn');
    
    copyBtn.addEventListener('click', async () => {
        const originalHTML = copyBtn.innerHTML;
        try {
            await navigator.clipboard.writeText(getWhatsAppUrl());
            copyBtn.innerHTML = '<i class="fas fa-check"></i> Link Copied!';
            copyBtn.style.color = 'var(--accent-color)';
            copyBtn.style.borderColor = 'var(--accent-color)';
        } catch (err) {
            // Fallback for browsers that don't support clipboard API well
            copyBtn.innerHTML = '<i class="fas fa-times"></i> Failed to copy';
        }

        // Reset back to original text after 2 seconds
        setTimeout(() => {
            copyBtn.innerHTML = originalHTML;
            copyBtn.style.color = '';
            copyBtn.style.borderColor = '';
        }, 2000);
    });
});
