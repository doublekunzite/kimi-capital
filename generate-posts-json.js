// Run: node generate-posts-json.js
const fs = require('fs');
const path = require('path');

function parseFrontmatter(content) {
  const lines = content.split('\n');
  const metadata = {};
  
  if (lines[0] && lines[0].trim() === '---') {
    let pos = 1;
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
  }
  
  return metadata;
}

function generatePostsJson() {
  const postsDir = path.join(__dirname, 'posts');
  const posts = [];
  
  const files = fs.readdirSync(postsDir);
  
  files.forEach(file => {
    if (file.endsWith('.md')) {
      const filePath = path.join(postsDir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const metadata = parseFrontmatter(content);
      
      posts.push({
        filename: file,
        title: metadata.title || 'Untitled Post',
        date: metadata.date || 'No date'
      });
    }
  });
  
  // Sort by date (newest first)
  posts.sort((a, b) => new Date(b.date) - new Date(a.date));
  
  fs.writeFileSync('posts.json', JSON.stringify(posts, null, 2));
  console.log(`✅ Generated posts.json with ${posts.length} posts`);
}

generatePostsJson();