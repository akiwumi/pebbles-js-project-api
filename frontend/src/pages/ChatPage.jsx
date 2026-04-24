import React, { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ROUTES } from '../app/config/constants'
import { useAuth } from '../app/hooks/useAuth'
import { useToast } from '../app/hooks/useToast'
import { Spinner, Toast } from '../components/common'
import { thoughtService } from '../services/api'

const THOUGHT_LIMIT = 240
const LIKED_COUNTER_KEY = 'likedThoughtIds'

function validateThought(text) {
  const trimmed = text.trim()

  if (!trimmed) {
    return 'Thoughts cannot be empty.'
  }

  if (trimmed.length < 3) {
    return 'Thoughts must be at least 3 characters long.'
  }

  if (trimmed.length > THOUGHT_LIMIT) {
    return `Thoughts cannot be longer than ${THOUGHT_LIMIT} characters.`
  }

  return ''
}

function formatTimestamp(value) {
  if (!value) {
    return ''
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export default function ThoughtsPage() {
  const { user, isAuthenticated, logout } = useAuth()
  const { toast, success, error: showError } = useToast()
  const [thoughts, setThoughts] = useState([])
  const [draft, setDraft] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editingText, setEditingText] = useState('')
  const [formError, setFormError] = useState('')
  const [editError, setEditError] = useState('')
  const [isFetching, setIsFetching] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [pendingLikeId, setPendingLikeId] = useState(null)
  const [pendingDeleteId, setPendingDeleteId] = useState(null)
  const [pendingSaveId, setPendingSaveId] = useState(null)
  const [likedCount, setLikedCount] = useState(0)
  const [newThoughtIds, setNewThoughtIds] = useState([])
  const animationTimeouts = useRef([])

  useEffect(() => {
    try {
      const likedIds = JSON.parse(localStorage.getItem(LIKED_COUNTER_KEY) || '[]')
      setLikedCount(Array.isArray(likedIds) ? likedIds.length : 0)
    } catch {
      setLikedCount(0)
    }
  }, [])

  useEffect(() => {
    fetchThoughts()

    return () => {
      animationTimeouts.current.forEach((timeoutId) => clearTimeout(timeoutId))
    }
  }, [])

  const fetchThoughts = async () => {
    try {
      setIsFetching(true)
      const data = await thoughtService.getThoughts()
      setThoughts(Array.isArray(data?.thoughts) ? data.thoughts : [])
    } catch (err) {
      showError(err?.response?.data?.message || 'Unable to load thoughts right now.')
    } finally {
      setIsFetching(false)
    }
  }

  const rememberLikedThought = (thoughtId) => {
    try {
      const current = JSON.parse(localStorage.getItem(LIKED_COUNTER_KEY) || '[]')
      const next = Array.isArray(current) ? current : []

      if (!next.includes(thoughtId)) {
        const updated = [...next, thoughtId]
        localStorage.setItem(LIKED_COUNTER_KEY, JSON.stringify(updated))
        setLikedCount(updated.length)
      }
    } catch {
      // Ignore localStorage parsing issues and keep the UI responsive.
    }
  }

  const markThoughtAsNew = (thoughtId) => {
    setNewThoughtIds((current) => [...current, thoughtId])

    const timeoutId = window.setTimeout(() => {
      setNewThoughtIds((current) => current.filter((id) => id !== thoughtId))
    }, 2200)

    animationTimeouts.current.push(timeoutId)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const validationMessage = validateThought(draft)

    if (validationMessage) {
      setFormError(validationMessage)
      return
    }

    try {
      setIsSubmitting(true)
      setFormError('')
      const data = await thoughtService.createThought(draft.trim())
      const nextThought = data?.thought

      if (nextThought) {
        setThoughts((current) => [nextThought, ...current])
        markThoughtAsNew(nextThought._id)
      }

      setDraft('')
      success('Thought posted.')
    } catch (err) {
      setFormError(err?.response?.data?.message || 'Unable to post your thought right now.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const beginEdit = (thought) => {
    setEditingId(thought._id)
    setEditingText(thought.text)
    setEditError('')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditingText('')
    setEditError('')
  }

  const handleSaveEdit = async (thoughtId) => {
    const validationMessage = validateThought(editingText)

    if (validationMessage) {
      setEditError(validationMessage)
      return
    }

    try {
      setPendingSaveId(thoughtId)
      const data = await thoughtService.updateThought(thoughtId, editingText.trim())
      const updatedThought = data?.thought

      setThoughts((current) =>
        current.map((thought) => (thought._id === thoughtId ? updatedThought : thought))
      )
      cancelEdit()
      success('Thought updated.')
    } catch (err) {
      setEditError(err?.response?.data?.message || 'Unable to save your changes right now.')
    } finally {
      setPendingSaveId(null)
    }
  }

  const handleDelete = async (thoughtId) => {
    try {
      setPendingDeleteId(thoughtId)
      await thoughtService.deleteThought(thoughtId)
      setThoughts((current) => current.filter((thought) => thought._id !== thoughtId))
      success('Thought erased.')
    } catch (err) {
      showError(err?.response?.data?.message || 'Unable to erase this thought right now.')
    } finally {
      setPendingDeleteId(null)
    }
  }

  const handleLike = async (thoughtId) => {
    try {
      setPendingLikeId(thoughtId)
      const data = await thoughtService.likeThought(thoughtId)
      const updatedThought = data?.thought

      setThoughts((current) =>
        current.map((thought) => (thought._id === thoughtId ? updatedThought : thought))
      )
      rememberLikedThought(thoughtId)
    } catch (err) {
      showError(err?.response?.data?.message || 'Unable to like this thought right now.')
    } finally {
      setPendingLikeId(null)
    }
  }

  const remainingCharacters = THOUGHT_LIMIT - draft.length

  return (
    <div className="page-shell">
      <main className="thoughts-layout">
        <section className="thoughts-hero panel">
          <div>
            <p className="hero-kicker">Pebbles Feed</p>
            <h1 className="hero-title">Short thoughts, clear ownership, friendly feedback.</h1>
            <p className="hero-copy">
              Read the latest posts, like the ones that resonate, and manage your own thoughts when you are signed in.
            </p>
          </div>

          <div className="hero-stats">
            <div className="stat-card">
              <span className="stat-label">Different thoughts liked</span>
              <strong className="stat-value">{likedCount}</strong>
            </div>
            <div className="stat-card">
              <span className="stat-label">Signed in as</span>
              <strong className="stat-value">{user?.name || 'Guest reader'}</strong>
            </div>
          </div>
        </section>

        <section className="composer panel">
          <div className="composer-header">
            <div>
              <h2 className="section-title">Share a thought</h2>
              <p className="section-copy">Keep it concise and within 240 characters.</p>
            </div>

            {isAuthenticated ? (
              <button type="button" className="ghost-button" onClick={logout}>
                Logout
              </button>
            ) : (
              <div className="auth-inline-links">
                <Link to={ROUTES.LOGIN} className="ghost-button">Login</Link>
                <Link to={ROUTES.REGISTER} className="primary-link">Register</Link>
              </div>
            )}
          </div>

          {isAuthenticated ? (
            <form onSubmit={handleSubmit} className="composer-form">
              <label className="field-label" htmlFor="thought-text">Your thought</label>
              <textarea
                id="thought-text"
                className="composer-textarea"
                value={draft}
                onChange={(event) => {
                  setDraft(event.target.value)
                  setFormError('')
                }}
                placeholder="What is on your mind?"
                rows={4}
                disabled={isSubmitting}
              />
              <div className="composer-footer">
                <div>
                  <div className={`character-counter${remainingCharacters < 0 ? ' character-counter--danger' : ''}`}>
                    {remainingCharacters} characters remaining
                  </div>
                  {formError && <div className="inline-error">{formError}</div>}
                </div>

                <button type="submit" className="primary-button" disabled={isSubmitting}>
                  {isSubmitting ? 'Sending...' : 'Post thought'}
                </button>
              </div>
            </form>
          ) : (
            <div className="auth-prompt">
              <p className="auth-prompt-copy">Sign in to create, edit, and erase your own thoughts.</p>
              <div className="auth-inline-links">
                <Link to={ROUTES.LOGIN} className="primary-link">Login</Link>
                <Link to={ROUTES.REGISTER} className="ghost-button">Create account</Link>
              </div>
            </div>
          )}
        </section>

        <section className="thoughts-feed panel">
          <div className="feed-header">
            <div>
              <h2 className="section-title">Recent thoughts</h2>
              <p className="section-copy">Anyone can read. Only owners can update or erase.</p>
            </div>
          </div>

          {isFetching ? (
            <div className="loading-state">
              <Spinner />
              <span>Loading thoughts...</span>
            </div>
          ) : thoughts.length === 0 ? (
            <div className="empty-state">No thoughts yet. Be the first to post one.</div>
          ) : (
            <div className="thought-list">
              {thoughts.map((thought) => {
                const isOwner = user?._id && thought.author?._id === user._id
                const isEditing = editingId === thought._id
                const isNew = newThoughtIds.includes(thought._id)

                return (
                  <article
                    key={thought._id}
                    className={`thought-card${isNew ? ' thought-card--new' : ''}`}
                  >
                    <header className="thought-card-header">
                      <div>
                        <h3 className="thought-author">{thought.author?.name || 'Unknown author'}</h3>
                        <p className="thought-meta">{formatTimestamp(thought.createdAt)}</p>
                      </div>
                      <div className="thought-actions">
                        <button
                          type="button"
                          className="like-button"
                          onClick={() => handleLike(thought._id)}
                          disabled={pendingLikeId === thought._id}
                        >
                          {pendingLikeId === thought._id ? 'Liking...' : `Like ${thought.likes}`}
                        </button>
                        {isOwner && !isEditing && (
                          <>
                            <button type="button" className="ghost-button" onClick={() => beginEdit(thought)}>
                              Edit
                            </button>
                            <button
                              type="button"
                              className="danger-button"
                              onClick={() => handleDelete(thought._id)}
                              disabled={pendingDeleteId === thought._id}
                            >
                              {pendingDeleteId === thought._id ? 'Erasing...' : 'Erase'}
                            </button>
                          </>
                        )}
                      </div>
                    </header>

                    {isEditing ? (
                      <div className="edit-form">
                        <textarea
                          className="composer-textarea composer-textarea--compact"
                          value={editingText}
                          onChange={(event) => {
                            setEditingText(event.target.value)
                            setEditError('')
                          }}
                          rows={3}
                          disabled={pendingSaveId === thought._id}
                        />
                        <div className="edit-actions">
                          <div>
                            <div className={`character-counter${THOUGHT_LIMIT - editingText.length < 0 ? ' character-counter--danger' : ''}`}>
                              {THOUGHT_LIMIT - editingText.length} characters remaining
                            </div>
                            {editError && <div className="inline-error">{editError}</div>}
                          </div>
                          <div className="auth-inline-links">
                            <button type="button" className="ghost-button" onClick={cancelEdit}>
                              Cancel
                            </button>
                            <button
                              type="button"
                              className="primary-button"
                              onClick={() => handleSaveEdit(thought._id)}
                              disabled={pendingSaveId === thought._id}
                            >
                              {pendingSaveId === thought._id ? 'Saving...' : 'Save'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="thought-text">{thought.text}</p>
                    )}
                  </article>
                )
              })}
            </div>
          )}
        </section>
      </main>

      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  )
}
