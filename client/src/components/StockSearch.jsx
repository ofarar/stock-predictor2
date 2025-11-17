// src/components/StockSearch.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

const StockSearch = ({ onStockSelect }) => {
    const { t } = useTranslation();
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [selectedStockQuote, setSelectedStockQuote] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (searchTerm.length < 2) {
            setSearchResults([]);
            return;
        }

        setIsLoading(true);
        setError('');

        const delayDebounceFn = setTimeout(() => {
            axios.get(`${import.meta.env.VITE_API_URL}/api/search/${searchTerm}`)
                .then(res => {
                    if (res.data.quotes && res.data.quotes.length > 0) {
                        setSearchResults(res.data.quotes);
                    } else {
                        setSearchResults([]);
                        setError(t('stockSearch.errorNoResults'));
                    }
                })
                .catch(err => {
                    console.error("Search API error:", err);
                    setError(t('stockSearch.errorFetchFailed'));
                })
                .finally(() => {
                    setIsLoading(false);
                });
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, t]);

    const handleSelectStock = (symbol) => {
        setIsLoading(true);
        setError('');
        setSearchTerm('');
        setSearchResults([]);

        axios.get(`${import.meta.env.VITE_API_URL}/api/quote/${symbol}`)
            .then(res => {
                const quoteData = res.data;
                if (quoteData && quoteData.regularMarketPrice) {
                    setSelectedStockQuote(quoteData);
                    onStockSelect(quoteData);
                } else {
                    setError(t('stockSearch.errorQuoteNotFound', { symbol }));
                    onStockSelect(null);
                }
            })
            .catch(err => {
                console.error("Quote API error:", err);
                setError(t('stockSearch.errorQuoteFailed'));
            })
            .finally(() => {
                setIsLoading(false);
            });
    };

    return (
        <div className="bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-md min-h-[380px]">
            <h2 className="text-3xl font-bold text-white mb-6 text-center">{t('stockSearch.title')}</h2>
            <div className="relative">
                <input 
                    type="text"
                    placeholder={t('stockSearch.placeholder')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-green-500 focus:border-green-500"
                />
                {searchResults.length > 0 && (
                    <ul className="absolute z-10 w-full bg-gray-700 border border-gray-600 rounded-md mt-1 max-h-60 overflow-y-auto">
                        {searchResults.map(result => (
                            <li 
                                key={result.symbol}
                                onClick={() => handleSelectStock(result.symbol)}
                                className="px-4 py-2 text-white hover:bg-green-500 cursor-pointer"
                            >
                                <span className="font-bold">{result.symbol}</span> - <span>{result.longname || result.shortname}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {isLoading && <p className="text-gray-400 mt-4 text-center">{t('stockSearch.loading')}</p>}
            {error && <p className="text-red-400 mt-4 text-center">{error}</p>}

            {selectedStockQuote && !isLoading && (
                <div className="mt-6 bg-gray-700 p-4 rounded-lg animate-fade-in">
                    <h3 className="text-xl font-bold text-white">{selectedStockQuote.symbol}</h3>
                    <p className="text-3xl font-bold text-green-400">${selectedStockQuote.regularMarketPrice.toFixed(2)}</p>
                    <p className={`text-sm font-semibold ${selectedStockQuote.regularMarketChangePercent < 0 ? 'text-red-400' : 'text-green-400'}`}>
                        {selectedStockQuote.regularMarketChange.toFixed(2)} ({selectedStockQuote.regularMarketChangePercent.toFixed(2)}%)
                    </p>
                    <p className="text-xs text-gray-400 mt-2">{t('stockSearch.dataDelayed')}</p>
                </div>
            )}
        </div>
    );
};

export default StockSearch;
