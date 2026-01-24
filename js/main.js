// Debug helper
function log(msg, data = null) {
  console.log(`[Kimi & Capital] ${msg}`, data || '');
}

// Security: Sanitize filename
function sanitizeFilename(filename) {
  const sanitized = filename.replace(/[^a-zA-Z0-9\-_.]/g, '').replace(/\.\./g, '');
  log('Sanitized filename:', { original: filename, sanitized });
  return sanitized;
}

// Parse URL parameters
function getParam(name) {
  const value = new URLSearchParams(window.location.search).get(name);
  log('URL param fetched:', { name, value });
  return value;
}

// Load post file
async function loadPost(filename) {
  try {
    const safeFilename = sanitizeFilename(filename);
    const path = `posts/${safeFilename}`;
    log('Attempting to fetch:', path);
    
    const response = await fetch(path);
    
    if (!response.ok) {
      log('Fetch failed:', { status: response.status, statusText: response.statusText });
      return [];
    }
    
    const markdown = await response.text();
    log('Markdown loaded, length:', markdown.length);
    return parseMarkdownChat(markdown);
  } catch (error) {
    log('Error in loadPost:', error.message);
    return [];
  }
}

// Parse markdown into messages
function parseMarkdownChat(markdown) {
  const lines = markdown.split('\n');
  const messages = [];
  let currentMessage = null;

  for (const line of lines) {
    if (line.trim().startsWith('> ')) {
      if (currentMessage) messages.push(currentMessage);
      currentMessage = {
        role: 'user',
        content: line.replace('> ', '')
      };
    } else if (line.trim() === '' && currentMessage) {
      messages.push(currentMessage);
      currentMessage = null;
    } else if (currentMessage) {
      currentMessage.content += '\n' + line;
    }
  }

  if (currentMessage) messages.push(currentMessage);
  log('Parsed messages:', messages.length);
  return messages;
}

// Render chat bubbles with XSS protection
function renderChat(messages) {
  const container = document.getElementById('chat-container');
  log('Rendering to container:', container ? 'found' : 'MISSING');
  
  if (!container) return;

  messages.forEach((msg, i) => {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${msg.role}-message`;
    
    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    
    const rawHTML = marked.parse(msg.content);
    bubble.innerHTML = DOMPurify.sanitize(rawHTML, {
      ALLOWED_TAGS: ['p', 'h1', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'code', 'pre', 'strong', 'em', 'a', 'blockquote'],
      ALLOWED_ATTR: ['href']
    });
    
    messageDiv.appendChild(bubble);
    container.appendChild(messageDiv);
  });
}

// Load posts list
function loadPostsList() {
  log('Loading posts list...');
  
  const container = document.getElementById('posts-list');
  if (!container) {
    log('ERROR: #posts-list element not found!');
    return;
  }

  // Your posts array (as provided)
  const posts = [
    {
      filename: 'US-dialectic.md',
      title: 'Kimi analyzes the US government's recent actions',
      date: '2026-01-23'
    }
  ];

  log('Posts array:', posts);

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
  
  log('Posts rendered successfully');
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  log('DOM ready, initializing...');
  
  const postFile = getParam('post');
  
  if (postFile) {
    log('Post view mode:', postFile);
    const messages = await loadPost(postFile);
    renderChat(messages);
    
    if (messages.length > 0) {
      const firstLine = messages[0].content.split('\n')[0];
      document.getElementById('post-title').textContent = 
        `${firstLine.substring(0, 50)}... | Kimi & Capital`;
    }
  } else {
    log('Index view mode');
    loadPostsList();
  }
});