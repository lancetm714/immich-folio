import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { getConfig } from '@/lib/config';
import { getBlogPost } from '@/lib/blog';
import { imageUrl, assetPlaceholder } from '@/lib/urls';
import { immich } from '@/lib/immich';
import { notFound } from 'next/navigation';
import '../blog.css';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post) return { title: 'Not Found' };

  const description = post.excerpt || post.content.slice(0, 160).replace(/\s+/g, ' ').trim();

  return {
    title: post.title,
    description,
    openGraph: {
      title: post.title,
      description,
      type: 'article',
      publishedTime: post.date,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description,
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const config = getConfig();
  if (!config.blogEnabled) notFound();

  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post || post.draft) notFound();

  let placeholder: { blurDataURL: string } | null = null;
  if (post.coverImageId) {
    try {
      const asset = await immich.getAssetInfo(post.coverImageId);
      if (asset) placeholder = assetPlaceholder(asset);
    } catch {
      // cover image not found
    }
  }

  const formattedDate = new Date(post.date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <article className="blog-post">
      <Link href="/blog" className="blog-post__back">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back to Blog
      </Link>

      <div className="blog-post__meta">
        <time className="blog-post__date" dateTime={post.date}>
          {formattedDate}
        </time>
        <h1 className="blog-post__title">{post.title}</h1>
        {post.tags && post.tags.length > 0 && (
          <div className="blog-post__tags">
            {post.tags.map((tag) => (
              <span key={tag} className="blog-post__tag">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {post.coverImageId && (
        <div className="blog-post__cover">
          <Image
            src={imageUrl(post.coverImageId, 'preview')}
            alt={post.title}
            fill
            sizes="(max-width: 740px) 100vw, 740px"
            {...(placeholder
              ? { placeholder: 'blur' as const, blurDataURL: placeholder.blurDataURL }
              : {})}
          />
        </div>
      )}

      <div
        className="blog-post__content"
        dangerouslySetInnerHTML={{ __html: renderMarkdown(post.content) }}
      />
    </article>
  );
}

function renderMarkdown(md: string): string {
  let html = md;

  // headings
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // bold and italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // links
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
  );

  // images
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />');

  // horizontal rule
  html = html.replace(/^---$/gm, '<hr />');

  // blockquotes
  html = html.replace(/^> (.+)$/gm, '<blockquote><p>$1</p></blockquote>');

  // unordered lists — group consecutive lines, wrap in <ul>/<ol>
  html = html.replace(/((?:^- .+(?:\n|$))+)/gm, (match) => {
    const items = match
      .split('\n')
      .filter((line) => line.startsWith('- '))
      .map((line) => `<li>${line.slice(2)}</li>`)
      .join('');
    return `<ul>${items}</ul>`;
  });

  // ordered lists
  html = html.replace(/((?:^\d+\. .+(?:\n|$))+)/gm, (match) => {
    const items = match
      .split('\n')
      .filter((line) => /^\d+\. /.test(line))
      .map((line) => `<li>${line.replace(/^\d+\. /, '')}</li>`)
      .join('');
    return `<ol>${items}</ol>`;
  });

  // paragraphs — wrap non-tag lines
  html = html
    .split(/\n\n+/)
    .map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return '';
      if (trimmed.startsWith('<')) return trimmed;
      return `<p>${trimmed.replace(/\n/g, '<br />')}</p>`;
    })
    .join('\n');

  return html;
}
