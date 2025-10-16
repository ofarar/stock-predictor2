import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import AsyncSelect from 'react-select/async';
import { FaCheckCircle, FaChartLine, FaShieldAlt, FaRocket, FaClock, FaCalendarAlt } from 'react-icons/fa';
import UserCard from './UserCard'; // Assuming UserCard is in the same directory or can be imported

const Step1Stocks = ({ selectedStocks, setSelectedStocks }) => {
    const { t } = useTranslation();

    const loadOptions = (inputValue, callback) => {
        if (!inputValue) {
            return callback([]);
        }
        axios.get(`/api/search/stocks?query=${inputValue}`)
            .then(res => {
                const options = res.data.map(stock => ({
                    value: stock.symbol,
                    label: `${stock.symbol} - ${stock.name}`
                }));
                callback(options);
            })
            .catch(() => callback([]));
    };

    const customStyles = {
        control: (provided) => ({ ...provided, backgroundColor: '#1F2937', borderColor: '#4B5563' }),
        input: (provided) => ({ ...provided, color: 'white' }),
        multiValue: (provided) => ({ ...provided, backgroundColor: '#4B5563' }),
        multiValueLabel: (provided) => ({ ...provided, color: 'white' }),
        multiValueRemove: (provided) => ({ ...provided, color: '#9CA3AF', ':hover': { backgroundColor: '#D1D5DB', color: '#1F2937' } }),
        menu: (provided) => ({ ...provided, backgroundColor: '#1F2937' }),
        option: (provided, state) => ({
            ...provided,
            backgroundColor: state.isFocused ? '#374151' : '#1F2937',
            color: 'white'
        }),
    };

    return (
        <div>
            <h2 className="text-xl font-bold mb-2">{t('find_member_wizard.step1_title')}</h2>
            <p className="text-gray-400 mb-4">{t('find_member_wizard.step1_description')}</p>
            <AsyncSelect
                isMulti
                cacheOptions
                defaultOptions
                loadOptions={loadOptions}
                value={selectedStocks}
                onChange={setSelectedStocks}
                placeholder={t('find_member_wizard.stock_search_placeholder')}
                styles={customStyles}
            />
        </div>
    );
};

