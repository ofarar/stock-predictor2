// src/components/StockFilterSearch.js

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

// FIX: Accept an initialValue prop
const StockFilterSearch = ({ onStockSelect, initialValue = '', placeholder }) => {
    const { t } = useTranslation();
    // FIX: Use the initialValue to set the starting state
    const [searchTerm, setSearchTerm] = useState(initialValue);
    const [results, setResults] = useState([]);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const searchRef = useRef(null);

    useEffect(() => {
        if (!searchTerm) {
            setResults([]);
            return;
        }
        const timer = setTimeout(() => {
            axios.get(`${import.meta.env.VITE_API_URL}/api/search/${searchTerm}`)
                .then(res => setResults(res.data.quotes || []));
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelect = (symbol) => {
        onStockSelect(symbol);
        setSearchTerm(symbol);
        setResults([]);
        setIsDropdownOpen(false);
    };

    const handleInputChange = (e) => {
        setSearchTerm(e.target.value.toUpperCase());
        if (e.target.value === '') {
            onStockSelect('');
        }
        setIsDropdownOpen(true);
    }

    return (
        <div className="relative" ref={searchRef}>
            <input
                type="text"
                placeholder={placeholder || t('stockFilterSearch.placeholder')}
                value={searchTerm}
                onChange={handleInputChange}
                onFocus={() => setIsDropdownOpen(true)}
                className="w-full bg-gray-700 text-white p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            {results.length > 0 && isDropdownOpen && (
                <ul className="absolute z-10 w-full bg-gray-700 rounded-md mt-1 max-h-60 overflow-y-auto">
                    {results.map((r, index) => (
                        <li
                            key={`${r.symbol}-${index}`}
                            onClick={() => handleSelect(r.symbol)}
                            className="px-4 py-2 hover:bg-green-500 cursor-pointer"
                        >
                            {r.symbol}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default StockFilterSearch;