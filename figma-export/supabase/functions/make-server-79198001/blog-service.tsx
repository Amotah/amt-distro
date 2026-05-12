import * as kv from './kv_store.tsx';
import type { ReleaseMetadata } from './metadata-service.tsx';

export type BlogPostSource = 'manual' | 'release-update';

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
  source: BlogPostSource;
  sourceKey?: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

const BLOG_POST_PREFIX = 'blog:post:';
const BLOG_RELEASE_PREFIX = 'blog:release:';

function blogPostKey(id: string) {
  return `${BLOG_POST_PREFIX}${id}`;
}

function blogReleaseKey(releaseId: string) {
  return `${BLOG_RELEASE_PREFIX}${releaseId}`;
}

function sortPosts(posts: BlogPost[]) {
  return posts.sort((left, right) => {
    const leftDate = new Date(left.date || left.createdAt).getTime();
    const rightDate = new Date(right.date || right.createdAt).getTime();
    return rightDate - leftDate;
  });
}

function computeReadTime(text: string) {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return `${Math.max(1, Math.ceil(words / 180))} min read`;
}

export async function getAllBlogPosts(options?: { publishedOnly?: boolean }): Promise<BlogPost[]> {
  const entries = await kv.getEntriesByPrefix(BLOG_POST_PREFIX);
  const posts = entries
    .map((entry) => entry.value as BlogPost)
    .filter((post) => Boolean(post))
    .filter((post) => (options?.publishedOnly ? post.published : true));

  return sortPosts(posts);
}

export async function createBlogPost(input: {
  title: string;
  excerpt: string;
  content?: string;
  image?: string;
  category?: string;
  author: string;
  date?: string;
  readTime?: string;
  source?: BlogPostSource;
  sourceKey?: string;
  published?: boolean;
}): Promise<BlogPost> {
  const now = new Date().toISOString();
  const bodyText = `${input.excerpt} ${input.content || ''}`.trim();
  const post: BlogPost = {
    id: crypto.randomUUID(),
    title: input.title.trim(),
    excerpt: input.excerpt.trim(),
    content: input.content?.trim() || undefined,
    image: input.image?.trim() || undefined,
    category: input.category?.trim() || 'News',
    author: input.author.trim(),
    date: input.date || now,
    readTime: input.readTime || computeReadTime(bodyText),
    source: input.source || 'manual',
    sourceKey: input.sourceKey,
    published: input.published ?? true,
    createdAt: now,
    updatedAt: now,
  };

  await kv.set(blogPostKey(post.id), post);
  if (post.source === 'release-update' && post.sourceKey) {
    await kv.set(post.sourceKey, post.id);
  }

  return post;
}

export async function updateBlogPost(id: string, updates: Partial<Omit<BlogPost, 'id' | 'createdAt' | 'source' | 'sourceKey'>>): Promise<BlogPost | null> {
  const existing = await kv.get<BlogPost>(blogPostKey(id));
  if (!existing) {
    return null;
  }

  const merged: BlogPost = {
    ...existing,
    ...updates,
    title: updates.title !== undefined ? updates.title.trim() : existing.title,
    excerpt: updates.excerpt !== undefined ? updates.excerpt.trim() : existing.excerpt,
    content: updates.content !== undefined ? updates.content?.trim() || undefined : existing.content,
    image: updates.image !== undefined ? updates.image?.trim() || undefined : existing.image,
    category: updates.category !== undefined ? updates.category.trim() : existing.category,
    author: updates.author !== undefined ? updates.author.trim() : existing.author,
    updatedAt: new Date().toISOString(),
  };

  if (!updates.readTime && (updates.excerpt !== undefined || updates.content !== undefined)) {
    merged.readTime = computeReadTime(`${merged.excerpt} ${merged.content || ''}`.trim());
  }

  await kv.set(blogPostKey(id), merged);
  return merged;
}

export async function deleteBlogPost(id: string): Promise<void> {
  const existing = await kv.get<BlogPost>(blogPostKey(id));
  if (existing?.source === 'release-update' && existing.sourceKey) {
    await kv.del(existing.sourceKey);
  }

  await kv.del(blogPostKey(id));
}

export async function ensureReleaseUpdatePost(release: ReleaseMetadata) {
  if (release.type !== 'single' || release.status !== 'live') {
    return null;
  }

  const sourceKey = blogReleaseKey(release.id);
  const existingPostId = await kv.get<string>(sourceKey);
  const title = `${release.primaryArtist} just dropped a new single: ${release.title}`;
  const excerpt = `${release.primaryArtist} has a new single out now on major streaming platforms. Stay updated with the latest release from ${release.primaryArtist}.`;
  const content = `${release.primaryArtist} is now live with the single "${release.title}". The release is available across supported streaming platforms and has been published through the platform release workflow.`;

  if (existingPostId) {
    return await updateBlogPost(existingPostId, {
      title,
      excerpt,
      content,
      image: release.artworkUrl,
      category: 'Release Updates',
      author: 'AMT DISTRO Updates',
      date: new Date().toISOString(),
      published: true,
    });
  }

  return await createBlogPost({
    title,
    excerpt,
    content,
    image: release.artworkUrl,
    category: 'Release Updates',
    author: 'AMT DISTRO Updates',
    source: 'release-update',
    sourceKey,
    published: true,
  });
}