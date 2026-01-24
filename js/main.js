// Security: Sanitize filename
function sanitizeFilename(filename) {
  return filename.replace(/[^a-zA-Z0-9\-_.]/g, '').replace(/\.\./g, '');
}

// Parse URL parameters
function getParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

// Load post file
async function loadPost(filename) {
  try {
    const safeFilename = sanitizeFilename(filename);
    const response = await fetch(`posts/${safeFilename}`);
    if (!response.ok) return [];
    const markdown = await response.text();
    return parseMarkdownChat(markdown);
  } catch (error) {
    return [];
  }
}

// FIXED: Properly parse both prompts and responses
function parseMarkdownChat(markdown) {
  const lines = markdown.split('\n');
  const messages = [];
  let currentMessage = null;

  for (const line of lines) {
    const trimmed = line.trim();
    
    // User prompt detected
    if (trimmed.startsWith('> ')) {
      if (currentMessage) messages.push(currentMessage);
      currentMessage = {
        role: 'user',
        content: line.replace(/^>\s?/, '') // Remove > and optional space
      };
    } 
    // Empty line - push current message
    else if (trimmed === '') {
      if (currentMessage) {
        messages.push(currentMessage);
        currentMessage = null;
      }
    } 
    // AI response line
    else {
      if (!currentMessage) {
        // Start new AI message if none exists
        currentMessage = {
          role: 'ai',
          content: line
        };
      } else {
        // Append to existing message
        currentMessage.content += '\n' + line;
      }
    }
  }

  // Push final message
  if (currentMessage) messages.push(currentMessage);
  return messages;
}

// Render chat bubbles with XSS protection
function renderChat(messages) {
  const container = document.getElementById('chat-container');
  if (!container) return;

  messages.forEach(msg => {
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
  const container = document.getElementById('posts-list');
  if (!container) return;

  const posts = [
    {
      filename: 'US-dialectic.md',
      title: 'Kimi analyzes the US government\'s recent actions',
      date: '2026-01-23'
    }
  ];

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
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  const postFile = getParam('post');
  
  if (postFile) {
    const messages = await loadPost(postFile);
    renderChat(messages);
    
    if (messages.length > 0) {
      const firstLine = messages[0].content.split('\n')[0];
      document.getElementById('post-title').textContent = 
        `${firstLine.substring(0, 50)}... | Kimi & Capital`;
    }
  } else {
    loadPostsList();
  }
});