const Step2Risk = ({ risk, setRisk }) => {
    const { t } = useTranslation();
    const options = [
        { key: 'Defensive', label: t('aggressiveness.defensive'), icon: <FaShieldAlt className="text-blue-400" /> },
        { key: 'Neutral', label: t('aggressiveness.neutral'), icon: <FaChartLine className="text-gray-400" /> },
        { key: 'Offensive', label: t('aggressiveness.offensive'), icon: <FaRocket className="text-red-400" /> },
    ];
    return (
        <div>
            <h2 className="text-xl font-bold mb-2">{t('find_member_wizard.step2_title')}</h2>
            <p className="text-gray-400 mb-4">{t('find_member_wizard.step2_description')}</p>
            <div className="grid grid-cols-3 gap-4">
                {options.map(option => (
                    <button key={option.key} onClick={() => setRisk(option.key)} className={`p-4 rounded-lg border-2 transition-all ${risk === option.key ? 'bg-gray-700 border-yellow-400' : 'bg-gray-900 border-gray-600 hover:border-gray-500'}`}>
                        <div className="flex items-center justify-center text-3xl mb-2">{option.icon}</div>
                        <span className="font-bold">{option.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};

const Step3Horizon = ({ horizon, setHorizon }) => {
    const { t } = useTranslation();
    const options = [
        { key: 'Short', label: t('find_member_wizard.horizon_short'), icon: <FaClock className="text-green-400" /> },
        { key: 'Long', label: t('find_member_wizard.horizon_long'), icon: <FaCalendarAlt className="text-purple-400" /> },
        { key: 'All', label: t('find_member_wizard.horizon_all'), icon: <FaChartLine className="text-gray-400" /> },
    ];
    return (
        <div>
            <h2 className="text-xl font-bold mb-2">{t('find_member_wizard.step3_title')}</h2>
            <p className="text-gray-400 mb-4">{t('find_member_wizard.step3_description')}</p>
            <div className="grid grid-cols-3 gap-4">
                {options.map(option => (
                    <button key={option.key} onClick={() => setHorizon(option.key)} className={`p-4 rounded-lg border-2 transition-all ${horizon === option.key ? 'bg-gray-700 border-yellow-400' : 'bg-gray-900 border-gray-600 hover:border-gray-500'}`}>
                        <div className="flex items-center justify-center text-3xl mb-2">{option.icon}</div>
                        <span className="font-bold">{option.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};

const Step4Results = ({ recommendations, loading, error }) => {
    const { t } = useTranslation();
    if (loading) return <div className="text-center p-8">{t('find_member_wizard.loading_recommendations')}</div>;
    if (error) return <div className="text-center p-8 text-red-400">{t('find_member_wizard.error_recommendations')}</div>;
    if (recommendations.length === 0) return <div className="text-center p-8">{t('find_member_wizard.no_recommendations')}</div>;

    return (
        <div>
            <h2 className="text-xl font-bold mb-2">{t('find_member_wizard.step4_title')}</h2>
            <p className="text-gray-400 mb-4">{t('find_member_wizard.step4_description')}</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-96 overflow-y-auto p-1">
                {recommendations.map(user => (
                    <div key={user._id} className="relative">
                        <UserCard user={user} />
                        <div className="absolute top-2 right-2 bg-yellow-500 text-gray-900 text-xs font-bold px-2 py-1 rounded-full">
                            {user.matchPercentage}% {t('find_member_wizard.match_rate')}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const RecommendationWizard = ({ isOpen, onClose }) => {
    const { t } = useTranslation();
    const [step, setStep] = useState(1);
    const [selectedStocks, setSelectedStocks] = useState([]);
    const [risk, setRisk] = useState('Neutral');
    const [horizon, setHorizon] = useState('All');
    const [recommendations, setRecommendations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const resetWizard = () => {
        setStep(1);
        setSelectedStocks([]);
        setRisk('Neutral');
        setHorizon('All');
        setRecommendations([]);
        setLoading(false);
        setError(null);
    };

    const handleClose = () => {
        resetWizard();
        onClose();
    };

    const handleNext = () => setStep(prev => prev + 1);
    const handleBack = () => setStep(prev => prev - 1);

    const handleFindRecommendations = async () => {
        setStep(4);
        setLoading(true);
        setError(null);
        try {
            const payload = {
                stocks: selectedStocks.map(s => s.value),
                riskTolerance: risk,
                investmentHorizon: horizon,
            };
            const response = await axios.post('/api/golden-members/recommend', payload, { withCredentials: true });
            setRecommendations(response.data);
        } catch (err) {
            setError(true);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const renderStep = () => {
        switch (step) {
            case 1: return <Step1Stocks selectedStocks={selectedStocks} setSelectedStocks={setSelectedStocks} />;
            case 2: return <Step2Risk risk={risk} setRisk={setRisk} />;
            case 3: return <Step3Horizon horizon={horizon} setHorizon={setHorizon} />;
            case 4: return <Step4Results recommendations={recommendations} loading={loading} error={error} />;
            default: return null;
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 animate-fade-in-fast">
            <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-2xl m-4 text-white">
                <div className="flex justify-between items-center border-b border-gray-700 pb-3 mb-4">
                    <h2 className="text-2xl font-bold text-yellow-400">{t('find_member_wizard.wizard_title')}</h2>
                    <button onClick={handleClose} className="text-gray-400 hover:text-white text-2xl">&times;</button>
                </div>
                {renderStep()}
                <div className="flex justify-between mt-6 pt-4 border-t border-gray-700">
                    <div>
                        {step > 1 && step < 4 && (
                            <button onClick={handleBack} className="text-gray-400 font-bold py-2 px-4 rounded mr-2 hover:bg-gray-700">{t('common_back')}</button>
                        )}
                    </div>
                    <div>
                        {step === 1 && (
                            <button onClick={handleNext} className="text-gray-400 font-bold py-2 px-4 rounded mr-2 hover:bg-gray-700">{t('find_member_wizard.skip_step')}</button>
                        )}
                        {step < 3 && (
                            <button onClick={handleNext} className="bg-yellow-500 text-gray-900 font-bold py-2 px-4 rounded hover:bg-yellow-400">{t('common_next')}</button>
                        )}
                        {step === 3 && (
                            <button onClick={handleFindRecommendations} className="bg-green-500 text-white font-bold py-2 px-4 rounded hover:bg-green-600 flex items-center">
                                <FaCheckCircle className="mr-2" /> {t('find_member_wizard.find_button')}
                            </button>
                        )}
                        {step === 4 && (
                            <button onClick={handleClose} className="bg-yellow-500 text-gray-900 font-bold py-2 px-4 rounded hover:bg-yellow-400">{t('common_close')}</button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RecommendationWizard;