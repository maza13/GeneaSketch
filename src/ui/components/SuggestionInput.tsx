import { useState, useRef, useEffect } from "react";

type Props = {
    value: string;
    onChange: (val: string) => void;
    onBlur?: () => void;
    suggestions: string[];
    placeholder?: string;
    className?: string;
    id?: string;
};

export function SuggestionInput({ value, onChange, onBlur, suggestions, placeholder, className, id }: Props) {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        window.document.addEventListener("mousedown", handleClickOutside);
        return () => window.document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const visibleSuggestions = suggestions.filter(s => s !== value);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!isOpen || visibleSuggestions.length === 0) {
            if (e.key === "ArrowDown") setIsOpen(true);
            return;
        }

        if (e.key === "ArrowDown") {
            e.preventDefault();
            setSelectedIndex(prev => (prev + 1) % visibleSuggestions.length);
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setSelectedIndex(prev => (prev - 1 + visibleSuggestions.length) % visibleSuggestions.length);
        } else if (e.key === "Enter") {
            if (selectedIndex >= 0) {
                e.preventDefault();
                onChange(visibleSuggestions[selectedIndex]);
                setIsOpen(false);
            }
        } else if (e.key === "Escape") {
            setIsOpen(false);
        }
    };

    return (
        <div className="suggestion-input-container" ref={containerRef} style={{ position: "relative", width: "100%" }}>
            <input
                id={id}
                type="text"
                value={value}
                onChange={(e) => {
                    onChange(e.target.value);
                    setIsOpen(true);
                    setSelectedIndex(-1);
                }}
                onFocus={() => setIsOpen(true)}
                onBlur={onBlur}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className={className}
                autoComplete="nope"
            />
            {isOpen && visibleSuggestions.length > 0 && (
                <div className="suggestion-dropdown" style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    right: 0,
                    zIndex: 2100,
                    background: "var(--bg-dropdown)",
                    border: "1px solid var(--line)",
                    borderRadius: "8px",
                    marginTop: "4px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                    maxHeight: "200px",
                    overflowY: "auto",
                    padding: "4px"
                }}>
                    {visibleSuggestions.map((suggestion, index) => (
                        <div
                            key={suggestion}
                            className={`suggestion-item ${index === selectedIndex ? 'selected' : ''}`}
                            onClick={() => {
                                onChange(suggestion);
                                setIsOpen(false);
                            }}
                            style={{
                                padding: "8px 12px",
                                cursor: "pointer",
                                borderRadius: "6px",
                                fontSize: "13px",
                                background: index === selectedIndex ? "var(--accent-soft)" : "transparent",
                                color: index === selectedIndex ? "var(--accent)" : "var(--ink-1)",
                            }}
                            onMouseEnter={() => setSelectedIndex(index)}
                        >
                            {suggestion}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
