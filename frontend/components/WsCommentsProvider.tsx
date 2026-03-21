'use client';

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

export type WsComment = {
  id: number;
  post_id: number;
  user_id: number;
  content: string;
  created_at: string;
};

type CommentEvent = {
  event: 'comment';
  postId: number;
  comment: WsComment;
};

type WsCommentsContextValue = {
  commentsByPostId: Record<number, WsComment[]>;
  /** Latest total like counts from WebSocket (any user) — keeps post authors in sync on My posts / feed. */
  liveLikeCounts: Record<number, number>;
  sendComment: (postId: number, content: string) => void;
  isConnected: boolean;
};

const WsCommentsContext = createContext<WsCommentsContextValue | null>(null);

export function useWsComments() {
  const ctx = useContext(WsCommentsContext);
  if (!ctx) throw new Error('useWsComments must be used within WsCommentsProvider');
  return ctx;
}

export default function WsCommentsProvider({
  children,
  initialByPostId = {}
}: {
  children: React.ReactNode;
  /** postId → comments (newest first), from Prisma on feed load */
  initialByPostId?: Record<number, WsComment[]>;
}) {
  const [commentsByPostId, setCommentsByPostId] = useState<Record<number, WsComment[]>>(() => {
    const copy: Record<number, WsComment[]> = {};
    for (const [k, v] of Object.entries(initialByPostId)) {
      copy[Number(k)] = [...v];
    }
    return copy;
  });
  const [isConnected, setIsConnected] = useState(false);
  const [liveLikeCounts, setLiveLikeCounts] = useState<Record<number, number>>({});
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const wsUrl = `${proto}://${window.location.host}/ws/comments`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => setIsConnected(true);
    ws.onclose = () => setIsConnected(false);
    ws.onerror = () => setIsConnected(false);

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data) as
          | CommentEvent
          | { event: 'like'; postId: number; likes_count: number };

        if (msg.event === 'like') {
          if (typeof msg.postId !== 'number' || typeof msg.likes_count !== 'number') return;
          setLiveLikeCounts((prev) => ({ ...prev, [msg.postId]: msg.likes_count }));
          return;
        }

        if (msg.event !== 'comment') return;

        setCommentsByPostId((prev) => {
          const pid = msg.postId;
          const existing = prev[pid] ?? [];
          if (existing.some((c) => c.id === msg.comment.id)) {
            return prev;
          }
          return {
            ...prev,
            [pid]: [msg.comment, ...existing]
          };
        });
      } catch {
        // ignore malformed payloads
      }
    };

    return () => {
      ws.close();
    };
  }, []);

  const sendComment = useCallback((postId: number, content: string) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: 'comment', postId, content }));
  }, []);

  const value: WsCommentsContextValue = {
    commentsByPostId,
    liveLikeCounts,
    sendComment,
    isConnected
  };

  return <WsCommentsContext.Provider value={value}>{children}</WsCommentsContext.Provider>;
}
