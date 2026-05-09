import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SparklesIcon } from './Icons';

interface HelpModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const HelpModal = ({ isOpen, onClose }: HelpModalProps) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div 
                    className="help-modal-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                >
                    <motion.div 
                        className="help-modal-content"
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="help-header">
                            <SparklesIcon />
                            <h2>Keyboard Shortcuts & Commands</h2>
                        </div>
                        <div className="help-grid">
                            <div className="help-section">
                                <h3>Navigation</h3>
                                <div className="help-item"><span>/next</span> Next Session / Artifact</div>
                                <div className="help-item"><span>/prev</span> Prev Session / Artifact</div>
                                <div className="help-item"><span>/focus [1-3]</span> Focus specific artifact</div>
                                <div className="help-item"><span>/unfocus</span> Back to grid view</div>
                            </div>
                            <div className="help-section">
                                <h3>Actions</h3>
                                <div className="help-item"><span>/variations</span> Generate design variations</div>
                                <div className="help-item"><span>/export</span> Export HTML/CSS</div>
                                <div className="help-item"><span>/chat</span> Open planner chat</div>
                            </div>
                            <div className="help-section">
                                <h3>Shortcuts</h3>
                                <div className="help-item"><span>Esc</span> Unfocus / Close Drawers</div>
                                <div className="help-item"><span>Tab</span> Cycle through placeholders</div>
                                <div className="help-item"><span>/</span> Trigger command menu</div>
                            </div>
                        </div>
                        <button className="help-close-btn" onClick={onClose}>Got it</button>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default HelpModal;
