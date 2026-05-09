/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useEffect, useRef } from 'react';
import { Artifact } from '../types';
import { ThinkingIcon } from './Icons';

interface ArtifactCardProps {
    artifact: Artifact;
    isFocused: boolean;
    onClick: () => void;
}

const ArtifactCard = React.memo(({ 
    artifact, 
    isFocused, 
    onClick 
}: ArtifactCardProps) => {
    const codeRef = useRef<HTMLPreElement>(null);

    // Auto-scroll logic for this specific card
    useEffect(() => {
        if (codeRef.current) {
            codeRef.current.scrollTop = codeRef.current.scrollHeight;
        }
    }, [artifact.html]);

    const isBlurring = artifact.status === 'streaming';

    return (
        <div 
            className={`artifact-card ${isFocused ? 'focused' : ''} ${isBlurring ? 'generating' : ''}`}
            onClick={onClick}
        >
            <div className="artifact-header">
                <span className="artifact-style-tag">{artifact.styleName}</span>
            </div>
            <div className="artifact-card-inner">
                {isBlurring && (
                    <div className="generating-overlay">
                        <div className="generating-header">
                            <ThinkingIcon />
                            <span>Weaving interface...</span>
                            <div className="generating-progress-track">
                                <div className="generating-progress-fill"></div>
                            </div>
                        </div>
                        <pre ref={codeRef} className="code-stream-preview">
                            {artifact.html}
                        </pre>
                        <div className="generating-footer">
                            <div className="generating-status-group">
                                <div className="pulse-dot"></div>
                                <span>Real-time synthesis</span>
                            </div>
                            <div className="generating-status-group" style={{ opacity: 0.5 }}>
                                <span>L4-Gen</span>
                            </div>
                        </div>
                    </div>
                )}
                <iframe 
                    srcDoc={artifact.html} 
                    title={artifact.id} 
                    sandbox="allow-scripts allow-forms allow-modals allow-popups allow-presentation allow-same-origin"
                    className="artifact-iframe"
                />
            </div>
        </div>
    );
});

export default ArtifactCard;