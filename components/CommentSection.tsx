import React, { useState } from 'react';
import { Comment, User } from '../types';
import { PaperAirplaneIcon, TrashIcon } from './IconComponents';

interface CommentSectionProps {
  comments: Comment[];
  currentUser: User;
  onAddComment: (content: string) => void;
  onDeleteComment: (commentId: string) => void;
  placeholder: string;
  title: string;
}

const CommentSection: React.FC<CommentSectionProps> = ({ comments, currentUser, onAddComment, onDeleteComment, placeholder, title }) => {
  const [newComment, setNewComment] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newComment.trim()) {
      // Sanitize comment to remove null characters before submitting.
      const sanitizedComment = newComment.replace(/\u0000/g, '').trim();
      onAddComment(sanitizedComment);
      setNewComment('');
    }
  };

  const sortedComments = [...comments].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  return (
    <div className="mt-4 bg-slate-900/50 p-4 rounded-lg border border-slate-700">
      <h5 className="font-bold text-white mb-3">{title} ({comments.length})</h5>
      <div className="space-y-3 max-h-60 overflow-y-auto pr-2 mb-4">
        {sortedComments.length > 0 ? (
          sortedComments.map(comment => (
            <div key={comment.id} className="flex items-start gap-3">
              <img src={comment.user.avatarUrl} alt={comment.user.username} className="w-8 h-8 rounded-full mt-1" />
              <div className="flex-1 bg-slate-700 p-3 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-sm text-white">{comment.user.username}</span>
                  {comment.user.id === currentUser.id && (
                    <button onClick={() => onDeleteComment(comment.id)} className="text-slate-400 hover:text-red-500" aria-label="Delete comment">
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <p className="text-sm text-slate-300 mt-1 break-words">{comment.content}</p>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-400 text-center py-4">No comments yet. Be the first to say something!</p>
        )}
      </div>
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <img src={currentUser.avatarUrl} alt={currentUser.username} className="w-8 h-8 rounded-full" />
        <div className="relative flex-1">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={placeholder}
            className="w-full bg-slate-700 border border-slate-600 rounded-full py-2 pl-4 pr-10 text-sm focus:ring-yellow-500 focus:border-yellow-500 focus:outline-none"
            aria-label="Add a comment"
          />
          <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-yellow-400 disabled:text-slate-600 disabled:cursor-not-allowed" disabled={!newComment.trim()} aria-label="Post comment">
            <PaperAirplaneIcon className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
};

export default CommentSection;
