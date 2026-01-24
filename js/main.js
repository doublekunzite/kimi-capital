// Security: Sanitize filename to prevent path traversal
function sanitizeFilename(filename) {
  return filename.replace(/[^a-zA-Z0-9\-_.]/g, '').replace(/\.\./g, '');
}

// Parse URL parameters
function getParam(name) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(name);
}

// Load and parse markdown file
async function loadPost(filename) {
  try {
    const safeFilename = sanitizeFilename(filename);
    const response = await fetch(`posts/${safeFilename}`);
    const markdown = await response.text();
    return parseMarkdownChat(markdown);
  } catch (error) {
    return []; // Fail silently in production
  }
}

// Split markdown into user/AI messages
function parseMarkdownChat(markdown) {
  const lines = markdown.split('\n');
  const messages = [];
  let currentMessage = null;
  let isUser = false;

  for (const line of lines) {
    if (line.trim().startsWith('> ')) {
      if (currentMessage) messages.push(currentMessage);
      isUser = true;
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
    
    // Security: Parse markdown then sanitize HTML output
    const rawHTML = marked.parse(msg.content);
    bubble.innerHTML = DOMPurify.sanitize(rawHTML, {
      ALLOWED_TAGS: ['p', 'h1', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'code', 'pre', 'strong', 'em', 'a', 'blockquote'],
      ALLOWED_ATTR: ['href']
    });
    
    messageDiv.appendChild(bubble);
    container.appendChild(messageDiv);
  });
}

// Load posts list for index page
async function loadPostsList() {
  if (!document.getElementById('posts-list')) return;

  const posts = [
    {
      filename: 'US-dialectic.md',
      title: 'Kimi analyzes the US government's recent actions',
      date: '2026-01-23'
    }
  ];

  const container = document.getElementById('posts-list');
  posts.forEach(post => {
    const link = document.createElement('a');
    link.href = `post.html?post=${post.filename}`;
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