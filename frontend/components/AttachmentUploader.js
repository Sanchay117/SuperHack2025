import { useEffect, useState } from "react";

function loadFiles(key) {
    if (typeof window === "undefined") return [];
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function saveFiles(key, files) {
    try {
        localStorage.setItem(key, JSON.stringify(files));
    } catch {}
}

export default function AttachmentUploader({ storageKey }) {
    const [files, setFiles] = useState([]);

    useEffect(() => {
        setFiles(loadFiles(storageKey));
    }, [storageKey]);

    function onChange(e) {
        const list = Array.from(e.target.files || []);
        const mapped = list.map((f) => ({
            id: `${Date.now()}-${f.name}`,
            name: f.name,
            size: f.size,
            type: f.type,
        }));
        const next = [...mapped, ...files];
        setFiles(next);
        saveFiles(storageKey, next);
        e.target.value = "";
    }

    function remove(id) {
        const next = files.filter((f) => f.id !== id);
        setFiles(next);
        saveFiles(storageKey, next);
    }

    return (
        <div>
            <input type="file" multiple onChange={onChange} className="block" />
            <div className="mt-3 space-y-2">
                {files.length === 0 ? (
                    <p className="text-sm text-gray-500">No attachments.</p>
                ) : (
                    files.map((f) => (
                        <div
                            key={f.id}
                            className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded border"
                        >
                            <div className="truncate mr-3">
                                <span className="font-medium">{f.name}</span>
                                <span className="text-gray-500 ml-2">
                                    {Math.ceil(f.size / 1024)} KB
                                </span>
                            </div>
                            <button
                                onClick={() => remove(f.id)}
                                className="text-red-600 hover:text-red-800"
                            >
                                Remove
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
