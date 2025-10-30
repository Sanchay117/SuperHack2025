import { useEffect, useState } from "react";

function loadComments(key) {
    if (typeof window === "undefined") return [];
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function saveComments(key, comments) {
    try {
        localStorage.setItem(key, JSON.stringify(comments));
    } catch {}
}

export default function CommentSection({ storageKey }) {
    const [comments, setComments] = useState([]);
    const [text, setText] = useState("");

    useEffect(() => {
        setComments(loadComments(storageKey));
    }, [storageKey]);

    function addComment(e) {
        e.preventDefault();
        if (!text.trim()) return;
        const entry = {
            id: Date.now(),
            text: text.trim(),
            created_at: new Date().toISOString(),
        };
        const next = [entry, ...comments];
        setComments(next);
        saveComments(storageKey, next);
        setText("");
    }

    return (
        <div>
            <form onSubmit={addComment} className="space-y-2">
                <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    className="input w-full"
                    rows={3}
                    placeholder="Add a comment..."
                />
                <div className="flex justify-end">
                    <button type="submit" className="btn btn-primary">
                        Add Comment
                    </button>
                </div>
            </form>
            <div className="mt-4 space-y-3">
                {comments.length === 0 ? (
                    <p className="text-sm text-gray-500">No comments yet.</p>
                ) : (
                    comments.map((c) => (
                        <div
                            key={c.id}
                            className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                        >
                            <p className="text-sm text-gray-900">{c.text}</p>
                            <p className="text-xs text-gray-500 mt-1">
                                {new Date(c.created_at).toLocaleString()}
                            </p>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
