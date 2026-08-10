import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { getConfig } from '@/lib/config';
import { getPublishedPosts } from '@/lib/blog';
import { imageUrl, assetPlaceholder } from '@/lib/urls';
import { immich } from '@/lib/immich';
import { notFound } from 'next/navigation';
import './blog.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Blog',
};

export default async function BlogPage() {
  const config = getConfig();
  if (!config.blogEnabled) notFound();

  const posts = await getPublishedPosts();

  return (
    <div className="blog-listing">
      <h1 className="blog-listing__title">Blog</h1>

      {posts.length === 0 ? (
        <div className="blog-listing__empty">
          <p>No posts yet. Check back soon!</p>
        </div>
      ) : (
        <div className="blog-grid">
          {posts.map((post) => (
            <BlogCard key={post.slug} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}

async function BlogCard({ post }: { post: Awaited<ReturnType<typeof getPublishedPosts>>[number] }) {
  let placeholder: { blurDataURL: string } | null = null;

  if (post.coverImageId) {
    try {
      const asset = await immich.getAssetInfo(post.coverImageId);
      if (asset) placeholder = assetPlaceholder(asset);
    } catch {
      // cover image not found, render without placeholder
    }
  }

  const formattedDate = new Date(post.date).toLocaleDateString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <Link href={`/blog/${post.slug}`} className="blog-card">
      {post.coverImageId ? (
        <div className="blog-card__cover">
          <Image
            src={imageUrl(post.coverImageId, 'preview')}
            alt={post.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
            {...(placeholder
              ? { placeholder: 'blur' as const, blurDataURL: placeholder.blurDataURL }
              : {})}
          />
        </div>
      ) : (
        <div className="blog-card__cover" />
      )}
      <div className="blog-card__body">
        {post.tags && post.tags.length > 0 && (
          <div className="blog-card__tags">
            {post.tags.map((tag) => (
              <span key={tag} className="blog-card__tag">
                {tag}
              </span>
            ))}
          </div>
        )}
        <h2 className="blog-card__title">{post.title}</h2>
        <time className="blog-card__date" dateTime={post.date}>
          {formattedDate}
        </time>
        {post.excerpt && <p className="blog-card__excerpt">{post.excerpt}</p>}
      </div>
    </Link>
  );
}
