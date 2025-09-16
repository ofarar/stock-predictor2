import React, { useState, useEffect } from 'react';
import axios from 'axios';

const StockFilterSearch = ({ onStockSelect }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState([]);

    useEffect(() => {
        if (!searchTerm) {
            setResults([]);
            return;
        }
        const timer = setTimeout(() => {
            axios.get(`${process.env.REACT_APP_API_URL}/api/search/${searchTerm}`)
                .then(res => setResults(res.data.quotes || []));
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const handleSelect = (symbol) => {
        onStockSelect(symbol);
        setSearchTerm(symbol);
        setResults([]);
    };

    return (
        <div className="relative">
            <input type="text" placeholder="e.g., AAPL" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                   className="w-full bg-gray-700 text-white p-2 rounded" />
            {results.length > 0 && (
                <ul className="absolute z-10 w-full bg-gray-700 rounded-md mt-1">
                    {results.map((r, index) => <li key={`${r.symbol}-${index}`} onClick={() => handleSelect(r.symbol)}
                                          className="px-4 py-2 hover:bg-green-500 cursor-pointer">{r.symbol}</li>)}
                </ul>
            )}
        </div>
    );
};

export default StockFilterSearch;