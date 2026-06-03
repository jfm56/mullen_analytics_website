'use client';
import { useRef, useState } from 'react';

export default function FileUploadDropzone({ onFile, accept = '.csv', maxMB = 100, disabled }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  const handleFile = (f) => {
    if (!f) return;
    setSelectedFile(f);
    onFile(f);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
          dragging ? 'border-blue-500 bg-blue-50'
          : disabled ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
          : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50/30'
        }`}
      >
        <div className="text-3xl mb-2">📂</div>
        {selectedFile ? (
          <div>
            <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
            <p className="text-xs text-gray-500 mt-1">{(selectedFile.size / 1024).toFixed(1)} KB</p>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setSelectedFile(null); onFile(null); }}
              className="mt-2 text-xs text-red-500 hover:text-red-700"
            >
              Remove
            </button>
          </div>
        ) : (
          <div>
            <p className="text-sm font-medium text-gray-700">Drag & drop your CSV here or <span className="text-blue-600">click to browse</span></p>
            <p className="text-xs text-gray-400 mt-1">Accepted: {accept} · Max {maxMB} MB</p>
            <p className="text-xs text-gray-400 mt-0.5">We clean your EMSCharts export, standardize fields, calculate operational metrics, and build your dashboard.</p>
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        disabled={disabled}
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  );
}
