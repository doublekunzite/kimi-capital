function sanitizeFilename(filename) {
  return filename.replace(/[^a-zA-Z0-9\-_.]/g, '').replace(/\.\./g, '');
}

function getParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

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

function parseMarkdownChat(markdown) {
  const lines = markdown.split('\n');
  const messages = [];
  let currentMessage = null;

  for (const line of lines) {
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
  return messages;
}

function renderChat(messages) {
  const container = document.getElementById('chat-container');
  if (!container) return;

  // Add title above first prompt
  const title = document.createElement('h2');
  title.className = 'post-header-title';
  title.textContent = 'Dialectical Materialist Analysis: US Government Actions January 2026';
  container.appendChild(title);

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

document.addEventListener('DOMContentLoaded', async () => {
  const postFile = getParam('post');
  
  if (postFile) {
    const messages = await loadPost(postFile);
    renderChat(messages);
  } else {
    loadPostsList();
  }
});