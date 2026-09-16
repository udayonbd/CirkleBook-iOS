(function () {
  'use strict';

  const API_BASE = 'http://localhost:5000/api/v1';
  const PROFILE_BODY_ID = 'profileTabBody';
  let busy = false;
  let lastSignature = '';

  function token() {
    try {
      if (typeof window.getAccessToken === 'function') {
        const t = window.getAccessToken();
        if (t) return t;
      }
    } catch (_) {}
    return (
      localStorage.getItem('accessToken') ||
      localStorage.getItem('cirklebook_access_token') ||
      localStorage.getItem('access_token') ||
      ''
    );
  }

  function esc(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function mediaList(post) {
    if (Array.isArray(post?.media)) return post.media;
    if (Array.isArray(post?.media_assets)) return post.media_assets;
    if (Array.isArray(post?.mediaAssets)) return post.mediaAssets;
    if (post?.media && typeof post.media === 'object') return [post.media];
    return [];
  }

  function mediaType(item) {
    const t = String(
      item?.media_type || item?.mediaType || item?.type || item?.mime_type || item?.mimeType || ''
    ).toLowerCase();
    if (t.includes('video')) return 'video';
    if (t.includes('image')) return 'image';
    const u = String(mediaUrl(item)).toLowerCase();
    if (/\.(mp4|webm|mov|m4v)(\?|$)/.test(u)) return 'video';
    return 'image';
  }

  function mediaUrl(item) {
    try {
      if (typeof window.buildMediaUrl === 'function') {
        const u = window.buildMediaUrl(item);
        if (u) return u;
      }
    } catch (_) {}
    if (!item) return '';
    const direct = item.url || item.public_url || item.signed_url || item.publicUrl || item.signedUrl;
    if (direct) return direct;
    const key = item.storage_key || item.storageKey;
    if (key) {
      const clean = String(key).replace(/\\/g, '/').replace(/^uploads\//, '');
      return 'http://localhost:5000/uploads/' + clean;
    }
    return '';
  }

  function extractPosts(result) {
    const candidates = [
      result?.data?.posts,
      result?.posts,
      result?.data?.items,
      result?.items,
      result?.data?.results,
      result?.results,
      result?.data
    ];
    for (const c of candidates) if (Array.isArray(c)) return c;
    return [];
  }

  async function fetchMine() {
    const t = token();
    if (!t) throw new Error('Access token not found. Please log in again.');
    const res = await fetch(API_BASE + '/posts/mine?limit=50', {
      method: 'GET',
      headers: {
        Authorization: 'Bearer ' + t,
        Accept: 'application/json'
      },
      credentials: 'include'
    });
    let result = {};
    try { result = await res.json(); } catch (_) {}
    if (!res.ok) {
      throw new Error(
        result?.message ||
        result?.error?.message ||
        ('Could not load profile posts (' + res.status + ')')
      );
    }
    return extractPosts(result);
  }

  function activeTab() {
    return document.querySelector('[data-profile-tab].active')?.dataset?.profileTab || 'all';
  }

  function currentAvatar() {
    return (
      localStorage.getItem('cirklebook_profile_photo') ||
      document.querySelector('.profile-big-avatar')?.src ||
      ''
    );
  }

  function enhanceRenderedPosts(scope) {
    const avatar = currentAvatar();

    scope.querySelectorAll('.post').forEach((post) => {
      if (avatar) {
        const a = post.querySelector('.avatar');
        if (a) {
          a.textContent = '';
          a.style.backgroundImage = 'url("' + avatar.replace(/"/g, '%22') + '")';
          a.style.backgroundSize = 'cover';
          a.style.backgroundPosition = 'center';
          a.style.backgroundColor = '#fff';
        }
      }

      const actions = post.querySelector('.post-actions');
      if (!actions) return;
      const postId = post.dataset.post || post.dataset.postId || '';

      if (!actions.querySelector('[data-profile-extra="report"]')) {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = 'Report';
        b.dataset.profileExtra = 'report';
        b.dataset.postId = postId;
        actions.appendChild(b);
      }

      if (!actions.querySelector('[data-profile-extra="boost"]')) {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = 'Boost Post';
        b.dataset.profileExtra = 'boost';
        b.dataset.postId = postId;
        actions.appendChild(b);
      }
    });
  }

  function renderPostCard(post) {
    try {
      if (typeof window.renderPost === 'function') {
        return window.renderPost(post);
      }
    } catch (_) {}

    const id = post?.id || '';
    const name =
      post?.display_name ||
      post?.author_display_name ||
      post?.username ||
      post?.author_username ||
      post?.author?.display_name ||
      post?.author?.username ||
      'Cirklebook User';

    const body = post?.body ? '<div class="post-body">' + esc(post.body) + '</div>' : '';
    let media = '';
    for (const m of mediaList(post)) {
      const u = mediaUrl(m);
      if (!u) continue;
      media += mediaType(m) === 'video'
        ? '<video controls preload="metadata" src="' + esc(u) + '"></video>'
        : '<img src="' + esc(u) + '" alt="Post media" loading="lazy">';
    }

    return (
      '<article class="card post" data-post="' + esc(id) + '">' +
        '<div class="post-header"><span class="avatar">' + esc(name.charAt(0).toUpperCase()) + '</span>' +
        '<div class="post-user"><div class="post-name">' + esc(name) + '</div></div></div>' +
        body +
        (media ? '<div class="post-media">' + media + '</div>' : '') +
      '</article>'
    );
  }

  function allPanel(body, posts) {
    const right = body.querySelector('.profile-content > div:nth-child(2)') || body;
    let panel = right.querySelector('#cbProfileRealPostsPanel');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'cbProfileRealPostsPanel';
      panel.className = 'cb-panel';
      right.appendChild(panel);
    }

    // Remove only the old placeholder panel, never the composer.
    right.querySelectorAll('.cb-panel').forEach((p) => {
      if (p === panel) return;
      const text = (p.textContent || '').trim();
      if (text.includes('Your profile content and posts appear here.')) p.remove();
    });

    panel.innerHTML =
      '<div class="cb-profile-posts-head">' +
        '<h3>Posts</h3>' +
        '<div><button type="button" class="cb-action">Filters</button> ' +
        '<button type="button" class="cb-action">Manage posts</button></div>' +
      '</div>' +
      '<div id="cbProfilePostsList"></div>';

    const list = panel.querySelector('#cbProfilePostsList');
    if (!posts.length) {
      list.innerHTML = '<div class="cb-profile-empty">No posts yet.</div>';
      return;
    }
    list.innerHTML = posts.map(renderPostCard).join('');
    enhanceRenderedPosts(list);
  }

  function photosPanel(body, posts) {
    const photos = [];
    for (const post of posts) {
      for (const m of mediaList(post)) {
        if (mediaType(m) !== 'image') continue;
        const u = mediaUrl(m);
        if (u) photos.push({ url: u, post });
      }
    }
    body.innerHTML =
      '<div class="cb-panel">' +
        '<div class="cb-profile-section-head"><h2>Photos</h2><span>' + photos.length + ' photos</span></div>' +
        (photos.length
          ? '<div class="cb-profile-photo-grid">' +
              photos.map(x => '<img src="' + esc(x.url) + '" alt="Profile photo post" loading="lazy">').join('') +
            '</div>'
          : '<div class="cb-profile-empty">No photos yet.</div>') +
      '</div>';
  }

  function reelsPanel(body, posts) {
    const videoPosts = posts.filter((p) => mediaList(p).some((m) => mediaType(m) === 'video'));
    body.innerHTML =
      '<div class="cb-panel"><div class="cb-profile-section-head"><h2>Reels & Videos</h2>' +
      '<span>' + videoPosts.length + ' videos</span></div><div id="cbProfileVideoPosts"></div></div>';

    const list = body.querySelector('#cbProfileVideoPosts');
    if (!videoPosts.length) {
      list.innerHTML = '<div class="cb-profile-empty">No videos yet.</div>';
      return;
    }
    list.innerHTML = videoPosts.map(renderPostCard).join('');
    enhanceRenderedPosts(list);
  }

  async function hydrate() {
    const body = document.getElementById(PROFILE_BODY_ID);
    if (!body || busy) return;

    const tab = activeTab();
    if (!['all', 'photos', 'reels'].includes(tab)) return;

    const sig = tab + '|' + (body.textContent || '').slice(0, 120);
    if (sig === lastSignature && body.querySelector('[data-cb-profile-loaded="1"]')) return;

    busy = true;
    try {
      let loading = body.querySelector('#cbProfilePostsLoading');
      if (!loading && tab === 'all') {
        loading = document.createElement('div');
        loading.id = 'cbProfilePostsLoading';
        loading.className = 'cb-profile-loading';
        loading.textContent = 'Loading your posts...';
        const right = body.querySelector('.profile-content > div:nth-child(2)') || body;
        right.appendChild(loading);
      }

      const posts = await fetchMine();
      posts.sort((a, b) => {
        const ta = new Date(a?.created_at || a?.createdAt || 0).getTime();
        const tb = new Date(b?.created_at || b?.createdAt || 0).getTime();
        return tb - ta;
      });

      document.getElementById('cbProfilePostsLoading')?.remove();

      if (tab === 'all') allPanel(body, posts);
      else if (tab === 'photos') photosPanel(body, posts);
      else if (tab === 'reels') reelsPanel(body, posts);

      body.dataset.cbProfileLoaded = '1';
      lastSignature = tab + '|loaded|' + posts.length;
    } catch (err) {
      document.getElementById('cbProfilePostsLoading')?.remove();
      const right = body.querySelector('.profile-content > div:nth-child(2)') || body;
      let box = right.querySelector('#cbProfilePostsError');
      if (!box) {
        box = document.createElement('div');
        box.id = 'cbProfilePostsError';
        box.className = 'cb-panel cb-profile-error';
        right.appendChild(box);
      }
      box.textContent = err?.message || 'Unable to load profile posts.';
    } finally {
      busy = false;
    }
  }

  // Profile-render observer: openProfilePage replaces profileTabBody each time a tab is changed.
  const observer = new MutationObserver(() => {
    if (document.getElementById(PROFILE_BODY_ID)) {
      setTimeout(hydrate, 40);
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  document.addEventListener('click', async (event) => {
    const body = document.getElementById(PROFILE_BODY_ID);
    if (!body || !body.contains(event.target)) return;

    const extra = event.target.closest('[data-profile-extra]');
    if (extra) {
      event.preventDefault();
      event.stopPropagation();
      const id = extra.dataset.postId || '';
      if (extra.dataset.profileExtra === 'report') {
        if (typeof window.openReport === 'function') window.openReport(id);
        else alert('Report option is available from the post menu.');
      } else if (extra.dataset.profileExtra === 'boost') {
        if (typeof window.cbShowDialog === 'function') {
          window.cbShowDialog(
            'Boost Post',
            '<div class="cb-form-grid"><select><option>Engagement</option><option>Followers</option><option>Messages</option><option>Video Views</option></select><input placeholder="Audience"><input placeholder="Location"><input type="number" placeholder="Budget"><input type="number" placeholder="Duration (days)"><button class="primary-button">Continue to Payment & Ad Review</button></div>'
          );
        } else {
          alert('Boost Post');
        }
      }
      return;
    }

    if (event.target.closest('[data-action]') && typeof window.handleFeedClick === 'function') {
      await window.handleFeedClick(event);
    }
  }, true);

  document.addEventListener('keydown', async (event) => {
    const body = document.getElementById(PROFILE_BODY_ID);
    if (!body || !body.contains(event.target)) return;
    if (event.target.closest('[data-comment-input]') && typeof window.handleFeedKeydown === 'function') {
      await window.handleFeedKeydown(event);
    }
  }, true);

  // Add styles without replacing the stable main stylesheet.
  const style = document.createElement('style');
  style.textContent = `
    #cbProfileRealPostsPanel { padding: 0; overflow: hidden; }
    .cb-profile-posts-head,.cb-profile-section-head {
      display:flex; align-items:center; justify-content:space-between;
      gap:12px; padding:14px 16px; border-bottom:1px solid #e4e6eb;
    }
    .cb-profile-posts-head h3,.cb-profile-section-head h2 { margin:0; }
    #cbProfilePostsList .card.post,#cbProfileVideoPosts .card.post {
      margin:12px 0; border:1px solid #e4e6eb; border-radius:10px; overflow:hidden;
      box-shadow:none;
    }
    .cb-profile-empty,.cb-profile-loading {
      padding:26px 16px; text-align:center; color:#65676b;
    }
    .cb-profile-error {
      color:#b42318; background:#fff4f2; border:1px solid #fecdca;
      padding:14px; margin-top:12px;
    }
    .cb-profile-photo-grid {
      display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:5px; padding:12px;
    }
    .cb-profile-photo-grid img {
      width:100%; aspect-ratio:1/1; object-fit:cover; border-radius:8px; background:#f0f2f5;
    }
    @media (max-width:700px) {
      .cb-profile-photo-grid { grid-template-columns:repeat(2,minmax(0,1fr)); }
    }
  `;
  document.head.appendChild(style);

  setTimeout(hydrate, 300);
})();
