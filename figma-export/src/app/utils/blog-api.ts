import { BACKEND_API_BASE_URL } from './backend-api-base';

// BlogPost type copied from backend (keep in sync if changed)
export interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  content?: string;
  image?: string;
  category: string;
  author: string;
  date: string;
  readTime: string;
  source: string;
  sourceKey?: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

const API_BASE_URL = BACKEND_API_BASE_URL;

export async function getPublishedBlogPosts(): Promise<BlogPost[]> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/blog/posts`);
  } catch (err) {
    // Network or CORS error
    console.error('Network error fetching blog posts:', err);
    throw new Error('Network error fetching blog posts. Check your connection and CORS settings.');
  }

  if (!response.ok) {
    let errorMsg = `API error: ${response.status}`;
    try {
      const error = await response.json();
      errorMsg = error.error || errorMsg;
    } catch {}
    console.error('Blog API error:', errorMsg);
    throw new Error(errorMsg);
  }

  const result = await response.json() as { posts: BlogPost[] };
  return result.posts;
}