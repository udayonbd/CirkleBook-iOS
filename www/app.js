'use strict';

/* =========================================================
   CIRKLEBOOK FRONTEND
   FINAL CORE VERSION

   Login
   Current User
   Feed
   Create Text Post
   Photo / Video
   Like / Unlike
   Comment
   Share
   Save / Unsave
   Logout
========================================================= */

const API_BASE_URL = 'https://cirklebook-4u6gv.ondigitalocean.app/api/v1';

const ROUTES = {
    login: '/auth/login',
    me: '/auth/me',
    usersMe: '/users/me',
    logout: '/auth/logout',

    feed: '/feed',
    posts: '/posts',
    post(postId) {
        return `/posts/${encodeURIComponent(postId)}`;
    },
    mediaUpload: '/media/upload',

    reactions(postId) {
        return `/reactions/${postId}/reactions`;
    },

    comments(postId) {
        return `/comments/${postId}/comments`;
    },

    share(postId) {
        return `/shares/${postId}/share`;
    },

    save(postId) {
        return `/saves/${postId}/save`;
    }
};


const state = {
    currentUser: null,

    selectedFile: null,
    previewUrl: null,
    selectedFiles: [],
    previewUrls: [],

    publishing: false,
    loadingFeed: false,

    likedPosts: new Set(),
    savedPosts: new Set(),
    sharedPosts: new Set()
};


/* =========================================================
   DOM
========================================================= */

const $ = (id) =>
    document.getElementById(id);


const dom = {
    loginScreen: $('loginScreen'),
    mainApp: $('mainApp'),

    loginForm: $('loginForm'),
    loginIdentifier: $('loginIdentifier'),
    loginPassword: $('loginPassword'),
    loginButton: $('loginButton'),
    loginMessage: $('loginMessage'),

    topUsername: $('topUsername'),
    sidebarUsername: $('sidebarUsername'),
    modalUsername: $('modalUsername'),
    menuUsername: $('menuUsername'),

    topAvatar: $('topAvatar'),
    sidebarAvatar: $('sidebarAvatar'),
    composerAvatar: $('composerAvatar'),
    modalAvatar: $('modalAvatar'),
    menuAvatar: $('menuAvatar'),

    openComposerButton: $('openComposerButton'),
    photoVideoButton: $('photoVideoButton'),

    postModal: $('postModal'),
    closeModalButton: $('closeModalButton'),

    postBody: $('postBody'),
    postVisibility: $('postVisibility'),

    modalMediaButton: $('modalMediaButton'),
    mediaInput: $('mediaInput'),

    previewBox: $('previewBox'),
    mediaPreviewGrid: $('mediaPreviewGrid'),
    imagePreview: $('imagePreview'),
    videoPreview: $('videoPreview'),

    removeMediaButton:
        $('removeMediaButton'),

    postMessage: $('postMessage'),
    publishButton: $('publishButton'),

    feedMessage: $('feedMessage'),
    feedContainer: $('feedContainer'),

    profileButton: $('profileButton'),
    accountMenu: $('accountMenu'),
    logoutButton: $('logoutButton'),

    toast: $('toast')
};


/* =========================================================
   TOKEN
========================================================= */

function getAccessToken() {
    return localStorage.getItem(
        'cirklebook_access_token'
    );
}


function saveAccessToken(token) {
    localStorage.setItem(
        'cirklebook_access_token',
        token
    );
}


function clearAccessToken() {
    localStorage.removeItem(
        'cirklebook_access_token'
    );
}


/* =========================================================
   BASIC HELPERS
========================================================= */

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}


function formatDate(value) {
    if (!value) {
        return '';
    }

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return String(value);
    }

    return date.toLocaleString();
}


function getDisplayName(user) {
    return (
        user?.display_name ||
        user?.displayName ||
        user?.name ||
        user?.username ||
        'User'
    );
}


function getInitial(user) {
    return (
        getDisplayName(user)
            .charAt(0)
            .toUpperCase() ||
        'U'
    );
}


/* =========================================================
   MESSAGES
========================================================= */

function setLoginMessage(
    message = ''
) {
    if (!dom.loginMessage) {
        return;
    }

    dom.loginMessage.textContent =
        message;

    dom.loginMessage.classList.toggle(
        'hidden',
        !message
    );
}


function setPostMessage(
    message = ''
) {
    if (!dom.postMessage) {
        return;
    }

    dom.postMessage.textContent =
        message;

    dom.postMessage.classList.toggle(
        'hidden',
        !message
    );
}


let toastTimer = null;


function showToast(message) {
    if (!dom.toast) {
        console.log(message);
        return;
    }

    clearTimeout(toastTimer);

    dom.toast.textContent =
        message;

    dom.toast.classList.remove(
        'hidden'
    );

    toastTimer =
        setTimeout(
            () => {
                dom.toast.classList.add(
                    'hidden'
                );
            },
            2500
        );
}


/* =========================================================
   API REQUEST
========================================================= */

async function apiRequest(
    path,
    options = {}
) {
    const token =
        getAccessToken();

    const headers = {
        ...(options.headers || {})
    };

    if (
        options.body &&
        !(
            options.body
            instanceof FormData
        )
    ) {
        headers['Content-Type'] =
            'application/json';
    }

    if (token) {
        headers.Authorization =
            `Bearer ${token}`;
    }

    const response =
        await fetch(
            `${API_BASE_URL}${path}`,
            {
                ...options,
                headers
            }
        );

    let data = null;

    try {
        data =
            await response.json();
    } catch (_) {
        data = null;
    }

    if (!response.ok) {
        const error =
            new Error(
                data?.error?.message ||
                data?.message ||
                `Request failed (${response.status})`
            );

        error.status =
            response.status;

        error.code =
            data?.error?.code ||
            'REQUEST_FAILED';

        error.data =
            data;

        throw error;
    }

    return data;
}


/* =========================================================
   LOGIN TOKEN FINDER
========================================================= */

function findAccessToken(value) {
    if (!value) {
        return null;
    }

    if (
        typeof value === 'string'
    ) {
        if (
            value.length > 30 &&
            value.includes('.')
        ) {
            return value;
        }

        return null;
    }

    if (
        typeof value !== 'object'
    ) {
        return null;
    }

    const keys = [
        'accessToken',
        'access_token',
        'token'
    ];

    for (const key of keys) {
        if (
            typeof value[key]
            === 'string' &&
            value[key].length > 20
        ) {
            return value[key];
        }
    }

    for (
        const child
        of Object.values(value)
    ) {
        const found =
            findAccessToken(child);

        if (found) {
            return found;
        }
    }

    return null;
}


/* =========================================================
   USER FINDER
========================================================= */

function findUserObject(value) {
    if (
        !value ||
        typeof value !== 'object'
    ) {
        return null;
    }

    const id =
        value.id ||
        value.user_id ||
        value.userId;

    if (
        id &&
        (
            value.username ||
            value.email ||
            value.phone ||
            value.display_name ||
            value.displayName ||
            value.name
        )
    ) {
        return {
            ...value,
            id
        };
    }

    const importantKeys = [
        'user',
        'currentUser',
        'current_user',
        'account',
        'member',
        'principal',
        'profile'
    ];

    for (
        const key
        of importantKeys
    ) {
        if (!value[key]) {
            continue;
        }

        const found =
            findUserObject(
                value[key]
            );

        if (found) {
            return found;
        }
    }

    for (
        const child
        of Object.values(value)
    ) {
        if (
            child &&
            typeof child === 'object'
        ) {
            const found =
                findUserObject(child);

            if (found) {
                return found;
            }
        }
    }

    return null;
}


/* =========================================================
   USER UI
========================================================= */

function renderCurrentUser() {
    const user =
        state.currentUser ||
        {
            username: 'User'
        };

    const name =
        getDisplayName(user);

    const initial =
        getInitial(user);

    const nameElements = [
        dom.topUsername,
        dom.sidebarUsername,
        dom.modalUsername,
        dom.menuUsername
    ];

    const avatarElements = [
        dom.topAvatar,
        dom.sidebarAvatar,
        dom.composerAvatar,
        dom.modalAvatar,
        dom.menuAvatar
    ];

    nameElements
        .filter(Boolean)
        .forEach(
            (element) => {
                element.textContent =
                    name;
            }
        );

    avatarElements
        .filter(Boolean)
        .forEach(
            (element) => {
                element.textContent =
                    initial;
            }
        );
}


/* =========================================================
   CURRENT USER
========================================================= */

async function loadCurrentUser() {
    const endpoints = [
        ROUTES.me,
        ROUTES.usersMe
    ];

    let lastError = null;

    for (
        const endpoint
        of endpoints
    ) {
        try {
            const result =
                await apiRequest(
                    endpoint
                );

            const user =
                findUserObject(
                    result
                );

            if (user?.id) {
                state.currentUser =
                    user;

                renderCurrentUser();

                return user;
            }

        } catch (error) {
            lastError =
                error;

            if (
                error.status !== 404
            ) {
                console.warn(
                    'CURRENT USER:',
                    endpoint,
                    error
                );
            }
        }
    }

    if (lastError) {
        throw lastError;
    }

    throw new Error(
        'Authenticated user could not be loaded.'
    );
}


/* =========================================================
   LOGIN
========================================================= */

async function loginUser(event) {
    event.preventDefault();

    setLoginMessage('');

    const identifier =
        dom.loginIdentifier
            ?.value
            .trim() ||
        '';

    const password =
        dom.loginPassword
            ?.value ||
        '';

    if (
        !identifier ||
        !password
    ) {
        setLoginMessage(
            'Please enter username/email and password.'
        );

        return;
    }

    dom.loginButton.disabled =
        true;

    dom.loginButton.textContent =
        'Logging in...';

    try {
        const response =
            await fetch(
                `${API_BASE_URL}${ROUTES.login}`,
                {
                    method: 'POST',

                    headers: {
                        'Content-Type':
                            'application/json'
                    },

                    body:
                        JSON.stringify({
                            identifier,
                            password
                        })
                }
            );

        let result = null;

        try {
            result =
                await response.json();
        } catch (_) {
            result = null;
        }

        if (!response.ok) {
            throw new Error(
                result?.error?.message ||
                result?.message ||
                `Login failed (${response.status})`
            );
        }

        const token =
            findAccessToken(
                result
            );

        if (!token) {
            throw new Error(
                'Login succeeded but access token was not returned.'
            );
        }

        saveAccessToken(
            token
        );

        await loadCurrentUser();

        dom.loginPassword.value =
            '';

        dom.loginScreen
            ?.classList
            .add('hidden');

        dom.mainApp
            ?.classList
            .remove('hidden');

        await loadFeed();

        if (typeof window.CirklebookRestorePageIdentity === 'function') {
            await window.CirklebookRestorePageIdentity();
        }

        showToast(
            'Login successful'
        );

    } catch (error) {
        console.error(
            'LOGIN ERROR:',
            error
        );

        clearAccessToken();

        setLoginMessage(
            error.message ||
            'Login failed.'
        );

    } finally {
        dom.loginButton.disabled =
            false;

        dom.loginButton.textContent =
            'Log In';
    }
}


/* =========================================================
   RESTORE LOGIN
========================================================= */

async function restoreSession() {
    const token =
        getAccessToken();

    if (!token) {
        dom.loginScreen
            ?.classList
            .remove('hidden');

        dom.mainApp
            ?.classList
            .add('hidden');

        return;
    }

    try {
        await loadCurrentUser();

        dom.loginScreen
            ?.classList
            .add('hidden');

        dom.mainApp
            ?.classList
            .remove('hidden');

        await loadFeed();

        if (typeof window.CirklebookRestorePageIdentity === 'function') {
            await window.CirklebookRestorePageIdentity();
        }

    } catch (error) {
        console.error(
            'RESTORE SESSION:',
            error
        );

        clearAccessToken();

        dom.mainApp
            ?.classList
            .add('hidden');

        dom.loginScreen
            ?.classList
            .remove('hidden');
    }
}


/* =========================================================
   MEDIA URL
========================================================= */

function buildMediaUrl(media) {
    if (!media) return '';

    // In the Capacitor app, window.location.origin is the local WebView origin
    // (for example capacitor://localhost). Media must always be streamed from
    // the deployed CirkleBook API host instead of that local origin.
    const apiOrigin = API_BASE_URL.replace(/\/api\/v1\/?$/, '');
    const apiMediaBase = `${API_BASE_URL}/media`;

    const toBackendMediaUrl = (value) => {
        if (!value) return '';
        const raw = String(value).trim();
        if (!raw) return '';

        try {
            // Relative media/API paths belong to the deployed backend.
            if (raw.startsWith('/api/v1/')) return apiOrigin + raw;
            if (raw.startsWith('api/v1/')) return apiOrigin + '/' + raw;

            if (raw.startsWith('/uploads/') || raw.startsWith('uploads/')) {
                const key = raw.replace(/^\/?uploads\//, '').split('?')[0];
                const query = raw.includes('?') ? '?' + raw.split('?').slice(1).join('?') : '';
                return `${apiMediaBase}/file/${key.split('/').map(encodeURIComponent).join('/')}${query}`;
            }

            if (raw.startsWith('/')) return apiOrigin + raw;

            const parsed = new URL(raw, apiOrigin + '/');

            // Old/public upload URLs on the website host must be rerouted through
            // the API media streamer, because /uploads on the frontend host can
            // return the website HTML instead of the file in the mobile app.
            if (parsed.pathname.startsWith('/uploads/')) {
                const key = parsed.pathname.slice('/uploads/'.length);
                return `${apiMediaBase}/file/${key.split('/').map(encodeURIComponent).join('/')}${parsed.search || ''}`;
            }

            // Any localhost/WebView URL accidentally saved by the web build should
            // also be resolved against the real backend.
            if (
                parsed.hostname === 'localhost' ||
                parsed.hostname === '127.0.0.1' ||
                parsed.protocol === 'capacitor:'
            ) {
                if (parsed.pathname.startsWith('/api/v1/')) return apiOrigin + parsed.pathname + parsed.search;
                if (parsed.pathname.startsWith('/uploads/')) {
                    const key = parsed.pathname.slice('/uploads/'.length);
                    return `${apiMediaBase}/file/${key.split('/').map(encodeURIComponent).join('/')}${parsed.search || ''}`;
                }
                return apiOrigin + parsed.pathname + parsed.search;
            }

            return parsed.href;
        } catch (_) {
            return raw;
        }
    };

    const directUrl =
        media.url ||
        media.public_url ||
        media.publicUrl ||
        media.signed_url ||
        media.signedUrl ||
        media.media_url ||
        media.mediaUrl ||
        '';

    if (directUrl) {
        const resolved = toBackendMediaUrl(directUrl);
        if (resolved) return resolved;
    }

    if (media.storage_key || media.storageKey) {
        const key = String(media.storage_key || media.storageKey)
            .replace(/\\/g, '/')
            .replace(/^\/?uploads\//, '')
            .replace(/^\/+/, '');

        if (key) {
            return `${apiMediaBase}/file/${key.split('/').map(encodeURIComponent).join('/')}`;
        }
    }

    const mediaId = media.id || media.media_id || media.mediaId || media.media_asset_id || media.mediaAssetId || '';
    if (mediaId) {
        return `${apiMediaBase}/asset/${encodeURIComponent(mediaId)}`;
    }

    return '';
}


/* =========================================================
   POSTS
========================================================= */

function getPostAuthorName(post) {
    return (
        post?.display_name ||
        post?.author_display_name ||
        post?.username ||
        post?.author_username ||
        post?.author?.display_name ||
        post?.author?.username ||
        'Cirklebook User'
    );
}



function normalizeSavedPostBackground(value) {
    const allowed = new Set([
        'linear-gradient(135deg,#1877f2,#7b2ff7)',
        'linear-gradient(135deg,#f00078,#7b2ff7)',
        'linear-gradient(135deg,#ff7a18,#af002d)',
        'linear-gradient(135deg,#11998e,#38ef7d)',
        '#111827',
        '#b91c1c',
        '#6d28d9'
    ]);
    const bg = typeof value === 'string' ? value.trim() : '';
    return allowed.has(bg) ? bg : '';
}

function extractSinglePost(result) {
    const candidates = [
        result?.data?.post,
        result?.post,
        result?.data
    ];

    for (const candidate of candidates) {
        if (candidate && !Array.isArray(candidate) && typeof candidate === 'object' && candidate.id) {
            return candidate;
        }
    }

    return null;
}

async function hydrateSharedPost(post) {
    const firstSharedPostId = post?.shared_post_id || post?.sharedPostId || '';
    if (!firstSharedPostId) {
        return post;
    }

    let currentId = String(firstSharedPostId);
    let originalPost = null;
    const seen = new Set();

    try {
        for (let depth = 0; depth < 12 && currentId && !seen.has(currentId); depth++) {
            seen.add(currentId);
            const result = await apiRequest(ROUTES.post(currentId));
            const candidate = extractSinglePost(result);
            if (!candidate) break;

            originalPost = candidate;
            const nextId = candidate?.shared_post_id || candidate?.sharedPostId || '';
            if (!nextId) break;
            currentId = String(nextId);
        }

        if (originalPost) {
            return {
                ...post,
                original_post: originalPost
            };
        }
    } catch (error) {
        console.warn('SHARED POST LOAD:', firstSharedPostId, error?.message || error);
    }

    return post;
}

async function hydrateSharedPosts(posts) {
    if (!Array.isArray(posts) || posts.length === 0) {
        return [];
    }

    return Promise.all(posts.map(hydrateSharedPost));
}

function renderSharedOriginalPost(originalPost) {
    if (!originalPost?.id) {
        return `
            <div style="margin:0 12px 12px;padding:18px;border:1px solid #ddd;border-radius:10px;color:#65676b;">
                Shared post is unavailable.
            </div>
        `;
    }

    const originalName = getPostAuthorName(originalPost);
    const originalMedia = Array.isArray(originalPost?.media)
        ? originalPost.media
        : [];
    let originalMediaHtml = '';

    for (const item of originalMedia) {
        const url = buildMediaUrl(item);
        if (!url) continue;

        if (item.media_type === 'video') {
            originalMediaHtml += `
                <div class="secure-video-shell">
                    <video src="${escapeHtml(url)}" controls preload="metadata" playsinline></video>
                </div>
            `;
        } else {
            originalMediaHtml += `
                <img src="${escapeHtml(url)}" alt="Shared post media" loading="lazy">
            `;
        }
    }

    const originalBg = normalizeSavedPostBackground(originalPost.background);
    const originalBody = originalPost.body
        ? `
            <div class="post-body${originalBg ? ' has-post-background' : ''}"
                 ${originalBg ? `style="background:${escapeHtml(originalBg)};color:#fff;min-height:180px;padding:0;position:relative;text-align:center;font-size:21px;font-weight:700;line-height:1.35;box-sizing:border-box;white-space:pre-wrap;overflow-wrap:anywhere"` : 'style="padding:12px 16px;"'}>
                ${originalBg ? `<span class="cb-centered-post-text">${escapeHtml(originalPost.body)}</span>` : escapeHtml(originalPost.body)}
            </div>
        `
        : '';

    return `
        <div class="cb-shared-post-card" style="margin:0 12px 12px;border:1px solid #ccd0d5;border-radius:10px;overflow:hidden;background:#fff;">
            <div style="padding:12px 16px;border-bottom:1px solid #eee;">
                <strong>${escapeHtml(originalName)}</strong>
                <div style="font-size:12px;color:#65676b;margin-top:2px;">Original post</div>
            </div>
            ${originalBody}
            ${originalMediaHtml ? `
                <div class="post-media ${originalMedia.length > 1 ? 'post-media-grid' : ''} layout-${escapeHtml(originalPost.media_layout||originalPost.mediaLayout||'classic')}" data-media-count="${originalMedia.length}">
                    ${originalMediaHtml}
                </div>
            ` : ''}
        </div>
    `;
}

function renderPost(post) {
    const postId =
        post?.id;

    if (!postId) {
        return '';
    }

    const name =
        getPostAuthorName(post);

    const currentUserId=String(state.currentUser?.id||state.currentUser?.user_id||state.currentUser?.userId||'');
    const authorUserId=String(post?.author_user_id||post?.user_id||post?.author?.id||'');
    const canManage=Boolean(currentUserId&&authorUserId&&currentUserId===authorUserId);

    const initial =
        String(name)
            .charAt(0)
            .toUpperCase();

    const authorAvatarMediaId=post?.profile_media_id||post?.profileMediaId||post?.author_profile_media_id||'';
    const authorAvatarUrl=post?.avatar_url||post?.avatarUrl||(authorAvatarMediaId?`${API_BASE_URL}/media/asset/${encodeURIComponent(authorAvatarMediaId)}`:'');

    const media =
        Array.isArray(post?.media)
            ? post.media
            : [];

    const isPagePost = Boolean(
        post?.page_id ||
        post?.pageId ||
        post?.page?.id ||
        post?.author_type === 'page' ||
        post?.authorType === 'page'
    );

    const pageMediaHeight = media.length > 1 ? '260px' : '360px';
    const pageMediaItemStyle = isPagePost
        ? ` style="display:block!important;width:100%!important;height:${pageMediaHeight}!important;min-height:0!important;max-height:${pageMediaHeight}!important;object-fit:${media.length > 1 ? 'cover' : 'contain'}!important;margin:0!important;background:#000!important;position:relative!important;inset:auto!important;transform:none!important"`
        : '';

    const pageMediaContainerStyle = !isPagePost
        ? ''
        : media.length > 1
            ? ' style="display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;position:relative!important;clear:both!important;width:100%!important;height:auto!important;max-height:522px!important;overflow:hidden!important;margin:0!important;transform:none!important;background:#000!important;z-index:1!important"'
            : ' style="display:flex!important;align-items:center!important;justify-content:center!important;position:relative!important;clear:both!important;width:100%!important;height:360px!important;min-height:360px!important;max-height:360px!important;overflow:hidden!important;margin:0!important;transform:none!important;background:#000!important;z-index:1!important"';

    const pageHeaderStyle = isPagePost
        ? 'position:relative!important;display:flex!important;box-sizing:border-box!important;width:100%!important;min-height:64px!important;height:auto!important;padding:12px 16px!important;margin:0!important;transform:none!important;background:#fff!important;z-index:2!important'
        : 'position:relative';

    let mediaHtml = '';

    for (
        const item
        of media
    ) {
        const url =
            buildMediaUrl(item);

        if (!url) {
            continue;
        }

        if (
            item.media_type ===
            'video'
        ) {
            mediaHtml += `
                <div class="secure-video-shell"${isPagePost ? ` style="display:block!important;width:100%!important;height:${pageMediaHeight}!important;max-height:${pageMediaHeight}!important;overflow:hidden!important;margin:0!important"` : ''}>
                    <video
                        src="${escapeHtml(url)}"
                        controls
                        preload="metadata"
                        playsinline
                        ${pageMediaItemStyle}
                    ></video>
                </div>
            `;
        } else {
            mediaHtml += `
                <img
                    src="${escapeHtml(url)}"
                    alt="Post media"
                    loading="lazy"
                    ${pageMediaItemStyle}
                >
            `;
        }
    }

    const sharedPostId = post?.shared_post_id || post?.sharedPostId || '';
    const sharedHtml = sharedPostId
        ? renderSharedOriginalPost(post?.original_post || null)
        : '';

    return `
        <article
            class="card post${isPagePost ? ' cb-page-post' : ''}"
            ${isPagePost ? 'style="display:block!important;position:relative!important;overflow:hidden!important;background:#fff!important"' : ''}
            data-post="${escapeHtml(postId)}"
            data-author-id="${escapeHtml(
                post?.author_user_id ||
                post?.user_id ||
                post?.author?.id ||
                ''
            )}"
        >

            <div class="post-header" style="${pageHeaderStyle}">

                <span class="avatar" style="position:relative!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;flex:0 0 40px!important;width:40px!important;height:40px!important;min-width:40px!important;min-height:40px!important;max-width:40px!important;max-height:40px!important;border-radius:50%!important;overflow:hidden!important">
                    ${authorAvatarUrl?`<img src="${escapeHtml(authorAvatarUrl)}" alt="" onerror="this.remove()" style="position:static!important;display:block!important;width:40px!important;height:40px!important;min-width:40px!important;min-height:40px!important;max-width:40px!important;max-height:40px!important;object-fit:cover!important;border-radius:50%!important;margin:0!important;transform:none!important">`:`${escapeHtml(initial)}`}
                </span>

                <div class="post-user">

                    <div class="post-name">
                        ${escapeHtml(name)}
                    </div>

                    <div class="post-time">
                        ${escapeHtml(
                            formatDate(
                                post.created_at
                            )
                        )}
                    </div>

                </div>

                <button type="button" class="cb-post-menu-trigger" data-post-menu-trigger="${escapeHtml(postId)}" aria-label="Post options">•••</button>
                <div class="cb-post-menu hidden" data-post-menu="${escapeHtml(postId)}">
                    <button type="button" data-post-option="pin" data-post-id="${escapeHtml(postId)}">📌 <span>Pin Post</span></button>
                    <button type="button" data-post-option="save" data-post-id="${escapeHtml(postId)}">🔖 <span>${state.savedPosts.has(String(postId))?'Remove from saved':'Save Post'}</span></button>
                    <button type="button" data-post-option="copy" data-post-id="${escapeHtml(postId)}">🔗 <span>Copy link</span></button>
                    ${canManage?'':`<button type="button" data-post-option="report" data-post-id="${escapeHtml(postId)}">⚠️ <span>Report Post</span></button>`}
                    ${canManage?`<button type="button" data-post-option="edit" data-post-id="${escapeHtml(postId)}">✏️ <span>Edit Post</span></button><button type="button" class="danger" data-post-option="delete" data-post-id="${escapeHtml(postId)}">🗑️ <span>Delete Post</span></button>`:''}
                </div>

            </div>

            ${sharedPostId ? `
                <div style="padding:0 16px 10px;color:#65676b;font-size:13px;">
                    Shared a post
                </div>
            ` : ''}

            ${sharedHtml}

            ${
                (!sharedPostId && post.body)
                    ? (() => {
                        const savedBg = normalizeSavedPostBackground(post.background);
                        const bgStyle = savedBg
                            ? ` style="background:${escapeHtml(savedBg)};color:#fff;min-height:220px;padding:0;position:relative;text-align:center;font-size:24px;font-weight:700;line-height:1.35;border-radius:8px;margin:0 12px 12px;box-sizing:border-box;white-space:pre-wrap;overflow-wrap:anywhere"`
                            : '';
                        return `
                            <div class="post-body${savedBg ? ' has-post-background' : ''}"${bgStyle}>
                                ${savedBg ? `<span class="cb-centered-post-text">${escapeHtml(post.body)}</span>` : escapeHtml(post.body)}
                            </div>
                        `;
                    })()
                    : ''
            }

            ${
                (!sharedPostId && mediaHtml)
                    ? `
                        <div class="post-media ${media.length>1?'post-media-grid':''} layout-${escapeHtml(post.media_layout||post.mediaLayout||'classic')}" data-media-count="${media.length}"${pageMediaContainerStyle}>
                            ${mediaHtml}
                        </div>
                    `
                    : ''
            }

            <div class="cb-post-boost-row"><button type="button" data-post-option="boost" data-post-id="${escapeHtml(postId)}">Boost Post</button></div>
            <div class="cb-post-social-summary" data-social-summary="${escapeHtml(postId)}">
                <button type="button" data-show-reactions="${escapeHtml(postId)}">0 reactions</button>
                <span><span data-comment-count="${escapeHtml(postId)}">0 comments</span> · <span data-share-count="${escapeHtml(postId)}">0 shares</span> · <span data-view-count="${escapeHtml(postId)}">0 views</span></span>
            </div>
            <div class="post-actions cb-standard-post-actions">

                <button
                    type="button"
                    class="like-button"
                    data-action="like"
                    data-post-id="${escapeHtml(postId)}"
                >
                    Like
                </button>

                <button
                    type="button"
                    class="comment-button"
                    data-action="comment"
                    data-post-id="${escapeHtml(postId)}"
                >
                    Comment
                </button>

                <button
                    type="button"
                    class="report-button"
                    data-action="report"
                    data-post-id="${escapeHtml(postId)}"
                >
                    Report
                </button>

                <button
                    type="button"
                    class="share-button"
                    data-action="share"
                    data-post-id="${escapeHtml(postId)}"
                >
                    Share
                </button>

            </div>

            <div
                class="comments-area hidden"
                data-comments-area="${escapeHtml(postId)}"
            >

                <div
                    data-comment-list="${escapeHtml(postId)}"
                ></div>

                <div
                    style="
                        display:flex;
                        gap:8px;
                        padding:10px 16px 14px;
                    "
                >

                    <input
                        type="text"
                        data-comment-input="${escapeHtml(postId)}"
                        placeholder="Write a comment..."
                        style="
                            flex:1;
                            padding:10px 14px;
                            border:1px solid #ddd;
                            border-radius:20px;
                            outline:none;
                        "
                    >

                    <button
                        type="button"
                        data-action="send-comment"
                        data-post-id="${escapeHtml(postId)}"
                        style="
                            padding:8px 15px;
                            border-radius:18px;
                            background:#1877f2;
                            color:white;
                        "
                    >
                        Send
                    </button>

                </div>

                <div class="cb-comment-tools" data-comment-tools="${escapeHtml(postId)}">
                    <button type="button" data-comment-emoji="${escapeHtml(postId)}" title="Insert emoji">😊</button>
                    <button type="button" data-comment-media="${escapeHtml(postId)}" title="Attach photo or video">📷 Photo/Video</button>
                    <button type="button" data-comment-sticker="${escapeHtml(postId)}" title="Comment with a sticker">🏷️ Sticker</button>
                    <input type="file" accept="image/*,video/*" data-comment-file="${escapeHtml(postId)}" hidden>
                </div>

            </div>

        </article>
    `;
}




/* =========================================================
   SECURE ADAPTIVE VIDEO PLAYBACK
========================================================= */

let cbHlsLoaderPromise = null;

function loadHlsLibrary() {
    if (window.Hls) return Promise.resolve(window.Hls);
    if (cbHlsLoaderPromise) return cbHlsLoaderPromise;

    cbHlsLoaderPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/hls.js@1/dist/hls.min.js';
        script.async = true;
        script.onload = () => resolve(window.Hls);
        script.onerror = () => reject(new Error('Unable to load adaptive video player.'));
        document.head.appendChild(script);
    });

    return cbHlsLoaderPromise;
}

async function waitForSecureVideo(mediaId, statusNode) {
    for (let attempt = 0; attempt < 180; attempt++) {
        try {
            const result = await apiRequest(`/secure-media/${mediaId}/status`);
            const data = result?.data || result;
            if (data?.status === 'READY') return data;
            if (data?.status === 'FAILED') throw new Error('Video processing failed.');
            if (statusNode) statusNode.textContent = 'Preparing adaptive video…';
        } catch (error) {
            if (error?.status === 404 && attempt < 3) {
                // Processing metadata can appear just after the post becomes visible.
            } else if (error?.status === 404) {
                throw new Error('Secure video is not ready yet.');
            } else {
                throw error;
            }
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    throw new Error('Video processing is taking longer than expected.');
}

async function attachSecureVideo(video) {
    if (!video || video.dataset.secureBound === '1') return;
    const mediaId = video.dataset.secureMediaId;
    if (!mediaId) return;
    video.dataset.secureBound = '1';

    const statusNode = document.querySelector(`[data-secure-status="${CSS.escape(mediaId)}"]`);

    try {
        await waitForSecureVideo(mediaId, statusNode);
        const tokenResult = await apiRequest(`/secure-media/${mediaId}/token`, { method: 'POST', body: JSON.stringify({}) });
        const tokenData = tokenResult?.data || tokenResult;
        const master = tokenData?.master;
        if (!master) throw new Error('Secure stream URL was not returned.');
        const streamUrl = `${API_BASE_URL.replace(/\/api\/v1$/, '')}${master}`;

        if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = streamUrl;
        } else {
            const Hls = await loadHlsLibrary();
            if (!Hls || !Hls.isSupported()) throw new Error('Adaptive streaming is not supported in this browser.');
            const hls = new Hls({ enableWorker: true, lowLatencyMode: false });
            hls.loadSource(streamUrl);
            hls.attachMedia(video);
            video._cirklebookHls = hls;
        }

        if (statusNode) statusNode.remove();
    } catch (error) {
        console.error('SECURE VIDEO:', error);
        if (statusNode) statusNode.textContent = error?.message || 'Video is temporarily unavailable.';
    }
}

function initializeSecureVideoPlayers() {
    document.querySelectorAll('video[data-secure-media-id]').forEach(attachSecureVideo);
}


/* =========================================================
   FEED
========================================================= */

function extractPosts(result) {
    const possibilities = [
        result?.data?.posts,
        result?.posts,
        result?.data?.items,
        result?.items,
        result?.data
    ];

    for (
        const candidate
        of possibilities
    ) {
        if (
            Array.isArray(candidate)
        ) {
            return candidate;
        }
    }

    return [];
}


async function loadFeed() {
    if (
        state.loadingFeed
    ) {
        return;
    }

    state.loadingFeed =
        true;

    if (dom.feedMessage) {
        dom.feedMessage.textContent =
            'Loading feed...';

        dom.feedMessage
            .classList
            .remove('hidden');
    }

    if (dom.feedContainer) {
        dom.feedContainer.innerHTML =
            '';
    }

    try {
        const result =
            await apiRequest(
                `${ROUTES.feed}?limit=20&offset=0`
            );

        const posts =
            await hydrateSharedPosts(
                extractPosts(
                    result
                )
            );

        if (
            posts.length === 0
        ) {
            dom.feedMessage.textContent =
                'No posts yet. Create your first post.';

            return;
        }

        dom.feedMessage
            ?.classList
            .add('hidden');

        dom.feedContainer
            ?.insertAdjacentHTML(
                'beforeend',
                posts
                    .map(renderPost)
                    .join('')
            );

        initializeSecureVideoPlayers();

    } catch (error) {
        console.error(
            'FEED ERROR:',
            error
        );

        if (dom.feedMessage) {
            dom.feedMessage.textContent =
                error.message ||
                'Unable to load feed.';
        }

    } finally {
        state.loadingFeed =
            false;
    }
}


/* =========================================================
   LIKE / UNLIKE
========================================================= */

async function toggleLike(
    postId,
    button
) {
    if (
        !postId ||
        !button
    ) {
        return;
    }

    button.disabled =
        true;

    const alreadyLiked =
        state.likedPosts.has(
            postId
        );

    try {
        if (alreadyLiked) {
            await apiRequest(
                ROUTES.reactions(postId),
                {
                    method: 'DELETE'
                }
            );

            state.likedPosts.delete(
                postId
            );

            button.textContent =
                'Like';

            button.classList.remove(
                'active'
            );

            showToast(
                'Like removed'
            );

        } else {
            await apiRequest(
                ROUTES.reactions(postId),
                {
                    method: 'POST',

                    body:
                        JSON.stringify({
                            reactionType:
                                'like'
                        })
                }
            );

            state.likedPosts.add(
                postId
            );

            button.textContent =
                'Liked';

            button.classList.add(
                'active'
            );

            showToast(
                'Post liked'
            );
        }

    } catch (error) {
        console.error(
            'REACTION ERROR:',
            error
        );

        showToast(
            error.message ||
            'Unable to react.'
        );

    } finally {
        button.disabled =
            false;
    }
}


/* =========================================================
   COMMENT
========================================================= */

function extractComments(result) {
    const possibilities = [
        result?.data?.comments,
        result?.comments,
        result?.data?.items,
        result?.items,
        result?.data
    ];

    for (
        const item
        of possibilities
    ) {
        if (
            Array.isArray(item)
        ) {
            return item;
        }
    }

    return [];
}


function renderComment(comment) {
    const name =
        comment?.display_name ||
        comment?.author_display_name ||
        comment?.username ||
        comment?.author_username ||
        comment?.author?.username ||
        'User';

    const body =
        comment?.body ||
        '';

    return `
        <div
            style="
                padding:5px 16px;
            "
        >
            <div
                style="
                    display:inline-block;
                    background:#f0f2f5;
                    padding:8px 12px;
                    border-radius:14px;
                "
            >
                <strong>
                    ${escapeHtml(name)}
                </strong>

                <div>
                    ${escapeHtml(body)}
                </div>
            </div>
        </div>
    `;
}


async function loadComments(
    postId
) {
    const list =
        document.querySelector(
            `[data-comment-list="${postId}"]`
        );

    if (!list) {
        return;
    }

    list.innerHTML =
        '<div style="padding:10px 16px;">Loading comments...</div>';

    try {
        const result =
            await apiRequest(
                ROUTES.comments(postId)
            );

        const comments =
            extractComments(
                result
            );

        if (
            comments.length === 0
        ) {
            list.innerHTML =
                '<div style="padding:10px 16px;color:#65676b;">No comments yet.</div>';

            return;
        }

        list.innerHTML =
            comments
                .map(renderComment)
                .join('');

    } catch (error) {
        list.innerHTML =
            `<div style="padding:10px 16px;color:#b42318;">
                ${escapeHtml(
                    error.message
                )}
             </div>`;
    }
}


async function toggleComments(
    postId
) {
    const area =
        document.querySelector(
            `[data-comments-area="${postId}"]`
        );

    if (!area) {
        return;
    }

    const wasHidden =
        area.classList.contains(
            'hidden'
        );

    area.classList.toggle(
        'hidden'
    );

    if (wasHidden) {
        await loadComments(
            postId
        );

        const input =
            document.querySelector(
                `[data-comment-input="${postId}"]`
            );

        input?.focus();
    }
}


async function sendComment(
    postId,
    button
) {
    const input =
        document.querySelector(
            `[data-comment-input="${postId}"]`
        );

    if (!input) {
        return;
    }

    const body =
        input.value.trim();

    if (!body) {
        showToast(
            'Write a comment first'
        );

        input.focus();

        return;
    }

    button.disabled =
        true;

    input.disabled =
        true;

    try {
        await apiRequest(
            ROUTES.comments(postId),
            {
                method: 'POST',

                body:
                    JSON.stringify({
                        body
                    })
            }
        );

        input.value =
            '';

        await loadComments(
            postId
        );

        showToast(
            'Comment added'
        );

    } catch (error) {
        console.error(
            'COMMENT ERROR:',
            error
        );

        showToast(
            error.message ||
            'Unable to add comment.'
        );

    } finally {
        button.disabled =
            false;

        input.disabled =
            false;

        input.focus();
    }
}


/* =========================================================
   SHARE
========================================================= */

async function sharePost(
    postId,
    button
) {
    if (
        state.sharedPosts.has(
            postId
        )
    ) {
        showToast(
            'You already shared this post'
        );

        return;
    }

    button.disabled =
        true;

    try {
        await apiRequest(
            ROUTES.share(postId),
            {
                method: 'POST',

                body:
                    JSON.stringify({})
            }
        );

        state.sharedPosts.add(
            postId
        );

        button.textContent =
            'Shared';

        showToast(
            'Post shared'
        );

        await loadFeed();

    } catch (error) {
        console.error(
            'SHARE ERROR:',
            error
        );

        if (
            error.status === 409
        ) {
            state.sharedPosts.add(
                postId
            );

            button.textContent =
                'Shared';
        }

        showToast(
            error.message ||
            'Unable to share post.'
        );

    } finally {
        button.disabled =
            false;
    }
}


/* =========================================================
   SAVE / UNSAVE
========================================================= */

async function toggleSave(
    postId,
    button
) {
    if (
        !postId ||
        !button
    ) {
        return;
    }

    button.disabled =
        true;

    const alreadySaved =
        state.savedPosts.has(
            postId
        );

    try {
        if (alreadySaved) {
            await apiRequest(
                ROUTES.save(postId),
                {
                    method: 'DELETE'
                }
            );

            state.savedPosts.delete(
                postId
            );

            button.textContent =
                'Save';

            button.classList.remove(
                'active'
            );

            showToast(
                'Post removed from Saved'
            );

        } else {
            await apiRequest(
                ROUTES.save(postId),
                {
                    method: 'POST',

                    body:
                        JSON.stringify({})
                }
            );

            state.savedPosts.add(
                postId
            );

            button.textContent =
                'Saved';

            button.classList.add(
                'active'
            );

            showToast(
                'Post saved'
            );
        }

    } catch (error) {
        console.error(
            'SAVE ERROR:',
            error
        );

        /*
           If backend says it is already
           saved, reflect that in UI.
        */

        if (
            error.status === 409
        ) {
            state.savedPosts.add(
                postId
            );

            button.textContent =
                'Saved';

            button.classList.add(
                'active'
            );
        }

        showToast(
            error.message ||
            'Unable to save post.'
        );

    } finally {
        button.disabled =
            false;
    }
}


/* =========================================================
   FEED BUTTON HANDLER
========================================================= */

async function handleFeedClick(
    event
) {
    const button =
        event.target.closest(
            '[data-action]'
        );

    if (!button) {
        return;
    }

    const action =
        button.dataset.action;

    const postId =
        button.dataset.postId;

    if (!postId) {
        return;
    }

    if (
        action === 'like'
    ) {
        await toggleLike(
            postId,
            button
        );

        return;
    }

    if (
        action === 'comment'
    ) {
        await toggleComments(
            postId
        );

        return;
    }

    if (
        action ===
        'send-comment'
    ) {
        await sendComment(
            postId,
            button
        );

        return;
    }

    if (
        action === 'share'
    ) {
        await sharePost(
            postId,
            button
        );

        return;
    }

    if (
        action === 'save'
    ) {
        await toggleSave(
            postId,
            button
        );
    }
}


/* =========================================================
   COMMENT ENTER KEY
========================================================= */

async function handleFeedKeydown(
    event
) {
    const input =
        event.target.closest(
            '[data-comment-input]'
        );

    if (!input) {
        return;
    }

    if (
        event.key !== 'Enter'
    ) {
        return;
    }

    event.preventDefault();

    const postId =
        input.dataset.commentInput;

    const sendButton =
        document.querySelector(
            `[data-action="send-comment"][data-post-id="${postId}"]`
        );

    if (sendButton) {
        await sendComment(
            postId,
            sendButton
        );
    }
}


/* =========================================================
   CREATE POST MODAL
========================================================= */

function openPostModal(
    openFilePicker = false
) {
    setPostMessage('');

    const pageTarget=state.pagePostTarget?.pageId&&state.activePage?state.activePage:null;
    if(pageTarget){
        const pageName=pageTarget.name||'Page';
        const pageImage=typeof cbEntityMediaUrl==='function'?cbEntityMediaUrl({...cbLoadEntityExtra('page',pageTarget.id||pageTarget.page_id),...pageTarget},'profile'):'';
        const heading=dom.postModal?.querySelector('h1,h2,h3');if(heading)heading.textContent='Create Page Post';
        if(dom.modalUsername)dom.modalUsername.textContent=pageName;
        if(dom.modalAvatar){dom.modalAvatar.textContent=String(pageName).charAt(0).toUpperCase();dom.modalAvatar.style.backgroundImage=pageImage?`url("${pageImage}")`:'';dom.modalAvatar.style.backgroundSize=pageImage?'cover':'';}
    }else{
        const heading=dom.postModal?.querySelector('h1,h2,h3');if(heading)heading.textContent='Create Post';
        if(dom.modalUsername)dom.modalUsername.textContent=state.currentUser?.profile?.displayName||state.currentUser?.displayName||state.currentUser?.display_name||state.currentUser?.username||'Profile';
        if(dom.modalAvatar)dom.modalAvatar.style.backgroundImage='';
    }

    dom.postModal
        ?.classList
        .remove('hidden');

    document.body.style.overflow =
        'hidden';

    setTimeout(
        () => {
            if (
                openFilePicker
            ) {
                dom.mediaInput
                    ?.click();
            } else {
                dom.postBody
                    ?.focus();
            }
        },
        50
    );
}


function closePostModal() {
    dom.postModal
        ?.classList
        .add('hidden');

    document.body.style.overflow =
        '';

    resetComposer();

    // If the shared Home Create Post modal was opened from a Group/Page,
    // closing it must return the composer to normal Home-post mode.
    state.groupPostTarget = null;
    state.pagePostTarget = null;
}


/* =========================================================
   MEDIA PREVIEW
========================================================= */

function clearSelectedMedia() {
    const urls = Array.isArray(state.previewUrls) ? state.previewUrls : [];
    urls.forEach(url => { try { URL.revokeObjectURL(url); } catch (_) {} });
    if (state.previewUrl && !urls.includes(state.previewUrl)) {
        try { URL.revokeObjectURL(state.previewUrl); } catch (_) {}
    }
    state.selectedFile = null;
    state.previewUrl = null;
    state.selectedFiles = [];
    state.previewUrls = [];
    state.mediaLayout = 'classic';
    if (dom.mediaInput) dom.mediaInput.value = '';
    if (dom.mediaPreviewGrid) dom.mediaPreviewGrid.innerHTML = '';
    dom.previewBox?.classList.add('hidden');
}

function renderSelectedMediaPreview() {
    const grid = dom.mediaPreviewGrid;
    if (!grid) return;
    grid.innerHTML = '';
    const files = Array.isArray(state.selectedFiles) ? state.selectedFiles : [];
    const urls = Array.isArray(state.previewUrls) ? state.previewUrls : [];
    if (!files.length) {
        dom.previewBox?.classList.add('hidden');
        return;
    }
    dom.previewBox?.classList.remove('hidden');
    state.mediaLayout = ['classic','columns','frame'].includes(state.mediaLayout) ? state.mediaLayout : 'classic';
    dom.previewBox.querySelector('.cb-layout-chooser')?.remove();
    const chooser=document.createElement('div');
    chooser.className='cb-layout-chooser';
    chooser.innerHTML='<b>Choose a layout</b><div><button type="button" data-media-layout="classic">▱<small>Classic</small></button><button type="button" data-media-layout="columns">▥<small>Columns</small></button><button type="button" data-media-layout="frame">▦<small>Frame</small></button></div>';
    dom.previewBox.insertBefore(chooser,grid);
    chooser.querySelectorAll('[data-media-layout]').forEach(button=>{button.classList.toggle('active',button.dataset.mediaLayout===state.mediaLayout);button.onclick=()=>{state.mediaLayout=button.dataset.mediaLayout;renderSelectedMediaPreview();};});
    grid.classList.remove('layout-classic','layout-columns','layout-frame');
    grid.classList.add(`layout-${state.mediaLayout}`);
    files.forEach((file, index) => {
        const item = document.createElement('div');
        item.className = 'media-preview-item';
        const url = urls[index] || '';
        if (file.type.startsWith('video/')) {
            const v = document.createElement('video');
            v.src = url; v.controls = true; v.preload = 'metadata'; v.playsInline = true;
            item.appendChild(v);
        } else {
            const img = document.createElement('img');
            img.src = url; img.alt = 'Selected media';
            item.appendChild(img);
        }
        const remove = document.createElement('button');
        remove.type = 'button'; remove.className = 'media-preview-remove'; remove.textContent = '×';
        remove.title = 'Remove'; remove.dataset.mediaIndex = String(index);
        item.appendChild(remove);
        grid.appendChild(item);
    });
    grid.classList.toggle('single', files.length === 1);
}

function selectMedia(files) {
    const incoming = Array.from(files || []).filter(Boolean);
    if (!incoming.length) return;
    const existing = Array.isArray(state.selectedFiles) ? state.selectedFiles : [];
    const combined = [...existing, ...incoming];
    if (combined.length > 10) throw new Error('You can add up to 10 photos or videos to one post.');
    for (const file of incoming) {
        if (!(file.type.startsWith('image/') || file.type.startsWith('video/'))) {
            throw new Error('Only image or video files are allowed.');
        }
        const isVideo = file.type.startsWith('video/');
        const maxBytes = isVideo
            ? 2 * 1024 * 1024 * 1024   // 2 GB for videos/reels
            : 100 * 1024 * 1024;       // 100 MB for images
        if (file.size > maxBytes) {
            throw new Error(
                isVideo
                    ? 'Each video/reel must be 2 GB or smaller.'
                    : 'Each image must be 100 MB or smaller.'
            );
        }
    }
    state.selectedFiles = combined;
    state.previewUrls = [
        ...(Array.isArray(state.previewUrls) ? state.previewUrls : []),
        ...incoming.map(file => URL.createObjectURL(file))
    ];
    state.selectedFile = state.selectedFiles[0] || null;
    state.previewUrl = state.previewUrls[0] || null;
    renderSelectedMediaPreview();
}

function removeSelectedMedia(index) {
    const i = Number(index);
    if (!Number.isInteger(i) || i < 0 || i >= state.selectedFiles.length) return;
    const url = state.previewUrls[i];
    if (url) { try { URL.revokeObjectURL(url); } catch (_) {} }
    state.selectedFiles.splice(i, 1);
    state.previewUrls.splice(i, 1);
    state.selectedFile = state.selectedFiles[0] || null;
    state.previewUrl = state.previewUrls[0] || null;
    renderSelectedMediaPreview();
}


function resetComposer() {
    if (
        dom.postBody
    ) {
        dom.postBody.value =
            '';
    }

    if (
        dom.postVisibility
    ) {
        dom.postVisibility.value =
            'public';
    }

    setPostMessage('');

    clearSelectedMedia();
}


/* =========================================================
   MEDIA UPLOAD
========================================================= */

async function uploadMedia(file) {
    if (!file) {
        throw new Error('No media file selected.');
    }

    const formData = new FormData();
    formData.append('media', file);
    formData.append('purpose', 'post');

    const result = await apiRequest(
        ROUTES.mediaUpload,
        {
            method: 'POST',
            body: formData
        }
    );

    const media =
        result?.data?.media ||
        result?.media ||
        result?.data?.asset ||
        result?.asset ||
        result?.data ||
        null;

    if (!media?.id) {
        throw new Error(
            'Media upload succeeded but media ID was not returned.'
        );
    }

    return media;
}



async function getVideoFileDurationSeconds(file) {
    if (!file?.type?.startsWith('video/')) return 0;

    return await new Promise(resolve => {
        const url = URL.createObjectURL(file);
        const video = document.createElement('video');
        let finished = false;

        const done = value => {
            if (finished) return;
            finished = true;
            try { URL.revokeObjectURL(url); } catch (_) {}
            resolve(Number.isFinite(Number(value)) ? Number(value) : 0);
        };

        const timer = setTimeout(() => done(0), 6000);

        video.preload = 'metadata';
        video.onloadedmetadata = () => {
            clearTimeout(timer);
            done(video.duration || 0);
        };
        video.onerror = () => {
            clearTimeout(timer);
            done(0);
        };
        video.src = url;
    });
}

async function getSelectedVideoDurationSeconds(files = []) {
    const videoFile = (Array.isArray(files) ? files : [])
        .find(file => file?.type?.startsWith('video/'));
    return videoFile ? getVideoFileDurationSeconds(videoFile) : 0;
}

async function validateReelVideoDurations(files = []) {
    const videoFiles = (Array.isArray(files) ? files : [])
        .filter(file => file?.type?.startsWith('video/'));

    for (const file of videoFiles) {
        const duration = await getVideoFileDurationSeconds(file);
        if (!duration) {
            throw new Error('Unable to read this video duration. Please choose another video and try again.');
        }
        if (duration > 60.05) {
            throw new Error('Reels can be a maximum of 60 seconds. Long video upload is temporarily unavailable.');
        }
    }

    return true;
}

/* =========================================================
   CREATE POST
========================================================= */

async function publishPost(options = {}) {
    if (state.publishing) return;
    const groupPostTarget = state.groupPostTarget || null;
    const pagePostTarget = state.pagePostTarget || null;
    const body = dom.postBody?.value.trim() || '';
    const visibility = dom.postVisibility?.value || 'public';
    const files = Array.isArray(state.selectedFiles) ? state.selectedFiles : [];
    const hasVideoFile = files.some(file => file?.type?.startsWith('video/'));

    if (hasVideoFile) {
        try {
            await validateReelVideoDurations(files);
        } catch (error) {
            const message = error?.message || 'Reels can be a maximum of 60 seconds.';
            setPostMessage(message);
            showToast(message);
            return false;
        }
    }

    if (hasVideoFile && !options.reelApproved && typeof window.CirklebookOpenReelEditor === 'function') {
        window.CirklebookOpenReelEditor();
        return;
    }
    if (!body && files.length === 0) {
        setPostMessage('Write something or add a photo/video.');
        return;
    }
    state.publishing = true;
    dom.publishButton.disabled = true;
    dom.publishButton.textContent = 'Posting...';
    setPostMessage('');
    try {
        const uploadedMedia = [];
        for (let i = 0; i < files.length; i++) {
            dom.publishButton.textContent = files.length > 1 ? `Uploading ${i + 1}/${files.length}...` : 'Uploading...';
            uploadedMedia.push(await uploadMedia(files[i]));
        }
        const hasVideo = uploadedMedia.some(m => (m?.media_type || m?.mediaType) === 'video');
        const hasImage = uploadedMedia.some(m => (m?.media_type || m?.mediaType) === 'image');

        // Current launch policy: video publishing is Reels-only.
        // Every selected video is pre-validated at 60 seconds maximum.
        // Long-video publishing can be re-enabled in a later release.
        const isReelPublish =
            hasVideo &&
            (!!options.reelApproved || !!state.reelDraftSettings);

        let postType = 'text';
        if (uploadedMedia.length) {
            postType = (hasVideo && !hasImage)
                ? 'reel'
                : 'image';
        }
        const selectedBackground = normalizeSavedPostBackground(
            dom.postBody?.dataset?.postBackground || ''
        );
        const payload = {
            postType,
            body,
            visibility,
            status: 'published',
            background: selectedBackground || null
        };
        payload.mediaLayout = state.mediaLayout || 'classic';
        const ids = uploadedMedia.map(m => m?.id).filter(Boolean);
        if (ids.length) payload.mediaAssetIds = ids;
        dom.publishButton.textContent = 'Publishing...';
        // Reuse the exact Home composer for Group/Page posting.
        if(pagePostTarget?.pageId){
            payload.pageId = pagePostTarget.pageId;
        }

        const createRoute = groupPostTarget?.path
            ? `${groupPostTarget.path}/posts`
            : ROUTES.posts;

        let createdPost;
        try {
            createdPost = await apiRequest(createRoute, { method: 'POST', body: JSON.stringify(payload) });
        } catch (error) {
            // Older backends/group routes may not yet allow postType="reel".
            // Retry as a normal video without changing the Home composer experience.
            if (postType === 'reel' && [400,409,422].includes(Number(error?.status))) {
                payload.postType = 'video';
                createdPost = await apiRequest(createRoute, { method: 'POST', body: JSON.stringify(payload) });
            } else {
                throw error;
            }
        }
        if (isReelPublish) {
            const reelPostId = createdPost?.data?.post?.id || createdPost?.data?.id || createdPost?.post?.id || createdPost?.id || '';
            if (reelPostId) {
                try {
                    const key='cirklebook_reel_post_ids_v1';
                    const ids=JSON.parse(localStorage.getItem(key)||'[]');
                    const next=[String(reelPostId), ...(Array.isArray(ids)?ids:[]).map(String).filter(x=>x!==String(reelPostId))].slice(0,500);
                    localStorage.setItem(key,JSON.stringify(next));
                } catch (_) {}
            }
        }
        const reelSettings = state.reelDraftSettings || null;
        if (isReelPublish && reelSettings && typeof window.CirklebookAfterReelPublished === 'function') {
            await window.CirklebookAfterReelPublished(createdPost, uploadedMedia, reelSettings);
        }
        state.reelDraftSettings = null;

        if (groupPostTarget?.path) {
            closePostModal();
            if (typeof groupPostTarget.reload === 'function') await groupPostTarget.reload();
            showToast(hasVideo ? 'Video posted to group' : 'Posted to group');
        } else if (pagePostTarget?.pageId) {
            closePostModal();
            if (typeof pagePostTarget.reload === 'function') await pagePostTarget.reload();
            showToast(hasVideo ? 'Video posted to Page' : 'Posted to Page');
        } else {
            closePostModal();
            await loadFeed();
            showToast(hasVideo ? (isReelPublish ? 'Reel published' : 'Video published') : 'Post published');
        }
        return true;
    } catch (error) {
        console.error('CREATE POST:', error);
        const msg = error?.message === 'Failed to fetch'
            ? 'Media upload failed. If this is a large file, check the upload limit or server response and try again.'
            : (error?.message || 'Unable to publish post.');
        setPostMessage(msg);
        showToast(msg);
        return false;
    } finally {
        state.publishing = false;
        dom.publishButton.disabled = false;
        dom.publishButton.textContent = 'Post';
    }
}


/* =========================================================
   ACCOUNT MENU
========================================================= */

function toggleAccountMenu(
    event
) {
    event.stopPropagation();

    dom.accountMenu
        ?.classList
        .toggle('hidden');
}


/* =========================================================
   LOGOUT
========================================================= */

async function logoutUser() {
    try {
        await apiRequest(
            ROUTES.logout,
            {
                method: 'POST',
                body:
                    JSON.stringify({})
            }
        );
    } catch (_) {
        /*
          Local logout should still work.
        */
    }

    clearAccessToken();

    state.currentUser =
        null;

    state.likedPosts.clear();
    state.savedPosts.clear();
    state.sharedPosts.clear();

    renderCurrentUser();

    dom.accountMenu
        ?.classList
        .add('hidden');

    dom.mainApp
        ?.classList
        .add('hidden');

    dom.loginScreen
        ?.classList
        .remove('hidden');

    if (
        dom.loginIdentifier
    ) {
        dom.loginIdentifier.value =
            '';
    }

    if (
        dom.loginPassword
    ) {
        dom.loginPassword.value =
            '';
    }

    if (
        dom.feedContainer
    ) {
        dom.feedContainer.innerHTML =
            '';
    }

    setLoginMessage('');
}


/* =========================================================
   EVENTS
========================================================= */

function bindEvents() {
    dom.loginForm
        ?.addEventListener(
            'submit',
            loginUser
        );


    dom.openComposerButton
        ?.addEventListener(
            'click',
            () =>
                openPostModal(
                    false
                )
        );


    dom.photoVideoButton
        ?.addEventListener(
            'click',
            () =>
                openPostModal(
                    true
                )
        );


    dom.closeModalButton
        ?.addEventListener(
            'click',
            closePostModal
        );


    dom.modalMediaButton
        ?.addEventListener(
            'click',
            () =>
                dom.mediaInput
                    ?.click()
        );


    dom.mediaInput
        ?.addEventListener(
            'change',
            (event) => {
                const files = Array.from(event.target.files || []);
                if (!files.length) return;
                try {
                    selectMedia(files);
                    setPostMessage('');
                } catch (error) {
                    setPostMessage(error.message);
                } finally {
                    // Allow choosing the same file again later.
                    event.target.value = '';
                }
            }
        );

    dom.mediaPreviewGrid
        ?.addEventListener('click', (event) => {
            const button = event.target.closest('[data-media-index]');
            if (button) removeSelectedMedia(button.dataset.mediaIndex);
        });


    dom.publishButton
        ?.addEventListener(
            'click',
            publishPost
        );


    dom.feedContainer
        ?.addEventListener(
            'click',
            handleFeedClick
        );


    dom.feedContainer
        ?.addEventListener(
            'keydown',
            handleFeedKeydown
        );


    dom.profileButton
        ?.addEventListener(
            'click',
            toggleAccountMenu
        );


    dom.logoutButton
        ?.addEventListener(
            'click',
            logoutUser
        );


    dom.postModal
        ?.addEventListener(
            'click',
            (event) => {
                if (
                    event.target ===
                    dom.postModal
                ) {
                    closePostModal();
                }
            }
        );


    document.addEventListener(
        'click',
        (event) => {
            if (
                !dom.accountMenu ||
                !dom.profileButton
            ) {
                return;
            }

            if (
                dom.accountMenu.contains(
                    event.target
                ) ||
                dom.profileButton.contains(
                    event.target
                )
            ) {
                return;
            }

            dom.accountMenu
                .classList
                .add('hidden');
        }
    );
}


/* =========================================================
   START
========================================================= */

async function startApp() {
    console.log(
        'CIRKLEBOOK CORE FRONTEND READY'
    );

    bindEvents();

    renderCurrentUser();

    await restoreSession();
}


document.addEventListener(
    'DOMContentLoaded',
    startApp
);
/* =========================================================
   CIRKLEBOOK FRIENDS MODULE
========================================================= */

(function setupFriendsModule() {

    function findFriendsButton() {
        return [...document.querySelectorAll('.sidebar-link')]
            .find(button =>
                button.textContent
                    .toLowerCase()
                    .includes('friends')
            );
    }

    function getFriendName(item) {
        const user =
            item.friend ||
            item.user ||
            item.requester ||
            item.sender ||
            item.recipient ||
            item.receiver ||
            item;

        return (
            user.display_name ||
            user.displayName ||
            user.name ||
            user.username ||
            item.username ||
            'Cirklebook User'
        );
    }

    function getFriendUserId(item) {
        return (
            item.friend_user_id ||
            item.friendUserId ||
            item.user_id ||
            item.userId ||
            item.friend?.id ||
            item.user?.id ||
            item.id
        );
    }

    function getRequestId(item) {
        return (
            item.request_id ||
            item.requestId ||
            item.friend_request_id ||
            item.friendRequestId ||
            item.id
        );
    }

    function findArrayByKeys(value, keys) {
        if (!value) {
            return [];
        }

        if (Array.isArray(value)) {
            return value;
        }

        if (typeof value !== 'object') {
            return [];
        }

        for (const key of keys) {
            if (Array.isArray(value[key])) {
                return value[key];
            }
        }

        for (const child of Object.values(value)) {
            if (child && typeof child === 'object') {
                const found =
                    findArrayByKeys(child, keys);

                if (found.length) {
                    return found;
                }
            }
        }

        return [];
    }

    function ensureFriendsUI() {

        if (
            document.getElementById(
                'friendsOverlay'
            )
        ) {
            return;
        }

        const overlay =
            document.createElement('div');

        overlay.id =
            'friendsOverlay';

        overlay.className =
            'hidden';

        overlay.innerHTML = `
            <div class="friends-window">

                <div class="friends-header">

                    <h2>Friends</h2>

                    <button
                        type="button"
                        id="closeFriendsPage"
                        class="friends-close"
                    >
                        ×
                    </button>

                </div>

                <div class="friends-tabs">

                    <button
                        type="button"
                        data-friend-tab="friends"
                        class="friends-tab active"
                    >
                        Friends
                    </button>

                    <button
                        type="button"
                        data-friend-tab="incoming"
                        class="friends-tab"
                    >
                        Requests
                    </button>

                    <button
                        type="button"
                        data-friend-tab="outgoing"
                        class="friends-tab"
                    >
                        Sent
                    </button>

                    <button
                        type="button"
                        data-friend-tab="add"
                        class="friends-tab"
                    >
                        Add Friend
                    </button>

                </div>

                <div
                    id="friendsContent"
                    class="friends-content"
                >
                    Loading...
                </div>

            </div>
        `;

        document.body.appendChild(
            overlay
        );

        const style =
            document.createElement('style');

        style.textContent = `

            #friendsOverlay {
                position: fixed;
                inset: 0;
                z-index: 99999;
                background:
                    rgba(0,0,0,.45);
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
            }

            #friendsOverlay.hidden {
                display: none;
            }

            .friends-window {
                width: min(760px, 96vw);
                max-height: 88vh;
                background: #fff;
                border-radius: 14px;
                box-shadow:
                    0 12px 40px
                    rgba(0,0,0,.25);
                overflow: hidden;
            }

            .friends-header {
                height: 64px;
                display: flex;
                align-items: center;
                justify-content:
                    space-between;
                padding: 0 20px;
                border-bottom:
                    1px solid #ddd;
            }

            .friends-header h2 {
                margin: 0;
                font-size: 24px;
            }

            .friends-close {
                width: 38px;
                height: 38px;
                border: 0;
                border-radius: 50%;
                font-size: 25px;
                cursor: pointer;
                background: #e4e6eb;
            }

            .friends-tabs {
                display: flex;
                gap: 6px;
                padding: 12px 16px;
                border-bottom:
                    1px solid #ddd;
                overflow-x: auto;
            }

            .friends-tab {
                border: 0;
                background: #e4e6eb;
                padding: 10px 14px;
                border-radius: 8px;
                cursor: pointer;
                white-space: nowrap;
                font-weight: 600;
            }

            .friends-tab.active {
                background: #1877f2;
                color: white;
            }

            .friends-content {
                padding: 16px;
                overflow-y: auto;
                max-height: 65vh;
            }

            .friend-card {
                display: flex;
                align-items: center;
                justify-content:
                    space-between;
                gap: 14px;
                padding: 14px;
                border-bottom:
                    1px solid #eee;
            }

            .friend-person {
                display: flex;
                align-items: center;
                gap: 12px;
                min-width: 0;
            }

            .friend-avatar {
                width: 46px;
                height: 46px;
                border-radius: 50%;
                background: #4f46d9;
                color: white;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: 700;
                flex: 0 0 auto;
            }

            .friend-name {
                font-weight: 700;
                word-break: break-word;
            }

            .friend-actions {
                display: flex;
                gap: 7px;
                flex-wrap: wrap;
            }

            .friend-action {
                border: 0;
                padding: 9px 13px;
                border-radius: 7px;
                cursor: pointer;
                font-weight: 600;
            }

            .friend-primary {
                background: #1877f2;
                color: white;
            }

            .friend-secondary {
                background: #e4e6eb;
                color: #111;
            }

            .friend-danger {
                background: #fee2e2;
                color: #b42318;
            }

            .friends-empty {
                text-align: center;
                color: #65676b;
                padding: 40px 15px;
            }

            .add-friend-box {
                padding: 20px 4px;
            }

            .add-friend-box input {
                width: 100%;
                box-sizing: border-box;
                padding: 12px 14px;
                border:
                    1px solid #ccc;
                border-radius: 8px;
                margin-bottom: 10px;
                font-size: 15px;
            }

            .add-friend-box button {
                width: 100%;
                border: 0;
                background: #1877f2;
                color: white;
                border-radius: 8px;
                padding: 12px;
                font-weight: 700;
                cursor: pointer;
            }
        `;

        document.head.appendChild(
            style
        );

        document
            .getElementById(
                'closeFriendsPage'
            )
            .addEventListener(
                'click',
                closeFriendsPage
            );

        overlay.addEventListener(
            'click',
            event => {
                if (
                    event.target ===
                    overlay
                ) {
                    closeFriendsPage();
                }
            }
        );

        overlay
            .querySelectorAll(
                '[data-friend-tab]'
            )
            .forEach(button => {

                button.addEventListener(
                    'click',
                    async () => {

                        overlay
                            .querySelectorAll(
                                '.friends-tab'
                            )
                            .forEach(tab =>
                                tab.classList
                                    .remove(
                                        'active'
                                    )
                            );

                        button.classList.add(
                            'active'
                        );

                        await loadFriendsSection(
                            button.dataset
                                .friendTab
                        );
                    }
                );

            });

        document
            .getElementById(
                'friendsContent'
            )
            .addEventListener(
                'click',
                handleFriendAction
            );
    }

    function openFriendsPage() {
        ensureFriendsUI();

        document
            .getElementById(
                'friendsOverlay'
            )
            .classList
            .remove('hidden');

        loadFriendsSection(
            'friends'
        );
    }

    function closeFriendsPage() {
        document
            .getElementById(
                'friendsOverlay'
            )
            ?.classList
            .add('hidden');
    }

    function renderPersonCard(
        item,
        type
    ) {

        const name =
            getFriendName(item);

        const initial =
            String(name)
                .charAt(0)
                .toUpperCase();

        const userId =
            getFriendUserId(item);

        const requestId =
            getRequestId(item);

        let actions = '';

        if (
            type === 'friends'
        ) {
            actions = `
                <button
                    class="
                        friend-action
                        friend-danger
                    "
                    data-friend-action="unfriend"
                    data-user-id="${escapeHtml(userId || '')}"
                >
                    Unfriend
                </button>
            `;
        }

        if (
            type === 'incoming'
        ) {
            actions = `
                <button
                    class="
                        friend-action
                        friend-primary
                    "
                    data-friend-action="accept"
                    data-request-id="${escapeHtml(requestId || '')}"
                >
                    Accept
                </button>

                <button
                    class="
                        friend-action
                        friend-secondary
                    "
                    data-friend-action="decline"
                    data-request-id="${escapeHtml(requestId || '')}"
                >
                    Decline
                </button>
            `;
        }

        if (
            type === 'outgoing'
        ) {
            actions = `
                <button
                    class="
                        friend-action
                        friend-secondary
                    "
                    data-friend-action="cancel"
                    data-request-id="${escapeHtml(requestId || '')}"
                >
                    Cancel
                </button>
            `;
        }

        return `
            <div class="friend-card">

                <div class="friend-person">

                    <div class="friend-avatar">
                        ${escapeHtml(initial)}
                    </div>

                    <div>
                        <div class="friend-name">
                            ${escapeHtml(name)}
                        </div>

                        ${
                            item.username
                                ? `
                                    <small>
                                        @${escapeHtml(item.username)}
                                    </small>
                                `
                                : ''
                        }
                    </div>

                </div>

                <div class="friend-actions">
                    ${actions}
                </div>

            </div>
        `;
    }

    async function loadFriendsSection(
        section
    ) {

        const content =
            document.getElementById(
                'friendsContent'
            );

        if (!content) {
            return;
        }

        content.innerHTML =
            'Loading...';

        try {

            if (
                section === 'friends'
            ) {
                const result =
                    await apiRequest(
                        '/friends'
                    );

                const list =
                    findArrayByKeys(
                        result,
                        [
                            'friends',
                            'items',
                            'data'
                        ]
                    );

                content.innerHTML =
                    list.length
                        ? list
                            .map(item =>
                                renderPersonCard(
                                    item,
                                    'friends'
                                )
                            )
                            .join('')
                        : `
                            <div class="friends-empty">
                                You don't have any friends yet.
                            </div>
                        `;

                return;
            }


            if (
                section ===
                'incoming'
            ) {
                const result =
                    await apiRequest(
                        '/friends/requests/incoming'
                    );

                const list =
                    findArrayByKeys(
                        result,
                        [
                            'requests',
                            'incoming',
                            'items',
                            'data'
                        ]
                    );

                content.innerHTML =
                    list.length
                        ? list
                            .map(item =>
                                renderPersonCard(
                                    item,
                                    'incoming'
                                )
                            )
                            .join('')
                        : `
                            <div class="friends-empty">
                                No incoming friend requests.
                            </div>
                        `;

                return;
            }


            if (
                section ===
                'outgoing'
            ) {
                const result =
                    await apiRequest(
                        '/friends/requests/outgoing'
                    );

                const list =
                    findArrayByKeys(
                        result,
                        [
                            'requests',
                            'outgoing',
                            'items',
                            'data'
                        ]
                    );

                content.innerHTML =
                    list.length
                        ? list
                            .map(item =>
                                renderPersonCard(
                                    item,
                                    'outgoing'
                                )
                            )
                            .join('')
                        : `
                            <div class="friends-empty">
                                No sent friend requests.
                            </div>
                        `;

                return;
            }


            if (
                section === 'add'
            ) {
                content.innerHTML = `
                    <div class="add-friend-box">

                        <h3>
                            Send Friend Request
                        </h3>

                        <p>
                            Enter the user's ID.
                        </p>

                        <input
                            id="friendUserIdInput"
                            type="text"
                            placeholder="User ID"
                        >

                        <button
                            id="sendFriendRequestButton"
                            type="button"
                        >
                            Send Friend Request
                        </button>

                    </div>
                `;

                document
                    .getElementById(
                        'sendFriendRequestButton'
                    )
                    .addEventListener(
                        'click',
                        sendFriendRequest
                    );
            }

        } catch (error) {

            console.error(
                'FRIENDS ERROR:',
                error
            );

            content.innerHTML = `
                <div
                    style="
                        color:#b42318;
                        padding:20px;
                    "
                >
                    ${escapeHtml(
                        error.message ||
                        'Unable to load Friends.'
                    )}
                </div>
            `;
        }
    }

    async function sendFriendRequest() {

        const input =
            document.getElementById(
                'friendUserIdInput'
            );

        const userId =
            input?.value.trim();

        if (!userId) {
            showToast(
                'Enter a User ID'
            );

            return;
        }

        try {

            await apiRequest(
                `/friends/requests/${encodeURIComponent(userId)}`,
                {
                    method: 'POST',
                    body:
                        JSON.stringify({})
                }
            );

            showToast(
                'Friend request sent'
            );

            input.value = '';

        } catch (error) {

            console.error(
                'SEND FRIEND REQUEST:',
                error
            );

            showToast(
                error.message ||
                'Unable to send request'
            );
        }
    }

    async function handleFriendAction(
        event
    ) {

        const button =
            event.target.closest(
                '[data-friend-action]'
            );

        if (!button) {
            return;
        }

        const action =
            button.dataset
                .friendAction;

        const requestId =
            button.dataset
                .requestId;

        const userId =
            button.dataset
                .userId;

        button.disabled =
            true;

        try {

            if (
                action === 'accept'
            ) {
                await apiRequest(
                    `/friends/requests/${requestId}/accept`,
                    {
                        method: 'POST',
                        body:
                            JSON.stringify({})
                    }
                );

                showToast(
                    'Friend request accepted'
                );

                await loadFriendsSection(
                    'incoming'
                );

                return;
            }


            if (
                action === 'decline'
            ) {
                await apiRequest(
                    `/friends/requests/${requestId}/decline`,
                    {
                        method: 'POST',
                        body:
                            JSON.stringify({})
                    }
                );

                showToast(
                    'Friend request declined'
                );

                await loadFriendsSection(
                    'incoming'
                );

                return;
            }


            if (
                action === 'cancel'
            ) {
                await apiRequest(
                    `/friends/requests/${requestId}`,
                    {
                        method: 'DELETE'
                    }
                );

                showToast(
                    'Friend request cancelled'
                );

                await loadFriendsSection(
                    'outgoing'
                );

                return;
            }


            if (
                action === 'unfriend'
            ) {
                await apiRequest(
                    `/friends/${userId}`,
                    {
                        method: 'DELETE'
                    }
                );

                showToast(
                    'Friend removed'
                );

                await loadFriendsSection(
                    'friends'
                );
            }

        } catch (error) {

            console.error(
                'FRIEND ACTION ERROR:',
                error
            );

            showToast(
                error.message ||
                'Friend action failed'
            );

        } finally {
            button.disabled =
                false;
        }
    }

    function bindFriendsButton() {

        const button =
            findFriendsButton();

        if (!button) {
            console.error(
                'Friends button not found'
            );

            return;
        }

        button.addEventListener(
            'click',
            openFriendsPage
        );

        console.log(
            'CIRKLEBOOK FRIENDS READY'
        );
    }

    if (
        document.readyState ===
        'loading'
    ) {
        document.addEventListener(
            'DOMContentLoaded',
            bindFriendsButton
        );
    } else {
        bindFriendsButton();
    }

})();

/* V28: complete mobile identity actions and automatic Page/Group feed layout. */
(function cirklebookV28NavigationCompletion(){
 const injectMobileIdentityActions=()=>{
  const signOut=document.querySelector('[data-mobile-sign-out]');
  if(!signOut||document.querySelector('[data-mobile-create-page]'))return;
  const page=document.createElement('button');page.type='button';page.dataset.mobileCreatePage='';page.innerHTML='<span>＋</span><div><b>Create Page</b><small>Build a new Page identity</small></div>';
  const group=document.createElement('button');group.type='button';group.dataset.mobileCreateGroup='';group.innerHTML='<span>👥</span><div><b>Create Group</b><small>Build a new Group</small></div>';
  signOut.before(page,group);
 };
 new MutationObserver(injectMobileIdentityActions).observe(document.body,{childList:true,subtree:true});
 document.addEventListener('click',event=>{
  const page=event.target.closest('[data-mobile-create-page]'),group=event.target.closest('[data-mobile-create-group]'),ad=event.target.closest('[data-cb-network-ad]');
  if(page){event.preventDefault();event.stopImmediatePropagation();window.CirklebookUiBridge?.closeDialog();window.CirklebookUiBridge?.openCreatePage();}
  if(group){event.preventDefault();event.stopImmediatePropagation();window.CirklebookUiBridge?.closeDialog();window.CirklebookUiBridge?.openCreateGroup();}
  if(ad){event.preventDefault();event.stopImmediatePropagation();window.CirklebookUiBridge?.openAdsBuilder('Website Traffic');}
 },true);
 const style=document.createElement('style');style.id='cbV28NetworkFeedCss';style.textContent=`
 .cb-network-feed-layout{display:grid;grid-template-columns:230px minmax(0,680px) 270px;gap:16px;max-width:1220px;margin:auto;align-items:start}.cb-network-feed-menu{display:grid;gap:6px;position:sticky;top:82px}.cb-network-feed-menu h2{margin:4px 7px 10px}.cb-network-feed-menu button{border:0;border-radius:9px;background:transparent;padding:12px;text-align:left;font:inherit;font-weight:700;cursor:pointer}.cb-network-feed-menu button:hover{background:#e4e6eb}.cb-network-feed-head{margin-bottom:12px}.cb-network-feed-head h2,.cb-network-feed-head p{margin:0 0 4px}.cb-network-feed-head p{color:#65676b}.cb-network-feed-ads{display:grid;gap:10px;position:sticky;top:82px}.cb-network-feed-ads h3{margin:5px 0}.cb-network-ad-box{min-height:105px;border-radius:10px;background:#e4e6eb;display:grid;place-content:center;text-align:center;color:#65676b}.cb-network-ad-box span{font-size:13px;margin-top:3px}@media(max-width:1000px){.cb-network-feed-layout{grid-template-columns:200px minmax(0,680px)}.cb-network-feed-ads{display:none}}@media(max-width:700px){.cb-network-feed-layout{display:block}.cb-network-feed-menu{position:static;display:flex;overflow:auto;margin-bottom:10px}.cb-network-feed-menu h2{display:none}.cb-network-feed-menu button{white-space:nowrap;background:#e4e6eb}.cb-network-feed-head{border-radius:0!important}.cb-network-feed-layout .feed .post{border-radius:0}}
 `;document.head.appendChild(style);
})();

/* =========================================================
   MOBILE HOME/PROFILE + ACTIONABLE NOTIFICATIONS
   Compact, touch-first social layout. Intentionally omits the
   "Share a note" bubble requested not to be included.
========================================================= */
(function cirklebookMobileSocialFinal(){
  'use strict';

  const escText=value=>String(value??'').replace(/[&<>'"]/g,ch=>({
    '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'
  }[ch]));
  const unwrap=value=>value?.data?.data||value?.data||value||{};
  const notificationText=item=>{
    const actor=item.actor_display_name||item.actorDisplayName||item.actor_username||item.actorUsername||'Someone';
    const type=String(item.notification_type||item.notificationType||item.message_key||'').replace(/^notification\./,'');
    const messages={
      friend_request:`${actor} sent you a friend request`,
      friend_request_accepted:`${actor} accepted your friend request`,
      new_follower:`${actor} started following you`,
      post_share:`${actor} shared your post`,
      post_comment:`${actor} commented on your post`,
      post_reaction:`${actor} reacted to your post`
    };
    return messages[type]||item.message||item.text||item.title||type.replace(/_/g,' ')||'Notification';
  };
  const timeLabel=value=>{
    if(!value)return '';
    const date=new Date(value);
    return Number.isNaN(date.getTime())?'':date.toLocaleString();
  };

  async function renderNotificationCenter(){
    if(typeof showFeature!=='function')return;
    showFeature('<div class="feature-page cb-mobile-notifications"><div class="cb-panel"><div class="cb-notification-head"><h2>Notifications</h2><button id="cbReadAllNotifications" class="cb-action">Mark all as read</button></div><div id="cbNotificationRows"><div class="cb-empty-panel">Loading…</div></div></div></div>');
    const host=document.getElementById('cbNotificationRows');
    try{
      const data=unwrap(await apiRequest('/notifications?limit=50'));
      const rows=Array.isArray(data.notifications)?data.notifications:(Array.isArray(data.items)?data.items:[]);
      host.innerHTML=rows.length?rows.map(item=>{
        const id=item.id||item.notification_id||item.notificationId;
        const requestId=item.target_id||item.targetId||item.message_params?.requestId||item.messageParams?.requestId;
        const type=item.notification_type||item.notificationType;
        const actor=(item.actor_display_name||item.actor_username||'?').slice(0,1).toUpperCase();
        return `<article class="cb-notification-row ${item.is_read||item.isRead?'':'unread'}" data-notification-id="${escText(id)}">
          <div class="cb-notification-avatar">${escText(actor)}</div>
          <div class="cb-notification-copy"><strong>${escText(notificationText(item))}</strong><small>${escText(timeLabel(item.created_at||item.createdAt))}</small>
          ${type==='friend_request'&&requestId?`<div class="cb-notification-actions"><button class="primary" data-friend-notification="accept" data-request-id="${escText(requestId)}">Confirm</button><button data-friend-notification="decline" data-request-id="${escText(requestId)}">Delete</button></div>`:''}</div>
          ${item.synthetic?'':`<button class="cb-notification-remove" data-remove-notification="${escText(id)}" aria-label="Delete notification">×</button>`}
        </article>`;
      }).join(''):'<div class="cb-empty-panel">No notifications yet.</div>';
      host.querySelectorAll('[data-friend-notification]').forEach(button=>button.onclick=async()=>{
        const action=button.dataset.friendNotification;
        button.disabled=true;
        try{
          await apiRequest(`/friends/requests/${encodeURIComponent(button.dataset.requestId)}/${action==='accept'?'accept':'decline'}`,{method:'POST'});
          button.closest('.cb-notification-actions').innerHTML=action==='accept'?'<b class="cb-request-done">Request confirmed</b>':'<b class="cb-request-done">Request deleted</b>';
          showToast(action==='accept'?'Friend request accepted':'Friend request deleted');
        }catch(error){button.disabled=false;showToast(error.message||'Unable to update request');}
      });
      host.querySelectorAll('[data-remove-notification]').forEach(button=>button.onclick=async()=>{
        try{await apiRequest(`/notifications/${encodeURIComponent(button.dataset.removeNotification)}`,{method:'DELETE'});button.closest('.cb-notification-row')?.remove();}
        catch(error){showToast(error.message||'Unable to delete notification');}
      });
      const readAll=document.getElementById('cbReadAllNotifications');
      if(readAll)readAll.onclick=async()=>{try{await apiRequest('/notifications/read-all',{method:'PATCH'});host.querySelectorAll('.unread').forEach(x=>x.classList.remove('unread'));showToast('All notifications marked as read');}catch(error){showToast(error.message||'Unable to mark notifications');}};
    }catch(error){host.innerHTML=`<div class="cb-empty-panel">${escText(error.message||'Unable to load notifications.')}</div>`;}
  }

  if(typeof openNotificationsPage==='function')openNotificationsPage=renderNotificationCenter;
  if(typeof openNotifications==='function')openNotifications=renderNotificationCenter;
  // This module is loaded before some legacy compatibility patches below.
  // Re-apply after the entire script has evaluated so the final handler wins.
  window.CirklebookRenderNotificationCenter=renderNotificationCenter;
  setTimeout(()=>{
    if(typeof openNotificationsPage==='function')openNotificationsPage=renderNotificationCenter;
    if(typeof openNotifications==='function')openNotifications=renderNotificationCenter;
  },0);

  const style=document.createElement('style');
  style.id='cbMobileSocialFinalCss';
  style.textContent=`
    .cb-notification-head{display:flex;align-items:center;justify-content:space-between;gap:12px;border-bottom:1px solid #e4e6eb;padding-bottom:12px}.cb-notification-head h2{margin:0}.cb-notification-row{display:flex;align-items:flex-start;gap:12px;position:relative;padding:13px 8px;border-bottom:1px solid #e4e6eb}.cb-notification-row.unread{background:#e7f3ff}.cb-notification-avatar{width:48px;height:48px;border-radius:50%;display:grid;place-items:center;flex:0 0 48px;background:#1877f2;color:#fff;font-size:20px;font-weight:800}.cb-notification-copy{display:grid;gap:4px;min-width:0;flex:1}.cb-notification-copy small{color:#65676b}.cb-notification-actions{display:flex;gap:8px;margin-top:7px}.cb-notification-actions button{border:0;border-radius:7px;background:#e4e6eb;padding:9px 20px;font-weight:700;cursor:pointer}.cb-notification-actions button.primary{background:#1877f2;color:#fff}.cb-request-done{color:#1877f2}.cb-notification-remove{border:0;background:transparent;border-radius:50%;font-size:24px;width:34px;height:34px;cursor:pointer}
    @media(max-width:700px){
      html,body{max-width:100%;overflow-x:hidden!important;background:#f0f2f5!important}
      body{padding-bottom:62px!important}
      #homeLayout{display:block!important;width:100%!important;max-width:none!important;margin:0!important;padding:0!important}
      #homeLayout.hidden{display:none!important}
      #homeLayout .left-sidebar,#homeLayout .right-sidebar,#homeLayout .left-column,#homeLayout .right-column,#homeLayout .sidebar-left,#homeLayout .sidebar-right{display:none!important}
      #homeLayout .feed-column,#homeLayout .main-feed,#homeLayout main{display:block!important;width:100%!important;max-width:none!important;margin:0!important;padding:0!important}
      #homeLayout .card,#homeLayout .post,#homeLayout .modern-composer,#cbStoriesStrip{border-left:0!important;border-right:0!important;border-radius:0!important;box-shadow:none!important;margin-left:0!important;margin-right:0!important;width:100%!important;box-sizing:border-box!important}
      #homeLayout .modern-composer{padding:10px 12px!important;background:#fff!important}
      #cbStoriesStrip{padding:8px 4px 10px!important;border-top:1px solid #dddfe2!important;border-bottom:4px solid #c9ccd1!important}
      #cbStoriesStrip .cb-story-card{flex-basis:108px!important;width:108px!important;height:190px!important;border-radius:12px!important}
      .post-media img,.post-media video,.post img.post-image,.post video{max-width:100%!important;height:auto!important}
      .post-actions.cb-standard-post-actions{grid-template-columns:repeat(3,minmax(0,1fr))!important}.post-actions.cb-standard-post-actions [data-post-action="report"],.post-actions.cb-standard-post-actions .report-button{display:none!important}
      .top-nav{position:fixed!important;left:0!important;right:0!important;bottom:0!important;top:auto!important;z-index:10020!important;height:58px!important;padding:3px 8px!important;background:#fff!important;border-top:1px solid #ccd0d5!important;box-shadow:0 -1px 5px rgba(0,0,0,.08)!important;display:flex!important;align-items:center!important;justify-content:space-around!important}
      .top-nav .nav-button{flex:1!important;height:50px!important;min-width:0!important;border-radius:0!important;background:transparent!important}
      .feature-page{width:100%!important;max-width:none!important;margin:0!important;padding:0 0 65px!important;box-sizing:border-box!important}
      .feature-page>.cb-panel{border-radius:0!important;border-left:0!important;border-right:0!important;box-shadow:none!important}
      .cb-profile-page-final .profile-cover{min-height:210px!important;height:210px!important;border-radius:0!important}
      .cb-profile-page-final .cb-profile-head-final{display:flex!important;align-items:flex-start!important;text-align:left!important;padding:0 14px 13px!important}
      .cb-profile-page-final .profile-avatar-wrap{align-self:flex-start!important;width:150px!important;height:150px!important;margin-top:-76px!important;margin-left:0!important}
      .cb-profile-page-final .profile-big-avatar{width:150px!important;height:150px!important;min-width:150px!important;min-height:150px!important;max-width:150px!important;max-height:150px!important;border-width:5px!important}
      .cb-profile-page-final .profile-title{width:100%!important;text-align:left!important;padding-top:8px!important}
      .cb-profile-page-final .profile-title h1{font-size:30px!important;margin-bottom:5px!important}
      .cb-profile-page-final .cb-profile-counts{font-size:16px!important;font-weight:600!important;color:#050505!important}
      .cb-profile-page-final .profile-title p{font-size:16px!important;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
      .cb-profile-page-final .cb-profile-pinned-details{justify-content:flex-start!important;display:grid!important;gap:5px!important;font-weight:600!important}
      .cb-profile-page-final .profile-actions{display:grid!important;grid-template-columns:minmax(0,1fr) minmax(0,1fr) 48px!important;width:100%!important;justify-content:stretch!important;gap:8px!important;margin-top:8px!important}
      .cb-profile-page-final .profile-actions .cb-action{margin:0!important;min-width:0!important;padding:10px 7px!important}.cb-profile-page-final .profile-actions .primary{background:#1877f2!important;color:#fff!important}
      .cb-profile-page-final .cb-profile-tabs-final{margin:0!important;padding:4px 10px!important;overflow-x:auto!important;border-top:1px solid #dddfe2!important;border-bottom:1px solid #dddfe2!important}.cb-profile-page-final .cb-profile-tabs-final button{flex:0 0 auto!important;padding:11px 15px!important}
      .cb-profile-page-final .cb-profile-grid,.cb-profile-page-final .cb-profile-content-grid{display:block!important}.cb-profile-page-final .cb-profile-left-column{position:static!important;width:100%!important;max-height:none!important;overflow:visible!important}
      .cb-mobile-notifications .cb-panel{padding:12px!important}.cb-notification-actions button{flex:1}.cb-notification-remove{width:30px;flex:0 0 30px}
    }
  `;
  style.textContent+=`.cb-page-side-avatar,.cb-page-mode-avatar,.cb-page-composer-avatar,.cb-page-side-icon{position:relative}.cb-page-side-avatar i,.cb-page-mode-avatar i,.cb-page-composer-avatar i,.cb-page-side-icon i{font-style:normal;display:grid;place-items:center;width:100%;height:100%}.cb-page-side-avatar img,.cb-page-mode-avatar img,.cb-page-composer-avatar img,.cb-page-side-icon img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;background:#fff}.cb-page-side-icon{width:38px;height:38px;flex:0 0 38px;border-radius:10px;display:grid;place-items:center;overflow:hidden;background:#e4e6eb;font-size:22px}`;
  document.head.appendChild(style);
})();

/* =========================================================
   CIRKLEBOOK — UNIFIED SOCIAL INTERACTIONS V15
   Home, Profile, Page, Group, Saved and Reel post cards.
========================================================= */
(function cirklebookUnifiedSocialInteractions(){
  'use strict';
  if(window.__CB_SOCIAL_INTERACTIONS_V15__)return;
  window.__CB_SOCIAL_INTERACTIONS_V15__=true;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const q=(selector,root=document)=>root.querySelector(selector);
  const mediaToken=/\[\[cbmedia:(image|video):([^\]]+)\]\]/i;
  const reactionMeta={
    like:{emoji:'👍',label:'Like'},love:{emoji:'❤️',label:'Love'},care:{emoji:'🥰',label:'Care'},
    haha:{emoji:'😂',label:'Haha'},wow:{emoji:'😮',label:'Wow'},sad:{emoji:'😢',label:'Sad'},angry:{emoji:'😡',label:'Angry'}
  };
  const unwrapSocial=value=>value?.data?.data||value?.data||value||{};

  const originalRenderComment=renderComment;
  renderComment=function(comment){
    const html=originalRenderComment(comment);
    const body=String(comment?.body||'');
    const match=body.match(mediaToken);
    if(!match)return html;
    const clean=body.replace(mediaToken,'').trim();
    const name=comment?.display_name||comment?.author_display_name||comment?.username||comment?.author_username||'User';
    const visual=match[1]==='video'
      ?`<video class="cb-comment-media" src="${esc(match[2])}" controls playsinline></video>`
      :`<img class="cb-comment-media" src="${esc(match[2])}" alt="Comment attachment">`;
    return `<div class="cb-rich-comment"><div class="cb-comment-bubble"><strong>${esc(name)}</strong>${clean?`<div>${esc(clean)}</div>`:''}</div>${visual}</div>`;
  };

  const originalSendComment=sendComment;
  sendComment=async function(postId,button){
    const input=q(`[data-comment-input="${CSS.escape(String(postId))}"]`);
    const attachment=input?.dataset.cbAttachment||'';
    const original=input?.value||'';
    if(input&&attachment)input.value=`${original.trim()} ${attachment}`.trim();
    await originalSendComment(postId,button);
    if(input&&!input.value){delete input.dataset.cbAttachment;q(`[data-comment-preview="${CSS.escape(String(postId))}"]`)?.remove();}
  };

  async function socialData(postId,recordView=true){
    const card=q(`.post[data-post="${CSS.escape(String(postId))}"]`);
    if(!card)return;
    const viewKey=`cb_viewed_${postId}`;
    const calls=[
      apiRequest(`/reactions/${encodeURIComponent(postId)}/reactions`),
      apiRequest(`/comments/${encodeURIComponent(postId)}/comments?limit=100`),
      apiRequest(`/posts/${encodeURIComponent(postId)}/shares`)
    ];
    if(recordView&&!sessionStorage.getItem(viewKey)){
      calls.push(apiRequest(`/posts/${encodeURIComponent(postId)}/view`,{method:'POST',body:JSON.stringify({})}));
      sessionStorage.setItem(viewKey,'1');
    }else calls.push(apiRequest(`/posts/${encodeURIComponent(postId)}/views`));
    const [reactions,comments,shares,views]=await Promise.allSettled(calls);
    const rd=reactions.status==='fulfilled'?unwrapSocial(reactions.value):{};
    const cd=comments.status==='fulfilled'?unwrapSocial(comments.value):{};
    const sd=shares.status==='fulfilled'?unwrapSocial(shares.value):{};
    const vd=views.status==='fulfilled'?unwrapSocial(views.value):{};
    card.__cbReactionPeople=Array.isArray(rd.recent)?rd.recent:[];
    const total=Number(rd.total||0),commentCount=Number(cd.count??cd.comments?.length??0),shareCount=Number(sd.count??sd.shares?.length??0),viewCount=Number(vd.count||0);
    const reactionButton=q(`[data-show-reactions="${CSS.escape(String(postId))}"]`,card);
    if(reactionButton){
      const breakdown=(Array.isArray(rd.summary)?rd.summary:[])
        .map(item=>({type:String(item.reaction_type||item.reactionType||'like').toLowerCase(),count:Number(item.count||0)}))
        .filter(item=>item.count>0&&reactionMeta[item.type])
        .sort((a,b)=>b.count-a.count);
      reactionButton.innerHTML=breakdown.length
        ? `${breakdown.map(item=>`<span class="cb-reaction-total-type" title="${reactionMeta[item.type].label}: ${item.count}"><b>${reactionMeta[item.type].emoji}</b><em>${item.count}</em></span>`).join('')}<span class="cb-reaction-total-label">${total} ${total===1?'reaction':'reactions'}</span>`
        : '0 reactions';
      reactionButton.setAttribute('aria-label',breakdown.map(item=>`${reactionMeta[item.type].label} ${item.count}`).join(', ')||'0 reactions');
    }
    const cc=q(`[data-comment-count="${CSS.escape(String(postId))}"]`,card);if(cc)cc.textContent=`${commentCount} ${commentCount===1?'comment':'comments'}`;
    const sc=q(`[data-share-count="${CSS.escape(String(postId))}"]`,card);if(sc)sc.textContent=`${shareCount} ${shareCount===1?'share':'shares'}`;
    const vc=q(`[data-view-count="${CSS.escape(String(postId))}"]`,card);if(vc)vc.textContent=`${viewCount} ${viewCount===1?'view':'views'}`;
    if(rd.myReaction){
      state.likedPosts.add(String(postId));
      const like=q('[data-action="like"]',card),type=String(rd.myReaction.reaction_type||rd.myReaction.reactionType||'like').toLowerCase(),meta=reactionMeta[type]||reactionMeta.like;
      if(like){like.textContent=`${meta.emoji} ${meta.label}`;like.classList.add('active');like.dataset.currentReaction=type;}
    }else if(reactions.status==='fulfilled'){
      state.likedPosts.delete(String(postId));
      const like=q('[data-action="like"]',card);if(like){like.textContent='Like';like.classList.remove('active');delete like.dataset.currentReaction;}
    }
  }

  function hydrate(root=document){
    root.querySelectorAll?.('.post[data-post]').forEach(card=>{
      if(card.dataset.cbSocialV15==='1')return;
      card.dataset.cbSocialV15='1';
      const like=card.querySelector('[data-action="like"]');
      if(like&&!card.querySelector('.cb-reaction-picker')){
        const picker=document.createElement('div');
        picker.className='cb-reaction-picker';
        picker.innerHTML=[['like','👍','Like'],['love','❤️','Love'],['care','🥰','Care'],['haha','😂','Haha'],['wow','😮','Wow'],['sad','😢','Sad'],['angry','😡','Angry']].map(([type,icon,label])=>`<button type="button" data-reaction-choice="${type}" data-post-id="${esc(card.dataset.post)}" title="${label}">${icon}</button>`).join('');
        like.parentElement.style.position='relative';
        like.parentElement.appendChild(picker);
        let hideTimer;
        const show=()=>{clearTimeout(hideTimer);picker.classList.add('show')};
        const hide=()=>{hideTimer=setTimeout(()=>picker.classList.remove('show'),350)};
        like.addEventListener('mouseenter',show);like.addEventListener('mouseleave',hide);
        picker.addEventListener('mouseenter',show);picker.addEventListener('mouseleave',hide);
        let hold;like.addEventListener('pointerdown',()=>{hold=setTimeout(show,450)});like.addEventListener('pointerup',()=>clearTimeout(hold));like.addEventListener('pointercancel',()=>clearTimeout(hold));
      }
      socialData(card.dataset.post).catch(error=>console.warn('SOCIAL SUMMARY:',error.message));
    });
  }

  document.addEventListener('click',async event=>{
    const reactionChoice=event.target.closest('[data-reaction-choice]');
    if(reactionChoice){
      event.preventDefault();event.stopPropagation();
      const id=reactionChoice.dataset.postId,type=reactionChoice.dataset.reactionChoice;
      reactionChoice.disabled=true;
      try{
        await apiRequest(`/reactions/${encodeURIComponent(id)}/reactions`,{method:'POST',body:JSON.stringify({reactionType:type})});
        state.likedPosts.add(String(id));
        const card=reactionChoice.closest('.post'),like=card?.querySelector('[data-action="like"]');
        const meta=reactionMeta[type]||reactionMeta.like;
        if(like){like.textContent=`${meta.emoji} ${meta.label}`;like.classList.add('active');like.dataset.currentReaction=type;}
        reactionChoice.closest('.cb-reaction-picker')?.classList.remove('show');
        await socialData(id,false);
      }catch(error){showToast(error.message||'Unable to react.');}
      finally{reactionChoice.disabled=false;}
      return;
    }
    const reaction=event.target.closest('[data-show-reactions]');
    if(reaction){
      const id=reaction.dataset.showReactions,card=reaction.closest('.post');
      await socialData(id,false).catch(()=>{});
      const people=card?.__cbReactionPeople||[];
      const rows=people.map(person=>{const type=String(person.reaction_type||person.reactionType||'like').toLowerCase(),meta=reactionMeta[type]||reactionMeta.like;return `<div class="cb-like-person"><span>${esc((person.display_name||person.username||'U').charAt(0).toUpperCase())}</span><div><b>${esc(person.display_name||person.username||'Cirklebook user')}</b><small class="cb-person-reaction">${meta.emoji} ${meta.label}</small></div></div>`;}).join('');
      window.CirklebookShowDialog?.('People who reacted',rows||'<div class="cb-empty-panel">No reactions yet.</div>');
      return;
    }
    const action=event.target.closest('[data-action]');
    if(action&&['like','send-comment','share'].includes(action.dataset.action))setTimeout(()=>socialData(action.dataset.postId,false).catch(()=>{}),900);

    const emoji=event.target.closest('[data-comment-emoji]');
    const sticker=event.target.closest('[data-comment-sticker]');
    if(emoji||sticker){
      const id=(emoji||sticker).dataset[emoji?'commentEmoji':'commentSticker'];
      const input=q(`[data-comment-input="${CSS.escape(id)}"]`);
      const choices=emoji?['😀','😂','😍','🤲','❤️','👍','🎉','😢']:['🌟','💐','🎊','👏','🤍','☕','🌙','🕌'];
      window.CirklebookShowDialog?.(emoji?'Insert emoji':'Choose a sticker',`<div class="cb-picker-grid">${choices.map(x=>`<button type="button" data-cb-pick="${x}">${x}</button>`).join('')}</div>`);
      document.querySelectorAll('[data-cb-pick]').forEach(btn=>btn.onclick=()=>{if(input){input.value+=btn.dataset.cbPick;input.focus();}window.CirklebookCloseDialog?.();});
      return;
    }
    const media=event.target.closest('[data-comment-media]');
    if(media){q(`[data-comment-file="${CSS.escape(media.dataset.commentMedia)}"]`)?.click();}
  });

  document.addEventListener('change',async event=>{
    const fileInput=event.target.closest('[data-comment-file]');
    if(!fileInput)return;
    const file=fileInput.files?.[0],id=fileInput.dataset.commentFile;
    if(!file)return;
    const commentInput=q(`[data-comment-input="${CSS.escape(id)}"]`);
    const tools=q(`[data-comment-tools="${CSS.escape(id)}"]`);
    const preview=document.createElement('div');preview.dataset.commentPreview=id;preview.className='cb-comment-attachment-preview';preview.textContent='Uploading attachment…';tools?.prepend(preview);
    try{
      const uploaded=await uploadMedia(file);
      const url=(typeof buildMediaUrl==='function'?buildMediaUrl(uploaded):'')||uploaded.url||uploaded.public_url||`${API_BASE_URL}/media/asset/${encodeURIComponent(uploaded.id)}`;
      if(commentInput)commentInput.dataset.cbAttachment=`[[cbmedia:${file.type.startsWith('video/')?'video':'image'}:${url}]]`;
      preview.innerHTML=file.type.startsWith('video/')?`<video src="${esc(url)}" controls></video>`:`<img src="${esc(url)}" alt="Attachment preview">`;
      commentInput?.focus();
    }catch(error){preview.textContent=error.message||'Attachment upload failed.';}
  });

  const style=document.createElement('style');style.id='cbSocialV15Css';style.textContent=`.cb-post-social-summary{display:flex;justify-content:space-between;gap:10px;padding:10px 16px;border-bottom:1px solid #e4e6eb;color:#65676b;font-size:13px}.cb-post-social-summary button{border:0;background:transparent;color:#1877f2;cursor:pointer;padding:0;display:flex;align-items:center;gap:5px;flex-wrap:wrap}.cb-reaction-total-type{display:inline-flex;align-items:center;gap:2px;background:#f0f2f5;border-radius:999px;padding:2px 5px}.cb-reaction-total-type b{font-size:16px;line-height:1}.cb-reaction-total-type em{font-style:normal;color:#65676b;font-weight:700}.cb-reaction-total-label{margin-left:2px}.cb-person-reaction{font-size:13px;font-weight:700}.cb-reaction-picker{position:absolute;left:4px;bottom:45px;z-index:80;display:none;align-items:center;gap:3px;padding:6px 8px;border-radius:28px;background:#fff;box-shadow:0 3px 18px rgba(0,0,0,.28);white-space:nowrap}.cb-reaction-picker.show{display:flex}.cb-reaction-picker button{border:0!important;background:transparent!important;font-size:28px!important;padding:2px!important;width:38px!important;transition:transform .12s}.cb-reaction-picker button:hover{transform:scale(1.35)}.cb-comment-tools{display:flex;gap:6px;padding:0 16px 12px;flex-wrap:wrap}.cb-comment-tools button{border:0;border-radius:18px;background:#f0f2f5;padding:8px 11px;cursor:pointer}.cb-picker-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.cb-picker-grid button{border:0;border-radius:10px;background:#f0f2f5;font-size:28px;padding:10px;cursor:pointer}.cb-like-person{display:flex;align-items:center;gap:10px;padding:9px}.cb-like-person>span{width:40px;height:40px;border-radius:50%;display:grid;place-items:center;background:#1877f2;color:#fff;font-weight:800}.cb-like-person div{display:grid}.cb-like-person small{color:#65676b}.cb-rich-comment{padding:5px 16px}.cb-comment-bubble{display:inline-block;background:#f0f2f5;padding:8px 12px;border-radius:14px}.cb-comment-media,.cb-comment-attachment-preview img,.cb-comment-attachment-preview video{display:block;max-width:260px;max-height:220px;border-radius:10px;margin-top:6px}.cb-comment-attachment-preview{width:100%;color:#65676b}`;document.head.appendChild(style);
  let queued=false;new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;hydrate();});}).observe(document.documentElement,{childList:true,subtree:true});
  hydrate();
})();

/* =========================================================
   CIRKLEBOOK — SINGLE, SAME-ORIGIN PEOPLE SEARCH
   Prevents an older search handler from calling a stale host and showing
   both a People error dialog and local feed "No results" at the same time.
========================================================= */
(()=>{ return; // Disabled: people-search.js is the single search owner.
  const input=document.getElementById('topSearch');
  if(!input||input.dataset.cbPeopleSearchV12==='1')return;
  input.dataset.cbPeopleSearchV12='1';

  const esc=(value)=>String(value??'').replace(/[&<>"']/g,(char)=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
  }[char]));
  const mediaUrl=(id)=>id?`${API_BASE_URL}/media/asset/${encodeURIComponent(id)}`:'';

  function removeOldLocalResult(){
    document.getElementById('cbSearchNoResults')?.remove();
    document.querySelectorAll('#feedContainer .post').forEach((post)=>{
      post.hidden=false;
      post.classList.remove('search-match');
    });
  }

  async function searchPeople(){
    const raw=input.value.trim();
    removeOldLocalResult();
    if(raw.length<2){
      showToast('Type at least 2 characters to search people.');
      return;
    }

    cbShowDialog('People',`<div class="cb-people-search-result"><p>Search results for “${esc(raw)}”</p><div class="cb-empty-panel">Searching…</div></div>`);
    const resultBox=document.querySelector('.cb-people-search-result .cb-empty-panel');

    try{
      // apiRequest supplies the current access token. A relative path keeps
      // this request on cirklebook.com and avoids custom-domain CORS errors.
      const response=await apiRequest(`/users/search?q=${encodeURIComponent(raw)}&limit=20`);
      const users=response?.data?.users||response?.users||response?.data||[];
      const list=Array.isArray(users)?users:[];
      if(!resultBox)return;
      resultBox.className='';
      resultBox.innerHTML=list.length?`<div class="people-grid">${list.map((user)=>{
        const name=user.displayName||user.display_name||user.username||'Cirklebook user';
        const username=user.username||'';
        const avatar=mediaUrl(user.profileMediaId||user.profile_media_id);
        return `<article class="person-card" data-found-user="${esc(user.id||'')}">
          ${avatar?`<img class="avatar" src="${esc(avatar)}" alt="">`:`<span class="avatar cb-search-avatar-fallback">${esc(name.charAt(0).toUpperCase())}</span>`}
          <div class="person-main"><strong>${esc(name)}</strong><small>${username?'@'+esc(username):'Cirklebook user'}</small></div>
        </article>`;
      }).join('')}</div>`:'<div class="cb-empty-panel">No people found for “'+esc(raw)+'”.</div>';
    }catch(error){
      console.error('PEOPLE SEARCH:',error);
      if(!resultBox)return;
      const message=error?.status===401
        ?'Your session expired. Please log in again.'
        :(error?.message==='Failed to fetch'
          ?'The search service could not be reached. Please refresh and try again.'
          :(error?.message||'Unable to search people.'));
      resultBox.textContent=message;
    }
  }

  // Capture phase blocks older inline/bubble handlers that caused the two
  // contradictory results shown on the live site.
  input.addEventListener('keydown',(event)=>{
    if(event.key!=='Enter')return;
    event.preventDefault();
    event.stopImmediatePropagation();
    clearTimeout(input.__cbPeopleSearchTimer);
    searchPeople();
  },true);

  // Search automatically after typing stops. Capture phase also prevents the
  // old local post-filter from hiding the feed or adding a second result.
  input.addEventListener('input',(event)=>{
    event.stopImmediatePropagation();
    clearTimeout(input.__cbPeopleSearchTimer);
    removeOldLocalResult();
    const raw=input.value.trim();
    if(raw.length<2)return;
    input.__cbPeopleSearchTimer=setTimeout(searchPeople,650);
  },true);

  const style=document.createElement('style');
  style.textContent=`.cb-people-search-result{display:grid;gap:12px}.cb-people-search-result>p{margin:0;color:#65676b}.cb-people-search-result .people-grid{display:grid;gap:8px}.cb-people-search-result .person-card{display:flex;align-items:center;gap:12px;padding:10px;border:1px solid #e4e6eb;border-radius:10px}.cb-people-search-result .avatar{width:48px;height:48px;border-radius:50%;object-fit:cover}.cb-search-avatar-fallback{display:grid;place-items:center;background:#e7f3ff;color:#1877f2;font-weight:800}.cb-people-search-result .person-main{display:grid;gap:3px}.cb-people-search-result .person-main small{color:#65676b}`;
  document.head.appendChild(style);
})();

/* Final visual normalization: prevent inherited duplicate/shadow text and
   keep colored post content geometrically centered at every viewport size. */
(function cirklebookFinalVisualNormalization(){
  if(document.getElementById('cbFinalVisualNormalization'))return;
  const style=document.createElement('style');
  style.id='cbFinalVisualNormalization';
  style.textContent=`
    .feature-page,.feature-page button,.feature-page input,.feature-page textarea,
    .feature-page select,.sidebar-link,.top-nav,.post-header,.post-actions{
      text-shadow:none!important;
      -webkit-text-stroke:0!important;
    }
    .post-body.has-post-background{
      display:block!important;
      position:relative!important;
      text-align:center!important;
      box-sizing:border-box!important;
      width:auto!important;
      padding:0!important;
      text-indent:0!important;
      transform:none!important;
    }
    .post-body.has-post-background>.cb-centered-post-text{
      position:absolute!important;
      inset:0!important;
      width:100%!important;
      height:100%!important;
      margin:0!important;
      padding:24px!important;
      display:grid!important;
      place-items:center!important;
      box-sizing:border-box!important;
      text-align:center!important;
      text-indent:0!important;
      transform:none!important;
    }
    .post-body.has-post-background::before,
    .post-body.has-post-background::after{content:none!important;display:none!important}
  `;
  document.head.appendChild(style);
})();
/* =========================================================
   CIRKLEBOOK SIDEBAR MODULE
   Groups + Pages + Saved + Notifications
   Professional Dashboard + Settings & Privacy
========================================================= */

(function setupCirklebookSidebar() {

    function sidebarButton(text) {
        return [...document.querySelectorAll('.sidebar-link')]
            .find(btn =>
                btn.textContent
                    .toLowerCase()
                    .includes(text.toLowerCase())
            );
    }

    function ensureMainPanel() {
        let overlay =
            document.getElementById(
                'cirklebookMainOverlay'
            );

        if (overlay) {
            return overlay;
        }

        overlay =
            document.createElement('div');

        overlay.id =
            'cirklebookMainOverlay';

        overlay.className =
            'hidden';

        overlay.innerHTML = `
            <div class="cb-panel">

                <div class="cb-panel-header">

                    <h2 id="cbPanelTitle">
                        Cirklebook
                    </h2>

                    <button
                        id="cbPanelClose"
                        type="button"
                        class="cb-close"
                    >
X
</button>

                </div>

                <div
                    id="cbPanelContent"
                    class="cb-panel-content"
                ></div>

            </div>
        `;

        document.body.appendChild(
            overlay
        );

        const style =
            document.createElement(
                'style'
            );

        style.textContent = `
            #cirklebookMainOverlay {
                position:fixed;
                inset:0;
                z-index:99990;
                background:rgba(0,0,0,.45);
                display:flex;
                align-items:center;
                justify-content:center;
                padding:18px;
            }

            #cirklebookMainOverlay.hidden {
                display:none;
            }

            .cb-panel {
                width:min(900px,96vw);
                max-height:90vh;
                background:white;
                border-radius:15px;
                box-shadow:
                    0 15px 45px
                    rgba(0,0,0,.28);
                overflow:hidden;
            }

            .cb-panel-header {
                height:65px;
                display:flex;
                align-items:center;
                justify-content:
                    space-between;
                padding:0 20px;
                border-bottom:
                    1px solid #ddd;
            }

            .cb-panel-header h2 {
                margin:0;
            }

            .cb-close {
                width:40px;
                height:40px;
                border:none;
                border-radius:50%;
                background:#e4e6eb;
                font-size:24px;
                cursor:pointer;
            }

            .cb-panel-content {
                padding:20px;
                max-height:72vh;
                overflow:auto;
            }

            .cb-card {
                background:#fff;
                border:1px solid #ddd;
                border-radius:12px;
                padding:16px;
                margin-bottom:12px;
            }

            .cb-row {
                display:flex;
                justify-content:
                    space-between;
                align-items:center;
                gap:12px;
            }

            .cb-button {
                border:none;
                border-radius:8px;
                padding:9px 14px;
                cursor:pointer;
                font-weight:700;
            }

            .cb-primary {
                background:#1877f2;
                color:white;
            }

            .cb-secondary {
                background:#e4e6eb;
                color:#111;
            }

            .cb-tabs {
                display:flex;
                gap:8px;
                margin-bottom:18px;
                flex-wrap:wrap;
            }

            .cb-tab {
                border:none;
                padding:10px 14px;
                border-radius:8px;
                background:#e4e6eb;
                font-weight:700;
                cursor:pointer;
            }

            .cb-tab.active {
                background:#1877f2;
                color:white;
            }

            .cb-empty {
                text-align:center;
                padding:40px 10px;
                color:#65676b;
            }

            .dashboard-grid {
                display:grid;
                grid-template-columns:
                    repeat(
                        auto-fit,
                        minmax(170px,1fr)
                    );
                gap:12px;
            }

            .dashboard-stat {
                border:1px solid #ddd;
                border-radius:12px;
                padding:18px;
            }

            .dashboard-number {
                font-size:28px;
                font-weight:800;
                margin-top:8px;
            }

            .settings-row {
                padding:16px 0;
                border-bottom:
                    1px solid #eee;
            }

            .notification-item {
                padding:14px;
                border-bottom:
                    1px solid #eee;
            }
        `;

        document.head.appendChild(
            style
        );

        document
            .getElementById(
                'cbPanelClose'
            )
            .addEventListener(
                'click',
                closePanel
            );

        overlay.addEventListener(
            'click',
            event => {
                if (
                    event.target ===
                    overlay
                ) {
                    closePanel();
                }
            }
        );

        return overlay;
    }


    function openPanel(
        title
    ) {
        const overlay =
            ensureMainPanel();

        document
            .getElementById(
                'cbPanelTitle'
            )
            .textContent =
                title;

        overlay.classList.remove(
            'hidden'
        );

        document.body.style.overflow =
            'hidden';
    }


    function closePanel() {
        document
            .getElementById(
                'cirklebookMainOverlay'
            )
            ?.classList
            .add('hidden');

        document.body.style.overflow =
            '';
    }


    function panelContent() {
        return document
            .getElementById(
                'cbPanelContent'
            );
    }


    function findArray(
        value,
        keys
    ) {
        if (!value) {
            return [];
        }

        if (
            Array.isArray(value)
        ) {
            return value;
        }

        if (
            typeof value !==
            'object'
        ) {
            return [];
        }

        for (
            const key
            of keys
        ) {
            if (
                Array.isArray(
                    value[key]
                )
            ) {
                return value[key];
            }
        }

        for (
            const child
            of Object.values(
                value
            )
        ) {
            if (
                child &&
                typeof child ===
                'object'
            ) {
                const found =
                    findArray(
                        child,
                        keys
                    );

                if (
                    found.length
                ) {
                    return found;
                }
            }
        }

        return [];
    }


    /* =====================================================
       SAVED
    ===================================================== */

    async function openSaved() {
        openPanel(
            'Saved'
        );

        const content =
            panelContent();

        content.innerHTML =
            'Loading saved posts...';

        try {
            const result =
                await apiRequest(
                    '/saves/saved'
                );

            const posts =
                findArray(
                    result,
                    [
                        'posts',
                        'saved',
                        'items',
                        'data'
                    ]
                );

            if (
                !posts.length
            ) {
                content.innerHTML = `
                    <div class="cb-empty">
                        No saved posts yet.
                    </div>
                `;

                return;
            }

            posts.forEach(post => {
                const id = post?.id || post?.post_id || post?.postId;
                if (id) state.savedPosts.add(String(id));
            });

            content.innerHTML =
                posts
                    .map(
                        post =>
                            typeof renderPost ===
                            'function'
                                ?
                                renderPost(
                                    post
                                )
                                :
                                `
                                    <div class="cb-card">
                                        ${escapeHtml(
                                            post.body ||
                                            post.content || post.text || post.post?.body || post.post?.content || post.saved_post?.body || post.savedPost?.body || post.original_post?.body || post.originalPost?.body || 'Saved post'
                                        )}
                                    </div>
                                `
                    )
                    .join('');

        } catch (error) {
            content.innerHTML = `
                <div class="cb-empty">
                    ${escapeHtml(
                        error.message
                    )}
                </div>
            `;
        }
    }


    /* =====================================================
       NOTIFICATIONS
    ===================================================== */

    async function openNotifications() {
        openPanel(
            'Notifications'
        );

        const content =
            panelContent();

        content.innerHTML =
            'Loading notifications...';

        try {
            const result =
                await apiRequest(
                    '/notifications'
                );

            const list =
                findArray(
                    result,
                    [
                        'notifications',
                        'items',
                        'data'
                    ]
                );

            if (
                !list.length
            ) {
                content.innerHTML = `
                    <div class="cb-empty">
                        No notifications yet.
                    </div>
                `;

                return;
            }

            content.innerHTML =
                list
                    .map(item => {

                        const text =
                            item.message ||
                            item.text ||
                            item.title ||
                            item.message_key ||
                            'Notification';

                        return `
                            <div class="notification-item">

                                <strong>
                                    ${escapeHtml(
                                        text
                                    )}
                                </strong>

                                ${
                                    item.created_at
                                        ?
                                        `
                                        <div
                                            style="
                                                color:#65676b;
                                                margin-top:5px;
                                                font-size:13px;
                                            "
                                        >
                                            ${escapeHtml(
                                                formatDate(
                                                    item.created_at
                                                )
                                            )}
                                        </div>
                                        `
                                        :
                                        ''
                                }

                            </div>
                        `;
                    })
                    .join('');

        } catch (error) {
            content.innerHTML = `
                <div class="cb-empty">
                    ${escapeHtml(
                        error.message
                    )}
                </div>
            `;
        }
    }


    /* =====================================================
       GROUPS
    ===================================================== */

    async function openGroups() {
        openPanel(
            'Groups'
        );

        const content =
            panelContent();

        content.innerHTML = `
            <div class="cb-tabs">

                <button
                    class="
                        cb-tab
                        active
                    "
                    data-group-tab="my"
                >
                    My Groups
                </button>

                <button
                    class="cb-tab"
                    data-group-tab="discover"
                >
                    Discover
                </button>

                <button
                    class="cb-tab"
                    data-group-tab="create"
                >
                    Create Group
                </button>

            </div>

            <div id="groupsArea">
                Loading...
            </div>
        `;

        content
            .querySelectorAll(
                '[data-group-tab]'
            )
            .forEach(button => {

                button.addEventListener(
                    'click',
                    () => {

                        content
                            .querySelectorAll(
                                '.cb-tab'
                            )
                            .forEach(tab =>
                                tab.classList
                                    .remove(
                                        'active'
                                    )
                            );

                        button.classList.add(
                            'active'
                        );

                        loadGroupTab(
                            button.dataset
                                .groupTab
                        );
                    }
                );

            });

        await loadGroupTab(
            'my'
        );
    }


    async function loadGroupTab(
        tab
    ) {
        const area =
            document.getElementById(
                'groupsArea'
            );

        if (!area) {
            return;
        }

        if (
            tab === 'create'
        ) {
            area.innerHTML = `
                <div class="cb-card">

                    <h3>
                        Create Group
                    </h3>

                    <input
                        id="newGroupName"
                        type="text"
                        placeholder="Group name"
                        style="
                            width:100%;
                            box-sizing:border-box;
                            padding:12px;
                            margin:8px 0;
                        "
                    >

                    <select
                        id="newGroupPrivacy"
                        style="
                            width:100%;
                            padding:12px;
                            margin-bottom:10px;
                        "
                    >
                        <option value="public">
                            Public
                        </option>

                        <option value="private">
                            Private
                        </option>
                    </select>

                    <button
                        id="createGroupButton"
                        class="
                            cb-button
                            cb-primary
                        "
                    >
                        Create Group
                    </button>

                </div>
            `;

            document
                .getElementById(
                    'createGroupButton'
                )
                .addEventListener(
                    'click',
                    createGroup
                );

            return;
        }

        area.innerHTML =
            'Loading groups...';

        const endpoints =
            tab === 'discover'
                ?
                [
                    '/groups',
                    '/groups/discover'
                ]
                :
                [
                    '/groups/mine',
                    '/groups'
                ];

        let result = null;
        let lastError = null;

        for (
            const endpoint
            of endpoints
        ) {
            try {
                result =
                    await apiRequest(
                        endpoint
                    );

                break;

            } catch (error) {
                lastError =
                    error;
            }
        }

        if (!result) {
            area.innerHTML = `
                <div class="cb-empty">
                    ${
                        escapeHtml(
                            lastError
                                ?.message ||
                            'Groups API is not connected yet.'
                        )
                    }
                </div>
            `;

            return;
        }

        const groups =
            findArray(
                result,
                [
                    'groups',
                    'items',
                    'data'
                ]
            );

        if (
            !groups.length
        ) {
            area.innerHTML = `
                <div class="cb-empty">
                    No groups found.
                </div>
            `;

            return;
        }

        area.innerHTML =
            groups
                .map(group => `
                    <div class="cb-card">

                        <div class="cb-row">

                            <div>

                                <strong>
                                    ${escapeHtml(
                                        group.name ||
                                        'Group'
                                    )}
                                </strong>

                                <div
                                    style="
                                        color:#65676b;
                                        margin-top:4px;
                                    "
                                >
                                    ${escapeHtml(
                                        group.privacy ||
                                        ''
                                    )}
                                </div>

                            </div>

                        </div>

                    </div>
                `)
                .join('');
    }


    async function createGroup() {
        const name =
            document
                .getElementById(
                    'newGroupName'
                )
                ?.value
                .trim();

        const privacy =
            document
                .getElementById(
                    'newGroupPrivacy'
                )
                ?.value ||
            'public';

        if (!name) {
            showToast(
                'Enter group name'
            );

            return;
        }

        try {
            await apiRequest(
                '/groups',
                {
                    method:
                        'POST',

                    body:
                        JSON.stringify({
                            name,
                            privacy
                        })
                }
            );

            showToast(
                'Group created'
            );

            await loadGroupTab(
                'my'
            );

        } catch (error) {
            showToast(
                error.message
            );
        }
    }


    /* =====================================================
       PAGES
    ===================================================== */

    async function openPages() {
        openPanel(
            'Pages'
        );

        const content =
            panelContent();

        content.innerHTML = `
            <div class="cb-tabs">

                <button
                    class="
                        cb-tab
                        active
                    "
                    id="loadMyPages"
                >
                    My Pages
                </button>

                <button
                    class="cb-tab"
                    id="showCreatePage"
                >
                    Create Page
                </button>

            </div>

            <div id="pagesArea">
                Loading...
            </div>
        `;

        document
            .getElementById(
                'loadMyPages'
            )
            .addEventListener(
                'click',
                loadPages
            );

        document
            .getElementById(
                'showCreatePage'
            )
            .addEventListener(
                'click',
                showCreatePage
            );

        await loadPages();
    }


    async function loadPages() {
        const area =
            document.getElementById(
                'pagesArea'
            );

        area.innerHTML =
            'Loading pages...';

        const endpoints = [
            '/pages/mine',
            '/pages'
        ];

        let result = null;
        let lastError = null;

        for (
            const endpoint
            of endpoints
        ) {
            try {
                result =
                    await apiRequest(
                        endpoint
                    );

                break;

            } catch (error) {
                lastError =
                    error;
            }
        }

        if (!result) {
            area.innerHTML = `
                <div class="cb-empty">
                    ${escapeHtml(
                        lastError
                            ?.message ||
                        'Pages API is not connected yet.'
                    )}
                </div>
            `;

            return;
        }

        const pages =
            findArray(
                result,
                [
                    'pages',
                    'items',
                    'data'
                ]
            );

        if (
            !pages.length
        ) {
            area.innerHTML = `
                <div class="cb-empty">
                    No Pages yet.
                </div>
            `;

            return;
        }

        area.innerHTML =
            pages
                .map(page => `
                    <div class="cb-card">

                        <strong>
                            ${escapeHtml(
                                page.name ||
                                'Page'
                            )}
                        </strong>

                    </div>
                `)
                .join('');
    }


    function showCreatePage() {
        const area =
            document.getElementById(
                'pagesArea'
            );

        area.innerHTML = `
            <div class="cb-card">

                <h3>
                    Create Page
                </h3>

                <input
                    id="newPageName"
                    type="text"
                    placeholder="Page name"
                    style="
                        width:100%;
                        box-sizing:border-box;
                        padding:12px;
                        margin-bottom:10px;
                    "
                >

                <button
                    id="createPageButton"
                    class="
                        cb-button
                        cb-primary
                    "
                >
                    Create Page
                </button>

            </div>
        `;

        document
            .getElementById(
                'createPageButton'
            )
            .addEventListener(
                'click',
                createPage
            );
    }


    async function createPage() {
        const name =
            document
                .getElementById(
                    'newPageName'
                )
                ?.value
                .trim();

        if (!name) {
            showToast(
                'Enter page name'
            );

            return;
        }

        try {
            await apiRequest(
                '/pages',
                {
                    method:
                        'POST',

                    body:
                        JSON.stringify({
                            name
                        })
                }
            );

            showToast(
                'Page created'
            );

            await loadPages();

        } catch (error) {
            showToast(
                error.message
            );
        }
    }


    /* =====================================================
       PROFESSIONAL DASHBOARD
    ===================================================== */

    function openSimpleModal(title, html) {
        openPanel(title);
        const content = panelContent();
        if (content) {
            content.innerHTML = html;
        }
    }

    async function openDashboard(days = 28) {

        openSimpleModal(
            'Professional Dashboard',
            `
            <div class="cb-empty">
                Loading Professional Dashboard...
            </div>
            `
        );

        try {

            const response =
                await apiRequest(
                    `/professional-dashboard/overview?days=${days}`
                );

            if (
                !response ||
                response.success !== true
            ) {
                throw new Error(
                    response?.error?.message ||
                    response?.message ||
                    'Unable to load dashboard.'
                );
            }

            const data =
                response.data || {};

            const overview =
                data.overview || {};

            const insights =
                data.creatorInsights || {};

            const username =
                state.currentUser?.username ||
                'user';

            let displayName =
                username;

            if (
                typeof getDisplayName ===
                'function'
            ) {
                displayName =
                    getDisplayName(
                        state.currentUser
                    ) ||
                    username;
            }

            const engagementRate =
                insights.engagementRate === null ||
                insights.engagementRate === undefined
                    ? '—'
                    : `${insights.engagementRate}%`;

            openSimpleModal(
                'Professional Dashboard',
                `

                <div style="margin-bottom:18px;">

                    <div
                        style="
                            font-size:20px;
                            font-weight:700;
                        "
                    >
                        ${escapeHtml(displayName)}
                    </div>

                    <div
                        style="
                            color:#65676b;
                            margin-top:4px;
                        "
                    >
                        @${escapeHtml(username)}
                    </div>

                </div>


                <div class="cb-tabs">

                    <button
                        type="button"
                        class="cb-tab ${days === 7 ? 'active' : ''}"
                        data-dashboard-days="7"
                    >
                        7 Days
                    </button>

                    <button
                        type="button"
                        class="cb-tab ${days === 28 ? 'active' : ''}"
                        data-dashboard-days="28"
                    >
                        28 Days
                    </button>

                    <button
                        type="button"
                        class="cb-tab ${days === 90 ? 'active' : ''}"
                        data-dashboard-days="90"
                    >
                        90 Days
                    </button>

                </div>


                <h3>Account Overview</h3>

                <div class="dashboard-grid">

                    ${dashboardCard(
                        'Posts',
                        overview.posts
                    )}

                    ${dashboardCard(
                        'Friends',
                        overview.friends
                    )}

                    ${dashboardCard(
                        'Followers',
                        overview.followers
                    )}

                    ${dashboardCard(
                        'Following',
                        overview.following
                    )}

                    ${dashboardCard(
                        'Groups',
                        overview.groups
                    )}

                    ${dashboardCard(
                        'Pages',
                        overview.pages
                    )}

                </div>


                <h3 style="margin-top:25px;">
                    Creator Insights
                </h3>

                <div class="dashboard-grid">

                    ${dashboardCard(
                        'Reach',
                        insights.reach
                    )}

                    ${dashboardCard(
                        'Impressions',
                        insights.impressions
                    )}

                    ${dashboardCard(
                        'Profile Views',
                        insights.profileViews
                    )}

                    ${dashboardCard(
                        'Engagements',
                        insights.totalEngagement
                    )}

                    ${dashboardCard(
                        'Engagement Rate',
                        engagementRate,
                        false
                    )}

                </div>


                <h3 style="margin-top:25px;">
                    Engagement
                </h3>

                <div class="dashboard-grid">

                    ${dashboardCard(
                        'Reactions',
                        insights.reactions
                    )}

                    ${dashboardCard(
                        'Comments',
                        insights.comments
                    )}

                    ${dashboardCard(
                        'Shares',
                        insights.shares
                    )}

                    ${dashboardCard(
                        'Saves',
                        insights.saves
                    )}

                </div>


                <h3 style="margin-top:25px;">
                    Follower Growth
                </h3>

                <div class="dashboard-grid">

                    ${dashboardCard(
                        'Gained',
                        insights.followersGained
                    )}

                    ${dashboardCard(
                        'Lost',
                        insights.followersLost
                    )}

                    ${dashboardCard(
                        'Net Growth',
                        insights.netFollowerGrowth
                    )}

                </div>


                <div
                    class="cb-card"
                    style="
                        margin-top:22px;
                        color:#65676b;
                    "
                >
                    Reach and Impressions show actual
                    analytics data. If no tracking data
                    has been collected yet, they will
                    show 0.
                </div>

                `
            );


            const content =
                panelContent();

            content
                ?.querySelectorAll(
                    '[data-dashboard-days]'
                )
                .forEach(
                    button => {

                        button.addEventListener(
                            'click',
                            () => {

                                const nextDays =
                                    Number(
                                        button.dataset
                                            .dashboardDays
                                    );

                                openDashboard(
                                    nextDays
                                );
                            }
                        );
                    }
                );


        } catch (error) {

            console.error(
                'Professional Dashboard error:',
                error
            );

            openSimpleModal(
                'Professional Dashboard',
                `
                <div class="cb-empty">
                    ${escapeHtml(
                        error.message ||
                        'Unable to load dashboard.'
                    )}
                </div>
                `
            );
        }
    }


    function dashboardCard(
        label,
        value,
        numeric = true
    ) {

        const safeValue =
            numeric
                ? Number(value || 0)
                : (
                    value === undefined ||
                    value === null
                        ? '—'
                        : value
                );

        return `
            <div class="dashboard-stat">

                <div>
                    ${escapeHtml(label)}
                </div>

                <div class="dashboard-number">
                    ${escapeHtml(
                        String(safeValue)
                    )}
                </div>

            </div>
        `;
    }


    /* =====================================================
       SETTINGS & PRIVACY
    ===================================================== */

    function openSettings() {
        openPanel(
            'Settings & Privacy'
        );

        const content =
            panelContent();

        content.innerHTML = `
            <div class="settings-row">

                <strong>
                    Account
                </strong>

                <p>
                    Signed in as
                    ${escapeHtml(
                        getDisplayName(
                            state.currentUser
                        )
                    )}
                </p>

            </div>

            <div class="settings-row">

                <strong>
                    Post Privacy
                </strong>

                <p>
                    Default post visibility
                </p>

                <select
                    id="defaultPrivacySetting"
                    style="
                        padding:10px;
                        width:220px;
                    "
                >
                    <option value="public">
                        Public
                    </option>

                    <option value="friends">
                        Friends
                    </option>

                    <option value="only_me">
                        Only Me
                    </option>
                </select>

            </div>

            <div class="settings-row">

                <strong>
                    Language
                </strong>

                <p>
                    Interface language
                </p>

                <select
                    id="interfaceLanguageSetting"
                    style="
                        padding:10px;
                        width:220px;
                    "
                >
                    <option value="en">
                        English
                    </option>

                    <option value="bn">
                        বাংলা
                    </option>

                    <option value="ar">
                        العربية
                    </option>

                    <option value="hi">
                        हिन्दी
                    </option>

                    <option value="ur">
                        اردو
                    </option>
                </select>

            </div>

            <div class="settings-row">

                <strong>
                    Privacy & Security
                </strong>

                <p>
                    Friend requests, followers,
                    blocked users and account
                    security settings will be
                    managed from here.
                </p>

            </div>
        `;
    }


    /* =====================================================
       BIND ALL 6 SIDEBAR BUTTONS
    ===================================================== */

    function bindSidebarFeatures() {

        const groupsButton =
            sidebarButton(
                'groups'
            );

        const pagesButton =
            sidebarButton(
                'pages'
            );

        const savedButton =
            sidebarButton(
                'saved'
            );

        const notificationsButton =
            sidebarButton(
                'notifications'
            );

        const dashboardButton =
            sidebarButton(
                'professional dashboard'
            );

        const settingsButton =
            sidebarButton(
                'settings & privacy'
            );


        groupsButton
            ?.addEventListener(
                'click',
                openGroups
            );


        pagesButton
            ?.addEventListener(
                'click',
                openPages
            );


        savedButton
            ?.addEventListener(
                'click',
                openSaved
            );


        notificationsButton
            ?.addEventListener(
                'click',
                openNotifications
            );


        dashboardButton
            ?.addEventListener(
                'click',
                openDashboard
            );


        settingsButton
            ?.addEventListener(
                'click',
                openSettings
            );


        console.log(
            'CIRKLEBOOK SIDEBAR READY'
        );
    }


    if (
        document.readyState ===
        'loading'
    ) {
        document.addEventListener(
            'DOMContentLoaded',
            bindSidebarFeatures
        );
    } else {
        bindSidebarFeatures();
    }


    /* =====================================================
       CIRKLEBOOK POST IMPRESSION TRACKING
    ===================================================== */

    function setupPostImpressionTracking() {

        if (
            !('IntersectionObserver' in window)
        ) {
            console.warn(
                'IntersectionObserver not supported.'
            );

            return;
        }


        const observedElements =
            new WeakSet();

        const sentPostIds =
            new Set();

        const visibilityTimers =
            new WeakMap();


        async function recordPostImpression(
            element
        ) {

            const postId =
                element?.dataset?.post;


            if (
                !postId ||
                sentPostIds.has(postId)
            ) {
                return;
            }


            sentPostIds.add(
                postId
            );


            try {

                await apiRequest(
                    '/analytics/events',
                    {
                        method: 'POST',

                        body:
                            JSON.stringify({
                                eventType:
                                    'post.impression',

                                targetId:
                                    postId
                            })
                    }
                );

            } catch (error) {

                /*
                 * Analytics must never break
                 * normal feed usage.
                 */

                console.debug(
                    'Post analytics skipped:',
                    error?.message ||
                    error
                );
            }
        }


        const observer =
            new IntersectionObserver(

                entries => {

                    for (
                        const entry
                        of entries
                    ) {

                        const element =
                            entry.target;


                        if (
                            entry.isIntersecting &&
                            entry.intersectionRatio >= 0.5
                        ) {

                            if (
                                visibilityTimers.has(
                                    element
                                )
                            ) {
                                continue;
                            }


                            const timer =
                                setTimeout(
                                    () => {

                                        visibilityTimers.delete(
                                            element
                                        );


                                        if (
                                            entry.isIntersecting
                                        ) {

                                            recordPostImpression(
                                                element
                                            );
                                        }

                                    },
                                    1000
                                );


                            visibilityTimers.set(
                                element,
                                timer
                            );

                        } else {

                            const timer =
                                visibilityTimers.get(
                                    element
                                );


                            if (timer) {

                                clearTimeout(
                                    timer
                                );

                                visibilityTimers.delete(
                                    element
                                );
                            }
                        }
                    }
                },

                {
                    threshold: [0.5]
                }
            );


        function observePosts() {

            document
                .querySelectorAll(
                    '.card.post[data-post]'
                )
                .forEach(
                    element => {

                        if (
                            observedElements.has(
                                element
                            )
                        ) {
                            return;
                        }


                        observedElements.add(
                            element
                        );

                        observer.observe(
                            element
                        );
                    }
                );
        }


        const mutationObserver =
            new MutationObserver(
                observePosts
            );


        function startTracking() {

            observePosts();


            mutationObserver.observe(
                document.body,
                {
                    childList: true,
                    subtree: true
                }
            );


            console.log(
                'CIRKLEBOOK POST ANALYTICS READY'
            );
        }


        if (
            document.readyState ===
            'loading'
        ) {

            document.addEventListener(
                'DOMContentLoaded',
                startTracking,
                {
                    once: true
                }
            );

        } else {

            startTracking();
        }
    }


    setupPostImpressionTracking();




    /* =====================================================
       CIRKLEBOOK PROFILE VIEW TRACKING
    ===================================================== */

    function setupProfileViewTracking() {

        document.addEventListener(
            'click',
            async event => {

                const clicked =
                    event.target.closest(
                        '.card.post .avatar, .card.post strong'
                    );


                if (!clicked) {
                    return;
                }


                const postElement =
                    clicked.closest(
                        '.card.post[data-author-id]'
                    );


                if (!postElement) {
                    return;
                }


                const userId =
                    postElement.dataset.authorId;


                if (!userId) {
                    return;
                }


                const currentUserId =
                    state.currentUser?.id ||
                    state.currentUser?.user_id ||
                    null;


                if (
                    currentUserId &&
                    String(currentUserId) ===
                    String(userId)
                ) {
                    return;
                }


                try {

                    await apiRequest(
                        '/analytics/events',
                        {
                            method: 'POST',

                            body:
                                JSON.stringify({
                                    eventType:
                                        'profile.view',

                                    targetId:
                                        userId
                                })
                        }
                    );

                } catch (error) {

                    console.debug(
                        'Profile view analytics skipped:',
                        error?.message ||
                        error
                    );
                }
            }
        );


        console.log(
            'CIRKLEBOOK PROFILE VIEW TRACKING READY'
        );
    }


    setupProfileViewTracking();




    /* =====================================================
       CIRKLEBOOK FRIEND FOLLOW BUTTONS
    ===================================================== */

    function setupFriendFollowButtons() {

        function getUserIdFromButton(button) {

            if (!button) {
                return null;
            }


            const direct =
                button.dataset?.userId ||
                button.dataset?.userid ||
                button.dataset?.id;


            if (direct) {
                return direct;
            }


            const row =
                button.closest(
                    '[data-user-id], [data-userid], [data-id]'
                );


            if (!row) {
                return null;
            }


            return (
                row.dataset?.userId ||
                row.dataset?.userid ||
                row.dataset?.id ||
                null
            );
        }


        async function refreshFollowButton(
            button,
            userId
        ) {

            try {

                const response =
                    await apiRequest(
                        `/follows/${userId}/status`
                    );


                const data =
                    response?.data ||
                    response ||
                    {};


                const isFollowing =
                    Boolean(
                        data.isFollowing ||
                        data.following ||
                        data.is_following ||
                        data.status === 'accepted' ||
                        data.status === 'active' ||
                        data.status === 'following'
                    );


                button.dataset.following =
                    isFollowing
                        ? '1'
                        : '0';


                button.textContent =
                    isFollowing
                        ? 'Unfollow'
                        : 'Follow';


                button.style.background =
                    isFollowing
                        ? '#e4e6eb'
                        : '#1877f2';


                button.style.color =
                    isFollowing
                        ? '#050505'
                        : '#ffffff';

            } catch (error) {

                button.dataset.following =
                    '0';

                button.textContent =
                    'Follow';

                button.style.background =
                    '#1877f2';

                button.style.color =
                    '#ffffff';
            }
        }


        async function toggleFollow(
            button,
            userId
        ) {

            if (
                button.dataset.loading ===
                '1'
            ) {
                return;
            }


            button.dataset.loading =
                '1';

            button.disabled =
                true;


            try {

                const following =
                    button.dataset.following ===
                    '1';


                await apiRequest(
                    `/follows/${userId}`,
                    {
                        method:
                            following
                                ? 'DELETE'
                                : 'POST'
                    }
                );


                button.dataset.following =
                    following
                        ? '0'
                        : '1';


                button.textContent =
                    following
                        ? 'Follow'
                        : 'Unfollow';


                button.style.background =
                    following
                        ? '#1877f2'
                        : '#e4e6eb';


                button.style.color =
                    following
                        ? '#ffffff'
                        : '#050505';


                showToast(
                    following
                        ? 'User unfollowed'
                        : 'User followed'
                );

            } catch (error) {

                console.error(
                    'FOLLOW ACTION ERROR:',
                    error
                );


                showToast(
                    error?.message ||
                    'Follow action failed'
                );

            } finally {

                button.disabled =
                    false;

                button.dataset.loading =
                    '0';
            }
        }


        function installButtons() {

            const allButtons =
                Array.from(
                    document.querySelectorAll(
                        'button'
                    )
                );


            const unfriendButtons =
                allButtons.filter(
                    button =>
                        button.textContent
                            ?.trim()
                            ?.toLowerCase() ===
                        'unfriend'
                );


            for (
                const unfriendButton
                of unfriendButtons
            ) {

                if (
                    unfriendButton.parentElement
                        ?.querySelector(
                            '.cb-follow-button'
                        )
                ) {
                    continue;
                }


                const userId =
                    getUserIdFromButton(
                        unfriendButton
                    );


                if (!userId) {

                    console.debug(
                        'Follow button skipped: user id not found'
                    );

                    continue;
                }


                const followButton =
                    document.createElement(
                        'button'
                    );


                followButton.type =
                    'button';


                followButton.className =
                    'cb-follow-button';


                followButton.textContent =
                    'Follow';


                followButton.style.marginRight =
                    '8px';


                followButton.style.padding =
                    '9px 14px';


                followButton.style.border =
                    '0';


                followButton.style.borderRadius =
                    '8px';


                followButton.style.fontWeight =
                    '700';


                followButton.style.cursor =
                    'pointer';


                followButton.style.background =
                    '#1877f2';


                followButton.style.color =
                    '#ffffff';


                followButton.addEventListener(
                    'click',
                    event => {

                        event.preventDefault();

                        event.stopPropagation();


                        toggleFollow(
                            followButton,
                            userId
                        );
                    }
                );


                unfriendButton.parentElement
                    .insertBefore(
                        followButton,
                        unfriendButton
                    );


                refreshFollowButton(
                    followButton,
                    userId
                );
            }
        }


        const observer =
            new MutationObserver(
                installButtons
            );


        observer.observe(
            document.body,
            {
                childList: true,
                subtree: true
            }
        );


        installButtons();


        console.log(
            'CIRKLEBOOK FRIEND FOLLOW BUTTONS READY'
        );
    }


    setupFriendFollowButtons();




    /* =====================================================
       CIRKLEBOOK TOP CONTENT UI
    ===================================================== */

    async function loadTopContent(
        days = 28
    ) {

        try {

            const response =
                await apiRequest(
                    `/professional-dashboard/top-content?days=${days}`
                );


            const data =
                response?.data ||
                response ||
                {};


            const posts =
                Array.isArray(
                    data.posts
                )
                    ? data.posts
                    : [];


            return posts;

        } catch (error) {

            console.error(
                'TOP CONTENT LOAD ERROR:',
                error
            );

            return [];
        }
    }


    function renderTopContent(
        posts
    ) {

        if (
            !Array.isArray(posts) ||
            posts.length === 0
        ) {

            return `

                <div
                    style="
                        border:1px solid #dfe3e8;
                        border-radius:12px;
                        padding:22px;
                        color:#65676b;
                        text-align:center;
                    "
                >
                    No top content data yet.
                </div>

            `;
        }


        return posts
            .map(
                (post, index) => {

                    const preview =
                        post.bodyPreview ||
                        '(No text content)';


                    return `

                        <div
                            style="
                                border:1px solid #dfe3e8;
                                border-radius:12px;
                                padding:16px;
                                margin-bottom:12px;
                                background:#fff;
                            "
                        >

                            <div
                                style="
                                    font-weight:700;
                                    font-size:16px;
                                    margin-bottom:8px;
                                "
                            >
                                #${index + 1}
                                Top Post
                            </div>


                            <div
                                style="
                                    color:#3a3b3c;
                                    margin-bottom:14px;
                                    line-height:1.5;
                                "
                            >
                                ${escapeHtml(
                                    preview
                                )}
                            </div>


                            <div
                                style="
                                    display:grid;
                                    grid-template-columns:
                                        repeat(
                                            auto-fit,
                                            minmax(
                                                110px,
                                                1fr
                                            )
                                        );
                                    gap:8px;
                                "
                            >

                                <div>
                                    <strong>
                                        ${post.reach || 0}
                                    </strong>
                                    <div
                                        style="
                                            color:#65676b;
                                            font-size:13px;
                                        "
                                    >
                                        Reach
                                    </div>
                                </div>


                                <div>
                                    <strong>
                                        ${post.impressions || 0}
                                    </strong>
                                    <div
                                        style="
                                            color:#65676b;
                                            font-size:13px;
                                        "
                                    >
                                        Impressions
                                    </div>
                                </div>


                                <div>
                                    <strong>
                                        ${post.reactions || 0}
                                    </strong>
                                    <div
                                        style="
                                            color:#65676b;
                                            font-size:13px;
                                        "
                                    >
                                        Reactions
                                    </div>
                                </div>


                                <div>
                                    <strong>
                                        ${post.comments || 0}
                                    </strong>
                                    <div
                                        style="
                                            color:#65676b;
                                            font-size:13px;
                                        "
                                    >
                                        Comments
                                    </div>
                                </div>


                                <div>
                                    <strong>
                                        ${post.shares || 0}
                                    </strong>
                                    <div
                                        style="
                                            color:#65676b;
                                            font-size:13px;
                                        "
                                    >
                                        Shares
                                    </div>
                                </div>


                                <div>
                                    <strong>
                                        ${post.saves || 0}
                                    </strong>
                                    <div
                                        style="
                                            color:#65676b;
                                            font-size:13px;
                                        "
                                    >
                                        Saves
                                    </div>
                                </div>


                                <div>
                                    <strong>
                                        ${post.engagements || 0}
                                    </strong>
                                    <div
                                        style="
                                            color:#65676b;
                                            font-size:13px;
                                        "
                                    >
                                        Engagements
                                    </div>
                                </div>

                            </div>

                        </div>

                                        `;
                }
            )
            .join('');
    }


    async function attachTopContentToDashboard(
        days = 28
    ) {

        const content =
            panelContent();


        if (!content) {
            return;
        }


        const existing =
            content.querySelector(
                '#cbTopContentSection'
            );


        if (existing) {
            existing.remove();
        }


        const posts =
            await loadTopContent(
                days
            );


        const section =
            document.createElement(
                'div'
            );


        section.id =
            'cbTopContentSection';


        section.style.marginTop =
            '22px';


        section.innerHTML =
            `

            <div
                style="
                    font-size:20px;
                    font-weight:700;
                    margin-bottom:12px;
                "
            >
                Top Content
            </div>

            ${renderTopContent(posts)}

            `;


        content.appendChild(
            section
        );
    }


    document.addEventListener(
        'click',
        event => {

            const button =
                event.target.closest(
                    '[data-dashboard-days]'
                );


            if (!button) {
                return;
            }


            const days =
                Number(
                    button.dataset
                        .dashboardDays ||
                    28
                );


            setTimeout(
                () => {

                    attachTopContentToDashboard(
                        days
                    );

                },
                300
            );
        }
    );


    const originalOpenDashboardForTopContent =
        openDashboard;


    openDashboard =
        async function (
            days = 28
        ) {

            await originalOpenDashboardForTopContent(
                days
            );


            await attachTopContentToDashboard(
                days
            );
        };


    console.log(
        'CIRKLEBOOK TOP CONTENT UI READY'
    );




    /* =====================================================
       CIRKLEBOOK AUDIENCE INSIGHTS UI
    ===================================================== */

    async function loadAudienceInsights(
        days = 28
    ) {

        try {

            const response =
                await apiRequest(
                    `/professional-dashboard/audience?days=${days}`
                );


            return (
                response?.data ||
                response ||
                {}
            );

        } catch (error) {

            console.error(
                'AUDIENCE INSIGHTS LOAD ERROR:',
                error
            );

            return {
                totalAudience: 0,
                countries: [],
                languages: [],
                devices: []
            };
        }
    }


    function renderAudienceList(
        title,
        items
    ) {

        const safeItems =
            Array.isArray(items)
                ? items
                : [];


        let rows = '';


        if (safeItems.length === 0) {

            rows =
                '<div style="color:#65676b;padding:8px 0;">No data yet.</div>';

        } else {

            rows =
                safeItems
                    .map(
                        item => {

                            const value =
                                escapeHtml(
                                    item.value ||
                                    'Unknown'
                                );


                            const count =
                                Number(
                                    item.count ||
                                    0
                                );


                            return (
                                '<div style="' +
                                    'display:flex;' +
                                    'justify-content:space-between;' +
                                    'align-items:center;' +
                                    'padding:9px 0;' +
                                    'border-bottom:1px solid #f0f2f5;' +
                                '">' +

                                    '<span>' +
                                        value +
                                    '</span>' +

                                    '<strong>' +
                                        count +
                                    '</strong>' +

                                '</div>'
                            );
                        }
                    )
                    .join('');
        }


        return (
            '<div style="' +
                'border:1px solid #dfe3e8;' +
                'border-radius:12px;' +
                'padding:16px;' +
                'background:#fff;' +
            '">' +

                '<div style="' +
                    'font-size:17px;' +
                    'font-weight:700;' +
                    'margin-bottom:8px;' +
                '">' +
                    escapeHtml(title) +
                '</div>' +

                rows +

            '</div>'
        );
    }


    async function attachAudienceInsightsToDashboard(
        days = 28
    ) {

        const content =
            panelContent();


        if (!content) {
            return;
        }


        const oldSection =
            content.querySelector(
                '#cbAudienceInsightsSection'
            );


        if (oldSection) {
            oldSection.remove();
        }


        const data =
            await loadAudienceInsights(
                days
            );


        const section =
            document.createElement(
                'div'
            );


        section.id =
            'cbAudienceInsightsSection';


        section.style.marginTop =
            '22px';


        section.innerHTML =
            '<div style="' +
                'font-size:20px;' +
                'font-weight:700;' +
                'margin-bottom:12px;' +
            '">' +
                'Audience Insights' +
            '</div>' +

            '<div style="' +
                'border:1px solid #dfe3e8;' +
                'border-radius:12px;' +
                'padding:16px;' +
                'margin-bottom:12px;' +
                'background:#fff;' +
            '">' +

                '<div style="color:#65676b;">Unique Audience</div>' +

                '<div style="' +
                    'font-size:28px;' +
                    'font-weight:700;' +
                    'margin-top:4px;' +
                '">' +
                    Number(
                        data.totalAudience ||
                        0
                    ) +
                '</div>' +

            '</div>' +

            '<div style="' +
                'display:grid;' +
                'grid-template-columns:' +
                    'repeat(auto-fit,minmax(220px,1fr));' +
                'gap:12px;' +
            '">' +

                renderAudienceList(
                    'Countries',
                    data.countries
                ) +

                renderAudienceList(
                    'Languages',
                    data.languages
                ) +

                renderAudienceList(
                    'Devices',
                    data.devices
                ) +

            '</div>' +

            '<div style="' +
                'margin-top:12px;' +
                'color:#65676b;' +
                'font-size:13px;' +
            '">' +
                'Audience counts are privacy-safe analytics estimates based on valid post impressions.' +
            '</div>';


        content.appendChild(
            section
        );
    }


    document.addEventListener(
        'click',
        event => {

            const button =
                event.target.closest(
                    '[data-dashboard-days]'
                );


            if (!button) {
                return;
            }


            const days =
                Number(
                    button.dataset.dashboardDays ||
                    28
                );


            setTimeout(
                () => {

                    attachAudienceInsightsToDashboard(
                        days
                    );

                },
                350
            );
        }
    );


    const originalOpenDashboardForAudience =
        openDashboard;


    openDashboard =
        async function (
            days = 28
        ) {

            await originalOpenDashboardForAudience(
                days
            );


            await attachAudienceInsightsToDashboard(
                days
            );
        };


    console.log(
        'CIRKLEBOOK AUDIENCE INSIGHTS UI READY'
    );




    /* =====================================================
       CIRKLEBOOK ACTIVE DEVICES UI
    ===================================================== */

    function cbEscapeDeviceText(value) {

        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }


    function cbDeviceName(userAgent) {

        const ua =
            String(userAgent || '');

        let browser =
            'Unknown browser';

        let os =
            'Unknown device';


        if (/Edg\//i.test(ua)) {
            browser = 'Microsoft Edge';
        } else if (/Chrome\//i.test(ua)) {
            browser = 'Google Chrome';
        } else if (/Firefox\//i.test(ua)) {
            browser = 'Mozilla Firefox';
        } else if (/Safari\//i.test(ua)) {
            browser = 'Safari';
        }


        if (/Windows/i.test(ua)) {
            os = 'Windows';
        } else if (/Android/i.test(ua)) {
            os = 'Android';
        } else if (/iPhone|iPad|iOS/i.test(ua)) {
            os = 'iPhone / iPad';
        } else if (/Mac OS|Macintosh/i.test(ua)) {
            os = 'Mac';
        } else if (/Linux/i.test(ua)) {
            os = 'Linux';
        }


        return browser + ' on ' + os;
    }


    function cbFormatSessionDate(value) {

        if (!value) {
            return 'Unknown';
        }


        const date =
            new Date(value);


        if (
            Number.isNaN(
                date.getTime()
            )
        ) {

            return 'Unknown';
        }


        return date.toLocaleString();
    }


    async function cbLoadSessions() {

        try {

            const response =
                await apiRequest(
                    '/auth/sessions'
                );


            return (
                response?.data?.sessions ||
                response?.sessions ||
                []
            );

        } catch (error) {

            console.error(
                'ACTIVE DEVICES LOAD ERROR:',
                error
            );

            return [];
        }
    }


    async function cbRevokeSession(
        sessionId
    ) {

        await apiRequest(
            '/auth/sessions/' +
            encodeURIComponent(sessionId),
            {
                method: 'DELETE'
            }
        );
    }


    async function cbRevokeOtherSessions() {

        return apiRequest(
            '/auth/sessions/revoke-others',
            {
                method: 'POST'
            }
        );
    }


    function cbSessionCard(session) {

        const current =
            Boolean(
                session.current
            );


        const device =
            cbEscapeDeviceText(
                cbDeviceName(
                    session.userAgent
                )
            );


        const ip =
            cbEscapeDeviceText(
                session.ipAddress ||
                'Unknown'
            );


        const lastUsed =
            cbEscapeDeviceText(
                cbFormatSessionDate(
                    session.lastUsedAt
                )
            );


        let action = '';


        if (current) {

            action =
                '<span style="' +
                'display:inline-block;' +
                'padding:7px 11px;' +
                'border-radius:8px;' +
                'background:#e7f3ff;' +
                'color:#1877f2;' +
                'font-weight:700;' +
                'font-size:13px;' +
                '">' +
                'This device' +
                '</span>';

        } else {

            action =
                '<button ' +
                'type="button" ' +
                'data-cb-revoke-session="' +
                cbEscapeDeviceText(
                    session.id
                ) +
                '" ' +
                'style="' +
                'border:0;' +
                'border-radius:8px;' +
                'padding:8px 13px;' +
                'background:#fee2e2;' +
                'color:#b91c1c;' +
                'font-weight:700;' +
                'cursor:pointer;' +
                '">' +
                'Log out' +
                '</button>';
        }


        return (
            '<div style="' +
            'border:1px solid #dfe3e8;' +
            'border-radius:12px;' +
            'padding:15px;' +
            'margin-bottom:10px;' +
            'background:#fff;' +
            '">' +

                '<div style="' +
                'display:flex;' +
                'justify-content:space-between;' +
                'gap:16px;' +
                'align-items:flex-start;' +
                '">' +

                    '<div style="min-width:0;">' +

                        '<div style="' +
                        'font-weight:700;' +
                        'font-size:16px;' +
                        'margin-bottom:6px;' +
                        '">' +
                        device +
                        '</div>' +

                        '<div style="' +
                        'font-size:13px;' +
                        'color:#65676b;' +
                        'line-height:1.6;' +
                        '">' +
                        'IP: ' + ip +
                        '<br>' +
                        'Last active: ' +
                        lastUsed +
                        '</div>' +

                    '</div>' +

                    '<div>' +
                    action +
                    '</div>' +

                '</div>' +

            '</div>'
        );
    }


    async function cbRenderActiveDevices() {

        const content =
            panelContent();


        if (!content) {
            return;
        }


        const old =
            content.querySelector(
                '#cbActiveDevicesSection'
            );


        if (old) {
            old.remove();
        }


        const section =
            document.createElement(
                'div'
            );


        section.id =
            'cbActiveDevicesSection';


        section.style.marginTop =
            '22px';


        section.innerHTML =
            '<div style="' +
            'font-size:20px;' +
            'font-weight:700;' +
            'margin-bottom:5px;' +
            '">' +
            'Security and Login' +
            '</div>' +

            '<div style="' +
            'color:#65676b;' +
            'margin-bottom:16px;' +
            '">' +
            'Where you are logged in' +
            '</div>' +

            '<div id="cbActiveDevicesList">' +
            '<div style="' +
            'padding:20px;' +
            'color:#65676b;' +
            'text-align:center;' +
            '">' +
            'Loading active devices...' +
            '</div>' +
            '</div>';


        content.appendChild(
            section
        );


        const sessions =
            await cbLoadSessions();


        const list =
            section.querySelector(
                '#cbActiveDevicesList'
            );


        if (!list) {
            return;
        }


        if (
            !Array.isArray(sessions) ||
            sessions.length === 0
        ) {

            list.innerHTML =
                '<div style="' +
                'border:1px solid #dfe3e8;' +
                'border-radius:12px;' +
                'padding:18px;' +
                'color:#65676b;' +
                '">' +
                'No active session data available.' +
                '</div>';

            return;
        }


        list.innerHTML =
            sessions
                .map(cbSessionCard)
                .join('');


        const otherSessions =
            sessions.filter(
                session =>
                    !session.current
            );


        if (
            otherSessions.length > 0
        ) {

            const controls =
                document.createElement(
                    'div'
                );


            controls.style.marginTop =
                '14px';


            controls.innerHTML =
                '<button ' +
                'type="button" ' +
                'id="cbLogoutOtherDevices" ' +
                'style="' +
                'border:0;' +
                'border-radius:9px;' +
                'padding:11px 16px;' +
                'background:#dc2626;' +
                'color:white;' +
                'font-weight:700;' +
                'cursor:pointer;' +
                '">' +
                'Log out of all other devices' +
                '</button>';


            section.appendChild(
                controls
            );
        }
    }


    document.addEventListener(
        'click',
        async function(event) {

            const revokeButton =
                event.target.closest(
                    '[data-cb-revoke-session]'
                );


            if (revokeButton) {

                const sessionId =
                    revokeButton.getAttribute(
                        'data-cb-revoke-session'
                    );


                const confirmed =
                    window.confirm(
                        'Log out this device?'
                    );


                if (!confirmed) {
                    return;
                }


                revokeButton.disabled =
                    true;


                try {

                    await cbRevokeSession(
                        sessionId
                    );


                    showToast(
                        'Device logged out'
                    );


                    await cbRenderActiveDevices();

                } catch (error) {

                    console.error(
                        'SESSION REVOKE ERROR:',
                        error
                    );


                    showToast(
                        'Could not log out device'
                    );


                    revokeButton.disabled =
                        false;
                }


                return;
            }


            const logoutOthers =
                event.target.closest(
                    '#cbLogoutOtherDevices'
                );


            if (logoutOthers) {

                const confirmed =
                    window.confirm(
                        'Log out of all other devices?'
                    );


                if (!confirmed) {
                    return;
                }


                logoutOthers.disabled =
                    true;


                try {

                    const response =
                        await cbRevokeOtherSessions();


                    const count =
                        Number(
                            response?.data?.revoked ||
                            0
                        );


                    showToast(
                        count +
                        ' other session(s) logged out'
                    );


                    await cbRenderActiveDevices();

                } catch (error) {

                    console.error(
                        'REVOKE OTHER SESSIONS ERROR:',
                        error
                    );


                    showToast(
                        'Could not log out other devices'
                    );


                    logoutOthers.disabled =
                        false;
                }
            }
        }
    );


    const cbOriginalOpenSettings =
        openSettings;


    openSettings =
        async function() {

            await cbOriginalOpenSettings();


            setTimeout(
                function() {

                    cbRenderActiveDevices();

                },
                250
            );
        };


    console.log(
        'CIRKLEBOOK ACTIVE DEVICES UI READY'
    );


})();





/* =========================================================
   CIRKLEBOOK REAL BACKEND LOGOUT V1
   Real Logout -> Backend Session Revocation
========================================================= */

(function () {

  let logoutRunning = false;


  function isExactLogoutElement(element) {

    if (!element) {
      return false;
    }

    const clickable =
      element.closest(
        'button, a, [role="button"], [data-action]'
      );

    if (!clickable) {
      return false;
    }

    const action =
      String(
        clickable.dataset?.action || ''
      )
        .trim()
        .toLowerCase();


    if (
      action === 'logout' ||
      action === 'log-out'
    ) {
      return clickable;
    }


    const text =
      String(
        clickable.textContent || ''
      )
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();


    /*
     * Exact logout only.
     *
     * This deliberately DOES NOT match:
     * "Log out this device"
     * "Log out all other devices"
     */
    if (
      text === 'logout' ||
      text === 'log out'
    ) {
      return clickable;
    }


    return false;
  }


  async function performRealLogout() {

    if (logoutRunning) {
      return;
    }

    logoutRunning = true;


    try {

      const response =
        await fetch(
          '/api/v1/auth/logout',
          {
            method: 'POST',

            credentials: 'include',

            headers: {
              'Accept': 'application/json'
            }
          }
        );


      /*
       * Logout should still finish locally if the
       * session was already expired/revoked.
       */
      if (
        !response.ok &&
        response.status !== 401
      ) {

        let message =
          'Logout request failed';


        try {

          const body =
            await response.json();

          message =
            body?.error?.message ||
            body?.message ||
            message;

        } catch {
          // Ignore invalid JSON.
        }


        console.error(
          'CIRKLEBOOK LOGOUT ERROR:',
          response.status,
          message
        );
      }

    } catch (error) {

      /*
       * Do not trap the user inside the application
       * just because the network is unavailable.
       */
      console.error(
        'CIRKLEBOOK LOGOUT NETWORK ERROR:',
        error
      );

    } finally {

      /*
       * Clear only client-side auth/session state.
       * HttpOnly refresh cookie is cleared by backend.
       */

      try {

        sessionStorage.removeItem(
          'cirklebook_access_token'
        );

        sessionStorage.removeItem(
          'accessToken'
        );

        sessionStorage.removeItem(
          'access_token'
        );

        localStorage.removeItem(
          'cirklebook_access_token'
        );

        localStorage.removeItem(
          'accessToken'
        );

        localStorage.removeItem(
          'access_token'
        );

      } catch (error) {

        console.error(
          'Logout local cleanup warning:',
          error
        );
      }


      window.location.href = '/';
    }
  }


  /*
   * Capture phase is intentional.
   *
   * It runs before an older logout handler that may
   * immediately redirect without calling backend.
   */
  document.addEventListener(
    'click',
    function (event) {

      const logoutElement =
        isExactLogoutElement(
          event.target
        );


      if (!logoutElement) {
        return;
      }


      event.preventDefault();

      event.stopPropagation();

      event.stopImmediatePropagation();


      performRealLogout();

    },
    true
  );


  /*
   * Also expose it for future UI code.
   */
})();

/* =========================================================
   CIRKLEBOOK — CANONICAL LOGOUT
   ONE LOGOUT HANDLER ONLY
========================================================= */

async function cirkleBookLogout() {
  const accessToken = getAccessToken();

  if (!accessToken) {
    console.error('Logout: access token not found');
    return;
  }

  try {
    const response = await fetch(
      '/api/v1/auth/logout',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include'
      }
    );

    const body = await response
      .json()
      .catch(() => null);

    console.log(
      'Cirklebook Logout:',
      response.status,
      body
    );

    if (!response.ok) {
      alert(
        'Logout failed. Backend returned HTTP ' +
        response.status
      );
      return;
    }

    clearAccessToken();

    window.location.href = '/';
  } catch (error) {
    console.error(
      'Logout request failed:',
      error
    );

    alert(
      'Logout request could not reach the backend.'
    );
  }
}

/*
 * The Cirklebook UI already calls cbLogout.
 * Point it to the ONE canonical logout function.
 */
window.cbLogout = cirkleBookLogout;


/*
 * Fallback for any Logout button that does not
 * directly call window.cbLogout.
 */
document.addEventListener(
  'click',
  function (event) {
    const element = event.target.closest(
      'button, a, [role="button"]'
    );

    if (!element) return;

    const label = String(
      element.textContent || ''
    )
      .trim()
      .toLowerCase();

    if (
      label !== 'logout' &&
      label !== 'log out'
    ) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    cirkleBookLogout();
  },
  true
);
/* =========================================================
   CIRKLEBOOK — PROFILE VIEW + EDIT
========================================================= */

(function setupCirklebookProfile() {
  const profileButton =
    document.getElementById('profileButton');

  if (!profileButton) {
    console.warn('Profile button not found');
    return;
  }

  const API =
    '/api/v1/users/me/profile';

  function profileToken() {
    try {
      if (typeof getAccessToken === 'function') {
        return getAccessToken();
      }
    } catch (_) {}

    return localStorage.getItem(
      'cirklebook_access_token'
    );
  }

  function escapeProfileHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function closeProfileModal() {
    const old =
      document.getElementById(
        'cirklebookProfileModal'
      );

    if (old) old.remove();
  }

  async function loadProfile() {
    const token = profileToken();

    if (!token) {
      throw new Error(
        'Access token not found'
      );
    }

    const response = await fetch(API, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json'
      },
      credentials: 'include'
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result?.message ||
        result?.error?.message ||
        'Could not load profile'
      );
    }

    return (
      result?.data?.profile ||
      result?.data ||
      result?.profile ||
      result
    );
  }

  async function saveProfile(data) {
    const token = profileToken();

    const response = await fetch(API, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify(data)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result?.message ||
        result?.error?.message ||
        'Could not update profile'
      );
    }

    return result;
  }

  function createProfileModal(profile) {
    closeProfileModal();

    const displayName =
      profile?.displayName ||
      profile?.display_name ||
      'Cirklebook User';

    const bio =
      profile?.bio || '';

    const website =
      profile?.website || '';

    const location =
      profile?.locationText ||
      profile?.profile_location_text ||
      '';

    const dateOfBirth =
      profile?.dateOfBirth ||
      profile?.profile_date_of_birth ||
      '';

    const visibility =
      profile?.profileVisibility ||
      profile?.profile_visibility ||
      'public';

    const modal =
      document.createElement('div');

    modal.id =
      'cirklebookProfileModal';

    modal.innerHTML = `
      <div style="
        position:fixed;
        inset:0;
        background:rgba(0,0,0,.55);
        z-index:99998;
        display:flex;
        align-items:center;
        justify-content:center;
        padding:20px;
      ">
        <div style="
          width:min(720px,96vw);
          max-height:90vh;
          overflow:auto;
          background:#fff;
          border-radius:16px;
          box-shadow:0 20px 60px rgba(0,0,0,.25);
        ">
          <div style="
            display:flex;
            justify-content:space-between;
            align-items:center;
            padding:18px 22px;
            border-bottom:1px solid #ddd;
          ">
            <h2 style="margin:0;">
              Profile
            </h2>

            <button
              id="cbProfileClose"
              type="button"
              style="
                border:0;
                width:40px;
                height:40px;
                border-radius:50%;
                font-size:26px;
                cursor:pointer;
              "
            >×</button>
          </div>

          <div style="padding:24px;">

            <div style="
              display:flex;
              align-items:center;
              gap:16px;
              margin-bottom:24px;
            ">
              <div style="
                width:72px;
                height:72px;
                border-radius:50%;
                background:#4267e9;
                color:#fff;
                display:flex;
                align-items:center;
                justify-content:center;
                font-size:30px;
                font-weight:700;
              ">
                ${escapeProfileHtml(
                  displayName.charAt(0).toUpperCase()
                )}
              </div>

              <div>
                <h2 style="margin:0 0 5px;">
                  ${escapeProfileHtml(displayName)}
                </h2>
                <div style="color:#666;">
                  My Cirklebook Profile
                </div>
              </div>
            </div>

            <form id="cbProfileForm">

              <label style="font-weight:600;">
                Display Name
              </label>
              <input
                id="cbProfileDisplayName"
                value="${escapeProfileHtml(displayName)}"
                style="
                  width:100%;
                  box-sizing:border-box;
                  margin:6px 0 16px;
                  padding:11px;
                  border:1px solid #ccc;
                  border-radius:8px;
                "
              >

              <label style="font-weight:600;">
                Bio
              </label>
              <textarea
                id="cbProfileBio"
                rows="4"
                style="
                  width:100%;
                  box-sizing:border-box;
                  margin:6px 0 16px;
                  padding:11px;
                  border:1px solid #ccc;
                  border-radius:8px;
                  resize:vertical;
                "
              >${escapeProfileHtml(bio)}</textarea>

              <label style="font-weight:600;">
                Website
              </label>
              <input
                id="cbProfileWebsite"
                value="${escapeProfileHtml(website)}"
                style="
                  width:100%;
                  box-sizing:border-box;
                  margin:6px 0 16px;
                  padding:11px;
                  border:1px solid #ccc;
                  border-radius:8px;
                "
              >

              <label style="font-weight:600;">
                Location
              </label>
              <input
                id="cbProfileLocation"
                value="${escapeProfileHtml(location)}"
                style="
                  width:100%;
                  box-sizing:border-box;
                  margin:6px 0 16px;
                  padding:11px;
                  border:1px solid #ccc;
                  border-radius:8px;
                "
              >

              <label style="font-weight:600;">
                Date of Birth
              </label>
              <input
                id="cbProfileDateOfBirth"
                type="date"
                value="${escapeProfileHtml(
                  String(dateOfBirth).slice(0,10)
                )}"
                style="
                  width:100%;
                  box-sizing:border-box;
                  margin:6px 0 16px;
                  padding:11px;
                  border:1px solid #ccc;
                  border-radius:8px;
                "
              >

              <label style="font-weight:600;">
                Profile Visibility
              </label>
              <select
                id="cbProfileVisibility"
                style="
                  width:100%;
                  box-sizing:border-box;
                  margin:6px 0 22px;
                  padding:11px;
                  border:1px solid #ccc;
                  border-radius:8px;
                "
              >
                <option value="public"
                  ${visibility === 'public' ? 'selected' : ''}>
                  Public
                </option>

                <option value="friends"
                  ${visibility === 'friends' ? 'selected' : ''}>
                  Friends
                </option>

                <option value="private"
                  ${visibility === 'private' ? 'selected' : ''}>
                  Private
                </option>
              </select>

              <button
                id="cbProfileSave"
                type="submit"
                style="
                  width:100%;
                  border:0;
                  border-radius:8px;
                  padding:13px;
                  background:#1877f2;
                  color:#fff;
                  font-size:16px;
                  font-weight:700;
                  cursor:pointer;
                "
              >
                Save Profile
              </button>

              <div
                id="cbProfileMessage"
                style="
                  margin-top:12px;
                  text-align:center;
                "
              ></div>

            </form>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    document
      .getElementById('cbProfileClose')
      .addEventListener(
        'click',
        closeProfileModal
      );

    document
      .getElementById('cbProfileForm')
      .addEventListener(
        'submit',
        async function (event) {
          event.preventDefault();

          const saveButton =
            document.getElementById(
              'cbProfileSave'
            );

          const message =
            document.getElementById(
              'cbProfileMessage'
            );

          saveButton.disabled = true;
          saveButton.textContent =
            'Saving...';

          message.textContent = '';

          try {
            await saveProfile({
              displayName:
                document.getElementById(
                  'cbProfileDisplayName'
                ).value.trim(),

              bio:
                document.getElementById(
                  'cbProfileBio'
                ).value.trim(),

              website:
                document.getElementById(
                  'cbProfileWebsite'
                ).value.trim(),

              locationText:
                document.getElementById(
                  'cbProfileLocation'
                ).value.trim(),

              dateOfBirth:
                document.getElementById(
                  'cbProfileDateOfBirth'
                ).value || null,

              profileVisibility:
                document.getElementById(
                  'cbProfileVisibility'
                ).value
            });

            message.style.color =
              'green';

            message.textContent =
              'Profile updated successfully';

            setTimeout(
              async () => {
                const fresh =
                  await loadProfile();

                createProfileModal(
                  fresh
                );
              },
              700
            );

          } catch (error) {
            message.style.color =
              'red';

            message.textContent =
              error.message;
          } finally {
            saveButton.disabled = false;
            saveButton.textContent =
              'Save Profile';
          }
        }
      );
  }

  async function openProfile() {
    try {
      const profile =
        await loadProfile();

      createProfileModal(profile);

    } catch (error) {
      alert(
        'Profile could not be loaded: ' +
        error.message
      );
    }
  }

  profileButton.addEventListener(
    'click',
    function (event) {
      event.preventDefault();
      event.stopPropagation();

      openProfile();

      const accountMenu =
        document.getElementById(
          'accountMenu'
        );

      if (accountMenu) {
        accountMenu.classList.add(
          'hidden'
        );
      }
    }
  );

})();
/* CIRKLEBOOK — LEGACY PROFILE ROUTING REMOVED IN FINAL CORRECTION */
/* =========================================================
   CIRKLEBOOK — PROFILE SAVE FINAL VALIDATION FIX
   Profile fields -> /me/profile
   Visibility     -> /me/privacy
========================================================= */

document.addEventListener(
  'submit',
  async function (event) {
    if (!event.target.matches('#cbProfileForm')) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const saveButton =
      document.getElementById('cbProfileSave');

    const message =
      document.getElementById('cbProfileMessage');

    const token =
      typeof getAccessToken === 'function'
        ? getAccessToken()
        : localStorage.getItem(
            'cirklebook_access_token'
          );

    if (!token) {
      message.style.color = 'red';
      message.textContent =
        'Access token not found';
      return;
    }

    saveButton.disabled = true;
    saveButton.textContent = 'Saving...';

    message.textContent = '';

    try {
      /* -----------------------------------------
         1. PROFILE DATA
      ----------------------------------------- */

      const profilePayload = {
        displayName:
          document
            .getElementById(
              'cbProfileDisplayName'
            )
            .value.trim(),

        bio:
          document
            .getElementById(
              'cbProfileBio'
            )
            .value.trim(),

        website:
          document
            .getElementById(
              'cbProfileWebsite'
            )
            .value.trim(),

        locationText:
          document
            .getElementById(
              'cbProfileLocation'
            )
            .value.trim(),

        dateOfBirth:
          document
            .getElementById(
              'cbProfileDateOfBirth'
            )
            .value || null
      };

      const profileResponse = await fetch(
        '/api/v1/users/me/profile',
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Accept: 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify(profilePayload)
        }
      );

      const profileResult =
        await profileResponse.json();

      if (!profileResponse.ok) {
        throw new Error(
          profileResult?.message ||
          profileResult?.error?.message ||
          'Profile update failed'
        );
      }

      /* -----------------------------------------
         2. PROFILE VISIBILITY
      ----------------------------------------- */

      let visibility =
        document.getElementById(
          'cbProfileVisibility'
        ).value;

      /*
        Backend accepts:
        public / friends / only_me

        Old UI may contain "private".
      */
      if (visibility === 'private') {
        visibility = 'only_me';
      }

      const privacyResponse = await fetch(
        '/api/v1/users/me/privacy',
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Accept: 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({
            profileVisibility: visibility
          })
        }
      );

      const privacyResult =
        await privacyResponse.json();

      if (!privacyResponse.ok) {
        throw new Error(
          privacyResult?.message ||
          privacyResult?.error?.message ||
          'Profile visibility update failed'
        );
      }

      message.style.color = 'green';
      message.textContent =
        'Profile updated successfully';

    } catch (error) {
      message.style.color = 'red';
      message.textContent =
        error.message;
    } finally {
      saveButton.disabled = false;
      saveButton.textContent =
        'Save Profile';
    }
  },
  true
);
/* =========================================================
   CIRKLEBOOK — TOP SEARCH + TOP NAV FINAL FIX
========================================================= */

(function () {

  /* ---------------- SEARCH ---------------- */

  const searchInput =
    document.querySelector('.search-input');

  if (searchInput) {
    searchInput.addEventListener('input', function () {
      const q = this.value
        .trim()
        .toLowerCase();

      const cards =
        document.querySelectorAll(
          '.post-card, .card.post, [data-post-id]'
        );

      cards.forEach(card => {
        const text =
          String(card.textContent || '')
            .toLowerCase();

        card.style.display =
          !q || text.includes(q)
            ? ''
            : 'none';
      });
    });
  }


  /* ---------------- TOP NAV ---------------- */

  const navButtons =
    document.querySelectorAll(
      '.top-nav .nav-button'
    );

  function clickSidebar(label) {
    const buttons =
      document.querySelectorAll(
        '.sidebar-link'
      );

    const target =
      Array.from(buttons).find(button =>
        String(button.textContent || '')
          .toLowerCase()
          .includes(label)
      );

    if (target) {
      target.click();
    }
  }

  if (navButtons[0]) {
    navButtons[0].addEventListener(
      'click',
      function () {
        window.scrollTo({
          top: 0,
          behavior: 'smooth'
        });

        navButtons.forEach(
          b => b.classList.remove('active')
        );

        this.classList.add('active');
      }
    );
  }

  if (navButtons[1]) {
    navButtons[1].addEventListener(
      'click',
      function () {
        clickSidebar('friends');

        navButtons.forEach(
          b => b.classList.remove('active')
        );

        this.classList.add('active');
      }
    );
  }

  if (navButtons[2]) {
    navButtons[2].addEventListener(
      'click',
      function () {
        clickSidebar('groups');

        navButtons.forEach(
          b => b.classList.remove('active')
        );

        this.classList.add('active');
      }
    );
  }

  if (navButtons[3]) {
    navButtons[3].addEventListener(
      'click',
      function () {
        clickSidebar('pages');

        navButtons.forEach(
          b => b.classList.remove('active')
        );

        this.classList.add('active');
      }
    );
  }

})();

/* =========================================================
   CIRKLEBOOK — AUTHORITATIVE TOP NAV / SEARCH / MEDIA GUARD
   This block intentionally runs last.
========================================================= */
(function setupCirklebookTopExperience() {
    'use strict';

    const byId = (id) => document.getElementById(id);

    function sidebarButton(label) {
        const wanted = String(label).trim().toLowerCase();
        return Array.from(document.querySelectorAll('.sidebar-link'))
            .find((button) =>
                String(button.textContent || '')
                    .trim()
                    .toLowerCase()
                    .includes(wanted)
            ) || null;
    }

    function setActive(button) {
        document.querySelectorAll('.top-nav .nav-button')
            .forEach((item) => item.classList.remove('active'));
        button?.classList.add('active');
    }

    function openSidebarSection(label, topButton) {
        const target = sidebarButton(label);
        if (!target) {
            showToast(`${label} is not available yet`);
            return;
        }
        setActive(topButton);
        target.click();
    }

    function bindOnce(element, eventName, handler, key) {
        if (!element) return;
        const flag = `cbBound${key}`;
        if (element.dataset[flag] === '1') return;
        element.dataset[flag] = '1';
        element.addEventListener(eventName, handler);
    }

    function resetSearch() {
        const input = byId('topSearch');
        if (input) input.value = '';

        document.querySelectorAll('#feedContainer .post')
            .forEach((post) => {
                post.hidden = false;
                post.classList.remove('search-match');
            });

        byId('cbSearchNoResults')?.remove();
    }

    function runSearch() {
        const input = byId('topSearch');
        const feed = byId('feedContainer');
        if (!input || !feed) return;

        const query = input.value.trim().toLowerCase();
        const posts = Array.from(feed.querySelectorAll('.post'));

        byId('cbSearchNoResults')?.remove();

        if (!query) {
            posts.forEach((post) => {
                post.hidden = false;
                post.classList.remove('search-match');
            });
            return;
        }

        let matches = 0;

        posts.forEach((post) => {
            const hit = String(post.textContent || '')
                .toLowerCase()
                .includes(query);

            post.hidden = !hit;
            post.classList.toggle('search-match', hit);
            if (hit) matches += 1;
        });

        if (!matches) {
            const empty = document.createElement('div');
            empty.id = 'cbSearchNoResults';
            empty.className = 'search-no-results';
            empty.textContent = `No results found for "${input.value.trim()}".`;
            feed.prepend(empty);
        }
    }

    function showVideoPosts(button) {
        setActive(button);
        resetSearch();

        const posts = Array.from(
            document.querySelectorAll('#feedContainer .post')
        );

        let videos = 0;
        posts.forEach((post) => {
            const isVideo = Boolean(post.querySelector('video'));
            post.hidden = !isVideo;
            if (isVideo) videos += 1;
        });

        byId('cbSearchNoResults')?.remove();

        if (!videos && byId('feedContainer')) {
            const empty = document.createElement('div');
            empty.id = 'cbSearchNoResults';
            empty.className = 'search-no-results';
            empty.textContent = 'No video posts available yet.';
            byId('feedContainer').prepend(empty);
        }

        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function forceLoginForExpiredSession(message) {
        clearAccessToken();
        state.currentUser = null;

        dom.postModal?.classList.add('hidden');
        document.body.style.overflow = '';

        dom.mainApp?.classList.add('hidden');
        dom.loginScreen?.classList.remove('hidden');

        setLoginMessage(
            message || 'Your session expired. Please log in again.'
        );

        dom.loginPassword?.focus();
    }

    // Wrap the shared API helper once so every protected feature handles 401 consistently.
    if (!window.__cirklebookApiGuardInstalled) {
        window.__cirklebookApiGuardInstalled = true;
        const originalApiRequest = apiRequest;

        let refreshPromise = null;
        apiRequest = async function guardedApiRequest(path, options = {}) {
            try {
                return await originalApiRequest(path, options);
            } catch (error) {
                if (error?.status !== 401 || path === '/auth/refresh') throw error;
                if (!refreshPromise) {
                    refreshPromise = fetch(`${API_BASE_URL}/auth/refresh`, {
                        method: 'POST', credentials: 'include', headers: { Accept: 'application/json' }
                    }).then(async response => {
                        const data = await response.json().catch(() => ({}));
                        if (!response.ok) {
                            const refreshError = new Error(data?.error?.message || 'Unable to restore login session.');
                            refreshError.status = response.status;
                            throw refreshError;
                        }
                        const token = findAccessToken(data);
                        if (!token) throw new Error('Refresh succeeded without an access token.');
                        saveAccessToken(token);
                        return token;
                    }).finally(() => { refreshPromise = null; });
                }
                try {
                    await refreshPromise;
                    return await originalApiRequest(path, options);
                } catch (refreshError) {
                    forceLoginForExpiredSession('Your secure login session ended. Please log in again.');
                    throw refreshError;
                }
            }
        };
    }

    const home = byId('topHomeBtn');
    const video = byId('topVideoBtn');
    const friends = byId('topFriendsBtn');
    const groups = byId('topGroupsBtn');
    const pages = byId('topPagesBtn');
    const create = byId('topCreateBtn');
    const messages = byId('topMessagesBtn');
    const search = byId('topSearch');

    bindOnce(home, 'click', () => {
        setActive(home);
        resetSearch();
        document.querySelectorAll('#feedContainer .post')
            .forEach((post) => { post.hidden = false; });
        loadFeed();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 'Home');

    bindOnce(video, 'click', () => showVideoPosts(video), 'Video');
    bindOnce(friends, 'click', () => openSidebarSection('friends', friends), 'Friends');
    bindOnce(groups, 'click', () => openSidebarSection('groups', groups), 'Groups');
    bindOnce(pages, 'click', () => openSidebarSection('pages', pages), 'Pages');

    bindOnce(create, 'click', () => openPostModal(false), 'Create');

    bindOnce(messages, 'click', () => {
        const messageTarget =
            sidebarButton('messages') ||
            sidebarButton('messenger');

        if (messageTarget) {
            messageTarget.click();
        } else {
            showToast('Messages is not available yet');
        }
    }, 'Messages');

    bindOnce(search, 'input', runSearch, 'SearchInput');
    bindOnce(search, 'keydown', (event) => {
        if (event.key === 'Escape') {
            resetSearch();
            search.blur();
        }
        if (event.key === 'Enter') {
            event.preventDefault();
            runSearch();
            document.querySelector('#feedContainer .post:not([hidden])')
                ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, 'SearchKey');

    // Photo/Video must always open the composer and immediately open the picker.
    const photoVideo = byId('photoVideoButton');
    if (photoVideo && photoVideo.dataset.cbAuthoritativeMedia !== '1') {
        photoVideo.dataset.cbAuthoritativeMedia = '1';
        photoVideo.addEventListener('click', (event) => {
            event.preventDefault();
            openPostModal(true);
        }, true);
    }

    // Clear stale post errors when a new file is selected.
    const mediaInput = byId('mediaInput');
    bindOnce(mediaInput, 'change', () => {
        setPostMessage('');
    }, 'MediaMessage');

    console.log('Cirklebook top navigation, search and media guard ready');
})();


/* =========================================================
   CIRKLEBOOK — FINAL REDESIGN MODULE
   Built from the user's complete suggestion batch.
========================================================= */
(function () {
'use strict';
const A = 'assets/';
const $cb = id => document.getElementById(id);
const featureView = $cb('featureView');
const homeLayout = $cb('homeLayout');
const cbDialog = $cb('cbDialog');
const cbDialogTitle = $cb('cbDialogTitle');
const cbDialogBody = $cb('cbDialogBody');
let postContext = { feeling:'', location:'', tags:[] };
let liveStream = null;

function cbEscape(v){ return String(v ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c])); }
function cbName(){ return getDisplayName(state.currentUser || {username:'User'}); }
function cbCloseDialog(){
  const dialog = document.getElementById('cbDialog');
  if (!dialog) return;
  dialog.classList.add('hidden');
  dialog.style.display = 'none';
  document.body.style.overflow = '';
}

function cbShowDialog(title, html) {
  const dialog = document.getElementById('cbDialog');
  const dialogTitle = document.getElementById('cbDialogTitle');
  const dialogBody = document.getElementById('cbDialogBody');

  if (!dialog || !dialogTitle || !dialogBody) {
    alert('Dialog system not found.');
    return;
  }

  dialogTitle.textContent = title;
  dialogBody.innerHTML = html;
  dialog.classList.remove('hidden');
  dialog.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}
// Post-management is loaded outside this redesign module. Publish only these
// two dialog operations so Edit Post can use the same composer-style modal.
window.CirklebookShowDialog=cbShowDialog;
window.CirklebookCloseDialog=cbCloseDialog;
cbDialog?.addEventListener('click', e=>{ if(e.target===cbDialog) cbCloseDialog(); });

function activateTop(id){ document.querySelectorAll('.top-nav .nav-button').forEach(b=>b.classList.remove('active')); $cb(id)?.classList.add('active'); }
function showHome(){ featureView.classList.add('hidden'); homeLayout.classList.remove('hidden'); activateTop('topHomeBtn'); window.scrollTo({top:0,behavior:'smooth'}); }
function showFeature(html, topId=''){ homeLayout.classList.add('hidden'); featureView.innerHTML=html; featureView.classList.remove('hidden'); if(topId) activateTop(topId); window.scrollTo({top:0,behavior:'smooth'}); }

function icon(src, alt=''){ return `<img src="${A}${src}" alt="${cbEscape(alt)}" style="width:28px;height:28px;border-radius:8px;object-fit:contain">`; }


// ---------------- Auth additions ----------------
function cbAuthError(data,status,fallback){
  return data?.message||data?.error?.message||fallback||`Request failed (${status})`;
}
$cb('forgotPasswordButton')?.addEventListener('click', ()=>{
  cbShowDialog('Find your account', `
    <div class="auth-step">
      <h3>Forgotten password?</h3>
      <p>Enter the email, phone number or username connected to your Cirklebook account.</p>
    </div>
    <form id="forgotForm" class="cb-form-grid">
      <input id="forgotIdentifier" required placeholder="Email, phone or username" autocomplete="username">
      <div id="forgotMsg" class="message hidden"></div>
      <div class="cb-form-actions">
        <button type="button" id="forgotCancel" class="cb-action">Cancel</button>
        <button class="primary-button" type="submit">Search</button>
      </div>
    </form>`);
  $cb('forgotCancel').onclick=cbCloseDialog;
  $cb('forgotForm').onsubmit=async e=>{
    e.preventDefault();
    const msg=$cb('forgotMsg'), identifier=$cb('forgotIdentifier').value.trim();
    msg.classList.add('hidden');
    try{
      const r=await fetch(`${API_BASE_URL}/auth/forgot-password`,{
        method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({identifier})
      });
      const d=await r.json().catch(()=>({}));
      if(!r.ok) throw new Error(cbAuthError(d,r.status,'Unable to start account recovery.'));
      msg.textContent=d?.message||'Recovery instructions or a verification code have been sent.';
      msg.style.background='#e6f4ea';msg.style.color='#137333';msg.classList.remove('hidden');
      const continueBtn=document.createElement('button');
      continueBtn.type='button';continueBtn.className='primary-button';continueBtn.textContent='I have a verification code';
      continueBtn.onclick=()=>openRecoveryCodeStep(identifier);
      if(!$cb('forgotForm').querySelector('[data-recovery-next]')){
        continueBtn.dataset.recoveryNext='1';$cb('forgotForm').appendChild(continueBtn);
      }
    }catch(err){msg.textContent=err.message;msg.classList.remove('hidden');}
  };
});
function openRecoveryCodeStep(identifier){
  cbShowDialog('Verify your account', `
    <form id="recoveryCodeForm" class="cb-form-grid">
      <p class="auth-helper">Enter the verification code sent for <b>${cbEscape(identifier)}</b>.</p>
      <input id="recoveryCode" required inputmode="numeric" placeholder="Verification code">
      <input id="recoveryNewPassword" required type="password" minlength="8" placeholder="New password (8+ characters)">
      <input id="recoveryConfirmPassword" required type="password" minlength="8" placeholder="Confirm new password">
      <div id="recoveryMsg" class="message hidden"></div>
      <button class="primary-button" type="submit">Reset password</button>
    </form>`);
  $cb('recoveryCodeForm').onsubmit=async e=>{
    e.preventDefault(); const m=$cb('recoveryMsg');
    const p=$cb('recoveryNewPassword').value, c=$cb('recoveryConfirmPassword').value;
    if(p!==c){m.textContent='Passwords do not match.';m.classList.remove('hidden');return;}
    try{
      const r=await fetch(`${API_BASE_URL}/auth/reset-password`,{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({identifier,code:$cb('recoveryCode').value.trim(),password:p})
      });
      const d=await r.json().catch(()=>({}));
      if(!r.ok) throw new Error(cbAuthError(d,r.status,'Password reset endpoint is not available yet.'));
      cbCloseDialog();setLoginMessage(d?.message||'Password changed. Please log in.');
    }catch(err){m.textContent=err.message;m.classList.remove('hidden');}
  };
}
$cb('createAccountButton')?.addEventListener('click', ()=>{
  cbShowDialog('Create a new account', `
    <form id="registerForm" class="cb-form-grid">
      <p class="auth-helper">It’s quick and easy.</p>
      <div class="auth-name-grid">
        <input id="regFirstName" required placeholder="First name">
        <input id="regSurname" required placeholder="Surname">
      </div>
      <input id="regUsername" required placeholder="Username">
      <input id="regEmailPhone" required placeholder="Mobile number or email">
      <label class="auth-helper">Date of birth</label>
      <input id="regDob" type="date">
      <label class="auth-helper">Gender</label>
      <select id="regGender"><option value="">Select</option><option>Female</option><option>Male</option><option>Custom</option></select>
      <input id="regPassword" type="password" required minlength="8" placeholder="New password">
      <div class="auth-helper">By creating an account you agree to Cirklebook Terms, Privacy Policy and Community Standards.</div>
      <div id="regMsg" class="message hidden"></div>
      <button class="primary-button" type="submit">Sign Up</button>
    </form>`);
  $cb('registerForm').onsubmit=async e=>{
    e.preventDefault(); const msg=$cb('regMsg');
    const contact=$cb('regEmailPhone').value.trim();
    const payload={
      displayName:`${$cb('regFirstName').value.trim()} ${$cb('regSurname').value.trim()}`.trim(),
      username:$cb('regUsername').value.trim(),
      password:$cb('regPassword').value,
      dateOfBirth:$cb('regDob').value||undefined,
      gender:$cb('regGender').value||undefined
    };
    if(contact.includes('@')) payload.email=contact; else payload.phone=contact;
    try{
      const r=await fetch(`${API_BASE_URL}/auth/register`,{
        method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)
      });
      const d=await r.json().catch(()=>({}));
      if(!r.ok) throw new Error(cbAuthError(d,r.status,`Registration failed (${r.status})`));
      $cb('loginIdentifier').value=payload.username;cbCloseDialog();setLoginMessage('Account created. Please log in.');
    }catch(err){msg.textContent=err.message;msg.classList.remove('hidden');}
  };
});

// ---------------- Languages ----------------
const LANGS=[['en','English'],['bn','বাংলা'],['ar','العربية'],['ur','اردو'],['hi','हिन्दी'],['zh','中文'],['pt','Português'],['ru','Русский'],['fr','Français'],['es','Español'],['ms','Bahasa Melayu'],['id','Bahasa Indonesia']];
const STRINGS={
 en:{search:'Search Cirklebook',mind:"What's on your mind?",friends:'Friends',groups:'Groups',pages:'Pages',saved:'Saved',notif:'Notifications',dash:'Professional Dashboard',settings:'Settings & Privacy'},
 bn:{search:'Cirklebook-এ খুঁজুন',mind:'আপনার মনে কী আছে?',friends:'বন্ধুরা',groups:'গ্রুপ',pages:'পেইজ',saved:'সংরক্ষিত',notif:'নোটিফিকেশন',dash:'প্রফেশনাল ড্যাশবোর্ড',settings:'সেটিংস ও প্রাইভেসি'},
 ar:{search:'البحث في Cirklebook',mind:'بم تفكر؟',friends:'الأصدقاء',groups:'المجموعات',pages:'الصفحات',saved:'المحفوظات',notif:'الإشعارات',dash:'لوحة المعلومات الاحترافية',settings:'الإعدادات والخصوصية'},
 ur:{search:'Cirklebook میں تلاش کریں',mind:'آپ کیا سوچ رہے ہیں؟',friends:'دوست',groups:'گروپس',pages:'صفحات',saved:'محفوظ',notif:'اطلاعات',dash:'پروفیشنل ڈیش بورڈ',settings:'سیٹنگز اور پرائیویسی'},
 hi:{search:'Cirklebook में खोजें',mind:'आप क्या सोच रहे हैं?',friends:'मित्र',groups:'समूह',pages:'पेज',saved:'सहेजे गए',notif:'सूचनाएं',dash:'प्रोफेशनल डैशबोर्ड',settings:'सेटिंग्स और गोपनीयता'},
 zh:{search:'搜索 Cirklebook',mind:'你在想什么？',friends:'好友',groups:'群组',pages:'主页',saved:'已保存',notif:'通知',dash:'专业仪表板',settings:'设置与隐私'},
 pt:{search:'Pesquisar no Cirklebook',mind:'No que você está pensando?',friends:'Amigos',groups:'Grupos',pages:'Páginas',saved:'Salvos',notif:'Notificações',dash:'Painel profissional',settings:'Configurações e privacidade'},
 ru:{search:'Поиск в Cirklebook',mind:'О чем вы думаете?',friends:'Друзья',groups:'Группы',pages:'Страницы',saved:'Сохраненное',notif:'Уведомления',dash:'Профессиональная панель',settings:'Настройки и конфиденциальность'},
 fr:{search:'Rechercher sur Cirklebook',mind:'À quoi pensez-vous ?',friends:'Amis',groups:'Groupes',pages:'Pages',saved:'Enregistré',notif:'Notifications',dash:'Tableau de bord professionnel',settings:'Paramètres et confidentialité'},
 es:{search:'Buscar en Cirklebook',mind:'¿Qué estás pensando?',friends:'Amigos',groups:'Grupos',pages:'Páginas',saved:'Guardado',notif:'Notificaciones',dash:'Panel profesional',settings:'Configuración y privacidad'},
 ms:{search:'Cari Cirklebook',mind:'Apa yang anda fikirkan?',friends:'Rakan',groups:'Kumpulan',pages:'Halaman',saved:'Disimpan',notif:'Pemberitahuan',dash:'Papan pemuka profesional',settings:'Tetapan & Privasi'},
 id:{search:'Cari di Cirklebook',mind:'Apa yang Anda pikirkan?',friends:'Teman',groups:'Grup',pages:'Halaman',saved:'Tersimpan',notif:'Notifikasi',dash:'Dasbor profesional',settings:'Pengaturan & Privasi'}
};
function applyLanguage(code){ const s=STRINGS[code]||STRINGS.en; localStorage.setItem('cirklebook_language',code); document.documentElement.lang=code; $cb('topSearch').placeholder=s.search; $cb('openComposerButton').textContent=s.mind; const map=[['Friends',s.friends],['Groups',s.groups],['Pages',s.pages],['Saved',s.saved],['Notifications',s.notif],['Professional Dashboard',s.dash],['Settings & Privacy',s.settings]]; document.querySelectorAll('.sidebar-link').forEach(btn=>{const span=btn.querySelector('span:last-child'); if(!span)return; const original=btn.dataset.originalLabel||span.textContent.trim(); btn.dataset.originalLabel=original; const m=map.find(x=>x[0]===original); if(m)span.textContent=m[1];}); }
$cb('languageButton')?.addEventListener('click', ()=>{ const current=localStorage.getItem('cirklebook_language')||'en'; cbShowDialog('Language', `<div class="language-grid">${LANGS.map(([c,n])=>`<button class="language-choice ${c===current?'active':''}" data-lang="${c}">${n}</button>`).join('')}</div>`); cbDialogBody.querySelectorAll('[data-lang]').forEach(b=>b.onclick=()=>{applyLanguage(b.dataset.lang);cbCloseDialog();}); });


// ---------------- Composer ----------------
const FEELINGS=[
 ['Happy','😊'],['Blessed','🤲'],['Grateful','🙏'],['Excited','🤩'],['Sad','😔'],
 ['Traveling','✈️'],['Watching','📺'],['Celebrating','🎉'],['Learning','📚']
];
function updateContext(){
  const box=$cb('postContextChips'); if(!box)return;
  const parts=[];
  if(postContext.feeling){
    const em=FEELINGS.find(x=>x[0]===postContext.feeling)?.[1]||'🙂';
    parts.push(`<span class="context-chip"><span class="feeling-icon">${em}</span><b>${cbEscape(cbName())}</b> is feeling ${cbEscape(postContext.feeling.toLowerCase())}<button type="button" data-remove-context="feeling" title="Remove">×</button></span>`);
  }
  if(postContext.location) parts.push(`<span class="context-chip">📍 ${cbEscape(postContext.location)}<button type="button" data-remove-context="location">×</button></span>`);
  if(postContext.tags.length) parts.push(`<span class="context-chip">👥 With ${cbEscape(postContext.tags.join(', '))}<button type="button" data-remove-context="tags">×</button></span>`);
  box.innerHTML=parts.join('');
  box.querySelectorAll('[data-remove-context]').forEach(b=>b.onclick=()=>{
    const k=b.dataset.removeContext;if(k==='feeling')postContext.feeling='';if(k==='location')postContext.location='';if(k==='tags')postContext.tags=[];updateContext();
  });
}
function chooseFeeling(){
  cbShowDialog('Feeling / Activity', `<div class="feeling-grid">${FEELINGS.map(([x,e])=>`<button data-feeling="${x}"><span style="font-size:20px">${e}</span> ${x}</button>`).join('')}</div>`);
  cbDialogBody.querySelectorAll('[data-feeling]').forEach(b=>b.onclick=()=>{
    postContext.feeling=b.dataset.feeling;updateContext();cbCloseDialog();
  });
}
$cb('feelingButton')?.addEventListener('click', ()=>{ openPostModal(false); setTimeout(chooseFeeling,80); });
$cb('modalFeelingButton')?.addEventListener('click', chooseFeeling);
$cb('tagPeopleButton')?.addEventListener('click', ()=>{
  cbShowDialog('Tag people', `<div class="cb-form-grid"><input id="tagNames" placeholder="Enter names separated by commas"><button id="saveTags" class="primary-button">Add</button></div>`);
  $cb('saveTags').onclick=()=>{postContext.tags=$cb('tagNames').value.split(',').map(s=>s.trim()).filter(Boolean);updateContext();cbCloseDialog();};
});
$cb('checkInButton')?.addEventListener('click', ()=>{
  cbShowDialog('Check in', `<div class="cb-form-grid"><input id="checkInPlace" placeholder="Location"><button id="saveLocation" class="primary-button">Add location</button></div>`);
  $cb('saveLocation').onclick=()=>{postContext.location=$cb('checkInPlace').value.trim();updateContext();cbCloseDialog();};
});
function openLiveSetup(){ openLiveProducer(); }
$cb('liveButton')?.addEventListener('click', openLiveSetup);
$cb('modalLiveButton')?.addEventListener('click', openLiveSetup);
const legacyResetComposer = resetComposer;
resetComposer = function(){ legacyResetComposer(); postContext={feeling:'',location:'',tags:[]}; updateContext(); };
const legacyPublishPost = publishPost;
publishPost = async function(...args){
  if(postContext.feeling||postContext.location||postContext.tags.length){
    const prefix=[
      postContext.feeling&&`${cbName()} is feeling ${postContext.feeling.toLowerCase()}`,
      postContext.location&&`at ${postContext.location}`,
      postContext.tags.length&&`with ${postContext.tags.join(', ')}`
    ].filter(Boolean).join(' · ');
    if(dom.postBody && prefix && !dom.postBody.value.startsWith(prefix)) dom.postBody.value=`${prefix}\n${dom.postBody.value}`.trim();
  }
  return legacyPublishPost(...args);
};

function openLiveProducer(){
  if(dom.postModal && !dom.postModal.classList.contains('hidden')) dom.postModal.classList.add('hidden');
  showFeature(`<div class="feature-page live-producer">
    <aside class="cb-panel live-sidebar">
      <h2>Create live video</h2>
      <button class="cb-action" style="width:100%;margin:8px 0">Home</button>
      <button class="cb-action" style="width:100%;margin:0 0 14px">Saved settings</button>
      <div class="detail-row"><div><b>${cbEscape(cbName())}</b><small style="display:block;color:#65676b">Host · Your profile</small></div></div>
      <label>Choose where to post</label>
      <select id="liveDestination" style="width:100%;padding:10px;margin-top:6px"><option>Post on profile</option><option>Post in a group</option><option>Post on a Page</option></select>
      <label style="display:block;margin-top:12px">Audience</label>
      <select id="liveAudience" style="width:100%;padding:10px;margin-top:6px"><option>Public</option><option>Friends</option><option>Only me</option></select>
    </aside>
    <main>
      <div class="cb-panel" style="margin-bottom:12px;text-align:center">
        <b>No upcoming live videos</b><p class="cb-subtitle">Plan ahead by scheduling a live video.</p>
        <button id="scheduleLiveBtn" class="cb-action primary">Schedule a live video</button>
      </div>
      <div class="live-main-grid">
        <div class="live-choice"><h3>🔴 Go live</h3><p>Connect with viewers in real time.</p><button id="setupLiveBtn" class="cb-action primary">Set up live video</button></div>
        <div class="live-choice"><h3>Create a live video ad</h3><p>Promote your live video with a Cirklebook ad.</p><button id="liveAdBtn" class="cb-action">Create ad</button></div>
      </div>
      <div id="liveSetupPanel" class="cb-panel" style="margin-top:12px">
        <div class="live-history-tabs"><button class="cb-action primary">Past live videos</button><button class="cb-action">Live now</button></div>
        <div class="cb-empty-panel">You have no past live videos.</div>
      </div>
    </main>
  </div>`);
  $cb('setupLiveBtn').onclick=()=>renderLiveCameraSetup();
  $cb('scheduleLiveBtn').onclick=()=>cbShowDialog('Schedule live video',`<div class="cb-form-grid"><input type="datetime-local" id="liveScheduleAt"><input placeholder="Live video title"><textarea placeholder="Description"></textarea><button class="primary-button">Save schedule</button></div>`);
  $cb('liveAdBtn').onclick=()=>openAdsBuilder('Video Views');
}
function renderLiveCameraSetup(){
  const p=$cb('liveSetupPanel'); if(!p)return;
  p.innerHTML=`<h3>Set up live video</h3>
    <div class="cb-form-grid">
      <input id="liveTitle" placeholder="Live video title">
      <textarea id="liveDescription" placeholder="Description"></textarea>
      <select id="liveSource"><option>Camera</option><option>Streaming software</option></select>
    </div>
    <video id="livePreview" class="live-preview-large" autoplay muted playsinline></video>
    <div class="cb-form-actions" style="margin-top:10px">
      <button id="startCamera" class="cb-action">Start camera & microphone</button>
      <button id="goLive" class="cb-action primary" disabled>Go Live</button>
    </div>
    <div id="liveMsg" class="message hidden"></div>`;
  $cb('startCamera').onclick=async()=>{
    const msg=$cb('liveMsg');
    try{
      liveStream=await navigator.mediaDevices.getUserMedia({video:true,audio:true});
      $cb('livePreview').srcObject=liveStream;
      msg.textContent='Camera and microphone are ready. Real audience broadcasting still requires the Cirklebook streaming backend/WebRTC-SFU service.';
      msg.style.background='#e6f4ea';msg.style.color='#137333';msg.classList.remove('hidden');
    }catch(e){msg.textContent=e.message;msg.classList.remove('hidden');}
  };
}


// ---------------- Profile ----------------
const PROFILE_LOCAL_KEY='cirklebook_profile_extras_v3';

/*
  Profile extras must be isolated per signed-in user.
  The previous global key caused one account's avatar/cover/profile extras
  to appear in another account on the same browser.
*/
function cbProfileStorageKey(){
  const user=state.currentUser||{};
  const id=String(user.id||user.user_id||user.userId||'').trim();
  return id ? `${PROFILE_LOCAL_KEY}:${id}` : `${PROFILE_LOCAL_KEY}:anonymous`;
}

function cbProfileExtras(){
  try{
    const key=cbProfileStorageKey();
    const scoped=localStorage.getItem(key);

    if(scoped){
      return JSON.parse(scoped)||{};
    }

    /*
      Preserve the existing testuser02 profile without leaking it to
      newly-created accounts. This is a one-time legacy migration only
      for the original local test account whose uploads already use this ID.
    */
    const user=state.currentUser||{};
    const id=String(user.id||user.user_id||user.userId||'').trim();
    const username=String(user.username||'').trim().toLowerCase();
    const legacyOwner =
      id==='4d89f404-cc9d-413c-b7ea-9910f6550cfb' ||
      username==='testuser02';

    if(legacyOwner){
      const legacy=localStorage.getItem(PROFILE_LOCAL_KEY);
      if(legacy){
        const parsed=JSON.parse(legacy)||{};
        localStorage.setItem(key,JSON.stringify(parsed));
        return parsed;
      }
    }

    return {};
  }catch(_){
    return {};
  }
}

function saveProfileExtras(v){
  localStorage.setItem(cbProfileStorageKey(),JSON.stringify(v||{}));
}
async function fetchProfileData(){try{const r=await apiRequest('/users/me/profile');return r?.data?.profile||r?.data||r?.profile||r||{};}catch(_){return state.currentUser||{};}}
function profileImage(key,fallback){const ex=cbProfileExtras();return ex[key]||fallback;}
async function openProfilePage(tab='all'){
  const p=await fetchProfileData(), ex=cbProfileExtras();
  const name=p.displayName||p.display_name||cbName();
  const username=p.username||state.currentUser?.username||'';
  const bio=p.bio||ex.bio||'';
  const loc=p.locationText||p.location_text||ex.location||'';
  const avatar=profileImage('avatar',`${A}logo-main.png`);
  const cover=profileImage('cover','');

  showFeature(`<div class="feature-page cb-profile-page-final">
    <section class="feature-hero cb-profile-hero-final">
      <div class="profile-cover" id="profileCover" ${cover?`style="background-image:url('${cover}')"`:''}>
        <button id="coverEditBtn" class="profile-cover-edit">📷 Edit cover photo</button>
      </div>
      <div class="profile-head cb-profile-head-final">
        <div class="profile-avatar-wrap">
          <img class="profile-big-avatar" id="profileBigAvatar" src="${avatar}" alt="Profile">
          <button id="avatarEditBtn" class="profile-avatar-edit">📷</button>
        </div>
        <div class="profile-title">
          <h1>${cbEscape(name)}</h1>
          <div class="cb-profile-counts">@${cbEscape(username)} · <b>${cbEscape(ex.followers??'Followers')}</b> · <b>${cbEscape(ex.following??'Following')}</b></div>
          ${bio?`<p>${cbEscape(bio)}</p>`:''}
          <div class="cb-profile-pinned-details">${loc?`<span>📍 ${cbEscape(loc)}</span>`:''}${ex.work?`<span>💼 ${cbEscape(ex.work)}</span>`:''}${ex.education?`<span>🎓 ${cbEscape(ex.education)}</span>`:''}</div>
        </div>
        <div class="profile-actions">
          <button class="cb-action primary" id="profileDashboard">Dashboard</button>
          <button class="cb-action" id="profileEdit">✎ Edit profile</button>
          <button class="cb-action" id="profileMore">•••</button>
        </div>
      </div>
      <nav class="profile-tabs cb-profile-tabs-final">${[['all','Posts'],['about','About'],['reels','Reels'],['photos','Photos'],['friends','Friends'],['more','More']].map(([k,l])=>`<button data-profile-tab="${k}" class="${tab===k?'active':''}">${l}</button>`).join('')}</nav>
    </section>
    <div id="profileTabBody"></div>
    <input id="profileAvatarInput" type="file" accept="image/*" hidden>
    <input id="profileCoverInput" type="file" accept="image/*" hidden>
  </div>`);

  featureView.querySelectorAll('[data-profile-tab]').forEach(b=>b.onclick=()=>openProfilePage(b.dataset.profileTab));
  $cb('profileDashboard').onclick=()=>openDashboard();
  $cb('profileEdit').onclick=()=>openProfileEditor(p);
  $cb('profileMore').onclick=()=>cbShowDialog('Profile options',`<div class="cb-profile-option-list"><button class="cb-action">View as</button><button class="cb-action">Manage posts</button><button id="profileVerifyOption" class="cb-action">Verification Badge</button></div>`);
  $cb('avatarEditBtn').onclick=()=>$cb('profileAvatarInput').click();
  $cb('coverEditBtn').onclick=()=>$cb('profileCoverInput').click();
  $cb('profileAvatarInput').onchange=e=>saveProfileImage(e.target.files?.[0],'avatar',()=>openProfilePage(tab));
  $cb('profileCoverInput').onchange=e=>saveProfileImage(e.target.files?.[0],'cover',()=>openProfilePage(tab));

  const body=$cb('profileTabBody');

  if(tab==='about'){ body.innerHTML=renderAbout(p,name,loc); bindAbout(p); return; }
  if(tab==='friends'){ renderProfileFriends(body); return; }

  if(tab==='photos'||tab==='reels'){
    body.innerHTML=`<div class="cb-panel cb-profile-media-panel"><div class="cb-profile-section-head"><div><h2>${tab==='photos'?'Photos':'Reels'}</h2><p>${tab==='photos'?'Photos you have shared':'Video and reel posts you have shared'}</p></div><button id="profileMediaAdd" class="cb-action primary">${tab==='photos'?'Add photos':'Create reel'}</button></div><div id="profileMediaList"><div class="cb-empty-panel">Loading…</div></div></div>`;
    $cb('profileMediaAdd').onclick=()=>openPostModal(true);
    try{
      const r=await apiRequest('/posts/mine?limit=50'), posts=await hydrateSharedPosts(extractPosts(r));
      const filtered=posts.filter(post=>{
        const media=post?.media||post?.mediaAssets||post?.media_assets||[];
        const arr=Array.isArray(media)?media:(media?[media]:[]);
        return arr.some(m=>{
          const t=(m?.media_type||m?.mediaType||m?.type||'').toLowerCase();
          return tab==='photos'?t==='image':t==='video';
        });
      });
      $cb('profileMediaList').innerHTML=filtered.length?filtered.map(renderPost).join(''):`<div class="cb-empty-panel">No ${tab} yet.</div>`;
      initializeSecureVideoPlayers();
    }catch(e){$cb('profileMediaList').innerHTML=`<div class="cb-empty-panel">${cbEscape(e.message||'Unable to load content.')}</div>`}
    return;
  }

  if(tab==='more'){
    body.innerHTML=`<div class="cb-panel cb-profile-more-panel"><h2>More</h2><div class="cb-profile-more-grid"><button data-more-tab="photos">Photos</button><button data-more-tab="reels">Reels & Videos</button><button data-more-tab="friends">Friends</button><button data-more-tab="about">About</button><button id="profileVerifyMore">Verification Badge</button><button id="profileDashboardMore">Professional Dashboard</button></div></div>`;
    body.querySelectorAll('[data-more-tab]').forEach(b=>b.onclick=()=>openProfilePage(b.dataset.moreTab));
    $cb('profileVerifyMore').onclick=openVerification;
    $cb('profileDashboardMore').onclick=openDashboard;
    return;
  }

  body.innerHTML=`<div class="profile-content cb-profile-facebook-layout">
    <aside class="cb-profile-left-column">
      <section class="cb-panel profile-section-card cb-profile-lock-card">
        <button type="button" id="profileLockMenu" class="cb-profile-lock-menu">
          <span class="cb-profile-lock-icon">🔒</span>
          <span>
            <strong>Lock Profile</strong>
            <small id="profileLockStatus">Checking status...</small>
          </span>
        </button>
      </section>
      <section class="cb-panel profile-section-card"><h3>Intro</h3>${bio?`<p>${cbEscape(bio)}</p>`:'<p class="cb-profile-muted">Add a bio to tell people about yourself.</p>'}${loc?`<p>📍 Lives in ${cbEscape(loc)}</p>`:''}${ex.hometown?`<p>🏠 From ${cbEscape(ex.hometown)}</p>`:''}${ex.work?`<p>💼 ${cbEscape(ex.work)}</p>`:''}${ex.education?`<p>🎓 ${cbEscape(ex.education)}</p>`:''}<p>👥 Friends</p><p>⭐ Followers & Following</p><button class="cb-action cb-wide-action" id="quickEditIntro">Edit details</button></section>
      <section class="cb-panel profile-section-card"><div class="cb-profile-section-head"><h3>Links</h3><button id="profileEditLinks" class="cb-link-button">Edit</button></div>${ex.links?`<p>🔗 ${cbEscape(ex.links)}</p>`:'<p class="cb-profile-muted">No links added.</p>'}</section>
      <section class="cb-panel profile-section-card"><div class="cb-profile-section-head"><h3>Work</h3><button id="profileEditWork" class="cb-link-button">Edit</button></div>${ex.work?`<p>💼 ${cbEscape(ex.work)}</p>`:'<p class="cb-profile-muted">No work added.</p>'}</section>
      <section class="cb-panel profile-section-card"><div class="cb-profile-section-head"><h3>Education</h3><button id="profileEditEducation" class="cb-link-button">Edit</button></div>${ex.education?`<p>🎓 ${cbEscape(ex.education)}</p>`:'<p class="cb-profile-muted">No education added.</p>'}</section>
      <section class="cb-panel profile-section-card"><h3>Verification Badge</h3><p>Personal · Creator · Business · Organization</p><button class="cb-action primary" id="applyVerify">Get Verified</button></section>
    </aside>
    <main class="cb-profile-main-column">
      <section class="cb-panel profile-composer-card cb-profile-composer-facebook"><img class="avatar" src="${avatar}" alt=""><button id="profileComposerBtn">What's on your mind?</button><div class="cb-profile-composer-shortcuts"><button id="profileLiveShortcut">🔴 Live video</button><button id="profilePhotoShortcut">🖼️ Photo/video</button></div></section>
      <section class="cb-panel cb-profile-post-toolbar"><div><h3>Posts</h3><p class="cb-profile-muted">Your posts, photos and videos</p></div><div><button class="cb-action">Filters</button> <button class="cb-action">Manage posts</button></div></section>
      <div id="legacyProfileOwnPosts" class="cb-profile-post-list"><div class="cb-panel"><div class="cb-empty-panel">Loading your posts…</div></div></div>
    </main>
  </div>`;

  $cb('applyVerify').onclick=openVerification;
  $cb('quickEditIntro').onclick=()=>openProfileEditor(p);
  $cb('profileEditLinks').onclick=()=>openProfilePage('about');
  $cb('profileEditWork').onclick=()=>openProfilePage('about');
  $cb('profileEditEducation').onclick=()=>openProfilePage('about');
  $cb('profileComposerBtn').onclick=()=>openPostModal(false);
  $cb('profilePhotoShortcut').onclick=()=>openPostModal(true);
  $cb('profileLiveShortcut').onclick=()=>openLiveProducer();

  // Profile Lock: backend-backed using the existing privacy endpoint.
  // Locked = profile visibility limited to Friends.
  // Unlocked = Public.
  const profileLockMenu=$cb('profileLockMenu');
  const profileLockStatus=$cb('profileLockStatus');

  const readProfileLockState=async()=>{
    try{
      const d=unwrapData(await apiRequest('/users/me/privacy'));
      const privacy=d.privacy||d||{};
      const visibility=privacy.profileVisibility||privacy.profile_visibility||'public';
      const locked=visibility==='friends'||visibility==='only_me'||visibility==='private';
      if(profileLockStatus){
        profileLockStatus.textContent=locked?'Profile is locked':'Profile is unlocked';
      }
      if(profileLockMenu){
        profileLockMenu.dataset.locked=locked?'1':'0';
        const title=profileLockMenu.querySelector('strong');
        const icon=profileLockMenu.querySelector('.cb-profile-lock-icon');
        if(title) title.textContent=locked?'Unlock Profile':'Lock Profile';
        if(icon) icon.textContent=locked?'🔓':'🔒';
      }
      return locked;
    }catch(e){
      console.warn('PROFILE LOCK STATUS:',e);
      if(profileLockStatus) profileLockStatus.textContent='Lock profile';
      return false;
    }
  };

  const setProfileLockState=async(lock)=>{
    await apiRequest('/users/me/privacy',{
      method:'PATCH',
      body:JSON.stringify({profileVisibility:lock?'friends':'public'})
    });
    showToast(lock?'Profile locked':'Profile unlocked');
    await readProfileLockState();
  };

  if(profileLockMenu){
    profileLockMenu.onclick=async()=>{
      const locked=profileLockMenu.dataset.locked==='1';
      cbShowDialog(locked?'Unlock Profile':'Lock Profile',`
        <div class="cb-form-grid">
          <div style="text-align:center;font-size:42px">${locked?'🔓':'🔒'}</div>
          <h3 style="text-align:center;margin:0">${locked?'Unlock your profile?':'Lock your profile?'}</h3>
          <p style="text-align:center;color:#65676b;margin:0">
            ${locked
              ? 'Your profile will become public again.'
              : 'Only your friends will be able to see your full profile details.'}
          </p>
          <button id="confirmProfileLockBtn" type="button" class="primary-button">
            ${locked?'Unlock Profile':'Lock Profile'}
          </button>
          <button id="cancelProfileLockBtn" type="button" class="cb-action">Cancel</button>
          <div id="profileLockMsg" class="message hidden"></div>
        </div>
      `);

      $cb('cancelProfileLockBtn').onclick=()=>cbCloseDialog();
      $cb('confirmProfileLockBtn').onclick=async()=>{
        const btn=$cb('confirmProfileLockBtn');
        const msg=$cb('profileLockMsg');
        btn.disabled=true;
        btn.textContent=locked?'Unlocking...':'Locking...';
        try{
          await setProfileLockState(!locked);
          cbCloseDialog();
        }catch(e){
          msg.textContent=e?.message||'Unable to update profile lock.';
          msg.classList.remove('hidden');
          btn.disabled=false;
          btn.textContent=locked?'Unlock Profile':'Lock Profile';
        }
      };
    };
    readProfileLockState();
  }

  try{
    const r=await apiRequest('/posts/mine?limit=50'), posts=await hydrateSharedPosts(extractPosts(r));
    $cb('legacyProfileOwnPosts').innerHTML=posts.length?posts.map(renderPost).join(''):'<div class="cb-panel"><div class="cb-empty-panel">You have not posted anything yet.</div></div>';
    initializeSecureVideoPlayers();
  }catch(e){$cb('legacyProfileOwnPosts').innerHTML=`<div class="cb-panel"><div class="cb-empty-panel">${cbEscape(e.message||'Unable to load profile posts.')}</div></div>`}
}
function saveProfileImage(file,key,done){
  if(!file)return;
  if(!file.type.startsWith('image/')){showToast('Please choose an image file.');return}
  if(file.size>6*1024*1024){showToast('Image must be smaller than 6 MB.');return}
  const rd=new FileReader();rd.onload=()=>{const ex=cbProfileExtras();ex[key]=rd.result;saveProfileExtras(ex);showToast(key==='avatar'?'Profile picture updated':'Cover photo updated');done?.();};rd.readAsDataURL(file);
}
function renderAbout(p,name,loc){
  const cats=[['overview','Overview'],['category','Category'],['personal_details','Personal details'],['links','Links'],['communities','Communities'],['offers','Offers'],['work','Work'],['education','Education'],['hobbies','Hobbies'],['interests','Interests'],['travel','Travel'],['contact_info','Contact info'],['privacy_and_legal_info','Privacy and legal info'],['names','Names'],['verification_badge','Verification Badge']];
  return `<div class="cb-about-facebook"><aside class="cb-panel cb-about-nav"><h2>About</h2>${cats.map(([k,l],i)=>`<button type="button" data-about-key="${k}" class="${i===0?'active':''}">${l}</button>`).join('')}</aside><main class="cb-panel cb-about-main" id="aboutDetails"></main></div>`;
}
function bindAbout(p){
  const labels={overview:'Overview',category:'Category',personal_details:'Personal details',links:'Links',communities:'Communities',offers:'Offers',work:'Work',education:'Education',hobbies:'Hobbies',interests:'Interests',travel:'Travel',contact_info:'Contact info',privacy_and_legal_info:'Privacy and legal info',names:'Names',verification_badge:'Verification Badge'};
  const editIdentity=(mode,account={})=>{
    const names=mode==='names',profile=account.profile||{};
    cbShowDialog(names?'Edit names':'Contact information',`<div class="cb-account-identity-editor"><p>${names?'Update the name and unique username shown across Cirklebook.':'Update the mobile number and email connected to your account.'}</p>${names?`<label>Display name<input id="legacyIdentityName" maxlength="100" value="${cbEscape(profile.displayName||p.displayName||p.display_name||cbName())}"></label><label>Username<div class="cb-username-input"><span>@</span><input id="legacyIdentityUsername" maxlength="30" value="${cbEscape(account.username||p.username||state.currentUser?.username||'')}"></div><small>This username must be unique.</small></label>`:`<label>Mobile number<input id="legacyIdentityPhone" inputmode="tel" value="${cbEscape(account.phoneE164||account.phone_e164||'')}" placeholder="+8801XXXXXXXXX"></label><label>Email address<input id="legacyIdentityEmail" type="email" value="${cbEscape(account.email||'')}" placeholder="name@example.com"></label>`}<div id="legacyIdentityMsg" class="message hidden"></div><div class="cb-about-actions"><button id="legacyIdentityCancel" class="cb-action">Cancel</button><button id="legacyIdentitySave" class="cb-action primary">Save changes</button></div></div>`);
    $cb('legacyIdentityCancel').onclick=cbCloseDialog;
    $cb('legacyIdentitySave').onclick=async()=>{const btn=$cb('legacyIdentitySave'),msg=$cb('legacyIdentityMsg'),payload=names?{displayName:$cb('legacyIdentityName').value.trim(),username:$cb('legacyIdentityUsername').value.trim()}:{phoneE164:$cb('legacyIdentityPhone').value.trim(),email:$cb('legacyIdentityEmail').value.trim()};btn.disabled=true;btn.textContent='Saving…';try{await apiRequest('/users/me/account',{method:'PATCH',body:JSON.stringify(payload)});if(names){p.displayName=payload.displayName;p.username=payload.username;if(state.currentUser){state.currentUser.displayName=payload.displayName;state.currentUser.display_name=payload.displayName;state.currentUser.username=payload.username;}}cbCloseDialog();showToast('Account information updated');load(mode);}catch(error){msg.textContent=error.message||'Unable to update account information.';msg.classList.remove('hidden');btn.disabled=false;btn.textContent='Save changes';}};
  };
  const loadAccount=async()=>{const raw=await apiRequest('/users/me');return raw?.data?.data||raw?.data||raw||{};};
  const load=(key)=>{
    featureView.querySelectorAll('[data-about-key]').forEach(x=>x.classList.toggle('active',x.dataset.aboutKey===key));
    const ex=cbProfileExtras(), d=$cb('aboutDetails'); if(!d)return;
    if(key==='verification_badge'){d.innerHTML=`<div class="cb-about-head"><div><h2>Verification Badge</h2><p>Identity and authenticity verification.</p></div><button id="aboutApplyVerify" class="cb-action primary">Get Verified</button></div><div class="cb-about-info-card"><div><b>Requirements</b><span>Complete profile · NID/Birth Certificate/Passport · Live identity check · ৳450/month · Admin review</span></div><div><b>Verified benefits</b><span>Badge · Identity trust · Priority review/support · Impersonation protection · Advanced creator/business tools · Monetization/ads trust advantages</span></div><div><b>Types</b><span>Personal · Creator · Business · Organization</span></div></div>`;$cb('aboutApplyVerify').onclick=openVerification;return;}
    if(key==='names'){d.innerHTML='<div class="cb-empty-panel">Loading names…</div>';loadAccount().then(account=>{const profile=account.profile||{};d.innerHTML=`<div class="cb-about-head"><div><h2>Names</h2><p>Names associated with this profile.</p></div><button id="legacyEditNames" class="cb-action">Edit</button></div><div class="cb-about-info-card"><div><b>Display name</b><span>${cbEscape(profile.displayName||p.displayName||p.display_name||cbName())}</span></div><div><b>Username</b><span>@${cbEscape(account.username||p.username||state.currentUser?.username||'')}</span></div></div>`;$cb('legacyEditNames').onclick=()=>editIdentity('names',account);}).catch(error=>{d.innerHTML=`<div class="cb-empty-panel">${cbEscape(error.message||'Unable to load names.')}</div>`;});return;}
    if(key==='overview'){d.innerHTML=`<div class="cb-about-head"><div><h2>Bio</h2><p>Your profile summary and pinned details.</p></div><button id="aboutEditOverview" class="cb-action">Edit</button></div><div class="cb-about-info-card"><div><b>Bio</b><span>${cbEscape(p.bio||ex.bio||'Not added')}</span></div><div><b>Lives in</b><span>${cbEscape(p.locationText||p.location_text||ex.location||'Not added')}</span></div><div><b>Work</b><span>${cbEscape(ex.work||'Not added')}</span></div><div><b>Education</b><span>${cbEscape(ex.education||'Not added')}</span></div></div>`;$cb('aboutEditOverview').onclick=()=>openProfileEditor(p);return;}
    if(key==='contact_info'){d.innerHTML='<div class="cb-empty-panel">Loading contact information…</div>';loadAccount().then(account=>{d.innerHTML=`<div class="cb-about-head"><div><h2>Contact info</h2><p>Information connected to your account.</p></div><button id="legacyEditContact" class="cb-action">Edit</button></div><div class="cb-about-info-card"><div><b>Mobile</b><span>${cbEscape(account.phoneE164||account.phone_e164||'Not added')}</span></div><div><b>Email</b><span>${cbEscape(account.email||'Not added')}</span></div></div>`;$cb('legacyEditContact').onclick=()=>editIdentity('contact_info',account);}).catch(error=>{d.innerHTML=`<div class="cb-empty-panel">${cbEscape(error.message||'Unable to load contact information.')}</div>`;});return;}
    if(key==='personal_details'){const dob=(p.dateOfBirth||p.date_of_birth||'').slice?.(0,10)||'Not added';d.innerHTML=`<div class="cb-about-head"><div><h2>${labels[key]}</h2><p>Information shown on your profile.</p></div><button id="aboutEditProfile" class="cb-action">Edit</button></div><div class="cb-about-info-card"><div><b>Lives in</b><span>${cbEscape(p.locationText||p.location_text||ex.location||'Not added')}</span></div><div><b>Date of birth</b><span>${cbEscape(dob)}</span></div></div>`;$cb('aboutEditProfile').onclick=()=>openProfileEditor(p);return;}
    const value=ex[key]||'';
    d.innerHTML=`<div class="cb-about-head"><div><h2>${cbEscape(labels[key]||key)}</h2><p>${value?'Information shown on your profile.':'Nothing added yet.'}</p></div><button id="aboutEditField" class="cb-action">${value?'Edit':'Add'}</button></div><div class="cb-about-info-card">${value?`<p>${cbEscape(value).split('\n').join('<br>')}</p>`:`<div class="cb-empty-panel">Add ${cbEscape((labels[key]||key).toLowerCase())} to your profile.</div>`}</div>`;
    $cb('aboutEditField').onclick=()=>{d.innerHTML=`<div class="cb-about-head"><div><h2>Edit ${cbEscape(labels[key]||key)}</h2><p>Update the information shown on your profile.</p></div></div><textarea id="aboutField" rows="6">${cbEscape(value)}</textarea><div class="cb-about-actions"><button id="aboutCancel" class="cb-action">Cancel</button><button id="aboutSave" class="cb-action primary">Save</button></div>`;$cb('aboutCancel').onclick=()=>load(key);$cb('aboutSave').onclick=()=>{const x=cbProfileExtras();x[key]=$cb('aboutField').value.trim();saveProfileExtras(x);showToast('Profile information saved');load(key);};};
  };
  featureView.querySelectorAll('[data-about-key]').forEach(b=>b.onclick=()=>load(b.dataset.aboutKey));
  load('overview');
}
function openProfileEditor(p){
  const ex=cbProfileExtras(), name=p.displayName||p.display_name||cbName(), dob=(p.dateOfBirth||p.date_of_birth||'').slice?.(0,10)||'';
  cbShowDialog('Edit Profile',`<div class="cb-edit-profile-facebook">
    <section class="cb-edit-row"><div><h3>Profile picture</h3><p>Choose the photo people see across Cirklebook.</p></div><button id="cbEditAvatar" class="cb-action">Edit</button></section>
    <section class="cb-edit-row"><div><h3>Cover photo</h3><p>Customize the top of your profile.</p></div><button id="cbEditCover" class="cb-action">Edit</button></section>
    <section class="cb-edit-section"><div class="cb-edit-head"><h3>Bio</h3><span>160 characters</span></div><textarea id="epBio" rows="3" maxlength="160">${cbEscape(p.bio||ex.bio||'')}</textarea></section>
    <section class="cb-edit-section"><div class="cb-edit-head"><h3>Customize your intro</h3></div><label>Display name<input id="epName" value="${cbEscape(name)}"></label><label>Website<input id="epWebsite" value="${cbEscape(p.website||'')}"></label><label>Current city / location<input id="epLocation" value="${cbEscape(p.locationText||p.location_text||ex.location||'')}"></label><label>Hometown<input id="epHometown" value="${cbEscape(ex.hometown||'')}"></label><label>Date of birth<input id="epDob" type="date" value="${cbEscape(dob)}"></label></section>
    ${[['work','Work'],['education','Education'],['links','Links'],['family','Family'],['hobbies','Hobbies'],['interests','Interests'],['travel','Travel']].map(([k,l])=>`<section class="cb-edit-section"><div class="cb-edit-head"><h3>${l}</h3></div><textarea data-extra-key="${k}" rows="2" placeholder="Add ${l.toLowerCase()}">${cbEscape(ex[k]||'')}</textarea></section>`).join('')}
    <section class="cb-edit-row"><div><h3>Verification Badge</h3><p>Personal, Creator, Business or Organization verification.</p></div><button id="cbEditVerify" class="cb-action">View</button></section>
    <div id="epMsg" class="message hidden"></div><button id="cbSaveFullProfile" class="primary-button">Save changes</button>
  </div>`);
  $cb('cbEditAvatar').onclick=()=>{cbCloseDialog();$cb('profileAvatarInput')?.click()};$cb('cbEditCover').onclick=()=>{cbCloseDialog();$cb('profileCoverInput')?.click()};$cb('cbEditVerify').onclick=()=>{cbCloseDialog();openVerification()};
  $cb('cbSaveFullProfile').onclick=async()=>{const msg=$cb('epMsg');const payload={displayName:$cb('epName').value.trim(),bio:$cb('epBio').value.trim(),website:$cb('epWebsite').value.trim(),locationText:$cb('epLocation').value.trim(),dateOfBirth:$cb('epDob').value||null};try{await apiRequest('/users/me/profile',{method:'PATCH',body:JSON.stringify(payload)});const x=cbProfileExtras();x.bio=payload.bio;x.location=payload.locationText;x.hometown=$cb('epHometown').value.trim();document.querySelectorAll('[data-extra-key]').forEach(t=>x[t.dataset.extraKey]=t.value.trim());saveProfileExtras(x);cbCloseDialog();openProfilePage('all');showToast('Profile updated');}catch(err){msg.textContent=err.message||'Unable to update profile.';msg.classList.remove('hidden');}};
}
async function renderProfileFriends(body){
  body.innerHTML='<div class="cb-panel"><h2>Friends</h2><div id="profileFriendsList">Loading...</div></div>';
  try{
    const r=await apiRequest('/friends'),arr=r?.data?.friends||r?.friends||r?.data||[];
    $cb('profileFriendsList').innerHTML=Array.isArray(arr)&&arr.length?arr.map(x=>`<div class="detail-row"><strong>${cbEscape(x.displayName||x.display_name||x.username||'Friend')}</strong></div>`).join(''):'<div class="cb-empty-panel">No friends found.</div>';
  }catch(e){$cb('profileFriendsList').innerHTML=`<div class="cb-empty-panel">${cbEscape(e.message)}</div>`}
}
function openVerification(){
  cbShowDialog('Get Verified',`<div>
    <div class="verify-stepper"><span class="verify-step">1. Identity document</span><span class="verify-step">2. Live image</span><span class="verify-step">3. ৳450/month</span><span class="verify-step">4. Review</span></div>
    <div class="cb-form-grid">
      <label>Verification type</label><select id="verifyType"><option>Personal</option><option>Creator</option><option>Business</option><option>Organization</option></select>
      <div class="cb-about-info-card" style="margin:2px 0 4px">
        <b>Verified benefits</b>
        <p style="margin:7px 0 0;line-height:1.55">✓ Verification Badge · ✓ Identity trust · ✓ Priority review/support · ✓ Impersonation protection · ✓ Advanced creator/business tools · ✓ Monetization/ads trust advantages</p>
        <div id="verifyTypeBenefit" style="margin-top:9px;padding-top:9px;border-top:1px solid #e4e6eb;font-size:13px;color:#65676b"></div>
      </div>
      <label>Identity document — choose any one</label><select id="verifyDocType"><option>NID</option><option>Birth Certificate</option><option>Passport</option></select>
      <div class="verify-upload"><input id="verifyDocFile" type="file" accept="image/*,application/pdf"><p class="auth-helper">Upload or capture a clear document image/PDF.</p></div>
      <div class="camera-box"><video id="verifyCamera" autoplay muted playsinline></video><span id="verifyCameraPlaceholder">Live identity camera preview</span></div>
      <button id="verifyStartCamera" type="button" class="cb-action">Start live camera check</button>
      <div class="fee-box"><div><b>Verification subscription</b><small style="display:block;color:#65676b">Monthly renewal</small></div><strong>৳450 / month</strong></div>
      <select id="verifyPaymentMethod"><option value="">Choose payment method</option><option>bKash</option><option>Nagad</option><option>Rocket</option><option>Card / Gateway</option></select>
      <div id="verifyMsg" class="message hidden"></div>
      <button id="verificationApply" class="primary-button">Continue to Payment & Review</button>
    </div>
  </div>`);
  const verificationTypeBenefits={
    Personal:'Verified Person — Identity authenticity, priority review/support and impersonation protection.',
    Creator:'Verified Creator — Creator identity trust, creator analytics/advanced creator tools and monetization review priority.',
    Business:'Verified Business — Business identity, website/contact trust card, ads credibility and advanced business tools.',
    Organization:'Verified Organization — Official organization identity, official organization badge, website/contact trust and impersonation protection.'
  };
  const paintVerificationTypeBenefit=()=>{const type=$cb('verifyType')?.value||'Personal',box=$cb('verifyTypeBenefit');if(box)box.innerHTML=`<b>${cbEscape(type)} benefits:</b> ${cbEscape(verificationTypeBenefits[type]||'')}`};
  $cb('verifyType').onchange=paintVerificationTypeBenefit;paintVerificationTypeBenefit();
  $cb('verifyStartCamera').onclick=async()=>{
    const m=$cb('verifyMsg');
    try{
      liveStream=await navigator.mediaDevices.getUserMedia({video:true,audio:false});
      $cb('verifyCamera').srcObject=liveStream;$cb('verifyCameraPlaceholder').style.display='none';
      m.textContent='Live camera is ready. Face matching/liveness scoring requires the secure verification backend service.';
      m.style.background='#e7f3ff';m.style.color='#175ea8';m.classList.remove('hidden');
    }catch(e){m.textContent=e.message;m.classList.remove('hidden');}
  };
  $cb('verificationApply').onclick=()=>{
    const m=$cb('verifyMsg'),file=$cb('verifyDocFile').files?.[0],pay=$cb('verifyPaymentMethod').value;
    if(!file){m.textContent='Please attach one identity document.';m.classList.remove('hidden');return}
    if(!pay){m.textContent='Please choose a payment method.';m.classList.remove('hidden');return}
    m.textContent='Application details are ready. Secure document storage, liveness/face match, ৳450 recurring payment, renewal and Admin review require the Verification/Payments backend endpoints before final submission can be enabled.';
    m.style.background='#fff4ce';m.style.color='#684f00';m.classList.remove('hidden');
  };
}


// ---------------- Dashboard / monetization ----------------
function openDashboard(section='overview'){
 showFeature(`<div class="feature-page"><div class="dashboard-grid"><aside class="cb-panel dashboard-menu">${[['overview','Overview'],['content','Content'],['audience','Audience'],['monetization','Monetization'],['verification','Verification'],['ads','Ads Center'],['moderation','Moderation'],['notifications','Notifications']].map(([k,l])=>`<button data-dash="${k}" class="${section===k?'active':''}">${l}</button>`).join('')}</aside><main id="dashboardBody"></main></div></div>`,'topDashboardBtn');
 featureView.querySelectorAll('[data-dash]').forEach(b=>b.onclick=()=>openDashboard(b.dataset.dash));
 renderDashboardSection(section);
}
function metricCard(label,value='—'){return `<div class="dashboard-kpi"><small>${cbEscape(label)}</small><strong>${cbEscape(value??'—')}</strong></div>`}
function unwrapData(r){return r?.data||r||{}}
async function renderDashboardSection(s){
 const b=$cb('dashboardBody'); if(!b)return;b.innerHTML='<div class="cb-panel"><div class="cb-empty-panel">Loading...</div></div>';
 if(s==='overview'){return renderDashOverview(b)}
 if(s==='content'){return renderDashContent(b)}
 if(s==='audience'){return renderDashAudience(b)}
 if(s==='monetization'){return renderMonetization(b)}
 if(s==='ads'){b.innerHTML=adsCenterHtml();bindAdsCenter();return}
 if(s==='moderation'){b.innerHTML=moderationHtml();return}
 if(s==='verification'){b.innerHTML=`<div class="cb-panel"><h2>Verification</h2><p>Personal · Creator · Business · Organization</p><p>Identity document + live image/liveness + ৳450 monthly subscription + Admin review.</p><p><b>Verified benefits:</b> Badge · Identity trust · Priority review/support · Impersonation protection · Advanced creator/business tools · Monetization/ads trust advantages.</p><button class="cb-action primary" id="dashVerify">Get Verified</button></div>`;$cb('dashVerify').onclick=openVerification;return}
 if(s==='notifications'){return renderDashboardNotifications(b)}
}
async function renderDashOverview(b){
 try{
  const d=unwrapData(await apiRequest('/professional-dashboard/overview?days=28')),o=d.overview||{},i=d.creatorInsights||{};
  b.innerHTML=`<div class="cb-panel"><h2>Overview</h2><p class="cb-subtitle">Your profile and creator performance for the last 28 days.</p>
   <div class="dashboard-kpis">${metricCard('Posts',o.posts??0)}${metricCard('Friends',o.friends??0)}${metricCard('Followers',o.followers??0)}${metricCard('Following',o.following??0)}${metricCard('Reach',i.reach??0)}${metricCard('Impressions',i.impressions??0)}${metricCard('Profile views',i.profileViews??0)}${metricCard('Engagements',i.totalEngagement??0)}</div></div>`;
 }catch(e){b.innerHTML=`<div class="cb-panel"><h2>Overview</h2><div class="cb-empty-panel">${cbEscape(e.message)}</div></div>`}
}
async function renderDashContent(b){
 try{
  const d=unwrapData(await apiRequest('/professional-dashboard/top-content?days=28')),items=d.content||d.topContent||d.posts||d.items||[];
  b.innerHTML=`<div class="cb-panel"><h2>Content</h2><p class="cb-subtitle">See which posts and videos are performing best.</p>
   <div class="dashboard-kpis">${metricCard('Published content',d.totalContent??items.length??0)}${metricCard('Post reach',d.reach??'—')}${metricCard('Engagement',d.engagement??'—')}${metricCard('Video views',d.videoViews??'—')}</div>
   <h3 style="margin-top:18px">Top content</h3><div>${Array.isArray(items)&&items.length?items.slice(0,10).map((x,i)=>`<div class="detail-row"><div><b>${cbEscape(x.title||x.body||`Content ${i+1}`)}</b><small style="display:block;color:#65676b">Reach ${cbEscape(x.reach??0)} · Engagement ${cbEscape(x.engagement??x.totalEngagement??0)}</small></div></div>`).join(''):'<div class="cb-empty-panel">No content analytics yet.</div>'}</div></div>`;
 }catch(e){b.innerHTML=`<div class="cb-panel"><h2>Content</h2><div class="cb-empty-panel">${cbEscape(e.message)}</div></div>`}
}
async function renderDashAudience(b){
 try{
  const d=unwrapData(await apiRequest('/professional-dashboard/audience?days=28')),a=d.audience||d;
  b.innerHTML=`<div class="cb-panel"><h2>Audience</h2><p class="cb-subtitle">Privacy-safe audience insights from valid activity.</p>
    <div class="dashboard-kpis">${metricCard('Followers',a.followers??a.totalFollowers??0)}${metricCard('Followers gained',a.followersGained??0)}${metricCard('Followers lost',a.followersLost??0)}${metricCard('Net growth',a.netFollowerGrowth??0)}${metricCard('Reach',a.reach??0)}${metricCard('Engaged audience',a.engagedAudience??a.engagements??0)}${metricCard('Countries',a.countries?.length??'—')}${metricCard('Cities',a.cities?.length??'—')}</div>
    <h3 style="margin-top:18px">Audience breakdown</h3><p>${cbEscape(a.summary||'Audience data will expand as your content receives valid impressions and engagement.')}</p></div>`;
 }catch(e){b.innerHTML=`<div class="cb-panel"><h2>Audience</h2><div class="cb-empty-panel">${cbEscape(e.message)}</div></div>`}
}
function openMonetizationPolicies(){
 showFeature(`<div class="feature-page"><div class="cb-panel" style="max-width:900px;margin:0 auto;">
  <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">
   <div><h2 style="margin-bottom:4px;">Cirklebook Monetization Policies</h2><p class="cb-subtitle">Rules creators must follow to qualify for and keep monetization.</p></div>
   <button id="monetizationPolicyBack" class="cb-action">← Back to Monetization</button>
  </div>
  <div class="cb-empty-panel" style="margin-top:16px;text-align:left;line-height:1.65;">
   <h3 style="margin-top:0;">1. Account eligibility</h3>
   <p>Your account must remain in good standing and must not have serious or repeated Community Standards or monetization-policy violations.</p>
   <h3>2. Islamic values and prohibited content</h3>
   <p>Content used for monetization must respect Cirklebook's Islamic values. Pornography or obscenity, gambling, alcohol promotion, drugs, anti-Islamic propaganda, religious blasphemy, vulgar or unethical entertainment, and other content against Cirklebook's Islamic values are not eligible for monetization.</p>
   <h3>3. Original and lawful content</h3>
   <p>Creators must have the right to publish and monetize their content. Copyright infringement, unauthorized reused content, stolen media, or misleading ownership claims can make content or an account ineligible.</p>
   <h3>4. Authentic growth</h3>
   <p>Fake followers, purchased engagement, automated or coordinated manipulation, artificial watch time, spam, or other attempts to manipulate eligibility metrics are prohibited.</p>
   <h3>5. Safe and trustworthy activity</h3>
   <p>Scams, deceptive practices, harmful or prohibited advertising, and attempts to evade moderation or enforcement can result in monetization restriction or removal.</p>
   <h3>6. Review and enforcement</h3>
   <p>Cirklebook may review eligible accounts and content before monetization is activated. Serious or repeated violations may lead to warnings, temporary restrictions, loss of monetization, or further account action. Uncertain contextual, educational, historical, or news content may be sent for human moderator review.</p>
   <h3>7. Ongoing compliance</h3>
   <p>Meeting the numeric eligibility thresholds does not guarantee monetization. Creators must continue to follow these policies after approval.</p>
  </div>
 </div></div>`,'topDashboardBtn');
 $cb('monetizationPolicyBack')?.addEventListener('click',()=>openDashboard('monetization'));
}

async function renderMonetization(b){
 let current={followers:0,posts:0,watchHours:0,ageDays:0,impressions:0,engagements:0,verified:false,policyStatus:'Not evaluated'};
 try{
   const d=unwrapData(await apiRequest('/professional-dashboard/overview?days=90')),o=d.overview||{},i=d.creatorInsights||{};
   current.followers=Number(o.followers??0);current.posts=Number(o.posts??0);
   current.watchHours=Number(i.qualifiedWatchHours??i.watchHours??0);
   current.ageDays=Number(d.accountAgeDays??o.accountAgeDays??0);
   current.impressions=Number(i.impressions??o.impressions??0);
   current.engagements=Number(i.totalEngagement??i.engagements??o.engagements??0);
   current.verified=Boolean(d.verified??o.verified??state.currentUser?.verified);
   current.policyStatus=String(d.monetizationPolicyStatus??o.monetizationPolicyStatus??i.monetizationPolicyStatus??'Not evaluated');
 }catch(_){}
 const rows=[
   ['Followers',current.followers,1000,''],
   ['Posts (Content Writing & image)',current.posts,200,''],
   ['Qualified watch hours (Reels)',current.watchHours,1000,' hours'],
   ['Account age',current.ageDays,150,' days'],
   ['Impressions',current.impressions,40000,''],
   ['Engagements',current.engagements,5000,'']
 ];
 b.innerHTML=`<div class="cb-panel"><h2>Monetization</h2><p class="cb-subtitle">Your current progress toward Cirklebook creator monetization.</p><h3>Monetization Eligibility</h3>
  <div>${rows.map(([l,v,t,suf])=>{const pct=Math.min(100,Math.round((v/t)*100));return `<div class="progress-row"><b>${l}</b><div class="progress-track"><div class="progress-bar" style="width:${pct}%"></div></div><span>${v.toLocaleString()} / ${t.toLocaleString()}${suf}</span></div>`}).join('')}</div>
  <div class="cb-empty-panel" style="margin-top:16px;text-align:left;">
   <div style="display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap;"><b>Policy requirements</b><span style="font-weight:700;">Policy Status: ${cbEscape(current.policyStatus)}</span></div>
   <div style="margin-top:10px;display:grid;gap:7px;line-height:1.5;">
    <div>✓ Account in good standing</div>
    <div>✓ No serious policy violations</div>
    <div>✓ Community Standards followed</div>
    <div>✓ Monetization Policies followed</div>
    <div>✓ No copyright or reused-content abuse</div>
    <div>✓ No fake engagement or follower manipulation</div>
   </div>
   <button id="viewMonetizationPolicies" type="button" class="cb-action primary" style="margin-top:14px;">View Monetization Policies</button>
  </div>
  <h3 style="margin-top:18px">Programs</h3><div class="program-grid">${['Video Monetization','Reels Monetization','Ads Revenue','Fan Support','Subscriptions','Sponsored Content'].map(x=>`<div class="program-card"><b>${x}</b><p class="cb-subtitle">Eligibility-based program</p></div>`).join('')}</div></div>`;
 $cb('viewMonetizationPolicies')?.addEventListener('click',openMonetizationPolicies);
}

async function renderDashboardNotifications(b){
 try{
  const d=unwrapData(await apiRequest('/notifications')),arr=d.notifications||d.items||d||[];
  b.innerHTML=`<div class="cb-panel"><h2>Notifications</h2><p class="cb-subtitle">Creator and account activity that needs your attention.</p><div class="notification-list">${Array.isArray(arr)&&arr.length?arr.slice(0,30).map(n=>`<div class="notification-item ${n.read||n.isRead?'':'unread'}"><span class="notification-dot"></span><div><b>${cbEscape(n.title||'Notification')}</b><p>${cbEscape(n.message||n.body||'')}</p></div></div>`).join(''):'<div class="cb-empty-panel">No notifications.</div>'}</div></div>`;
 }catch(e){b.innerHTML=`<div class="cb-panel"><h2>Notifications</h2><div class="cb-empty-panel">${cbEscape(e.message)}</div></div>`}
}
function adsCenterHtml(){return `<div class="cb-panel"><div style="display:flex;justify-content:space-between;align-items:center"><div><h2>Ads Center</h2><p class="cb-subtitle">Create, boost and review Cirklebook ads.</p></div><button id="createAdBtn" class="cb-action primary">Create Ad</button></div>
 <h3>Campaign Objectives</h3><div class="metric-grid">${['Website Traffic','Engagement','Followers','Messages','Video Views','Leads','App/Website Promotion','Product/Service Promotion'].map(x=>`<button class="metric-card" data-ad-objective="${x}" style="text-align:left">${x}</button>`).join('')}</div>
 <h3 style="margin-top:16px">Advertisement Policy</h3><p>Gambling, alcohol, pornographic services, drugs, haram/immoral products and misleading advertisements are prohibited. Ads follow AI Scan → Policy Check → Human Review (when needed) → Approval.</p></div>`}
function bindAdsCenter(){
 $cb('createAdBtn')?.addEventListener('click',()=>openAdsBuilder());
 document.querySelectorAll('[data-ad-objective]').forEach(x=>x.onclick=()=>openAdsBuilder(x.dataset.adObjective));
}
function openAdsBuilder(objective='Website Traffic',postId=''){
 showFeature(`<div class="feature-page"><div class="ads-layout">
   <main class="cb-panel">
    <h2>${postId?'Boost post':'Create ad'}</h2><p class="cb-subtitle">Guided Cirklebook ad setup.</p>
    <div class="ad-builder-section"><h3>Goal</h3><select id="adObjective" style="width:100%;padding:11px">${['Website Traffic','Engagement','Followers','Messages','Video Views','Leads','App/Website Promotion','Product/Service Promotion'].map(x=>`<option ${x===objective?'selected':''}>${x}</option>`).join('')}</select></div>
    <div class="ad-builder-section"><h3>Ad creative</h3><textarea id="adText" placeholder="Ad text"></textarea><input id="adMedia" type="file" accept="image/*,video/*"><input id="adDestination" placeholder="Destination URL / message destination"></div>
    <div class="ad-builder-section"><h3>Audience</h3><input id="adAudience" placeholder="Audience"><input id="adLocation" placeholder="Location"></div>
    <div class="ad-builder-section"><h3>Budget & duration</h3><input id="adBudget" type="number" min="1" placeholder="Daily or total budget"><input id="adDuration" type="number" min="1" placeholder="Duration (days)"></div>
    <div class="ad-builder-section"><h3>Payment</h3><select id="adPayment"><option value="">Choose payment method</option><option>bKash</option><option>Nagad</option><option>Rocket</option><option>Card / Gateway</option></select></div>
    <div class="ad-builder-section"><h3>Review</h3><p>AI Scan → Advertisement Policy Check → Human Review when needed → Approval.</p><div id="adBuilderMsg" class="message hidden"></div><button id="submitAdBtn" class="primary-button">Submit for Ad Review</button></div>
   </main>
   <aside class="cb-panel ad-preview-card"><h3>Ad preview</h3><span class="ad-status">Draft</span><p id="adPreviewText" style="margin-top:12px">Your ad text will appear here.</p><div id="adPreviewMedia" class="ad-preview-media">Image / Video preview</div><button class="cb-action primary" style="width:100%;margin-top:10px">Call to action</button></aside>
 </div></div>`);
 const txt=$cb('adText'),media=$cb('adMedia');txt.oninput=()=>$cb('adPreviewText').textContent=txt.value||'Your ad text will appear here.';
 media.onchange=()=>{const f=media.files?.[0],box=$cb('adPreviewMedia');if(!f)return;const u=URL.createObjectURL(f);box.innerHTML=f.type.startsWith('video/')?`<video src="${u}" controls></video>`:`<img src="${u}" alt="">`};
 $cb('submitAdBtn').onclick=()=>{const m=$cb('adBuilderMsg');m.textContent='The complete ad is ready in the UI. Payment processing, persistent campaigns and review submission require Ads/Payments backend endpoints.';m.style.background='#fff4ce';m.style.color='#684f00';m.classList.remove('hidden')};
}
function moderationHtml(){return `<div class="cb-panel"><h2>AI Content Moderation</h2><p><b>Every post must respect Islamic values.</b></p>
 <div class="workflow"><span>UPLOAD</span>→<span>AI SCAN</span>→<span>POLICY CHECK</span>→<span>RISK SCORE</span>→<span>SAFE / REVIEW / VIOLATION</span></div>
 <p style="margin-top:14px">Scans: Image · Video · Audio · Text · Caption · Thumbnail · Links</p>
 <div class="standards-grid">${['Obscenity','Pornographic content','Gambling','Alcohol promotion','Drugs','Anti-Islamic propaganda','Obscene or vulgar video','Immoral / unethical entertainment','Content contrary to Islamic values'].map(x=>`<div class="standard-item">❌ ${x}</div>`).join('')}</div>
 <h3 style="margin-top:16px">Human Moderator Review</h3><p>Uncertain educational, historical, news or contextual content is not automatically rejected. Reviewers see Content, User, AI reason, Policy category, Risk score and Previous violations, with Approve · Reject · Request Changes · Escalate actions.</p></div>`}


// ---------------- Pages ----------------
function openPagesHub(){
 showFeature(`<div class="feature-page"><div class="cb-panel"><div style="display:flex;justify-content:space-between;align-items:center"><div><h2>Pages</h2><p class="cb-subtitle">Create and manage your Cirklebook Pages.</p></div><button id="newFullPage" class="cb-action primary">Create a Page</button></div><div id="pageList">Loading Pages...</div></div></div>`,'topPagesBtn');
 $cb('newFullPage').onclick=openCreatePage;loadPageList();
}

let cbNetworkFeedTimer=0;
function cbStopNetworkFeed(){if(cbNetworkFeedTimer){clearTimeout(cbNetworkFeedTimer);cbNetworkFeedTimer=0;}}
async function cbLoadNetworkFeed(type){
 const box=$cb(type==='pages'?'cbPagesNetworkFeed':'cbGroupsNetworkFeed');if(!box)return;
 try{const response=await apiRequest(`/${type}/feed?_=${Date.now()}`),posts=await hydrateSharedPosts(extractPosts(response));if(!box.isConnected)return;box.innerHTML=Array.isArray(posts)&&posts.length?posts.map(renderPost).join(''):`<div class="cb-empty-panel">No ${type==='pages'?'Page':'Group'} posts yet.</div>`;}catch(e){if(box.isConnected)box.innerHTML=`<div class="cb-empty-panel" style="color:#b42318">${cbEscape(e.message||'Unable to load feed.')}</div>`;}
 if(box.isConnected)cbNetworkFeedTimer=setTimeout(()=>cbLoadNetworkFeed(type),15000);
}
async function openPagesFeed(){
 cbStopNetworkFeed();
 showFeature(`<div class="feature-page cb-network-feed-layout"><aside class="cb-panel cb-network-feed-menu"><h2>Pages</h2><button id="cbManagePages">Manage Pages</button><button id="cbCreatePageFromFeed">Create Page</button></aside><main><div class="cb-panel cb-network-feed-head"><h2>Page Feed</h2><p>Posts from Cirklebook Pages and Pages you follow.</p></div><div id="cbPagesNetworkFeed" class="feed"><div class="cb-empty-panel">Loading Page posts…</div></div></main><aside class="cb-network-feed-ads"><h3>Sponsored</h3>${Array.from({length:4},()=>'<button type="button" class="cb-network-ad-box" data-cb-network-ad><b>Ad space</b><span>Advertise here</span></button>').join('')}</aside></div>`,'topPagesBtn');
 $cb('cbManagePages').onclick=openPagesHub;$cb('cbCreatePageFromFeed').onclick=openCreatePage;document.querySelectorAll('[data-cb-network-ad]').forEach(button=>button.onclick=()=>openAdsBuilder('Website Traffic'));await cbLoadNetworkFeed('pages');
}
async function openGroupsFeed(){
 cbStopNetworkFeed();
 showFeature(`<div class="feature-page cb-network-feed-layout"><aside class="cb-panel cb-network-feed-menu"><h2>Groups</h2><button id="cbMyGroups">My Groups</button><button id="cbDiscoverGroups">Discover Groups</button><button id="cbCreateGroupFromFeed">Create Group</button></aside><main><div id="cbGroupsNetworkFeed" class="feed"><div class="cb-empty-panel">Loading Group posts…</div></div></main><aside class="cb-network-feed-ads"><h3>Sponsored</h3>${Array.from({length:4},()=>'<button type="button" class="cb-network-ad-box" data-cb-network-ad><b>Ad space</b><span>Advertise here</span></button>').join('')}</aside></div>`,'topGroupsBtn');
 $cb('cbMyGroups').onclick=()=>openGroupsFull('my');$cb('cbDiscoverGroups').onclick=()=>openGroupsFull('discover');$cb('cbCreateGroupFromFeed').onclick=openCreateGroupFull;document.querySelectorAll('[data-cb-network-ad]').forEach(button=>button.onclick=()=>openAdsBuilder('Website Traffic'));await cbLoadNetworkFeed('groups');
}
async function loadPageList(){
 const box=$cb('pageList');
 try{
  let r;try{r=await apiRequest('/pages/mine')}catch(_){r=await apiRequest('/pages')}
  const arr=(r?.data?.pages||r?.pages||r?.data||[]);
  window.__cirklebookPageList=Array.isArray(arr)?arr:[];
  box.innerHTML=window.__cirklebookPageList.length?`<div class="people-grid">${window.__cirklebookPageList.map((p,i)=>{const icon=cbEntityMediaUrl({...cbLoadEntityExtra('page',p.id||p.page_id),...p},'profile')||`${A}logo-main.png`;return `<div class="person-card"><img class="avatar" src="${cbEscape(icon)}"><div class="person-main"><strong>${cbEscape(p.name||'Page')}</strong><small>${cbEscape(p.category||'Cirklebook Page')}</small></div><button type="button" class="cb-action" data-page-manage-index="${i}">Manage</button></div>`}).join('')}</div>`:'<div class="cb-empty-panel">No Pages yet. Create your first Page.</div>';
  box.querySelectorAll('[data-page-manage-index]').forEach(btn=>btn.addEventListener('click',()=>{const p=window.__cirklebookPageList?.[Number(btn.dataset.pageManageIndex)];if(p)openPageManager(p);}));
 }catch(e){box.innerHTML=`<div class="cb-empty-panel">${cbEscape(e.message)}</div>`}
}

function cbReadFilePreview(file, cb){
  if(!file){cb('');return;}
  const reader=new FileReader();
  reader.onload=()=>cb(String(reader.result||''));
  reader.readAsDataURL(file);
}
function cbLocalEntityKey(type,id){return `cirklebook_${type}_extra_${id||'draft'}`;}
function cbLoadEntityExtra(type,id){
  try{return JSON.parse(localStorage.getItem(cbLocalEntityKey(type,id))||'{}')||{};}catch(_){return {};}
}
function cbSaveEntityExtra(type,id,data){
  try{localStorage.setItem(cbLocalEntityKey(type,id),JSON.stringify(data||{}));}catch(_){}
}
function cbExtractCreatedEntity(result,key){
  return result?.data?.[key]||result?.[key]||result?.data||result||{};
}
async function cbTryEntityPatch(type,id,payload){
  if(!id)return false;
  try{
    await apiRequest(`/${type}/${encodeURIComponent(id)}`,{method:'PATCH',body:JSON.stringify(payload)});
    return true;
  }catch(e){
    console.warn(`${type} PATCH not available; keeping editable data locally.`,e);
    return false;
  }
}

async function cbPersistEntityMedia(type,id,file,kind){
  if(!id||!file)return '';
  const media=await uploadMedia(file);
  const mediaId=media?.id||media?.media_asset_id||media?.mediaAssetId;
  if(!mediaId)throw new Error('Uploaded image ID was not returned.');
  const payload=kind==='cover'?{coverMediaId:mediaId}:{profileMediaId:mediaId};
  await apiRequest(`/${type}/${encodeURIComponent(id)}/media`,{method:'PATCH',body:JSON.stringify(payload)});
  /* Always store the stable asset URL. A direct /media/file URL points to
     ephemeral deployment storage and becomes broken after the next update. */
  return `${API_BASE_URL}/media/asset/${encodeURIComponent(mediaId)}`;
}
function cbEntityMediaUrl(entity,kind){
  const direct=kind==='cover'
    ? (entity?.cover_url||entity?.coverUrl||entity?.cover||'')
    : (entity?.profile_url||entity?.profileUrl||entity?.logo||'');
  if(direct)return direct;
  const mediaId=kind==='cover'
    ? (entity?.cover_media_id||entity?.coverMediaId)
    : (entity?.profile_media_id||entity?.profileMediaId);
  return mediaId?`${API_BASE_URL}/media/asset/${encodeURIComponent(mediaId)}`:'';
}

function openCreatePage(){
  let pageLogo='',pageCover='',pageLogoFile=null,pageCoverFile=null;
  showFeature(`<div class="feature-page cb-entity-create-layout">
    <aside class="cb-panel cb-entity-sidebar">
      <h2>Create a Page</h2>
      <p class="cb-subtitle">Build your Page before publishing it. You can change the logo, cover and details here.</p>
      <div class="cb-entity-media-buttons">
        <button id="pageLogoBtn" class="cb-action">📷 Add Page logo</button>
        <button id="pageCoverBtn" class="cb-action">🖼️ Add cover photo</button>
      </div>
      <input id="pageLogoInput" type="file" accept="image/*" hidden>
      <input id="pageCoverInput" type="file" accept="image/*" hidden>
      <div class="cb-form-grid">
        <input id="pageName" placeholder="Page name (required)">
        <label class="cb-page-username-field"><span>https://cirklebook.com/</span><input id="pageUsername" placeholder="unique-page-name" maxlength="50"></label>
        <input id="pageCategory" placeholder="Category (required)">
        <textarea id="pageBio" rows="3" placeholder="Bio (optional)"></textarea>
        <input id="pageWebsite" placeholder="Website">
        <div id="pagePhoneFields" class="cb-page-phone-fields"><div><input class="page-phone-input" placeholder="Phone with country code"><button type="button" class="cb-remove-page-phone" aria-label="Remove phone">×</button></div></div>
        <button id="addPagePhone" type="button" class="cb-action">＋ Add another phone</button>
        <input id="pageEmail" placeholder="Email">
        <input id="pageLocation" placeholder="Location">
        <button id="createFullPageBtn" class="primary-button">Create Page</button>
        <div id="pageCreateMsg" class="message hidden"></div>
      </div>
    </aside>
    <main class="cb-panel cb-entity-preview-panel">
      <div class="cb-preview-topbar"><b>Desktop Preview</b><div class="device-switch"><button class="active" data-device="desktop">🖥</button><button data-device="mobile">📱</button></div></div>
      <div id="pagePreviewFrame" class="preview-frame cb-live-entity-preview">
        <div id="pagePreviewCover" class="preview-cover-v3 cb-editable-cover"><button id="pagePreviewCoverEdit">📷 Edit cover photo</button></div>
        <div class="cb-preview-profile-row">
          <div id="pagePreviewLogo" class="preview-avatar-v3 cb-editable-avatar"><button id="pagePreviewLogoEdit">📷</button></div>
          <div class="preview-meta-v3"><h2 id="previewPageName">Page name</h2><p id="previewPageCategory">Page · Category</p><p id="previewPageBio"></p></div>
          <div class="cb-preview-actions"><button class="cb-action">Follow</button><button class="cb-action">Message</button><button class="cb-action">•••</button></div>
        </div>
        <div class="preview-tabs-v3">Posts · About · Followers · Photos · Videos · Reels · More</div>
        <div class="preview-body-v3 cb-page-preview-body">
          <div class="fake-card"><h3>Intro</h3><p id="previewPageContact">0 Followers</p></div>
          <div class="fake-card"><h3>Posts</h3><p>Your Page posts will appear here.</p></div>
        </div>
      </div>
    </main>
  </div>`,'topPagesBtn');

  const update=()=>{
    $cb('previewPageName').textContent=$cb('pageName').value||'Page name';
    $cb('previewPageCategory').textContent=`Page · ${$cb('pageCategory').value||'Category'}`;
    $cb('previewPageBio').textContent=$cb('pageBio').value||'';
    const contact=[$cb('pageLocation').value,$cb('pageWebsite').value,...Array.from(document.querySelectorAll('.page-phone-input')).map(x=>x.value.trim()).filter(Boolean)].filter(Boolean).join(' · ');
    $cb('previewPageContact').textContent=contact||'0 Followers';
  };
  ['pageName','pageUsername','pageCategory','pageBio','pageWebsite','pageEmail','pageLocation'].forEach(id=>$cb(id).addEventListener('input',update));
  const bindPagePhones=()=>document.querySelectorAll('.page-phone-input').forEach(input=>input.oninput=update);
  const addPagePhoneField=(value='')=>{const row=document.createElement('div');row.innerHTML=`<input class="page-phone-input" placeholder="Phone with country code" value="${cbEscape(value)}"><button type="button" class="cb-remove-page-phone" aria-label="Remove phone">×</button>`;$cb('pagePhoneFields').appendChild(row);row.querySelector('input').oninput=update;row.querySelector('button').onclick=()=>{row.remove();update();};};
  $cb('addPagePhone').onclick=()=>addPagePhoneField();
  document.querySelector('.cb-remove-page-phone').onclick=e=>{if(document.querySelectorAll('.page-phone-input').length>1)e.currentTarget.parentElement.remove();else e.currentTarget.previousElementSibling.value='';update();};bindPagePhones();

  $cb('pageLogoBtn').onclick=$cb('pagePreviewLogoEdit').onclick=()=>$cb('pageLogoInput').click();
  $cb('pageCoverBtn').onclick=$cb('pagePreviewCoverEdit').onclick=()=>$cb('pageCoverInput').click();
  $cb('pageLogoInput').onchange=e=>{pageLogoFile=e.target.files?.[0]||null;cbReadFilePreview(pageLogoFile,url=>{pageLogo=url;$cb('pagePreviewLogo').style.backgroundImage=url?`url("${url}")`:'';});};
  $cb('pageCoverInput').onchange=e=>{pageCoverFile=e.target.files?.[0]||null;cbReadFilePreview(pageCoverFile,url=>{pageCover=url;$cb('pagePreviewCover').style.backgroundImage=url?`url("${url}")`:'';});};
  document.querySelectorAll('[data-device]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-device]').forEach(x=>x.classList.remove('active'));b.classList.add('active');$cb('pagePreviewFrame').classList.toggle('mobile',b.dataset.device==='mobile')});

  $cb('createFullPageBtn').onclick=async()=>{
    const m=$cb('pageCreateMsg'),button=$cb('createFullPageBtn'),name=$cb('pageName').value.trim(),username=$cb('pageUsername').value.trim().replace(/^@+/,''),category=$cb('pageCategory').value.trim(),bio=$cb('pageBio').value.trim();
    if(!name||!username||!category){m.textContent='Page name, unique username and category are required.';m.classList.remove('hidden');return;}
    const phones=Array.from(document.querySelectorAll('.page-phone-input')).map(x=>x.value.trim()).filter(Boolean);
    const extra={name,username,category,bio,website:$cb('pageWebsite').value.trim(),phones,phone:phones.join(' · '),email:$cb('pageEmail').value.trim(),location:$cb('pageLocation').value.trim(),logo:pageLogo,cover:pageCover};
    try{
      button.disabled=true;button.textContent='Creating Page…';m.classList.add('hidden');
      const result=await apiRequest('/pages',{method:'POST',body:JSON.stringify({name,username,category,description:bio,website:extra.website,phones,email:extra.email,location:extra.location})});
      const page=cbExtractCreatedEntity(result,'page'),id=page?.id||page?.pageId||page?.page_id||name;
      if(pageLogoFile)pageLogo=await cbPersistEntityMedia('pages',id,pageLogoFile,'profile');
      if(pageCoverFile)pageCover=await cbPersistEntityMedia('pages',id,pageCoverFile,'cover');
      extra.logo=pageLogo;extra.cover=pageCover;
      cbSaveEntityExtra('page',id,extra);
      showToast('Page created');
      openPageManager({...page,...extra,id});
    }catch(e){m.textContent=e.message;m.classList.remove('hidden');button.disabled=false;button.textContent='Create Page';}
  };
}

function openPageManager(page={}){
  const id=page.id||page.pageId||page.page_id||page.name||'draft',localPage=cbLoadEntityExtra('page',id),serverPage=Object.fromEntries(Object.entries(page||{}).filter(([,value])=>value!==null&&value!==undefined&&value!=='')),saved={...localPage,...serverPage};
  const persistPageSnapshot=value=>{if(String(state.activePage?.id||state.activePage?.page_id||'')!==String(id))return;const merged={...state.activePage,...value,id};state.activePage=merged;const user=state.currentUser||{},userId=String(user.id||user.user_id||user.userId||user.username||'anonymous'),selection=JSON.stringify({type:'page',id:String(id),page:merged});localStorage.setItem('cirklebook_active_identity',selection);localStorage.setItem(`cirklebook_active_identity:${userId}`,selection);localStorage.setItem('cirklebook_active_page_snapshot',JSON.stringify(merged));};
  state.activePage=saved;
  if(id!=='draft')localStorage.setItem('cirklebook_active_page_id',String(id));
  if(dom.topUsername)dom.topUsername.textContent=saved.name||'Page';
  let logo=cbEntityMediaUrl(saved,'profile'),cover=cbEntityMediaUrl(saved,'cover');
  const pageFollowers=Number(saved.followers_count||saved.follower_count||saved.followersCount||0);
  const pageFollowing=Number(saved.following_count||saved.followingCount||0);
  const pagePhones=Array.isArray(saved.phones)?saved.phones.filter(Boolean):(saved.phone?[saved.phone]:[]);
  showFeature(`<div class="feature-page cb-entity-manager cb-page-manager">
    <section class="cb-panel cb-entity-manager-hero">
      <div id="managePageCover" class="cb-manager-cover" ${cover?`style="background-image:url('${cover}')"`:''}><button type="button" id="managePageCoverBtn" class="cb-action" style="cursor:pointer;position:relative;z-index:5">📷 Edit cover photo</button></div>
      <div class="cb-manager-head"><div id="managePageLogo" class="cb-manager-logo" ${logo?`style="background-image:url('${logo}')"`:''}><button id="managePageLogoBtn">📷</button></div><div class="cb-manager-page-summary"><h1 id="managePageTitle">${cbEscape(saved.name||'Page')}</h1>${saved.username?`<a class="cb-page-username" href="/${encodeURIComponent(saved.username)}">@${cbEscape(saved.username)}</a>`:''}<p id="managePageMeta">${cbEscape(saved.category||'Page')}</p><b>${pageFollowers.toLocaleString()} Followers · ${pageFollowing.toLocaleString()} Following</b>${pagePhones.map(phone=>`<a class="cb-manager-page-phone" href="tel:${cbEscape(phone)}">📞 ${cbEscape(phone)}</a>`).join('')}</div><div class="cb-manager-page-actions"><button id="managePageDashboardBtn" class="cb-action primary">▣ Professional Dashboard</button><button id="managePageSearchBtn" class="cb-action">⌕ Search</button><button id="managePageEditBtn" class="cb-action">Edit Page</button><button id="managePageMoreBtn" class="cb-action" aria-label="More Page options">•••</button></div></div>
      <nav class="cb-manager-tabs" id="managePageTabs">
        ${[['home','All'],['profile','About'],['followers','Followers'],['photos','Photos'],['reels','Reels'],['insights','Insights'],['ads','Ads'],['more','More ▾']].map(([key,label],i)=>`<button type="button" class="cb-page-tab ${i===0?'active':''}" data-page-tab="${key}">${label}</button>`).join('')}
      </nav>
    </section>
    <div class="cb-entity-manager-grid">
      <aside class="cb-panel"><h3>Page details</h3><p id="managePageBioText">${cbEscape(saved.bio||saved.description||'Add a bio')}</p><p>🌐 ${cbEscape(saved.website||saved.contact_website||'No website')}</p>${(Array.isArray(saved.phones)?saved.phones:(saved.phone?[saved.phone]:[])).map(phone=>`<p>📞 ${cbEscape(phone)}</p>`).join('')||'<p>📞 No phone</p>'}<p>✉ ${cbEscape(saved.email||'No email')}</p><p>📍 ${cbEscape(saved.location||'No location')}</p><button id="managePageDetailsBtn" class="cb-action cb-wide-action">Edit details</button></aside>
      <main class="cb-panel" id="managePageMain">
        <div id="managePageSection">
          <h3>Posts</h3>
          <p>Your Page content and posts will appear here.</p>
          <div class="cb-manager-actions">
            <button id="managePageCreatePostBtn" class="cb-action primary">Create post</button>
            <button id="managePageCreateReelBtn" class="cb-action">Create reel</button>
            <button id="managePageLiveBtn" class="cb-action">Live</button>
          </div>
          <div id="managePagePosts" style="margin-top:16px"><div class="cb-empty-panel">Loading Page posts...</div></div>
        </div>
      </main>
    </div>
    <input id="managePageLogoInput" type="file" accept="image/*" hidden><input id="managePageCoverInput" type="file" accept="image/*" hidden>
  </div>`);

  const openEdit=()=>cbShowDialog('Edit Page',`<div class="cb-edit-profile-facebook">
    <section class="cb-edit-section"><label>Page name<input id="peName" value="${cbEscape(saved.name||'')}"></label><label>Page username<div class="cb-page-username-field"><span>https://cirklebook.com/</span><input id="peUsername" value="${cbEscape(saved.username||'')}"></div></label><label>Category<input id="peCategory" value="${cbEscape(saved.category||'')}"></label><label>Bio<textarea id="peBio" rows="3">${cbEscape(saved.bio||saved.description||'')}</textarea></label><label>Website<input id="peWebsite" value="${cbEscape(saved.website||saved.contact_website||'')}"></label><div><b>Phone numbers</b><div id="pePhoneFields" class="cb-page-phone-fields">${(Array.isArray(saved.phones)&&saved.phones.length?saved.phones:['']).map(phone=>`<div><input class="pe-phone-input" value="${cbEscape(phone)}" placeholder="Phone with country code"><button type="button" class="pe-remove-phone">×</button></div>`).join('')}</div><button id="peAddPhone" type="button" class="cb-action">＋ Add another phone</button></div><label>Email<input id="peEmail" value="${cbEscape(saved.email||'')}"></label><label>Location<input id="peLocation" value="${cbEscape(saved.location||'')}"></label></section>
    <button id="peSave" class="primary-button">Save changes</button><button id="peDelete" type="button" class="cb-danger-delete">Delete Page</button><div id="peMsg" class="message hidden"></div>
  </div>`);
  $cb('managePageEditBtn').onclick=$cb('managePageDetailsBtn').onclick=()=>{openEdit();const addPhone=(value='')=>{const row=document.createElement('div');row.innerHTML=`<input class="pe-phone-input" value="${cbEscape(value)}" placeholder="Phone with country code"><button type="button" class="pe-remove-phone">×</button>`;$cb('pePhoneFields').appendChild(row);row.querySelector('button').onclick=()=>row.remove();};$cb('peAddPhone').onclick=()=>addPhone();document.querySelectorAll('.pe-remove-phone').forEach(button=>button.onclick=()=>button.parentElement.remove());$cb('peSave').onclick=async()=>{const phones=Array.from(document.querySelectorAll('.pe-phone-input')).map(x=>x.value.trim()).filter(Boolean);const data={name:$cb('peName').value.trim(),username:$cb('peUsername').value.trim().replace(/^@+/,''),category:$cb('peCategory').value.trim(),bio:$cb('peBio').value.trim(),website:$cb('peWebsite').value.trim(),phones,phone:phones.join(' · '),email:$cb('peEmail').value.trim(),location:$cb('peLocation').value.trim(),logo,cover,profile_media_id:saved.profile_media_id||null,cover_media_id:saved.cover_media_id||null};const btn=$cb('peSave'),msg=$cb('peMsg');btn.disabled=true;btn.textContent='Saving…';try{const result=await apiRequest(`/pages/${encodeURIComponent(id)}`,{method:'PATCH',body:JSON.stringify(data)});const server=cbExtractCreatedEntity(result,'page'),updated={...page,...saved,...data,...server,id};cbSaveEntityExtra('page',id,updated);persistPageSnapshot(updated);cbCloseDialog();openPageManager(updated);showToast('Page changes saved');}catch(e){msg.textContent=e.message||'Unable to update Page';msg.classList.remove('hidden');btn.disabled=false;btn.textContent='Save changes';}};$cb('peDelete').onclick=async()=>{if(!confirm(`Delete Page "${saved.name||'Page'}"? This cannot be undone.`))return;const btn=$cb('peDelete');btn.disabled=true;btn.textContent='Deleting...';try{await apiRequest(`/pages/${encodeURIComponent(id)}`,{method:'DELETE'});localStorage.removeItem(cbLocalEntityKey('page',id));cbCloseDialog();showToast('Page deleted');openPagesHub();}catch(e){btn.disabled=false;btn.textContent='Delete Page';const m=$cb('peMsg');m.textContent=e.message||'Unable to delete Page';m.classList.remove('hidden');}};};
  $cb('managePageDashboardBtn').onclick=()=>{if(window.CirklebookPageIdentityNav?.route)window.CirklebookPageIdentityNav.route('dashboard');else showPageTab('dashboard');};
  $cb('managePageSearchBtn').onclick=()=>{const term=prompt(`Search posts from ${saved.name||'this Page'}`,'');if(term===null)return;const value=term.trim().toLowerCase();document.querySelectorAll('#managePagePosts .post').forEach(post=>post.hidden=!!value&&!post.textContent.toLowerCase().includes(value));};
  $cb('managePageMoreBtn').onclick=()=>{cbShowDialog('Page options',`<div class="program-grid"><button type="button" class="program-card" id="managePageMoreMessage"><b>💬 Message</b><p>Open Page messages</p></button><button type="button" class="program-card" id="managePageMoreCopy"><b>🔗 Copy Page link</b><p>https://cirklebook.com/${cbEscape(saved.username||'page')}</p></button></div>`);$cb('managePageMoreMessage')?.addEventListener('click',()=>{cbCloseDialog();if(window.CirklebookPageIdentityNav?.route)window.CirklebookPageIdentityNav.route('messages');else showPageTab('messages');});$cb('managePageMoreCopy')?.addEventListener('click',()=>{const link=`https://cirklebook.com/${saved.username||''}`;navigator.clipboard?.writeText(link);showToast('Page link copied');cbCloseDialog();});};
  $cb('managePageLogoBtn').onclick=()=>$cb('managePageLogoInput').click();
  $cb('managePageLogoInput').onchange=async e=>{const file=e.target.files?.[0];if(!file)return;try{logo=await cbPersistEntityMedia('pages',id,file,'profile');const data={...saved,logo,cover};cbSaveEntityExtra('page',id,data);persistPageSnapshot(data);openPageManager({...page,...data,id});showToast('Page logo updated');}catch(err){showToast(err.message||'Unable to save Page logo');}};

  // Page cover photo: same proven approach used for the fixed Group cover.
  const managePageCoverBtn=$cb('managePageCoverBtn');
  const managePageCoverInput=$cb('managePageCoverInput');
  if(managePageCoverBtn && managePageCoverInput){
    managePageCoverBtn.onclick=(e)=>{
      e.preventDefault();
      e.stopPropagation();
      managePageCoverInput.value='';
      managePageCoverInput.click();
    };
    managePageCoverInput.onchange=async e=>{
      const file=e.target.files?.[0];
      if(!file) return;
      if(!file.type?.startsWith('image/')){
        showToast('Please choose an image file.');
        return;
      }
      try{
        cover=await cbPersistEntityMedia('pages',id,file,'cover');
        const data={...saved,logo,cover};
        cbSaveEntityExtra('page',id,data);
        persistPageSnapshot(data);
        const box=$cb('managePageCover');
        if(box){
          box.style.backgroundImage=`url("${cover}")`;
          box.style.backgroundSize='cover';
          box.style.backgroundPosition='center';
        }
        showToast('Page cover photo updated');
        openPageManager({...page,...data,id});
      }catch(err){showToast(err.message||'Unable to save Page cover');}
    };
  }

  let pagePostsCache=[];

  const fetchPagePosts=async()=>{
    try{
      const r=await apiRequest('/pages/feed');
      const all=await hydrateSharedPosts(extractPosts(r));
      pagePostsCache=(Array.isArray(all)?all:[])
        .filter(p=>String(p?.page_id||p?.pageId||'')===String(id))
        .map(p=>({
          ...p,
          username:saved.username||p.username,
          display_name:saved.name||p.display_name,
          page_name:saved.name||p.page_name,
          page_username:saved.username||p.page_username,
          profile_media_id:saved.profile_media_id||p.profile_media_id
        }));
      return pagePostsCache;
    }catch(e){
      pagePostsCache=[];
      throw e;
    }
  };

  const pageCount=(...keys)=>{
    for(const k of keys){
      const v=saved?.[k] ?? page?.[k];
      if(v!==undefined && v!==null && v!=='') return Number(v)||0;
    }
    return 0;
  };

  const renderPagePostList=(posts,emptyText)=>{
    return posts.length
      ? posts.map(renderPost).join('')
      : `<div class="cb-empty-panel">${cbEscape(emptyText)}</div>`;
  };

  const bindPagePostActions=()=>{
    const main=$cb('managePageMain');
    if(!main || main.dataset.postActionsBound==='1') return;
    main.dataset.postActionsBound='1';
    main.addEventListener('click',async(event)=>{
      const button=event.target.closest('[data-action]');
      if(!button) return;
      const action=button.dataset.action, postId=button.dataset.postId;
      if(!postId) return;
      if(action==='like'){await toggleLike(postId,button);return;}
      if(action==='comment'){await toggleComments(postId);return;}
      if(action==='send-comment'){await sendComment(postId,button);return;}
      if(action==='share'){await sharePost(postId,button);return;}
      if(action==='save'){await toggleSave(postId,button);return;}
    });
  };

  const bindPageComposerButtons=()=>{
    $cb('managePageCreatePostBtn')?.addEventListener('click',()=>{
      state.pagePostTarget={pageId:id,reload:()=>showPageTab('home',true)};
      openPostModal(false);
    });
    $cb('managePageCreateReelBtn')?.addEventListener('click',()=>{
      state.pagePostTarget={pageId:id,reload:()=>showPageTab('reels',true)};
      openPostModal(true);
    });
    $cb('managePageLiveBtn')?.addEventListener('click',()=>{
      if(typeof openLiveProducer==='function') openLiveProducer();
      else showToast('Live setup is not available right now.');
    });
  };

  const showPageTab=async(tab='posts',forceReload=false)=>{
    const section=$cb('managePageSection');
    if(!section) return;

    document.querySelectorAll('#managePageTabs [data-page-tab]').forEach(btn=>{
      btn.classList.toggle('active',btn.dataset.pageTab===tab);
    });

    if(['home','dashboard','monetization','photos','videos','reels','insights'].includes(tab) && (forceReload || !pagePostsCache.length)){
      section.innerHTML='<div class="cb-empty-panel">Loading…</div>';
      try{ await fetchPagePosts(); }
      catch(e){
        section.innerHTML=`<div class="cb-empty-panel" style="color:#b42318">${cbEscape(e?.message||'Unable to load Page content.')}</div>`;
        return;
      }
    }

    if(tab==='home'){
      section.innerHTML=`<div class="cb-page-manager-composer-wrap"><div class="cb-page-composer cb-page-manager-composer"><span class="cb-page-composer-avatar"><i>${cbEscape(String(saved.name||'P').charAt(0).toUpperCase())}</i>${logo?`<img src="${cbEscape(logo)}" alt="" onerror="this.remove()">`:''}</span><button id="managePageCreatePostBtn" type="button">What's on your mind?</button><button id="managePageLiveBtn" class="cb-page-composer-icon" type="button" title="Live video" aria-label="Live video"><img src="assets/icon-live.png" alt=""></button><button id="managePageCreatePhotoBtn" class="cb-page-composer-icon" type="button" title="Photo / Video" aria-label="Photo / Video"><img src="assets/icon-photo-video.png" alt=""></button><button id="managePageFeelingBtn" class="cb-page-composer-icon" type="button" title="Feeling / Activity" aria-label="Feeling / Activity"><img src="assets/icon-feeling.png" alt=""></button></div></div>
        <div id="managePagePosts" style="margin-top:16px">${renderPagePostList(pagePostsCache,'No Page posts yet.')}</div>`;
      $cb('managePageCreatePhotoBtn')?.addEventListener('click',()=>{
        state.pagePostTarget={pageId:id,reload:()=>showPageTab('home',true)};
        openPostModal(false);
        dom.mediaInput?.click();
      });
      $cb('managePageFeelingBtn')?.addEventListener('click',()=>{
        state.pagePostTarget={pageId:id,reload:()=>showPageTab('home',true)};
        openPostModal(false);
        setTimeout(()=>{if(typeof chooseFeeling==='function')chooseFeeling();},80);
      });
      bindPageComposerButtons();
      bindPagePostActions();
      return;
    }

    if(tab==='profile'){
      section.innerHTML=`<h3>Page Profile</h3>
        <div class="cb-form-grid">
          <p><b>Page name</b><br>${cbEscape(saved.name||'Page')}</p>
          <p><b>Category</b><br>${cbEscape(saved.category||'Category')}</p>
          <p><b>Bio</b><br>${cbEscape(saved.bio||'No bio added')}</p>
          <p><b>Website</b><br>${cbEscape(saved.website||'No website')}</p>
          <p><b>Phone</b><br>${cbEscape(saved.phone||'No phone')}</p>
          <p><b>Email</b><br>${cbEscape(saved.email||'No email')}</p>
          <p><b>Location</b><br>${cbEscape(saved.location||'No location')}</p>
          <button id="managePageAboutEditBtn" class="cb-action primary">Edit Page details</button>
        </div>`;
      $cb('managePageAboutEditBtn')?.addEventListener('click',()=> $cb('managePageEditBtn')?.click());
      return;
    }

    if(tab==='dashboard'){
      const reactions=pagePostsCache.reduce((sum,p)=>sum+Number(p?.reaction_count||p?.reactions_count||0),0);
      const views=pagePostsCache.reduce((sum,p)=>sum+Number(p?.view_count||p?.views_count||0),0);
      section.innerHTML=`<div class="cb-page-section-head"><div><h3>Professional Dashboard</h3><p>Performance and creator tools for ${cbEscape(saved.name||'this Page')}.</p></div></div><div class="metric-grid"><div class="metric-card"><span>Followers</span><strong>${pageCount('followers_count','follower_count','followersCount')}</strong></div><div class="metric-card"><span>Published content</span><strong>${pagePostsCache.length}</strong></div><div class="metric-card"><span>Reactions</span><strong>${reactions}</strong></div><div class="metric-card"><span>Views</span><strong>${views}</strong></div></div><div class="program-grid" style="margin-top:14px">${['Content performance','Audience growth','Page quality','Messages','Ads Center','Monetization'].map(x=>`<button class="program-card" type="button" data-page-dashboard-tool="${cbEscape(x.toLowerCase())}"><b>${cbEscape(x)}</b><p class="cb-subtitle">Open Page tools</p></button>`).join('')}</div>`;
      section.querySelector('[data-page-dashboard-tool="monetization"]')?.addEventListener('click',()=>showPageTab('monetization'));
      return;
    }

    if(tab==='monetization'){
      const followers=pageCount('followers_count','follower_count','followersCount'),views=pagePostsCache.reduce((sum,p)=>sum+Number(p?.view_count||p?.views_count||0),0);
      section.innerHTML=`<div class="cb-page-section-head"><div><h3>Page Monetization</h3><p>Income programs and eligibility belong only to ${cbEscape(saved.name||'this Page')}.</p></div></div><div class="metric-grid"><div class="metric-card"><span>Followers</span><strong>${followers}</strong></div><div class="metric-card"><span>Content views</span><strong>${views}</strong></div><div class="metric-card"><span>Estimated earnings</span><strong>৳0</strong></div><div class="metric-card"><span>Status</span><strong>Not eligible</strong></div></div><h3 style="margin-top:18px">Income programs</h3><div class="program-grid">${['Video Monetization','Reels Monetization','Ads Revenue','Fan Support','Subscriptions','Sponsored Content'].map(x=>`<div class="program-card"><b>${x}</b><p class="cb-subtitle">Eligibility-based Page program</p></div>`).join('')}</div><div class="cb-policy-inline" style="margin-top:14px"><b>Page monetization review</b><span>Eligibility, policy compliance, payout verification and admin approval are required before real earnings are enabled.</span></div>`;
      return;
    }

    if(tab==='followers'){
      section.innerHTML=`<h3>Followers</h3>
        <div class="metric-grid">
          <div class="metric-card"><span>Followers</span><strong>${pageCount('followers_count','follower_count','followersCount')}</strong></div>
          <div class="metric-card"><span>Following</span><strong>${pageCount('following_count','followingCount')}</strong></div>
        </div>
        <div class="cb-empty-panel" style="margin-top:14px">Follower profiles will appear here when the Page followers endpoint returns member details.</div>`;
      return;
    }

    if(tab==='photos'){
      const items=pagePostsCache.filter(p=>{
        const media=Array.isArray(p?.media)?p.media:[];
        return String(p?.post_type||p?.postType||'').toLowerCase()==='image' ||
          media.some(m=>String(m?.media_type||m?.type||m?.mime_type||'').toLowerCase().includes('image'));
      });
      section.innerHTML=`<h3>Photos</h3><div id="managePagePosts">${renderPagePostList(items,'No photos on this Page yet.')}</div>`;
      bindPagePostActions();
      return;
    }

    if(tab==='videos'){
      const items=pagePostsCache.filter(p=>{
        const t=String(p?.post_type||p?.postType||'').toLowerCase();
        const media=Array.isArray(p?.media)?p.media:[];
        return t==='video' || media.some(m=>String(m?.media_type||m?.type||m?.mime_type||'').toLowerCase().includes('video'));
      });
      section.innerHTML=`<h3>Videos</h3><div id="managePagePosts">${renderPagePostList(items,'No videos on this Page yet.')}</div>`;
      bindPagePostActions();
      return;
    }

    if(tab==='reels'){
      const items=pagePostsCache.filter(p=>String(p?.post_type||p?.postType||'').toLowerCase()==='reel' || p?.is_reel===true);
      section.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center;gap:12px"><h3>Reels</h3><button id="managePageCreateReelBtn" class="cb-action primary">Create reel</button></div>
        <div id="managePagePosts">${renderPagePostList(items,'No reels on this Page yet.')}</div>`;
      bindPageComposerButtons();
      bindPagePostActions();
      return;
    }

    if(tab==='reviews'){
      section.innerHTML=`<h3>Reviews</h3>
        <div class="metric-grid"><div class="metric-card"><span>Rating</span><strong>${cbEscape(String(saved.rating||page.rating||'—'))}</strong></div><div class="metric-card"><span>Reviews</span><strong>${pageCount('reviews_count','review_count','reviewsCount')}</strong></div></div>
        <div class="cb-empty-panel" style="margin-top:14px">Customer reviews will appear here when submitted to this Page.</div>`;
      return;
    }

    if(tab==='messages'){
      section.innerHTML=`<div class="cb-page-section-head"><div><h3>Page Messages</h3><p>Conversations addressed to ${cbEscape(saved.name||'this Page')} only.</p></div><span class="cb-page-active-pill">Acting as Page</span></div><div class="cb-empty-panel">No Page conversations yet. Personal profile messages are never shown in this Page inbox.</div>`;
      return;
    }

    if(tab==='insights'){
      const total=pagePostsCache.length;
      const photos=pagePostsCache.filter(p=>String(p?.post_type||p?.postType||'').toLowerCase()==='image').length;
      const videos=pagePostsCache.filter(p=>['video','reel'].includes(String(p?.post_type||p?.postType||'').toLowerCase())).length;
      section.innerHTML=`<h3>Insights</h3>
        <div class="metric-grid">
          <div class="metric-card"><span>Page posts</span><strong>${total}</strong></div>
          <div class="metric-card"><span>Photos</span><strong>${photos}</strong></div>
          <div class="metric-card"><span>Videos/Reels</span><strong>${videos}</strong></div>
          <div class="metric-card"><span>Followers</span><strong>${pageCount('followers_count','follower_count','followersCount')}</strong></div>
        </div>
        <button id="managePageOpenDashboardBtn" class="cb-action primary" style="margin-top:14px">Open Professional Dashboard</button>`;
      $cb('managePageOpenDashboardBtn')?.addEventListener('click',()=>{ if(typeof openDashboard==='function') openDashboard('audience'); });
      return;
    }

    if(tab==='ads'){
      section.innerHTML=`<h3>Ads</h3><p>Create and manage promotions for this Page.</p>
        <div class="cb-manager-actions"><button id="managePageCreateAdBtn" class="cb-action primary">Create Ad</button><button id="managePageAdsCenterBtn" class="cb-action">Ads Center</button></div>`;
      $cb('managePageCreateAdBtn')?.addEventListener('click',()=>{ if(typeof openAdsBuilder==='function') openAdsBuilder('Engagement'); });
      $cb('managePageAdsCenterBtn')?.addEventListener('click',()=>{
        if(typeof adsCenterHtml==='function'){showFeature(`<div class="feature-page">${adsCenterHtml()}</div>`);if(typeof bindAdsCenter==='function')bindAdsCenter();}
      });
      return;
    }

    if(tab==='more'){
      cbShowDialog('More',`<div class="program-grid cb-page-more-actions"><button id="managePageMoreLiveBtn" class="program-card"><b>🔴 Live</b><p>Start a Page live video</p></button><button id="managePageMoreGroupsBtn" class="program-card"><b>👥 Groups</b><p>Open Groups as this Page</p></button><button id="managePageMoreEventsBtn" class="program-card"><b>📅 Events</b><p>View Page event tools</p></button></div>`);
      $cb('managePageMoreLiveBtn')?.addEventListener('click',()=>{state.pagePostTarget={pageId:id,reload:()=>showPageTab('home',true)};if(typeof openLiveProducer==='function')openLiveProducer();else openPostModal(true);});
      $cb('managePageMoreGroupsBtn')?.addEventListener('click',()=>{if(window.CirklebookPageIdentityNav?.route)window.CirklebookPageIdentityNav.route('groups');else if(typeof openGroupsHub==='function')openGroupsHub();});
      $cb('managePageMoreEventsBtn')?.addEventListener('click',()=>showToast('Page Events is ready for upcoming event tools.'));
      return;
    }
  };

  $cb('managePageTabs')?.addEventListener('click',(event)=>{
    const btn=event.target.closest('[data-page-tab]');
    if(!btn) return;
    event.preventDefault();
    showPageTab(btn.dataset.pageTab);
  });

  bindPagePostActions();
  showPageTab('home',true);
}

// ---------------- Groups / friends / video / messages / notifications ----------------
function openFriendsFull(section='friends'){
  showFeature(`<div class="feature-page cb-friends-facebook"><aside class="cb-panel cb-friends-nav"><h2>Friends</h2>${[['friends','🏠','Home'],['incoming','👤','Friend requests'],['find','➕','Find friends'],['recent','🕘','Recently added'],['birthdays','🎂','Birthdays'],['city','📍','Current city'],['hometown','🏠','Hometown'],['followers','⭐','Followers'],['following','✓','Following']].map(([k,i,l])=>`<button data-friend-view="${k}" class="${section===k?'active':''}"><span>${i}</span>${l}</button>`).join('')}</aside><main class="cb-panel cb-friends-main"><div class="cb-friends-head"><div><h2 id="friendsTitle">Friends</h2><p id="friendsSubtitle">Manage your connections.</p></div><input id="friendSearch" class="cb-search" placeholder="Search friends"></div><div id="friendsFullBody"><div class="cb-empty-panel">Loading…</div></div></main></div>`);
  featureView.querySelectorAll('[data-friend-view]').forEach(b=>b.onclick=()=>openFriendsFull(b.dataset.friendView));loadFriendsFull(section);
}
async function loadFriendsFull(section){
  const body=$cb('friendsFullBody'),title=$cb('friendsTitle'),sub=$cb('friendsSubtitle');if(!body)return;
  const titles={friends:'Friends',incoming:'Friend requests',find:'Find friends',recent:'Recently added',birthdays:'Birthdays',city:'Current city',hometown:'Hometown',followers:'Followers',following:'Following'};title.textContent=titles[section]||'Friends';
  sub.textContent=section==='incoming'?'Review people who want to connect with you.':section==='find'?'Discover people you may know.':'Manage your Cirklebook connections.';
  try{
    let arr=[];
    if(['friends','recent','birthdays','city','hometown'].includes(section)){const r=await apiRequest('/friends');arr=r?.data?.friends||r?.friends||r?.data||[];}
    else if(section==='incoming'){const r=await apiRequest('/friends/requests/incoming');arr=r?.data?.requests||r?.requests||r?.data||[];}
    else if(section==='followers'||section==='following'){
      const endpoints=section==='followers'
        ? ['/follows/followers','/users/me/followers','/me/followers','/followers']
        : ['/follows/following','/users/me/following','/me/following','/following'];
      let loaded=false,lastErr=null;
      for(const ep of endpoints){
        try{
          const r=await apiRequest(ep);
          const d=r?.data??r??{};
          const list=d?.users??d?.followers??d?.following??d?.items??d?.results??(Array.isArray(d)?d:null);
          if(Array.isArray(list)){arr=list;loaded=true;break;}
        }catch(err){lastErr=err;}
      }
      if(!loaded && section==='following'){
        try{
          const fr=await apiRequest('/friends');
          const list=fr?.data?.friends||fr?.friends||fr?.data||[];
          const checked=await Promise.all((Array.isArray(list)?list:[]).map(async z=>{
            const uid=z.userId||z.user_id||z.friendId||z.friend_id||z.user?.id||z.id||'';
            if(!uid)return null;
            try{
              const sr=await apiRequest(`/follows/${encodeURIComponent(uid)}/status`);
              const sd=sr?.data||sr||{};
              const yes=Boolean(sd.isFollowing||sd.following||sd.is_following||sd.status==='accepted'||sd.status==='active'||sd.status==='following');
              return yes?z:null;
            }catch(_){return null;}
          }));
          arr=checked.filter(Boolean); loaded=true;
        }catch(err){lastErr=err;}
      }
      if(!loaded){console.warn('FOLLOW LIST ROUTE unavailable:',lastErr?.message||lastErr);arr=[];}
    }
    else{body.innerHTML='<div class="cb-empty-panel"><b>Find friends</b><br>Use the main Cirklebook search bar to search for people.</div>';return;}
    const people=(Array.isArray(arr)?arr:[]).map(z=>({id:z.userId||z.user_id||z.friendId||z.friend_id||z.user?.id||z.id||'',requestId:z.requestId||z.request_id||z.id||'',name:z.displayName||z.display_name||z.name||z.user?.displayName||z.user?.display_name||z.user?.username||z.username||'Cirklebook user',username:z.username||z.user?.username||'',avatar:z.avatarUrl||z.avatar_url||z.user?.avatarUrl||z.user?.avatar_url||''}));
    body.innerHTML=people.length?`<div class="cb-friend-card-grid">${people.map(p=>`<article class="cb-friend-card" data-person="${cbEscape((p.name+' '+p.username).toLowerCase())}"><div class="cb-friend-photo">${p.avatar?`<img src="${cbEscape(p.avatar)}" alt="">`:`<span>${cbEscape(p.name.charAt(0).toUpperCase())}</span>`}</div><div class="cb-friend-card-body"><h3>${cbEscape(p.name)}</h3><p>${p.username?'@'+cbEscape(p.username):'Cirklebook'}</p><div class="cb-friend-actions">${section==='incoming'?`<button class="cb-action primary" data-accept-request="${cbEscape(p.requestId)}">Confirm</button><button class="cb-action" data-decline-request="${cbEscape(p.requestId)}">Delete</button>`:section==='friends'?`<button class="cb-action" data-unfriend="${cbEscape(p.id)}">Unfriend</button>`:`<button class="cb-action primary">View profile</button>`}</div></div></article>`).join('')}</div>`:'<div class="cb-empty-panel">No people found in this section.</div>';
    $cb('friendSearch').oninput=()=>{const q=$cb('friendSearch').value.trim().toLowerCase();body.querySelectorAll('[data-person]').forEach(c=>c.hidden=q&&!c.dataset.person.includes(q));};
    body.querySelectorAll('[data-accept-request]').forEach(b=>b.onclick=async()=>{try{await apiRequest(`/friends/requests/${encodeURIComponent(b.dataset.acceptRequest)}/accept`,{method:'POST'});showToast('Friend request accepted');loadFriendsFull('incoming')}catch(e){showToast(e.message)}});
    body.querySelectorAll('[data-decline-request]').forEach(b=>b.onclick=async()=>{try{await apiRequest(`/friends/requests/${encodeURIComponent(b.dataset.declineRequest)}/decline`,{method:'POST'});showToast('Friend request deleted');loadFriendsFull('incoming')}catch(e){showToast(e.message)}});
    body.querySelectorAll('[data-unfriend]').forEach(b=>b.onclick=async()=>{try{await apiRequest(`/friends/${encodeURIComponent(b.dataset.unfriend)}`,{method:'DELETE'});showToast('Friend removed');loadFriendsFull('friends')}catch(e){showToast(e.message)}});
  }catch(e){body.innerHTML=`<div class="cb-empty-panel">${cbEscape(e.message||'Unable to load friends.')}</div>`}
}
function openGroupsFull(mode='my'){
 showFeature(`<div class="feature-page"><div class="cb-panel"><div style="display:flex;justify-content:space-between;align-items:center"><div><h2>Groups</h2><p class="cb-subtitle">Build and discover communities.</p></div><button id="createGroupFullBtn" class="cb-action primary">Create Group</button></div><div class="cb-tabs-row"><button data-group-view="my" class="${mode==='my'?'active':''}">My Groups</button><button data-group-view="discover" class="${mode==='discover'?'active':''}">Discover</button></div><div id="groupsFullBody" style="margin-top:14px">Loading...</div></div></div>`);
 $cb('createGroupFullBtn').onclick=openCreateGroupFull;featureView.querySelectorAll('[data-group-view]').forEach(b=>b.onclick=()=>openGroupsFull(b.dataset.groupView));loadGroupsFull(mode);
}
async function loadGroupsFull(mode){
 const b=$cb('groupsFullBody');
 try{
  let r;try{r=await apiRequest(mode==='my'?'/groups/mine':'/groups/discover')}catch(_){r=await apiRequest('/groups')}
  const arr=r?.data?.groups||r?.groups||r?.data||[];
  window.__cirklebookGroupList=Array.isArray(arr)?arr:[];
  b.innerHTML=window.__cirklebookGroupList.length?`<div class="cb-group-home-grid">${window.__cirklebookGroupList.map((g,i)=>{const merged={...cbLoadEntityExtra('group',g.id||g.group_id),...g},icon=cbEntityMediaUrl(merged,'profile')||`${A}logo-main.png`,cover=cbEntityMediaUrl(merged,'cover');return `<article class="cb-group-home-card">${cover?`<div class="cb-group-card-cover" style="background-image:url('${cbEscape(cover)}')"></div>`:`<div class="cb-group-card-cover"></div>`}<div class="cb-group-card-info"><img class="avatar" src="${cbEscape(icon)}"><div class="person-main"><strong>${cbEscape(g.name||'Group')}</strong><small>${g.username?'@'+cbEscape(g.username)+' · ':''}${cbEscape(g.privacy||g.visibility||'public')} group</small></div><button type="button" class="cb-action ${mode==='my'?'':'primary'}" data-group-action-index="${i}">${mode==='my'?'View group':'Join group'}</button></div></article>`}).join('')}</div>`:'<div class="cb-empty-panel">No groups found.</div>';
  b.querySelectorAll('[data-group-action-index]').forEach(btn=>btn.addEventListener('click',async()=>{const g=window.__cirklebookGroupList?.[Number(btn.dataset.groupActionIndex)];if(!g)return;if(mode==='my'){openGroupManager(g);return;}const id=g.id||g.groupId||g.group_id;try{if(id)await apiRequest(`/groups/${encodeURIComponent(id)}/join`,{method:'POST'});showToast('Group joined');openGroupsFull('my');}catch(e){showToast(e.message||'Unable to join group');}}));
 }catch(e){b.innerHTML=`<div class="cb-empty-panel">${cbEscape(e.message)}</div>`}
}
function openCreateGroupFull(){
  let groupLogo='',groupCover='',groupLogoFile=null,groupCoverFile=null;
  showFeature(`<div class="feature-page cb-entity-create-layout">
    <aside class="cb-panel cb-entity-sidebar">
      <h2>Create group</h2><p><b>${cbEscape(cbName())}</b><br><small>Admin</small></p>
      <div class="cb-entity-media-buttons"><button id="groupLogoBtn" class="cb-action">📷 Add Group logo</button><button id="groupCoverBtn" class="cb-action">🖼️ Add cover photo</button></div>
      <input id="groupLogoInput" type="file" accept="image/*" hidden><input id="groupCoverInput" type="file" accept="image/*" hidden>
      <div class="cb-form-grid">
        <input id="groupName" placeholder="Group name (required)">
        <label class="cb-username-field"><span>Group username</span><div><b>cirklebook.com/</b><input id="groupUsername" placeholder="group.name" autocomplete="off"></div></label>
        <select id="groupPrivacy"><option value="public">Public</option><option value="private">Private</option></select>
        <textarea id="groupDescription" rows="3" placeholder="Description / About"></textarea>
        <input id="groupLocation" placeholder="Location">
        <input id="groupTags" placeholder="Topics / Tags">
        <textarea id="groupRules" rows="3" placeholder="Group rules"></textarea>
        <label class="cb-check-row"><input id="groupInviteFollowers" type="checkbox" checked> Invite followers</label>
        <label class="cb-check-row"><input id="groupApproveMembers" type="checkbox" checked> Admin approval for new members</label>
        <button id="groupCreateBtn" class="primary-button">Create Group</button>
        <div id="groupCreateMsg" class="message hidden"></div>
      </div>
    </aside>
    <main class="cb-panel cb-entity-preview-panel">
      <div class="cb-preview-topbar"><b>Desktop Preview</b><div class="device-switch"><button class="active" data-device="desktop">🖥</button><button data-device="mobile">📱</button></div></div>
      <div id="groupPreviewFrame" class="preview-frame cb-live-entity-preview">
        <div id="groupPreviewCover" class="preview-cover-v3 cb-editable-cover"><button id="groupPreviewCoverEdit">📷 Edit cover photo</button></div>
        <div class="cb-preview-profile-row"><div id="groupPreviewLogo" class="preview-avatar-v3 cb-editable-avatar"><button id="groupPreviewLogoEdit">📷</button></div><div class="preview-meta-v3"><h2 id="previewGroupName">Group name</h2><p id="previewGroupPrivacy">🌐 Public group · 1 member</p><small id="previewGroupUrl">cirklebook.com/group.name</small></div></div>
        <div class="preview-tabs-v3">About · Discussion · Members · Events · Media</div>
        <div class="preview-body-v3"><div class="fake-card"><h3>About</h3><p id="previewGroupAbout">Public group</p><p id="previewGroupDetails"></p></div><div class="fake-card"><h3>What's on your mind?</h3><p>Photo/video · Tag people · Feeling/activity</p></div></div>
      </div>
    </main>
  </div>`);

  const groupSlug=v=>String(v||'').trim().replace(/^@+/,'').replace(/\s+/g,'.').replace(/[^\p{L}\p{N}._]/gu,'').toLowerCase();
  let usernameTouched=false;
  const update=()=>{const pr=$cb('groupPrivacy').value;if(!usernameTouched)$cb('groupUsername').value=groupSlug($cb('groupName').value);$cb('previewGroupName').textContent=$cb('groupName').value||'Group name';$cb('previewGroupPrivacy').textContent=`${pr==='public'?'🌐':'🔒'} ${pr[0].toUpperCase()+pr.slice(1)} group · 1 member`;$cb('previewGroupUrl').textContent=`cirklebook.com/${$cb('groupUsername').value||'group.name'}`;$cb('previewGroupAbout').textContent=$cb('groupDescription').value||`${pr[0].toUpperCase()+pr.slice(1)} group`;$cb('previewGroupDetails').textContent=[$cb('groupLocation').value,$cb('groupTags').value].filter(Boolean).join(' · ');};
  ['groupName','groupDescription','groupLocation','groupTags'].forEach(id=>$cb(id).addEventListener('input',update));$cb('groupUsername').addEventListener('input',()=>{usernameTouched=true;$cb('groupUsername').value=groupSlug($cb('groupUsername').value);update();});$cb('groupPrivacy').onchange=update;
  $cb('groupLogoBtn').onclick=$cb('groupPreviewLogoEdit').onclick=()=>$cb('groupLogoInput').click();$cb('groupCoverBtn').onclick=$cb('groupPreviewCoverEdit').onclick=()=>$cb('groupCoverInput').click();
  $cb('groupLogoInput').onchange=e=>{groupLogoFile=e.target.files?.[0]||null;cbReadFilePreview(groupLogoFile,url=>{groupLogo=url;$cb('groupPreviewLogo').style.backgroundImage=url?`url("${url}")`:'';});};
  $cb('groupCoverInput').onchange=e=>{groupCoverFile=e.target.files?.[0]||null;cbReadFilePreview(groupCoverFile,url=>{groupCover=url;$cb('groupPreviewCover').style.backgroundImage=url?`url("${url}")`:'';});};
  document.querySelectorAll('[data-device]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-device]').forEach(x=>x.classList.remove('active'));b.classList.add('active');$cb('groupPreviewFrame').classList.toggle('mobile',b.dataset.device==='mobile')});

  $cb('groupCreateBtn').onclick=async()=>{
    const m=$cb('groupCreateMsg'),name=$cb('groupName').value.trim(),username=groupSlug($cb('groupUsername').value),privacy=$cb('groupPrivacy').value;
    if(!name){m.textContent='Group name is required.';m.classList.remove('hidden');return;}
    if(!/^[\p{L}\p{N}._]{3,50}$/u.test(username)){m.textContent='Username must be 3–50 letters or numbers; dots and underscores are allowed.';m.classList.remove('hidden');return;}
    const extra={name,username,privacy,description:$cb('groupDescription').value.trim(),location:$cb('groupLocation').value.trim(),tags:$cb('groupTags').value.trim(),rules:$cb('groupRules').value.trim(),inviteFollowers:$cb('groupInviteFollowers').checked,approveMembers:$cb('groupApproveMembers').checked,logo:groupLogo,cover:groupCover};
    try{
      // Media previews are Base64 data URLs and must never be placed in the
      // JSON create request. The original File objects are uploaded after the
      // lightweight Group record has been created.
      const createPayload={name,username,privacy,description:extra.description};
      const result=await apiRequest('/groups',{method:'POST',body:JSON.stringify(createPayload)});
      const group=cbExtractCreatedEntity(result,'group'),id=group?.id||group?.groupId||group?.group_id||name;
      if(groupLogoFile)groupLogo=await cbPersistEntityMedia('groups',id,groupLogoFile,'profile');
      if(groupCoverFile)groupCover=await cbPersistEntityMedia('groups',id,groupCoverFile,'cover');
      extra.logo=groupLogo;extra.cover=groupCover;
      cbSaveEntityExtra('group',id,extra);showToast('Group created');openGroupManager({...group,...extra,id});
    }catch(e){m.textContent=e.message;m.classList.remove('hidden');}
  };
}

function openGroupManager(group={}){
  const id=group.id||group.groupId||group.group_id||group.name||'draft',saved={...cbLoadEntityExtra('group',id),...group};
  let logo=cbEntityMediaUrl(saved,'profile'),cover=cbEntityMediaUrl(saved,'cover');

  showFeature(`<div class="feature-page cb-entity-manager">
    <section class="cb-panel cb-entity-manager-hero">
      <div id="manageGroupCover" class="cb-manager-cover" ${cover?`style="background-image:url('${cover}')"`:''}><button type="button" id="manageGroupCoverBtn" class="cb-action" style="cursor:pointer;position:relative;z-index:5">📷 Edit cover photo</button></div>
      <div class="cb-manager-head"><div id="manageGroupLogo" class="cb-manager-logo" ${logo?`style="background-image:url('${logo}')"`:''}><button id="manageGroupLogoBtn">📷</button></div><div class="cb-group-title-copy"><h1>${cbEscape(saved.name||'Group')}</h1><p>${saved.privacy==='private'?'🔒 Private':'🌐 Public'} group · ${cbEscape(saved.member_count||'1')} member${Number(saved.member_count||1)===1?'':'s'}</p>${saved.username?`<a href="/${encodeURIComponent(saved.username)}" data-group-public-url>${cbEscape(`cirklebook.com/${saved.username}`)}</a>`:''}</div><div class="cb-group-hero-actions"><button id="manageGroupInviteTopBtn" class="cb-action">Invite</button><button id="manageGroupShareBtn" class="cb-action">Share</button><button id="manageGroupEditBtn" class="cb-action primary">Edit Group</button></div></div>
      <nav class="cb-manager-tabs" id="manageGroupTabs">
        ${[
          ['about','About'],
          ['discussion','Discussion'],
          ['members','Members'],
          ['events','Events'],
          ['media','Media'],
          ['files','Files'],
          ['admin','Admin tools']
        ].map(([key,label],i)=>`<button type="button" class="cb-group-tab ${i===1?'active':''}" data-group-tab="${key}">${label}</button>`).join('')}
      </nav>
    </section>
    <div class="cb-entity-manager-grid">
      <aside class="cb-panel" id="manageGroupAside">
        <h3>About</h3><p>${cbEscape(saved.description||'Add a description')}</p><p>📍 ${cbEscape(saved.location||'No location')}</p><p>🏷 ${cbEscape(saved.tags||'No topics')}</p><h4>Rules</h4><p>${cbEscape(saved.rules||'No rules added')}</p><button id="manageGroupDetailsBtn" class="cb-action cb-wide-action">Edit details & settings</button>
      </aside>
      <main class="cb-panel" id="manageGroupMain">
        <div id="manageGroupSection">
          <div class="cb-unified-composer"><span id="manageGroupComposerAvatar" class="avatar">${cbEscape(String(saved.name||'G').charAt(0).toUpperCase())}</span><button id="manageGroupCreatePostBtn" type="button">What's on your mind?</button><button id="manageGroupLiveBtn" class="cb-composer-feature" type="button" title="Live video"><img src="assets/icon-live.png" alt=""></button><button id="manageGroupPhotoBtn" class="cb-composer-feature" type="button" title="Photo / Video"><img src="assets/icon-photo-video.png" alt=""></button><button id="manageGroupFeelingBtn" class="cb-composer-feature" type="button" title="Feeling / Activity"><img src="assets/icon-feeling.png" alt=""></button></div>
          <h3 style="margin-top:16px">Group posts</h3>
          <div id="manageGroupPosts"><div class="cb-empty-panel">Loading group posts...</div></div>
        </div>
      </main>
    </div>
    <input id="manageGroupLogoInput" type="file" accept="image/*" hidden><input id="manageGroupCoverInput" type="file" accept="image/*" hidden>
  </div>`);

  const groupPath=`/groups/${encodeURIComponent(id)}`;

  const extractGroupPosts=(result)=>{
    const candidates=[result?.data?.posts,result?.posts,result?.data?.items,result?.items,result?.data];
    for(const c of candidates){ if(Array.isArray(c)) return c; }
    return [];
  };

  const loadGroupPosts=async()=>{
    const box=$cb('manageGroupPosts');
    if(!box) return;
    box.innerHTML='<div class="cb-empty-panel">Loading group posts...</div>';
    try{
      const result=await apiRequest(`${groupPath}/posts`);
      let posts=extractGroupPosts(result);
      try{ if(typeof hydrateSharedPosts==='function') posts=await hydrateSharedPosts(posts); }catch(_){ }
      if(!posts.length){ box.innerHTML='<div class="cb-empty-panel">No group posts yet.</div>'; return; }
      box.innerHTML=posts.map(p=>typeof renderPost==='function'?renderPost(p):`<div class="cb-card">${cbEscape(p?.body||'Post')}</div>`).join('');
      try{ if(typeof initializeSecureVideoPlayers==='function') initializeSecureVideoPlayers(); }catch(_){ }
    }catch(e){
      console.error('GROUP POSTS LOAD:',e);
      box.innerHTML=`<div class="cb-empty-panel" style="color:#b42318">${cbEscape(e?.message||'Unable to load group posts.')}</div>`;
    }
  };

  const edit=()=>cbShowDialog('Edit Group',`<div class="cb-edit-profile-facebook"><section class="cb-edit-section"><label>Group name<input id="geName" value="${cbEscape(saved.name||'')}"></label><label>Group username<div class="cb-edit-url"><b>cirklebook.com/</b><input id="geUsername" value="${cbEscape(saved.username||'')}"></div></label><label>Privacy<select id="gePrivacy"><option value="public" ${saved.privacy!=='private'?'selected':''}>Public</option><option value="private" ${saved.privacy==='private'?'selected':''}>Private</option></select></label><label>Description<textarea id="geDescription" rows="3">${cbEscape(saved.description||'')}</textarea></label><label>Location<input id="geLocation" value="${cbEscape(saved.location||'')}"></label><label>Topics / Tags<input id="geTags" value="${cbEscape(saved.tags||'')}"></label><label>Group rules<textarea id="geRules" rows="4">${cbEscape(saved.rules||'')}</textarea></label><label class="cb-check-row"><input id="geApprove" type="checkbox" ${saved.approveMembers!==false?'checked':''}> Admin approval for new members</label></section><button id="geSave" class="primary-button">Save changes</button><button id="geDelete" type="button" class="cb-danger-delete">Delete Group</button><div id="geMsg" class="message hidden"></div></div>`);
  $cb('manageGroupEditBtn').onclick=$cb('manageGroupDetailsBtn').onclick=()=>{edit();$cb('geSave').onclick=async()=>{const data={name:$cb('geName').value.trim(),username:String($cb('geUsername').value||'').trim().replace(/^@+/,'').replace(/\s+/g,'').toLowerCase(),privacy:$cb('gePrivacy').value,description:$cb('geDescription').value.trim(),location:$cb('geLocation').value.trim(),tags:$cb('geTags').value.trim(),rules:$cb('geRules').value.trim(),approveMembers:$cb('geApprove').checked,logo,cover};const msg=$cb('geMsg');if(!data.name||!/^[\p{L}\p{N}._]{3,50}$/u.test(data.username)){msg.textContent='Enter a Group name and a valid unique username.';msg.classList.remove('hidden');return;}try{const updated=await apiRequest(`/groups/${encodeURIComponent(id)}`,{method:'PATCH',body:JSON.stringify(data)});const apiGroup=updated?.data?.group||updated?.group||{};cbSaveEntityExtra('group',id,data);cbCloseDialog();openGroupManager({...group,...data,...apiGroup,id});showToast('Group changes saved');}catch(e){msg.textContent=e.message||'Unable to update Group';msg.classList.remove('hidden');}};$cb('geDelete').onclick=async()=>{if(!confirm(`Delete Group "${saved.name||'Group'}"? This cannot be undone.`))return;const btn=$cb('geDelete');btn.disabled=true;btn.textContent='Deleting...';try{await apiRequest(`/groups/${encodeURIComponent(id)}`,{method:'DELETE'});localStorage.removeItem(cbLocalEntityKey('group',id));cbCloseDialog();showToast('Group deleted');openGroupsFull('my');}catch(e){btn.disabled=false;btn.textContent='Delete Group';const m=$cb('geMsg');m.textContent=e.message||'Unable to delete Group';m.classList.remove('hidden');}};};

  $cb('manageGroupLogoBtn').onclick=()=>$cb('manageGroupLogoInput').click();
  $cb('manageGroupLogoInput').onchange=async e=>{const file=e.target.files?.[0];if(!file)return;try{logo=await cbPersistEntityMedia('groups',id,file,'profile');const data={...saved,logo,cover};cbSaveEntityExtra('group',id,data);openGroupManager({...group,...data,id});showToast('Group logo updated');}catch(err){showToast(err.message||'Unable to save Group logo');}};

  // Group cover: explicit button -> hidden file input.
  // Keep this independent from the global media click bridge.
  const manageGroupCoverBtn=$cb('manageGroupCoverBtn');
  const manageGroupCoverInput=$cb('manageGroupCoverInput');

  if(manageGroupCoverBtn && manageGroupCoverInput){
    manageGroupCoverBtn.onclick=(e)=>{
      e.preventDefault();
      e.stopPropagation();
      manageGroupCoverInput.value='';
      manageGroupCoverInput.click();
    };

    manageGroupCoverInput.onchange=async e=>{
      const file=e.target.files?.[0];
      if(!file) return;
      if(!file.type?.startsWith('image/')){
        showToast('Please choose an image file.');
        return;
      }
      try{
        cover=await cbPersistEntityMedia('groups',id,file,'cover');
        const data={...saved,logo,cover};
        cbSaveEntityExtra('group',id,data);
        const coverBox=$cb('manageGroupCover');
        if(coverBox){
          coverBox.style.backgroundImage=`url("${cover}")`;
          coverBox.style.backgroundSize='cover';
          coverBox.style.backgroundPosition='center';
        }
        showToast('Group cover photo updated');
        openGroupManager({...group,...data,id});
      }catch(err){showToast(err.message||'Unable to save Group cover');}
    };
  }

  let groupPostsCache=[];

  const refreshGroupPosts=async()=>{
    try{
      const result=await apiRequest(`${groupPath}/posts`);
      let posts=extractGroupPosts(result);
      try{ if(typeof hydrateSharedPosts==='function') posts=await hydrateSharedPosts(posts); }catch(_){ }
      groupPostsCache=Array.isArray(posts)?posts:[];
      return groupPostsCache;
    }catch(e){
      console.error('GROUP POSTS LOAD:',e);
      groupPostsCache=[];
      throw e;
    }
  };

  const renderGroupPostList=(posts,emptyText='No group posts yet.')=>{
    if(!posts?.length) return `<div class="cb-empty-panel">${cbEscape(emptyText)}</div>`;
    return posts.map(p=>typeof renderPost==='function'
      ? renderPost(p)
      : `<div class="cb-card">${cbEscape(p?.body||'Post')}</div>`).join('');
  };

  const bindGroupPostActions=()=>{
    const main=$cb('manageGroupMain');
    if(!main || main.dataset.postActionsBound==='1') return;
    main.dataset.postActionsBound='1';
    main.addEventListener('click',async(event)=>{
      const button=event.target.closest('[data-action]');
      if(!button) return;
      const action=button.dataset.action,postId=button.dataset.postId;
      if(!postId) return;
      if(action==='like'){await toggleLike(postId,button);return;}
      if(action==='comment'){await toggleComments(postId);return;}
      if(action==='send-comment'){await sendComment(postId,button);return;}
      if(action==='share'){await sharePost(postId,button);return;}
      if(action==='save'){await toggleSave(postId,button);return;}
    });
  };

  const openGroupInviteDialog=()=>{
    cbShowDialog('Invite to group',`<div class="cb-form-grid"><p>Enter the user ID you want to invite.</p><input id="cbGroupInviteUser" placeholder="User ID"><div id="cbGroupInviteMsg" class="message hidden"></div><button id="cbGroupInviteSubmit" class="primary-button" type="button">Send invite</button></div>`);
    $cb('cbGroupInviteSubmit').onclick=async()=>{
      const userId=$cb('cbGroupInviteUser')?.value.trim()||'',msg=$cb('cbGroupInviteMsg');
      if(!userId){msg.textContent='Enter a user ID.';msg.classList.remove('hidden');return;}
      try{
        await apiRequest(`${groupPath}/invitations`,{method:'POST',body:JSON.stringify({userId,inviteeUserId:userId})});
        cbCloseDialog();showToast('Invitation sent');
      }catch(e){msg.textContent=e?.message||'Unable to send invitation.';msg.classList.remove('hidden');}
    };
  };

  $cb('manageGroupInviteTopBtn')?.addEventListener('click',openGroupInviteDialog);
  $cb('manageGroupShareBtn')?.addEventListener('click',async()=>{
    const publicUrl=`${location.origin}/${saved.username||id}`;
    try{await navigator.clipboard.writeText(publicUrl);showToast('Group link copied');}
    catch(_){prompt('Copy Group link',publicUrl);}
  });
  featureView.querySelector('[data-group-public-url]')?.addEventListener('click',event=>{
    event.preventDefault();
    if(saved.username)history.pushState({groupUsername:saved.username},'',`/${encodeURIComponent(saved.username)}`);
  });

  const loadGroupMembers=async(target)=>{
    const box=target||$cb('manageGroupSection');
    if(!box) return [];
    box.innerHTML='<div class="cb-empty-panel">Loading members...</div>';
    try{
      const r=await apiRequest(`${groupPath}/members`);
      const members=r?.data?.members||r?.members||r?.data||[];
      const list=Array.isArray(members)?members:[];
      box.innerHTML=list.length
        ? `<h3>Members</h3>${list.map(m=>`<div class="cb-card" style="margin-bottom:8px"><strong>${cbEscape(m?.display_name||m?.displayName||m?.username||m?.name||'Member')}</strong><div style="color:#65676b;font-size:12px">${cbEscape(m?.role||'member')}</div></div>`).join('')}`
        : '<h3>Members</h3><div class="cb-empty-panel">No members found.</div>';
      return list;
    }catch(e){
      box.innerHTML=`<h3>Members</h3><div class="cb-empty-panel" style="color:#b42318">${cbEscape(e?.message||'Unable to load members.')}</div>`;
      return [];
    }
  };

  const bindDiscussionButtons=()=>{
    $cb('manageGroupCreatePostBtn')?.addEventListener('click',()=>{
      state.groupPostTarget={path:groupPath,groupId:id,reload:()=>showGroupTab('discussion',true)};
      openPostModal(false);
    });
    $cb('manageGroupPhotoBtn')?.addEventListener('click',()=>{state.groupPostTarget={path:groupPath,groupId:id,reload:()=>showGroupTab('discussion',true)};openPostModal(true);});
    $cb('manageGroupLiveBtn')?.addEventListener('click',()=>openLiveProducer());
    $cb('manageGroupFeelingBtn')?.addEventListener('click',()=>{state.groupPostTarget={path:groupPath,groupId:id,reload:()=>showGroupTab('discussion',true)};openPostModal(false);setTimeout(()=>$cb('modalFeelingButton')?.click(),80);});
    $cb('manageGroupInviteBtn')?.addEventListener('click',openGroupInviteDialog);
    $cb('manageGroupMembersBtn')?.addEventListener('click',()=>{
      cbShowDialog('Manage members','<div id="cbGroupMembersBody">Loading members...</div>');
      loadGroupMembers($cb('cbGroupMembersBody'));
    });
  };

  const showGroupTab=async(tab='discussion',forceReload=false)=>{
    const section=$cb('manageGroupSection');
    const aside=$cb('manageGroupAside');
    if(!section) return;

    document.querySelectorAll('#manageGroupTabs [data-group-tab]').forEach(btn=>{
      btn.classList.toggle('active',btn.dataset.groupTab===tab);
    });

    if(tab==='about'){
      section.innerHTML=`<h3>About</h3>
        <p>${cbEscape(saved.description||'Add a description')}</p>
        <p>📍 ${cbEscape(saved.location||'No location')}</p>
        <p>🏷 ${cbEscape(saved.tags||'No topics')}</p>
        <h4>Rules</h4><p>${cbEscape(saved.rules||'No rules added')}</p>
        <button id="groupAboutEditBtn" class="cb-action primary">Edit details & settings</button>`;
      $cb('groupAboutEditBtn')?.addEventListener('click',()=> $cb('manageGroupEditBtn')?.click());
      return;
    }

    if(tab==='discussion'){
      section.innerHTML=`<div class="cb-unified-composer"><span class="avatar">${cbEscape(String(saved.name||'G').charAt(0).toUpperCase())}</span><button id="manageGroupCreatePostBtn" type="button">What's on your mind?</button><button id="manageGroupLiveBtn" class="cb-composer-feature" type="button"><img src="assets/icon-live.png" alt="Live video"></button><button id="manageGroupPhotoBtn" class="cb-composer-feature" type="button"><img src="assets/icon-photo-video.png" alt="Photo/video"></button><button id="manageGroupFeelingBtn" class="cb-composer-feature" type="button"><img src="assets/icon-feeling.png" alt="Feeling/activity"></button></div>
        <div id="manageGroupPosts"><div class="cb-empty-panel">Loading group posts...</div></div>`;
      bindDiscussionButtons();
      try{
        if(forceReload || !groupPostsCache.length) await refreshGroupPosts();
        const box=$cb('manageGroupPosts');
        if(box) box.innerHTML=renderGroupPostList(groupPostsCache);
        try{if(typeof initializeSecureVideoPlayers==='function') initializeSecureVideoPlayers();}catch(_){}
      }catch(e){
        const box=$cb('manageGroupPosts');
        if(box) box.innerHTML=`<div class="cb-empty-panel" style="color:#b42318">${cbEscape(e?.message||'Unable to load group posts.')}</div>`;
      }
      bindGroupPostActions();
      return;
    }

    if(tab==='members'){
      await loadGroupMembers(section);
      section.insertAdjacentHTML('afterbegin',`<div class="cb-manager-actions" style="margin-bottom:12px"><button id="groupMembersInviteBtn" class="cb-action primary">Invite people</button></div>`);
      $cb('groupMembersInviteBtn')?.addEventListener('click',openGroupInviteDialog);
      return;
    }

    if(tab==='events'){
      section.innerHTML='<h3>Events</h3><div class="cb-empty-panel">Loading events...</div>';
      try{
        const r=await apiRequest('/events');
        const data=r?.data?.events||r?.events||r?.data||[];
        const all=Array.isArray(data)?data:[];
        const list=all.filter(ev=>!ev?.group_id&&!ev?.groupId || String(ev?.group_id||ev?.groupId||'')===String(id));
        section.innerHTML=`<h3>Events</h3>${list.length
          ? list.map(ev=>`<div class="cb-card" style="margin-bottom:8px"><strong>${cbEscape(ev?.title||ev?.name||'Group event')}</strong><div>${cbEscape(ev?.description||'')}</div></div>`).join('')
          : '<div class="cb-empty-panel">No Group events yet.</div>'}`;
      }catch(e){
        section.innerHTML=`<h3>Events</h3><div class="cb-empty-panel">No Group events yet.</div>`;
      }
      return;
    }

    if(tab==='media'){
      section.innerHTML='<h3>Media</h3><div class="cb-empty-panel">Loading media...</div>';
      try{
        if(forceReload || !groupPostsCache.length) await refreshGroupPosts();
        const list=groupPostsCache.filter(p=>{
          const t=String(p?.post_type||p?.postType||'').toLowerCase();
          const media=Array.isArray(p?.media)?p.media:[];
          return ['image','video','reel'].includes(t) || media.length>0;
        });
        section.innerHTML=`<h3>Media</h3><div id="manageGroupPosts">${renderGroupPostList(list,'No media in this Group yet.')}</div>`;
        bindGroupPostActions();
        try{if(typeof initializeSecureVideoPlayers==='function') initializeSecureVideoPlayers();}catch(_){}
      }catch(e){
        section.innerHTML=`<h3>Media</h3><div class="cb-empty-panel" style="color:#b42318">${cbEscape(e?.message||'Unable to load Group media.')}</div>`;
      }
      return;
    }

    if(tab==='files'){
      section.innerHTML='<h3>Files</h3><div class="cb-empty-panel">Loading files...</div>';
      try{
        if(forceReload || !groupPostsCache.length) await refreshGroupPosts();
        const files=[];
        groupPostsCache.forEach(p=>{
          (Array.isArray(p?.media)?p.media:[]).forEach(m=>{
            const mime=String(m?.mime_type||m?.mimeType||m?.type||'').toLowerCase();
            if(mime && !mime.includes('image') && !mime.includes('video') && !mime.includes('audio')) files.push(m);
          });
        });
        section.innerHTML=`<h3>Files</h3>${files.length
          ? files.map(f=>`<div class="cb-card" style="margin-bottom:8px"><strong>${cbEscape(f?.original_name||f?.filename||f?.name||'File')}</strong><div style="font-size:12px;color:#65676b">${cbEscape(f?.mime_type||f?.type||'')}</div></div>`).join('')
          : '<div class="cb-empty-panel">No files shared in this Group yet.</div>'}`;
      }catch(e){
        section.innerHTML='<h3>Files</h3><div class="cb-empty-panel">No files shared in this Group yet.</div>';
      }
      return;
    }

    if(tab==='admin'){
      section.innerHTML=`<h3>Admin tools</h3>
        <p>Manage this Group without changing the existing working features.</p>
        <div class="cb-manager-actions" style="flex-wrap:wrap">
          <button id="groupAdminEditBtn" class="cb-action primary">Edit Group</button>
          <button id="groupAdminInviteBtn" class="cb-action">Invite</button>
          <button id="groupAdminMembersBtn" class="cb-action">Manage members</button>
          <button id="groupAdminCoverBtn" class="cb-action">Edit cover photo</button>
        </div>`;
      $cb('groupAdminEditBtn')?.addEventListener('click',()=> $cb('manageGroupEditBtn')?.click());
      $cb('groupAdminInviteBtn')?.addEventListener('click',openGroupInviteDialog);
      $cb('groupAdminMembersBtn')?.addEventListener('click',()=>{
        cbShowDialog('Manage members','<div id="cbGroupMembersBody">Loading members...</div>');
        loadGroupMembers($cb('cbGroupMembersBody'));
      });
      $cb('groupAdminCoverBtn')?.addEventListener('click',()=> $cb('manageGroupCoverBtn')?.click());
      return;
    }
  };

  $cb('manageGroupTabs')?.addEventListener('click',(event)=>{
    const btn=event.target.closest('[data-group-tab]');
    if(!btn) return;
    event.preventDefault();
    showGroupTab(btn.dataset.groupTab);
  });

  bindGroupPostActions();
  showGroupTab('discussion',true);
}

(()=>{
  const style=document.createElement('style');
  style.textContent=`
    .cb-group-home-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
    .cb-group-home-card{overflow:hidden;border:1px solid #e4e6eb;border-radius:12px;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.08)}
    .cb-group-card-cover{height:150px;background:linear-gradient(135deg,#dbeafe,#e5e7eb);background-size:cover;background-position:center}
    .cb-group-card-info{display:flex;align-items:center;gap:12px;padding:14px}.cb-group-card-info .avatar{width:58px;height:58px;border-radius:12px;object-fit:cover}.cb-group-card-info .person-main{display:grid;gap:4px;min-width:0;flex:1}.cb-group-card-info small{color:#65676b}
    .cb-username-field{display:grid;gap:6px}.cb-username-field>span{font-weight:700}.cb-username-field>div,.cb-edit-url{display:flex;align-items:center;border:1px solid #ccd0d5;border-radius:8px;overflow:hidden;background:#fff}.cb-username-field b,.cb-edit-url b{padding:0 10px;color:#65676b;font-size:13px;white-space:nowrap}.cb-username-field input,.cb-edit-url input{border:0!important;border-left:1px solid #e4e6eb!important;border-radius:0!important;min-width:0;flex:1}
    .cb-group-title-copy{min-width:0;flex:1}.cb-group-title-copy h1,.cb-group-title-copy p{margin:0 0 5px}.cb-group-title-copy a{color:#1877f2;text-decoration:none;font-size:13px}.cb-group-hero-actions{display:flex;gap:8px;align-items:center}
    @media(max-width:700px){.cb-group-home-grid{grid-template-columns:1fr}.cb-group-card-cover{height:125px}.cb-group-card-info{align-items:flex-start;flex-wrap:wrap}.cb-group-card-info .person-main{min-width:calc(100% - 74px)}.cb-group-card-info>.cb-action{width:100%}.cb-entity-manager{padding:0!important}.cb-entity-manager-hero{border-radius:0!important;padding:0 0 8px!important}.cb-entity-manager .cb-manager-cover{height:210px;border-radius:0!important}.cb-entity-manager .cb-manager-head{align-items:flex-end!important;padding:0 14px!important;flex-wrap:wrap}.cb-entity-manager .cb-manager-logo{width:116px!important;height:116px!important;margin-top:-48px!important;border-width:4px!important}.cb-group-title-copy{flex-basis:calc(100% - 140px)}.cb-group-title-copy h1{font-size:24px}.cb-group-hero-actions{width:100%;display:grid;grid-template-columns:1fr 1fr 1fr;margin-top:10px}.cb-group-hero-actions .cb-action{padding:9px 5px}.cb-manager-tabs{overflow-x:auto;white-space:nowrap;padding:8px 10px!important}.cb-entity-manager-grid{display:block!important;padding:8px!important}.cb-entity-manager-grid>aside{margin-bottom:8px}.cb-username-field>div,.cb-edit-url{align-items:stretch;flex-direction:column}.cb-username-field b,.cb-edit-url b{padding:8px 10px}.cb-username-field input,.cb-edit-url input{border-left:0!important;border-top:1px solid #e4e6eb!important}}
  `;
  document.head.appendChild(style);
})();

function clickSidebarOriginal(label){const btn=[...document.querySelectorAll('.sidebar-link')].find(x=>String(x.dataset.originalLabel||x.textContent).toLowerCase().includes(label.toLowerCase()));if(btn){btn.click();return true}return false}
function openVideoHub(){showFeature(`<div class="feature-page"><div class="cb-panel"><h2>Video / Reels</h2><p>Vertical short video and long video hub.</p><div class="metric-grid"><div class="metric-card">Like</div><div class="metric-card">Comment</div><div class="metric-card">Share</div><div class="metric-card">Follow</div><div class="metric-card">Save</div><div class="metric-card">Report</div><div class="metric-card">Music / Audio</div><div class="metric-card">Caption & Hashtag</div></div><p style="margin-top:16px"><b>Publish flow:</b> Upload → Publish. AI media moderation will be added in a later release.</p></div></div>`,'topVideoBtn')}
function openMessenger(){showFeature(`<div class="feature-page"><div class="cb-panel"><h2>Messenger</h2><p>One-to-one chat · Group chat · Text · Emoji · Image · Video · File · Voice message · Read status · Online status · Message requests · Block / Report</p><div class="profile-content"><div class="cb-panel"><h3>Chats</h3><p>No conversation selected.</p></div><div class="cb-panel"><h3>Conversation</h3><p>Messaging backend endpoints are required to send and sync messages.</p></div></div></div></div>`)}
function openNotificationsPage(){const temp=document.createElement('div');showFeature(`<div class="feature-page"><div class="cb-panel"><h2>Notifications</h2><div id="topNotificationList">Loading...</div></div></div>`);(async()=>{try{const d=unwrapData(await apiRequest('/notifications')),arr=d.notifications||d.items||d||[];$cb('topNotificationList').innerHTML=Array.isArray(arr)&&arr.length?`<div class="notification-list">${arr.map(n=>`<div class="notification-item ${n.read||n.isRead?'':'unread'}"><span class="notification-dot"></span><div><b>${cbEscape(n.title||'Notification')}</b><p>${cbEscape(n.message||n.body||'')}</p></div></div>`).join('')}</div>`:'<div class="cb-empty-panel">No notifications.</div>'}catch(e){$cb('topNotificationList').innerHTML=`<div class="cb-empty-panel">${cbEscape(e.message)}</div>`}})()}


// ---------------- Settings / standards / reports / admin ----------------
const SETTINGS_LOCAL_KEY='cirklebook_settings_v3';
function cbSettingsState(){try{return JSON.parse(localStorage.getItem(SETTINGS_LOCAL_KEY)||'{}')}catch(_){return {}}}
function saveSettingsState(s){localStorage.setItem(SETTINGS_LOCAL_KEY,JSON.stringify(s||{}))}
function openSettings(section='account'){
  const items=[['account','👤','Account'],['security','🔐','Security & Login'],['privacy','🛡️','Privacy'],['2fa','🔑','Two-factor authentication'],['blocking','⛔','Blocking'],['language','🌐','Language'],['notifications','🔔','Notifications'],['sessions','💻','Audit & Sessions']];
  showFeature(`<div class="feature-page cb-settings-facebook"><aside class="cb-panel cb-settings-nav"><h2>Settings & privacy</h2><input id="settingsSearch" class="cb-search" placeholder="Search settings"><div class="cb-settings-account-card"><span class="avatar">${cbEscape((state.currentUser?.username||'U').charAt(0).toUpperCase())}</span><div><b>${cbEscape(cbName())}</b><small>Account settings</small></div></div>${items.map(([k,i,l])=>`<button data-settings="${k}" class="${section===k?'active':''}"><span>${i}</span><div><b>${l}</b><small>${k==='security'?'Password and login security':k==='privacy'?'Control who can see your information':k==='sessions'?'Where you are logged in':'Manage '+l.toLowerCase()}</small></div><em>›</em></button>`).join('')}</aside><main id="settingsBody" class="cb-settings-main"></main></div>`);
  featureView.querySelectorAll('[data-settings]').forEach(b=>b.onclick=()=>openSettings(b.dataset.settings));$cb('settingsSearch').oninput=e=>{const q=e.target.value.toLowerCase();featureView.querySelectorAll('[data-settings]').forEach(b=>b.hidden=q&&!b.textContent.toLowerCase().includes(q));};renderSettingsSection(section);
}
async function renderSettingsSection(s){
 const b=$cb('settingsBody'),prefs=cbSettingsState();if(!b)return;
 if(s==='account'){b.innerHTML=`<div class="cb-panel"><h2>Account</h2><div class="setting-row"><div><b>Profile information</b><small>Name, bio, website, location and date of birth</small></div><button id="settingsEditProfile" class="cb-action">Edit</button></div><div class="setting-row"><div><b>Account recovery</b><small>Email / phone / username recovery flow</small></div><button id="settingsRecovery" class="cb-action">Open</button></div></div>`;$cb('settingsEditProfile').onclick=async()=>openProfileEditor(await fetchProfileData());$cb('settingsRecovery').onclick=()=>$cb('forgotPasswordButton').click();return}
 if(s==='security'){b.innerHTML=`<div class="cb-panel"><h2>Security & Login</h2><div class="setting-row"><div><b>Password</b><small>Change your password securely.</small></div><button id="changePasswordBtn" class="cb-action">Change</button></div><div class="setting-row"><div><b>Login alerts</b><small>Get notified about unfamiliar login activity.</small></div><span id="loginAlertsSwitch" class="switch ${prefs.loginAlerts?'on':''}"></span></div><div class="setting-row"><div><b>Session security</b><small>Review active sessions under Audit & Sessions.</small></div><button class="cb-action" id="goSessions">Review</button></div></div>`;$cb('loginAlertsSwitch').onclick=()=>{prefs.loginAlerts=!prefs.loginAlerts;saveSettingsState(prefs);renderSettingsSection('security')};$cb('goSessions').onclick=()=>openSettings('sessions');$cb('changePasswordBtn').onclick=()=>cbShowDialog('Change password',`<form class="cb-form-grid"><input type="password" placeholder="Current password"><input type="password" placeholder="New password"><input type="password" placeholder="Confirm new password"><div class="message">A backend change-password endpoint is required to submit this securely.</div></form>`);return}
 if(s==='privacy'){b.innerHTML='<div class="cb-panel"><h2>Privacy</h2><div id="privacyBody">Loading...</div></div>';try{const d=unwrapData(await apiRequest('/users/me/privacy'));const p=d.privacy||d;$cb('privacyBody').innerHTML=`<div class="setting-row"><div><b>Profile visibility</b><small>Who can see your profile.</small></div><select id="profileVisibility"><option value="public">Public</option><option value="friends">Friends</option><option value="only_me">Only me</option></select></div><button id="savePrivacy" class="primary-button" style="margin-top:12px">Save Privacy</button><div id="privacyMsg" class="message hidden"></div>`;$cb('profileVisibility').value=p.profileVisibility||p.profile_visibility||'public';$cb('savePrivacy').onclick=async()=>{const m=$cb('privacyMsg');try{await apiRequest('/users/me/privacy',{method:'PATCH',body:JSON.stringify({profileVisibility:$cb('profileVisibility').value})});m.textContent='Privacy updated.';m.style.background='#e6f4ea';m.style.color='#137333';m.classList.remove('hidden')}catch(e){m.textContent=e.message;m.classList.remove('hidden')}}}catch(e){$cb('privacyBody').textContent=e.message}return}
 if(s==='2fa'){b.innerHTML=`<div class="cb-panel"><h2>Two-factor authentication</h2><p>Add a second verification step to protect your account.</p><button id="enable2fa" class="cb-action primary">Set up 2FA</button><div id="twoFaMsg" class="message hidden"></div></div>`;$cb('enable2fa').onclick=()=>{const m=$cb('twoFaMsg');m.textContent='The 2FA screen is ready, but secure secret/QR generation and code verification require backend 2FA endpoints. It will not be falsely marked enabled.';m.style.background='#fff4ce';m.style.color='#684f00';m.classList.remove('hidden')};return}
 if(s==='blocking'){b.innerHTML=`<div class="cb-panel"><h2>Blocking</h2><div class="cb-form-grid"><input id="blockUser" placeholder="Username or user ID"><button id="blockBtn" class="cb-action">Block</button><div id="blockMsg" class="message hidden"></div></div></div>`;$cb('blockBtn').onclick=()=>{const m=$cb('blockMsg');m.textContent='Blocking requires the connected block/unblock backend endpoint before this action can safely be committed.';m.classList.remove('hidden')};return}
 if(s==='language'){b.innerHTML=`<div class="cb-panel"><h2>Language</h2><div class="language-grid">${LANGS.map(([c,n])=>`<button class="language-choice ${c===(localStorage.getItem('cirklebook_language')||'en')?'active':''}" data-settings-lang="${c}">${n}</button>`).join('')}</div></div>`;b.querySelectorAll('[data-settings-lang]').forEach(x=>x.onclick=()=>{applyLanguage(x.dataset.settingsLang);openSettings('language')});return}
 if(s==='notifications'){b.innerHTML=`<div class="cb-panel"><h2>Notification settings</h2>${[['push','Push notifications'],['email','Email notifications'],['friend','Friend activity'],['creator','Creator updates']].map(([k,l])=>`<div class="setting-row"><div><b>${l}</b></div><span data-pref="${k}" class="switch ${prefs[k]!==false?'on':''}"></span></div>`).join('')}</div>`;b.querySelectorAll('[data-pref]').forEach(x=>x.onclick=()=>{prefs[x.dataset.pref]=!(prefs[x.dataset.pref]!==false);saveSettingsState(prefs);renderSettingsSection('notifications')});return}
 if(s==='sessions'){b.innerHTML=`<div class="cb-panel"><h2>Audit & Sessions</h2><p>Review where your account is logged in and security events.</p><div id="sessionsBody"><div class="cb-empty-panel">Loading...</div></div></div>`;try{let d;try{d=unwrapData(await apiRequest('/auth/sessions'))}catch(_){d={}}const arr=d.sessions||d.items||[];$cb('sessionsBody').innerHTML=Array.isArray(arr)&&arr.length?arr.map(x=>`<div class="setting-row"><div><b>${cbEscape(x.device||x.userAgent||'Session')}</b><small>${cbEscape(x.ip||'')} ${cbEscape(x.lastActive||x.last_active||'')}</small></div><span>${x.revoked?'Revoked':'Active'}</span></div>`).join(''):'<div class="cb-empty-panel">No session list endpoint returned data. Existing logout session revocation remains preserved.</div>'}catch(e){$cb('sessionsBody').textContent=e.message}return}
}
function openStandards(){showFeature(`<div class="feature-page"><div class="cb-panel"><h2>Cirklebook Community Standards</h2><p>Policy decisions must consider context so educational, historical, news and discussion content is not wrongly blocked; uncertain cases go to human review.</p><div class="standards-grid">${['Pornography','Explicit sexual content','Gambling','Alcohol promotion','Drugs','Obscene content','Anti-Islamic propaganda','Immoral entertainment','Content contrary to Islamic values'].map(x=>`<div class="standard-item">❌ ${x}</div>`).join('')}</div></div></div>`)}

// ---------------- Report buttons ----------------
document.addEventListener('click',e=>{const post=e.target.closest('.post'); if(post && e.target.closest('[data-action="report"]')){openReport(post.dataset.post||post.dataset.postId||'');}},true);
function openReport(id){cbShowDialog('Report content',`<div class="cb-form-grid"><select id="reportReason">${['Nudity','Sexual content','Gambling','Drugs','Alcohol','Religious violation','Hate','Scam','Violence','Spam','Other'].map(x=>`<option>${x}</option>`).join('')}</select><textarea id="reportDetails" placeholder="Details (optional)"></textarea><button id="submitReport" class="primary-button">Submit Report</button></div>`);$cb('submitReport').onclick=()=>{showToast('Report submitted for AI + Moderator review');cbCloseDialog();};}
document.addEventListener('click',event=>{const button=event.target.closest('[data-hub-act="report"],[data-reel-act="report"],[data-real-reel-act="report"]');if(!button)return;event.preventDefault();event.stopImmediatePropagation();openReport(button.dataset.id||button.closest('[data-post]')?.dataset.post||'');},true);

// Inject Report + Boost on rendered posts without changing legacy renderer.
const observer=new MutationObserver(()=>{document.querySelectorAll('#feedContainer .post').forEach(p=>{const actions=p.querySelector('.post-actions');if(actions&&!actions.querySelector('[data-action="report"]')){const id=p.dataset.post||'';const r=document.createElement('button');r.type='button';r.dataset.action='report';r.dataset.postId=id;r.textContent='Report';actions.appendChild(r);const boost=document.createElement('button');boost.type='button';boost.textContent='Boost Post';boost.onclick=()=>openAdsBuilder('Engagement',id);actions.appendChild(boost);}});});
observer.observe($cb('feedContainer'),{childList:true,subtree:true});

// ---------------- Admin / moderator accessible demo panels ----------------
function openModerator(){showFeature(`<div class="feature-page"><div class="cb-panel"><h2>Moderator Dashboard</h2><p>Pending Review</p><table class="admin-table"><thead><tr><th>Content</th><th>User</th><th>AI reason</th><th>Policy category</th><th>Risk score</th><th>Previous violations</th><th>Action</th></tr></thead><tbody><tr><td colspan="7">No pending review items loaded.</td></tr></tbody></table><p>Actions: Approve · Reject · Request Changes · Escalate</p></div></div>`);}
function openAdmin(){showFeature(`<div class="feature-page"><div class="cb-panel"><h2>Admin Dashboard</h2><div class="metric-grid">${['Users','Posts','Videos','Reports','Moderation','Advertisements','Payments','Verification','Groups','Pages','Creators','Revenue','System Analytics','Policy Management'].map(x=>`<div class="metric-card">${x}</div>`).join('')}</div></div></div>`);}

// ---------------- Click routing: capture so legacy popup handlers do not win ----------------
document.addEventListener('click', function(e){
 const t=e.target;
 if(t.closest('#brandHomeButton')){e.preventDefault();e.stopImmediatePropagation();showHome();return;}
 if(t.closest('#topHomeBtn')){e.preventDefault();e.stopImmediatePropagation();if(state.activePage&&window.CirklebookPageIdentityNav){window.CirklebookPageIdentityNav.route('home');}else showHome();return;}
 if(t.closest('#topVideoBtn')){e.preventDefault();e.stopImmediatePropagation();if(state.activePage&&window.CirklebookPageIdentityNav){window.CirklebookPageIdentityNav.route('reels');}else if(typeof window.CirklebookOpenActualVideoHub==='function'){window.CirklebookOpenActualVideoHub('for-you');}else{openVideoHub();}return;}
 if(t.closest('#topDashboardBtn')){e.preventDefault();e.stopImmediatePropagation();if(state.activePage&&window.CirklebookPageIdentityNav){window.CirklebookPageIdentityNav.route('dashboard');}else openDashboard();return;}
 if(t.closest('#topGroupsBtn')){e.preventDefault();e.stopImmediatePropagation();if(state.activePage&&window.CirklebookPageIdentityNav){window.CirklebookPageIdentityNav.route('groups');}else openGroupsFeed();return;}
 if(t.closest('#topPagesBtn')){e.preventDefault();e.stopImmediatePropagation();if(state.activePage&&window.CirklebookPageIdentityNav){window.CirklebookPageIdentityNav.route('pages');}else openPagesFeed();return;}
 if(t.closest('#topMessagesBtn')){e.preventDefault();e.stopImmediatePropagation();if(state.activePage&&window.CirklebookPageIdentityNav){window.CirklebookPageIdentityNav.route('messages');}else (window.openMessenger||openMessenger)();return;}
 if(t.closest('#topNotificationsBtn')){e.preventDefault();e.stopImmediatePropagation();if(state.activePage&&window.CirklebookPageIdentityNav){window.CirklebookPageIdentityNav.route('notifications');}else (window.openNotificationsPage||openNotificationsPage)();return;}
 if(t.closest('#profileButton')){e.preventDefault();e.stopImmediatePropagation();dom.accountMenu?.classList.toggle('hidden');return;}
 if(t.closest('.sidebar-profile')||t.closest('[data-cb-action="profile"]')){e.preventDefault();e.stopImmediatePropagation();dom.accountMenu?.classList.add('hidden');openProfilePage();return;}
 const side=t.closest('.sidebar-link'); if(side){const label=(side.dataset.originalLabel||side.textContent||'').toLowerCase(); if(label.includes('friends')){e.preventDefault();e.stopImmediatePropagation();openFriendsFull();return;} if(label.includes('groups')){e.preventDefault();e.stopImmediatePropagation();openGroupsFeed();return;} if(label.includes('professional dashboard')){e.preventDefault();e.stopImmediatePropagation();openDashboard();return;} if(label.includes('pages')){e.preventDefault();e.stopImmediatePropagation();openPagesFeed();return;} if(label.includes('settings')){e.preventDefault();e.stopImmediatePropagation();openSettings();return;} if(label.includes('ads center')){e.preventDefault();e.stopImmediatePropagation();showFeature(`<div class="feature-page">${adsCenterHtml()}</div>`);bindAdsCenter();return;} if(label.includes('community standards')){e.preventDefault();e.stopImmediatePropagation();openStandards();return;} }
 const menu=t.closest('[data-cb-action]');
 if(menu?.dataset.cbAction==='settings'){e.preventDefault();e.stopImmediatePropagation();dom.accountMenu.classList.add('hidden');openSettings();return;}
 if(menu?.dataset.cbAction==='language'){e.preventDefault();e.stopImmediatePropagation();dom.accountMenu.classList.add('hidden');$cb('languageButton')?.click();return;}
}, true);


// Keep the account dropdown open only while interacting with it/profile button.
document.addEventListener('click', function(e){
  const menu = $cb('accountMenu');
  const profile = $cb('profileButton');
  if(!menu || menu.classList.contains('hidden')) return;
  if(menu.contains(e.target) || profile?.contains(e.target)) return;
  menu.classList.add('hidden');
}, false);

// Groups full-page experience.
$cb('topGroupsBtn')?.addEventListener('click',function(e){e.preventDefault();openGroupsFull();},false);

// top create
$cb('topCreateBtn')?.addEventListener('click',()=>openPostModal(false));

// Account menu utility additions
const helpBtn=[...($cb('accountMenu')?.querySelectorAll('button')||[])].find(b=>b.dataset.cbAction==='help');helpBtn?.addEventListener('click',()=>cbShowDialog('Help & Support','<p>Support Center · Account Recovery · Community Standards · Report a Problem</p>'));

// Normalize old mojibake close buttons where possible.

// Add quick role dashboard entries to Settings area through keyboard-safe debug links only when needed.
window.CirklebookAdmin={openAdmin,openModerator,openDashboard,openProfilePage,openPagesHub,openStandards};


// Role-aware Sponsored management. Only Admin/Moderator see this control.
function cbRole(){return String(state.currentUser?.role||state.currentUser?.userRole||'').toLowerCase()}
function syncSponsoredManager(){
  const b=$cb('sponsoredManageBtn'),role=cbRole();if(!b)return;
  const allowed=role==='admin'||role==='moderator';b.classList.toggle('hidden',!allowed);
  if(allowed)b.onclick=()=>openSponsoredManager();
}
function openSponsoredManager(){
  showFeature(`<div class="feature-page"><div class="cb-panel"><h2>Sponsored Ad Management</h2><p class="cb-subtitle">Admin / Moderator access only.</p><div class="cb-form-grid"><select id="sAdType"><option>Image</option><option>Video</option><option>Text / Content</option></select><input id="sAdTitle" placeholder="Advertisement title"><textarea id="sAdText" placeholder="Advertisement content"></textarea><input id="sAdMedia" type="file" accept="image/*,video/*"><button id="sAdSave" class="primary-button">Prepare Sponsored Ad</button><div id="sAdMsg" class="message hidden"></div></div></div></div>`);
  $cb('sAdSave').onclick=()=>{const m=$cb('sAdMsg');m.textContent='Sponsored creative is prepared. Persistent placement, approval, scheduling and delivery require the Ads backend service.';m.style.background='#fff4ce';m.style.color='#684f00';m.classList.remove('hidden')};
}
setTimeout(syncSponsoredManager,400);
const _origShowHome=showHome; showHome=function(){_origShowHome();syncSponsoredManager();};

// Prevent duplicate Profile entries in the account menu caused by older modules.
function normalizeAccountMenu(){
 const menu=$cb('accountMenu');if(!menu)return;
 const profileButtons=[...menu.querySelectorAll('button')].filter(b=>(b.textContent||'').trim().toLowerCase()==='profile');
 profileButtons.slice(1).forEach(b=>b.remove());
}
normalizeAccountMenu();

// Apply saved language after DOM ready.
applyLanguage(localStorage.getItem('cirklebook_language')||'en');

// Facebook-style Page identity actions, with a compact mobile arrangement.
if(!document.getElementById('cbPageFollowerHeaderStyle')){
 const pageHeaderStyle=document.createElement('style');pageHeaderStyle.id='cbPageFollowerHeaderStyle';pageHeaderStyle.textContent='.cb-manager-page-summary{flex:1;min-width:180px}.cb-manager-page-summary>b{display:block;margin-top:4px;color:#65676b}.cb-manager-page-actions{margin-left:auto;display:flex;align-items:center;gap:8px;flex-wrap:wrap}.cb-manager-page-actions .cb-action{white-space:nowrap}@media(max-width:700px){.cb-manager-page-summary{flex-basis:calc(100% - 140px)}.cb-manager-page-actions{width:100%;display:grid;grid-template-columns:1fr 1fr;margin:10px 0 0}.cb-manager-page-actions .cb-action{width:100%;padding:9px 5px}}';document.head.appendChild(pageHeaderStyle);
}

// Public bridge for correction modules appended after this redesign IIFE.
// Keep every cross-module call explicit so a block-scoped helper cannot stop
// the remaining UI initialization with a ReferenceError in production.
window.CirklebookUiBridge={
  escape:cbEscape,
  showDialog:cbShowDialog,
  closeDialog:cbCloseDialog,
  languages:LANGS,
  applyLanguage,
  loadEntityExtra:cbLoadEntityExtra,
  entityMediaUrl:cbEntityMediaUrl,
  openPageManager,
  openCreatePage,
  openProfilePage,
  showHome,
  showFeature,
  openGroupsFull,
  openPagesHub,
  openGroupsFeed,
  openPagesFeed,
  openCreateGroup:openCreateGroupFull,
  openMessenger,
  openNotificationsPage
  ,openAdsBuilder
  ,openSettings
  ,openStandards
  ,apiRequest
  ,extractPosts
  ,hydrateSharedPosts
  ,renderPost
  ,openPostModal
};

/* Live unread badge: makes friend-request notifications visible on the
   recipient's open browser without requiring a manual refresh. */
(function cirklebookNotificationPolling(){
 let busy=false;
 const update=async()=>{if(busy||!state.currentUser)return;busy=true;try{const response=await apiRequest('/notifications/unread-count'),data=response?.data||response||{},count=Number(data.unreadCount??data.unread_count??data.count??0),button=document.getElementById('topNotificationsBtn');if(button){let badge=button.querySelector('.cb-live-notification-badge');if(count>0){if(!badge){badge=document.createElement('span');badge.className='cb-live-notification-badge';button.appendChild(badge);}badge.textContent=count>99?'99+':String(count);}else badge?.remove();}}catch(_){}finally{busy=false;}};
 setInterval(update,10000);setTimeout(update,1200);
 const style=document.createElement('style');style.textContent='.cb-live-notification-badge{position:absolute;right:-3px;top:-4px;min-width:18px;height:18px;padding:0 4px;box-sizing:border-box;border-radius:10px;background:#e41e3f;color:#fff;border:2px solid #fff;display:grid;place-items:center;font:700 10px/1 Arial}.nav-button{position:relative}';document.head.appendChild(style);
})();
/* =========================================================
   CIRKLEBOOK V4 — FINAL POLISH + CONSOLIDATED CORRECTIONS
   2026-09-08
========================================================= */
(function cirklebookV4Polish(){
'use strict';
const V4A='assets/';

// One authoritative Profile route everywhere; remove the legacy duplicate menu item.
function v4NormalizeProfileNavigation(){
  document.getElementById('realProfileMenuButton')?.remove();
  const sp=document.querySelector('.sidebar-profile');
  if(sp){sp.setAttribute('role','button');sp.setAttribute('tabindex','0');sp.setAttribute('aria-label','Open profile');sp.classList.add('v4-clickable-profile');}
}
v4NormalizeProfileNavigation();
new MutationObserver(v4NormalizeProfileNavigation).observe(document.getElementById('accountMenu')||document.body,{childList:true,subtree:true});
document.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.closest('.sidebar-profile')){e.preventDefault();openProfilePage();}},true);

// Safer local profile/cover image persistence: resize to avoid localStorage quota failures.
saveProfileImage=function(file,key,done){
  if(!file)return;
  if(!file.type.startsWith('image/')){showToast('Please choose an image file.');return;}
  if(file.size>12*1024*1024){showToast('Image must be smaller than 12 MB.');return;}
  const reader=new FileReader();
  reader.onerror=()=>showToast('Could not read this image.');
  reader.onload=()=>{
    const img=new Image();
    img.onerror=()=>showToast('Could not load this image.');
    img.onload=()=>{
      const maxW=key==='cover'?1600:700,maxH=key==='cover'?700:700;
      const scale=Math.min(1,maxW/img.width,maxH/img.height);
      const c=document.createElement('canvas');c.width=Math.max(1,Math.round(img.width*scale));c.height=Math.max(1,Math.round(img.height*scale));
      c.getContext('2d').drawImage(img,0,0,c.width,c.height);
      const data=c.toDataURL('image/jpeg',.86);
      try{const ex=cbProfileExtras();ex[key]=data;saveProfileExtras(ex);showToast(key==='avatar'?'Profile picture updated':'Cover photo updated');done?.();}
      catch(_){showToast('Image is too large to save in this browser. Please choose a smaller image.');}
    };img.src=reader.result;
  };reader.readAsDataURL(file);
};

// Polished Messenger shell. Real sync remains backend-dependent, but developer text is never exposed.
openMessenger=function(){
  showFeature(`<div class="feature-page v4-messenger-page">
    <div class="v4-messenger-shell">
      <aside class="v4-chat-list">
        <div class="v4-chat-title"><h2>Chats</h2><button class="v4-circle" id="newMessageBtn" title="New message">✎</button></div>
        <div class="v4-chat-search">🔎 <input id="chatSearch" placeholder="Search Messenger"></div>
        <div class="v4-chat-tabs"><button class="active">Inbox</button><button>Requests</button></div>
        <div class="v4-empty-chat"><div class="v4-empty-icon">💬</div><b>No conversations yet</b><span>Start a new conversation with a friend.</span></div>
      </aside>
      <main class="v4-conversation">
        <div class="v4-conversation-head"><div><b>Select a conversation</b><small>Messages and calls will appear here</small></div><div class="v4-conversation-tools"><button title="Voice call">☎</button><button title="Video call">▣</button><button title="Conversation info">ⓘ</button></div></div>
        <div class="v4-conversation-empty"><div class="v4-messenger-mark">💬</div><h2>Your messages</h2><p>Send private messages, photos, videos, files and voice notes.</p><button id="startConversationBtn" class="cb-action primary">New message</button></div>
        <div class="v4-message-composer"><button title="Add">＋</button><button title="Photo or video">▧</button><button title="File">📎</button><div class="v4-message-input">Aa</div><button title="Voice message">🎙</button><button title="Send">➤</button></div>
      </main>
    </div>
  </div>`,'');
  const openNew=()=>cbShowDialog('New message',`<div class="cb-form-grid"><input placeholder="Search people"><div class="cb-empty-panel">Choose a friend to start a conversation.</div></div>`);
  $cb('newMessageBtn').onclick=openNew;$cb('startConversationBtn').onclick=openNew;
};


function openReelEditorFromComposer(){
  const files=Array.isArray(state.selectedFiles)?state.selectedFiles:[],video=files.find(f=>f?.type?.startsWith('video/'));
  const preview=(Array.isArray(state.previewUrls)?state.previewUrls:[])[files.indexOf(video)]||state.previewUrl||'';
  if(!video){openPostModal(true);return;}
  dom.postModal?.classList.add('hidden');document.body.style.overflow='';
  showFeature(`<div class="feature-page cb-reel-editor-page"><div class="cb-reel-editor-shell"><aside class="cb-reel-edit-sidebar"><div class="cb-reel-editor-title"><button id="reelBackToPost" class="cb-circle-close">←</button><h2>Edit reel</h2></div><label>Reel title<input id="reelTitle" maxlength="120" placeholder="Reel title"></label><label>Caption<textarea id="reelCaption" rows="5" maxlength="2200" placeholder="Describe your reel…">${cbEscape(dom.postBody?.value||'')}</textarea></label><label>Tags<input id="reelTags" placeholder="Add tags"></label><button class="cb-reel-tool">✂ Trim video <span>›</span></button><button class="cb-reel-tool">CC Closed captions <span>›</span></button><button class="cb-reel-tool">🔊 Audio descriptions <span>›</span></button><button class="cb-reel-tool">≡ Text transcripts <span>›</span></button><div class="cb-reel-tool-note"><b>Reel limit: 60 seconds maximum.</b> Long video upload is temporarily unavailable.</div><button id="reelNext" class="primary-button">Next</button></aside><main class="cb-reel-preview-area"><video controls playsinline src="${cbEscape(preview)}"></video></main></div></div>`);
  $cb('reelBackToPost').onclick=()=>{if(!state.groupPostTarget&&!state.pagePostTarget)showHome();openPostModal(false)};$cb('reelNext').onclick=()=>openReelSettings({title:$cb('reelTitle').value.trim(),caption:$cb('reelCaption').value.trim(),tags:$cb('reelTags').value.trim(),preview});
}
async function openReelSettings(draft){
  showFeature(`<div class="feature-page cb-reel-editor-page"><div class="cb-reel-editor-shell"><aside class="cb-reel-edit-sidebar"><div class="cb-reel-editor-title"><button id="reelSettingsBack" class="cb-circle-close">←</button><h2>Reel settings</h2></div><label>Describe your reel<textarea id="reelSettingsCaption" rows="5">${cbEscape(draft.caption||'')}</textarea></label><div class="cb-reel-setting-row"><div><b>Post audience</b><small>Choose who can see your reel</small></div><select id="reelAudience"><option value="public">Public</option><option value="friends">Friends</option></select></div><div class="cb-reel-setting-row"><div><b>Add AI label</b><small>Label realistic AI-generated content when applicable</small></div><input id="reelAiLabel" type="checkbox"></div><div class="cb-reel-setting-row"><div><b>Remixing and use of original audio</b><small>Allow others to reuse your original audio</small></div><input id="reelRemix" type="checkbox" checked></div><div class="cb-reel-setting-row"><div><b>Tag and collaborate</b><small>Tag people and collaborators</small></div><button class="cb-link-button">Add</button></div><div class="cb-reel-setting-row"><div><b>Scheduling options</b><small>Publish now or schedule later</small></div><input id="reelSchedule" type="datetime-local"></div><div class="cb-reel-setting-row"><div><b>Share to groups</b><small>Select groups to share this reel after publishing</small></div></div><div id="reelGroupList" class="cb-reel-group-list"><div class="cb-profile-muted">Loading your groups…</div></div><div class="cb-reel-setting-row"><div><b>Share to story</b><small>Also add this reel to your 24-hour story</small></div><input id="reelShareStory" type="checkbox"></div><div class="cb-reel-setting-row"><div><b>Boost post</b><small>Open Ads Center after publishing</small></div><input id="reelBoost" type="checkbox"></div><div class="cb-policy-inline"><b>Islamic content policy</b><span>Your reel is checked by Cirklebook moderation before publication.</span></div><div class="cb-reel-footer"><button id="reelSaveDraft" class="cb-action">Save</button><button id="reelPostNow" class="cb-action primary">Post</button></div></aside><main class="cb-reel-preview-area"><video controls playsinline src="${cbEscape(draft.preview||'')}"></video></main></div></div>`);
  $cb('reelSettingsBack').onclick=()=>openReelEditorFromComposer();
  try{const r=await apiRequest('/groups/mine'),groups=r?.data?.groups||r?.groups||r?.data||[];$cb('reelGroupList').innerHTML=Array.isArray(groups)&&groups.length?groups.map(g=>`<label class="cb-reel-group-option"><input type="checkbox" data-reel-group value="${cbEscape(g.id||g.groupId||g.group_id||'')}"><span>${cbEscape(g.name||'Group')}</span></label>`).join(''):'<div class="cb-profile-muted">You do not have any groups to share to.</div>';}catch(_){$cb('reelGroupList').innerHTML='<div class="cb-profile-muted">Group sharing will be available when your groups can be loaded.</div>';}
  $cb('reelSaveDraft').onclick=()=>{state.reelDraftSettings={...draft,status:'draft'};showToast('Reel settings saved as draft in this session');};
  $cb('reelPostNow').onclick=()=>{state.reelDraftSettings={...draft,caption:$cb('reelSettingsCaption').value.trim(),audience:$cb('reelAudience').value,aiLabel:$cb('reelAiLabel').checked,remix:$cb('reelRemix').checked,schedule:$cb('reelSchedule').value||'',shareStory:$cb('reelShareStory').checked,boost:$cb('reelBoost').checked,groupIds:[...document.querySelectorAll('[data-reel-group]:checked')].map(x=>x.value).filter(Boolean)};if(dom.postBody)dom.postBody.value=state.reelDraftSettings.caption;if(!state.groupPostTarget&&!state.pagePostTarget)showHome();publishPost({reelApproved:true});};
}
window.CirklebookOpenReelEditor=openReelEditorFromComposer;
window.CirklebookAfterReelPublished=async function(createdPost,uploadedMedia,settings){
  const postId=createdPost?.data?.post?.id||createdPost?.data?.id||createdPost?.post?.id||createdPost?.id||'';
  if(settings.shareStory){const m=uploadedMedia?.find(x=>(x?.media_type||x?.mediaType)==='video')||uploadedMedia?.[0]||{};const mediaUrl=m.url||m.mediaUrl||m.media_url||m.publicUrl||m.public_url||'';try{localStorage.setItem('cirklebook_local_story_v1',JSON.stringify({type:'media',text:settings.caption||settings.title||'',mediaUrl,mime:'video/mp4',createdAt:Date.now(),expiresAt:Date.now()+86400000}));}catch(_){}}
  if(postId&&Array.isArray(settings.groupIds)&&settings.groupIds.length){let shared=0;for(const groupId of settings.groupIds){try{await apiRequest(ROUTES.share(postId),{method:'POST',body:JSON.stringify({groupId})});shared++;}catch(e){console.warn('GROUP SHARE:',groupId,e);}}if(shared)showToast(`Reel shared to ${shared} group${shared===1?'':'s'}`);}
  if(settings.boost&&postId)setTimeout(()=>openAdsBuilder('Video Views',postId),300);
};

// Facebook-style Reels/Video viewing surface — REAL FEED LOADER.
// This is the root renderer used by the original top navigation, so it does not
// depend on any later patch/module being reached during startup.
openVideoHub=async function(initial='for-you'){
  const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const mediaOf=p=>Array.isArray(p?.media)?p.media:(Array.isArray(p?.media_assets)?p.media_assets:[]);
  const idOf=p=>String(p?.id||p?.post_id||p?.postId||'');
  const isVideo=p=>mediaOf(p).some(m=>String(m?.media_type||m?.mediaType||m?.type||'').toLowerCase()==='video');
  const reelIds=()=>{try{const a=JSON.parse(localStorage.getItem('cirklebook_reel_post_ids_v1')||'[]');return Array.isArray(a)?a.map(String):[];}catch(_){return []}};
  const reelManifest=()=>{try{const a=JSON.parse(localStorage.getItem('cirklebook_reel_manifest_v2')||'[]');return Array.isArray(a)?a:[];}catch(_){return []}};
  const mediaIds=p=>mediaOf(p).map(m=>String(m?.id||m?.media_id||m?.mediaId||'')).filter(Boolean);
  const isReel=p=>{
    const type=String(p?.post_type||p?.postType||p?.type||'').toLowerCase();
    if(type==='reel')return true;
    const pid=idOf(p);if(pid&&reelIds().includes(pid))return true;
    const mids=new Set(mediaIds(p));
    return reelManifest().some(x=>(pid&&String(x?.postId||'')===pid)||(String(x?.mediaId||'')&&mids.has(String(x.mediaId))));
  };
  const videoUrl=p=>{
    const m=mediaOf(p).find(x=>String(x?.media_type||x?.mediaType||x?.type||'').toLowerCase()==='video');
    if(!m)return '';
    try{if(typeof buildMediaUrl==='function')return buildMediaUrl(m)||'';}catch(_){}
    return m.url||m.public_url||m.signed_url||m.media_url||'';
  };
  const author=p=>{try{if(typeof getPostAuthorName==='function')return getPostAuthorName(p);}catch(_){}return p?.display_name||p?.username||p?.author?.display_name||p?.author?.username||'Cirklebook User';};
  const card=p=>{const id=idOf(p),url=videoUrl(p);return `<article class="cb-reel-feed-card" data-post="${esc(id)}"><div class="cb-reel-head"><b>${esc(author(p))}</b><span>${isReel(p)?'Reel':'Video'}</span></div><div class="cb-reel-media">${url?`<video src="${esc(url)}" controls playsinline preload="metadata"></video>`:'<div class="cb-empty-panel">Video unavailable</div>'}</div>${p?.body?`<div class="cb-reel-caption">${esc(p.body)}</div>`:''}<div class="cb-reel-actions"><button data-hub-act="like" data-id="${esc(id)}">Like</button><button data-hub-act="comment" data-id="${esc(id)}">Comment</button><button data-hub-act="report" data-id="${esc(id)}">Report</button><button data-hub-act="share" data-id="${esc(id)}">Share</button><button data-hub-act="save" data-id="${esc(id)}">Save</button></div></article>`;};

  showFeature(`<div class="feature-page v4-video-page"><aside class="v4-video-sidebar"><h2>Video</h2><button data-root-video-tab="for-you">▶ For you</button><button data-root-video-tab="reels">🎞 Reels</button><button data-root-video-tab="live">📺 Live</button><button data-root-video-tab="saved">🔖 Saved videos</button><button data-root-video-tab="settings">⚙ Video settings</button></aside><main class="v4-video-main"><div class="v4-video-toolbar"><div><h2 id="rootVideoTitle">Reels & Videos</h2><p id="rootVideoSub">Loading published videos and Reels…</p></div><button id="v4CreateReel" class="cb-action primary">＋ Create reel</button></div><div id="rootVideoFeed" class="cb-reels-feed"><div class="cb-panel">Loading…</div></div></main></div>`,'topVideoBtn');
  $cb('v4CreateReel').onclick=()=>openPostModal(true);

  let posts=[],loadError='';
  try{
    const r=await apiRequest(`${ROUTES.feed}?limit=100&offset=0`);
    posts=typeof extractPosts==='function'?extractPosts(r):[];
    if(!Array.isArray(posts))posts=[];
  }catch(e){loadError=e?.message||'Unable to load videos.';}
  const videos=posts.filter(isVideo);

  const render=tab=>{
    document.querySelectorAll('[data-root-video-tab]').forEach(b=>b.classList.toggle('active',b.dataset.rootVideoTab===tab));
    const title=$cb('rootVideoTitle'),sub=$cb('rootVideoSub'),box=$cb('rootVideoFeed');if(!box)return;
    if(tab==='live'){if(typeof openLiveProducer==='function')return openLiveProducer();box.innerHTML='<div class="cb-panel">Live video is not available right now.</div>';return;}
    if(tab==='saved'){if(title)title.textContent='Saved videos';if(sub)sub.textContent='Videos you saved.';box.innerHTML='<div class="cb-panel"><div class="cb-empty-panel">Open Saved from the left menu to view saved posts.</div></div>';return;}
    if(tab==='settings'){if(title)title.textContent='Video settings';if(sub)sub.textContent='Manage video preferences.';box.innerHTML='<div class="cb-panel"><div class="cb-empty-panel">Video settings are being prepared.</div></div>';return;}
    const list=tab==='reels'?videos.filter(isReel):videos;
    if(title)title.textContent=tab==='reels'?'Reels':'Reels & Videos';
    if(sub)sub.textContent=tab==='reels'?'Reels published through the Cirklebook Reel editor.':'Published videos and Reels from your Home feed.';
    if(loadError){box.innerHTML=`<div class="cb-panel"><div class="cb-empty-panel">${esc(loadError)}</div></div>`;return;}
    box.innerHTML=list.length?list.map(card).join(''):`<div class="cb-panel"><div class="cb-empty-panel">${tab==='reels'?'No Reels found yet. Create a Reel first.':'No videos found in your feed.'}</div></div>`;
    box.querySelectorAll('[data-hub-act]').forEach(btn=>btn.onclick=async()=>{const id=btn.dataset.id,act=btn.dataset.hubAct;try{if(act==='like'&&typeof toggleLike==='function')await toggleLike(id,btn);else if(act==='share'&&typeof sharePost==='function')await sharePost(id,btn);else if(act==='save'&&typeof toggleSave==='function')await toggleSave(id,btn);else if(act==='comment')showToast('Open this post from Home to view comments.');}catch(e){showToast(e?.message||'Action failed');}});
  };
  document.querySelectorAll('[data-root-video-tab]').forEach(b=>b.onclick=()=>render(b.dataset.rootVideoTab));
  render(initial==='reels'?'reels':'for-you');
};

// Refined live producer: fixed two-column layout, preview/setup area and safe Go Live behavior.
openLiveProducer=function(){
  if(dom.postModal&&!dom.postModal.classList.contains('hidden'))dom.postModal.classList.add('hidden');
  showFeature(`<div class="feature-page v4-live-page">
    <aside class="v4-live-sidebar">
      <div class="v4-live-sidebar-title"><span class="v4-live-badge">LIVE</span><h2>Create live video</h2></div>
      <button class="v4-live-nav active">⌂ Home</button><button class="v4-live-nav">⚙ Saved settings</button>
      <div class="v4-host-card"><span class="avatar">${cbEscape((cbName()||'U').charAt(0).toUpperCase())}</span><div><b>${cbEscape(cbName())}</b><small>Host · Your profile</small></div></div>
      <label>Choose where to post</label><select id="liveDestination"><option>Post on profile</option><option>Post in a group</option><option>Post on a Page</option></select>
      <label>Audience</label><select id="liveAudience"><option>Public</option><option>Friends</option><option>Only me</option></select>
    </aside>
    <main class="v4-live-content">
      <div class="v4-live-upcoming"><div><b>No upcoming live videos</b><small>Schedule a live video and let your audience know in advance.</small></div><button id="scheduleLiveBtn" class="cb-action">Schedule live video</button></div>
      <div class="v4-live-cards"><article><div class="v4-live-card-icon red">●</div><h3>Go live</h3><p>Connect with viewers in real time.</p><button id="setupLiveBtn" class="cb-action primary">Set up live video</button></article><article><div class="v4-live-card-icon">▤</div><h3>Create a live video ad</h3><p>Promote your live video to reach more people.</p><button id="liveAdBtn" class="cb-action">Create ad</button></article></div>
      <section id="liveSetupPanel" class="v4-live-history"><div class="v4-live-history-tabs"><button class="active">Past live videos</button><button>Live now</button></div><div class="v4-live-empty">🎥<b>No past live videos</b></div></section>
    </main>
  </div>`);
  $cb('setupLiveBtn').onclick=()=>renderLiveCameraSetupV4();
  $cb('scheduleLiveBtn').onclick=()=>cbShowDialog('Schedule live video',`<div class="cb-form-grid"><input type="datetime-local"><input placeholder="Live video title"><textarea placeholder="Description"></textarea><button class="primary-button">Save schedule</button></div>`);
  $cb('liveAdBtn').onclick=()=>openAdsBuilder('Video Views');
};
function renderLiveCameraSetupV4(){
  const p=$cb('liveSetupPanel');if(!p)return;
  p.innerHTML=`<div class="v4-live-setup-head"><div><h3>Live video setup</h3><p>Check your camera, microphone and details before going live.</p></div></div><div class="v4-live-setup-grid"><div class="v4-live-preview"><video id="livePreview" autoplay muted playsinline></video><div class="v4-preview-label">Preview</div></div><div class="v4-live-controls"><input id="liveTitle" placeholder="Live video title"><textarea id="liveDescription" placeholder="Description"></textarea><select><option>Camera</option><option>Streaming software</option></select><button id="startCamera" class="cb-action">🎥 Start camera & microphone</button><button id="goLive" class="cb-action primary" disabled>Go Live</button><div id="liveMsg" class="message hidden"></div></div></div>`;
  $cb('startCamera').onclick=async()=>{const m=$cb('liveMsg');try{liveStream=await navigator.mediaDevices.getUserMedia({video:true,audio:true});$cb('livePreview').srcObject=liveStream;$cb('goLive').disabled=false;m.textContent='Camera and microphone are ready.';m.className='message v4-success';}catch(e){m.textContent=e.message;m.className='message';}};
  $cb('goLive').onclick=()=>{cbShowDialog('Live streaming service',`<div class="v4-service-note"><h3>Camera setup is ready</h3><p>Broadcasting to viewers requires the Cirklebook live-stream backend/WebRTC service. This button will connect to that service when it is added.</p><button id="closeLiveNotice" class="primary-button">OK</button></div>`);$cb('closeLiveNotice')?.addEventListener('click',cbCloseDialog);};
}

// More polished settings shell; keep working privacy/language/session integrations from V3.
const _v3OpenSettings=openSettings;
openSettings=function(section='account'){
  _v3OpenSettings(section);
  requestAnimationFrame(()=>{const shell=featureView.querySelector('.settings-layout');if(shell)shell.classList.add('v4-settings-shell');});
};

// Remove the policy-box duplicate heading while preserving the textarea prompt.
function v4FixPolicyHeading(){document.querySelectorAll('.policy-notice strong').forEach(s=>{if((s.textContent||'').trim().toLowerCase()==="what's on your mind?")s.remove();});}
v4FixPolicyHeading();new MutationObserver(v4FixPolicyHeading).observe(document.body,{childList:true,subtree:true});

// Consistent tooltip/title and image fitting for the user's custom feature icons.
document.querySelectorAll('img[src*="icon-dashboard"],img[src*="icon-photo-video"],img[src*="icon-live"]').forEach(i=>i.classList.add('v4-feature-icon'));

console.log('Cirklebook V4 final polish corrections ready');
})();


/* =========================================================
   CIRKLEBOOK — AUTHORITATIVE FINAL CORRECTION MERGE
   Fixes confirmed during user testing.
========================================================= */
(function cirklebookAuthoritativeFinalMerge(){
  'use strict';

  const currentAvatarElements = () => [
    dom.topAvatar, dom.sidebarAvatar, dom.composerAvatar,
    dom.modalAvatar, dom.menuAvatar
  ].filter(Boolean);

  function savedAvatar(){
    try { return cbProfileExtras()?.avatar || ''; }
    catch (_) { return ''; }
  }

  function paintAvatar(el, url){
    if(!el) return;
    if(url){
      el.textContent='';
      el.style.backgroundImage=`url("${String(url).replace(/"/g,'\\"')}")`;
      el.style.backgroundSize='cover';
      el.style.backgroundPosition='center';
      el.style.backgroundRepeat='no-repeat';
      el.classList.add('cb-has-profile-photo');
    } else {
      el.style.backgroundImage='';
      el.classList.remove('cb-has-profile-photo');
      el.textContent=getInitial(state.currentUser||{username:'User'});
    }
  }

  function syncCurrentUserAvatarEverywhere(){
    const url=savedAvatar();
    currentAvatarElements().forEach(el=>paintAvatar(el,url));

    // The Story strip can be rendered before the signed-in user's profile has
    // finished loading. Repaint its Create Story avatar as soon as the real
    // profile photo becomes available.
    const storyProfile=document.querySelector('#cbCreateStoryCard .cb-create-story-profile');
    if(storyProfile&&url){
      storyProfile.innerHTML='';
      const img=document.createElement('img');
      img.src=url;
      img.alt='Profile';
      storyProfile.appendChild(img);
    }

    // Full-profile/composer images.
    document.querySelectorAll('#profileBigAvatar,.profile-composer-card img').forEach(img=>{
      if(url && img.tagName==='IMG') img.src=url;
    });

    // Posts authored by the signed-in user.
    const uid=String(state.currentUser?.id||state.currentUser?.user_id||state.currentUser?.userId||'');
    if(uid && url){
      document.querySelectorAll('#feedContainer .post').forEach(post=>{
        const author=String(post.dataset.authorId||'');
        if(author && author===uid){
          const av=post.querySelector('.post-header .avatar');
          paintAvatar(av,url);
        }
      });
    }
  }

  // Keep the original user rendering but repaint with the saved profile photo.
  const originalRenderCurrentUser=renderCurrentUser;
  renderCurrentUser=function(){
    originalRenderCurrentUser();
    syncCurrentUserAvatarEverywhere();
  };

  // Profile image save: keep V4 resize/persistence and synchronize the whole app.
  const v4SaveProfileImage=saveProfileImage;
  saveProfileImage=function(file,key,done){
    v4SaveProfileImage(file,key,()=>{
      syncCurrentUserAvatarEverywhere();
      done?.();
    });
  };

  // Ensure Home also reflects the latest profile picture.
  const v4ShowHome=showHome;
  showHome=function(){
    v4ShowHome();
    requestAnimationFrame(syncCurrentUserAvatarEverywhere);
  };

  // New feed items should inherit the current user's saved profile image without a DOM mutation loop.
  const avatarSafeLoadFeed=loadFeed;
  loadFeed=async function(...args){
    const result=await avatarSafeLoadFeed(...args);
    requestAnimationFrame(syncCurrentUserAvatarEverywhere);
    return result;
  };

  // One Profile destination only: account menu + left sidebar => full profile page.
  function openAuthoritativeProfile(){
    dom.accountMenu?.classList.add('hidden');
    document.getElementById('cirklebookProfileModal')?.remove();
    document.getElementById('cbProfileQuickModal')?.remove();
    document.getElementById('cirklebookRealProfileModal')?.remove();
    openProfilePage('all');
  }

  const sidebarProfile=document.querySelector('.sidebar-profile');
  if(sidebarProfile){
    sidebarProfile.setAttribute('role','button');
    sidebarProfile.setAttribute('tabindex','0');
    sidebarProfile.setAttribute('aria-label','Open profile');
    sidebarProfile.style.cursor='pointer';
    sidebarProfile.onclick=(e)=>{e.preventDefault();e.stopPropagation();openAuthoritativeProfile();};
    sidebarProfile.onkeydown=(e)=>{
      if(e.key==='Enter'||e.key===' '){e.preventDefault();openAuthoritativeProfile();}
    };
  }

  const accountProfile=$cb('accountMenu')?.querySelector('[data-cb-action="profile"]');
  if(accountProfile){
    accountProfile.onclick=(e)=>{e.preventDefault();e.stopPropagation();openAuthoritativeProfile();};
  }

  // Facebook-style cover/profile photo menus with Upload + Remove.
  document.addEventListener('click',function(e){
    const coverBtn=e.target.closest('#coverEditBtn');
    const avatarBtn=e.target.closest('#avatarEditBtn');
    if(!coverBtn && !avatarBtn) return;
    e.preventDefault(); e.stopImmediatePropagation();
    const isCover=!!coverBtn;
    const key=isCover?'cover':'avatar';
    const inputId=isCover?'profileCoverInput':'profileAvatarInput';
    const title=isCover?'Edit cover photo':'Edit profile picture';
    cbShowDialog(title,`
      <div class="cb-photo-menu">
        <button type="button" id="cbPhotoUpload" class="cb-photo-menu-row">📷 Upload photo</button>
        <button type="button" id="cbPhotoRemove" class="cb-photo-menu-row danger">🗑 Remove photo</button>
      </div>`);
    $cb('cbPhotoUpload').onclick=()=>{
      const input=$cb(inputId);
      if(!input){showToast('Photo picker is unavailable.');return;}
      try{ if(typeof input.showPicker==='function') input.showPicker(); else input.click(); }
      catch(_){ input.click(); }
      cbCloseDialog();
    };
    $cb('cbPhotoRemove').onclick=()=>{
      const ex=cbProfileExtras(); delete ex[key]; saveProfileExtras(ex); cbCloseDialog();
      syncCurrentUserAvatarEverywhere();
      showToast(isCover?'Cover photo removed':'Profile picture removed');
      openProfilePage('all');
    };
  },true);

  // Human-readable notification labels instead of internal translation keys.
  function humanNotification(type){
    const t=String(type||'').replace(/^notification\./,'');
    const map={
      friend_request:'sent you a friend request',
      friend_request_accepted:'accepted your friend request',
      new_follower:'started following you',
      post_share:'shared your post',
      post_comment:'commented on your post',
      post_reaction:'reacted to your post'
    };
    return map[t] || t.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
  }

  const originalNotifications=openNotificationsPage;
  openNotificationsPage=async function(){
    await originalNotifications();
    requestAnimationFrame(()=>{
      featureView.querySelectorAll('.notification-card,.notification-item,.cb-notification-row').forEach(row=>{
        const target=row.querySelector('b,strong')||row;
        const txt=(target.textContent||'').trim();
        if(txt.startsWith('notification.')) target.textContent=humanNotification(txt);
      });
      // fallback for current V4 simple rows
      featureView.querySelectorAll('div').forEach(d=>{
        if(d.children.length>3) return;
        const tx=(d.firstChild?.textContent||'').trim();
        if(tx.startsWith('notification.')){
          const node=[...d.childNodes].find(n=>n.nodeType===Node.TEXT_NODE && String(n.textContent).trim().startsWith('notification.'));
          if(node) node.textContent=humanNotification(node.textContent.trim())+' ';
        }
      });
    });
  };

  // Re-run after session restore and on first paint.
  setTimeout(syncCurrentUserAvatarEverywhere,0);
  setTimeout(syncCurrentUserAvatarEverywhere,500);

  console.log('Cirklebook authoritative final correction merge ready');
})();



/* FINAL V5: stable settings navigation — one left menu, one synchronized detail panel. */
(function cirklebookV5SettingsAndHelp(){
  const labels=[['account','Account'],['security','Security & Login'],['privacy','Privacy'],['2fa','2FA'],['blocking','Blocking'],['language','Language'],['notifications','Notifications'],['sessions','Audit & Sessions']];
  openSettings=function(section='account'){
    showFeature(`<div class="feature-page v5-settings-shell"><aside class="cb-panel settings-menu"><h2>Settings</h2>${labels.map(([k,l])=>`<button type="button" data-settings="${k}" class="${section===k?'active':''}">${l}</button>`).join('')}</aside><main id="settingsBody" class="v5-settings-body"></main></div>`);
    const nav=featureView.querySelector('.settings-menu');
    nav?.addEventListener('click',async e=>{
      const btn=e.target.closest('[data-settings]'); if(!btn)return;
      const selected=btn.dataset.settings;
      nav.querySelectorAll('[data-settings]').forEach(x=>x.classList.toggle('active',x===btn));
      await renderSettingsSection(selected);
    });
    renderSettingsSection(section);
  };

  const helpBtn=[...($cb('accountMenu')?.querySelectorAll('button')||[])].find(b=>b.dataset.cbAction==='help');
  if(helpBtn){
    const replacement=helpBtn.cloneNode(true);
    helpBtn.replaceWith(replacement);
    replacement.addEventListener('click',()=>{
      dom.accountMenu?.classList.add('hidden');
      cbShowDialog('Help & Support',`<div class="v5-help-list">
        <button type="button" data-help="support"><b>Support Center</b><small>Help with using Cirklebook features.</small></button>
        <button type="button" data-help="recovery"><b>Account Recovery</b><small>Recover access to your account.</small></button>
        <button type="button" data-help="standards"><b>Community Standards</b><small>Read Cirklebook community rules.</small></button>
        <button type="button" data-help="report"><b>Report a Problem</b><small>Tell us about a technical or safety problem.</small></button>
      </div>`);
      $cb('cbDialogBody')?.addEventListener('click',e=>{
        const b=e.target.closest('[data-help]'); if(!b)return;
        const k=b.dataset.help;
        if(k==='recovery'){cbCloseDialog();$cb('forgotPasswordButton')?.click();return;}
        if(k==='standards'){cbCloseDialog();openStandards();return;}
        if(k==='report'){cbShowDialog('Report a Problem','<div class="cb-form-grid"><select><option>Something is not working</option><option>Account issue</option><option>Safety issue</option><option>Other</option></select><textarea rows="5" placeholder="Describe the problem"></textarea><button class="primary-button" type="button" onclick="showToast(\'Problem report prepared\');cbCloseDialog();">Submit</button></div>');return;}
        cbShowDialog('Support Center','<div class="v5-support-grid"><article><h3>Account</h3><p>Login, recovery, profile and security.</p></article><article><h3>Posts & Media</h3><p>Photos, videos, reels, comments and sharing.</p></article><article><h3>Groups & Pages</h3><p>Creation and management help.</p></article><article><h3>Ads & Payments</h3><p>Boost, ad setup and billing help.</p></article></div>');
      },{once:true});
    });
  }
})();
console.log('Cirklebook final redesign module ready');
})();



/* =========================================================
   CIRKLEBOOK — FINAL USER CORRECTIONS (2026-09-08)
   Keeps Consolidated V4 as the base and applies only the
   corrections confirmed after the V4 update.
========================================================= */
(function cirklebookFinalUserCorrections(){
  'use strict';

  // Sponsored sidebar is reserved ad inventory until Ads delivery is connected.
  function normalizeAdSpaces(){
    document.querySelectorAll('.ad-box').forEach(box=>{
      box.innerHTML='<strong>Ad space</strong>';
      box.setAttribute('aria-label','Ad space');
    });
  }
  normalizeAdSpaces();
  // AI media scan is intentionally disabled for the current release.
  // Media posts publish through the normal upload -> publish pipeline.
})();


/* CIRKLEBOOK FINAL: Facebook-inspired text composer controls (white by default). */
(function cirklebookComposerBackgroundAndEmoji(){
  const body=document.getElementById('postBody');
  const stage=document.getElementById('postTextStage');
  const bgBtn=document.getElementById('postBackgroundButton');
  const emojiBtn=document.getElementById('postEmojiButton');
  const bgPalette=document.getElementById('postBackgroundPalette');
  const emojiPalette=document.getElementById('postEmojiPalette');
  if(!body||!stage||!bgBtn||!emojiBtn||!bgPalette||!emojiPalette)return;
  const backgrounds=['','linear-gradient(135deg,#1877f2,#7b2ff7)','linear-gradient(135deg,#f00078,#7b2ff7)','linear-gradient(135deg,#ff7a18,#af002d)','linear-gradient(135deg,#11998e,#38ef7d)','#111827','#b91c1c','#6d28d9'];
  bgPalette.innerHTML=backgrounds.map((bg,i)=>`<button type="button" data-post-bg="${i}" title="${i?'Background':'White'}" style="background:${bg||'#fff'}"></button>`).join('');
  const emojis=['😀','😂','😍','🥰','😊','😢','😮','😡','👍','❤️','🤲','🌹','🎉','🙏','💯','✨'];
  emojiPalette.innerHTML=emojis.map(x=>`<button type="button" data-post-emoji="${x}">${x}</button>`).join('');
  function applyBg(bg){
    stage.style.background=bg||'#fff';
    const colored=!!bg;
    stage.classList.toggle('has-post-background',colored);
    body.style.color=colored?'#fff':'';
    body.dataset.postBackground=bg||'';
  }
  bgBtn.addEventListener('click',e=>{e.stopPropagation();bgPalette.classList.toggle('hidden');emojiPalette.classList.add('hidden');});
  emojiBtn.addEventListener('click',e=>{e.stopPropagation();emojiPalette.classList.toggle('hidden');bgPalette.classList.add('hidden');});
  bgPalette.addEventListener('click',e=>{const b=e.target.closest('[data-post-bg]');if(!b)return;applyBg(backgrounds[Number(b.dataset.postBg)]||'');bgPalette.classList.add('hidden');});
  emojiPalette.addEventListener('click',e=>{const b=e.target.closest('[data-post-emoji]');if(!b)return;const start=body.selectionStart??body.value.length,end=body.selectionEnd??start;body.value=body.value.slice(0,start)+b.dataset.postEmoji+body.value.slice(end);body.focus();body.selectionStart=body.selectionEnd=start+b.dataset.postEmoji.length;emojiPalette.classList.add('hidden');});
  document.addEventListener('click',()=>{bgPalette.classList.add('hidden');emojiPalette.classList.add('hidden');});
  const originalClear=typeof clearPostForm==='function'?clearPostForm:null;
  if(originalClear){clearPostForm=function(){const r=originalClear.apply(this,arguments);applyBg('');return r;};}
})();

/* =========================================================
   CIRKLEBOOK — PROFILE CONTENT FINAL CORRECTION
   Facebook-inspired full profile using the SAME post database.
   Keeps existing Home/feed/media/upload behaviour unchanged.
========================================================= */
(function cirklebookProfileContentFinal(){
  'use strict';

  function profileOwnPostArrays(result){
    return extractPosts(result);
  }

  async function fetchOwnProfilePosts(){
    const result = await apiRequest('/posts/mine?limit=50');
    return await hydrateSharedPosts(profileOwnPostArrays(result));
  }

  async function fetchProfileFriendsSafe(){
    try{
      const r=await apiRequest('/friends');
      const arr=r?.data?.friends||r?.friends||r?.data||[];
      return Array.isArray(arr)?arr:[];
    }catch(_){return []}
  }

  function profileMediaItems(posts,type){
    const out=[];
    (Array.isArray(posts)?posts:[]).forEach(post=>{
      (Array.isArray(post?.media)?post.media:[]).forEach(item=>{
        if(!type || item?.media_type===type) out.push({post,item});
      });
    });
    return out;
  }

  function profileSavedAvatar(){
    try{return cbProfileExtras()?.avatar||''}catch(_){return ''}
  }

  function paintProfilePostAvatars(root){
    const url=profileSavedAvatar();
    if(!url||!root)return;
    const uid=String(state.currentUser?.id||state.currentUser?.user_id||state.currentUser?.userId||'');
    root.querySelectorAll('.post').forEach(post=>{
      const author=String(post.dataset.authorId||'');
      if(uid && author && author!==uid)return;
      const av=post.querySelector('.post-header .avatar');
      if(!av)return;
      av.textContent='';
      av.style.backgroundImage=`url("${String(url).replace(/"/g,'\\"')}")`;
      av.style.backgroundSize='cover';
      av.style.backgroundPosition='center';
      av.style.backgroundRepeat='no-repeat';
      av.classList.add('cb-has-profile-photo');
    });
  }

  function renderProfilePhotoGrid(posts,limit){
    const imgs=profileMediaItems(posts,'image');
    const list=Number.isFinite(limit)?imgs.slice(0,limit):imgs;
    if(!list.length)return '<div class="cb-empty-panel">No photos uploaded yet.</div>';
    return `<div class="cb-profile-photo-grid">${list.map(({item})=>{
      const url=buildMediaUrl(item);
      return url?`<button type="button" class="cb-profile-photo-tile" aria-label="Open photo"><img src="${escapeHtml(url)}" alt="Profile photo post" loading="lazy"></button>`:'';
    }).join('')}</div>`;
  }

  function renderProfileFriendsPreview(friends){
    if(!friends.length)return '<div class="cb-empty-panel compact">No friends to show yet.</div>';
    return `<div class="cb-profile-friends-preview">${friends.slice(0,6).map(f=>{
      const n=f.displayName||f.display_name||f.username||'Friend';
      return `<div class="cb-profile-friend-mini"><span class="cb-profile-friend-avatar">${escapeHtml(String(n).charAt(0).toUpperCase())}</span><b>${escapeHtml(n)}</b></div>`;
    }).join('')}</div>`;
  }

  function profileCountText(n,label){
    const v=Number(n||0);
    return `${v} ${label}`;
  }

  async function renderProfileAllContent(body,p,name,loc,avatar,bio){
    body.innerHTML='<div class="cb-profile-loading cb-panel">Loading your profile posts…</div>';
    let posts=[],friends=[];
    try{
      [posts,friends]=await Promise.all([fetchOwnProfilePosts(),fetchProfileFriendsSafe()]);
    }catch(err){
      body.innerHTML=`<div class="cb-panel"><div class="cb-empty-panel">${cbEscape(err.message||'Unable to load profile posts.')}</div></div>`;
      return;
    }

    const photos=profileMediaItems(posts,'image');
    const videos=profileMediaItems(posts,'video');
    const ex=cbProfileExtras();
    body.innerHTML=`<div class="profile-content cb-profile-facebook-layout">
      <aside class="cb-profile-left-column">
        <div class="cb-panel profile-section-card cb-profile-intro-card">
          <h3>Intro</h3>
          <p class="cb-profile-bio">${cbEscape(bio)}</p>
          ${loc?`<p>📍 Lives in <b>${cbEscape(loc)}</b></p>`:''}
          ${p.website?`<p>🔗 <span>${cbEscape(p.website)}</span></p>`:''}
          <p>👥 ${profileCountText(friends.length,'friends')}</p>
          <p>📝 ${profileCountText(posts.length,'posts')}</p>
          <button class="cb-action cb-profile-full-button" id="quickEditIntro">Edit details</button>
        </div>

        <div class="cb-panel profile-section-card">
          <div class="cb-profile-section-head"><h3>Photos</h3><button class="cb-profile-link" data-profile-go="photos">See all photos</button></div>
          ${renderProfilePhotoGrid(posts,6)}
        </div>

        <div class="cb-panel profile-section-card">
          <div class="cb-profile-section-head"><h3>Friends</h3><button class="cb-profile-link" data-profile-go="friends">See all friends</button></div>
          <div class="cb-profile-muted">${profileCountText(friends.length,'friends')}</div>
          ${renderProfileFriendsPreview(friends)}
        </div>

        <div class="cb-panel profile-section-card">
          <h3>Verification Badge</h3>
          <p>Complete profile · NID/Birth Certificate/Passport · Live identity check · ৳450/month</p>
          <button class="cb-action primary cb-profile-full-button" id="applyVerify">Get Verified</button>
        </div>
      </aside>

      <main class="cb-profile-main-column">
        <div class="cb-panel profile-composer-card cb-profile-composer-facebook">
          <img class="avatar" src="${avatar}" alt="">
          <button id="profileComposerBtn">What's on your mind?</button>
          <div class="cb-profile-composer-shortcuts"><button type="button" id="profileLiveShortcut" title="Live video"><img src="assets/icon-live.png" alt=""> <span>Live video</span></button><button type="button" id="profilePhotoShortcut" title="Photo/video"><img src="assets/icon-photo-video.png" alt=""> <span>Photo/video</span></button><button type="button" id="profileFeelingShortcut" title="Feeling / Activity"><img src="assets/icon-feeling.png" alt=""> <span>Feeling/activity</span></button></div>
        </div>

        <div class="cb-panel cb-profile-post-toolbar">
          <div class="cb-profile-section-head"><h3>Posts</h3><div><button class="cb-action" id="profilePostFilters">⚙ Filters</button> <button class="cb-action" id="profileManagePosts">Manage posts</button></div></div>
          <div class="cb-profile-view-tabs"><button class="active">☰ List view</button><button data-profile-go="photos">▦ Grid view</button></div>
        </div>

        <div id="cbProfileOwnPosts" class="cb-profile-post-list">
          ${posts.length?posts.map(renderPost).join(''):'<div class="cb-panel"><div class="cb-empty-panel">You have not posted anything yet.</div></div>'}
        </div>
      </main>
    </div>`;

    body.querySelectorAll('[data-profile-go]').forEach(x=>x.onclick=()=>window.openProfilePage(x.dataset.profileGo));
    $cb('applyVerify')?.addEventListener('click',openVerification);
    $cb('quickEditIntro')?.addEventListener('click',()=>openProfileEditor(p));
    $cb('profileComposerBtn')?.addEventListener('click',()=>openPostModal(false));
    $cb('profilePhotoShortcut')?.addEventListener('click',()=>{openPostModal(true)});
    $cb('profileLiveShortcut')?.addEventListener('click',()=>openLiveProducer());
    $cb('profileFeelingShortcut')?.addEventListener('click',()=>{openPostModal(false);setTimeout(()=>$cb('modalFeelingButton')?.click(),80);});
    $cb('profilePostFilters')?.addEventListener('click',()=>showToast('Profile posts are currently sorted newest first.'));
    $cb('profileManagePosts')?.addEventListener('click',()=>showToast('Post management controls will use the same Cirklebook post database.'));

    initializeSecureVideoPlayers();
    paintProfilePostAvatars($cb('cbProfileOwnPosts'));
  }

  async function renderProfilePhotosTab(body){
    body.innerHTML='<div class="cb-panel">Loading photos…</div>';
    try{
      const posts=await fetchOwnProfilePosts();
      body.innerHTML=`<div class="cb-panel cb-profile-tab-panel"><div class="cb-profile-section-head"><div><h2>Photos</h2><div class="cb-profile-muted">Photos you uploaded in your posts</div></div><button class="cb-action primary" id="profilePhotoAdd">Add photos</button></div>${renderProfilePhotoGrid(posts)}</div>`;
      $cb('profilePhotoAdd')?.addEventListener('click',()=>openPostModal(true));
    }catch(e){body.innerHTML=`<div class="cb-panel"><div class="cb-empty-panel">${cbEscape(e.message)}</div></div>`}
  }

  async function renderProfileReelsTab(body){
    body.innerHTML='<div class="cb-panel">Loading videos…</div>';
    try{
      const posts=await fetchOwnProfilePosts();
      let localReelIds=[]; try{localReelIds=JSON.parse(localStorage.getItem('cirklebook_reel_post_ids_v1')||'[]').map(String);}catch(_){}
      const vids=posts.filter(post=>{
        const id=String(post?.id||'');
        const type=String(post?.post_type||post?.postType||post?.type||'').toLowerCase();
        return type==='reel' || localReelIds.includes(id);
      });
      body.innerHTML=`<div class="cb-panel cb-profile-tab-panel"><div class="cb-profile-section-head"><div><h2>Reels</h2><div class="cb-profile-muted">Reels you published from the Cirklebook Reel editor</div></div><button class="cb-action primary" id="profileVideoAdd">Create reel</button></div></div><div id="cbProfileVideoPosts" class="cb-profile-video-posts">${vids.length?vids.map(renderPost).join(''):'<div class="cb-panel"><div class="cb-empty-panel">No reels published yet.</div></div>'}</div>`;
      $cb('profileVideoAdd')?.addEventListener('click',()=>openPostModal(true));
      initializeSecureVideoPlayers();
      paintProfilePostAvatars($cb('cbProfileVideoPosts'));
    }catch(e){body.innerHTML=`<div class="cb-panel"><div class="cb-empty-panel">${cbEscape(e.message)}</div></div>`}
  }

  const existingProfilePage = (typeof window.openProfilePage === 'function') ? window.openProfilePage : null;
  window.openProfilePage=async function(tab='all'){
    const p=await fetchProfileData(), ex=cbProfileExtras();
    const name=p.displayName||p.display_name||cbName();
    const bio=p.bio||ex.bio||'Add a bio to tell people about yourself.';
    const loc=p.locationText||p.location_text||ex.location||'';
    const avatar=profileImage('avatar',`${A}logo-main.png`);
    const cover=profileImage('cover','');

    showFeature(`<div class="feature-page cb-profile-page-final">
      <div class="feature-hero cb-profile-hero-final">
        <div class="profile-cover" id="profileCover" ${cover?`style="background-image:url('${cover}')"`:''}>
          <button id="coverEditBtn" class="profile-cover-edit">📷 Edit cover photo</button>
        </div>
        <div class="profile-head cb-profile-head-final">
          <div class="profile-avatar-wrap">
            <img class="profile-big-avatar" id="profileBigAvatar" src="${avatar}" alt="Profile">
            <button id="avatarEditBtn" class="profile-avatar-edit" title="Edit profile picture">📷</button>
          </div>
          <div class="profile-title">
            <h1>${cbEscape(name)}</h1>
            <div class="cb-profile-follow-line"><b>@${cbEscape(p.username||state.currentUser?.username||'')}</b> <span>·</span> <span>${cbEscape(ex.followers??0)} followers</span> <span>·</span> <span>${cbEscape(ex.following??0)} following</span></div>
            <p>${cbEscape(bio)}</p>
          </div>
          <div class="profile-actions"><button class="cb-action primary" id="profileDashboard">Dashboard</button><button class="cb-action" id="profileEdit">✎ Edit profile</button></div>
        </div>
        <div class="profile-tabs cb-profile-tabs-final">${[['all','All'],['about','About'],['reels','Reels'],['photos','Photos'],['friends','Friends'],['more','More ▾']].map(([k,l])=>`<button data-profile-tab="${k}" class="${tab===k?'active':''}">${l}</button>`).join('')}</div>
      </div>
      <div id="profileTabBody" class="cb-profile-tab-body"></div>
      <input id="profileAvatarInput" type="file" accept="image/*" hidden>
      <input id="profileCoverInput" type="file" accept="image/*" hidden>
    </div>`);

    featureView.querySelectorAll('[data-profile-tab]').forEach(b=>b.onclick=()=>window.openProfilePage(b.dataset.profileTab));
    $cb('profileDashboard').onclick=()=>openDashboard();
    $cb('profileEdit').onclick=()=>openProfileEditor(p);
    $cb('avatarEditBtn').onclick=()=>$cb('profileAvatarInput').click();
    $cb('coverEditBtn').onclick=()=>$cb('profileCoverInput').click();
    $cb('profileAvatarInput').onchange=e=>saveProfileImage(e.target.files?.[0],'avatar',()=>window.openProfilePage(tab));
    $cb('profileCoverInput').onchange=e=>saveProfileImage(e.target.files?.[0],'cover',()=>window.openProfilePage(tab));

    const body=$cb('profileTabBody');
    if(tab==='about'){
      body.innerHTML=renderAbout(p,name,loc);bindAbout(p);
    }else if(tab==='friends'){
      renderProfileFriends(body);
    }else if(tab==='photos'){
      await renderProfilePhotosTab(body);
    }else if(tab==='reels'){
      await renderProfileReelsTab(body);
    }else if(tab==='more'){
      body.innerHTML=`<div class="cb-panel cb-profile-more-panel"><h2>More</h2><div class="cb-profile-more-grid"><button data-more="photos">Photos</button><button data-more="reels">Reels & Videos</button><button data-more="friends">Friends</button><button data-more="about">About</button><button id="moreVerified">Verification Badge</button><button id="moreDashboard">Professional Dashboard</button></div></div>`;
      body.querySelectorAll('[data-more]').forEach(b=>b.onclick=()=>window.openProfilePage(b.dataset.more));
      $cb('moreVerified').onclick=openVerification;$cb('moreDashboard').onclick=openDashboard;
    }else{
      await renderProfileAllContent(body,p,name,loc,avatar,bio);
    }
  };

  window.CirklebookProfile={open:window.openProfilePage,fetchOwnPosts:fetchOwnProfilePosts};
  console.log('Cirklebook profile content final correction ready');
})();


/* =========================================================
   CIRKLEBOOK FINAL CONSOLIDATED UX UPDATE — 2026-09-09
   Scope: Stories, Facebook-inspired Profile/About/Edit,
   Friends, Settings. Keeps feed/media/upload/auth APIs intact.
========================================================= */
(function cirklebookFinalConsolidatedUx(){
  'use strict';

  // Runtime compatibility bridge: later UI modules previously called a showFeature
  // function that existed only inside an older private scope.
  const showFeature = (html, topId='') => {
    const home = document.getElementById('homeLayout');
    const view = document.getElementById('featureView');
    if(!view) return;
    if(home) home.classList.add('hidden');
    view.innerHTML = html;
    view.classList.remove('hidden');
    if(topId && typeof activateTop === 'function') activateTop(topId);
    window.scrollTo({top:0, behavior:'auto'});
  };
  // These are defined below in this module. Explicit declarations prevent
  // strict-mode ReferenceError during initialization.
  let renderAbout, bindAbout, openProfileEditor, openFriendsFull, loadFriendsFull, openSettings;

  const esc = (v='') => (typeof cbEscape === 'function' ? cbEscape(String(v)) : String(v).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])));
  const getExtras = () => (typeof cbProfileExtras === 'function' ? cbProfileExtras() : JSON.parse(localStorage.getItem('cirklebook_profile_extras')||'{}'));
  const saveExtras = (x) => {
    if(typeof saveProfileExtras === 'function') saveProfileExtras(x);
    else localStorage.setItem('cirklebook_profile_extras', JSON.stringify(x||{}));
  };

  // ---------- Facebook-inspired Stories row ----------
  const STORY_KEY='cirklebook_local_story_v1';
  const STORY_POOL_KEY='cirklebook_story_pool_v2';
  function storyUserKey(){ return String(state?.currentUser?.username||document.getElementById('topUsername')?.textContent||'').trim().toLowerCase(); }
  function readStoryPool(){ try{const x=JSON.parse(localStorage.getItem(STORY_POOL_KEY)||'{}');return x&&typeof x==='object'?x:{};}catch(_){return {};} }
  function writeStoryPool(pool){ try{localStorage.setItem(STORY_POOL_KEY,JSON.stringify(pool));}catch(_){} }
  function putStoryInPool(story){
    const key=storyUserKey(); if(!key||!story) return;
    const pool=readStoryPool();
    const copy={...story,ownerKey:key,ownerName:storyName(),ownerAvatar:storyAvatar()};
    try{ if(JSON.stringify(copy).length<3000000){ pool[key]=copy; writeStoryPool(pool); } }catch(_){}
  }
  function removeStoryFromPool(){const key=storyUserKey();const pool=readStoryPool();if(key&&pool[key]){delete pool[key];writeStoryPool(pool);}}
  const STORY_DB='cirklebook_story_cache_v1';
  const STORY_STORE='stories';
  const STORY_ID='current';
  let sessionStory=null;

  function storyDb(){
    return new Promise((resolve,reject)=>{
      try{
        const req=indexedDB.open(STORY_DB,1);
        req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(STORY_STORE))db.createObjectStore(STORY_STORE);};
        req.onsuccess=()=>resolve(req.result);
        req.onerror=()=>reject(req.error||new Error('Story cache unavailable'));
      }catch(e){reject(e);}
    });
  }
  async function readIndexedStory(){
    try{
      const db=await storyDb();
      return await new Promise((resolve)=>{
        const tx=db.transaction(STORY_STORE,'readonly');
        const req=tx.objectStore(STORY_STORE).get(STORY_ID);
        req.onsuccess=()=>resolve(req.result||null);
        req.onerror=()=>resolve(null);
      });
    }catch(_){return null;}
  }
  async function writeIndexedStory(story){
    try{
      const db=await storyDb();
      await new Promise((resolve,reject)=>{
        const tx=db.transaction(STORY_STORE,'readwrite');
        tx.objectStore(STORY_STORE).put(story,STORY_ID);
        tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);
      });
      return true;
    }catch(e){console.warn('STORY CACHE WRITE:',e);return false;}
  }
  async function deleteIndexedStory(){
    try{
      const db=await storyDb();
      await new Promise((resolve)=>{
        const tx=db.transaction(STORY_STORE,'readwrite');
        tx.objectStore(STORY_STORE).delete(STORY_ID);
        tx.oncomplete=resolve;tx.onerror=resolve;
      });
    }catch(_){}
  }

  function storyAvatar(){
    try{
      if(typeof profileImage==='function'){const u=profileImage('avatar','');if(u)return u;}
      if(typeof cbProfileExtras==='function'){const ex=cbProfileExtras();if(ex?.avatar)return ex.avatar;}
    }catch(_){}
    const accountAvatar=state?.currentUser?.avatarUrl||state?.currentUser?.avatar_url||state?.currentUser?.profileImageUrl||state?.currentUser?.profile_image_url||'';
    if(accountAvatar)return accountAvatar;
    const img=document.querySelector('#topAvatar img,#sidebarAvatar img,#composerAvatar img,.profile-big-avatar');
    if(img?.src) return img.src;
    for(const el of [document.getElementById('topAvatar'),document.getElementById('sidebarAvatar'),document.getElementById('composerAvatar')]){
      const bg=el&&getComputedStyle(el).backgroundImage;
      const m=bg&&bg.match(/url\(["']?(.*?)["']?\)/);if(m?.[1])return m[1];
    }
    return '';
  }
  function storyName(){
    return (document.getElementById('topUsername')?.textContent||state?.currentUser?.username||'You').trim();
  }
  // Local compatibility helper. The older cbName() lived in another private scope.
  const cbName = () => storyName();
  function readLocalStory(){
    try{
      const s=JSON.parse(localStorage.getItem(STORY_KEY)||'null');
      const key=storyUserKey();
      if(s && s.ownerKey && key && s.ownerKey!==key) return readStoryPool()[key]||null;
      if(!s) return readStoryPool()[key]||sessionStory;
      if(s.expiresAt && Date.now()>s.expiresAt){localStorage.removeItem(STORY_KEY);removeStoryFromPool();return null;}
      return s;
    }catch(_){return sessionStory;}
  }
  function saveLocalStory(story){
    story={...story,ownerKey:storyUserKey(),ownerName:storyName(),ownerAvatar:storyAvatar()};
    sessionStory=story;
    putStoryInPool(story);
    // Keep small/text stories in localStorage for compatibility.
    try{
      const serial=JSON.stringify(story);
      if(serial.length<3_500_000) localStorage.setItem(STORY_KEY,serial);
      else localStorage.removeItem(STORY_KEY);
    }catch(_){}
    // IndexedDB can persist larger photo/video stories across refreshes.
    writeIndexedStory(story);
  }
  function normalizeStories(r){
    const a=r?.data?.stories||r?.stories||r?.data||[];
    return Array.isArray(a)?a:[];
  }
  function storyMedia(s){
    const persistent=s?.mediaUrl||s?.media_url||s?.url||s?.media?.url||s?.media?.publicUrl||'';
    const temporary=s?.mediaData||'';
    const selected=(String(temporary).startsWith('blob:')&&persistent)?persistent:(temporary||persistent);
    if(!selected)return '';
    try{return typeof buildMediaUrl==='function'?buildMediaUrl({url:selected}):selected;}catch(_){return selected;}
  }
  function storyOwner(s){
    return s?.ownerName||s?.user?.displayName||s?.user?.display_name||s?.displayName||s?.display_name||s?.username||s?.user?.username||'Cirklebook user';
  }
  function storyOwnerAvatar(s){
    return s?.ownerAvatar||s?.user?.avatarUrl||s?.user?.avatar_url||s?.avatarUrl||s?.avatar_url||'';
  }
  function storyCard(s,i){
    const media=storyMedia(s);
    const owner=storyOwner(s);
    const av=storyOwnerAvatar(s);
    const mime=String(s?.mime||s?.mimeType||s?.mime_type||'').toLowerCase();
    const isVideo=mime.startsWith('video/')||/\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(String(media||''));
    const fallbackBg=esc(s?.bg||s?.background||'#6d28d9');

    let visual='';
    if(media){
      visual=isVideo
        ? `<video class="cb-story-card-media" src="${esc(media)}" muted playsinline preload="metadata"></video><span class="cb-story-video-play">▶</span>`
        : `<img class="cb-story-card-media" src="${esc(media)}" alt="">`;
    }

    return `<button type="button" class="cb-story-card" data-story-index="${i}" style="background:${fallbackBg}">
      ${visual}
      <span class="cb-story-overlay"></span>
      ${!media&&s?.text?`<span class="cb-story-card-text">${esc(String(s.text).slice(0,48))}</span>`:''}
      <span class="cb-story-avatar">${av?`<img src="${esc(av)}" alt="" onerror="this.remove()">`:esc(owner.charAt(0).toUpperCase())}</span>
      <span class="cb-story-name">${esc(owner)}</span>
    </button>`;
  }
  async function loadStoryStrip(){
    const strip=document.getElementById('cbStoriesStrip');
    if(!strip) return;

    // Keep the already-working local/IndexedDB story as a safe fallback.
    let own=readLocalStory();
    const cached=await readIndexedStory();
    if(cached && (!own || Number(cached.createdAt||0)>=Number(own.createdAt||0))) own=cached;
    if(own?.expiresAt && Date.now()>Number(own.expiresAt)){
      own=null;sessionStory=null;localStorage.removeItem(STORY_KEY);deleteIndexedStory();
    }

    const now=Date.now();
    const me=storyUserKey();
    const pool=readStoryPool();
    Object.keys(pool).forEach(k=>{if(pool[k]?.expiresAt&&now>Number(pool[k].expiresAt))delete pool[k];});
    writeStoryPool(pool);

    // Server stories are optional. If the new backend is not mounted yet,
    // the current local Story behaviour continues unchanged.
    let serverStories=[];
    try{
      const result=await apiRequest('/stories/feed?limit=30');
      serverStories=normalizeStories(result).map(x=>({
        ...x,
        serverStory:true,
        createdAt:x?.createdAt||x?.created_at||Date.now(),
        expiresAt:x?.expiresAt||x?.expires_at||0,
        ownerKey:String(x?.ownerKey||x?.userId||x?.user_id||x?.user?.id||'').toLowerCase(),
        ownerName:x?.ownerName||x?.owner_name||storyOwner(x),
        ownerAvatar:x?.ownerAvatar||x?.owner_avatar||storyOwnerAvatar(x),
        mediaUrl:x?.mediaUrl||x?.media_url||storyMedia(x),
        text:x?.text||x?.caption||'',
        background:x?.background||x?.bg||'#6d28d9'
      })).filter(x=>!x.expiresAt||new Date(x.expiresAt).getTime()>Date.now());
    }catch(err){
      // 404 = backend not installed yet. 401 = session needs refresh.
      if(err?.status!==404 && err?.status!==401) console.warn('STORY FEED FALLBACK:',err);
    }

    // Prefer a newer server copy of the current user's Story when available.
    const serverOwn=serverStories
      .filter(x=>x?.isOwn===true || (x.ownerKey&&me&&x.ownerKey===me))
      .sort((a,b)=>new Date(b.createdAt||0)-new Date(a.createdAt||0))[0]||null;
    if(serverOwn && (!own || new Date(serverOwn.createdAt||0).getTime()>=Number(own.createdAt||0))) own=serverOwn;

    // Browser-local friend/follow Stories are kept for backwards compatibility.
    let localOthers=Object.entries(pool)
      .filter(([k,v])=>k!==me&&(!v?.expiresAt||Number(v.expiresAt)>now))
      .map(([,v])=>v);

    // Server feed is authoritative for cross-device friend/follow Stories.
    const others=serverStories.filter(x=>!(x?.isOwn===true || (x.ownerKey&&me&&x.ownerKey===me)));
    const merged=[];
    const seen=new Set();
    for(const st of [...others,...localOthers]){
      const key=String(st?.id||st?.storyId||st?.ownerKey||st?.userId||st?.user_id||Math.random());
      if(seen.has(key)) continue;
      seen.add(key);merged.push(st);
    }

    window.__cirklebookStories=merged;
    window.__cirklebookOwnStory=own||null;
    const ownPreview=own?storyMedia(own):'';
    let ownAvatar=storyAvatar();
    // A freshly loaded session may have the profile media ID in the database
    // before the local avatar cache is available. Resolve that media directly.
    if(!ownAvatar&&typeof fetchProfileData==='function'){
      try{
        const profile=await fetchProfileData();
        ownAvatar=profile?.avatarUrl||profile?.avatar_url||profile?.profileImageUrl||profile?.profile_image_url||'';
        const profileMediaId=profile?.profileMediaId||profile?.profile_media_id||'';
        if(!ownAvatar&&profileMediaId)ownAvatar=`${API_BASE_URL}/media/asset/${encodeURIComponent(profileMediaId)}`;
      }catch(_){}
    }
    const createBg=ownPreview||(!own?ownAvatar:'');
    strip.innerHTML=`<div class="cb-stories-row">
      <button type="button" class="cb-story-card cb-create-story ${own?'has-own-story':'facebook-create-story'}" id="cbCreateStoryCard" ${createBg?`style="background-image:url('${esc(createBg)}')"`:''}>
        <span class="cb-story-overlay"></span>
        <span class="cb-create-story-profile">${ownAvatar?`<img src="${esc(ownAvatar)}" alt="Profile">`:esc((storyName()||'U').charAt(0).toUpperCase())}</span>
        ${own?'':'<span class="cb-story-plus">＋</span>'}
        <span class="cb-story-name">${own?'Your story':'Create story'}</span>
      </button>
      ${merged.map(storyCard).join('')}
    </div>`;
    document.getElementById('cbCreateStoryCard')?.addEventListener('click',()=> own ? openStoryViewer(own,true) : openCreateStory());
    strip.querySelectorAll('[data-story-index]').forEach(btn=>btn.onclick=()=>openStoryViewer(merged[Number(btn.dataset.storyIndex)],false));
  }
  function openStoryViewer(story,isOwn){
    const ownStory=window.__cirklebookOwnStory||null;
    const otherStories=Array.isArray(window.__cirklebookStories)?window.__cirklebookStories:[];
    const sequence=[];
    if(ownStory) sequence.push({story:ownStory,isOwn:true});
    for(const item of otherStories) sequence.push({story:item,isOwn:false});

    const storyKey=s=>String(s?.id||s?.storyId||s?.story_id||s?.ownerKey||s?.userId||s?.user_id||'');
    let currentIndex=sequence.findIndex(item=>item.story===story || (storyKey(item.story)&&storyKey(item.story)===storyKey(story)));
    if(currentIndex<0){
      sequence.push({story,isOwn:!!isOwn});
      currentIndex=sequence.length-1;
    }

    document.getElementById('cbStoryViewerOverlay')?.remove();
    const overlay=document.createElement('div');
    overlay.id='cbStoryViewerOverlay';
    overlay.style.cssText='position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,.92);display:flex;align-items:center;justify-content:center;padding:24px';
    overlay.innerHTML=`<div id="cbStoryViewerShell" style="position:relative;width:min(520px,94vw);height:min(820px,92vh);background:#111;border-radius:14px;overflow:hidden;color:#fff;box-shadow:0 18px 60px rgba(0,0,0,.45);display:flex;flex-direction:column">
      <div id="cbStoryProgressWrap" style="display:flex;gap:4px;padding:10px 12px 4px;background:rgba(0,0,0,.78)"></div>
      <div style="height:50px;display:flex;align-items:center;justify-content:space-between;padding:0 14px;background:rgba(0,0,0,.78)">
        <b id="cbStoryViewerOwner"></b>
        <button type="button" id="cbStoryViewerClose" aria-label="Close" style="width:36px;height:36px;border:0;border-radius:50%;font-size:24px;cursor:pointer">×</button>
      </div>
      <div id="cbStoryViewerBody" class="cb-story-viewer" style="position:relative;flex:1;min-height:0;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:12px;overflow:hidden"></div>
      <button type="button" id="cbStoryPrev" aria-label="Previous story" style="position:absolute;left:10px;top:50%;transform:translateY(-50%);z-index:8;width:42px;height:42px;border:0;border-radius:50%;background:rgba(0,0,0,.48);color:#fff;font-size:28px;cursor:pointer">‹</button>
      <button type="button" id="cbStoryNext" aria-label="Next story" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);z-index:8;width:42px;height:42px;border:0;border-radius:50%;background:rgba(0,0,0,.48);color:#fff;font-size:28px;cursor:pointer">›</button>
    </div>`;
    document.body.appendChild(overlay);

    const body=overlay.querySelector('#cbStoryViewerBody');
    const ownerNode=overlay.querySelector('#cbStoryViewerOwner');
    const progressWrap=overlay.querySelector('#cbStoryProgressWrap');
    const prevBtn=overlay.querySelector('#cbStoryPrev');
    const nextBtn=overlay.querySelector('#cbStoryNext');
    let timer=null;
    let raf=0;
    let startedAt=0;
    let durationMs=5000;
    let pausedElapsed=0;
    let activeVideo=null;
    let closed=false;

    const clearPlayback=()=>{
      if(timer){clearTimeout(timer);timer=null;}
      if(raf){cancelAnimationFrame(raf);raf=0;}
      if(activeVideo){try{activeVideo.pause();}catch(_){} activeVideo=null;}
    };
    const close=()=>{
      if(closed)return;
      closed=true;
      clearPlayback();
      document.removeEventListener('keydown',onKey);
      overlay.remove();
    };
    const currentItem=()=>sequence[currentIndex]||null;
    const goNext=()=>{
      if(currentIndex<sequence.length-1){currentIndex+=1;renderCurrent();}
      else close();
    };
    const goPrev=()=>{
      if(currentIndex>0){currentIndex-=1;renderCurrent();}
    };
    const updateProgress=()=>{
      if(closed)return;
      const elapsed=activeVideo && Number.isFinite(activeVideo.currentTime)
        ? activeVideo.currentTime*1000
        : pausedElapsed+(performance.now()-startedAt);
      const pct=Math.max(0,Math.min(100,(elapsed/Math.max(durationMs,1))*100));
      const active=progressWrap.querySelector(`[data-progress-index="${currentIndex}"] > span`);
      if(active)active.style.width=`${pct}%`;
      if(pct<100)raf=requestAnimationFrame(updateProgress);
    };
    const startImageTimer=()=>{
      startedAt=performance.now();
      pausedElapsed=0;
      durationMs=5000;
      timer=setTimeout(goNext,durationMs);
      raf=requestAnimationFrame(updateProgress);
    };
    const renderProgress=()=>{
      progressWrap.innerHTML=sequence.map((_,i)=>`<div data-progress-index="${i}" style="height:3px;flex:1;background:rgba(255,255,255,.32);border-radius:999px;overflow:hidden"><span style="display:block;height:100%;width:${i<currentIndex?'100%':'0%'};background:#fff;transition:width .08s linear"></span></div>`).join('');
    };

    function renderCurrent(){
      clearPlayback();
      const item=currentItem();
      if(!item){close();return;}
      const st=item.story||{};
      const own=!!item.isOwn;
      const media=st?.mediaData||storyMedia(st);
      const text=st?.text||st?.caption||'';
      const owner=own?'Your story':storyOwner(st);
      const mime=String(st?.mime||st?.mimeType||st?.mime_type||'').toLowerCase();
      const isVideo=!!media&&(mime.startsWith('video/')||/\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(String(media)));
      ownerNode.textContent=owner;
      renderProgress();
      prevBtn.style.display=currentIndex>0?'grid':'none';
      nextBtn.style.display=currentIndex<sequence.length-1?'grid':'none';
      body.style.background=st?.background||st?.bg||'#111';
      body.innerHTML=`
        ${media?(isVideo
          ?`<video id="cbStoryActiveVideo" controls autoplay playsinline src="${esc(media)}" style="width:100%;height:100%;max-height:72vh;object-fit:contain;background:#000"></video>`
          :`<img src="${esc(media)}" alt="Story media" style="width:100%;height:100%;max-height:72vh;object-fit:contain">`):''}
        ${text?`<div class="cb-story-text" style="font-size:32px;font-weight:700;text-align:center;padding:24px;white-space:pre-wrap;position:${media?'absolute':'relative'};left:12px;right:12px;bottom:${media?'18px':'auto'};text-shadow:${media?'0 2px 8px rgba(0,0,0,.8)':'none'}">${esc(text)}</div>`:''}
        ${!media&&!text?'<div class="cb-empty-panel">This story has no displayable media.</div>':''}
        ${own?'<button type="button" id="cbDeleteStory" class="cb-action danger" style="position:absolute;right:14px;bottom:14px;z-index:9">Delete story</button>':''}
      `;

      if(isVideo){
        activeVideo=body.querySelector('#cbStoryActiveVideo');
        if(activeVideo){
          activeVideo.addEventListener('loadedmetadata',()=>{
            if(Number.isFinite(activeVideo.duration)&&activeVideo.duration>0)durationMs=activeVideo.duration*1000;
            raf=requestAnimationFrame(updateProgress);
          },{once:true});
          activeVideo.addEventListener('ended',goNext,{once:true});
          activeVideo.addEventListener('play',()=>{if(!raf)raf=requestAnimationFrame(updateProgress);});
        }
      }else{
        startImageTimer();
      }

      if(own) body.querySelector('#cbDeleteStory')?.addEventListener('click',async()=>{
        clearPlayback();
        const sid=st?.id||st?.storyId||st?.story_id||'';
        if(sid){
          try{await apiRequest(`/stories/${encodeURIComponent(sid)}`,{method:'DELETE'});}catch(err){if(err?.status!==404)console.warn('STORY DELETE FALLBACK:',err);}
        }
        try{localStorage.removeItem(STORY_KEY);}catch(_){}
        sessionStory=null;
        removeStoryFromPool();
        try{await deleteIndexedStory();}catch(_){}
        sequence.splice(currentIndex,1);
        window.__cirklebookOwnStory=null;
        if(typeof showToast==='function')showToast('Story deleted');
        try{await loadStoryStrip();}catch(_){}
        if(!sequence.length){close();return;}
        if(currentIndex>=sequence.length)currentIndex=sequence.length-1;
        renderCurrent();
      });
    }

    const onKey=e=>{
      if(e.key==='Escape')close();
      else if(e.key==='ArrowRight')goNext();
      else if(e.key==='ArrowLeft')goPrev();
    };
    document.addEventListener('keydown',onKey);
    overlay.querySelector('#cbStoryViewerClose')?.addEventListener('click',close);
    prevBtn.addEventListener('click',e=>{e.stopPropagation();goPrev();});
    nextBtn.addEventListener('click',e=>{e.stopPropagation();goNext();});
    overlay.addEventListener('click',e=>{if(e.target===overlay)close();});
    renderCurrent();
  }
  function openCreateStory(){
    const cbStoryGoHome=()=>{
      const fv=document.getElementById('featureView');
      const hl=document.getElementById('homeLayout');
      if(fv) fv.classList.add('hidden');
      if(hl) hl.classList.remove('hidden');
      document.querySelectorAll('.top-nav .nav-button').forEach(b=>b.classList.remove('active'));
      document.getElementById('topHomeBtn')?.classList.add('active');
      window.scrollTo({top:0,behavior:'smooth'});
      setTimeout(()=>{ try{ ensureStories(); loadStoryStrip(); }catch(_){} },50);
    };
    showFeature(`<div class="feature-page cb-story-create-page"><aside class="cb-story-create-sidebar"><div class="cb-story-create-title"><button id="cbStoryBack" class="cb-circle-close">←</button><div><h2>Your story</h2><p>${esc(cbName())}</p></div></div><div id="cbStorySidebarOptions" class="cb-story-sidebar-options"><div class="cb-story-instruction"><b>Create a story</b><span>Choose a photo/video story or a text story. You can edit before sharing.</span></div></div></aside><main class="cb-story-create-canvas"><div id="cbStoryChoice" class="cb-story-choice-grid"><button id="cbPhotoVideoStory" class="cb-story-choice photo"><span>🖼️</span><b>Create a photo or video story</b><small>Select media, preview it and make corrections before sharing</small></button><button id="cbTextStory" class="cb-story-choice text"><span>Aa</span><b>Create a text story</b><small>Write text and choose a background</small></button></div><div id="cbStoryEditor" class="hidden"></div><input id="cbStoryFilePicker" type="file" accept="image/*,video/*" hidden></main></div>`);
    document.getElementById('cbStoryBack').onclick=()=>cbStoryGoHome();
    const editor=document.getElementById('cbStoryEditor'),choice=document.getElementById('cbStoryChoice'),side=document.getElementById('cbStorySidebarOptions'),fileInput=document.getElementById('cbStoryFilePicker');
    let story={type:'text',text:'',bg:'#7b2ff7',mediaData:'',mime:'',fit:'contain',rotate:0,audience:'public'};
    const renderEditor=()=>{
      choice.classList.add('hidden');editor.classList.remove('hidden');
      const transform=`rotate(${story.rotate}deg)`;
      editor.innerHTML=`<div class="cb-story-edit-stage" style="background:${story.bg}">${story.mediaData?(story.mime.startsWith('video/')?`<video controls playsinline src="${story.mediaData}" style="object-fit:${story.fit};transform:${transform}"></video>`:`<img src="${story.mediaData}" alt="" style="object-fit:${story.fit};transform:${transform}">`):`<div class="cb-story-big-text">${esc(story.text||'Your story text')}</div>`}</div>`;
      side.innerHTML=`<div class="cb-story-editor-toolbar">${story.type==='media'?`<button id="cbStoryReplace" class="cb-action">Replace media</button><button id="cbStoryRemove" class="cb-action">Remove</button><button id="cbStoryRotate" class="cb-action">Rotate</button><button id="cbStoryFit" class="cb-action">${story.fit==='contain'?'Fill':'Fit'}</button>`:''}<button id="cbStoryStartOver" class="cb-action">Start over</button></div><label class="cb-story-side-label">Story text<textarea id="cbStoryCaption" rows="4" maxlength="500" placeholder="Add text">${esc(story.text)}</textarea></label>${story.type==='text'?`<div><b>Background</b><div class="cb-story-bg-picks">${['#7b2ff7','#e91e63','#1877f2','#0f766e','#111827','#f59e0b'].map(c=>`<button data-story-bg="${c}" style="background:${c}"></button>`).join('')}</div></div>`:''}<label class="cb-story-side-label">Audience<select id="cbStoryAudience"><option value="public" ${story.audience==='public'?'selected':''}>Public</option><option value="friends" ${story.audience==='friends'?'selected':''}>Friends</option></select></label><div class="cb-story-help"><b>Review before sharing</b><span>Use Replace, Remove, Rotate, Fit/Fill, text and audience controls to correct your Story.</span></div><div class="cb-story-side-actions"><button id="cbStoryCancel" class="cb-action">Cancel</button><button id="cbStoryShare" class="cb-action primary">Share to story</button></div>`;
      document.getElementById('cbStoryCaption').oninput=e=>{story.text=e.target.value;if(story.type==='text')renderEditor();};
      document.getElementById('cbStoryAudience').onchange=e=>story.audience=e.target.value;
      side.querySelectorAll('[data-story-bg]').forEach(b=>b.onclick=()=>{story.bg=b.dataset.storyBg;renderEditor();});
      if(story.type==='media'){
        document.getElementById('cbStoryReplace').onclick=()=>fileInput.click();
        document.getElementById('cbStoryRemove').onclick=()=>{story.mediaData='';story.mime='';story.type='text';renderEditor();};
        document.getElementById('cbStoryRotate').onclick=()=>{story.rotate=(story.rotate+90)%360;renderEditor();};
        document.getElementById('cbStoryFit').onclick=()=>{story.fit=story.fit==='contain'?'cover':'contain';renderEditor();};
      }
      document.getElementById('cbStoryStartOver').onclick=()=>openCreateStory();
      document.getElementById('cbStoryCancel').onclick=()=>cbStoryGoHome();
      document.getElementById('cbStoryShare').onclick=async()=>{
        if(!story.text&&!story.mediaData){showToast('Add text, a photo or a video.');return;}
        const btn=document.getElementById('cbStoryShare');
        btn.disabled=true;btn.textContent='Sharing...';
        const saved={...story,createdAt:Date.now(),expiresAt:Date.now()+86400000};
        let serverSaved=null;
        try{
          const withTimeout=(promise,label,ms=60000)=>Promise.race([
            promise,
            new Promise((_,reject)=>setTimeout(()=>reject(new Error(`${label} timed out. Please try again.`)),ms))
          ]);
          let mediaAssetId=null,mediaUrl='';
          if(story.type==='media' && story.file){
            const uploaded=await withTimeout(uploadMedia(story.file),'Story media upload');
            mediaAssetId=uploaded?.id||null;
            try{mediaUrl=typeof buildMediaUrl==='function'?buildMediaUrl(uploaded):'';}catch(_){}
            mediaUrl=mediaUrl||uploaded?.url||uploaded?.mediaUrl||uploaded?.media_url||uploaded?.publicUrl||uploaded?.public_url||'';
          }
          const result=await withTimeout(apiRequest('/stories',{method:'POST',body:JSON.stringify({
            text:story.text||'',
            caption:story.text||'',
            background:story.bg||story.background||'#7b2ff7',
            audience:story.audience||'public',
            mediaAssetId:mediaAssetId||undefined,
            mediaUrl:mediaUrl||undefined,
            mime:story.mime||undefined,
            ownerName:storyName(),
            ownerAvatar:storyAvatar()
          })}),'Story publish');
          serverSaved=result?.data?.story||result?.story||result?.data||null;
        }catch(err){
          console.error('STORY PUBLISH:',err);
          showToast(err?.message||'Unable to publish Story.');
          btn.disabled=false;
          btn.textContent='Share to story';
          return;
        }
        delete saved.file;
        if(serverSaved){
          const persistentMedia=serverSaved?.mediaUrl||serverSaved?.media_url||saved.mediaUrl||'';
          const normalized={...saved,...serverSaved,serverStory:true,
            createdAt:serverSaved?.createdAt||serverSaved?.created_at||saved.createdAt,
            expiresAt:serverSaved?.expiresAt||serverSaved?.expires_at||saved.expiresAt,
            mediaUrl:persistentMedia,
            mediaData:persistentMedia||saved.mediaData||'',
            ownerName:serverSaved?.ownerName||serverSaved?.owner_name||storyName(),
            ownerAvatar:serverSaved?.ownerAvatar||serverSaved?.owner_avatar||storyAvatar()};
          saveLocalStory(normalized);
        }else{
          showToast('Story server did not return the published Story.');
          btn.disabled=false;
          btn.textContent='Share to story';
          return;
        }
        showToast('Story shared with friends and followers');
        cbStoryGoHome();
      };
    };
    document.getElementById('cbPhotoVideoStory').onclick=()=>fileInput.click();
    fileInput.onchange=e=>{const f=e.target.files?.[0];if(!f)return;story.type='media';story.file=f;story.mime=f.type||'';story.rotate=0;story.fit='contain';const url=URL.createObjectURL(f);story.mediaData=url;if(f.type.startsWith('image/')&&f.size<=3000000){const rd=new FileReader();rd.onload=()=>{story.mediaData=rd.result;renderEditor();};rd.readAsDataURL(f);}else renderEditor();};
    document.getElementById('cbTextStory').onclick=()=>{story.type='text';story.text='';renderEditor();};
  }
  window.CirklebookOpenStoryCreator=openCreateStory;
  window.CirklebookRefreshStories=loadStoryStrip;
  function ensureStories(){
    const composer=document.querySelector('#homeLayout .feed-column .modern-composer');
    if(!composer||document.getElementById('cbStoriesStrip')) return;
    const s=document.createElement('section');
    s.id='cbStoriesStrip';s.className='card cb-stories-strip';
    composer.parentNode.insertBefore(s,composer);
    loadStoryStrip();
  }
  ensureStories();
  new MutationObserver(()=>ensureStories()).observe(document.documentElement,{childList:true,subtree:true});
  if(!document.getElementById('cbStoryTrayFinalCss')){
    const st=document.createElement('style');st.id='cbStoryTrayFinalCss';st.textContent=`
      #cbStoriesStrip{overflow:hidden;padding:8px!important;min-height:0!important}
      #cbStoriesStrip .cb-stories-row{display:flex;gap:8px;align-items:stretch;overflow-x:auto;scroll-behavior:smooth;padding:0;min-height:0}
      #cbStoriesStrip .cb-story-card{position:relative;flex:0 0 112px;width:112px;height:198px;border:0;border-radius:10px;overflow:hidden;background-size:cover;background-position:center;cursor:pointer;color:#fff}
      #cbStoriesStrip .cb-story-card-media{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0;pointer-events:none}
      #cbStoriesStrip .cb-story-video-play{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:38px;height:38px;border-radius:50%;display:grid;place-items:center;background:rgba(0,0,0,.55);color:#fff;font-size:17px;z-index:3;pointer-events:none}
      #cbStoriesStrip .cb-create-story{flex-basis:112px}
      #cbStoriesStrip .cb-story-overlay{position:absolute;inset:0;background:linear-gradient(transparent 45%,rgba(0,0,0,.72))}
      #cbStoriesStrip .cb-story-avatar,#cbStoriesStrip .cb-create-story-profile{position:absolute;left:9px;top:9px;width:34px;height:34px;border-radius:50%;overflow:hidden;border:3px solid #1877f2;background:#fff;display:grid;place-items:center;font-weight:700;color:#111;z-index:2}
      #cbStoriesStrip .cb-story-avatar img,#cbStoriesStrip .cb-create-story-profile img{width:100%;height:100%;object-fit:cover}
      #cbStoriesStrip .cb-story-name{position:absolute;left:8px;right:8px;bottom:9px;text-align:left;font-weight:700;font-size:12px;z-index:2;text-shadow:0 1px 2px #000}
      #cbStoriesStrip .cb-story-plus{z-index:3}
      #cbStoriesStrip .cb-story-card-text{position:absolute;inset:48px 8px 30px;display:grid;place-items:center;text-align:center;font-weight:800;font-size:15px;z-index:1;overflow:hidden}
      #cbStoriesStrip .cb-stories-row:has(.cb-story-card:only-child){width:max-content;max-width:100%}
    `;document.head.appendChild(st);
  }

  // ---------- Rich About page ----------
  const aboutCats=[
    ['intro','Overview'],['category','Category'],['personal_details','Personal details'],['links','Links'],
    ['communities','Communities'],['offers','Offers'],['work','Work'],['education','Education'],
    ['hobbies','Hobbies'],['interests','Interests'],['travel','Travel'],['contact_info','Contact info'],
    ['privacy_and_legal_info','Privacy and legal info'],['names','Names'],['verification_badge','Verification Badge']
  ];
  renderAbout=function(p,name,loc){
    return `<div class="cb-about-facebook">
      <aside class="cb-panel cb-about-nav"><h2>About</h2>${aboutCats.map(([k,l],i)=>`<button type="button" data-about-key="${k}" class="${i===0?'active':''}">${l}</button>`).join('')}</aside>
      <main class="cb-panel cb-about-main" id="aboutDetails"></main>
    </div>`;
  };
  bindAbout=function(p){
    const ex=getExtras();
    const labelFor=k=>(aboutCats.find(x=>x[0]===k)||[k,k])[1];
    const accountData=async()=>{
      const raw=await apiRequest('/users/me');
      return raw?.data?.data||raw?.data||raw||{};
    };
    const editAccount=(mode,account)=>{
      const profile=account.profile||{};
      const isNames=mode==='names';
      cbShowDialog(isNames?'Edit names':'Contact information',`<div class="cb-account-identity-editor">
        <p>${isNames?'Change the name and unique username shown across Cirklebook.':'Manage the mobile number and email connected to your account.'}</p>
        ${isNames?`
          <label>Display name<input id="cbIdentityDisplayName" maxlength="100" value="${esc(profile.displayName||p.displayName||p.display_name||cbName())}"></label>
          <label>Username<div class="cb-username-input"><span>@</span><input id="cbIdentityUsername" maxlength="30" value="${esc(account.username||p.username||state.currentUser?.username||'')}"></div><small>3–30 letters, numbers, dots or underscores. Every username must be unique.</small></label>`:`
          <label>Mobile number<input id="cbIdentityPhone" inputmode="tel" autocomplete="tel" placeholder="+8801XXXXXXXXX" value="${esc(account.phoneE164||account.phone_e164||'')}"></label>
          <label>Email address<input id="cbIdentityEmail" type="email" autocomplete="email" placeholder="name@example.com" value="${esc(account.email||'')}"></label>
          <small>Keep at least one mobile number or email address so you can access your account.</small>`}
        <div id="cbIdentityMessage" class="message hidden"></div>
        <div class="cb-about-actions"><button id="cbIdentityCancel" class="cb-action">Cancel</button><button id="cbIdentitySave" class="cb-action primary">Save changes</button></div>
      </div>`);
      document.getElementById('cbIdentityCancel').onclick=cbCloseDialog;
      document.getElementById('cbIdentitySave').onclick=async()=>{
        const button=document.getElementById('cbIdentitySave'),message=document.getElementById('cbIdentityMessage');
        const payload=isNames?{
          displayName:document.getElementById('cbIdentityDisplayName').value.trim(),
          username:document.getElementById('cbIdentityUsername').value.trim()
        }:{
          phoneE164:document.getElementById('cbIdentityPhone').value.trim(),
          email:document.getElementById('cbIdentityEmail').value.trim()
        };
        button.disabled=true;button.textContent='Saving…';message.classList.add('hidden');
        try{
          const response=await apiRequest('/users/me/account',{method:'PATCH',body:JSON.stringify(payload)});
          const saved=response?.data?.data||response?.data||response||{};
          if(isNames){
            p.displayName=payload.displayName;p.username=payload.username;
            if(state.currentUser){state.currentUser.username=payload.username;state.currentUser.displayName=payload.displayName;state.currentUser.display_name=payload.displayName;}
            document.querySelectorAll('#topUsername,.current-username').forEach(node=>node.textContent=payload.username);
          }
          cbCloseDialog();showToast('Account information updated');load(mode);
        }catch(error){message.textContent=error.message||'Unable to update account information.';message.classList.remove('hidden');button.disabled=false;button.textContent='Save changes';}
      };
    };
    const editLocal=(key,label,value)=>{
      const d=document.getElementById('aboutDetails');
      d.innerHTML=`<div class="cb-about-head"><div><h2>${esc(label)}</h2><p>Edit the information shown on your profile.</p></div></div>
        <textarea id="cbAboutEditField" rows="6" placeholder="Add ${esc(label.toLowerCase())}">${esc(value||'')}</textarea>
        <div class="cb-about-actions"><button id="cbAboutCancel" class="cb-action">Cancel</button><button id="cbAboutSave" class="cb-action primary">Save</button></div>
        <div id="cbAboutMsg" class="message hidden"></div>`;
      document.getElementById('cbAboutCancel').onclick=()=>load(key);
      document.getElementById('cbAboutSave').onclick=async()=>{
        const val=document.getElementById('cbAboutEditField').value.trim(),m=document.getElementById('cbAboutMsg');
        try{
          if(key==='intro'){
            await apiRequest('/users/me/profile',{method:'PATCH',body:JSON.stringify({bio:val})});
            p.bio=val;
          }else{
            const x=getExtras();x[key]=val;saveExtras(x);
          }
          m.textContent='Saved.';m.classList.remove('hidden');setTimeout(()=>load(key),250);
        }catch(err){m.textContent=err.message||'Unable to save.';m.classList.remove('hidden');}
      };
    };
    const load=(key)=>{
      document.querySelectorAll('[data-about-key]').forEach(b=>b.classList.toggle('active',b.dataset.aboutKey===key));
      const d=document.getElementById('aboutDetails'); if(!d)return;
      const x=getExtras(), label=labelFor(key);
      if(key==='verification_badge'){
        d.innerHTML=`<div class="cb-about-head"><div><h2>Verification Badge</h2><p>Identity verification and account authenticity.</p></div><button id="cbAboutVerify" class="cb-action primary">Get Verified</button></div>
          <div class="cb-about-info-card"><b>Eligibility</b><p>Complete profile · NID/Birth Certificate/Passport · Live identity check · ৳450/month · Admin review</p><b>Verified benefits</b><p>Badge · Identity trust · Priority review/support · Impersonation protection · Advanced creator/business tools · Monetization/ads trust advantages</p><b>Verification types</b><p>Personal · Creator · Business · Organization</p></div>`;
        document.getElementById('cbAboutVerify').onclick=openVerification;return;
      }
      if(key==='names'){
        d.innerHTML='<div class="cb-empty-panel">Loading names…</div>';
        accountData().then(account=>{
          const profile=account.profile||{};
          d.innerHTML=`<div class="cb-about-head"><div><h2>Names</h2><p>Names associated with your account.</p></div><button id="cbAboutEditNames" class="cb-action">Edit</button></div>
            <div class="cb-about-info-card"><div><b>Display name</b><span>${esc(profile.displayName||p.displayName||p.display_name||cbName())}</span></div><div><b>Username</b><span>@${esc(account.username||p.username||state.currentUser?.username||'')}</span></div></div>`;
          document.getElementById('cbAboutEditNames').onclick=()=>editAccount('names',account);
        }).catch(error=>{d.innerHTML=`<div class="cb-empty-panel">${esc(error.message||'Unable to load names.')}</div>`;});return;
      }
      if(key==='contact_info'){
        d.innerHTML='<div class="cb-empty-panel">Loading contact information…</div>';
        accountData().then(account=>{
          d.innerHTML=`<div class="cb-about-head"><div><h2>Contact info</h2><p>Manage the contact information connected to your account.</p></div><button id="cbAboutEditContact" class="cb-action">Edit</button></div>
            <div class="cb-about-info-card"><div><b>Mobile</b><span>${esc(account.phoneE164||account.phone_e164||'Not added')}</span></div><div><b>Email</b><span>${esc(account.email||'Not added')}</span></div></div>`;
          document.getElementById('cbAboutEditContact').onclick=()=>editAccount('contact_info',account);
        }).catch(error=>{d.innerHTML=`<div class="cb-empty-panel">${esc(error.message||'Unable to load contact information.')}</div>`;});return;
      }
      if(key==='personal_details'){
        const dob=(p.dateOfBirth||p.date_of_birth||'').slice?.(0,10)||'Not added';
        d.innerHTML=`<div class="cb-about-head"><div><h2>Personal details</h2><p>Basic information about you.</p></div><button id="cbAboutEdit" class="cb-action">Edit</button></div>
          <div class="cb-about-info-card"><div><b>Lives in</b><span>${esc(p.locationText||p.location_text||x.location||'Not added')}</span></div><div><b>Date of birth</b><span>${esc(dob)}</span></div></div>`;
        document.getElementById('cbAboutEdit').onclick=()=>openProfileEditor(p);return;
      }
      const value=key==='intro'?(p.bio||x.bio||''):x[key]||'';
      d.innerHTML=`<div class="cb-about-head"><div><h2>${esc(label)}</h2><p>${value?'Information shown on your profile.':'Nothing added yet.'}</p></div><button id="cbAboutEdit" class="cb-action">${value?'Edit':'Add'}</button></div>
        <div class="cb-about-info-card">${value?`<p>${esc(value).replace(/\n/g,'<br>')}</p>`:`<div class="cb-empty-panel">Add ${esc(label.toLowerCase())} to your profile.</div>`}</div>`;
      document.getElementById('cbAboutEdit').onclick=()=>editLocal(key,label,value);
    };
    document.querySelectorAll('[data-about-key]').forEach(b=>b.onclick=()=>load(b.dataset.aboutKey));
    load('intro');
  };

  // ---------- Facebook-inspired Edit Profile ----------
  openProfileEditor=function(p){
    const x=getExtras();
    const name=p.displayName||p.display_name||cbName();
    const dob=(p.dateOfBirth||p.date_of_birth||'').slice?.(0,10)||'';
    cbShowDialog('Edit Profile',`<div class="cb-edit-profile-facebook">
      <section class="cb-edit-row"><div><h3>Profile picture</h3><p>Choose the photo people see across Cirklebook.</p></div><button id="cbEditAvatar" class="cb-action">Edit</button></section>
      <section class="cb-edit-row"><div><h3>Cover photo</h3><p>Customize the top of your profile.</p></div><button id="cbEditCover" class="cb-action">Edit</button></section>
      <section class="cb-edit-section"><div class="cb-edit-head"><h3>Bio</h3></div><textarea id="epBio" rows="3" maxlength="160">${esc(p.bio||x.bio||'')}</textarea></section>
      <section class="cb-edit-section"><div class="cb-edit-head"><h3>Customize your intro</h3></div>
        <label>Display name<input id="epName" value="${esc(name)}"></label>
        <label>Username<div class="cb-username-input"><span>@</span><input id="epUsername" maxlength="30" value="${esc(p.username||state.currentUser?.username||'')}"></div><small>Username must be unique.</small></label>
        <label>Website<input id="epWebsite" value="${esc(p.website||'')}"></label>
        <label>Location<input id="epLocation" value="${esc(p.locationText||p.location_text||x.location||'')}"></label>
        <label>Date of birth<input id="epDob" type="date" value="${esc(dob)}"></label>
      </section>
      ${[['work','Work'],['education','Education'],['links','Links'],['hobbies','Hobbies'],['interests','Interests']].map(([k,l])=>`<section class="cb-edit-section"><div class="cb-edit-head"><h3>${l}</h3></div><textarea data-extra-key="${k}" rows="2" placeholder="Add ${l.toLowerCase()}">${esc(x[k]||'')}</textarea></section>`).join('')}
      <section class="cb-edit-row"><div><h3>Verification Badge</h3><p>Personal, Creator, Business or Organization verification.</p></div><button id="cbEditVerify" class="cb-action">View</button></section>
      <div id="epMsg" class="message hidden"></div>
      <button id="cbSaveFullProfile" class="primary-button">Save changes</button>
    </div>`);
    document.getElementById('cbEditAvatar').onclick=()=>{cbCloseDialog();document.getElementById('profileAvatarInput')?.click()};
    document.getElementById('cbEditCover').onclick=()=>{cbCloseDialog();document.getElementById('profileCoverInput')?.click()};
    document.getElementById('cbEditVerify').onclick=()=>{cbCloseDialog();openVerification()};
    document.getElementById('cbSaveFullProfile').onclick=async()=>{
      const msg=document.getElementById('epMsg');
      const payload={
        displayName:document.getElementById('epName').value.trim(),
        bio:document.getElementById('epBio').value.trim(),
        website:document.getElementById('epWebsite').value.trim(),
        locationText:document.getElementById('epLocation').value.trim(),
        dateOfBirth:document.getElementById('epDob').value||null
      };
      try{
        const username=document.getElementById('epUsername').value.trim();
        await apiRequest('/users/me/account',{method:'PATCH',body:JSON.stringify({displayName:payload.displayName,username})});
        await apiRequest('/users/me/profile',{method:'PATCH',body:JSON.stringify(payload)});
        if(state.currentUser){state.currentUser.username=username;state.currentUser.displayName=payload.displayName;state.currentUser.display_name=payload.displayName;}
        const ex2=getExtras();ex2.bio=payload.bio;ex2.location=payload.locationText;
        document.querySelectorAll('[data-extra-key]').forEach(t=>ex2[t.dataset.extraKey]=t.value.trim());
        saveExtras(ex2);
        cbCloseDialog();
        if(window.CirklebookProfile?.open) window.CirklebookProfile.open('about'); else openProfilePage('about');
        showToast('Profile updated');
      }catch(err){msg.textContent=err.message||'Unable to update profile.';msg.classList.remove('hidden');}
    };
  };

  window.openProfileEditor = openProfileEditor;
  // ---------- Full Friends page ----------
  openFriendsFull=function(section='friends'){
    showFeature(`<div class="feature-page cb-friends-facebook">
      <aside class="cb-panel cb-friends-nav">
        <h2>Friends</h2>
        ${[['friends','👥','Home'],['incoming','👤','Friend requests'],['find','➕','Find friends'],['recent','🕘','Recently added'],['birthdays','🎂','Birthdays'],['city','📍','Current city'],['hometown','🏠','Hometown'],['followers','⭐','Followers'],['following','✓','Following']].map(([k,i,l])=>`<button data-friend-view="${k}" class="${section===k?'active':''}"><span>${i}</span>${l}</button>`).join('')}
      </aside>
      <main class="cb-panel cb-friends-main">
        <div class="cb-friends-head"><div><h2 id="friendsTitle">Friends</h2><p id="friendsSubtitle">Manage your connections.</p></div><input id="friendSearch" class="cb-search" placeholder="Search friends"></div>
        <div id="friendsFullBody"><div class="cb-empty-panel">Loading…</div></div>
      </main>
    </div>`);
    featureView.querySelectorAll('[data-friend-view]').forEach(b=>b.onclick=()=>openFriendsFull(b.dataset.friendView));
    loadFriendsFull(section);
  };
  loadFriendsFull=async function(section){
    const body=document.getElementById('friendsFullBody'),title=document.getElementById('friendsTitle'),sub=document.getElementById('friendsSubtitle');
    if(!body)return;
    const titles={friends:'Friends',incoming:'Friend requests',find:'Find friends',recent:'Recently added',birthdays:'Birthdays',city:'Current city',hometown:'Hometown',followers:'Followers',following:'Following'};
    title.textContent=titles[section]||'Friends';
    sub.textContent=section==='incoming'?'Review people who want to connect with you.':section==='followers'?'People who follow your public updates.':section==='following'?'People you follow.':'Manage your connections and discover people.';
    try{
      let arr=[];
      if(['friends','recent','birthdays','city','hometown'].includes(section)){
        const r=await apiRequest('/friends');arr=r?.data?.friends||r?.friends||r?.data||[];
      }else if(section==='incoming'){
        const r=await apiRequest('/friends/requests/incoming');arr=r?.data?.requests||r?.requests||r?.data||[];
      }else if(section==='followers'||section==='following'){
        const endpoints=section==='followers'
          ? ['/follows/followers','/users/me/followers','/me/followers','/followers']
          : ['/follows/following','/users/me/following','/me/following','/following'];

        let loaded=false,lastErr=null;
        for(const ep of endpoints){
          try{
            const r=await apiRequest(ep);
            const d=r?.data??r??{};
            const list=d?.users??d?.followers??d?.following??d?.items??d?.results??(Array.isArray(d)?d:null);
            if(Array.isArray(list)){arr=list;loaded=true;break;}
          }catch(err){lastErr=err;}
        }

        if(!loaded && section==='following'){
          try{
            const fr=await apiRequest('/friends');
            const list=fr?.data?.friends||fr?.friends||fr?.data||[];
            const checked=await Promise.all((Array.isArray(list)?list:[]).map(async z=>{
              const uid=z.userId||z.user_id||z.friendId||z.friend_id||z.user?.id||z.id||'';
              if(!uid)return null;
              try{
                const sr=await apiRequest(`/follows/${encodeURIComponent(uid)}/status`);
                const sd=sr?.data||sr||{};
                const yes=Boolean(sd.isFollowing||sd.following||sd.is_following||sd.status==='accepted'||sd.status==='active'||sd.status==='following');
                return yes?z:null;
              }catch(_){return null;}
            }));
            arr=checked.filter(Boolean);
            loaded=true;
          }catch(err){lastErr=err;}
        }

        if(!loaded){
          console.warn('FOLLOW LIST ROUTE unavailable:',lastErr?.message||lastErr);
          arr=[];
        }
      }else{
        body.innerHTML=`<div class="cb-friend-discovery"><div class="cb-empty-panel"><b>Find friends</b><br>Use the Cirklebook search bar above to search for people. Friend suggestions will appear here when a people-suggestions API is connected.</div></div>`;return;
      }
      const norm=(z)=>({
        id:z.userId||z.user_id||z.friendId||z.friend_id||z.user?.id||z.id||'',
        requestId:z.requestId||z.request_id||z.id||'',
        name:z.displayName||z.display_name||z.name||z.user?.displayName||z.user?.display_name||z.user?.username||z.username||'Cirklebook user',
        username:z.username||z.user?.username||'',
        avatar:z.avatarUrl||z.avatar_url||z.user?.avatarUrl||z.user?.avatar_url||'',
        location:z.locationText||z.location_text||z.user?.locationText||z.user?.location_text||''
      });
      let people=(Array.isArray(arr)?arr:[]).map(norm);
      if(section==='city') people=people.filter(p=>p.location);
      if(section==='hometown') people=people.filter(p=>p.location);
      body.innerHTML=people.length?`<div class="cb-friend-card-grid">${people.map(p=>`<article class="cb-friend-card" data-person="${esc((p.name+' '+p.username).toLowerCase())}">
        <div class="cb-friend-photo">${p.avatar?`<img src="${esc(p.avatar)}" alt="">`:`<span>${esc(p.name.charAt(0).toUpperCase())}</span>`}</div>
        <div class="cb-friend-card-body"><h3>${esc(p.name)}</h3><p>${p.username?'@'+esc(p.username):esc(p.location||'Cirklebook')}</p>
        <div class="cb-friend-actions">
          ${section==='incoming'?`<button class="cb-action primary" data-accept-request="${esc(p.requestId)}">Confirm</button><button class="cb-action" data-decline-request="${esc(p.requestId)}">Delete</button>`
          :section==='friends'?`<button class="cb-action" data-unfriend="${esc(p.id)}">Unfriend</button>`
          :`<button class="cb-action primary">View profile</button>`}
        </div></div></article>`).join('')}</div>`:'<div class="cb-empty-panel">No people found in this section.</div>';
      const search=document.getElementById('friendSearch');
      search.oninput=()=>{const q=search.value.trim().toLowerCase();body.querySelectorAll('[data-person]').forEach(c=>c.hidden=q&&!c.dataset.person.includes(q))};
      body.querySelectorAll('[data-accept-request]').forEach(b=>b.onclick=async()=>{try{await apiRequest(`/friends/requests/${encodeURIComponent(b.dataset.acceptRequest)}/accept`,{method:'POST'});showToast('Friend request accepted');loadFriendsFull('incoming')}catch(e){showToast(e.message)}});
      body.querySelectorAll('[data-decline-request]').forEach(b=>b.onclick=async()=>{try{await apiRequest(`/friends/requests/${encodeURIComponent(b.dataset.declineRequest)}/decline`,{method:'POST'});showToast('Friend request deleted');loadFriendsFull('incoming')}catch(e){showToast(e.message)}});
      body.querySelectorAll('[data-unfriend]').forEach(b=>b.onclick=async()=>{try{await apiRequest(`/friends/${encodeURIComponent(b.dataset.unfriend)}`,{method:'DELETE'});showToast('Friend removed');loadFriendsFull('friends')}catch(e){showToast(e.message)}});
    }catch(e){body.innerHTML=`<div class="cb-empty-panel">${esc(e.message||'Unable to load friends.')}</div>`}
  };

  // ---------- Full Settings page ----------
  openSettings=function(section='account'){
    const items=[
      ['account','👤','Account'],['security','🔐','Security & Login'],['privacy','🛡️','Privacy'],['2fa','🔑','Two-factor authentication'],
      ['blocking','⛔','Blocking'],['language','🌐','Language'],['notifications','🔔','Notifications'],['sessions','💻','Audit & Sessions']
    ];
    showFeature(`<div class="feature-page cb-settings-facebook">
      <aside class="cb-panel cb-settings-nav">
        <h2>Settings & privacy</h2>
        <input id="cbSettingsSearch" class="cb-search" placeholder="Search settings">
        <div class="cb-settings-account-card"><span class="avatar">${esc((state?.currentUser?.username||'U').charAt(0).toUpperCase())}</span><div><b>${esc(cbName())}</b><small>Account settings</small></div></div>
        ${items.map(([k,i,l])=>`<button data-settings="${k}" class="${section===k?'active':''}"><span>${i}</span><div><b>${l}</b><small>${k==='security'?'Password and login security':k==='privacy'?'Control who can see your information':k==='sessions'?'Where you are logged in':'Manage '+l.toLowerCase()}</small></div><em>›</em></button>`).join('')}
      </aside>
      <main id="settingsBody" class="cb-settings-main"></main>
    </div>`);
    const nav=featureView.querySelector('.cb-settings-nav');
    nav.querySelectorAll('[data-settings]').forEach(b=>b.onclick=()=>{
      nav.querySelectorAll('[data-settings]').forEach(x=>x.classList.toggle('active',x===b));
      renderSettingsSection(b.dataset.settings);
    });
    document.getElementById('cbSettingsSearch').oninput=e=>{
      const q=e.target.value.toLowerCase();nav.querySelectorAll('[data-settings]').forEach(b=>b.hidden=q&&!b.textContent.toLowerCase().includes(q));
    };
    renderSettingsSection(section);
  };

  // Refresh stories after returning home.
  document.addEventListener('click',e=>{
    if(e.target.closest('#topHomeBtn,#brandHomeButton')) setTimeout(()=>{ensureStories();loadStoryStrip()},50);
  },true);

  console.log('CIRKLEBOOK FINAL CONSOLIDATED UX READY');
})();


// Robust Page/Group media-button click bridge.
// Capture phase is intentional so preview overlays cannot swallow these clicks.
document.addEventListener('click', function(event){
  const target = event.target.closest('#pageLogoBtn,#pagePreviewLogoEdit,#pageCoverBtn,#pagePreviewCoverEdit,#managePageLogoBtn,#groupLogoBtn,#groupPreviewLogoEdit,#groupCoverBtn,#groupPreviewCoverEdit,#manageGroupLogoBtn');
  if(!target) return;
  event.preventDefault();
  event.stopPropagation();
  const map={
    pageLogoBtn:'pageLogoInput',
    pagePreviewLogoEdit:'pageLogoInput',
    pageCoverBtn:'pageCoverInput',
    pagePreviewCoverEdit:'pageCoverInput',
    managePageLogoBtn:'managePageLogoInput',
    groupLogoBtn:'groupLogoInput',
    groupPreviewLogoEdit:'groupLogoInput',
    groupCoverBtn:'groupCoverInput',
    groupPreviewCoverEdit:'groupCoverInput',
    manageGroupLogoBtn:'manageGroupLogoInput'
  };
  document.getElementById(map[target.id])?.click();
}, true);



// Shared renderer for late interaction patches (Reel / Settings / Ads / Help).
// Earlier showFeature was private to another IIFE, which caused runtime ReferenceError.
window.CirklebookShowFeature = window.CirklebookShowFeature || function(html, topId=''){
  const home=document.getElementById('homeLayout');
  const view=document.getElementById('featureView');
  if(!view) return;
  if(home) home.classList.add('hidden');
  view.innerHTML=html;
  view.classList.remove('hidden');
  if(topId && typeof window.activateTop==='function') window.activateTop(topId);
  window.scrollTo({top:0,behavior:'auto'});
};

/* =========================================================
   CIRKLEBOOK — FINAL NON-DESTRUCTIVE INTERACTION PATCH
   2026-09-09
   Fixes only the user-tested interaction gaps:
   Story creator, Reel tools/share, Page/Group media controls,
   Page Manage / Group View, Settings/Help, Sponsored navigation.
   Existing auth/feed/post/profile/media APIs are preserved.
========================================================= */
(function cirklebookFinalInteractionPatch(){
  'use strict';
  const showFeature = window.CirklebookShowFeature;

  const q = (id) => document.getElementById(id);
  const esc2 = (v='') => (typeof cbEscape === 'function'
    ? cbEscape(String(v))
    : String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])));

  function toast(msg){
    if(typeof showToast === 'function') showToast(msg);
    else console.log(msg);
  }

  /* ---------- Small CSS patch; no styles.css replacement required ---------- */
  if(!document.getElementById('cbFinalInteractionPatchStyles')){
    const style=document.createElement('style');
    style.id='cbFinalInteractionPatchStyles';
    style.textContent=`
      .cb-settings-final{display:grid;grid-template-columns:330px minmax(0,1fr);gap:16px;max-width:1050px;margin:0 auto;padding:14px}
      .cb-settings-final .cb-settings-nav{position:sticky;top:80px;align-self:start;max-height:calc(100vh - 100px);overflow:auto}
      .cb-settings-final .cb-settings-main{min-height:520px}
      .cb-settings-final .cb-settings-nav button{width:100%;display:flex;align-items:center;gap:12px;text-align:left;border:0;background:transparent;padding:12px;border-radius:10px;cursor:pointer}
      .cb-settings-final .cb-settings-nav button.active,.cb-settings-final .cb-settings-nav button:hover{background:#e7f3ff}
      .cb-settings-final .cb-settings-nav button span{font-size:20px;width:28px;text-align:center}
      .cb-settings-final .cb-settings-nav button div{display:flex;flex-direction:column;min-width:0}
      .cb-settings-final .cb-settings-nav button small{color:#65676b;font-weight:400}
      .cb-help-final{display:grid;gap:8px}
      .cb-help-final button{border:0;border-radius:10px;background:#f0f2f5;padding:13px;text-align:left;cursor:pointer}
      .cb-help-final button:hover{background:#e4e6eb}
      .cb-help-final button b,.cb-help-final button small{display:block}
      .cb-help-final button small{margin-top:3px;color:#65676b}
      .cb-reel-tool.active{background:#e7f3ff;color:#1877f2}
      .cb-reel-tool-note{font-size:12px;color:#65676b;margin:-4px 0 8px 2px}
      .cb-reel-group-option{display:flex;align-items:center;gap:9px;padding:9px 6px;border-bottom:1px solid #eee}
      .cb-reel-final-note{padding:9px 10px;border-radius:8px;background:#f0f2f5;font-size:12px;color:#4b4f56;margin:8px 0}
      .cb-sponsored-head{display:flex;align-items:center;justify-content:space-between;gap:8px}
      .cb-sponsored-manage{border:0;background:transparent;color:#1877f2;font-weight:700;cursor:pointer;padding:4px 0}
      .ad-box.cb-ad-clickable{cursor:pointer;position:relative;overflow:hidden}
      .ad-box.cb-ad-clickable:hover{outline:2px solid #d9e8ff}
      .cb-ad-card-inner{width:100%;height:100%;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;gap:5px;padding:10px}
      .cb-ad-card-inner img{width:100%;height:75px;object-fit:cover;border-radius:7px}
      .cb-ad-card-inner small{color:#65676b}
      .cb-ad-manager-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
      .cb-ad-slot-editor{border:1px solid #ddd;border-radius:12px;padding:12px}
      .cb-ad-slot-editor label{display:grid;gap:5px;margin:8px 0;font-weight:600}
      .cb-ad-slot-editor input,.cb-ad-slot-editor textarea,.cb-ad-slot-editor select{width:100%;padding:9px;border:1px solid #ccd0d5;border-radius:8px}
      .cb-local-group-share{border-top:1px solid #e5e7eb;margin-top:12px;padding-top:12px}
      .cb-local-group-share-card{border:1px solid #e5e7eb;border-radius:10px;padding:10px;margin-top:8px}
      @media(max-width:800px){.cb-settings-final{grid-template-columns:1fr}.cb-settings-final .cb-settings-nav{position:static}.cb-ad-manager-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  /* ---------- Story: always make Create Story open reliably ---------- */
  document.addEventListener('click', function(e){
    const card=e.target.closest('#cbCreateStoryCard,.cb-create-story');
    if(!card || typeof window.CirklebookOpenStoryCreator!=='function') return;
    // If a local story already exists, allow the card's own click handler
    // to open the Story viewer instead of forcing the creator screen.
    const label=(card.querySelector('.cb-story-name')?.textContent||'').trim().toLowerCase();
    if(label==='your story') return;
    e.preventDefault();
    e.stopImmediatePropagation();
    window.CirklebookOpenStoryCreator();
  }, true);

  /* ---------- Page Manage / Group View: delegation survives re-render ---------- */
  document.addEventListener('click',function(e){
    const p=e.target.closest('[data-page-manage-index]');
    if(p && typeof openPageManager==='function'){
      const item=window.__cirklebookPageList?.[Number(p.dataset.pageManageIndex)];
      if(item){
        e.preventDefault(); e.stopImmediatePropagation();
        openPageManager(item);
        return;
      }
    }
    const g=e.target.closest('[data-group-action-index]');
    if(g && typeof openGroupManager==='function'){
      const item=window.__cirklebookGroupList?.[Number(g.dataset.groupActionIndex)];
      const isJoin=(g.textContent||'').trim().toLowerCase()==='join';
      if(item && !isJoin){
        e.preventDefault(); e.stopImmediatePropagation();
        openGroupManager(item);
      }
    }
  },true);

  /* ---------- Local group-share preview helpers ---------- */
  function groupShareKey(id){return `cirklebook_group_shared_posts_${id}`;}
  function readGroupShares(id){
    try{const a=JSON.parse(localStorage.getItem(groupShareKey(id))||'[]');return Array.isArray(a)?a:[];}catch(_){return [];}
  }
  function saveGroupShare(id,entry){
    if(!id) return;
    const a=readGroupShares(id);
    if(!a.some(x=>String(x.postId)===String(entry.postId))) a.unshift(entry);
    try{localStorage.setItem(groupShareKey(id),JSON.stringify(a.slice(0,30)));}catch(_){}
  }

  if(typeof openGroupManager==='function'){
    const baseOpenGroupManager=openGroupManager;
    openGroupManager=function(group={}){
      baseOpenGroupManager(group);
      requestAnimationFrame(()=>{
        const id=group.id||group.groupId||group.group_id||group.name||'draft';
        const shares=readGroupShares(id);
        if(!shares.length) return;
        const main=document.querySelector('.cb-entity-manager .cb-entity-manager-grid main');
        if(!main || main.querySelector('.cb-local-group-share')) return;
        const section=document.createElement('section');
        section.className='cb-local-group-share';
        section.innerHTML=`<h3>Shared posts & reels</h3>${shares.map(s=>`<article class="cb-local-group-share-card">
          <b>${esc2(s.title||'Shared reel/post')}</b>
          ${s.caption?`<p>${esc2(s.caption)}</p>`:''}
          ${s.mediaUrl?`<video src="${esc2(s.mediaUrl)}" controls playsinline style="width:100%;max-height:260px;background:#111;border-radius:8px"></video>`:''}
          <small>Shared ${esc2(new Date(s.createdAt||Date.now()).toLocaleString())}</small>
        </article>`).join('')}`;
        main.appendChild(section);
      });
    };
  }

  async function postToStory(createdPost, uploadedMedia, settings){
    const postId=createdPost?.data?.post?.id||createdPost?.data?.id||createdPost?.post?.id||createdPost?.id||'';
    const m=uploadedMedia?.find(x=>(x?.media_type||x?.mediaType)==='video')||uploadedMedia?.[0]||{};
    let mediaUrl='';
    try{mediaUrl=typeof buildMediaUrl==='function'?buildMediaUrl(m):'';}catch(_){}
    mediaUrl=mediaUrl||m.url||m.mediaUrl||m.media_url||m.publicUrl||m.public_url||m.signed_url||'';
    const story={
      type:'media',
      text:settings.caption||settings.title||'',
      mediaUrl,
      mime:(m?.mime_type||m?.mimeType||'video/mp4'),
      audience:settings.audience||'public',
      postId,
      createdAt:Date.now(),
      expiresAt:Date.now()+86400000
    };
    try{localStorage.setItem('cirklebook_local_story_v1',JSON.stringify(story));}catch(_){}
    // Use server story support if it exists; local story remains the safe fallback.
    try{
      await apiRequest('/stories',{method:'POST',body:JSON.stringify({
        postId:postId||undefined,
        mediaAssetId:m?.id||undefined,
        caption:story.text,
        audience:story.audience
      })});
    }catch(err){
      if(err?.status!==404 && err?.status!==405) console.warn('STORY SHARE FALLBACK:',err);
    }
    try{window.CirklebookRefreshStories?.();}catch(_){}
    return story;
  }

  async function postToGroup(groupId,postId,entry){
    const attempts=[
      [`/groups/${encodeURIComponent(groupId)}/share`,{postId}],
      [typeof ROUTES!=='undefined'&&ROUTES.share?ROUTES.share(postId):`/shares/${encodeURIComponent(postId)}/share`,{groupId}]
    ];
    let last=null;
    for(const [path,body] of attempts){
      try{
        await apiRequest(path,{method:'POST',body:JSON.stringify(body)});
        saveGroupShare(groupId,entry);
        return true;
      }catch(err){
        last=err;
        if(err?.status!==404 && err?.status!==405 && err?.status!==400) break;
      }
    }
    // Keep the user's selected group-share visible locally instead of silently doing nothing.
    saveGroupShare(groupId,{...entry,localFallback:true});
    console.warn('GROUP SHARE API NOT AVAILABLE; LOCAL PREVIEW SAVED',last);
    return false;
  }

  /* ---------- Reel editor: make every left-side control interactive ---------- */
  function reelToolDialog(title,body,onSave){
    if(typeof cbShowDialog!=='function') return;
    cbShowDialog(title,`<div class="cb-form-grid">${body}<button id="cbReelToolSave" class="primary-button">Save</button></div>`);
    q('cbReelToolSave')?.addEventListener('click',()=>{
      onSave?.();
      if(typeof cbCloseDialog==='function') cbCloseDialog();
      toast(`${title} saved`);
    });
  }

  // Replace only the reel editor functions; publishing pipeline remains publishPost().
  window.__cbReelToolState=window.__cbReelToolState||{trimStart:'',trimEnd:'',captions:'',audioDescription:'',transcript:'',collaborators:''};

  window.CirklebookOpenReelEditor=function(){
    const files=Array.isArray(state.selectedFiles)?state.selectedFiles:[],video=files.find(f=>f?.type?.startsWith('video/'));
    const idx=files.indexOf(video);
    const preview=(Array.isArray(state.previewUrls)?state.previewUrls:[])[idx]||state.previewUrl||'';
    if(!video){openPostModal(true);return;}
    dom.postModal?.classList.add('hidden');
    document.body.style.overflow='';
    showFeature(`<div class="feature-page cb-reel-editor-page"><div class="cb-reel-editor-shell">
      <aside class="cb-reel-edit-sidebar">
        <div class="cb-reel-editor-title"><button id="reelBackToPost" class="cb-circle-close">←</button><h2>Edit reel</h2></div>
        <label>Reel title<input id="reelTitle" maxlength="120" placeholder="Reel title"></label>
        <label>Caption<textarea id="reelCaption" rows="5" maxlength="2200" placeholder="Describe your reel…">${esc2(dom.postBody?.value||'')}</textarea></label>
        <label>Tags<input id="reelTags" placeholder="Add tags"></label>
        <button id="cbTrimVideo" class="cb-reel-tool">✂ Trim video <span>›</span></button>
        <button id="cbCaptions" class="cb-reel-tool">CC Closed captions <span>›</span></button>
        <button id="cbAudioDescription" class="cb-reel-tool">🔊 Audio descriptions <span>›</span></button>
        <button id="cbTranscript" class="cb-reel-tool">≡ Text transcripts <span>›</span></button>
        <div class="cb-reel-tool-note"><b>Reel limit: 60 seconds maximum.</b> Long video upload is temporarily unavailable. Editing choices are kept with this reel draft before publication.</div>
        <button id="reelNext" class="primary-button">Next</button>
      </aside>
      <main class="cb-reel-preview-area"><video controls playsinline src="${esc2(preview)}"></video></main>
    </div></div>`);

    q('reelBackToPost').onclick=()=>{showHome();openPostModal(false);};
    q('cbTrimVideo').onclick=()=>reelToolDialog('Trim video',`
      <label>Start time (seconds)<input id="cbTrimStart" type="number" min="0" step="0.1" value="${esc2(window.__cbReelToolState.trimStart)}"></label>
      <label>End time (seconds)<input id="cbTrimEnd" type="number" min="0" step="0.1" value="${esc2(window.__cbReelToolState.trimEnd)}"></label>
      <small>These trim points are stored with the draft. Server-side transcoding can apply them when the video-processing endpoint supports trimming.</small>`,
      ()=>{window.__cbReelToolState.trimStart=q('cbTrimStart').value;window.__cbReelToolState.trimEnd=q('cbTrimEnd').value;});
    q('cbCaptions').onclick=()=>reelToolDialog('Closed captions',`
      <label>Caption text / subtitle notes<textarea id="cbCaptionText" rows="7" placeholder="Add captions">${esc2(window.__cbReelToolState.captions)}</textarea></label>`,
      ()=>window.__cbReelToolState.captions=q('cbCaptionText').value.trim());
    q('cbAudioDescription').onclick=()=>reelToolDialog('Audio descriptions',`
      <label>Audio description script<textarea id="cbAudioDescriptionText" rows="7" placeholder="Describe visual details for accessibility">${esc2(window.__cbReelToolState.audioDescription)}</textarea></label>`,
      ()=>window.__cbReelToolState.audioDescription=q('cbAudioDescriptionText').value.trim());
    q('cbTranscript').onclick=()=>reelToolDialog('Text transcripts',`
      <label>Transcript<textarea id="cbTranscriptText" rows="9" placeholder="Add or correct transcript">${esc2(window.__cbReelToolState.transcript)}</textarea></label>`,
      ()=>window.__cbReelToolState.transcript=q('cbTranscriptText').value.trim());
    q('reelNext').onclick=()=>window.CirklebookOpenReelSettings({
      title:q('reelTitle').value.trim(),
      caption:q('reelCaption').value.trim(),
      tags:q('reelTags').value.trim(),
      preview,
      tools:{...window.__cbReelToolState}
    });
  };

  window.CirklebookOpenReelSettings=async function(draft){
    showFeature(`<div class="feature-page cb-reel-editor-page"><div class="cb-reel-editor-shell">
      <aside class="cb-reel-edit-sidebar">
        <div class="cb-reel-editor-title"><button id="reelSettingsBack" class="cb-circle-close">←</button><h2>Reel settings</h2></div>
        <label>Describe your reel<textarea id="reelSettingsCaption" rows="5">${esc2(draft.caption||'')}</textarea></label>
        <div class="cb-reel-setting-row"><div><b>Post audience</b><small>Choose who can see your reel</small></div><select id="reelAudience"><option value="public">Public</option><option value="friends">Friends</option></select></div>
        <div class="cb-reel-setting-row"><div><b>Add AI label</b><small>Label realistic AI-generated content when applicable</small></div><input id="reelAiLabel" type="checkbox"></div>
        <div class="cb-reel-setting-row"><div><b>Remixing and use of original audio</b><small>Allow others to reuse your original audio</small></div><input id="reelRemix" type="checkbox" checked></div>
        <div class="cb-reel-setting-row"><div><b>Tag and collaborate</b><small id="cbCollaboratorSummary">Tag people and collaborators</small></div><button id="cbAddCollaborator" class="cb-link-button">Add</button></div>
        <div class="cb-reel-setting-row"><div><b>Scheduling options</b><small>Publish now or choose a later date/time</small></div><input id="reelSchedule" type="datetime-local"></div>
        <div class="cb-reel-setting-row"><div><b>Share to groups</b><small>Select one or more of your groups</small></div></div>
        <div id="reelGroupList" class="cb-reel-group-list"><div class="cb-profile-muted">Loading your groups…</div></div>
        <div class="cb-reel-setting-row"><div><b>Share to story</b><small>Also add this reel to your 24-hour story</small></div><input id="reelShareStory" type="checkbox"></div>
        <div class="cb-reel-setting-row"><div><b>Boost post</b><small>Open Ads Center after publishing</small></div><input id="reelBoost" type="checkbox"></div>
        <div class="cb-policy-inline"><b>Islamic content policy</b><span>Your reel is checked by Cirklebook moderation before publication.</span></div>
        <div id="cbReelSettingsMsg" class="message hidden"></div>
        <div class="cb-reel-footer"><button id="reelSaveDraft" class="cb-action">Save</button><button id="reelPostNow" class="cb-action primary">Post</button></div>
      </aside>
      <main class="cb-reel-preview-area"><video controls playsinline src="${esc2(draft.preview||'')}"></video></main>
    </div></div>`);

    q('reelSettingsBack').onclick=()=>window.CirklebookOpenReelEditor();
    q('cbAddCollaborator').onclick=()=>reelToolDialog('Tag and collaborate',`
      <label>People / collaborators<input id="cbCollaboratorText" value="${esc2(window.__cbReelToolState.collaborators||'')}" placeholder="Username(s), separated by commas"></label>`,
      ()=>{window.__cbReelToolState.collaborators=q('cbCollaboratorText').value.trim();const s=q('cbCollaboratorSummary');if(s)s.textContent=window.__cbReelToolState.collaborators||'Tag people and collaborators';});

    try{
      let r;
      try{r=await apiRequest('/groups/mine');}
      catch(_){r=await apiRequest('/groups');}
      const groups=r?.data?.groups||r?.groups||r?.data||[];
      q('reelGroupList').innerHTML=Array.isArray(groups)&&groups.length
        ?groups.map(g=>`<label class="cb-reel-group-option"><input type="checkbox" data-reel-group value="${esc2(g.id||g.groupId||g.group_id||'')}"><span>${esc2(g.name||'Group')}</span></label>`).join('')
        :'<div class="cb-profile-muted">You do not have any groups to share to.</div>';
    }catch(err){
      q('reelGroupList').innerHTML=`<div class="cb-profile-muted">${esc2(err?.message||'Unable to load your groups.')}</div>`;
    }

    const collect=()=>({
      ...draft,
      caption:q('reelSettingsCaption').value.trim(),
      audience:q('reelAudience').value,
      aiLabel:q('reelAiLabel').checked,
      remix:q('reelRemix').checked,
      schedule:q('reelSchedule').value||'',
      shareStory:q('reelShareStory').checked,
      boost:q('reelBoost').checked,
      collaborators:window.__cbReelToolState.collaborators||'',
      tools:{...window.__cbReelToolState},
      groupIds:[...document.querySelectorAll('[data-reel-group]:checked')].map(x=>x.value).filter(Boolean)
    });

    q('reelSaveDraft').onclick=()=>{
      state.reelDraftSettings={...collect(),status:'draft'};
      toast('Reel settings saved as draft');
    };
    q('reelPostNow').onclick=()=>{
      const settings=collect();
      const msg=q('cbReelSettingsMsg');
      if(settings.schedule){
        const when=new Date(settings.schedule).getTime();
        if(Number.isFinite(when) && when>Date.now()+60000){
          // Do not falsely claim server scheduling. Preserve the requested time in draft settings.
          settings.requestedSchedule=settings.schedule;
          if(msg){
            msg.textContent='Scheduled time saved with this reel. It will publish now until a server scheduling endpoint is connected.';
            msg.style.background='#fff4ce';msg.style.color='#684f00';msg.classList.remove('hidden');
          }
        }
      }
      state.reelDraftSettings=settings;
      if(dom.postBody) dom.postBody.value=settings.caption;
      showHome();
      publishPost({reelApproved:true});
    };
  };

  // Keep legacy function call sites pointed at the corrected editor.
  try{openReelEditorFromComposer=window.CirklebookOpenReelEditor;}catch(_){}
  try{openReelSettings=window.CirklebookOpenReelSettings;}catch(_){}

  window.CirklebookAfterReelPublished=async function(createdPost,uploadedMedia,settings){
    const postId=createdPost?.data?.post?.id||createdPost?.data?.id||createdPost?.post?.id||createdPost?.id||'';
    const m=uploadedMedia?.find(x=>(x?.media_type||x?.mediaType)==='video')||uploadedMedia?.[0]||{};
    let mediaUrl='';
    try{mediaUrl=typeof buildMediaUrl==='function'?buildMediaUrl(m):'';}catch(_){}
    mediaUrl=mediaUrl||m.url||m.mediaUrl||m.media_url||m.publicUrl||m.public_url||'';
    const entry={postId,title:settings.title||'Reel',caption:settings.caption||'',mediaUrl,createdAt:Date.now()};

    let storyDone=false;
    if(settings?.shareStory){
      await postToStory(createdPost,uploadedMedia,settings);
      storyDone=true;
    }

    let groupSuccess=0,groupLocal=0;
    if(postId&&Array.isArray(settings?.groupIds)){
      for(const groupId of settings.groupIds){
        const ok=await postToGroup(groupId,postId,entry);
        if(ok) groupSuccess++; else groupLocal++;
      }
    }
    if(storyDone) toast('Reel added to your Story');
    if(groupSuccess) toast(`Reel shared to ${groupSuccess} group${groupSuccess===1?'':'s'}`);
    if(groupLocal) toast(`Group share saved for ${groupLocal} group${groupLocal===1?'':'s'}; server group-share support is not available yet.`);
    if(settings?.boost&&postId&&typeof openAdsBuilder==='function') setTimeout(()=>openAdsBuilder('Video Views',postId),300);
  };

  /* ---------- Settings: compact two-column navigation, stable right detail ---------- */
  if(typeof renderSettingsSection==='function'){
    openSettings=function(section='account'){
      const items=[
        ['account','👤','Account','Profile and recovery'],
        ['security','🔐','Security & Login','Password and login security'],
        ['privacy','🛡️','Privacy','Control who can see your information'],
        ['2fa','🔑','Two-factor authentication','Add extra account security'],
        ['blocking','⛔','Blocking','Manage blocked accounts'],
        ['language','🌐','Language','Choose your Cirklebook language'],
        ['notifications','🔔','Notifications','Choose what alerts you receive'],
        ['sessions','💻','Audit & Sessions','Where you are logged in']
      ];
      showFeature(`<div class="feature-page cb-settings-final">
        <aside class="cb-panel cb-settings-nav">
          <h2>Settings & privacy</h2>
          <input id="cbFinalSettingsSearch" class="cb-search" placeholder="Search settings">
          ${items.map(([k,i,l,d])=>`<button type="button" data-final-settings="${k}" class="${section===k?'active':''}"><span>${i}</span><div><b>${l}</b><small>${d}</small></div></button>`).join('')}
        </aside>
        <main id="settingsBody" class="cb-settings-main"></main>
      </div>`);
      const nav=document.querySelector('.cb-settings-final .cb-settings-nav');
      nav?.querySelectorAll('[data-final-settings]').forEach(btn=>btn.onclick=async()=>{
        nav.querySelectorAll('[data-final-settings]').forEach(x=>x.classList.toggle('active',x===btn));
        await renderSettingsSection(btn.dataset.finalSettings);
      });
      q('cbFinalSettingsSearch').oninput=e=>{
        const term=e.target.value.trim().toLowerCase();
        nav.querySelectorAll('[data-final-settings]').forEach(b=>b.hidden=!!term&&!b.textContent.toLowerCase().includes(term));
      };
      renderSettingsSection(section);
    };
  }

  /* ---------- Help & Support: standalone, scope-safe overlay ---------- */
  function openFinalHelp(){
    const old=document.getElementById('cbFinalHelpOverlay');
    if(old) old.remove();
    const overlay=document.createElement('div');
    overlay.id='cbFinalHelpOverlay';
    overlay.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.52);z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:20px';
    overlay.innerHTML=`<div id="cbFinalHelpCard" style="width:min(560px,96vw);max-height:88vh;overflow:auto;background:#fff;border-radius:16px;box-shadow:0 16px 50px rgba(0,0,0,.28);font-family:Arial,sans-serif">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:18px 20px;border-bottom:1px solid #e5e7eb"><h2 id="cbFinalHelpTitle" style="margin:0;font-size:22px">Help & Support</h2><button type="button" data-final-help-close style="border:0;background:#eef0f3;width:36px;height:36px;border-radius:50%;font-size:22px;cursor:pointer">×</button></div>
      <div id="cbFinalHelpBody" style="padding:16px 20px"></div>
    </div>`;
    document.body.appendChild(overlay);
    const body=overlay.querySelector('#cbFinalHelpBody');
    const title=overlay.querySelector('#cbFinalHelpTitle');
    const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
    const rows=()=>{body.innerHTML=`<div style="display:grid;gap:9px">
      <button type="button" data-final-help="support" style="border:0;border-radius:11px;background:#f0f2f5;padding:14px;text-align:left;cursor:pointer"><b style="display:block;font-size:15px">Support Center</b><small style="color:#65676b">Help with Cirklebook features.</small></button>
      <button type="button" data-final-help="recovery" style="border:0;border-radius:11px;background:#f0f2f5;padding:14px;text-align:left;cursor:pointer"><b style="display:block;font-size:15px">Account Recovery</b><small style="color:#65676b">Recover access to your account.</small></button>
      <button type="button" data-final-help="standards" style="border:0;border-radius:11px;background:#f0f2f5;padding:14px;text-align:left;cursor:pointer"><b style="display:block;font-size:15px">Community Standards</b><small style="color:#65676b">Read Cirklebook community rules.</small></button>
      <button type="button" data-final-help="report" style="border:0;border-radius:11px;background:#f0f2f5;padding:14px;text-align:left;cursor:pointer"><b style="display:block;font-size:15px">Report a Problem</b><small style="color:#65676b">Tell us about a technical or safety problem.</small></button>
    </div>`};
    rows();
    const close=()=>overlay.remove();
    overlay.addEventListener('click',async e=>{
      if(e.target===overlay || e.target.closest('[data-final-help-close]')){close();return;}
      const back=e.target.closest('[data-help-back]'); if(back){title.textContent='Help & Support';rows();return;}
      const b=e.target.closest('[data-final-help]'); if(!b)return;
      const k=b.dataset.finalHelp;
      if(k==='support'){
        title.textContent='Support Center';
        body.innerHTML=`<button type="button" data-help-back style="border:0;background:none;color:#1877f2;font-weight:700;cursor:pointer;padding:0 0 12px">← Back</button><div style="display:grid;gap:10px">
          <div style="padding:14px;border:1px solid #e4e6eb;border-radius:10px"><b>Account</b><p style="margin:5px 0 0;color:#65676b">Profile, login, recovery and account settings.</p></div>
          <div style="padding:14px;border:1px solid #e4e6eb;border-radius:10px"><b>Posts & Media</b><p style="margin:5px 0 0;color:#65676b">Photos, videos, reels, comments and sharing.</p></div>
          <div style="padding:14px;border:1px solid #e4e6eb;border-radius:10px"><b>Groups & Pages</b><p style="margin:5px 0 0;color:#65676b">Creation and management help.</p></div>
          <div style="padding:14px;border:1px solid #e4e6eb;border-radius:10px"><b>Ads & Payments</b><p style="margin:5px 0 0;color:#65676b">Ads Center, boosting and billing help.</p></div>
        </div>`;return;
      }
      if(k==='recovery'){
        title.textContent='Account Recovery';
        body.innerHTML=`<button type="button" data-help-back style="border:0;background:none;color:#1877f2;font-weight:700;cursor:pointer;padding:0 0 12px">← Back</button><p style="color:#65676b">Enter your email, phone or username.</p><input id="cbFinalRecoveryId" placeholder="Email, phone or username" style="width:100%;box-sizing:border-box;padding:12px;border:1px solid #ccd0d5;border-radius:8px"><button id="cbFinalRecoveryGo" type="button" style="margin-top:10px;border:0;border-radius:8px;background:#1877f2;color:#fff;font-weight:700;padding:11px 18px;cursor:pointer">Continue</button><div id="cbFinalRecoveryMsg" style="margin-top:10px"></div>`;return;
      }
      if(k==='standards'){
        close();
        const standards=[...document.querySelectorAll('.sidebar-link')].find(x=>(x.textContent||'').toLowerCase().includes('community standards'));
        if(standards){standards.click();return;}
        if(typeof window.openStandards==='function') window.openStandards();
        return;
      }
      if(k==='report'){
        title.textContent='Report a Problem';
        body.innerHTML=`<button type="button" data-help-back style="border:0;background:none;color:#1877f2;font-weight:700;cursor:pointer;padding:0 0 12px">← Back</button><select id="cbFinalProblemType" style="width:100%;padding:11px;border:1px solid #ccd0d5;border-radius:8px"><option>Something is not working</option><option>Account issue</option><option>Safety issue</option><option>Other</option></select><textarea id="cbFinalProblemText" rows="6" placeholder="Describe the problem" style="width:100%;box-sizing:border-box;margin-top:10px;padding:11px;border:1px solid #ccd0d5;border-radius:8px"></textarea><button id="cbFinalProblemSubmit" type="button" style="margin-top:10px;border:0;border-radius:8px;background:#1877f2;color:#fff;font-weight:700;padding:11px 18px;cursor:pointer">Save report</button><div id="cbFinalProblemMsg" style="margin-top:10px"></div>`;return;
      }
    });
    overlay.addEventListener('click',async e=>{
      if(e.target.id==='cbFinalRecoveryGo'){
        const input=overlay.querySelector('#cbFinalRecoveryId'),msg=overlay.querySelector('#cbFinalRecoveryMsg');
        const identifier=(input?.value||'').trim();
        if(!identifier){msg.textContent='Enter your account identifier.';msg.style.color='#b42318';return;}
        try{
          if(typeof apiRequest==='function') await apiRequest('/auth/forgot-password',{method:'POST',body:JSON.stringify({identifier})});
          msg.textContent='Recovery request submitted. Check your recovery channel.';msg.style.color='#137333';
        }catch(err){msg.textContent=(err&&err.message)||'Recovery service is unavailable.';msg.style.color='#b42318';}
      }
      if(e.target.id==='cbFinalProblemSubmit'){
        const type=overlay.querySelector('#cbFinalProblemType')?.value||'Other';
        const text=(overlay.querySelector('#cbFinalProblemText')?.value||'').trim();
        const msg=overlay.querySelector('#cbFinalProblemMsg');
        if(!text){msg.textContent='Describe the problem first.';msg.style.color='#b42318';return;}
        try{const list=JSON.parse(localStorage.getItem('cirklebook_local_problem_reports_v1')||'[]');list.push({id:Date.now(),type,text,createdAt:new Date().toISOString()});localStorage.setItem('cirklebook_local_problem_reports_v1',JSON.stringify(list));}catch(_){}
        msg.textContent='Report saved on this browser. Server report API is not connected yet.';msg.style.color='#137333';
      }
    });
  }
  document.addEventListener('click',function(e){
    const b=e.target.closest('[data-cb-action="help"]');
    if(!b)return;
    e.preventDefault();e.stopImmediatePropagation();
    if(dom && dom.accountMenu) dom.accountMenu.classList.add('hidden');
    openFinalHelp();
  },true);

  /* ---------- Sponsored sidebar: give the user a clear management path ---------- */
  const AD_KEY='cirklebook_local_sponsored_slots_v1';
  function readAds(){try{const a=JSON.parse(localStorage.getItem(AD_KEY)||'[]');return Array.isArray(a)?a:[];}catch(_){return [];}}
  function saveAds(a){try{localStorage.setItem(AD_KEY,JSON.stringify(a||[]));}catch(_){}}
  function adFileToData(file){
    return new Promise(resolve=>{
      if(!file){resolve('');return;}
      const r=new FileReader();r.onload=()=>resolve(String(r.result||''));r.readAsDataURL(file);
    });
  }
  function paintAds(){
    const boxes=[...document.querySelectorAll('.ad-box')];
    const ads=readAds();
    boxes.forEach((box,i)=>{
      const ad=ads[i]||{};
      box.classList.add('cb-ad-clickable');
      box.dataset.adSlot=String(i);
      box.title='Open Ads Center';
      box.innerHTML=ad.title||ad.text||ad.image
        ?`<div class="cb-ad-card-inner">${ad.image?`<img src="${esc2(ad.image)}" alt="">`:''}<b>${esc2(ad.title||'Sponsored')}</b><small>${esc2(ad.text||'Advertisement')}</small><span>${esc2(ad.cta||'Learn more')}</span></div>`
        :`<div class="cb-ad-card-inner"><b>Ad space</b><small>Advertise here</small></div>`;
    });
    const side=boxes[0]?.closest('.right-sidebar,.right-column,.sidebar-right')||boxes[0]?.parentElement;
    if(side){
      const heading=[...side.querySelectorAll('h2,h3,strong')].find(x=>(x.textContent||'').trim()==='Sponsored');
      if(heading && !heading.parentElement?.querySelector('.cb-sponsored-manage')){
        const wrap=document.createElement('div');wrap.className='cb-sponsored-head';
        heading.parentNode.insertBefore(wrap,heading);wrap.appendChild(heading);
        const btn=document.createElement('button');btn.type='button';btn.className='cb-sponsored-manage';btn.textContent='Manage ads';btn.onclick=openAdSlotManager;wrap.appendChild(btn);
      }
    }
  }
  function openAdSlotManager(){
    const ads=readAds();
    const normalized=Array.from({length:4},(_,i)=>ads[i]||{title:'',text:'',cta:'Learn more',link:'',image:''});
    showFeature(`<div class="feature-page"><div class="cb-panel"><div style="display:flex;justify-content:space-between;gap:12px;align-items:center"><div><h2>Sponsored Ad Management</h2><p class="cb-subtitle">Prepare the four Sponsored placements shown on Home.</p></div><button id="cbOpenAdsCenterFromSlots" class="cb-action primary">Ads Center</button></div>
      <div class="cb-reel-final-note">These four previews are stored in this browser. Campaign billing, approval, targeting and delivery continue through the Ads backend when connected.</div>
      <div class="cb-ad-manager-grid">${normalized.map((a,i)=>`<section class="cb-ad-slot-editor" data-ad-editor="${i}"><h3>Ad slot ${i+1}</h3>
        <label>Title<input data-ad-field="title" value="${esc2(a.title)}"></label>
        <label>Text<textarea data-ad-field="text" rows="3">${esc2(a.text)}</textarea></label>
        <label>Call to action<select data-ad-field="cta">${['Learn more','Get started','Contact us','Visit website','Send message'].map(x=>`<option ${a.cta===x?'selected':''}>${x}</option>`).join('')}</select></label>
        <label>Destination link<input data-ad-field="link" value="${esc2(a.link)}" placeholder="https://"></label>
        <label>Image<input type="file" accept="image/*" data-ad-image></label>
        ${a.image?`<img src="${esc2(a.image)}" style="width:100%;height:120px;object-fit:cover;border-radius:8px">`:''}
      </section>`).join('')}</div>
      <button id="cbSaveAdSlots" class="primary-button" style="margin-top:14px">Save Sponsored previews</button></div></div>`);
    q('cbOpenAdsCenterFromSlots').onclick=()=>{if(typeof openAdsBuilder==='function')openAdsBuilder();else if(typeof adsCenterHtml==='function'){showFeature(`<div class="feature-page">${adsCenterHtml()}</div>`);if(typeof bindAdsCenter==='function')bindAdsCenter();}};
    q('cbSaveAdSlots').onclick=async()=>{
      const out=[];
      for(const ed of document.querySelectorAll('[data-ad-editor]')){
        const i=Number(ed.dataset.adEditor),prev=normalized[i]||{};
        const obj={...prev};
        ed.querySelectorAll('[data-ad-field]').forEach(f=>obj[f.dataset.adField]=f.value.trim());
        const file=ed.querySelector('[data-ad-image]')?.files?.[0];
        if(file)obj.image=await adFileToData(file);
        out[i]=obj;
      }
      saveAds(out);toast('Sponsored previews saved');showHome();setTimeout(paintAds,50);
    };
  }
  document.addEventListener('click',e=>{
    const box=e.target.closest('.ad-box.cb-ad-clickable');
    if(!box)return;
    e.preventDefault();
    const ad=readAds()[Number(box.dataset.adSlot)]||{};
    if(ad.link){
      try{window.open(ad.link,'_blank','noopener');return;}catch(_){}
    }
    if(typeof openAdsBuilder==='function') openAdsBuilder();
    else openAdSlotManager();
  },true);

  // Repaint ad inventory after every Home render without changing feed logic.
  if(typeof showHome==='function'){
    const previousShowHome=showHome;
    showHome=function(){
      const r=previousShowHome.apply(this,arguments);
      setTimeout(paintAds,30);
      return r;
    };
  }
  setTimeout(paintAds,100);

  console.log('Cirklebook final non-destructive interaction patch ready');
})();

/* ===== Cirklebook Reel cross-share targeted fix 2026-09-10 ===== */
(function(){
  'use strict';
  const byId=id=>document.getElementById(id);
  const escR=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const toastR=m=>{try{if(typeof showToast==='function')return showToast(m);}catch(_){} console.log(m);};
  const groupKey=id=>`cirklebook_group_shared_posts_${id}`;
  function saveLocalGroup(id,entry){try{const a=JSON.parse(localStorage.getItem(groupKey(id))||'[]');a.unshift(entry);localStorage.setItem(groupKey(id),JSON.stringify(a.slice(0,30)));}catch(_){}}
  function currentGroups(){
    const a=Array.isArray(window.__cirklebookGroupList)?window.__cirklebookGroupList:[];
    return a.filter(g=>g&&(g.id||g.groupId||g.group_id||g.name));
  }
  async function loadGroups(){
    let groups=[];
    try{const r=await apiRequest('/groups/mine');groups=r?.data?.groups||r?.groups||r?.data||[];}catch(_){}
    if(!Array.isArray(groups)||!groups.length) groups=currentGroups();
    return Array.isArray(groups)?groups:[];
  }
  async function putReelStory(story){
    try{localStorage.setItem('cirklebook_local_story_v1',JSON.stringify(story));}catch(_){}
    try{
      const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('cirklebook_story_cache_v1',1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains('stories'))r.result.createObjectStore('stories');};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
      await new Promise((resolve,reject)=>{const tx=db.transaction('stories','readwrite');tx.objectStore('stories').put(story,'current');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});
    }catch(e){console.warn('REEL STORY CACHE:',e);}
    try{window.CirklebookRefreshStories?.();}catch(_){}
  }
  async function shareGroup(groupId,postId,entry){
    const attempts=[
      [`/groups/${encodeURIComponent(groupId)}/share`,{postId}],
      [(`/shares/${encodeURIComponent(postId)}/share`),{groupId}]
    ];
    for(const [path,body] of attempts){
      try{await apiRequest(path,{method:'POST',body:JSON.stringify(body)});saveLocalGroup(groupId,{...entry,serverShared:true});return true;}
      catch(e){if(![400,404,405].includes(Number(e?.status))) break;}
    }
    saveLocalGroup(groupId,{...entry,localFallback:true});
    return false;
  }

  window.CirklebookOpenReelSettings=async function(draft={}){
    const renderReelSettings = window.CirklebookShowFeature;
    if(typeof renderReelSettings!=='function'){
      console.error('REEL SETTINGS: feature renderer is unavailable');
      toastR('Unable to open Reel settings.');
      return;
    }
    renderReelSettings(`<div class="feature-page cb-reel-editor-page"><div class="cb-reel-editor-shell">
      <aside class="cb-reel-edit-sidebar">
        <div class="cb-reel-editor-title"><button id="reelSettingsBack" class="cb-circle-close">←</button><h2>Reel settings</h2></div>
        <label>Describe your reel<textarea id="reelSettingsCaption" rows="5">${escR(draft.caption||'')}</textarea></label>
        <div class="cb-reel-setting-row"><div><b>Post audience</b><small>Choose who can see your reel</small></div><select id="reelAudience"><option value="public">Public</option><option value="friends">Friends</option></select></div>
        <div class="cb-reel-setting-row"><div><b>Add AI label</b><small>Label AI-generated content when applicable</small></div><input id="reelAiLabel" type="checkbox"></div>
        <div class="cb-reel-setting-row"><div><b>Remixing and original audio</b><small>Allow reuse of your original audio</small></div><input id="reelRemix" type="checkbox" checked></div>
        <div class="cb-reel-setting-row"><div><b>Scheduling options</b><small>Choose a requested publish time</small></div><input id="reelSchedule" type="datetime-local"></div>
        <div class="cb-reel-setting-row"><div><b>Share to groups</b><small>Select one or more of your groups</small></div></div>
        <div id="reelGroupList" class="cb-reel-group-list"><div class="cb-profile-muted">Loading your groups…</div></div>
        <div class="cb-reel-setting-row"><div><b>Share to story</b><small>Also add this reel to Your story for 24 hours</small></div><label class="cb-switch-label"><input id="reelShareStory" type="checkbox"><span>Off</span></label></div>
        <div class="cb-reel-setting-row"><div><b>Boost post</b><small>Open Ads Center after publishing</small></div><input id="reelBoost" type="checkbox"></div>
        <div id="cbReelShareSummary" class="cb-story-help"><b>Cross-share</b><span>No group or Story selected.</span></div>
        <div id="cbReelSettingsMsg" class="message hidden"></div>
        <div class="cb-reel-footer"><button id="reelSaveDraft" class="cb-action">Save</button><button id="reelPostNow" class="cb-action primary">Post</button></div>
      </aside><main class="cb-reel-preview-area"><video controls playsinline src="${escR(draft.preview||'')}"></video></main>
    </div></div>`);
    byId('reelSettingsBack').onclick=()=>window.CirklebookOpenReelEditor?.();
    const groups=await loadGroups();
    const box=byId('reelGroupList');
    if(box) box.innerHTML=groups.length?groups.map((g,i)=>{const id=g.id||g.groupId||g.group_id||`local-${i}`;return `<label class="cb-reel-group-option"><input type="checkbox" data-reel-group value="${escR(id)}"><span>${escR(g.name||'Group')}</span></label>`;}).join(''):'<div class="cb-profile-muted">No groups are currently available. Open Groups once, then return here if your login session is offline.</div>';
    const updateSummary=()=>{
      const n=document.querySelectorAll('[data-reel-group]:checked').length,s=!!byId('reelShareStory')?.checked;
      const span=byId('cbReelShareSummary')?.querySelector('span'); if(span)span.textContent=`${n} group${n===1?'':'s'} selected · Share to Story ${s?'ON':'OFF'}`;
      const lab=byId('reelShareStory')?.nextElementSibling;if(lab)lab.textContent=s?'On':'Off';
    };
    document.querySelectorAll('[data-reel-group]').forEach(x=>x.addEventListener('change',updateSummary));
    byId('reelShareStory')?.addEventListener('change',updateSummary);updateSummary();
    const collect=()=>({...draft,caption:byId('reelSettingsCaption')?.value.trim()||'',audience:byId('reelAudience')?.value||'public',aiLabel:!!byId('reelAiLabel')?.checked,remix:!!byId('reelRemix')?.checked,schedule:byId('reelSchedule')?.value||'',shareStory:!!byId('reelShareStory')?.checked,boost:!!byId('reelBoost')?.checked,groupIds:[...document.querySelectorAll('[data-reel-group]:checked')].map(x=>x.value).filter(Boolean)});
    byId('reelSaveDraft').onclick=()=>{state.reelDraftSettings={...collect(),status:'draft'};toastR('Reel settings saved');};
    byId('reelPostNow').onclick=async()=>{
      const settings=collect();
      state.reelDraftSettings=settings;
      if(dom?.postBody) dom.postBody.value=settings.caption;
      const button=byId('reelPostNow');
      const originalText=button?.textContent||'Post';
      if(button){button.disabled=true;button.textContent='Posting...';}
      try{
        let duration=0;
        try{duration=await getSelectedVideoDurationSeconds(state.selectedFiles||[]);}catch(_){}
        const ok=await publishPost({
          reelApproved:true,
          forceVideoPost:duration>=180,
          videoDurationSeconds:duration
        });

        if(!ok){
          const msg=byId('cbReelSettingsMsg');
          if(msg){
            msg.textContent='Video was not published. Check the error message shown by Cirklebook and try again.';
            msg.classList.remove('hidden');
          }
          return;
        }

        if(state.reelDraftSettings===null){
          const home=document.getElementById('topHomeBtn')||document.getElementById('brandHomeButton');
          if(home) home.click();
          else if(typeof window.CirklebookStoryGoHome==='function') window.CirklebookStoryGoHome();
        }
      }finally{
        if(button&&button.isConnected){button.disabled=false;button.textContent=originalText;}
      }
    };
  };
  try{openReelSettings=window.CirklebookOpenReelSettings;}catch(_){}

  window.CirklebookAfterReelPublished=async function(createdPost,uploadedMedia,settings={}){
    const postId=createdPost?.data?.post?.id||createdPost?.data?.id||createdPost?.post?.id||createdPost?.id||'';
    const m=uploadedMedia?.find(x=>(x?.media_type||x?.mediaType)==='video')||uploadedMedia?.[0]||{};
    let mediaUrl='';try{mediaUrl=typeof buildMediaUrl==='function'?buildMediaUrl(m):'';}catch(_){}
    mediaUrl=mediaUrl||m.url||m.mediaUrl||m.media_url||m.publicUrl||m.public_url||m.signed_url||'';
    const entry={postId,title:settings.title||'Reel',caption:settings.caption||'',mediaUrl,createdAt:Date.now()};
    if(settings.shareStory){
      await putReelStory({type:'media',text:settings.caption||settings.title||'',mediaData:mediaUrl,mediaUrl,mime:m?.mime_type||m?.mimeType||'video/mp4',audience:settings.audience||'public',postId,createdAt:Date.now(),expiresAt:Date.now()+86400000});
      toastR('Reel added to Your story');
    }
    let server=0,local=0;
    if(postId&&Array.isArray(settings.groupIds)) for(const id of settings.groupIds){(await shareGroup(id,postId,entry))?server++:local++;}
    if(server)toastR(`Reel shared to ${server} group${server===1?'':'s'}`);
    if(local)toastR(`Reel saved in ${local} selected group${local===1?'':'s'} locally; backend group-share endpoint is not connected yet.`);
    if(settings.boost&&postId){try{if(typeof openAdsBuilder==='function')setTimeout(()=>openAdsBuilder('Video Views',postId),250);}catch(_){}}
  };
  console.log('CIRKLEBOOK REEL GROUP/STORY CROSS-SHARE FIX READY');
})();

/* CIRKLEBOOK REEL POST FLOW FIX — preserves reelApproved through publish wrappers. */
console.log('CIRKLEBOOK REEL POST FLOW FIX READY');


/* =========================================================
   CIRKLEBOOK — FACEBOOK-LIKE REELS + CREATE STORY AVATAR
   Keeps the working Story editor/viewer and Reel publish flow intact.
========================================================= */
(function cirklebookFacebookLikeReelsAndStoryCard(){
  'use strict';
  if(!document.getElementById('cbFacebookStoryReelStyles')){
    const st=document.createElement('style');
    st.id='cbFacebookStoryReelStyles';
    st.textContent=`
      #cbCreateStoryCard.facebook-create-story{background-color:#dfe3e8;background-size:cover;background-position:center;position:relative}
      #cbCreateStoryCard.facebook-create-story:after{content:"";position:absolute;left:0;right:0;bottom:0;height:55px;background:#fff;border-radius:0 0 10px 10px;z-index:2}
      #cbCreateStoryCard .cb-create-story-profile{position:absolute;left:10px;top:10px;width:34px;height:34px;border-radius:50%;border:3px solid #1877f2;background:#fff;overflow:hidden;z-index:4;box-shadow:0 1px 3px rgba(0,0,0,.2)}
      #cbCreateStoryCard .cb-create-story-profile img{width:100%;height:100%;object-fit:cover;display:block}
      #cbCreateStoryCard.facebook-create-story .cb-story-plus{position:absolute;left:50%;bottom:37px;transform:translate(-50%,50%);z-index:5;width:34px;height:34px;border-radius:50%;display:grid;place-items:center;background:#1877f2;color:#fff;border:4px solid #fff;font-size:25px;line-height:1}
      #cbCreateStoryCard.facebook-create-story .cb-story-name{z-index:5;color:#050505;bottom:9px;text-shadow:none;font-weight:700;text-align:center;left:5px;right:5px}
      #cbCreateStoryCard.has-own-story .cb-create-story-profile{width:34px;height:34px}
      .cb-reels-feed{display:grid;gap:16px;max-width:680px;margin:0 auto}
      .cb-reel-feed-card{background:#111;border-radius:14px;overflow:hidden;color:#fff;box-shadow:0 1px 3px rgba(0,0,0,.2)}
      .cb-reel-feed-card .cb-reel-head{padding:12px 14px;display:flex;justify-content:space-between;align-items:center}
      .cb-reel-feed-card .cb-reel-media video{display:block;width:100%;max-height:72vh;background:#000}
      .cb-reel-feed-card .cb-reel-caption{padding:10px 14px 0}
      .cb-reel-feed-card .cb-reel-actions{display:grid;grid-template-columns:repeat(4,1fr);padding:8px;border-top:1px solid #2f3337;margin-top:10px}
      .cb-reel-feed-card .cb-reel-actions button{border:0;background:transparent;color:#fff;padding:10px;cursor:pointer;font-weight:700}
    `;
    document.head.appendChild(st);
  }

  function reelIds(){try{const a=JSON.parse(localStorage.getItem('cirklebook_reel_post_ids_v1')||'[]');return Array.isArray(a)?a.map(String):[];}catch(_){return []}}
  function isReel(post){const t=String(post?.post_type||post?.postType||post?.type||'').toLowerCase();return t==='reel'||reelIds().includes(String(post?.id||''));}
  function reelVideo(post){const m=(Array.isArray(post?.media)?post.media:[]).find(x=>(x?.media_type||x?.mediaType)==='video');if(!m)return '';try{return buildMediaUrl(m)||'';}catch(_){return m.url||m.public_url||m.signed_url||'';}}
  function esc(v=''){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

  window.openVideoHub=async function(){
    const show=window.CirklebookShowFeature;
    if(typeof show!=='function')return;
    show(`<div class="feature-page v4-video-page"><aside class="v4-video-sidebar"><h2>Video</h2><button>▶ For you</button><button class="active">🎞 Reels</button><button>📺 Live</button><button>🔖 Saved videos</button><button>⚙ Video settings</button></aside><main class="v4-video-main"><div class="v4-video-toolbar"><div><h2>Reels</h2><p>Short videos published through Cirklebook Reel editor.</p></div><button id="v4CreateReel" class="cb-action primary">＋ Create reel</button></div><div id="cbRealReelsFeed" class="cb-reels-feed"><div class="cb-panel">Loading reels…</div></div></main></div>`,'topVideoBtn');
    document.getElementById('v4CreateReel')?.addEventListener('click',()=>openPostModal(true));
    const box=document.getElementById('cbRealReelsFeed');
    try{
      const r=await apiRequest('/feed?limit=50&offset=0');
      const reels=extractPosts(r).filter(isReel);
      box.innerHTML=reels.length?reels.map(p=>{const u=reelVideo(p),name=typeof getPostAuthorName==='function'?getPostAuthorName(p):(p.username||'Cirklebook User');return `<article class="cb-reel-feed-card" data-post="${esc(p.id||'')}"><div class="cb-reel-head"><b>${esc(name)}</b><span>Reel</span></div><div class="cb-reel-media">${u?`<video src="${esc(u)}" controls playsinline preload="metadata"></video>`:'<div style="padding:50px;text-align:center">Video unavailable</div>'}</div>${p.body?`<div class="cb-reel-caption">${esc(p.body)}</div>`:''}<div class="cb-reel-actions"><button data-reel-act="like" data-id="${esc(p.id||'')}">Like</button><button data-reel-act="comment" data-id="${esc(p.id||'')}">Comment</button><button data-reel-act="report" data-id="${esc(p.id||'')}">Report</button><button data-reel-act="share" data-id="${esc(p.id||'')}">Share</button><button data-reel-act="save" data-id="${esc(p.id||'')}">Save</button></div></article>`;}).join(''):'<div class="cb-panel"><div class="cb-empty-panel">No reels yet. Create your first Reel.</div></div>';
      box.querySelectorAll('[data-reel-act]').forEach(btn=>btn.onclick=async()=>{const id=btn.dataset.id,act=btn.dataset.reelAct;try{if(act==='like')await toggleLike(id,btn);else if(act==='share')await sharePost(id,btn);else if(act==='save')await toggleSave(id,btn);else if(act==='comment'){const post=document.querySelector(`[data-post="${CSS.escape(id)}"]`);if(post)showToast('Open this Reel from Home to view comments.');}}catch(e){showToast(e?.message||'Action failed');}});
    }catch(e){box.innerHTML=`<div class="cb-panel"><div class="cb-empty-panel">${esc(e?.message||'Unable to load reels.')}</div></div>`;}
  };
  console.log('CIRKLEBOOK FACEBOOK-LIKE REELS + STORY PROFILE AVATAR READY');
})();

/* =========================================================
   CIRKLEBOOK — FACEBOOK STORY CARD SPLIT ACTION FIX
   Active story: card/body opens viewer; blue + opens creator.
   No active story: card opens creator. Keeps profile avatar visible.
========================================================= */
(function cirklebookFacebookStorySplitActionFix(){
  'use strict';

  if(!document.getElementById('cbStorySplitActionStyles')){
    const style=document.createElement('style');
    style.id='cbStorySplitActionStyles';
    style.textContent=`
      #cbCreateStoryCard{position:relative}
      #cbCreateStoryCard .cb-story-plus{cursor:pointer;pointer-events:auto}
      #cbCreateStoryCard.has-own-story .cb-story-plus{position:absolute;left:50%;bottom:37px;transform:translate(-50%,50%);z-index:8;width:34px;height:34px;border-radius:50%;display:grid;place-items:center;background:#1877f2;color:#fff;border:4px solid #fff;font-size:25px;line-height:1;box-shadow:0 1px 3px rgba(0,0,0,.25)}
      #cbCreateStoryCard.has-own-story .cb-create-story-profile{z-index:7}
    `;
    document.head.appendChild(style);
  }

  // Capture the blue + before the parent story-card click handler sees it.
  document.addEventListener('click', function(event){
    const plus=event.target.closest('#cbCreateStoryCard .cb-story-plus');
    if(!plus) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if(typeof window.CirklebookOpenStoryCreator==='function'){
      window.CirklebookOpenStoryCreator();
    }
  }, true);

  // Keyboard accessibility for the + action.
  document.addEventListener('keydown', function(event){
    if(event.key!=='Enter' && event.key!==' ') return;
    const plus=event.target.closest?.('#cbCreateStoryCard .cb-story-plus');
    if(!plus) return;
    event.preventDefault();
    if(typeof window.CirklebookOpenStoryCreator==='function'){
      window.CirklebookOpenStoryCreator();
    }
  }, true);

  console.log('CIRKLEBOOK FACEBOOK STORY SPLIT ACTION READY');
})();

/* =========================================================
   CIRKLEBOOK — TRUE REELS IDENTITY FINAL POLISH
   2026-09-10
   Non-destructive: preserves existing Home feed, Story, media upload,
   Reel editor and backend fallback. Adds a stable Reel identity layer
   across Home, Video/Reels hub and Profile > Reels.
========================================================= */
(function cirklebookTrueReelsIdentityFinal(){
  'use strict';
  const KEY='cirklebook_reel_post_ids_v1';
  const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function ids(){
    try{const a=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(a)?a.map(String):[];}catch(_){return []}
  }
  function isReel(post){
    const t=String(post?.post_type||post?.postType||post?.type||'').toLowerCase();
    return t==='reel'||ids().includes(String(post?.id||''));
  }
  window.CirklebookIsReel=isReel;

  if(!document.getElementById('cbTrueReelsFinalStyle')){
    const s=document.createElement('style');
    s.id='cbTrueReelsFinalStyle';
    s.textContent=`
      .cb-reel-home-badge{display:none!important}
      .cb-reel-feed-card .cb-reel-head span{font-weight:800;color:#d8e6ff}
      .cb-profile-video-posts .post-card[data-cb-reel="1"]{outline:1px solid #dbe7ff}
    `;
    document.head.appendChild(s);
  }

  // Mark Home/Profile post cards that belong to the Reel editor without changing
  // the server post renderer. This keeps Like/Comment/Share/Save behavior intact.
  function paintReelBadges(){
    const reelSet=new Set(ids());
    document.querySelectorAll('[data-post],.post-card').forEach(card=>{
      const id=String(card.dataset?.post||card.dataset?.postId||card.getAttribute('data-id')||'');
      if(!id||!reelSet.has(id)) return;
      card.dataset.cbReel='1';
      card.querySelectorAll('.cb-reel-home-badge').forEach(badge=>badge.remove());
    });
  }
  const observer=new MutationObserver(()=>paintReelBadges());
  observer.observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(paintReelBadges,100);
  setTimeout(paintReelBadges,800);

  // Refresh badge state whenever a Reel publish completes.
  const previousAfter=window.CirklebookAfterReelPublished;
  if(typeof previousAfter==='function'){
    window.CirklebookAfterReelPublished=async function(...args){
      const r=await previousAfter.apply(this,args);
      setTimeout(paintReelBadges,80);
      return r;
    };
  }

  console.log('CIRKLEBOOK TRUE REELS IDENTITY FINAL READY');
})();


/* =========================================================
   CIRKLEBOOK — REAL REELS FEED FROM EXISTING POSTS
   2026-09-10
   Non-destructive: keeps Home/Story/Reel publish flow intact.
   Fixes Reel identity recovery and loads actual feed videos/reels
   into Video > For you / Reels and Profile > Reels.
========================================================= */
(function cirklebookRealReelsFromExistingPosts(){
  'use strict';
  const KEY='cirklebook_reel_post_ids_v1';
  const MANIFEST='cirklebook_reel_manifest_v2';
  const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const readIds=()=>{try{const a=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(a)?a.map(String):[];}catch(_){return []}};
  const saveId=(id)=>{if(!id)return;try{const a=readIds();localStorage.setItem(KEY,JSON.stringify([String(id),...a.filter(x=>x!==String(id))].slice(0,500)));}catch(_){}};
  const readManifest=()=>{try{const a=JSON.parse(localStorage.getItem(MANIFEST)||'[]');return Array.isArray(a)?a:[];}catch(_){return []}};
  const saveManifest=(entry)=>{try{const a=readManifest();const id=String(entry.postId||'');const mid=String(entry.mediaId||'');const next=[entry,...a.filter(x=>!(id&&String(x.postId||'')===id)&&!(mid&&String(x.mediaId||'')===mid))].slice(0,500);localStorage.setItem(MANIFEST,JSON.stringify(next));}catch(_){}};
  const postId=(x)=>String(x?.id||x?.post_id||x?.postId||x?.data?.post?.id||x?.data?.post?.post_id||x?.data?.post_id||x?.data?.id||x?.post?.id||x?.post?.post_id||'');
  const postType=(p)=>String(p?.post_type||p?.postType||p?.type||'').toLowerCase();
  const media=(p)=>Array.isArray(p?.media)?p.media:(Array.isArray(p?.media_assets)?p.media_assets:[]);
  const isVideo=(p)=>media(p).some(m=>String(m?.media_type||m?.mediaType||m?.type||'').toLowerCase()==='video');
  const mediaIds=(p)=>media(p).map(m=>String(m?.id||m?.media_id||m?.mediaId||'')).filter(Boolean);
  const manifestMatches=(p)=>{const mids=new Set(mediaIds(p));const pid=postId(p);return readManifest().some(x=>(pid&&String(x.postId||'')===pid)||(String(x.mediaId||'')&&mids.has(String(x.mediaId||''))));};
  const isKnownReel=(p)=>postType(p)==='reel'||readIds().includes(postId(p))||manifestMatches(p);
  window.CirklebookIsReel=isKnownReel;

  function createdMs(p){const raw=p?.created_at||p?.createdAt||p?.published_at||p?.publishedAt||'';const t=Date.parse(raw);return Number.isFinite(t)?t:0;}
  function recoverRecentLegacyReel(posts){
    if(posts.some(isKnownReel)) return;
    if(readIds().length||readManifest().length) return;
    const mine=posts.filter(isVideo).sort((a,b)=>createdMs(b)-createdMs(a));
    const recent=mine.filter(p=>createdMs(p)>Date.now()-2*60*60*1000);
    if(recent.length===1){const id=postId(recent[0]);if(id){saveId(id);saveManifest({postId:id,recovered:true,createdAt:Date.now()});}}
  }

  async function loadPosts(){
    let all=[];
    const add=(r)=>{try{const a=typeof extractPosts==='function'?extractPosts(r):[];if(Array.isArray(a))all.push(...a);}catch(_){}};
    try{add(await apiRequest('/feed?limit=100&offset=0'));}catch(_){}
    try{add(await apiRequest('/posts/mine?limit=100'));}catch(_){}
    const seen=new Set();
    all=all.filter(p=>{const id=postId(p);const key=id||JSON.stringify([p?.created_at,p?.body,mediaIds(p)]);if(seen.has(key))return false;seen.add(key);return true;});
    recoverRecentLegacyReel(all);
    return all;
  }

  function videoUrl(p){const m=media(p).find(x=>String(x?.media_type||x?.mediaType||x?.type||'').toLowerCase()==='video');if(!m)return '';try{return typeof buildMediaUrl==='function'?(buildMediaUrl(m)||''):(m.url||'');}catch(_){return m.url||m.public_url||m.signed_url||'';}}
  function author(p){try{return typeof getPostAuthorName==='function'?getPostAuthorName(p):(p?.username||'Cirklebook User');}catch(_){return p?.username||'Cirklebook User';}}
  function card(p){const id=postId(p),u=videoUrl(p);return `<article class="cb-reel-feed-card" data-post="${esc(id)}"><div class="cb-reel-head"><b>${esc(author(p))}</b><span>${isKnownReel(p)?'Reel':'Video'}</span></div><div class="cb-reel-media">${u?`<video src="${esc(u)}" controls playsinline preload="metadata"></video>`:'<div style="padding:50px;text-align:center">Video unavailable</div>'}</div>${p?.body?`<div class="cb-reel-caption">${esc(p.body)}</div>`:''}<div class="cb-reel-actions"><button data-reel-act="like" data-id="${esc(id)}">Like</button><button data-reel-act="comment" data-id="${esc(id)}">Comment</button><button data-reel-act="report" data-id="${esc(id)}">Report</button><button data-reel-act="share" data-id="${esc(id)}">Share</button><button data-reel-act="save" data-id="${esc(id)}">Save</button></div></article>`;}

  openVideoHub=async function(initial='reels'){
    const show=window.CirklebookShowFeature;
    if(typeof show!=='function') return;
    show(`<div class="feature-page v4-video-page"><aside class="v4-video-sidebar"><h2>Video</h2><button data-video-tab="for-you">▶ For you</button><button data-video-tab="reels" class="active">🎞 Reels</button><button>📺 Live</button><button>🔖 Saved videos</button><button>⚙ Video settings</button></aside><main class="v4-video-main"><div class="v4-video-toolbar"><div><h2 id="cbVideoHubTitle">Reels</h2><p id="cbVideoHubSub">Short videos published through Cirklebook Reel editor.</p></div><button id="v4CreateReel" class="cb-action primary">＋ Create reel</button></div><div id="cbRealReelsFeed" class="cb-reels-feed"><div class="cb-panel">Loading…</div></div></main></div>`,'topVideoBtn');
    document.getElementById('v4CreateReel')?.addEventListener('click',()=>openPostModal(true));
    const posts=await loadPosts();
    const render=(tab)=>{
      document.querySelectorAll('[data-video-tab]').forEach(b=>b.classList.toggle('active',b.dataset.videoTab===tab));
      const title=document.getElementById('cbVideoHubTitle'),sub=document.getElementById('cbVideoHubSub'),box=document.getElementById('cbRealReelsFeed');
      const list=tab==='reels'?posts.filter(p=>isVideo(p)&&isKnownReel(p)):posts.filter(isVideo);
      if(title)title.textContent=tab==='reels'?'Reels':'For you';
      if(sub)sub.textContent=tab==='reels'?'Reels you and others published through Cirklebook Reel editor.':'Published video and Reel content from your feed.';
      if(box)box.innerHTML=list.length?list.map(card).join(''):`<div class="cb-panel"><div class="cb-empty-panel">${tab==='reels'?'No reels found yet. Create a Reel from the Reel editor.':'No videos found yet.'}</div></div>`;
      box?.querySelectorAll('[data-reel-act]').forEach(btn=>btn.onclick=async()=>{const id=btn.dataset.id,act=btn.dataset.reelAct;try{if(act==='like')await toggleLike(id,btn);else if(act==='share')await sharePost(id,btn);else if(act==='save')await toggleSave(id,btn);else if(act==='comment')showToast('Open this post from Home to view comments.');}catch(e){showToast(e?.message||'Action failed');}});
    };
    document.querySelectorAll('[data-video-tab]').forEach(b=>b.onclick=()=>render(b.dataset.videoTab));
    render(initial==='for-you'?'for-you':'reels');
  };

  // Capture future Reel publishes using every common response id shape and media id.
  const prior=window.CirklebookAfterReelPublished;
  window.CirklebookAfterReelPublished=async function(createdPost,uploadedMedia,settings){
    const id=postId(createdPost);
    const m=(Array.isArray(uploadedMedia)?uploadedMedia:[]).find(x=>String(x?.media_type||x?.mediaType||'').toLowerCase()==='video')||uploadedMedia?.[0]||{};
    const mid=String(m?.id||m?.media_id||m?.mediaId||'');
    if(id)saveId(id);
    saveManifest({postId:id,mediaId:mid,title:settings?.title||'',caption:settings?.caption||'',createdAt:Date.now()});
    if(typeof prior==='function') return prior.call(this,createdPost,uploadedMedia,settings);
  };

  console.log('CIRKLEBOOK REAL REELS FROM EXISTING POSTS READY');
})();

/* =========================================================
   CIRKLEBOOK — VIDEO/REELS ACTUAL LOADER CAPTURE FIX
   2026-09-10
   Purpose: force the top Video/Reels navigation to use the real
   feed-backed renderer instead of the older placeholder renderer.
   Non-destructive: does not alter Home, Story, posting, or media upload.
========================================================= */
(function cirklebookVideoReelsActualLoaderCaptureFix(){
  'use strict';

  const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const reelIds=()=>{try{const a=JSON.parse(localStorage.getItem('cirklebook_reel_post_ids_v1')||'[]');return Array.isArray(a)?a.map(String):[];}catch(_){return []}};
  const reelManifest=()=>{try{const a=JSON.parse(localStorage.getItem('cirklebook_reel_manifest_v2')||'[]');return Array.isArray(a)?a:[];}catch(_){return []}};
  const idOf=p=>String(p?.id||p?.post_id||p?.postId||'');
  const mediaOf=p=>Array.isArray(p?.media)?p.media:(Array.isArray(p?.media_assets)?p.media_assets:[]);
  const mediaIds=p=>mediaOf(p).map(m=>String(m?.id||m?.media_id||m?.mediaId||'')).filter(Boolean);
  const isVideo=p=>mediaOf(p).some(m=>String(m?.media_type||m?.mediaType||m?.type||'').toLowerCase()==='video');
  const isReel=p=>{
    const type=String(p?.post_type||p?.postType||p?.type||'').toLowerCase();
    if(type==='reel') return true;
    const pid=idOf(p);
    if(pid && reelIds().includes(pid)) return true;
    const mids=new Set(mediaIds(p));
    return reelManifest().some(x=>(pid&&String(x?.postId||'')===pid)||(String(x?.mediaId||'')&&mids.has(String(x.mediaId))));
  };

  function videoUrl(p){
    const m=mediaOf(p).find(x=>String(x?.media_type||x?.mediaType||x?.type||'').toLowerCase()==='video');
    if(!m) return '';
    try{ if(typeof buildMediaUrl==='function') return buildMediaUrl(m)||''; }catch(_){}
    return m.url||m.public_url||m.signed_url||'';
  }
  function author(p){
    try{ if(typeof getPostAuthorName==='function') return getPostAuthorName(p); }catch(_){}
    return p?.display_name||p?.username||p?.author?.display_name||p?.author?.username||'Cirklebook User';
  }

  async function fetchPosts(){
    const result=await apiRequest(`${ROUTES.feed}?limit=100&offset=0`);
    const posts=typeof extractPosts==='function'?extractPosts(result):[];
    return Array.isArray(posts)?posts:[];
  }

  function reelCard(p){
    const id=idOf(p), url=videoUrl(p), reel=isReel(p);
    return `<article class="cb-reel-feed-card" data-post="${esc(id)}">
      <div class="cb-reel-head"><b>${esc(author(p))}</b><span>${reel?'Reel':'Video'}</span></div>
      <div class="cb-reel-media">${url?`<video src="${esc(url)}" controls playsinline preload="metadata"></video>`:'<div class="cb-empty-panel">Video unavailable</div>'}</div>
      ${p?.body?`<div class="cb-reel-caption">${esc(p.body)}</div>`:''}
      <div class="cb-reel-actions">
        <button data-real-reel-act="like" data-id="${esc(id)}">Like</button>
        <button data-real-reel-act="comment" data-id="${esc(id)}">Comment</button>
        <button data-real-reel-act="report" data-id="${esc(id)}">Report</button>
        <button data-real-reel-act="share" data-id="${esc(id)}">Share</button>
        <button data-real-reel-act="save" data-id="${esc(id)}">Save</button>
      </div>
    </article>`;
  }

  async function openActualVideoHub(initial='for-you'){
    const show=window.CirklebookShowFeature;
    if(typeof show!=='function') return;
    show(`<div class="feature-page v4-video-page">
      <aside class="v4-video-sidebar">
        <h2>Video</h2>
        <button data-real-video-tab="for-you">▶ For you</button>
        <button data-real-video-tab="reels">🎞 Reels</button>
        <button data-real-video-tab="live">📺 Live</button>
        <button data-real-video-tab="saved">🔖 Saved videos</button>
        <button data-real-video-tab="settings">⚙ Video settings</button>
      </aside>
      <main class="v4-video-main">
        <div class="v4-video-toolbar"><div><h2 id="cbActualVideoTitle">Reels & Videos</h2><p id="cbActualVideoSub">Loading published video and Reel content…</p></div><button id="cbActualCreateReel" class="cb-action primary">＋ Create reel</button></div>
        <div id="cbActualVideoFeed" class="cb-reels-feed"><div class="cb-panel">Loading…</div></div>
      </main>
    </div>`,'topVideoBtn');

    document.getElementById('cbActualCreateReel')?.addEventListener('click',()=>openPostModal(true));

    let posts=[];
    let loadError='';
    try{ posts=await fetchPosts(); }catch(e){ loadError=e?.message||'Unable to load videos.'; }
    const videos=posts.filter(isVideo);

    const render=tab=>{
      document.querySelectorAll('[data-real-video-tab]').forEach(b=>b.classList.toggle('active',b.dataset.realVideoTab===tab));
      const title=document.getElementById('cbActualVideoTitle');
      const sub=document.getElementById('cbActualVideoSub');
      const box=document.getElementById('cbActualVideoFeed');
      if(!box) return;
      if(tab==='live'){
        if(typeof openLiveProducer==='function') return openLiveProducer();
        box.innerHTML='<div class="cb-panel">Live video is not available right now.</div>'; return;
      }
      if(tab==='saved'){
        title.textContent='Saved videos'; sub.textContent='Videos you saved.';
        box.innerHTML='<div class="cb-panel"><div class="cb-empty-panel">Open Saved from the left menu to view saved posts.</div></div>'; return;
      }
      if(tab==='settings'){
        title.textContent='Video settings'; sub.textContent='Manage video preferences.';
        box.innerHTML='<div class="cb-panel"><div class="cb-empty-panel">Video settings are being prepared.</div></div>'; return;
      }
      const list=tab==='reels'?videos.filter(isReel):videos;
      title.textContent=tab==='reels'?'Reels':'Reels & Videos';
      sub.textContent=tab==='reels'?'Reels published through the Cirklebook Reel editor.':'Published videos and Reels from your Home feed.';
      if(loadError){ box.innerHTML=`<div class="cb-panel"><div class="cb-empty-panel">${esc(loadError)}</div></div>`; return; }
      box.innerHTML=list.length?list.map(reelCard).join(''):`<div class="cb-panel"><div class="cb-empty-panel">${tab==='reels'?'No Reels found yet. Create a Reel first.':'No videos found in your feed.'}</div></div>`;
      box.querySelectorAll('[data-real-reel-act]').forEach(btn=>btn.onclick=async()=>{
        const id=btn.dataset.id, act=btn.dataset.realReelAct;
        try{
          if(act==='like'&&typeof toggleLike==='function') await toggleLike(id,btn);
          else if(act==='share'&&typeof sharePost==='function') await sharePost(id,btn);
          else if(act==='save'&&typeof toggleSave==='function') await toggleSave(id,btn);
          else if(act==='comment') showToast('Open this post from Home to view comments.');
        }catch(e){showToast(e?.message||'Action failed');}
      });
    };

    document.querySelectorAll('[data-real-video-tab]').forEach(b=>b.onclick=()=>render(b.dataset.realVideoTab));
    render(initial);
  }

  window.CirklebookOpenActualVideoHub=openActualVideoHub;

  // Most important part: capture the top navigation BEFORE the old placeholder
  // handler runs, so the real feed-backed hub always opens.
  document.addEventListener('click',function(event){
    const top=event.target.closest('#topVideoBtn');
    if(!top) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    openActualVideoHub('for-you');
  },true);

  console.log('CIRKLEBOOK VIDEO/REELS ACTUAL LOADER CAPTURE FIX READY');
})();

/* =========================================================
   CIRKLEBOOK FACEBOOK-LIKE SHARE SHEET
   Non-destructive extension: keeps existing share backend,
   Story, Post Background, Feed, Profile, Reels, Like, Comment.
========================================================= */
(function cirklebookFacebookShareSheet(){
  'use strict';

  if (typeof sharePost !== 'function' || typeof apiRequest !== 'function') return;
  const baseSharePost = sharePost;

  function escShare(v){
    try { return typeof escapeHtml === 'function' ? escapeHtml(v) : String(v ?? ''); }
    catch(_) { return String(v ?? ''); }
  }

  function toastShare(msg){
    try { if (typeof showToast === 'function') return showToast(msg); } catch(_) {}
    console.log(msg);
  }

  function closeShareSheet(){
    const el = document.getElementById('cbFacebookShareOverlay');
    if (el) el.remove();
  }

  function injectShareStyles(){
    if (document.getElementById('cbFacebookShareStyles')) return;
    const s = document.createElement('style');
    s.id = 'cbFacebookShareStyles';
    s.textContent = `
      .cb-share-overlay{position:fixed;inset:0;z-index:2147483200;background:rgba(0,0,0,.48);display:grid;place-items:center;padding:18px}
      .cb-share-sheet{width:min(520px,96vw);max-height:88vh;overflow:auto;background:#fff;border-radius:14px;box-shadow:0 18px 60px rgba(0,0,0,.28);font-family:Arial,sans-serif}
      .cb-share-head{position:relative;padding:18px 56px;border-bottom:1px solid #ddd;text-align:center;font-size:22px;font-weight:700}
      .cb-share-close{position:absolute;right:14px;top:10px;width:38px;height:38px;border:0;border-radius:50%;background:#e4e6eb;font-size:25px;cursor:pointer}
      .cb-share-body{padding:14px}
      .cb-share-user{display:flex;align-items:center;gap:10px;margin-bottom:12px}
      .cb-share-avatar{width:40px;height:40px;border-radius:50%;display:grid;place-items:center;background:#1877f2;color:#fff;font-weight:700;overflow:hidden}
      .cb-share-avatar img{width:100%;height:100%;object-fit:cover}
      .cb-share-user strong{display:block}
      .cb-share-audience{display:inline-flex;margin-top:3px;padding:4px 8px;border-radius:6px;background:#e4e6eb;font-size:12px;font-weight:700}
      .cb-share-caption{width:100%;min-height:76px;border:0;resize:vertical;font:inherit;font-size:16px;outline:0;padding:8px 2px;box-sizing:border-box}
      .cb-share-now{width:100%;border:0;border-radius:8px;background:#1877f2;color:#fff;font-weight:700;font-size:16px;padding:11px 14px;cursor:pointer}
      .cb-share-now:disabled{opacity:.6;cursor:wait}
      .cb-share-label{font-weight:700;font-size:17px;margin:16px 0 10px}
      .cb-share-options{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
      .cb-share-option{border:0;background:transparent;text-align:center;cursor:pointer;padding:8px 4px;border-radius:10px;font-weight:600}
      .cb-share-option:hover{background:#f0f2f5}
      .cb-share-icon{width:54px;height:54px;margin:0 auto 7px;border-radius:50%;display:grid;place-items:center;background:#e4e6eb;font-size:25px}
      .cb-share-original{border:1px solid #ddd;border-radius:10px;margin-top:12px;overflow:hidden;background:#fff}
      .cb-share-original-head{padding:10px 12px;border-bottom:1px solid #eee}
      .cb-share-original-body{padding:10px 12px;white-space:pre-wrap}
      .cb-share-original img,.cb-share-original video{display:block;width:100%;max-height:260px;object-fit:contain;background:#111}
      .cb-share-group-list{display:grid;gap:8px;margin-top:12px}
      .cb-share-group-btn{display:flex;align-items:center;justify-content:space-between;gap:10px;width:100%;padding:11px;border:1px solid #ddd;background:#fff;border-radius:10px;cursor:pointer;text-align:left}
      .cb-share-group-btn:hover{background:#f0f2f5}
      @media(max-width:560px){.cb-share-options{grid-template-columns:repeat(3,1fr)}.cb-share-sheet{width:100%;max-height:92vh}.cb-share-overlay{padding:8px}}
    `;
    document.head.appendChild(s);
  }

  async function fetchShareSource(postId){
    let currentId = String(postId || '');
    let post = null;
    const seen = new Set();

    try {
      for (let depth=0; depth<12 && currentId && !seen.has(currentId); depth++) {
        seen.add(currentId);
        const r = await apiRequest(`${ROUTES.posts}/${encodeURIComponent(currentId)}`);
        const candidate = r?.data?.post || r?.data || r?.post || r;
        if (!candidate || typeof candidate !== 'object') break;
        post = candidate;
        const nextId = candidate?.shared_post_id || candidate?.sharedPostId || '';
        if (!nextId) break;
        currentId = String(nextId);
      }

      if (post) {
        post.__cbShareRootPostId = String(post.id || currentId || postId);
      }
      return post || null;
    } catch (e) {
      console.warn('SHARE SOURCE LOAD FAILED:', e);
      return null;
    }
  }

  function sourceMedia(post){
    const a = post?.media || post?.mediaAssets || post?.media_assets || [];
    return Array.isArray(a) ? a : (a ? [a] : []);
  }

  function mediaUrl(item){
    try { if (typeof buildMediaUrl === 'function') return buildMediaUrl(item) || ''; } catch(_) {}
    return item?.url || item?.media_url || item?.mediaUrl || item?.public_url || item?.publicUrl || item?.signed_url || '';
  }

  function mediaKind(item){
    const t = String(item?.media_type || item?.mediaType || item?.type || item?.mime_type || item?.mimeType || '').toLowerCase();
    return t.includes('video') ? 'video' : 'image';
  }

  function currentShareUser(){
    const u = (typeof state !== 'undefined' && state?.currentUser) ? state.currentUser : {};
    const name = u?.display_name || u?.displayName || u?.username || document.getElementById('topUsername')?.textContent || 'Cirklebook user';
    const avatar = u?.avatar_url || u?.avatarUrl || '';
    return { name:String(name||'Cirklebook user').trim(), avatar };
  }

  function renderOriginalPreview(post){
    if (!post) return '<div class="cb-share-original"><div class="cb-share-original-body">Original post will be attached when shared.</div></div>';
    const name = (()=>{try{return typeof getPostAuthorName==='function'?getPostAuthorName(post):(post?.display_name||post?.username||'Cirklebook user');}catch(_){return post?.display_name||post?.username||'Cirklebook user';}})();
    const body = post?.body || post?.caption || '';
    const first = sourceMedia(post)[0];
    const url = first ? mediaUrl(first) : '';
    const media = url ? (mediaKind(first)==='video'
      ? `<video src="${escShare(url)}" controls playsinline preload="metadata"></video>`
      : `<img src="${escShare(url)}" alt="Original post media">`) : '';
    return `<div class="cb-share-original"><div class="cb-share-original-head"><strong>${escShare(name)}</strong><div style="font-size:12px;color:#65676b">Original post</div></div>${body?`<div class="cb-share-original-body">${escShare(body)}</div>`:''}${media}</div>`;
  }

  async function copyPostLink(postId){
    const url = `${location.origin}${location.pathname}?post=${encodeURIComponent(postId)}`;
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(url);
      else {
        const t=document.createElement('textarea');t.value=url;document.body.appendChild(t);t.select();document.execCommand('copy');t.remove();
      }
      toastShare('Post link copied');
      closeShareSheet();
    } catch(e) {
      toastShare('Unable to copy link');
    }
  }

  async function shareToStory(postId, post){
    const first = sourceMedia(post)[0] || null;
    const storyPayload = {
      postId,
      caption: String(post?.body || post?.caption || '').slice(0,500),
      audience: 'public'
    };
    const mediaId = first?.id || first?.media_asset_id || first?.mediaAssetId;
    if (mediaId) storyPayload.mediaAssetId = String(mediaId);
    const url = first ? mediaUrl(first) : '';
    if (url) storyPayload.mediaUrl = url;
    const mime = first?.mime_type || first?.mimeType;
    if (mime) storyPayload.mime = mime;

    try {
      await apiRequest('/stories',{method:'POST',body:JSON.stringify(storyPayload)});
    } catch(e) {
      if (![404,405].includes(Number(e?.status))) throw e;
      const localStory={type:'media',text:storyPayload.caption,mediaUrl:url,mime:mime||'',audience:'public',postId,createdAt:Date.now(),expiresAt:Date.now()+86400000};
      localStorage.setItem('cirklebook_local_story_v1',JSON.stringify(localStory));
    }
    try { window.CirklebookRefreshStories?.(); } catch(_) {}
    closeShareSheet();
    toastShare('Shared to your story');
  }

  async function loadMyGroups(){
    let r;
    try { r = await apiRequest('/groups/mine'); }
    catch(_) { r = await apiRequest('/groups'); }
    const arr = r?.data?.groups || r?.groups || r?.data || [];
    return Array.isArray(arr) ? arr : [];
  }

  function saveLocalGroupShare(groupId, entry){
    const key=`cirklebook_group_shared_posts_${groupId}`;
    let a=[];
    try { a=JSON.parse(localStorage.getItem(key)||'[]'); if(!Array.isArray(a)) a=[]; } catch(_) { a=[]; }
    if(!a.some(x=>String(x.postId)===String(entry.postId))) a.unshift(entry);
    try { localStorage.setItem(key,JSON.stringify(a.slice(0,30))); } catch(_) {}
  }

  async function performGroupShare(group, postId, post){
    const groupId = group?.id || group?.groupId || group?.group_id;
    if (!groupId) throw new Error('Group ID is missing.');
    const first = sourceMedia(post)[0] || null;
    const entry = {
      postId,
      title: post?.body || post?.caption || 'Shared post',
      caption: post?.body || post?.caption || '',
      mediaUrl: first ? mediaUrl(first) : '',
      mediaType: first ? mediaKind(first) : '',
      createdAt: Date.now(),
      originalAuthor: (()=>{try{return typeof getPostAuthorName==='function'?getPostAuthorName(post):(post?.display_name||post?.username||'Cirklebook user');}catch(_){return post?.display_name||post?.username||'Cirklebook user';}})()
    };

    // IMPORTANT: sharing an EXISTING post must use the dedicated group share route.
    // /groups/:groupId/posts is only for creating a NEW group post.
    let last=null;
    const attempts = [
      [`/groups/${encodeURIComponent(groupId)}/share`, {postId}],
      [ROUTES.share(postId), {groupId}]
    ];
    for (const [path,body] of attempts) {
      try {
        await apiRequest(path,{method:'POST',body:JSON.stringify(body)});
        saveLocalGroupShare(groupId,{...entry,serverShared:true});
        closeShareSheet();
        toastShare(`Shared to ${group?.name || 'group'}`);
        return true;
      } catch(e) {
        last=e;
        if(![400,404,405,409].includes(Number(e?.status))) break;
      }
    }
    console.warn('GROUP SHARE FAILED:',last);
    throw last || new Error('Unable to share to group.');
  }

  async function openGroupPicker(postId, post){
    const sheet=document.querySelector('#cbFacebookShareOverlay .cb-share-sheet');
    if(!sheet) return;
    sheet.innerHTML=`<div class="cb-share-head">Share to group<button class="cb-share-close" type="button" data-share-close>&times;</button></div><div class="cb-share-body"><div id="cbShareGroupList" class="cb-share-group-list"><div style="padding:18px;text-align:center;color:#65676b">Loading your groups...</div></div></div>`;
    sheet.querySelector('[data-share-close]')?.addEventListener('click',closeShareSheet);
    const box=sheet.querySelector('#cbShareGroupList');
    try {
      const groups=await loadMyGroups();
      if(!groups.length){ box.innerHTML='<div style="padding:18px;text-align:center;color:#65676b">No groups found.</div>'; return; }
      box.innerHTML=groups.map((g,i)=>`<button type="button" class="cb-share-group-btn" data-share-group="${i}"><span><strong>${escShare(g?.name||'Group')}</strong><br><small>${escShare(g?.privacy||g?.visibility||'')}</small></span><span>Share</span></button>`).join('');
      box.querySelectorAll('[data-share-group]').forEach(btn=>btn.addEventListener('click',async()=>{
        btn.disabled=true;
        try { await performGroupShare(groups[Number(btn.dataset.shareGroup)],postId,post); }
        catch(e){ btn.disabled=false; toastShare(e?.message||'Unable to share to group'); }
      }));
    } catch(e) { box.innerHTML=`<div style="padding:18px;text-align:center;color:#b42318">${escShare(e?.message||'Unable to load groups.')}</div>`; }
  }

  async function openShareSheet(postId, button){
    injectShareStyles();
    closeShareSheet();
    const post=await fetchShareSource(postId);
    const rootPostId = String(post?.__cbShareRootPostId || post?.id || postId);
    const me=currentShareUser();
    const overlay=document.createElement('div');
    overlay.id='cbFacebookShareOverlay';
    overlay.className='cb-share-overlay';
    overlay.innerHTML=`
      <section class="cb-share-sheet" role="dialog" aria-modal="true" aria-label="Share post">
        <div class="cb-share-head">Share<button class="cb-share-close" type="button" data-share-close>&times;</button></div>
        <div class="cb-share-body">
          <div class="cb-share-user"><div class="cb-share-avatar">${me.avatar?`<img src="${escShare(me.avatar)}" alt="">`:escShare(me.name.charAt(0).toUpperCase())}</div><div><strong>${escShare(me.name)}</strong><span class="cb-share-audience">🌐 Public</span></div></div>
          <textarea class="cb-share-caption" id="cbShareCaption" placeholder="Say something about this..."></textarea>
          ${renderOriginalPreview(post)}
          <div style="margin-top:12px"><button type="button" class="cb-share-now" id="cbShareNow">Share now</button></div>
          <div class="cb-share-label">Share to</div>
          <div class="cb-share-options">
            <button type="button" class="cb-share-option" id="cbShareStory"><span class="cb-share-icon">◉</span>Your story</button>
            <button type="button" class="cb-share-option" id="cbShareCopy"><span class="cb-share-icon">🔗</span>Copy link</button>
            <button type="button" class="cb-share-option" id="cbShareGroup"><span class="cb-share-icon">👥</span>Group</button>
          </div>
        </div>
      </section>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click',e=>{if(e.target===overlay)closeShareSheet();});
    overlay.querySelector('[data-share-close]')?.addEventListener('click',closeShareSheet);
    const now=overlay.querySelector('#cbShareNow');
    now?.addEventListener('click',async()=>{
      now.disabled=true;
      try {
        // Keep the already-tested Cirklebook feed-share path unchanged.
        await baseSharePost(rootPostId, button);
        closeShareSheet();
      } catch(e) { now.disabled=false; toastShare(e?.message||'Unable to share post'); }
    });
    overlay.querySelector('#cbShareStory')?.addEventListener('click',async e=>{
      e.currentTarget.disabled=true;
      try{await shareToStory(rootPostId,post);}catch(err){e.currentTarget.disabled=false;toastShare(err?.message||'Unable to share to story');}
    });
    overlay.querySelector('#cbShareCopy')?.addEventListener('click',()=>copyPostLink(rootPostId));
    overlay.querySelector('#cbShareGroup')?.addEventListener('click',()=>openGroupPicker(rootPostId,post));
  }

  sharePost = async function(postId, button){
    try { await openShareSheet(postId,button); }
    catch(e){ console.error('SHARE SHEET ERROR:',e); toastShare(e?.message||'Unable to open Share'); }
  };

  // IMPORTANT: several older Cirklebook handlers are registered on the feed container.
  // Capture Share before any legacy handler can immediately submit the share.
  document.addEventListener('click', function cirklebookShareCapture(event){
    const button = event.target.closest('[data-action="share"]');
    if (!button) return;
    const postId = button.dataset.postId || button.closest('[data-post]')?.dataset.post || '';
    if (!postId) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    openShareSheet(postId, button).catch((e)=>{
      console.error('SHARE CAPTURE ERROR:', e);
      toastShare(e?.message || 'Unable to open Share');
    });
  }, true);

  // Make copied ?post=<id> links useful on Cirklebook: load feed and scroll to the post if present.
  window.addEventListener('load',()=>{
    try{
      const id=new URLSearchParams(location.search).get('post');
      if(!id) return;
      setTimeout(()=>{
        const el=document.querySelector(`[data-post="${CSS.escape(id)}"]`);
        if(el){el.scrollIntoView({behavior:'smooth',block:'center'});el.style.boxShadow='0 0 0 3px #1877f2';setTimeout(()=>{el.style.boxShadow='';},2200);}
      },1200);
    }catch(_){}
  });

  console.log('CIRKLEBOOK FACEBOOK-LIKE SHARE SHEET READY');
})();


/* === GROUP COVER CLICK FAILSAFE V2 ===
   Last-resort delegated handler so re-renders or later handlers cannot make
   Edit cover photo unresponsive. It does not touch the working profile logo.
*/
document.addEventListener('click',function(e){
  const btn=e.target.closest('#manageGroupCoverBtn');
  if(!btn) return;
  const input=document.getElementById('manageGroupCoverInput');
  if(!input) return;
  e.preventDefault();
  e.stopImmediatePropagation();
  input.value='';
  input.click();
},true);


/* === PAGE COVER CLICK FAILSAFE ===
   Mirrors the proven Group cover fix while leaving all Group handlers intact.
*/
document.addEventListener('click',function(e){
  const btn=e.target.closest('#managePageCoverBtn');
  if(!btn) return;
  const input=document.getElementById('managePageCoverInput');
  if(!input) return;
  e.preventDefault();
  e.stopImmediatePropagation();
  input.value='';
  input.click();
},true);




/* PAGE MANAGER REAL TABS - safe JS style injection */
(function(){
  if (document.getElementById('cbPageManagerTabsStyle')) return;
  const s = document.createElement('style');
  s.id = 'cbPageManagerTabsStyle';
  s.textContent = `
    #managePageTabs{display:flex;align-items:center;gap:4px;flex-wrap:wrap}
    #managePageTabs .cb-page-tab{
      appearance:none;border:0;background:transparent;padding:10px 9px;
      font:inherit;font-weight:600;cursor:pointer;border-radius:8px;color:inherit
    }
    #managePageTabs .cb-page-tab:hover{background:#f0f2f5}
    #managePageTabs .cb-page-tab.active{color:#0866ff;background:#e7f3ff}
  `;
  document.head.appendChild(s);
})();


/* GROUP MANAGER REAL TABS - safe JS style injection */
(function(){
  if(document.getElementById('cbGroupManagerTabsStyle')) return;
  const s=document.createElement('style');
  s.id='cbGroupManagerTabsStyle';
  s.textContent=`
    #manageGroupTabs{display:flex;align-items:center;gap:4px;flex-wrap:wrap}
    #manageGroupTabs .cb-group-tab{
      appearance:none;border:0;background:transparent;padding:10px 9px;
      font:inherit;font-weight:600;cursor:pointer;border-radius:8px;color:inherit
    }
    #manageGroupTabs .cb-group-tab:hover{background:#f0f2f5}
    #manageGroupTabs .cb-group-tab.active{color:#0866ff;background:#e7f3ff}
  `;
  document.head.appendChild(s);
})();


/* PROFILE LOCK MENU - safe style injection */
(function(){
  if(document.getElementById('cbProfileLockStyle')) return;
  const s=document.createElement('style');
  s.id='cbProfileLockStyle';
  s.textContent=`
    .cb-profile-lock-card{padding:0!important;overflow:hidden}
    .cb-profile-lock-menu{
      width:100%;border:0;background:#fff;display:flex;align-items:center;gap:12px;
      text-align:left;padding:14px 16px;cursor:pointer;font:inherit
    }
    .cb-profile-lock-menu:hover{background:#f0f2f5}
    .cb-profile-lock-menu .cb-profile-lock-icon{
      width:38px;height:38px;border-radius:50%;display:flex;align-items:center;
      justify-content:center;background:#e7f3ff;font-size:19px;flex:0 0 38px
    }
    .cb-profile-lock-menu strong{display:block;font-size:15px}
    .cb-profile-lock-menu small{display:block;color:#65676b;margin-top:2px}
  `;
  document.head.appendChild(s);
})();


/* =========================================================
   PROFILE HEADER LAYOUT CORRECTION
   Facebook-style: profile identity stays below the cover.
   Existing profile/cover/edit/lock/features remain untouched.
========================================================= */
(function(){
  if (document.getElementById('cbProfileHeaderFacebookLayoutFix')) return;

  const style = document.createElement('style');
  style.id = 'cbProfileHeaderFacebookLayoutFix';
  style.textContent = `
    /* Keep the hero/card structure stable */
    .cb-profile-page-final .cb-profile-hero-final{
      overflow: visible !important;
      background:#fff !important;
    }

    /* Cover remains a separate area */
    .cb-profile-page-final .profile-cover{
      position:relative !important;
      width:100% !important;
      margin:0 !important;
      border-radius:0 0 8px 8px !important;
      overflow:hidden !important;
      background-position:center !important;
      background-size:cover !important;
    }

    /* Cover edit button stays inside the cover only */
    .cb-profile-page-final .profile-cover-edit{
      position:absolute !important;
      right:16px !important;
      bottom:16px !important;
      top:auto !important;
      left:auto !important;
      z-index:6 !important;
    }

    /*
      Critical fix:
      Header starts AFTER the cover.
      Only the avatar overlaps the cover edge.
      Name/bio/details/actions never sit inside the cover.
    */
    .cb-profile-page-final .cb-profile-head-final{
      position:relative !important;
      z-index:4 !important;
      display:grid !important;
      grid-template-columns:132px minmax(0,1fr) auto !important;
      column-gap:18px !important;
      align-items:end !important;
      box-sizing:border-box !important;
      width:100% !important;
      min-height:118px !important;
      margin:0 !important;
      padding:18px 24px 16px !important;
      background:#fff !important;
      transform:none !important;
      top:auto !important;
      left:auto !important;
      right:auto !important;
      bottom:auto !important;
    }

    /* Avatar overlaps only the cover boundary, like Facebook */
    .cb-profile-page-final .profile-avatar-wrap{
      position:relative !important;
      align-self:start !important;
      width:132px !important;
      height:132px !important;
      margin-top:-68px !important;
      margin-left:0 !important;
      transform:none !important;
      top:auto !important;
      left:auto !important;
      z-index:7 !important;
    }

    .cb-profile-page-final .profile-big-avatar{
      display:block !important;
      width:132px !important;
      height:132px !important;
      min-width:132px !important;
      min-height:132px !important;
      max-width:132px !important;
      max-height:132px !important;
      object-fit:cover !important;
      border-radius:50% !important;
      border:4px solid #fff !important;
      box-sizing:border-box !important;
      margin:0 !important;
      transform:none !important;
    }

    .cb-profile-page-final .profile-avatar-edit{
      position:absolute !important;
      right:3px !important;
      bottom:3px !important;
      top:auto !important;
      left:auto !important;
      z-index:8 !important;
    }

    /* Identity block stays fully in the white header */
    .cb-profile-page-final .profile-title{
      position:relative !important;
      display:block !important;
      min-width:0 !important;
      margin:0 !important;
      padding:0 0 2px !important;
      transform:none !important;
      top:auto !important;
      left:auto !important;
      right:auto !important;
      bottom:auto !important;
      color:#050505 !important;
      z-index:5 !important;
    }

    .cb-profile-page-final .profile-title h1{
      margin:0 0 4px !important;
      padding:0 !important;
      line-height:1.12 !important;
      color:#050505 !important;
    }

    .cb-profile-page-final .cb-profile-counts{
      margin:0 0 5px !important;
      color:#65676b !important;
    }

    .cb-profile-page-final .profile-title p{
      margin:4px 0 !important;
      color:#050505 !important;
      line-height:1.35 !important;
    }

    .cb-profile-page-final .cb-profile-pinned-details{
      display:flex !important;
      flex-wrap:wrap !important;
      gap:6px 12px !important;
      margin-top:4px !important;
      color:#4b4f56 !important;
    }

    /* Dashboard/Edit buttons sit beside the profile information, below cover */
    .cb-profile-page-final .profile-actions{
      position:relative !important;
      display:flex !important;
      align-items:center !important;
      justify-content:flex-end !important;
      align-self:end !important;
      gap:8px !important;
      margin:0 !important;
      padding:0 0 2px !important;
      transform:none !important;
      top:auto !important;
      left:auto !important;
      right:auto !important;
      bottom:auto !important;
      z-index:5 !important;
    }

    /* Tabs remain beneath the identity header */
    .cb-profile-page-final .cb-profile-tabs-final{
      position:relative !important;
      clear:both !important;
      margin:0 24px !important;
      padding-top:0 !important;
      border-top:1px solid #dddfe2 !important;
      background:#fff !important;
      transform:none !important;
      top:auto !important;
    }

    /* Desktop spacing closer to Facebook */
    @media (min-width:901px){
      .cb-profile-page-final .profile-cover{
        min-height:300px !important;
      }
    }

    /* Responsive: keep identity readable and never place it on the cover */
    @media (max-width:900px){
      .cb-profile-page-final .cb-profile-head-final{
        grid-template-columns:112px minmax(0,1fr) !important;
        row-gap:10px !important;
        padding:16px !important;
      }

      .cb-profile-page-final .profile-avatar-wrap{
        width:112px !important;
        height:112px !important;
        margin-top:-56px !important;
      }

      .cb-profile-page-final .profile-big-avatar{
        width:112px !important;
        height:112px !important;
        min-width:112px !important;
        min-height:112px !important;
        max-width:112px !important;
        max-height:112px !important;
      }

      .cb-profile-page-final .profile-actions{
        grid-column:1 / -1 !important;
        justify-content:flex-start !important;
        flex-wrap:wrap !important;
      }

      .cb-profile-page-final .cb-profile-tabs-final{
        margin:0 16px !important;
        overflow-x:auto !important;
        white-space:nowrap !important;
      }
    }

    @media (max-width:600px){
      .cb-profile-page-final .cb-profile-head-final{
        display:flex !important;
        flex-direction:column !important;
        align-items:center !important;
        text-align:center !important;
        padding:16px !important;
      }

      .cb-profile-page-final .profile-avatar-wrap{
        margin-top:-64px !important;
      }

      .cb-profile-page-final .cb-profile-pinned-details,
      .cb-profile-page-final .profile-actions{
        justify-content:center !important;
      }

      .cb-profile-page-final .profile-cover-edit{
        right:10px !important;
        bottom:10px !important;
      }
    }
  `;

  document.head.appendChild(style);
})();


/* =========================================================
   PROFILE LEFT COLUMN SCROLL FIX
   Keeps all existing profile/group/page/friends/etc. logic untouched.
========================================================= */
(function(){
  if (document.getElementById('cbProfileLeftColumnScrollFix')) return;

  const style = document.createElement('style');
  style.id = 'cbProfileLeftColumnScrollFix';
  style.textContent = `
    /* Desktop: left profile menu gets its own vertical scroll area */
    @media (min-width: 901px){
      .cb-profile-page-final .cb-profile-left-column{
        position: sticky !important;
        top: 82px !important;
        align-self: start !important;
        max-height: calc(100vh - 96px) !important;
        overflow-y: auto !important;
        overflow-x: hidden !important;
        overscroll-behavior: contain !important;
        padding-right: 4px !important;
        scrollbar-gutter: stable !important;
      }

      .cb-profile-page-final .cb-profile-left-column::-webkit-scrollbar{
        width: 8px !important;
      }

      .cb-profile-page-final .cb-profile-left-column::-webkit-scrollbar-thumb{
        background: rgba(0,0,0,.22) !important;
        border-radius: 10px !important;
      }

      .cb-profile-page-final .cb-profile-left-column::-webkit-scrollbar-track{
        background: transparent !important;
      }
    }

    /* Mobile/tablet: keep normal document scrolling */
    @media (max-width: 900px){
      .cb-profile-page-final .cb-profile-left-column{
        position: static !important;
        max-height: none !important;
        overflow: visible !important;
        padding-right: 0 !important;
      }
    }
  `;
  document.head.appendChild(style);
})();


/* =========================================================
   TOP NAV VIDEO -> REELS ICON/LABEL CORRECTION
   UI-only patch. Existing click handlers/routes/features remain untouched.
========================================================= */
(function cirklebookTopNavReelsIconCorrection(){
  'use strict';

  const REELS_ICON = './assets/Reels_icon.png';

  function applyReelsTopNav(){
    const candidates = [
      document.getElementById('topVideoBtn'),
      document.getElementById('videoNavBtn'),
      document.getElementById('topReelsBtn'),
      ...document.querySelectorAll(
        'header [title="Video"], header [aria-label="Video"], nav [title="Video"], nav [aria-label="Video"], [data-view="video"], [data-page="video"], [data-nav="video"]'
      )
    ].filter(Boolean);

    const seen = new Set();
    for (const el of candidates) {
      if (seen.has(el)) continue;
      seen.add(el);

      // Change only the visible name/accessibility label; do not replace the element.
      if (el.getAttribute('title') === 'Video') el.setAttribute('title', 'Reels');
      if (el.getAttribute('aria-label') === 'Video') el.setAttribute('aria-label', 'Reels');

      const img = el.tagName === 'IMG' ? el : el.querySelector('img');
      if (img) {
        img.src = REELS_ICON;
        img.alt = 'Reels';
        img.title = 'Reels';
        img.style.objectFit = 'contain';
      }

      // Update a text label only when the element already contains a dedicated label.
      const labels = el.querySelectorAll('.label, .nav-label, .menu-label, span');
      labels.forEach(label => {
        if ((label.textContent || '').trim() === 'Video') label.textContent = 'Reels';
      });
    }

    // Fallback for the known top-center nav: find an image/button whose tooltip/text is Video.
    document.querySelectorAll('header button, header a, nav button, nav a').forEach(el => {
      const t = (el.textContent || '').trim();
      const title = (el.getAttribute('title') || '').trim();
      const aria = (el.getAttribute('aria-label') || '').trim();
      const img = el.querySelector('img');
      const alt = (img?.alt || '').trim();

      if (t === 'Video' || title === 'Video' || aria === 'Video' || alt === 'Video') {
        if (img) {
          img.src = REELS_ICON;
          img.alt = 'Reels';
          img.title = 'Reels';
          img.style.objectFit = 'contain';
        }
        if (title === 'Video') el.title = 'Reels';
        if (aria === 'Video') el.setAttribute('aria-label','Reels');
        [...el.querySelectorAll('span')].forEach(s => {
          if ((s.textContent || '').trim() === 'Video') s.textContent = 'Reels';
        });
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyReelsTopNav, {once:true});
  } else {
    applyReelsTopNav();
  }

  // Re-apply after SPA rerenders without changing any existing handlers.
  const observer = new MutationObserver(() => applyReelsTopNav());
  observer.observe(document.documentElement, {childList:true, subtree:true});
})();

/* =========================================================
   FACEBOOK-STYLE POST MANAGEMENT — shared by Home/Profile/Page/Group
========================================================= */
(function cirklebookPostManagementFinal(){
  'use strict';
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const pinKey='cirklebook_pinned_posts_v1';
  const pins=()=>{try{const a=JSON.parse(localStorage.getItem(pinKey)||'[]');return Array.isArray(a)?a.map(String):[]}catch(_){return[]}};
  const setPins=a=>localStorage.setItem(pinKey,JSON.stringify([...new Set(a.map(String))]));

  function closeMenus(except){document.querySelectorAll('.cb-post-menu:not(.hidden)').forEach(m=>{if(m!==except)m.classList.add('hidden')});}
  function applyPins(root=document){
    const ids=pins();
    root.querySelectorAll?.('.post').forEach(card=>card.classList.toggle('cb-post-pinned',ids.includes(String(card.dataset.post||''))));
    root.querySelectorAll?.('#feedContainer,.cb-profile-post-list,#managePagePosts,#manageGroupPosts').forEach(box=>{
      const posts=[...box.children].filter(x=>x.classList?.contains('post'));
      const pinned=posts.filter(x=>x.classList.contains('cb-post-pinned'));
      // Moving an already-first pinned post would fire the observer forever and
      // freeze Chrome. Reorder only when the visible order actually needs it.
      const alreadyFirst=pinned.every((card,index)=>posts[index]===card);
      if(!alreadyFirst)pinned.slice().reverse().forEach(card=>box.prepend(card));
    });
  }

  async function editPost(id,card){
    const showDialog=window.CirklebookShowDialog;
    if(typeof showDialog!=='function')throw new Error('Edit dialog is unavailable. Please refresh the page.');
    showDialog('Edit Post','<div class="cb-edit-post-loading">Loading your complete post…</div>');
    let post;
    try{
      const response=await apiRequest(`/posts/${encodeURIComponent(id)}`);
      post=response?.data?.post||response?.data?.data||response?.data||response?.post||response;
    }catch(error){
      window.CirklebookCloseDialog?.();throw error;
    }
    const oldBody=String(post?.body??'');
    const oldVisibility=String(post?.visibility||'public');
    const oldLanguage=String(post?.content_language_code||post?.contentLanguageCode||'');
    let keptMedia=(Array.isArray(post?.media)?post.media:[]).map(item=>({
      item,
      id:String(item.media_asset_id||item.mediaAssetId||item.id||''),
      url:(typeof buildMediaUrl==='function'?buildMediaUrl(item):'')||item.url||item.media_url||'',
      type:String(item.media_type||item.mediaType||item.mime_type||'').toLowerCase().includes('video')?'video':'image'
    })).filter(item=>item.id);
    let addedFiles=[];
    showDialog('Edit Post',`<div class="cb-edit-post-dialog">
      <div class="cb-edit-post-owner"><span>${esc((state.currentUser?.displayName||state.currentUser?.display_name||state.currentUser?.username||'U').charAt(0).toUpperCase())}</span><div><b>${esc(state.currentUser?.displayName||state.currentUser?.display_name||state.currentUser?.username||'Cirklebook user')}</b><select id="cbEditPostVisibility"><option value="public" ${oldVisibility==='public'?'selected':''}>🌐 Public</option><option value="friends" ${oldVisibility==='friends'?'selected':''}>👥 Friends</option><option value="only_me" ${oldVisibility==='only_me'?'selected':''}>🔒 Only me</option></select></div></div>
      <textarea id="cbEditPostBody" rows="5" maxlength="10000" placeholder="What's on your mind?">${esc(oldBody)}</textarea>
      <div id="cbEditExistingMedia" class="cb-edit-media-grid"></div>
      <div class="cb-edit-post-tools"><b>Add to your post</b><label class="cb-edit-add-media">🖼️ Add photos/videos<input id="cbEditPostMedia" type="file" accept="image/*,video/*" multiple hidden></label><select id="cbEditPostLanguage"><option value="" ${!oldLanguage?'selected':''}>Language: Auto</option><option value="en" ${oldLanguage==='en'?'selected':''}>English</option><option value="bn" ${oldLanguage==='bn'?'selected':''}>বাংলা</option><option value="ar" ${oldLanguage==='ar'?'selected':''}>العربية</option></select></div>
      <div id="cbEditPostMsg" class="message hidden"></div><button id="cbEditPostSave" type="button" class="primary-button">Save changes</button>
    </div>`);
    const input=document.getElementById('cbEditPostMedia'),preview=document.getElementById('cbEditExistingMedia');
    const paint=()=>{
      const existing=keptMedia.map((media,index)=>`<div class="cb-edit-media-item"><button type="button" data-remove-existing="${index}" aria-label="Remove media">×</button>${media.type==='video'?`<video src="${esc(media.url)}" controls playsinline preload="metadata"></video>`:`<img src="${esc(media.url)}" alt="Post media">`}</div>`).join('');
      const added=addedFiles.map((file,index)=>{const url=file.__preview||(file.__preview=URL.createObjectURL(file));return `<div class="cb-edit-media-item"><button type="button" data-remove-added="${index}" aria-label="Remove new media">×</button>${file.type.startsWith('video/')?`<video src="${esc(url)}" controls playsinline></video>`:`<img src="${esc(url)}" alt="New media">`}</div>`}).join('');
      preview.innerHTML=existing+added||'<div class="cb-edit-no-media">No photo or video attached.</div>';
      preview.querySelectorAll('[data-remove-existing]').forEach(button=>button.onclick=()=>{keptMedia.splice(Number(button.dataset.removeExisting),1);paint();});
      preview.querySelectorAll('[data-remove-added]').forEach(button=>button.onclick=()=>{const removed=addedFiles.splice(Number(button.dataset.removeAdded),1)[0];if(removed?.__preview)URL.revokeObjectURL(removed.__preview);paint();});
    };
    input.onchange=()=>{addedFiles.push(...Array.from(input.files||[]));if(keptMedia.length+addedFiles.length>10){addedFiles=addedFiles.slice(0,Math.max(0,10-keptMedia.length));showToast('A post can contain at most 10 media items');}input.value='';paint();};
    paint();
    document.getElementById('cbEditPostSave').onclick=async()=>{
      const btn=document.getElementById('cbEditPostSave'),body=document.getElementById('cbEditPostBody').value.trim();
      if(!body&&keptMedia.length+addedFiles.length===0){showToast('Keep some text, a photo or a video in the post.');return;}
      btn.disabled=true;btn.textContent='Saving...';
      try{
        const uploaded=[];
        for(const file of addedFiles){const result=await uploadMedia(file);const media=result?.data?.media||result?.data||result?.media||result;const mediaId=media?.id||media?.media_asset_id||media?.mediaAssetId;if(!mediaId)throw new Error('Uploaded media ID was not returned');uploaded.push(String(mediaId));}
        const finalMediaIds=[...keptMedia.map(media=>media.id),...uploaded];
        const updatePayload={body,visibility:document.getElementById('cbEditPostVisibility').value,contentLanguageCode:document.getElementById('cbEditPostLanguage').value||null};
        if(finalMediaIds.length){
          await apiRequest(`/posts/${encodeURIComponent(id)}/media`,{method:'PUT',body:JSON.stringify({mediaAssetIds:finalMediaIds})});
          await apiRequest(`/posts/${encodeURIComponent(id)}`,{method:'PATCH',body:JSON.stringify(updatePayload)});
        }else{
          await apiRequest(`/posts/${encodeURIComponent(id)}`,{method:'PATCH',body:JSON.stringify(updatePayload)});
          await apiRequest(`/posts/${encodeURIComponent(id)}/media`,{method:'PUT',body:JSON.stringify({mediaAssetIds:[]})});
        }
        window.CirklebookCloseDialog?.();showToast('Post updated');
        if(typeof loadFeed==='function')await loadFeed();
      }catch(e){const m=document.getElementById('cbEditPostMsg');m.textContent=e.message||'Unable to edit post';m.classList.remove('hidden');btn.disabled=false;btn.textContent='Save changes';}
    };
  }

  document.addEventListener('click',async event=>{
    const trigger=event.target.closest('[data-post-menu-trigger]');
    if(trigger){event.preventDefault();event.stopPropagation();const menu=trigger.closest('.post')?.querySelector('.cb-post-menu')||document.querySelector(`[data-post-menu="${CSS.escape(trigger.dataset.postMenuTrigger)}"]`);const opening=menu?.classList.contains('hidden');closeMenus(menu);if(opening)menu?.classList.remove('hidden');return;}
    const option=event.target.closest('[data-post-option]');
    if(!option){if(!event.target.closest('.cb-post-menu'))closeMenus();return;}
    event.preventDefault();event.stopPropagation();closeMenus();
    const id=option.dataset.postId,action=option.dataset.postOption,card=option.closest('.post')||document.querySelector(`.post[data-post="${CSS.escape(id)}"]`);
    try{
      if(action==='pin'){const a=pins(),on=a.includes(id);setPins(on?a.filter(x=>x!==id):[id,...a]);applyPins();showToast(on?'Post unpinned':'Post pinned');}
      else if(action==='save'){
        const wasSaved=state.savedPosts.has(id);
        await toggleSave(id,option);
        const isSaved=state.savedPosts.has(id);
        option.querySelector('span')&&(option.querySelector('span').textContent=isSaved?'Remove from saved':'Save Post');
        const savedPanel=document.getElementById('cbPanelTitle')?.textContent?.trim()==='Saved';
        if(wasSaved&&!isSaved&&savedPanel){card?.remove();showToast('Removed from your Saved posts. Original post was not deleted.');}
      }
      else if(action==='edit'){await editPost(id,card);}
      else if(action==='delete'){if(confirm('Delete this post permanently?')){await apiRequest(`/posts/${encodeURIComponent(id)}`,{method:'DELETE'});card?.remove();showToast('Post deleted');}}
      else if(action==='boost'){openAdsBuilder('Engagement',id);}
      else if(action==='report'){openReport(id);}
      else if(action==='copy'){const link=`${location.origin}${location.pathname}?post=${encodeURIComponent(id)}`;if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(link);else prompt('Copy post link',link);showToast('Post link copied');}
    }catch(e){showToast(e.message||'Post action failed');}
  },true);

  const style=document.createElement('style');style.id='cbPostManagementFinalCss';style.textContent=`
    .post-header .cb-post-menu-trigger{margin-left:auto;align-self:flex-start;border:0;background:transparent;width:38px;height:38px;border-radius:50%;font-size:20px;font-weight:800;cursor:pointer;letter-spacing:1px}.post-header .cb-post-menu-trigger:hover{background:#f0f2f5}
    .cb-post-menu{position:absolute;right:10px;top:48px;z-index:100;width:230px;background:#fff;border:1px solid #e1e4e8;border-radius:12px;padding:8px;box-shadow:0 8px 28px rgba(0,0,0,.2)}.cb-post-menu.hidden{display:none!important}.cb-post-menu button{width:100%;border:0;background:#fff;border-radius:8px;padding:11px 12px;display:flex;gap:11px;align-items:center;text-align:left;font-weight:700;cursor:pointer}.cb-post-menu button:hover{background:#f0f2f5}.cb-post-menu button.danger{color:#b42318}
    .cb-post-boost-row{border-top:1px solid #e4e6eb;padding:8px 12px 4px;display:flex;justify-content:flex-end}.cb-post-boost-row button{width:auto;min-width:132px;border:0;border-radius:8px;background:#e7f3ff;color:#1877f2;font-weight:700;padding:9px 18px;cursor:pointer}
    .post-actions.cb-standard-post-actions{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;padding:4px 8px 8px!important;gap:3px!important}.post-actions.cb-standard-post-actions button{width:100%!important;border:0!important;background:transparent!important;border-radius:7px!important;padding:9px 3px!important;font-weight:700!important}.post-actions.cb-standard-post-actions button:hover{background:#f0f2f5!important}
    .cb-post-pinned{box-shadow:0 0 0 2px #1877f2 inset!important}.cb-edit-post-loading{padding:42px;text-align:center;color:#65676b}.cb-edit-post-dialog{display:grid;gap:14px}.cb-edit-post-owner{display:flex;align-items:center;gap:10px}.cb-edit-post-owner>span{width:44px;height:44px;border-radius:50%;display:grid;place-items:center;background:#1877f2;color:#fff;font-size:20px;font-weight:800}.cb-edit-post-owner b{display:block}.cb-edit-post-owner select{margin-top:4px;border:0;border-radius:6px;background:#e4e6eb;padding:5px 8px;font-weight:700}.cb-edit-post-dialog>textarea{box-sizing:border-box;width:100%;padding:11px;border:0;resize:vertical;font:inherit;font-size:18px;outline:0}.cb-edit-media-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:4px;border-radius:10px;overflow:hidden}.cb-edit-media-item{position:relative;min-height:160px;background:#111}.cb-edit-media-item img,.cb-edit-media-item video{display:block;width:100%;height:100%;max-height:330px;object-fit:contain;background:#111}.cb-edit-media-item button{position:absolute;right:8px;top:8px;z-index:3;width:34px;height:34px;border:1px solid #ccd0d5;border-radius:50%;background:#fff;color:#050505;font-size:24px;line-height:1;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.25)}.cb-edit-no-media{grid-column:1/-1;padding:28px;text-align:center;background:#f0f2f5;color:#65676b}.cb-edit-post-tools{display:flex;align-items:center;gap:10px;flex-wrap:wrap;border:1px solid #ccd0d5;border-radius:10px;padding:10px}.cb-edit-post-tools>b{margin-right:auto}.cb-edit-add-media{display:block!important;border-radius:7px;background:#e7f3ff;color:#1877f2;padding:9px 12px;cursor:pointer}.cb-edit-post-tools select{border:0;border-radius:7px;background:#e4e6eb;padding:9px}.cb-edit-post-dialog .primary-button{width:100%}@media(max-width:600px){.cb-edit-media-grid{grid-template-columns:1fr}.cb-edit-media-item{min-height:210px}.cb-edit-post-tools>b{width:100%}}
    .cb-danger-delete{width:100%;margin-top:12px;border:1px solid #f1b4b4;border-radius:8px;background:#fff0f0;color:#b42318;font-weight:800;padding:11px;cursor:pointer}.cb-danger-delete:hover{background:#ffe1e1}.cb-danger-delete:disabled{opacity:.65;cursor:wait}
  `;document.head.appendChild(style);
  let pinPaintQueued=false;
  const schedulePinPaint=()=>{
    if(pinPaintQueued)return;
    pinPaintQueued=true;
    requestAnimationFrame(()=>{pinPaintQueued=false;applyPins();});
  };
  new MutationObserver(schedulePinPaint).observe(document.documentElement,{childList:true,subtree:true});
  applyPins();

  // Keep playback but remove the browser's Download, Playback speed and
  // Picture-in-picture menu entries from every current and future video.
  const restrictVideoMenus=(root=document)=>{
    root.querySelectorAll?.('video').forEach(video=>{
      video.setAttribute('controlslist','nodownload noplaybackrate noremoteplayback');
      video.setAttribute('disablepictureinpicture','');
      video.disablePictureInPicture=true;
    });
  };
  let videoPaintQueued=false;
  const scheduleVideoRestrictions=()=>{
    if(videoPaintQueued)return;
    videoPaintQueued=true;
    requestAnimationFrame(()=>{videoPaintQueued=false;restrictVideoMenus();});
  };
  new MutationObserver(scheduleVideoRestrictions).observe(document.documentElement,{childList:true,subtree:true});
  restrictVideoMenus();
})();

/* About > Contact info / Names editor */
(function cirklebookAccountIdentityEditorStyles(){
  if(document.getElementById('cbAccountIdentityEditorCss'))return;
  const style=document.createElement('style');style.id='cbAccountIdentityEditorCss';style.textContent=`
    .cb-account-identity-editor{display:grid;gap:16px}.cb-account-identity-editor>p{margin:0;color:#65676b;line-height:1.45}.cb-account-identity-editor label{display:grid;gap:7px;font-weight:700}.cb-account-identity-editor input{width:100%;box-sizing:border-box;border:1px solid #ccd0d5;border-radius:9px;padding:12px;font:inherit;background:#fff}.cb-account-identity-editor input:focus{outline:2px solid #1877f2;border-color:transparent}.cb-account-identity-editor label small,.cb-account-identity-editor>small{color:#65676b;font-weight:400;line-height:1.4}.cb-username-input{display:flex;align-items:center;border:1px solid #ccd0d5;border-radius:9px;overflow:hidden;background:#fff}.cb-username-input span{padding-left:12px;color:#65676b;font-weight:700}.cb-username-input input{border:0;border-radius:0;padding-left:3px}.cb-username-input:focus-within{outline:2px solid #1877f2;border-color:transparent}.cb-account-identity-editor .cb-about-actions{display:flex;justify-content:flex-end;gap:8px;border-top:1px solid #e4e6eb;padding-top:14px}
    @media(max-width:600px){.cb-account-identity-editor .cb-about-actions{position:sticky;bottom:0;background:#fff}.cb-account-identity-editor .cb-about-actions button{flex:1}}
  `;document.head.appendChild(style);
})();

/* Page username URL and multiple phone controls */
(function cirklebookPageIdentityStyles(){
  if(document.getElementById('cbPageIdentityStyles'))return;
  const style=document.createElement('style');style.id='cbPageIdentityStyles';style.textContent=`
    .cb-page-username-field{display:flex!important;align-items:center;border:1px solid #ccd0d5;border-radius:9px;background:#fff;overflow:hidden;font-weight:400!important}.cb-page-username-field span{padding:0 0 0 11px;color:#65676b;white-space:nowrap}.cb-page-username-field input{border:0!important;border-radius:0!important;min-width:80px;padding-left:2px!important;outline:0!important}.cb-page-username-field:focus-within{outline:2px solid #1877f2;border-color:transparent}.cb-page-phone-fields{display:grid;gap:8px}.cb-page-phone-fields>div{display:flex;gap:7px}.cb-page-phone-fields input{flex:1;min-width:0}.cb-page-phone-fields button{width:38px;flex:0 0 38px;border:0;border-radius:50%;background:#e4e6eb;font-size:22px;cursor:pointer}.cb-page-public-url{display:inline-block;margin-top:4px;color:#1877f2;text-decoration:none;font-size:13px;overflow-wrap:anywhere}.cb-page-public-url:hover{text-decoration:underline}
    @media(max-width:600px){.cb-page-username-field{display:grid!important;grid-template-columns:auto minmax(0,1fr)}.cb-page-username-field span{font-size:12px}.cb-page-phone-fields button{border-radius:8px}}
  `;document.head.appendChild(style);
})();

/* Facebook-style profile/Page identity switcher. */
(function cirklebookPageIdentitySwitcher(){
  const menu=document.getElementById('accountMenu');
  if(!menu)return;
  const ui=window.CirklebookUiBridge;
  if(!ui){console.error('Cirklebook UI bridge is unavailable.');return;}
  const esc=ui.escape;
  const identityKey=()=>{const user=state.currentUser||{},id=user.id||user.user_id||user.userId||user.username||'anonymous';return `cirklebook_active_identity:${id}`;};
  const safeProfileExtras=()=>{try{const user=state.currentUser||{},id=String(user.id||user.user_id||user.userId||'').trim(),key=id?`cirklebook_profile_extras_v3:${id}`:'cirklebook_profile_extras_v3:anonymous';return JSON.parse(localStorage.getItem(key)||'{}')||{};}catch(_){return {};}};
  window.CirklebookProfileExtrasSafe=safeProfileExtras;
  const ensureHomeSidebarUtilities=()=>{
    const links=[...document.querySelectorAll('.sidebar-link')],host=links.at(-1)?.parentElement;
    if(!host)return;
    if(!document.getElementById('cbSidebarLanguage')){const button=document.createElement('button');button.type='button';button.id='cbSidebarLanguage';button.className='sidebar-link';button.innerHTML='<span>🌐</span><span>Language</span>';button.onclick=()=>{const current=localStorage.getItem('cirklebook_language')||'en';ui.showDialog('Language',`<div class="language-grid">${ui.languages.map(([code,name])=>`<button type="button" class="language-choice ${code===current?'active':''}" data-sidebar-language="${code}">${esc(name)}</button>`).join('')}</div>`);document.querySelectorAll('[data-sidebar-language]').forEach(choice=>choice.onclick=()=>{ui.applyLanguage(choice.dataset.sidebarLanguage);ui.closeDialog();});};host.appendChild(button);}
    if(!document.getElementById('cbSidebarHelp')){const button=document.createElement('button');button.type='button';button.id='cbSidebarHelp';button.className='sidebar-link';button.innerHTML='<span>❔</span><span>Help & Support</span>';button.onclick=()=>ui.showDialog('Help & Support','<div class="cb-form-grid"><button class="cb-action">Support Center</button><button class="cb-action">Account Recovery</button><button class="cb-action">Community Standards</button><button class="cb-action">Report a Problem</button></div>');host.appendChild(button);}
  };
  let loading=false,lastPages=[];
  const avatarFor=page=>ui.entityMediaUrl({...ui.loadEntityExtra('page',page.id||page.page_id),...page},'profile');
  const paint=pages=>{
    const userName=state.currentUser?.profile?.displayName||state.currentUser?.displayName||state.currentUser?.display_name||state.currentUser?.username||'Profile';
    const userAvatar=safeProfileExtras().avatar||'';
    menu.innerHTML=`<div class="cb-identity-menu"><button type="button" class="cb-identity-row" data-cb-profile-switch>${userAvatar?`<img src="${esc(userAvatar)}" alt="">`:`<span>${esc(String(userName).charAt(0).toUpperCase())}</span>`}<div><b>${esc(userName)}</b><small>Profile</small></div>${!state.activePage?'<em>✓</em>':''}</button><div class="cb-identity-separator"></div><div class="cb-identity-pages">${pages.map((page,index)=>{const avatar=avatarFor(page);return `<button type="button" class="cb-identity-row" data-cb-page-switch="${index}">${avatar?`<img src="${esc(avatar)}" alt="">`:`<span>${esc(String(page.name||'P').charAt(0).toUpperCase())}</span>`}<div><b>${esc(page.name||'Page')}</b><small>${page.username?'@'+esc(page.username):'Cirklebook Page'}</small></div>${String(state.activePage?.id||'')===String(page.id||page.page_id)?'<em>✓</em>':''}</button>`}).join('')}</div><button type="button" class="cb-identity-row" data-cb-create-page><span>＋</span><div><b>Create Page</b><small>Build a new Page identity</small></div></button><button type="button" class="cb-identity-row" data-cb-create-group><span>👥</span><div><b>Create Group</b><small>Build a new Group</small></div></button><div class="cb-identity-separator"></div><button type="button" class="cb-identity-row" data-cb-menu-logout><span>↪</span><div><b>Sign Out</b></div></button></div>`;
  };
  const refresh=async()=>{if(loading)return;loading=true;try{const response=await apiRequest('/pages/mine'),pages=response?.data?.pages||response?.pages||response?.data||[];lastPages=Array.isArray(pages)?pages:[];}catch(_){lastPages=[];}paint(lastPages);loading=false;};
  const activatePage=page=>{const merged={...ui.loadEntityExtra('page',page.id||page.page_id),...page};state.activePage=merged;const id=String(merged.id||merged.page_id||''),selection=JSON.stringify({type:'page',id,page:merged});localStorage.setItem('cirklebook_active_page_id',id);localStorage.setItem('cirklebook_active_identity',selection);localStorage.setItem(identityKey(),selection);localStorage.setItem(`cirklebook_active_page_snapshot:${identityKey()}`,JSON.stringify(merged));localStorage.setItem('cirklebook_active_page_snapshot',JSON.stringify(merged));if(dom.topUsername)dom.topUsername.textContent=merged.name||'Page';if(dom.topAvatar){const avatar=avatarFor(merged);dom.topAvatar.textContent=String(merged.name||'P').charAt(0).toUpperCase();if(avatar){dom.topAvatar.style.backgroundImage=`url("${avatar}")`;dom.topAvatar.style.backgroundSize='cover';}else dom.topAvatar.style.backgroundImage='';}menu.classList.add('hidden');window.CirklebookPageIdentityNav?.activate(merged);window.CirklebookPageIdentityNav?.route('home');};
  new MutationObserver(()=>{if(!menu.classList.contains('hidden'))refresh();}).observe(menu,{attributes:true,attributeFilter:['class']});
  document.addEventListener('click',event=>{const pageButton=event.target.closest('[data-cb-page-switch]'),profileButton=event.target.closest('[data-cb-profile-switch]'),createButton=event.target.closest('[data-cb-create-page]'),createGroupButton=event.target.closest('[data-cb-create-group]'),logoutButton=event.target.closest('[data-cb-menu-logout]');if(pageButton){event.preventDefault();event.stopImmediatePropagation();const page=lastPages[Number(pageButton.dataset.cbPageSwitch)];if(page)activatePage(page);return;}if(profileButton){event.preventDefault();event.stopImmediatePropagation();state.activePage=null;localStorage.removeItem('cirklebook_active_page_id');localStorage.removeItem('cirklebook_active_page_snapshot');localStorage.setItem('cirklebook_active_identity',JSON.stringify({type:'profile'}));localStorage.setItem(identityKey(),JSON.stringify({type:'profile'}));window.CirklebookPageIdentityNav?.deactivate();renderCurrentUser();menu.classList.add('hidden');ui.openProfilePage('all');return;}if(createButton){event.preventDefault();event.stopImmediatePropagation();menu.classList.add('hidden');ui.openCreatePage();return;}if(createGroupButton){event.preventDefault();event.stopImmediatePropagation();menu.classList.add('hidden');ui.openCreateGroup();return;}if(logoutButton){event.preventDefault();event.stopImmediatePropagation();logoutUser();}},true);
  const style=document.createElement('style');style.id='cbPageIdentitySwitcherCss';style.textContent=`#accountMenu{width:min(360px,calc(100vw - 20px))!important;max-height:calc(100vh - 90px);overflow:auto;padding:10px!important}.cb-identity-menu{display:grid;gap:4px}.cb-identity-row{width:100%;display:flex!important;align-items:center;gap:11px;border:0!important;border-radius:9px!important;background:#fff!important;padding:9px!important;text-align:left;cursor:pointer}.cb-identity-row:hover{background:#f0f2f5!important}.cb-identity-row>img,.cb-identity-row>span{width:42px;height:42px;flex:0 0 42px;border-radius:50%;object-fit:cover;display:grid;place-items:center;background:#e4e6eb;font-size:25px;font-weight:800}.cb-identity-row>div{display:grid;gap:2px;min-width:0;flex:1}.cb-identity-row b,.cb-identity-row small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.cb-identity-row small{color:#65676b}.cb-identity-row em{color:#1877f2;font-size:20px;font-style:normal}.cb-identity-separator{height:1px;background:#e4e6eb;margin:5px 4px}.cb-identity-pages{display:grid;gap:2px}.cb-page-section-head{display:flex;justify-content:space-between;align-items:center;gap:10px}.cb-page-section-head h3,.cb-page-section-head p{margin:0 0 5px}.cb-page-active-pill{border-radius:99px;background:#e7f3ff;color:#1877f2;font-weight:700;padding:7px 11px;white-space:nowrap}.program-card[type="button"]{border:0;text-align:left;cursor:pointer}@media(max-width:600px){#accountMenu{position:fixed!important;left:8px!important;right:8px!important;top:62px!important;width:auto!important;max-height:calc(100vh - 78px)!important}.cb-page-section-head{align-items:flex-start}.cb-page-active-pill{font-size:12px}}`;
  document.head.appendChild(style);paint([]);ensureHomeSidebarUtilities();
})();

/* Page acts as an independent identity. Top navigation never opens personal
   Profile data while a Page is selected. */
(function cirklebookIndependentPageIdentity(){
  const ui=window.CirklebookUiBridge;
  if(!ui)return;
  const esc=ui.escape;
  const pageId=page=>page?.id||page?.pageId||page?.page_id||'';
  const currentUserId=()=>{const user=state.currentUser||{};return String(user.id||user.user_id||user.userId||user.username||'anonymous');};
  const identityKey=()=>`cirklebook_active_identity:${currentUserId()}`;
  const iconFor=page=>ui.entityMediaUrl({...ui.loadEntityExtra('page',pageId(page)),...page},'profile');
  const syncChrome=()=>{
    const page=state.activePage,active=!!page;
    document.body.classList.toggle('cb-page-identity-mode',active);
    if(!active)return;
    const name=page.name||'Page',icon=iconFor(page);
    if(dom.topUsername)dom.topUsername.textContent=name;
    if(dom.topAvatar){dom.topAvatar.textContent=String(name).charAt(0).toUpperCase();dom.topAvatar.style.backgroundImage=icon?`url("${icon}")`:'';dom.topAvatar.style.backgroundSize=icon?'cover':'';dom.topAvatar.style.backgroundColor='#e4e6eb';}
    const iconMap={topHomeBtn:['assets/icon-home.png','Page Home'],topVideoBtn:['assets/Reels_icon.png','Page Reels'],topDashboardBtn:['assets/icon-dashboard.png','Page Professional Dashboard'],topGroupsBtn:['assets/icon-groups.png','Groups as Page'],topPagesBtn:['assets/icon-pages.png','Pages as Page'],topMessagesBtn:['assets/icon-messages.png','Page Messages'],topNotificationsBtn:['assets/icon-notifications.png','Page Notifications']};
    Object.entries(iconMap).forEach(([id,[src,label]])=>{const button=document.getElementById(id),img=button?.querySelector('img');if(img)img.src=src;if(button){button.setAttribute('data-page-identity-control','1');button.setAttribute('aria-label',label);button.title=label;}});
    const language=document.getElementById('languageButton')||document.getElementById('topLanguageBtn');if(language){const img=language.querySelector('img');if(img)img.src='assets/icon-language.png';language.title='Page Language';}
  };
  const managerTab=(tab)=>{const page=state.activePage;if(!page)return;ui.openPageManager(page);requestAnimationFrame(()=>document.querySelector(`[data-page-tab="${tab}"]`)?.click());};
  let pageFeedTimer=0,pageFeedRequest=0,pageFeedSignature='';
  const stopPageFeedRefresh=()=>{if(pageFeedTimer){clearTimeout(pageFeedTimer);pageFeedTimer=0;}};
  const pageMenu=()=>{const avatar=iconFor(state.activePage),letter=esc(String(state.activePage?.name||'P').charAt(0).toUpperCase()),items=[['followers','assets/icon-groups.png','👥','Followers'],['groups','assets/icon-groups.png','👥','Groups'],['saved','assets/icon-saved.svg','🔖','Saved'],['notifications','assets/icon-notifications.png','🔔','Notifications'],['dashboard','assets/icon-dashboard.png','📊','Professional Dashboard'],['settings','assets/icon-settings.svg','⚙️','Settings & Privacy'],['ads','assets/icon-ads.svg','📣','Ads Center'],['standards','assets/icon-community-standards.svg','🛡️','Community Standards']];return `<aside class="cb-page-home-sidebar"><button data-page-side="profile"><span class="cb-page-side-avatar"><i>${letter}</i>${avatar?`<img src="${esc(avatar)}" alt="" onerror="this.remove()">`:''}</span><b>${esc(state.activePage?.name||'Page')}</b></button>${items.map(([key,icon,fallback,label])=>`<button data-page-side="${key}"><span class="cb-page-side-icon">${icon?`<img src="${icon}" alt="" onerror="this.remove()">`:''}<i>${fallback}</i></span><b>${label}</b></button>`).join('')}</aside>`;};
  const pageAds=()=>`<div class="cb-page-sponsored-title"><h3>Sponsored</h3><button type="button" data-page-side="ads">Manage ads</button></div>${Array.from({length:4},()=>'<button type="button" class="cb-page-ad-box" data-page-side="ads"><b>Ad space</b><span>Advertise here</span></button>').join('')}`;
  const pageShell=(title,subtitle,body,right='',plainHome=false)=>`<div class="feature-page cb-page-identity-surface"><div class="cb-page-full-layout">${pageMenu()}<main class="cb-page-home-main"><div class="cb-panel cb-page-mode-content ${plainHome?'cb-page-home-feed-surface':''}">${plainHome?'':`<div class="cb-page-mode-title"><div class="cb-page-mode-avatar"><i>${esc(String(state.activePage?.name||'P').charAt(0).toUpperCase())}</i>${iconFor(state.activePage)?`<img src="${esc(iconFor(state.activePage))}" alt="" onerror="this.remove()">`:''}</div><div><h2>${esc(title)}</h2><p>${esc(subtitle)}</p></div></div>`}${body}</div></main><aside class="cb-page-home-right">${right||pageAds()}</aside></div></div>`;
  const bindPageShell=()=>{document.querySelectorAll('[data-page-side]').forEach(button=>button.onclick=()=>route(button.dataset.pageSide));};
  const loadPageFeed=async(reelsOnly=false)=>{
    stopPageFeedRefresh();
    const requestNumber=++pageFeedRequest;
    ui.showFeature(pageShell(reelsOnly?'Page Reels':'','',`<div class="cb-page-composer cb-unified-composer"><span class="cb-page-composer-avatar"><i>${esc(String(state.activePage?.name||'P').charAt(0).toUpperCase())}</i>${iconFor(state.activePage)?`<img src="${esc(iconFor(state.activePage))}" alt="" onerror="this.remove()">`:''}</span><button id="cbPageModeCreate" type="button">What's on your mind?</button><button id="cbPageModeLive" class="cb-composer-feature" type="button"><img src="assets/icon-live.png" alt="Live video"></button><button id="cbPageModeMedia" class="cb-composer-feature" type="button"><img src="assets/icon-photo-video.png" alt="Photo/video"></button><button id="cbPageModeReel" class="cb-composer-feature" type="button"><img src="assets/icon-feeling.png" alt="Feeling/activity"></button></div><div id="cbPageNetworkFeed" class="feed" style="margin-top:14px"><div class="cb-empty-panel">Loading Page feed…</div></div>`,'',!reelsOnly),'topHomeBtn');
    bindPageShell();
    document.getElementById('cbPageModeCreate')?.addEventListener('click',()=>{state.pagePostTarget={pageId:pageId(state.activePage),reload:()=>loadPageFeed(reelsOnly)};ui.openPostModal(reelsOnly);});
    document.getElementById('cbPageModeMedia')?.addEventListener('click',()=>{state.pagePostTarget={pageId:pageId(state.activePage),reload:()=>loadPageFeed(false)};ui.openPostModal(true);});
    document.getElementById('cbPageModeReel')?.addEventListener('click',()=>{state.pagePostTarget={pageId:pageId(state.activePage),reload:()=>loadPageFeed(false)};ui.openPostModal(false);setTimeout(()=>document.getElementById('modalFeelingButton')?.click(),80);});
    document.getElementById('cbPageModeLive')?.addEventListener('click',()=>{state.pagePostTarget={pageId:pageId(state.activePage),reload:()=>loadPageFeed(false)};ui.openPostModal(true);});
    const box=document.getElementById('cbPageNetworkFeed');
    try{const response=await ui.apiRequest(`/pages/feed?_=${Date.now()}`),raw=ui.extractPosts(response),hydrated=await ui.hydrateSharedPosts(raw),posts=(Array.isArray(hydrated)?hydrated:[]).filter(post=>!reelsOnly||String(post?.post_type||post?.postType||'').toLowerCase()==='reel');if(requestNumber!==pageFeedRequest||!box?.isConnected)return;pageFeedSignature=posts.map(post=>`${post.id}:${post.updated_at||post.created_at||''}:${post.reaction_count||0}:${post.comment_count||0}`).join('|');box.innerHTML=posts.length?posts.map(ui.renderPost).join(''):`<div class="cb-empty-panel">${reelsOnly?'No Page reels yet.':'No Page posts have been published yet.'}</div>`;}catch(error){if(box?.isConnected)box.innerHTML=`<div class="cb-empty-panel" style="color:#b42318">${esc(error?.message||'Unable to load Page feed.')}</div>`;}
    /* Manual refresh only: do not replace the feed while the user is reading it. */
  };
  const directory=async(type)=>{
    const isPage=type==='pages',title=isPage?'Pages':'Groups';
    ui.showFeature(pageShell(title,`${state.activePage?.name||'This Page'} is browsing ${title}`,`<div id="cbPageDirectory"><div class="cb-empty-panel">Loading ${title}…</div></div>`));
    bindPageShell();
    const box=document.getElementById('cbPageDirectory');
    try{const response=await ui.apiRequest(isPage?'/pages/discover':'/groups'),items=response?.data?.[type]||response?.[type]||response?.data||[];box.innerHTML=Array.isArray(items)&&items.length?`<div class="people-grid">${items.map(item=>`<div class="person-card"><div class="avatar">${esc(String(item.name||'P').charAt(0))}</div><div class="person-main"><strong>${esc(item.name||'')}</strong><small>${esc(item.category||item.privacy||title.slice(0,-1))}</small></div></div>`).join('')}</div>`:`<div class="cb-empty-panel">No ${title} available.</div>`;}catch(error){box.innerHTML=`<div class="cb-empty-panel" style="color:#b42318">${esc(error?.message||`Unable to load ${title}.`)}</div>`;}
  };
  const pageDashboard=async(activeTab='overview')=>{
    const page=state.activePage;if(!page)return;
    const tabs=[['overview','Overview'],['content','Content'],['audience','Audience'],['monetization','Monetization'],['verification','Verification'],['ads','Ads Center'],['moderation','Moderation'],['notifications','Notifications']];
    ui.showFeature(`<div class="feature-page cb-page-pro-dashboard"><aside class="cb-panel cb-page-pro-nav">${tabs.map(([key,label])=>`<button type="button" class="${key===activeTab?'active':''}" data-page-pro-tab="${key}">${label}</button>`).join('')}</aside><main id="cbPageProBody" class="cb-panel"><div class="cb-empty-panel">Loading ${esc(page.name||'Page')} dashboard…</div></main></div>`,'topDashboardBtn');
    document.querySelectorAll('[data-page-pro-tab]').forEach(button=>button.onclick=()=>pageDashboard(button.dataset.pageProTab));
    const body=document.getElementById('cbPageProBody');
    let posts=[];try{const response=await ui.apiRequest('/pages/feed'),all=await ui.hydrateSharedPosts(ui.extractPosts(response));posts=(Array.isArray(all)?all:[]).filter(post=>String(post?.page_id||post?.pageId||'')===String(pageId(page)));}catch(_){}
    const total=(field)=>posts.reduce((sum,post)=>sum+Number(post?.[field]||0),0),followers=Number(page.followers_count||page.follower_count||page.followersCount||0),views=total('view_count')+total('views_count'),reactions=total('reaction_count')+total('reactions_count'),comments=total('comment_count')+total('comments_count'),shares=total('share_count')+total('shares_count');
    const cards=items=>`<div class="cb-page-pro-metrics">${items.map(([label,value])=>`<div><span>${esc(label)}</span><strong>${esc(String(value??0))}</strong></div>`).join('')}</div>`;
    if(activeTab==='overview')body.innerHTML=`<h2>Overview</h2><p>Your Page and creator performance for the last 28 days.</p>${cards([['Posts',posts.length],['Followers',followers],['Following',page.following_count||0],['Reach',views],['Impressions',views],['Page views',views],['Engagements',reactions+comments+shares],['Reactions',reactions]])}`;
    else if(activeTab==='content')body.innerHTML=`<h2>Content</h2><p>Performance of content published only by ${esc(page.name||'this Page')}.</p>${cards([['Published content',posts.length],['Reactions',reactions],['Comments',comments],['Shares',shares],['Views',views]])}<div id="cbPageDashboardPosts" class="feed">${posts.length?posts.map(ui.renderPost).join(''):'<div class="cb-empty-panel">No Page content yet.</div>'}</div>`;
    else if(activeTab==='audience')body.innerHTML=`<h2>Audience</h2><p>Audience data belongs only to this Page.</p>${cards([['Followers',followers],['Following',page.following_count||0],['Net growth',followers],['Engagements',reactions+comments+shares]])}`;
    else if(activeTab==='monetization')body.innerHTML=`<h2>Monetization Eligibility</h2><p>Eligibility and earnings are completely separate for ${esc(page.name||'this Page')}.</p><div class="cb-page-eligibility">${[['Followers',followers,1000],['Posts (Content Writing & image)',posts.length,200],['Qualified watch hours (Reels)',0,1000],['Account age',0,150],['Impressions',views,40000],['Engagements',reactions+comments+shares,5000]].map(([label,value,goal])=>`<div><b>${esc(label)}</b><progress max="${goal}" value="${Math.min(value,goal)}"></progress><span>${value} / ${goal}</span></div>`).join('')}</div><div class="cb-page-policy"><div><b>Policy requirements</b><p>✓ Account in good standing</p><p>✓ No serious policy violations</p><p>✓ Community Standards followed</p><p>✓ Monetization Policies followed</p><p>✓ No copyright or reused-content abuse</p><p>✓ No fake engagement or follower manipulation</p></div><b>Policy Status: Not evaluated</b></div><h3>Programs</h3>${cards([['Video Monetization','Not eligible'],['Reels Monetization','Not eligible'],['Ads Revenue','Not eligible'],['Fan Support','Not eligible']])}`;
    else if(activeTab==='verification')body.innerHTML=`<h2>Verification</h2><p>Verification status and application for ${esc(page.name||'this Page')} only.</p><div class="cb-empty-panel">This Page is not verified.</div>`;
    else if(activeTab==='ads')body.innerHTML=`<h2>Ads Center</h2><p>Create and manage advertisements owned by this Page.</p><button class="cb-action primary" id="cbPageDashboardCreateAd">Create Ad</button>`;
    else if(activeTab==='moderation')body.innerHTML=`<h2>Moderation</h2><p>Manage this Page's content, comments and policy status.</p>${cards([['Published',posts.length],['Under review',0],['Removed',0],['Policy violations',0]])}`;
    else body.innerHTML=`<h2>Notifications</h2><p>Notifications for ${esc(page.name||'this Page')} only.</p><div class="cb-empty-panel">No Page notifications yet.</div>`;
    document.getElementById('cbPageDashboardCreateAd')?.addEventListener('click',()=>managerTab('ads'));
  };
  const route=target=>{
    if(!state.activePage)return;
    syncChrome();
    if(target==='home')return loadPageFeed(false);
    if(target==='reels')return loadPageFeed(true);
    stopPageFeedRefresh();
    if(target==='dashboard')return pageDashboard('overview');
    if(target==='followers'){ui.showFeature(pageShell('Followers',`People following ${state.activePage.name||'this Page'}`,`<div class="cb-page-pro-metrics"><div><span>Followers</span><strong>${Number(state.activePage.followers_count||state.activePage.follower_count||0)}</strong></div><div><span>Following</span><strong>${Number(state.activePage.following_count||0)}</strong></div></div><div class="cb-empty-panel" style="margin-top:14px">Page follower activity will appear here.</div>`));bindPageShell();return;}
    if(target==='saved'){ui.showFeature(pageShell('Saved',`Posts saved by ${state.activePage.name||'this Page'}`,`<div class="cb-empty-panel">Saved Page content will appear here. Personal saved posts are not shown.</div>`));bindPageShell();return;}
    if(target==='settings'){ui.showFeature(pageShell('Settings & Privacy',`Settings for ${state.activePage.name||'this Page'} only`,`<div class="setting-row"><div><b>Page profile settings</b><small>Name, username, contact information and Page details</small></div><button type="button" class="cb-action" id="cbPageSettingsProfile">Edit</button></div><div class="setting-row"><div><b>Page privacy</b><small>Control visibility and Page permissions</small></div><button type="button" class="cb-action" id="cbPageSettingsPrivacy">Open</button></div>`));bindPageShell();document.getElementById('cbPageSettingsProfile')?.addEventListener('click',()=>managerTab('profile'));document.getElementById('cbPageSettingsPrivacy')?.addEventListener('click',()=>managerTab('profile'));return;}
    if(target==='ads'){ui.showFeature(pageShell('Ads Center',`Advertisements owned by ${state.activePage.name||'this Page'}`,`<div class="cb-page-section-head"><div><h3>Page Ads</h3><p>Create, boost and manage advertisements as this Page.</p></div></div><button type="button" class="cb-action primary" id="cbPageCreateAd">Create Ad</button>`));bindPageShell();document.getElementById('cbPageCreateAd')?.addEventListener('click',()=>ui.openAdsBuilder('Engagement'));return;}
    if(target==='standards'){ui.showFeature(pageShell('Community Standards','Every Page post must respect Islamic values.',`<div class="cb-policy-inline"><b>Page content policy</b><span>Text, images, video, audio, captions, thumbnails and links must follow Cirklebook Community Standards.</span></div>`));bindPageShell();return;}
    if(target==='messages')return managerTab('messages');
    if(target==='profile')return managerTab('profile');
    if(target==='pages')return ui.openPagesFeed();
    if(target==='groups')return ui.openGroupsFeed();
    if(target==='monetization')return pageDashboard('monetization');
    if(target==='notifications'){ui.showFeature(pageShell('Page Notifications',`Activity for ${state.activePage.name||'this Page'}`,`<div class="cb-empty-panel">New reactions, comments, shares, follows and Page messages will appear here. Personal notifications are not shown in Page mode.</div>`));bindPageShell();return;}
  };
  document.addEventListener('click',event=>{const button=event.target.closest('[data-page-side]');if(!button||!state.activePage)return;event.preventDefault();event.stopImmediatePropagation();route(button.dataset.pageSide);},true);
  const deactivate=()=>{stopPageFeedRefresh();pageFeedRequest+=1;document.body.classList.remove('cb-page-identity-mode');if(dom.topAvatar)dom.topAvatar.style.backgroundImage='';};
  window.CirklebookPageIdentityNav={activate:()=>syncChrome(),deactivate,route};
  const restoreSelectedPage=async()=>{if(!state.currentUser||state.activePage)return false;let selected={};try{selected=JSON.parse(localStorage.getItem(identityKey())||localStorage.getItem('cirklebook_active_identity')||'{}')||{};}catch(_){}const legacy=localStorage.getItem('cirklebook_active_page_id')||'';const wanted=selected.type==='page'?String(selected.id||legacy):(!selected.type?legacy:'');if(!wanted)return false;let snapshot=selected.page||null;try{snapshot=snapshot||JSON.parse(localStorage.getItem(`cirklebook_active_page_snapshot:${identityKey()}`)||localStorage.getItem('cirklebook_active_page_snapshot')||'null');}catch(_){}if(snapshot&&String(pageId(snapshot))===wanted){state.activePage={...ui.loadEntityExtra('page',wanted),...snapshot};syncChrome();route('home');}try{const response=await ui.apiRequest('/pages/mine'),pages=response?.data?.pages||response?.pages||response?.data||[],page=(Array.isArray(pages)?pages:[]).find(item=>String(pageId(item))===wanted);if(page){state.activePage={...ui.loadEntityExtra('page',wanted),...page};const selection=JSON.stringify({type:'page',id:wanted,page:state.activePage});localStorage.setItem(identityKey(),selection);localStorage.setItem('cirklebook_active_identity',selection);localStorage.setItem(`cirklebook_active_page_snapshot:${identityKey()}`,JSON.stringify(state.activePage));localStorage.setItem('cirklebook_active_page_snapshot',JSON.stringify(state.activePage));syncChrome();if(!snapshot)route('home');return true;}return !!snapshot;}catch(error){console.warn('Selected Page restored from its local identity snapshot.',error);return !!snapshot;}};
  window.CirklebookRestorePageIdentity=restoreSelectedPage;
  let restoreAttempts=0;const restoreWhenReady=()=>{restoreAttempts+=1;if(state.currentUser){restoreSelectedPage();return;}if(restoreAttempts<20)setTimeout(restoreWhenReady,400);};if(document.readyState==='complete')setTimeout(restoreWhenReady,0);else window.addEventListener('load',()=>setTimeout(restoreWhenReady,0),{once:true});
  const style=document.createElement('style');style.id='cbIndependentPageIdentityCss';style.textContent=`.cb-page-mode-title{display:flex;align-items:center;gap:12px;border-bottom:1px solid #e4e6eb;padding-bottom:14px;margin-bottom:14px}.cb-page-mode-title h2,.cb-page-mode-title p{margin:0 0 3px}.cb-page-mode-avatar{width:48px;height:48px;border-radius:50%;display:grid;place-items:center;background:#e4e6eb;font-weight:800;font-size:22px;overflow:hidden}.cb-page-mode-avatar img{width:100%;height:100%;object-fit:cover}.cb-page-full-layout{display:grid;grid-template-columns:250px minmax(0,680px) 280px;gap:16px;max-width:1240px;margin:auto;align-items:start}.cb-page-home-sidebar,.cb-page-home-right{position:sticky;top:82px}.cb-page-home-sidebar{display:grid;gap:4px}.cb-page-home-sidebar button{display:flex;align-items:center;gap:11px;border:0;border-radius:9px;background:transparent;padding:9px;text-align:left;cursor:pointer;font:inherit}.cb-page-home-sidebar button:hover{background:#e4e6eb}.cb-page-home-sidebar img,.cb-page-side-avatar{width:38px;height:38px;border-radius:10px;object-fit:cover;display:grid;place-items:center;overflow:hidden;background:#e4e6eb}.cb-page-side-avatar img{width:100%;height:100%;object-fit:cover}.cb-page-mode-content{min-height:300px}.cb-page-home-feed-surface{padding:12px!important}.cb-page-home-right{display:grid;gap:10px}.cb-page-sponsored-title{display:flex;align-items:center;justify-content:space-between}.cb-page-sponsored-title h3{margin:0}.cb-page-sponsored-title button{border:0;background:transparent;color:#1877f2;font-weight:700;cursor:pointer}.cb-page-ad-box{width:100%;min-height:108px;border:0;border-radius:10px;background:#e4e6eb;display:grid;place-content:center;gap:4px;text-align:center;color:#65676b;cursor:pointer;font:inherit}.cb-page-ad-box b{font-size:17px}.cb-page-ad-box span{font-size:13px}.cb-page-ad-box:hover{background:#d8dadf}.cb-page-composer{display:grid;grid-template-columns:44px minmax(0,1fr) repeat(3,auto);gap:8px;align-items:center}.cb-page-composer>button{border:0;border-radius:22px;background:#f0f2f5;padding:11px 14px;font:inherit;cursor:pointer;font-weight:600}.cb-page-composer>button:first-of-type{text-align:left;color:#65676b;font-weight:400}.cb-page-composer-avatar{width:42px;height:42px;border-radius:50%;display:grid;place-items:center;overflow:hidden;background:#e4e6eb;font-weight:800}.cb-page-composer-avatar img{width:100%;height:100%;object-fit:cover}.cb-page-pro-dashboard{display:grid;grid-template-columns:250px minmax(0,1fr);gap:14px;max-width:1180px;margin:auto;align-items:start}.cb-page-pro-nav{display:grid;gap:3px;position:sticky;top:82px;padding:10px}.cb-page-pro-nav button{border:0;border-radius:8px;background:transparent;padding:11px;text-align:left;font:inherit;font-weight:700;cursor:pointer}.cb-page-pro-nav button.active,.cb-page-pro-nav button:hover{background:#e7f3ff;color:#1877f2}.cb-page-pro-dashboard main>h2{margin:0}.cb-page-pro-dashboard main>p{color:#65676b;margin-top:3px}.cb-page-pro-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:18px}.cb-page-pro-metrics>div{border:1px solid #ccd0d5;border-radius:12px;padding:16px;display:grid;gap:10px;min-height:68px}.cb-page-pro-metrics span{color:#65676b}.cb-page-pro-metrics strong{font-size:23px}.cb-page-eligibility{display:grid;margin-top:20px}.cb-page-eligibility>div{display:grid;grid-template-columns:260px minmax(120px,1fr) 105px;gap:10px;align-items:center;padding:9px 0;border-bottom:1px solid #e4e6eb}.cb-page-eligibility progress{width:100%}.cb-page-policy{display:flex;justify-content:space-between;gap:24px;margin:25px 22px}.cb-page-identity-mode #topFriendsBtn,.cb-page-identity-mode #topCreateBtn,.cb-page-identity-mode #homeLayout{display:none!important}@media(max-width:1000px){.cb-page-full-layout{grid-template-columns:210px minmax(0,1fr)}.cb-page-home-right{display:none}.cb-page-composer{grid-template-columns:42px minmax(0,1fr)}.cb-page-composer>button:nth-last-child(-n+3){font-size:12px}.cb-page-pro-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:700px){.cb-page-full-layout,.cb-page-pro-dashboard{display:block}.cb-page-home-sidebar,.cb-page-pro-nav{display:none}.cb-page-mode-title h2{font-size:20px}.cb-page-mode-content{border-radius:0!important}.cb-page-identity-surface{padding-left:0!important;padding-right:0!important}.cb-page-composer{grid-template-columns:38px minmax(0,1fr);}.cb-page-composer>button:nth-last-child(-n+3){display:none}.cb-page-pro-metrics{grid-template-columns:1fr 1fr}.cb-page-eligibility>div{grid-template-columns:1fr}.cb-page-policy{display:block;margin:18px 0}}`;
  document.head.appendChild(style);
})();

/* Final mobile header and navigation: Logo + name + Search on top;
   Profile is the last bottom item beside Pages; top Create (+) is hidden. */
(function cirklebookFinalMobileNavigation(){
  if(document.getElementById('cbMobileHeader'))return;
  const ui=window.CirklebookUiBridge;
  if(!ui){console.error('Cirklebook UI bridge is unavailable.');return;}
  const esc=ui.escape;
  const logoSource=document.querySelector('#brandHomeButton img,.brand-logo img,img[src*="logo-main"]')?.getAttribute('src')||'assets/logo-main.png';
  const header=document.createElement('header');header.id='cbMobileHeader';header.innerHTML=`<button type="button" id="cbMobileBrand" aria-label="Cirklebook Home"><img src="${esc(logoSource)}" alt="Cirklebook"><b>Cirklebook</b></button><span class="cb-mobile-head-actions"><button type="button" id="cbMobileSearchOpen" aria-label="Search" title="Search">⌕</button><button type="button" id="cbMobileLanguage" aria-label="Language" title="Language"><img src="assets/icon-language.png" alt=""></button><button type="button" id="cbMobileNotifications" aria-label="Notifications" title="Notifications"><img src="assets/icon-notifications.png" alt=""></button><button type="button" id="cbMobileMessages" aria-label="Messages" title="Messages"><img src="assets/icon-messages.png" alt=""></button></span><div id="cbMobileSearchBox" class="hidden"><button type="button" id="cbMobileSearchBack" aria-label="Back">←</button><input id="cbMobileSearchInput" type="search" autocomplete="off" placeholder="Search Cirklebook"><button type="button" id="cbMobileSearchClear" aria-label="Clear">×</button></div>`;document.body.appendChild(header);
  const nav=document.querySelector('.top-nav'),profile=document.createElement('button');profile.type='button';profile.id='cbMobileProfileNav';profile.className='nav-button';profile.setAttribute('aria-label','Profile and Pages');
  const paintProfile=()=>{const active=state.activePage||state.currentUser||{},name=active.name||active.profile?.displayName||active.displayName||active.display_name||active.username||'P',image=state.activePage?ui.entityMediaUrl({...ui.loadEntityExtra('page',active.id||active.page_id),...active},'profile'):(window.CirklebookProfileExtrasSafe?.().avatar||''),signature=`${name}|${image}`;if(profile.dataset.identitySignature===signature)return;profile.dataset.identitySignature=signature;profile.innerHTML=image?`<img src="${esc(image)}" alt="${esc(name)}">`:`<span>${esc(String(name).charAt(0).toUpperCase())}</span>`;};
  paintProfile();nav?.appendChild(profile);
  const box=document.getElementById('cbMobileSearchBox'),input=document.getElementById('cbMobileSearchInput'),desktopSearch=document.getElementById('topSearch');
  const openSearch=()=>{box.classList.remove('hidden');input.value=desktopSearch?.value||'';requestAnimationFrame(()=>input.focus());};
  const closeSearch=()=>{box.classList.add('hidden');input.blur();};
  document.getElementById('cbMobileBrand').onclick=()=>{if(state.activePage&&window.CirklebookPageIdentityNav)window.CirklebookPageIdentityNav.route('home');else ui.showHome();};document.getElementById('cbMobileSearchOpen').onclick=openSearch;document.getElementById('cbMobileSearchBack').onclick=closeSearch;document.getElementById('cbMobileSearchClear').onclick=()=>{input.value='';if(desktopSearch){desktopSearch.value='';desktopSearch.dispatchEvent(new Event('input',{bubbles:true}));}input.focus();};
  document.getElementById('cbMobileLanguage').onclick=()=>document.getElementById('languageButton')?.click();
  document.getElementById('cbMobileNotifications').onclick=()=>state.activePage?window.CirklebookPageIdentityNav?.route('notifications'):ui.openNotificationsPage();
  document.getElementById('cbMobileMessages').onclick=()=>state.activePage?window.CirklebookPageIdentityNav?.route('messages'):ui.openMessenger();
  input.oninput=()=>{if(desktopSearch){desktopSearch.value=input.value;desktopSearch.dispatchEvent(new Event('input',{bubbles:true}));}};
  input.onkeydown=event=>{if(event.key==='Enter'){event.preventDefault();desktopSearch?.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));}if(event.key==='Escape')closeSearch();};
  const openIdentitySheet=async()=>{let pages=[];try{const response=await ui.apiRequest('/pages/mine');pages=response?.data?.pages||response?.pages||response?.data||[];if(!Array.isArray(pages))pages=[];}catch(_){}const user=state.currentUser||{},userName=user.profile?.displayName||user.displayName||user.display_name||user.username||'Profile',userAvatar=window.CirklebookProfileExtrasSafe?.().avatar||'';ui.showDialog('Profile and Pages',`<div class="cb-mobile-identity-list"><button type="button" data-mobile-personal-profile>${userAvatar?`<img src="${esc(userAvatar)}" alt="" onerror="this.remove()">`:`<span>${esc(String(userName).charAt(0).toUpperCase())}</span>`}<div><b>${esc(userName)}</b><small>Profile</small></div></button>${pages.map((page,index)=>{const image=ui.entityMediaUrl({...ui.loadEntityExtra('page',page.id||page.page_id),...page},'profile');return `<button type="button" data-mobile-page-profile="${index}">${image?`<img src="${esc(image)}" alt="" onerror="this.remove()">`:`<span>${esc(String(page.name||'P').charAt(0).toUpperCase())}</span>`}<div><b>${esc(page.name||'Page')}</b><small>Page profile</small></div></button>`;}).join('')}<button type="button" data-mobile-sign-out><span>↪</span><div><b>Sign Out</b></div></button></div>`);document.querySelector('[data-mobile-personal-profile]')?.addEventListener('click',()=>{const userId=String(user.id||user.user_id||user.userId||user.username||'anonymous');state.activePage=null;localStorage.removeItem('cirklebook_active_page_id');localStorage.removeItem('cirklebook_active_page_snapshot');localStorage.setItem('cirklebook_active_identity',JSON.stringify({type:'profile'}));localStorage.setItem(`cirklebook_active_identity:${userId}`,JSON.stringify({type:'profile'}));window.CirklebookPageIdentityNav?.deactivate();ui.closeDialog();renderCurrentUser();ui.openProfilePage('all');});document.querySelectorAll('[data-mobile-page-profile]').forEach(button=>button.onclick=()=>{const page=pages[Number(button.dataset.mobilePageProfile)],id=String(page?.id||page?.page_id||'');if(!page||!id)return;const merged={...ui.loadEntityExtra('page',id),...page},selection=JSON.stringify({type:'page',id,page:merged}),userId=String(user.id||user.user_id||user.userId||user.username||'anonymous');state.activePage=merged;localStorage.setItem('cirklebook_active_page_id',id);localStorage.setItem('cirklebook_active_identity',selection);localStorage.setItem(`cirklebook_active_identity:${userId}`,selection);localStorage.setItem('cirklebook_active_page_snapshot',JSON.stringify(merged));ui.closeDialog();window.CirklebookPageIdentityNav?.activate(merged);window.CirklebookPageIdentityNav?.route('profile');paintProfile();});document.querySelector('[data-mobile-sign-out]')?.addEventListener('click',()=>{ui.closeDialog();logoutUser();});};
  profile.onclick=openIdentitySheet;
  const style=document.createElement('style');style.id='cbFinalMobileNavigationCss';style.textContent=`#cbMobileHeader{display:none}.cb-mobile-identity-list{display:grid;gap:5px}.cb-mobile-identity-list>button{display:flex;align-items:center;gap:11px;width:100%;border:0;border-radius:10px;background:#fff;padding:10px;text-align:left;cursor:pointer}.cb-mobile-identity-list>button:hover{background:#f0f2f5}.cb-mobile-identity-list img,.cb-mobile-identity-list>button>span{width:42px;height:42px;flex:0 0 42px;border-radius:50%;object-fit:cover;display:grid;place-items:center;background:#e4e6eb;font-size:22px}.cb-mobile-identity-list>button>div{display:grid;gap:2px}.cb-mobile-identity-list small{color:#65676b}@media(max-width:700px){body{padding-top:56px!important;padding-bottom:62px!important}#cbMobileHeader{position:fixed;display:flex;align-items:center;gap:5px;left:0;right:0;top:0;height:56px;z-index:10025;padding:7px 8px;background:#fff;border-bottom:1px solid #dddfe2;box-sizing:border-box}#cbMobileBrand{display:flex;align-items:center;gap:5px;min-width:0;border:0;background:transparent;padding:0;color:#1877f2;cursor:pointer}#cbMobileBrand img{width:36px;height:36px;border-radius:9px;object-fit:contain}#cbMobileBrand b{font-size:18px;letter-spacing:-.5px}.cb-mobile-head-actions{display:flex;align-items:center;gap:3px;margin-left:auto}.cb-mobile-head-actions>button{width:36px;height:36px;border:0;border-radius:50%;display:grid;place-items:center;background:#e4e6eb;padding:7px;font-size:24px;line-height:1;cursor:pointer}.cb-mobile-head-actions img{width:23px;height:23px;object-fit:contain}#cbMobileSearchBox{position:absolute;display:grid;grid-template-columns:38px minmax(0,1fr) 34px;align-items:center;gap:5px;inset:0;background:#fff;padding:7px 9px;box-sizing:border-box}#cbMobileSearchBox.hidden{display:none!important}#cbMobileSearchBox button{height:38px;border:0;border-radius:50%;background:transparent;font-size:22px}#cbMobileSearchInput{width:100%;height:40px;border:0;border-radius:22px;background:#f0f2f5;padding:0 15px;font:inherit;font-size:16px;outline:0}#topCreateBtn,#profileButton{display:none!important}#brandHomeButton,#topSearch{visibility:hidden!important;pointer-events:none!important}.top-nav #cbMobileProfileNav{display:grid!important;place-items:center!important;order:99!important}.top-nav #cbMobileProfileNav img,.top-nav #cbMobileProfileNav span{width:34px;height:34px;border-radius:50%;object-fit:cover;display:grid;place-items:center;background:#e4e6eb;font-weight:800}.top-nav .nav-button{max-width:none!important}.post-actions.cb-standard-post-actions{grid-template-columns:repeat(4,minmax(0,1fr))!important}.post-actions.cb-standard-post-actions .report-button{display:block!important}}
  `;document.head.appendChild(style);
  new MutationObserver(paintProfile).observe(document.body,{childList:true,subtree:true});
})();

/* Loaded last: keep Page post media inside its card and above its actions. */
(function cirklebookPagePostMediaGuard(){
  if(document.getElementById('cbPagePostMediaGuardCss'))return;
  const style=document.createElement('style');
  style.id='cbPagePostMediaGuardCss';
  style.textContent=`
    .cb-page-manager #managePagePosts .post-media:not(.post-media-grid),
    .cb-page-identity-mode .cb-page-mode-content .post-media:not(.post-media-grid){display:flex!important;align-items:center!important;justify-content:center!important;width:100%!important;height:360px!important;max-height:360px!important;overflow:hidden!important;background:#000!important}
    .cb-page-manager #managePagePosts .post-media:not(.post-media-grid)>img,
    .cb-page-manager #managePagePosts .post-media:not(.post-media-grid)>video,
    .cb-page-identity-mode .cb-page-mode-content .post-media:not(.post-media-grid)>img,
    .cb-page-identity-mode .cb-page-mode-content .post-media:not(.post-media-grid)>video{display:block!important;width:100%!important;height:100%!important;min-height:0!important;max-height:360px!important;object-fit:contain!important;margin:0!important;background:#000!important}
    .cb-page-manager #managePagePosts .post-media-grid>img,.cb-page-manager #managePagePosts .post-media-grid video,
    .cb-page-identity-mode .cb-page-mode-content .post-media-grid>img,.cb-page-identity-mode .cb-page-mode-content .post-media-grid video{height:260px!important;max-height:260px!important;object-fit:cover!important}
    @media(max-width:700px){.cb-page-manager #managePagePosts .post-media:not(.post-media-grid),.cb-page-identity-mode .cb-page-mode-content .post-media:not(.post-media-grid){height:310px!important;max-height:310px!important}.cb-page-manager #managePagePosts .post-media:not(.post-media-grid)>img,.cb-page-manager #managePagePosts .post-media:not(.post-media-grid)>video,.cb-page-identity-mode .cb-page-mode-content .post-media:not(.post-media-grid)>img,.cb-page-identity-mode .cb-page-mode-content .post-media:not(.post-media-grid)>video{max-height:310px!important}}
  `;
  document.head.appendChild(style);
})();

/* Authoritative Page media behavior: direct trusted picker click plus inline
   containment after every Page feed render. */
(function cirklebookAuthoritativePageMediaFix(){
  const pageId=()=>state.activePage?.id||state.activePage?.page_id||state.activePage?.pageId||'';

  document.addEventListener('click',event=>{
    const button=event.target.closest('#managePageCreatePhotoBtn,#cbPageModeMedia');
    if(!button||!state.activePage)return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const id=pageId();
    state.pagePostTarget={
      pageId:id,
      reload:()=>button.id==='cbPageModeMedia'
        ? window.CirklebookPageIdentityNav?.route('home')
        : openPageManager(state.activePage)
    };
    openPostModal(false);
    const input=document.getElementById('mediaInput');
    if(input){input.value='';input.click();}
  },true);

  const normalize=()=>{
    document.querySelectorAll('.cb-page-manager #managePagePosts .post-media,.cb-page-identity-surface #cbPageNetworkFeed .post-media').forEach(media=>{
      const items=[...media.querySelectorAll(':scope > img,:scope > video,:scope > .secure-video-shell > video')];
      const single=items.length<=1;
      const post=media.closest('.post');
      if(post){
        post.style.setProperty('display','block','important');
        post.style.setProperty('position','relative','important');
        post.style.setProperty('overflow','hidden','important');
        post.style.setProperty('background','#fff','important');
        const header=post.querySelector(':scope > .post-header');
        if(header){
          header.style.setProperty('display','flex','important');
          header.style.setProperty('position','relative','important');
          header.style.setProperty('z-index','6','important');
          header.style.setProperty('box-sizing','border-box','important');
          header.style.setProperty('width','100%','important');
          header.style.setProperty('min-height','64px','important');
          header.style.setProperty('height','auto','important');
          header.style.setProperty('padding','12px 16px','important');
          header.style.setProperty('margin','0','important');
          header.style.setProperty('transform','none','important');
          header.style.setProperty('background','#fff','important');
          header.style.setProperty('float','none','important');
          const avatar=header.querySelector('.avatar');
          if(avatar){
            avatar.style.setProperty('position','relative','important');
            avatar.style.setProperty('flex','0 0 40px','important');
            avatar.style.setProperty('width','40px','important');
            avatar.style.setProperty('height','40px','important');
          }
          const user=header.querySelector('.post-user');
          if(user){
            user.style.setProperty('position','relative','important');
            user.style.setProperty('display','block','important');
            user.style.setProperty('min-height','40px','important');
          }
        }
      }
      media.style.setProperty('width','100%','important');
      media.style.setProperty('position','relative','important');
      media.style.setProperty('z-index','1','important');
      media.style.setProperty('clear','both','important');
      media.style.setProperty('margin','0','important');
      media.style.setProperty('transform','none','important');
      media.style.setProperty('height',single?'360px':'auto','important');
      media.style.setProperty('max-height',single?'360px':'520px','important');
      media.style.setProperty('overflow','hidden','important');
      media.style.setProperty('background','#000','important');
      if(single){media.style.setProperty('display','flex','important');media.style.setProperty('align-items','center','important');media.style.setProperty('justify-content','center','important');}
      media.querySelectorAll(':scope > .secure-video-shell').forEach(shell=>{
        shell.style.setProperty('display','block','important');
        shell.style.setProperty('width','100%','important');
        shell.style.setProperty('height',single?'360px':'260px','important');
        shell.style.setProperty('min-height','0','important');
        shell.style.setProperty('max-height',single?'360px':'260px','important');
        shell.style.setProperty('overflow','hidden','important');
        shell.style.setProperty('margin','0','important');
      });
      items.forEach(item=>{
        item.style.setProperty('display','block','important');
        item.style.setProperty('width','100%','important');
        item.style.setProperty('height',single?'360px':'260px','important');
        item.style.setProperty('min-height','0','important');
        item.style.setProperty('max-height',single?'360px':'260px','important');
        item.style.setProperty('object-fit',single?'contain':'cover','important');
        item.style.setProperty('margin','0','important');
      });
      post?.querySelectorAll('.cb-post-boost-row,.cb-post-social-summary,.post-actions').forEach(row=>{
        row.style.setProperty('position','relative','important');
        row.style.setProperty('z-index','4','important');
        row.style.setProperty('background','#fff','important');
      });
    });
  };
  const schedule=()=>requestAnimationFrame(normalize);
  new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});
  schedule();
})();
/* Cirklebook verified messaging client. Keeps the existing application intact. */
(function(){
  'use strict';
  const API='https://cirklebook-4u6gv.ondigitalocean.app/api/v1', TOKEN='cirklebook_access_token';
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  async function req(path,options={}){const token=localStorage.getItem(TOKEN)||'';const response=await fetch(API+path,{...options,headers:{Accept:'application/json',...(options.body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:`Bearer ${token}`}:{})},credentials:'same-origin'});const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data?.error?.message||data?.message||`Request failed (${response.status})`);return data;}
  function show(html){const fn=window.CirklebookUiBridge?.showFeature||window.CirklebookShowFeature;if(typeof fn!=='function')throw new Error('Messenger is unavailable. Refresh the page.');fn(html);}
  function style(){if(document.getElementById('cbVerifiedMessengerStyle'))return;const node=document.createElement('style');node.id='cbVerifiedMessengerStyle';node.textContent='.cb-msg-shell{display:grid;grid-template-columns:280px minmax(0,1fr);height:calc(100vh - 95px);max-width:1000px;margin:auto;background:#fff;border-radius:12px;overflow:hidden}.cb-msg-list{border-right:1px solid #ddd;overflow:auto}.cb-msg-list h2{padding:16px;margin:0}.cb-msg-person{width:100%;border:0;background:#fff;display:flex;gap:10px;padding:12px;text-align:left;cursor:pointer}.cb-msg-person:hover,.cb-msg-person.active{background:#e7f3ff}.cb-msg-avatar{width:44px;height:44px;border-radius:50%;background:#1877f2;color:#fff;display:grid;place-items:center;flex:none}.cb-msg-person span:nth-child(2){min-width:0}.cb-msg-person small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#65676b}.cb-msg-badge{margin-left:auto;background:#e41e3f;color:#fff;border-radius:12px;padding:2px 7px;height:max-content}.cb-msg-pane{display:flex;flex-direction:column;min-width:0}.cb-msg-head{padding:15px;border-bottom:1px solid #ddd;font-weight:800}.cb-msg-items{flex:1;overflow:auto;padding:18px;display:flex;flex-direction:column;gap:8px}.cb-msg-bubble{max-width:72%;padding:9px 13px;border-radius:17px;background:#e4e6eb;align-self:flex-start;white-space:pre-wrap;overflow-wrap:anywhere}.cb-msg-bubble.mine{background:#1877f2;color:#fff;align-self:flex-end}.cb-msg-form{display:flex;gap:8px;padding:12px;border-top:1px solid #ddd}.cb-msg-form textarea{flex:1;resize:none;border:1px solid #ccd0d5;border-radius:18px;padding:10px 14px}.cb-msg-form button{border:0;border-radius:18px;background:#1877f2;color:#fff;padding:0 18px;font-weight:700}@media(max-width:700px){.cb-msg-shell{grid-template-columns:110px 1fr;height:calc(100vh - 65px)}.cb-msg-person small,.cb-msg-person b{display:none}.cb-msg-list h2{font-size:16px;padding:10px}.cb-msg-bubble{max-width:88%}}';document.head.appendChild(node);}
  let activeId='', refreshTimer=0;
  function myId(){try{const token=localStorage.getItem(TOKEN)||'',part=token.split('.')[1]||'',json=atob(part.replace(/-/g,'+').replace(/_/g,'/'));return JSON.parse(decodeURIComponent(Array.from(json).map(c=>'%'+c.charCodeAt(0).toString(16).padStart(2,'0')).join(''))).sub||'';}catch(_){return '';}}
  async function loadThread(id,name){activeId=id;document.querySelectorAll('.cb-msg-person').forEach(x=>x.classList.toggle('active',x.dataset.userId===id));const head=document.getElementById('cbMsgHead'),items=document.getElementById('cbMsgItems');if(!items)return;head.textContent=name||'Conversation';items.innerHTML='<div class="cb-empty-panel">Loading…</div>';try{const response=await req(`/messages/with/${encodeURIComponent(id)}`),messages=response?.data?.messages||[],me=myId();items.innerHTML=messages.length?messages.map(m=>`<div class="cb-msg-bubble ${String(m.sender_user_id)===String(me)?'mine':''}">${esc(m.body)}</div>`).join(''):'<div class="cb-empty-panel">No messages yet. Say hello.</div>';items.scrollTop=items.scrollHeight;}catch(error){items.innerHTML=`<div class="cb-empty-panel">${esc(error.message)}</div>`;}}
  async function openMessengerWith(selectedId=''){clearInterval(refreshTimer);style();show('<div class="feature-page"><section class="cb-msg-shell"><aside class="cb-msg-list"><h2>Messages</h2><div id="cbMsgPeople">Loading…</div></aside><main class="cb-msg-pane"><header id="cbMsgHead" class="cb-msg-head">Select a friend</header><div id="cbMsgItems" class="cb-msg-items"><div class="cb-empty-panel">Choose a friend to start messaging.</div></div><form id="cbMsgForm" class="cb-msg-form"><textarea id="cbMsgText" rows="1" maxlength="5000" placeholder="Write a message" disabled></textarea><button type="submit" disabled>Send</button></form></main></section></div>');
    const people=document.getElementById('cbMsgPeople');try{const response=await req('/messages/conversations'),rows=response?.data?.conversations||[];people.innerHTML=rows.length?rows.map(x=>`<button class="cb-msg-person" type="button" data-user-id="${esc(x.id)}" data-name="${esc(x.display_name||x.username)}"><span class="cb-msg-avatar">${esc(String(x.display_name||x.username||'U').charAt(0).toUpperCase())}</span><span><b>${esc(x.display_name||x.username)}</b><small>${esc(x.last_message||'Start a conversation')}</small></span>${x.unread_count?`<i class="cb-msg-badge">${Number(x.unread_count)}</i>`:''}</button>`).join(''):'<div class="cb-empty-panel">Add a friend before sending messages.</div>';people.querySelectorAll('.cb-msg-person').forEach(button=>button.onclick=()=>{document.getElementById('cbMsgText').disabled=false;document.querySelector('#cbMsgForm button').disabled=false;loadThread(button.dataset.userId,button.dataset.name);});const target=people.querySelector(`[data-user-id="${CSS.escape(String(selectedId||''))}"]`)||people.querySelector('.cb-msg-person');target?.click();}catch(error){people.innerHTML=`<div class="cb-empty-panel">${esc(error.message)}</div>`;}
    document.getElementById('cbMsgForm')?.addEventListener('submit',async event=>{event.preventDefault();const input=document.getElementById('cbMsgText'),button=event.currentTarget.querySelector('button'),body=input.value.trim();if(!activeId||!body)return;button.disabled=true;try{await req(`/messages/with/${encodeURIComponent(activeId)}`,{method:'POST',body:JSON.stringify({body})});input.value='';await loadThread(activeId,document.getElementById('cbMsgHead').textContent);}catch(error){alert(error.message);}finally{button.disabled=false;input.focus();}});
    refreshTimer=setInterval(()=>{if(activeId&&document.getElementById('cbMsgItems'))loadThread(activeId,document.getElementById('cbMsgHead')?.textContent);else clearInterval(refreshTimer);},6000);
  }
  window.openMessenger=()=>openMessengerWith('');window.CirklebookOpenMessengerWith=openMessengerWith;
  if(window.CirklebookUiBridge)window.CirklebookUiBridge.openMessenger=window.openMessenger;
})();

/* Verified notification center: renders server fields and friend-request actions. */
(function(){
  'use strict';
  const API='https://cirklebook-4u6gv.ondigitalocean.app/api/v1',TOKEN='cirklebook_access_token',esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  async function call(path,options={}){const token=localStorage.getItem(TOKEN)||'',response=await fetch(API+path,{...options,headers:{Accept:'application/json',...(options.body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:`Bearer ${token}`}:{})},credentials:'same-origin'}),data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data?.error?.message||data?.message||`Request failed (${response.status})`);return data;}
  function params(n){const value=n?.message_params??n?.messageParams??{};if(typeof value==='object'&&value)return value;try{return JSON.parse(value);}catch(_){return {};}}
  function typeOf(n){return String(n?.notification_type||n?.notificationType||n?.message_key||n?.messageKey||'general').replace(/^notification\./,'');}
  function label(type){return ({friend_request:'sent you a friend request',friend_request_accepted:'accepted your friend request',new_message:'sent you a message',new_follower:'started following you',post_share:'shared your post',post_comment:'commented on your post',post_reaction:'reacted to your post'})[type]||type.replace(/_/g,' ');}
  async function open(){const show=window.CirklebookUiBridge?.showFeature||window.CirklebookShowFeature;if(typeof show!=='function')return;show('<div class="feature-page"><div class="cb-panel"><h2>Notifications</h2><div id="cbVerifiedNotifications">Loading…</div></div></div>');const box=document.getElementById('cbVerifiedNotifications');try{const response=await call('/notifications?limit=50'),data=response?.data||response,rows=data?.notifications||data?.items||(Array.isArray(data)?data:[]);box.innerHTML=rows.length?`<div class="notification-list">${rows.map(n=>{const type=typeOf(n),p=params(n),actor=n.actor_display_name||n.actorDisplayName||n.actor_username||n.actorUsername||'Cirklebook user',requestId=p.requestId||p.request_id||n.target_id||n.targetId||'';return `<article class="notification-item ${n.is_read||n.isRead?'':'unread'}" data-notification-id="${esc(n.id||'')}"><span class="notification-dot"></span><div><b>${esc(actor)}</b><p>${esc(label(type))}</p>${type==='friend_request'?`<div><button type="button" class="cb-action primary" data-accept-request="${esc(requestId)}">Accept</button> <button type="button" class="cb-action" data-decline-request="${esc(requestId)}">Decline</button></div>`:type==='new_message'?`<button type="button" class="cb-action primary" data-open-message="${esc(n.actor_user_id||n.actorUserId||'')}">Open Message</button>`:''}</div></article>`;}).join('')}</div>`:'<div class="cb-empty-panel">No notifications.</div>';
      box.querySelectorAll('[data-accept-request],[data-decline-request]').forEach(button=>button.onclick=async()=>{const id=button.dataset.acceptRequest||button.dataset.declineRequest,accept=button.hasAttribute('data-accept-request');button.disabled=true;try{await call(`/friends/requests/${encodeURIComponent(id)}/${accept?'accept':'decline'}`,{method:'POST',body:'{}'});button.closest('.notification-item')?.remove();if(accept&&window.openMessenger){} }catch(error){button.disabled=false;alert(error.message);}});
      box.querySelectorAll('[data-open-message]').forEach(button=>button.onclick=()=>window.CirklebookOpenMessengerWith?.(button.dataset.openMessage));
    }catch(error){box.innerHTML=`<div class="cb-empty-panel">${esc(error.message)}</div>`;}}
  window.openNotificationsPage=open;if(window.CirklebookUiBridge)window.CirklebookUiBridge.openNotificationsPage=open;
})();


/* =========================================================
   CIRKLEBOOK MOBILE v5 — MEDIA + ANDROID BACK FIX
   - Media URLs always use the deployed API host in Capacitor.
   - Android hardware Back closes Create Post/Story/dialog overlays first.
========================================================= */
(function cirklebookMobileV5NavigationFix(){
    'use strict';

    function isVisible(el){
        return !!el && !el.classList.contains('hidden') && getComputedStyle(el).display !== 'none';
    }

    function closeTopOverlay(){
        // Create Post composer: this is the issue where Back could not leave
        // the composer until a post was published.
        if (isVisible(dom?.postModal)) {
            try { closePostModal(); } catch (_) {
                dom.postModal?.classList.add('hidden');
                document.body.style.overflow = '';
            }
            return true;
        }

        const ids = [
            'cbStoryViewerOverlay',
            'cbDialogOverlay',
            'cbShareOverlay',
            'cbReportOverlay',
            'cbSearchOverlay',
            'cbMobileSearchOverlay'
        ];
        for (const id of ids) {
            const el = document.getElementById(id);
            if (el && isVisible(el)) {
                const close = el.querySelector('[aria-label="Close"], .cb-dialog-close, .cb-circle-close, [data-close]');
                if (close) close.click(); else el.remove();
                document.body.style.overflow = '';
                return true;
            }
        }
        return false;
    }

    function handleBack(){
        if (closeTopOverlay()) return;

        // If a full feature/profile/reels surface is open, return to Home.
        try {
            const feature = document.getElementById('featureView');
            const home = document.getElementById('homeLayout');
            if (feature && !feature.classList.contains('hidden')) {
                if (typeof showHome === 'function') showHome();
                else {
                    feature.classList.add('hidden');
                    home?.classList.remove('hidden');
                }
                return;
            }
        } catch (_) {}

        // At Home, let Android handle the normal system Back behaviour.
        try {
            if (history.length > 1 && location.pathname !== '/' && !String(location.href).startsWith('capacitor://localhost/')) {
                history.back();
            }
        } catch (_) {}
    }

    // Capacitor App plugin (installed in this project).
    const capApp = window.Capacitor?.Plugins?.App;
    if (capApp?.addListener) {
        try { capApp.addListener('backButton', () => handleBack()); } catch (_) {}
    }

    // Compatibility with WebView/Cordova-style back events.
    document.addEventListener('backbutton', (event) => {
        try { event.preventDefault?.(); } catch (_) {}
        handleBack();
    }, false);

    window.CirklebookMobileHandleBack = handleBack;
    console.log('CIRKLEBOOK MOBILE v5 MEDIA/BACK FIX READY');
})();

/* =========================================================
   CIRKLEBOOK MOBILE CORE UX FIX v6
   - Universal people/page/group search fallback
   - Notification button + unread badge
   - Clean logout -> reliable re-login
   - Native login visual polish
========================================================= */
(function cirklebookMobileCoreUxFixV6(){
  'use strict';
  if (window.__CB_MOBILE_CORE_V6__) return;
  window.__CB_MOBILE_CORE_V6__ = true;

  const nativeMobile = !!(
    window.Capacitor?.isNativePlatform?.() ||
    location.protocol === 'capacitor:' ||
    location.hostname === 'localhost'
  );
  if (nativeMobile) document.documentElement.classList.add('cb-native-mobile');

  const esc = (v)=>String(v??'').replace(/[&<>"']/g,c=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
  const arr = (v)=>Array.isArray(v)?v:[];
  const unwrap = (v)=>v?.data?.data ?? v?.data ?? v ?? {};
  const normalizeUser = (u,label='People')=>{
    const x=u?.user||u?.friend||u?.follower||u?.following||u;
    if(!x||typeof x!=='object') return null;
    return {
      id:x.id||x.user_id||x.userId||'',
      name:x.displayName||x.display_name||x.name||x.username||'Cirklebook user',
      username:x.username||'',
      media:x.profileMediaId||x.profile_media_id||'',
      type:x.entityType||x.entity_type||'user',
      label
    };
  };
  const normalizeEntity = (x,type)=>x&&typeof x==='object'?{
    id:x.id||'',
    name:x.displayName||x.display_name||x.name||x.username||type,
    username:x.username||'',
    media:x.profileMediaId||x.profile_media_id||'',
    type:x.entityType||x.entity_type||type,
    label:type==='page'?'Page':type==='group'?'Group':'People'
  }:null;
  const mediaUrl = (id)=>id?`${API_BASE_URL}/media/asset/${encodeURIComponent(id)}`:'';

  function collectFromResult(result,label){
    const d=unwrap(result);
    let list=[];
    if(Array.isArray(d)) list=d;
    else {
      for(const k of ['users','friends','followers','following','pages','groups','items','results']) {
        if(Array.isArray(d?.[k])) list.push(...d[k]);
      }
    }
    return list.map(x=>label==='Page'?normalizeEntity(x,'page'):label==='Group'?normalizeEntity(x,'group'):normalizeUser(x,label)).filter(Boolean);
  }

  async function universalSearch(raw){
    const q=String(raw||'').trim();
    if(q.length<2){ showToast?.('Type at least 2 characters to search.'); return; }
    if(typeof cbShowDialog==='function') cbShowDialog('Search',`<div id="cbV6SearchResults" class="cb-v6-search"><div class="cb-v6-search-title">Searching for “${esc(q)}”…</div></div>`);
    const host=document.getElementById('cbV6SearchResults');
    const tasks=[
      ['All',`/users/search?q=${encodeURIComponent(q)}&limit=50`],
      ['Friend','/friends'],
      ['Follower','/follows/followers'],
      ['Following','/follows/following'],
      ['Page','/pages'],
      ['Group','/groups']
    ];
    const settled=await Promise.allSettled(tasks.map(([,path])=>apiRequest(path)));
    let all=[];
    settled.forEach((r,i)=>{
      if(r.status!=='fulfilled') return;
      const label=tasks[i][0];
      const items=collectFromResult(r.value,label);
      all.push(...items);
    });
    const needle=q.toLocaleLowerCase();
    all=all.filter(x=>`${x.name} ${x.username}`.toLocaleLowerCase().includes(needle));
    const seen=new Set();
    all=all.filter(x=>{
      const key=`${x.type}:${x.id||x.username||x.name}`.toLowerCase();
      if(seen.has(key)) return false; seen.add(key); return true;
    }).slice(0,60);
    if(!host) return;
    if(!all.length){ host.innerHTML=`<div class="cb-empty-panel">No matching friends, followers, Pages or Groups found for “${esc(q)}”.</div>`; return; }
    host.innerHTML=`<div class="cb-v6-search-title">Results for “${esc(q)}”</div><div class="cb-v6-search-list">${all.map(x=>{
      const av=mediaUrl(x.media);
      const badge=x.type==='page'?'Page':x.type==='group'?'Group':x.label;
      return `<article class="cb-v6-search-row" data-v6-entity-type="${esc(x.type)}" data-v6-entity-id="${esc(x.id)}">
        ${av?`<img src="${esc(av)}" alt="">`:`<span class="cb-v6-search-avatar">${esc(x.name.slice(0,1).toUpperCase())}</span>`}
        <div><strong>${esc(x.name)}</strong><small>${x.username?'@'+esc(x.username)+' · ':''}${esc(badge)}</small></div>
      </article>`;
    }).join('')}</div>`;
  }

  function replaceSearchInput(){
    const old=document.getElementById('topSearch');
    if(!old||old.dataset.cbV6Search==='1') return;
    const input=old.cloneNode(true);
    input.dataset.cbV6Search='1';
    old.replaceWith(input);
    let timer=null;
    input.addEventListener('keydown',e=>{
      if(e.key!=='Enter') return;
      e.preventDefault(); e.stopPropagation(); clearTimeout(timer); universalSearch(input.value);
    });
    input.addEventListener('input',()=>{
      clearTimeout(timer);
      const q=input.value.trim();
      if(q.length<2) return;
      timer=setTimeout(()=>universalSearch(q),500);
    });
  }

  function notificationRenderer(){
    return window.CirklebookRenderNotificationCenter || window.openNotificationsPage || window.openNotifications;
  }
  async function openNotificationsV6(){
    const fn=notificationRenderer();
    if(typeof fn==='function') return fn();
    if(typeof showFeature==='function') showFeature('<div class="feature-page"><div class="cb-panel"><h2>Notifications</h2><div id="cbNotificationRows">Loading…</div></div></div>');
    const host=document.getElementById('cbNotificationRows');
    try{
      const d=unwrap(await apiRequest('/notifications?limit=50'));
      const rows=arr(d.notifications||d.items||d);
      if(host) host.innerHTML=rows.length?rows.map(n=>`<div class="notification-item ${n.is_read||n.isRead?'':'unread'}"><div><strong>${esc(n.message||n.title||n.message_key||n.notification_type||'Notification')}</strong><br><small>${esc(n.created_at||n.createdAt||'')}</small></div></div>`).join(''):'<div class="cb-empty-panel">No notifications yet.</div>';
    }catch(e){ if(host) host.textContent=e.message||'Unable to load notifications.'; }
  }
  function bindNotificationButtons(){
    const top=document.getElementById('topNotificationsBtn');
    if(top&&!top.dataset.cbV6Notifications){
      const b=top.cloneNode(true); b.dataset.cbV6Notifications='1'; top.replaceWith(b);
      b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();openNotificationsV6();});
    }
    document.querySelectorAll('.sidebar-link').forEach(btn=>{
      if(btn.dataset.cbV6Notifications) return;
      if(!/notification/i.test(btn.textContent||'')) return;
      btn.dataset.cbV6Notifications='1';
      btn.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();openNotificationsV6();},true);
    });
  }
  async function refreshUnreadBadge(){
    const btn=document.getElementById('topNotificationsBtn');
    if(!btn||!getAccessToken?.()) return;
    try{
      const d=unwrap(await apiRequest('/notifications/unread-count'));
      const count=Number(d.unreadCount??d.unread_count??d.count??0)||0;
      let badge=btn.querySelector('.cb-v6-notification-badge');
      if(!badge){ badge=document.createElement('span'); badge.className='cb-v6-notification-badge'; btn.appendChild(badge); }
      badge.textContent=count>99?'99+':String(count);
      badge.hidden=count<1;
    }catch(_){ }
  }

  function cleanLocalSession(){
    const keep=new Set(['cirklebook_language']);
    Object.keys(localStorage).filter(k=>k.startsWith('cirklebook_')&&!keep.has(k)).forEach(k=>localStorage.removeItem(k));
    try{ sessionStorage.clear(); }catch(_){ }
  }
  function bindReliableLogout(){
    const old=document.getElementById('logoutButton');
    if(!old||old.dataset.cbV6Logout==='1') return;
    const btn=old.cloneNode(true); btn.dataset.cbV6Logout='1'; old.replaceWith(btn);
    btn.addEventListener('click',async e=>{
      e.preventDefault(); e.stopPropagation();
      const token=getAccessToken?.();
      if(token){ try{ await apiRequest(ROUTES.logout,{method:'POST',body:JSON.stringify({})}); }catch(_){ } }
      cleanLocalSession();
      try{ clearAccessToken?.(); }catch(_){ }
      location.reload();
    });
  }

  function installNativeLoginPolish(){
    if(!nativeMobile) return;
    const style=document.createElement('style');
    style.id='cbMobileV6Css';
    style.textContent=`
      .cb-native-mobile .login-screen{position:fixed!important;inset:0!important;overflow-y:auto!important;align-items:flex-start!important;padding:0!important;background:linear-gradient(160deg,#edf6ff 0%,#f8fbff 38%,#effdf3 72%,#fff4e8 100%)!important}
      .cb-native-mobile .login-shell{display:flex!important;flex-direction:column!important;width:100%!important;min-height:100%!important;gap:0!important}
      .cb-native-mobile .login-visual{width:calc(100% - 24px)!important;min-height:245px!important;height:245px!important;margin:14px auto 8px!important;border-radius:22px!important;background-image:url('assets/login-background.png'),radial-gradient(circle at 10% 18%,rgba(34,147,255,.55),transparent 42%),radial-gradient(circle at 88% 24%,rgba(80,225,52,.45),transparent 40%),radial-gradient(circle at 55% 95%,rgba(255,163,47,.42),transparent 44%),linear-gradient(135deg,#082760,#1187d8 45%,#3acb67 78%,#ffb24f)!important;background-size:contain,cover,cover,cover,cover!important;background-position:center!important;background-repeat:no-repeat!important;box-shadow:0 10px 28px rgba(5,34,85,.18)!important;flex:0 0 auto!important}
      .cb-native-mobile .login-card{width:calc(100% - 28px)!important;max-width:540px!important;margin:10px auto 26px!important;padding:22px 18px!important;border-radius:22px!important;box-shadow:0 8px 24px rgba(20,45,90,.13)!important}
      .cb-native-mobile .login-card h2{font-size:29px!important;margin:4px 0 20px!important}
      .cb-native-mobile #topNotificationsBtn{position:relative!important}
      .cb-v6-notification-badge{position:absolute;right:-3px;top:-4px;min-width:18px;height:18px;padding:0 4px;border-radius:999px;background:#e41e3f;color:#fff;border:2px solid #fff;font-size:10px;font-weight:800;line-height:14px;text-align:center}
      .cb-v6-search{display:grid;gap:10px}.cb-v6-search-title{color:#65676b}.cb-v6-search-list{display:grid;gap:7px}.cb-v6-search-row{display:flex;align-items:center;gap:12px;padding:10px;border:1px solid #e4e6eb;border-radius:12px;background:#fff}.cb-v6-search-row img,.cb-v6-search-avatar{width:48px;height:48px;border-radius:50%;object-fit:cover;flex:0 0 48px}.cb-v6-search-avatar{display:grid;place-items:center;background:#e7f3ff;color:#1877f2;font-weight:800}.cb-v6-search-row>div{display:grid;gap:3px;min-width:0}.cb-v6-search-row small{color:#65676b}
    `;
    document.head.appendChild(style);
  }

  function boot(){
    installNativeLoginPolish();
    replaceSearchInput();
    bindNotificationButtons();
    bindReliableLogout();
    refreshUnreadBadge();
    setInterval(refreshUnreadBadge,30000);
    const mo=new MutationObserver(()=>{bindNotificationButtons();bindReliableLogout();});
    mo.observe(document.body,{childList:true,subtree:true});
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true}); else setTimeout(boot,0);
})();
