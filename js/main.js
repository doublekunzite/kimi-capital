function sanitizeFilename(filename) {
  return filename.replace(/[^a-zA-Z0-9\-_.]/g, '').replace(/\.\./g, '');
}

function getParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

// Auto-detect base path for GitHub Pages
function getBasePath() {
  const pathParts = window.location.pathname.split('/');
  if (pathParts[1] && pathParts[1] !== 'index.html') {
    return `/${pathParts[1]}`;
  }
  return '';
}

async function loadPost(filename) {
  const basePath = getBasePath();
  const safeFilename = sanitizeFilename(filename);
  const fullPath = `${basePath}/posts/${safeFilename}`;
  
  console.log('[Debug] Fetching:', fullPath); // Check console for URL
  
  try {
    const response = await fetch(fullPath);
    if (!response.ok) {
      console.error('[Debug] Fetch failed:', response.status, response.statusText);
      return { metadata: {}, messages: [] };
    }
    
    const markdown = await response.text();
    console.log('[Debug] Markdown loaded, length:', markdown.length);
    return parseMarkdownWithFrontmatter(markdown);
  } catch (error) {
    console.error('[Debug] Error:', error);
    return { metadata: {}, messages: [] };
  }
}

function parseMarkdownWithFrontmatter(markdown) {
  const lines = markdown.split('\n');
  let pos = 0;
  let metadata = {};
  let messages = [];

  // Parse frontmatter
  if (lines[0] && lines[0].trim() === '---') {
    pos++;
    while (pos < lines.length && lines[pos].trim() !== '---') {
      const line = lines[pos];
      const colonIndex = line.indexOf(':');
      if (colonIndex > -1) {
        const key = line.substring(0, colonIndex).trim();
        const value = line.substring(colonIndex + 1).trim().replace(/^["']|["']$/g, '');
        metadata[key] = value;
      }
      pos++;
    }
    if (lines[pos] && lines[pos].trim() === '---') {
      pos++; // Skip closing ---
    }
  }

  // Parse messages
  let currentMessage = null;
  for (; pos < lines.length; pos++) {
    const line = lines[pos];
    const trimmed = line.trim();
    
    if (trimmed.startsWith('> ')) {
      if (currentMessage) messages.push(currentMessage);
      currentMessage = {
        role: 'user',
        content: line.replace(/^>\s?/, '')
      };
    } else if (trimmed === '' && currentMessage) {
      messages.push(currentMessage);
      currentMessage = null;
    } else {
      if (!currentMessage) {
        currentMessage = {
          role: 'ai',
          content: line
        };
      } else {
        currentMessage.content += '\n' + line;
      }
    }
  }

  if (currentMessage) messages.push(currentMessage);
  return { metadata, messages };
}

function renderChat(metadata, messages) {
  const container = document.getElementById('chat-container');
  if (!container) return;

  // Render from metadata
  const title = document.createElement('h2');
  title.className = 'post-header-title';
  title.textContent = metadata.title || 'Untitled Post';
  container.appendChild(title);

  if (metadata.date || metadata.author) {
    const meta = document.createElement('div');
    meta.className = 'post-meta';
    const parts = [];
    if (metadata.date) parts.push(metadata.date);
    if (metadata.author) parts.push(`by ${metadata.author}`);
    meta.innerHTML = parts.join(' &nbsp;&bull;&nbsp; ');
    container.appendChild(meta);
  }

  messages.forEach(msg => {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${msg.role}-message`;
    
    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    
    if (msg.role === 'user') {
      const label = document.createElement('span');
      label.className = 'user-label';
      label.textContent = 'You asked:';
      bubble.appendChild(label);
    }
    
    const rawHTML = marked.parse(msg.content);
    bubble.innerHTML += DOMPurify.sanitize(rawHTML, {
      ALLOWED_TAGS: ['p', 'h1', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'code', 'pre', 'strong', 'em', 'a', 'blockquote'],
      ALLOWED_ATTR: ['href']
    });
    
    messageDiv.appendChild(bubble);
    container.appendChild(messageDiv);
  });
}

async function loadPostsList() {
  const container = document.getElementById('posts-list');
  if (!container) return;

  const basePath = getBasePath();
  
  try {
    const response = await fetch(`${basePath}/posts.json`);
    if (!response.ok) {
      console.error('Failed to load posts.json:', response.status);
      return;
    }
    
    const posts = await response.json();
    
    if (posts.length === 0) {
      container.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">No posts yet.</p>';
      return;
    }

    posts.forEach(post => {
      const link = document.createElement('a');
      link.href = `post.html?post=${encodeURIComponent(post.filename)}`;
      link.innerHTML = `
        <div class="post-title">${post.title}</div>
        <div class="post-date">${post.date}</div>
      `;
      container.appendChild(link);
    });
  } catch (error) {
    console.error('Error loading posts:', error);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const postFile = getParam('post');
  if (postFile) {
    const { metadata, messages } = await loadPost(postFile);
    renderChat(metadata, messages);
  } else {
    loadPostsList();
  }
});