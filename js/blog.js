const blogPosts = [
  { id: 1, title: '10 Essential Tips for First-Time Music Distributors', excerpt: 'Everything you need to know before releasing your first single or album on streaming platforms.', image: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=900', category: 'Getting Started', author: 'Sarah Johnson', date: '2024-12-15', readTime: '5 min read' },
  { id: 2, title: 'How to Maximize Your Spotify Streams in 2025', excerpt: 'Proven strategies to grow your audience and increase your monthly listeners on Spotify.', image: 'https://images.unsplash.com/photo-1614680376573-df3480f0c6ff?w=900', category: 'Marketing', author: 'Michael Chen', date: '2024-12-10', readTime: '8 min read' },
  { id: 3, title: 'Understanding Music Royalties: A Complete Guide', excerpt: 'Learn about different types of royalties and how you get paid for your music.', image: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?w=900', category: 'Education', author: 'Adebayo Ogunlesi', date: '2024-12-05', readTime: '10 min read' },
  { id: 4, title: 'The Rise of Afrobeats: Distribution Insights', excerpt: 'How African artists are taking over global streaming charts and what you can learn from them.', image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=900', category: 'Industry Trends', author: 'Chioma Nwankwo', date: '2024-11-28', readTime: '7 min read' },
  { id: 5, title: 'Pre-Save Campaigns: How to Build Hype', excerpt: 'Master the art of pre-save campaigns to ensure a successful release day.', image: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=900', category: 'Marketing', author: 'David Martinez', date: '2024-11-20', readTime: '6 min read' },
  { id: 6, title: 'Music Video Distribution: Beyond YouTube', excerpt: 'Explore platforms and strategies for distributing your music videos effectively.', image: 'https://images.unsplash.com/photo-1574755393849-623942ba4ade?w=900', category: 'Distribution', author: 'Emma Williams', date: '2024-11-15', readTime: '5 min read' }
];

const categories = ['All', 'Getting Started', 'Marketing', 'Education', 'Industry Trends', 'Distribution'];

let selectedCategory = 'All';
let searchQuery = '';

const categoryButtonsEl = document.getElementById('categoryButtons');
const blogGridEl = document.getElementById('blogGrid');
const featuredPostEl = document.getElementById('featuredPost');
const noPostsEl = document.getElementById('noPosts');
const searchInputEl = document.getElementById('searchInput');
const clearFiltersBtn = document.getElementById('clearFiltersBtn');

function formatDate(dateString, options = { month: 'short', day: 'numeric', year: 'numeric' }) {
  return new Date(dateString).toLocaleDateString('en-US', options);
}

function renderCategoryButtons() {
  categoryButtonsEl.innerHTML = '';
  categories.forEach(category => {
    const btn = document.createElement('button');
    btn.className = `button ${selectedCategory === category ? '' : 'outline'}`;
    btn.textContent = category;
    btn.onclick = () => {
      selectedCategory = category;
      render();
    };
    categoryButtonsEl.appendChild(btn);
  });
}

function render() {
  const filteredPosts = blogPosts.filter(post => {
    const matchesCategory = selectedCategory === 'All' || post.category === selectedCategory;
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch = q === '' || post.title.toLowerCase().includes(q) || post.excerpt.toLowerCase().includes(q);
    return matchesCategory && matchesSearch;
  });

  blogGridEl.innerHTML = '';
  featuredPostEl.innerHTML = '';

  if (filteredPosts.length === 0) {
    noPostsEl.style.display = 'block';
    featuredPostEl.style.display = 'none';
    return;
  }

  noPostsEl.style.display = 'none';
  featuredPostEl.style.display = 'block';

  if (selectedCategory === 'All' && searchQuery.trim() === '') {
    const first = filteredPosts[0];
    featuredPostEl.innerHTML = `
      <div class="card card-hero" style="overflow:hidden; margin-bottom:1.5rem;">
        <img src="${first.image}" alt="${first.title}" />
        <div class="card-body" style="background:rgba(16,16,16,0.75);">
          <p class="badge">Featured</p>
          <p class="badge" style="background:transparent; border: 1px solid var(--primary); color: var(--primary);">${first.category}</p>
          <h2 style="font-size:2.1rem; margin:0.6rem 0;">${first.title}</h2>
          <p style="color:var(--text-secondary);">${first.excerpt}</p>
          <p style="color:var(--text-secondary); font-size:0.9rem; margin-top:0.5rem;">${first.author} • ${formatDate(first.date)} • ${first.readTime}</p>
          <button class="button" style="margin-top:1rem;">Read More →</button>
        </div>
      </div>
    `;
  }

  const startIndex = selectedCategory === 'All' && searchQuery.trim() === '' ? 1 : 0;

  filteredPosts.slice(startIndex).forEach(post => {
    const card = document.createElement('article');
    card.className = 'card';
    card.innerHTML = `
      <div class="card-hero"><img src="${post.image}" alt="${post.title}" /></div>
      <div class="card-body">
        <p class="badge" style="margin-bottom: .5rem; border:1px solid var(--primary); color:var(--primary); background: rgba(255,107,0,.12);">${post.category}</p>
        <h3>${post.title}</h3>
        <p>${post.excerpt}</p>
        <p style="color:var(--text-secondary); font-size:0.85rem; margin:0.5rem 0;">${post.author} • ${formatDate(post.date,{month:'short', day:'numeric'})} • ${post.readTime}</p>
        <div><button class="button outline">Read More →</button></div>
      </div>
    `;
    blogGridEl.appendChild(card);
  });
}

searchInputEl.addEventListener('input', event => {
  searchQuery = event.target.value;
  render();
});

clearFiltersBtn.addEventListener('click', () => {
  selectedCategory = 'All';
  searchQuery = '';
  searchInputEl.value = '';
  render();
});

renderCategoryButtons();
render();
