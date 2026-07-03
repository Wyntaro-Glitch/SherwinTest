"use client";

import { memo } from "react";

interface FilePreviewProps {
  file: { name: string; type: string; data: string } | null;
  onClose: () => void;
}

const FilePreview = memo(function FilePreview({ file, onClose }: FilePreviewProps) {
  if (!file) return null;
  const isImage = file.type.startsWith("image/");
  const isPdf = file.type === "application/pdf";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 max-w-2xl w-full mx-4 max-h-[90vh] flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-slate-300 truncate">{file.name}</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors cursor-pointer">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-auto rounded-xl bg-slate-950 flex items-center justify-center min-h-[300px]">
          {isImage ? (
            <img src={file.data} alt={file.name} className="max-w-full max-h-[70vh] object-contain rounded-lg" />
          ) : isPdf ? (
            <iframe src={file.data} className="w-full h-[70vh] rounded-lg" title={file.name} />
          ) : (
            <div className="text-slate-400 text-sm p-8 text-center">
              <svg className="w-12 h-12 mx-auto mb-3 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <p>Preview not available for this file type.</p>
              <p className="text-[10px] text-slate-600 mt-1">{file.type}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export default FilePreview;
