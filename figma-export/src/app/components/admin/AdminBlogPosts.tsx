import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Loader2, Newspaper, PencilLine, Plus, Trash2 } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import {
  createAdminBlogPost,
  deleteAdminBlogPost,
  getAdminBlogPosts,
  updateAdminBlogPost,
  type BlogPost,
  type BlogPostInput,
} from '../../utils/admin-api.tsx';

const initialForm: BlogPostInput = {
  title: '',
  excerpt: '',
  content: '',
  image: '',
  category: 'News',
  author: 'AMT DISTRO Admin',
  published: true,
};

export default function AdminBlogPosts() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [form, setForm] = useState<BlogPostInput>(initialForm);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadPosts = async () => {
      try {
        setIsLoading(true);
        const data = await getAdminBlogPosts();
        if (active) {
          setPosts(data);
        }
      } catch (error) {
        if (active) {
          setErrorMessage(error instanceof Error ? error.message : 'Failed to load blog posts.');
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void loadPosts();

    return () => {
      active = false;
    };
  }, []);

  const manualPosts = useMemo(() => posts.filter((post) => post.source === 'manual'), [posts]);
  const releasePosts = useMemo(() => posts.filter((post) => post.source === 'release-update'), [posts]);

  function updateForm<K extends keyof BlogPostInput>(key: K, value: BlogPostInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function resetForm() {
    setForm(initialForm);
    setEditingPostId(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!form.title?.trim() || !form.excerpt?.trim()) {
      setErrorMessage('Title and excerpt are required.');
      return;
    }

    // Always set author to the logged-in admin's email (from sessionStorage)
    let adminEmail = '';
    try {
      const adminStr = sessionStorage.getItem('admin_profile');
      if (adminStr) {
        const admin = JSON.parse(adminStr);
        adminEmail = admin?.email || '';
      }
    } catch {}

    const postData = {
      ...form,
      author: adminEmail || form.author || 'AMT DISTRO Admin',
    };

    try {
      setIsSaving(true);
      if (editingPostId) {
        const updatedPost = await updateAdminBlogPost(editingPostId, postData);
        setPosts((current) => current.map((post) => (post.id === editingPostId ? updatedPost : post)));
        setSuccessMessage('Post updated successfully.');
      } else {
        const createdPost = await createAdminBlogPost(postData);
        setPosts((current) => [createdPost, ...current]);
        setSuccessMessage('Post published successfully.');
      }
      resetForm();
    } catch (error) {
      // Enhanced error reporting
      if (error instanceof Error) {
        setErrorMessage(error.message);
        // Try to log more details if available
        if ((error as any).response) {
          (error as any).response.json?.().then((data: any) => {
            console.error('Blog post save error details:', data);
          });
        } else {
          console.error('Blog post save error:', error);
        }
      } else {
        setErrorMessage('Failed to save blog post.');
        console.error('Unknown error saving blog post:', error);
      }
    } finally {
      setIsSaving(false);
    }
  }

  function handleEdit(post: BlogPost) {
    setEditingPostId(post.id);
    setForm({
      title: post.title,
      excerpt: post.excerpt,
      content: post.content || '',
      image: post.image || '',
      category: post.category,
      author: post.author,
      date: post.date.slice(0, 10),
      published: post.published,
    });
    setErrorMessage(null);
    setSuccessMessage(null);
  }

  async function handleDelete(post: BlogPost) {
    const confirmed = window.confirm(`Delete "${post.title}"?`);
    if (!confirmed) {
      return;
    }

    try {
      await deleteAdminBlogPost(post.id);
      setPosts((current) => current.filter((item) => item.id !== post.id));
      if (editingPostId === post.id) {
        resetForm();
      }
      setSuccessMessage('Post deleted successfully.');
      setErrorMessage(null);
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
        if ((error as any).response) {
          (error as any).response.json?.().then((data: any) => {
            console.error('Blog post delete error details:', data);
          });
        } else {
          console.error('Blog post delete error:', error);
        }
      } else {
        setErrorMessage('Failed to delete blog post.');
        console.error('Unknown error deleting blog post:', error);
      }
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Newspaper className="h-7 w-7 text-[#00E5FF]" />
            <h1 className="text-3xl font-bold text-white">News & Blog Posts</h1>
          </div>
          <p className="text-sm text-[#A0A7B8]">
            Create editorial posts for the public blog. Live singles will also generate update posts automatically.
          </p>
        </div>
        <div className="flex gap-3">
          <Card className="border-[#7B61FF]/15 bg-[#121826] px-4 py-3 text-white">
            <div className="text-xs uppercase tracking-[0.2em] text-[#A0A7B8]">Manual posts</div>
            <div className="mt-1 text-2xl font-semibold">{manualPosts.length}</div>
          </Card>
          <Card className="border-[#7B61FF]/15 bg-[#121826] px-4 py-3 text-white">
            <div className="text-xs uppercase tracking-[0.2em] text-[#A0A7B8]">Release updates</div>
            <div className="mt-1 text-2xl font-semibold">{releasePosts.length}</div>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-[#333] bg-[#0A0A0A]">
          <CardHeader>
            <CardTitle className="text-white">{editingPostId ? 'Edit post' : 'Create post'}</CardTitle>
            <CardDescription className="text-[#A0A7B8]">
              Posts marked as published will show immediately on the public blog page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-white" htmlFor="blog-title">Title</Label>
                  <Input id="blog-title" value={form.title || ''} onChange={(event) => updateForm('title', event.target.value)} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-white" htmlFor="blog-excerpt">Excerpt</Label>
                  <Textarea id="blog-excerpt" value={form.excerpt || ''} onChange={(event) => updateForm('excerpt', event.target.value)} rows={3} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-white" htmlFor="blog-content">Content</Label>
                  <Textarea id="blog-content" value={form.content || ''} onChange={(event) => updateForm('content', event.target.value)} rows={8} />
                </div>
                <div className="space-y-2">
                  <Label className="text-white" htmlFor="blog-category">Category</Label>
                  <Input id="blog-category" value={form.category || ''} onChange={(event) => updateForm('category', event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label className="text-white" htmlFor="blog-author">Author</Label>
                  <Input id="blog-author" value={form.author || ''} onChange={(event) => updateForm('author', event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label className="text-white" htmlFor="blog-date">Publish date</Label>
                  <Input id="blog-date" type="date" value={form.date || ''} onChange={(event) => updateForm('date', event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label className="text-white" htmlFor="blog-image">Image URL</Label>
                  <Input id="blog-image" value={form.image || ''} onChange={(event) => updateForm('image', event.target.value)} placeholder="https://..." />
                </div>
              </div>

              <label className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white">
                <input
                  type="checkbox"
                  checked={form.published !== false}
                  onChange={(event) => updateForm('published', event.target.checked)}
                />
                Publish immediately
              </label>

              {errorMessage ? <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">{errorMessage}</div> : null}
              {successMessage ? <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{successMessage}</div> : null}

              <div className="flex flex-wrap gap-3">
                <Button className="gap-2" disabled={isSaving} type="submit">
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : editingPostId ? <PencilLine className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  {editingPostId ? 'Update post' : 'Publish post'}
                </Button>
                {editingPostId ? (
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancel edit
                  </Button>
                ) : null}
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="border-[#333] bg-[#0A0A0A]">
          <CardHeader>
            <CardTitle className="text-white">Published feed</CardTitle>
            <CardDescription className="text-[#A0A7B8]">
              Manage manual posts and monitor auto-generated single release updates.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-6 text-sm text-[#A0A7B8]">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading posts...
              </div>
            ) : null}

            {!isLoading && posts.length === 0 ? (
              <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-6 text-sm text-[#A0A7B8]">
                No blog posts yet.
              </div>
            ) : null}

            {!isLoading && posts.map((post) => (
              <div key={post.id} className="rounded-2xl border border-white/10 bg-[#121826] p-4 text-white">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <div className="mb-2 flex flex-wrap gap-2">
                      <Badge variant="outline" className="border-[#7B61FF]/25 text-[#d6ccff]">{post.category}</Badge>
                      <Badge variant="outline" className={post.source === 'release-update' ? 'border-[#00E5FF]/30 text-[#9df6ff]' : 'border-emerald-500/30 text-emerald-200'}>
                        {post.source === 'release-update' ? 'Auto release update' : 'Manual'}
                      </Badge>
                      {!post.published ? <Badge variant="outline" className="border-amber-400/30 text-amber-200">Draft</Badge> : null}
                    </div>
                    <h3 className="text-lg font-semibold">{post.title}</h3>
                    <p className="mt-2 text-sm text-[#A0A7B8]">{post.excerpt}</p>
                  </div>
                  {post.source === 'manual' ? (
                    <div className="flex gap-2">
                      <Button type="button" size="sm" variant="outline" onClick={() => handleEdit(post)}>
                        <PencilLine className="h-4 w-4" />
                      </Button>
                      <Button type="button" size="sm" variant="outline" onClick={() => handleDelete(post)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-4 text-xs text-[#A0A7B8]">
                  <span>{post.author}</span>
                  <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{new Date(post.date).toLocaleDateString()}</span>
                  <span>{post.readTime}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}