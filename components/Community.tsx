import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { CommunityPost, User } from '../types';

interface CommunityProps {
  user: User;
}

const Community: React.FC<CommunityProps> = ({ user }) => {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [newPost, setNewPost] = useState('');
  const [isPosting, setIsPosting] = useState(false);

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    const data = await db.getAllPosts();
    setPosts(data);
  };

  const handlePost = async () => {
    if (!newPost.trim()) return;
    setIsPosting(true);
    try {
      const post: CommunityPost = {
        id: Math.random().toString(36).substr(2, 9),
        userId: user.id,
        userName: user.name,
        content: newPost,
        timestamp: new Date().toISOString(),
        likes: 0
      };
      await db.savePost(post);
      setPosts(prev => [post, ...prev]);
      setNewPost('');
    } catch (err) {
      console.error("Failed to post", err);
    } finally {
      setIsPosting(false);
    }
  };

  const handleLike = async (postId: string) => {
    try {
      await db.likePost(postId);
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes: (p.likes || 0) + 1 } : p));
    } catch (err) {
      console.error("Failed to like post", err);
    }
  };

  return (
    <div className="space-y-12 animate-fade-in max-w-4xl mx-auto">
      <div className="text-center space-y-4">
        <h2 className="text-6xl font-black text-gray-900 tracking-tighter">Bio-Community</h2>
        <p className="text-xl text-gray-500 font-medium">Connect with other animal lovers and farmers globally.</p>
      </div>

      {/* Create Post */}
      <div className="bg-white rounded-[4rem] shadow-3xl border border-gray-100 p-12 space-y-8">
        <div className="flex items-center space-x-6">
          <div className="h-16 w-16 bg-indigo-600 text-white rounded-[2.5rem] flex items-center justify-center text-2xl font-black shadow-2xl">
            {user.name.charAt(0)}
          </div>
          <div className="flex-1">
            <textarea 
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              placeholder="Share an update about your animals..."
              className="w-full p-8 bg-gray-50 border-none rounded-[3rem] text-lg font-medium focus:ring-2 focus:ring-indigo-500 min-h-[150px] resize-none"
            />
          </div>
        </div>
        <div className="flex justify-end">
          <button 
            onClick={handlePost}
            disabled={isPosting || !newPost.trim()}
            className="px-16 py-6 bg-indigo-600 text-white text-xl font-black rounded-[2.5rem] hover:bg-indigo-700 shadow-3xl transition-all disabled:opacity-50 flex items-center space-x-4"
          >
            {isPosting ? <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div> : <span>Broadcast Update</span>}
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
          </button>
        </div>
      </div>

      {/* Feed */}
      <div className="space-y-12">
        {posts.length === 0 ? (
          <div className="bg-white rounded-[4rem] p-32 text-center border-4 border-dashed border-gray-100 shadow-3xl">
            <p className="text-2xl font-black text-gray-300 uppercase tracking-widest">No community updates yet</p>
          </div>
        ) : (
          posts.map((post) => (
            <div key={post.id} className="bg-white rounded-[4rem] shadow-3xl border border-gray-100 p-12 space-y-8 group hover:-translate-y-4 transition-all duration-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-6">
                  <div className="h-14 w-14 bg-gray-900 text-white rounded-[2rem] flex items-center justify-center text-xl font-black shadow-xl">
                    {post.userName.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-2xl font-black text-gray-900 tracking-tight">{post.userName}</h4>
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest">{new Date(post.timestamp).toLocaleString()}</p>
                  </div>
                </div>
                <div className="h-10 w-10 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center shadow-sm">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" /></svg>
                </div>
              </div>
              <p className="text-2xl text-gray-700 font-medium leading-relaxed">{post.content}</p>
              <div className="flex items-center space-x-12 pt-8 border-t border-gray-50">
                <button 
                  onClick={() => handleLike(post.id)}
                  className="flex items-center space-x-3 text-gray-400 hover:text-red-500 transition-colors group/like"
                >
                  <svg className="h-8 w-8 group-hover/like:scale-125 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                  <span className="text-lg font-black">{post.likes}</span>
                </button>
                <button className="flex items-center space-x-3 text-gray-400 hover:text-indigo-600 transition-colors">
                  <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.274 3 11c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                  <span className="text-lg font-black">Comment</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Community;
