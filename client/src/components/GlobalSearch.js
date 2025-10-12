import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

const GlobalSearch = () => {
    const { t } = useTranslation();
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState([]);
    const [isOpen, setIsOpen] = useState(true);
    const searchRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        if (searchTerm.length < 2) {
            setResults([]);
            return;
        }
        const delayDebounceFn = setTimeout(() => {
            axios.get(`${process.env.REACT_APP_API_URL}/api/search/${searchTerm}`)
                .then(res => setResults(res.data.quotes || []));
        }, 300);
        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelect = (symbol) => {
        setSearchTerm('');
        setResults([]);
        setIsOpen(false);
        navigate(`/stock/${symbol}`);
    };

    return (
        <div className="relative w-full md:w-64" ref={searchRef}>
            <input
                type="text"
                placeholder={t('globalSearch.placeholder')}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                onFocus={() => setIsOpen(true)}
                className="w-full bg-gray-700 text-white p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            {results.length > 0 && isOpen && (
                <ul className="absolute z-30 w-full bg-gray-800 border border-gray-700 rounded-md mt-1 max-h-80 overflow-y-auto">
                    {results.map((r, index) => (
                        <li key={`${r.symbol}-${index}`}
                            onClick={() => handleSelect(r.symbol)}
                            className="px-4 py-2 hover:bg-green-500 cursor-pointer">
                            <span className="font-bold">{r.symbol}</span>
                            <span className="text-sm text-gray-400 ml-2">{r.shortname}</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default GlobalSearch;