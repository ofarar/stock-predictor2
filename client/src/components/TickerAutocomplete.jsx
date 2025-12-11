import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const TickerAutocomplete = ({ value, onChange, placeholder = "Search Ticker...", onSelect, className = "" }) => {
    const [searchTerm, setSearchTerm] = useState(value || '');
    const [results, setResults] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const searchRef = useRef(null);
    const ignoreNextSearch = useRef(false);

    // Sync internal state if external value changes (e.g., clear after selection)
    useEffect(() => {
        setSearchTerm(value || '');
    }, [value]);

    useEffect(() => {
        if (ignoreNextSearch.current) {
            ignoreNextSearch.current = false;
            return;
        }

        if (searchTerm.length < 1) {
            setResults([]);
            return;
        }

        // Debounce search
        const delayDebounceFn = setTimeout(() => {
            axios.get(`${import.meta.env.VITE_API_URL}/api/search/${searchTerm}`)
                .then(res => {
                    if (res.data && res.data.quotes) {
                        setResults(res.data.quotes);
                        setIsOpen(true);
                    }
                })
                .catch(err => console.error(err));
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleInputChange = (e) => {
        const val = e.target.value.toUpperCase();
        setSearchTerm(val);
        if (onChange) onChange(val);
        setIsOpen(true);
    };

    const handleItemSelect = (symbol) => {
        ignoreNextSearch.current = true;
        setSearchTerm(symbol);
        setIsOpen(false);
        if (onSelect) onSelect(symbol);
        else if (onChange) onChange(symbol);
    };

    return (
        <div className="relative w-full" ref={searchRef}>
            <input
                type="text"
                value={searchTerm}
                onChange={handleInputChange}
                onFocus={() => { if (results.length > 0) setIsOpen(true); }}
                placeholder={placeholder}
                className={`w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white outline-none focus:border-blue-500 transition-colors ${className}`}
            />
            {isOpen && results.length > 0 && (
                <ul className="absolute z-50 w-full bg-gray-800 border border-gray-600 rounded-b-md max-h-60 overflow-y-auto shadow-2xl">
                    {results.map((r, idx) => (
                        <li
                            key={`${r.symbol}-${idx}`}
                            onClick={() => handleItemSelect(r.symbol)}
                            className="px-4 py-2 hover:bg-blue-600 cursor-pointer flex justify-between items-center border-b border-gray-700 last:border-none"
                        >
                            <span className="font-bold text-white">{r.symbol}</span>
                            <span className="text-xs text-gray-400 truncate max-w-[60%]">{r.shortname || r.longname}</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default TickerAutocomplete;
