import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { Calendar, Loader2, User, ArrowRight, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { getPublishedBlogPosts } from '../utils/blog-api';
import type { BlogPost } from '../utils/admin-api';

const fallbackImage = 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800';

export function Blog() {
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadPosts = async () => {
      try {
        setIsLoading(true);
        const posts = await getPublishedBlogPosts();
        if (active) {
          setBlogPosts(posts);
          setLoadError(null);
        }
      } catch (error) {
        if (active) {
          setLoadError(error instanceof Error ? error.message : 'Failed to load blog posts.');
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

  const categories = useMemo(() => ['All', ...Array.from(new Set(blogPosts.map((post) => post.category).filter(Boolean)))], [blogPosts]);

  const filteredPosts = blogPosts.filter((post) => {
    const matchesCategory = selectedCategory === 'All' || post.category === selectedCategory;
    const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         post.excerpt.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <section
      className="py-20 px-4 sm:px-6 lg:px-8 min-h-screen"
      style={{ background: 'var(--background)', color: 'var(--foreground)' }}
    >
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl mb-4" style={{ color: 'var(--primary)' }}>AMT DISTRO UPDATE</h1>
          <p className="text-xl max-w-3xl mx-auto" style={{ color: 'var(--muted-foreground)' }}>
            News, release updates, and distribution insights from the AMT DISTRO platform
          </p>
        </div>

        {/* Search and Filter */}
        <div className="mb-12">
          <div className="max-w-2xl mx-auto mb-8">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Search articles..."
                className="pl-12"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? 'default' : 'outline'}
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </Button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <Card className="mb-12 border-gray-200 p-8 text-center" style={{ background: 'var(--card)', color: 'var(--card-foreground)' }}>
            <div className="inline-flex items-center gap-3" style={{ color: 'var(--muted-foreground)' }}>
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading blog posts...
            </div>
          </Card>
        ) : null}

        {loadError ? (
          <Card className="mb-12 border-red-200 p-6 text-center" style={{ background: '#2d0a0a', color: '#ffb3b3' }}>
            {loadError}
          </Card>
        ) : null}

        {/* Featured Post */}
        {filteredPosts.length > 0 && selectedCategory === 'All' && !searchQuery && (
          <Card className="overflow-hidden mb-12 hover:shadow-lg transition-shadow" style={{ background: 'var(--card)', color: 'var(--card-foreground)' }}>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="aspect-[16/10] relative">
                <ImageWithFallback
                  src={filteredPosts[0].image || fallbackImage}
                  alt={filteredPosts[0].title}
                  className="w-full h-full object-cover"
                />
                <Badge className="absolute top-4 left-4 bg-purple-600">Featured</Badge>
              </div>
              <div className="p-8 flex flex-col justify-center">
                <Badge variant="outline" className="w-fit mb-3">
                  {filteredPosts[0].category}
                </Badge>
                <h2 className="text-3xl mb-4">{filteredPosts[0].title}</h2>
                <p className="text-gray-600 mb-6">{filteredPosts[0].excerpt}</p>
                <div className="flex items-center gap-4 text-sm text-gray-600 mb-6">
                  <div className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    {filteredPosts[0].author}
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {new Date(filteredPosts[0].date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </div>
                  <div>{filteredPosts[0].readTime}</div>
                </div>
                <Button className="w-fit gap-2">
                  Read More
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Blog Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredPosts.slice(selectedCategory === 'All' && !searchQuery ? 1 : 0).map((post) => (
            <Card
              key={post.id}
              className="overflow-hidden hover:shadow-lg transition-shadow group cursor-pointer"
              style={{ background: 'var(--card)', color: 'var(--card-foreground)' }}
            >
              <div className="aspect-[16/10] relative overflow-hidden">
                <ImageWithFallback
                  src={post.image || fallbackImage}
                  alt={post.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="p-6">
                <Badge variant="outline" className="mb-3">
                  {post.category}
                </Badge>
                <h3 className="text-xl mb-3 line-clamp-2">{post.title}</h3>
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">{post.excerpt}</p>
                <div className="flex items-center gap-3 text-xs text-gray-600 mb-4">
                  <div className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {post.author}
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(post.date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </div>
                  <div>{post.readTime}</div>
                </div>
                <Button variant="ghost" className="p-0 h-auto text-purple-600 hover:text-purple-700 group-hover:gap-2 transition-all">
                  Read More
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {filteredPosts.length === 0 && (
          <div className="text-center py-12">
            <p className="mb-4" style={{ color: 'var(--muted-foreground)' }}>No articles found matching your criteria.</p>
            <Button variant="outline" onClick={() => { setSearchQuery(''); setSelectedCategory('All'); }}>
              Clear Filters
            </Button>
          </div>
        )}

        {/* Newsletter */}
        <Card className="p-12 mt-16 text-center" style={{ background: 'var(--card)', color: 'var(--card-foreground)' }}>
          <h2 className="text-3xl mb-4" style={{ color: 'var(--primary)' }}>Subscribe to Our Newsletter</h2>
          <p className="mb-8 max-w-2xl mx-auto" style={{ color: 'var(--muted-foreground)' }}>
            Get the latest tips, insights, and industry news delivered to your inbox every week
          </p>
          <div className="max-w-md mx-auto flex gap-3">
            <Input
              type="email"
              placeholder="Enter your email"
              className="bg-white text-gray-900"
            />
            <Button variant="secondary" className="whitespace-nowrap">
              Subscribe
            </Button>
          </div>
        </Card>
      </div>
    </section>
  );
}
