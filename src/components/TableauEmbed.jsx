'use client';

import { useEffect, useRef } from 'react';

export default function TableauEmbed({ embedHtml, embedType, openUrl }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !embedHtml) return;

    // Clear previous content
    containerRef.current.innerHTML = '';

    // Create a temporary div to parse the HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = embedHtml;

    // Extract and handle script elements
    const scripts = tempDiv.querySelectorAll('script');
    scripts.forEach((script) => {
      const newScript = document.createElement('script');
      if (script.src) {
        newScript.src = script.src;
        newScript.type = script.type || 'text/javascript';
        newScript.async = true;
      } else {
        newScript.textContent = script.textContent;
      }
      containerRef.current.appendChild(newScript);
    });

    // Add the remaining HTML (divs, objects, etc.)
    const nonScriptContent = tempDiv.cloneNode(true);
    nonScriptContent.querySelectorAll('script').forEach(script => script.remove());
    
    while (nonScriptContent.firstChild) {
      containerRef.current.appendChild(nonScriptContent.firstChild);
    }

  }, [embedHtml]);

  if (!embedHtml) {
    return (
      <div className="flex flex-col items-center justify-center h-96 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Dashboard Shared Yet</h3>
          <p className="text-gray-600 mb-4">A dashboard hasn&apos;t been shared with you yet.</p>
          {openUrl && (
            <a
              href={openUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Open in New Tab
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-4 flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">
          Your Tableau {embedType === 'story' ? 'Story' : 'Dashboard'}
        </h3>
        {openUrl && (
          <a
            href={openUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            Open in New Tab
          </a>
        )}
      </div>
      <div 
        ref={containerRef}
        className="w-full border rounded-lg overflow-hidden"
        style={{ minHeight: '800px' }}
      />
    </div>
  );
}
