'use client';

import { useState, useEffect, useCallback } from 'react';
import * as Icons from './Icons';

interface BlogPost {
  slug?: string;
  title: string;
  date: string;
  excerpt?: string;
  content: string;
  coverImageId?: string;
  tags?: string[];
  draft?: boolean;
}

export function BlogEditor() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/blog');
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts || []);
      }
    } catch (err) {
      console.error('Failed to load blog posts:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (dirty && !saving) handleSave();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty, saving, posts]);

  async function handleSave() {
    setSaving(true);
    setSaveMessage('');
    try {
      const res = await fetch('/api/admin/blog', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ posts }),
      });
      if (res.ok) {
        const data = await res.json();
        setDirty(false);
        setSaveMessage(data.message || 'Saved!');
        setTimeout(() => setSaveMessage(''), 4000);
      } else {
        const err = await res.json();
        setSaveMessage(`Error: ${err.error}`);
      }
    } catch {
      setSaveMessage('Error: Failed to save');
    } finally {
      setSaving(false);
    }
  }

  function addPost() {
    const newPost: BlogPost = {
      title: '',
      date: new Date().toISOString().slice(0, 10),
      excerpt: '',
      content: '',
      tags: [],
      draft: true,
    };
    const newPosts = [...posts, newPost];
    setPosts(newPosts);
    setEditingIndex(newPosts.length - 1);
    setDirty(true);
  }

  function removePost(index: number) {
    const newPosts = posts.filter((_, i) => i !== index);
    setPosts(newPosts);
    if (editingIndex === index) setEditingIndex(null);
    else if (editingIndex !== null && editingIndex > index) setEditingIndex(editingIndex - 1);
    setDirty(true);
  }

  function updatePost(index: number, field: keyof BlogPost, value: unknown) {
    const newPosts = [...posts];
    newPosts[index] = { ...newPosts[index], [field]: value };
    setPosts(newPosts);
    setDirty(true);
  }

  function duplicatePost(index: number) {
    const original = posts[index];
    const duplicate: BlogPost = {
      ...original,
      title: `${original.title} (Copy)`,
      slug: undefined,
    };
    const newPosts = [...posts];
    newPosts.splice(index + 1, 0, duplicate);
    setPosts(newPosts);
    setEditingIndex(index + 1);
    setDirty(true);
  }

  function movePost(index: number, direction: 'up' | 'down') {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= posts.length) return;
    const newPosts = [...posts];
    const [moved] = newPosts.splice(index, 1);
    newPosts.splice(newIndex, 0, moved);
    setPosts(newPosts);
    if (editingIndex === index) setEditingIndex(newIndex);
    else if (editingIndex !== null) {
      if (direction === 'up' && editingIndex === newIndex) setEditingIndex(editingIndex + 1);
      else if (direction === 'down' && editingIndex === newIndex) setEditingIndex(editingIndex - 1);
    }
    setDirty(true);
  }

  function renderEditor(index: number) {
    const post = posts[index];
    return (
      <div className="blog-editor__form" key={index}>
        <div className="admin-field">
          <label>Title</label>
          <input
            value={post.title}
            onChange={(e) => updatePost(index, 'title', e.target.value)}
            placeholder="Post title"
          />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="admin-field">
            <label>Date</label>
            <input
              type="date"
              value={post.date}
              onChange={(e) => updatePost(index, 'date', e.target.value)}
            />
          </div>
          <div className="admin-field">
            <label>Status</label>
            <select
              value={post.draft ? 'draft' : 'published'}
              onChange={(e) => updatePost(index, 'draft', e.target.value === 'draft')}
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </div>
        </div>
        <div className="admin-field">
          <label>Excerpt (optional short description)</label>
          <textarea
            value={post.excerpt || ''}
            onChange={(e) => updatePost(index, 'excerpt', e.target.value)}
            placeholder="A brief summary of the post..."
            rows={2}
          />
        </div>
        <div className="admin-field">
          <label>Cover Image Asset ID (optional)</label>
          <input
            value={post.coverImageId || ''}
            onChange={(e) => updatePost(index, 'coverImageId', e.target.value)}
            placeholder="Immich asset UUID"
          />
        </div>
        <div className="admin-field">
          <label>Tags (comma-separated)</label>
          <input
            value={post.tags?.join(', ') || ''}
            onChange={(e) =>
              updatePost(
                index,
                'tags',
                e.target.value
                  .split(',')
                  .map((t) => t.trim())
                  .filter(Boolean),
              )
            }
            placeholder="photography, travel, tips"
          />
        </div>
        <div className="admin-field">
          <label>Content (Markdown)</label>
          <textarea
            value={post.content}
            onChange={(e) => updatePost(index, 'content', e.target.value)}
            placeholder="Write your post in Markdown..."
            rows={12}
            style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}
          />
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
          <button
            className="admin-btn admin-btn-secondary"
            onClick={() => setEditingIndex(null)}
            key="close"
          >
            Close Editor
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="admin-spinner" />
      </div>
    );
  }

  return (
    <div className="settings-panel">
      <div className="save-bar" style={{ marginBottom: '1rem', padding: '0.75rem 0' }}>
        <div className="save-bar-left">
          {dirty && <span className="unsaved-badge">Unsaved changes</span>}
          {saveMessage ? (
            <span
              className={`save-message ${saveMessage.startsWith('Error') ? 'error' : 'success'}`}
            >
              {saveMessage}
            </span>
          ) : (
            <span
              style={{
                fontSize: '0.75rem',
                color: 'var(--admin-text-muted)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
              }}
            >
              Ctrl+S to save
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="admin-btn admin-btn-secondary" onClick={addPost}>
            <Icons.IconPencil size={14} /> Add Post
          </button>
          <button
            className="admin-btn admin-btn-primary"
            onClick={handleSave}
            disabled={!dirty || saving}
          >
            {saving ? 'Saving...' : 'Save Blog'}
          </button>
        </div>
      </div>

      <div className="settings-section-header">
        <h3>
          <Icons.IconBlog size={18} /> Blog Posts
        </h3>
        <p className="settings-section-sub">
          Write and manage blog posts. Posts marked as drafts are hidden from the public blog page.
        </p>
      </div>

      {posts.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: '3rem 1rem',
            color: 'var(--admin-text-muted)',
          }}
        >
          <p>No blog posts yet. Click "Add Post" to create your first post.</p>
        </div>
      )}

      <div className="blog-editor__list">
        {posts.map((post, i) => (
          <div key={i} className={`blog-editor__item ${editingIndex === i ? 'editing' : ''}`}>
            <div
              className="blog-editor__item-header"
              onClick={() => setEditingIndex(editingIndex === i ? null : i)}
              style={{ cursor: 'pointer' }}
            >
              <div className="blog-editor__item-info">
                <span className="blog-editor__item-title">{post.title || '(untitled)'}</span>
                <span className="blog-editor__item-meta">
                  {post.date}
                  {post.draft && <span className="blog-editor__draft-badge">Draft</span>}
                </span>
              </div>
              <div className="blog-editor__item-actions">
                <button
                  className="admin-btn-icon"
                  title="Move up"
                  onClick={(e) => {
                    e.stopPropagation();
                    movePost(i, 'up');
                  }}
                  disabled={i === 0}
                >
                  <Icons.IconChevronDown size={14} style={{ transform: 'rotate(180deg)' }} />
                </button>
                <button
                  className="admin-btn-icon"
                  title="Move down"
                  onClick={(e) => {
                    e.stopPropagation();
                    movePost(i, 'down');
                  }}
                  disabled={i === posts.length - 1}
                >
                  <Icons.IconChevronDown size={14} />
                </button>
                <button
                  className="admin-btn-icon"
                  title="Duplicate"
                  onClick={(e) => {
                    e.stopPropagation();
                    duplicatePost(i);
                  }}
                >
                  <Icons.IconFileText size={14} />
                </button>
                <button
                  className="admin-btn-icon admin-btn-icon--danger"
                  title="Delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    removePost(i);
                  }}
                >
                  <Icons.IconTrash size={14} />
                </button>
              </div>
            </div>
            {editingIndex === i && renderEditor(i)}
          </div>
        ))}
      </div>

      {posts.length > 0 && (
        <div className="save-bar" style={{ marginTop: '1rem', padding: '0.75rem 0' }}>
          <div className="save-bar-left" />
          <button
            className="admin-btn admin-btn-primary"
            onClick={handleSave}
            disabled={!dirty || saving}
          >
            {saving ? 'Saving...' : 'Save Blog'}
          </button>
        </div>
      )}
    </div>
  );
}
