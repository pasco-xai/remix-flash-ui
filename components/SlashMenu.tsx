import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SparklesIcon, CodeIcon, GridIcon, DownloadIcon, MessageCircleIcon, ArrowLeftIcon, ArrowRightIcon } from './Icons';

interface Command {
    id: string;
    label: string;
    icon: React.ReactNode;
    description: string;
}

const COMMANDS: Command[] = [
    { id: 'next', label: '/next', icon: <ArrowRightIcon />, description: 'Go to next session or artifact' },
    { id: 'prev', label: '/prev', icon: <ArrowLeftIcon />, description: 'Go to previous session or artifact' },
    { id: 'focus', label: '/focus', icon: <GridIcon />, description: 'Focus artifact by index (e.g. /focus 1)' },
    { id: 'unfocus', label: '/unfocus', icon: <GridIcon />, description: 'Unfocus artifact' },
    { id: 'variations', label: '/variations', icon: <SparklesIcon />, description: 'Generate variations for focused artifact' },
    { id: 'export', label: '/export', icon: <DownloadIcon />, description: 'Export code for focused artifact' },
    { id: 'chat', label: '/chat', icon: <MessageCircleIcon />, description: 'Open Blueprint Co-planning' },
    { id: 'help', label: '/help', icon: <SparklesIcon />, description: 'Show keyboard shortcuts help' },
];

interface SlashMenuProps {
    query: string;
    onSelect: (command: string) => void;
    isVisible: boolean;
}

const SlashMenu = ({ query, onSelect, isVisible }: SlashMenuProps) => {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const filteredCommands = COMMANDS.filter(cmd => 
        cmd.label.toLowerCase().includes(query.toLowerCase())
    );

    useEffect(() => {
        setSelectedIndex(0);
    }, [query]);

    useEffect(() => {
        if (!isVisible) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => (prev + 1) % filteredCommands.length);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (filteredCommands[selectedIndex]) {
                    onSelect(filteredCommands[selectedIndex].label.split(' ')[0]);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isVisible, filteredCommands, selectedIndex, onSelect]);

    if (!isVisible || filteredCommands.length === 0) return null;

    return (
        <motion.div 
            className="slash-menu"
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
        >
            <div className="slash-menu-header">Commands</div>
            <div className="slash-menu-list">
                {filteredCommands.map((cmd, i) => (
                    <div 
                        key={cmd.id} 
                        className={`slash-menu-item ${i === selectedIndex ? 'selected' : ''}`}
                        onMouseEnter={() => setSelectedIndex(i)}
                        onClick={() => onSelect(cmd.label.split(' ')[0])}
                    >
                        <div className="slash-menu-icon">{cmd.icon}</div>
                        <div className="slash-menu-content">
                            <div className="slash-menu-label">{cmd.label}</div>
                            <div className="slash-menu-desc">{cmd.description}</div>
                        </div>
                    </div>
                ))}
            </div>
        </motion.div>
    );
};

export default SlashMenu;
