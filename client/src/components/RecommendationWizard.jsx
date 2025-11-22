import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import toast from 'react-hot-toast'; // Make sure toast is imported
import AsyncSelect from 'react-select/async';
import { FaCheckCircle, FaChartLine, FaShieldAlt, FaRocket, FaClock, FaCalendarAlt, FaSpinner } from 'react-icons/fa';
import UserCard from './UserCard'; // Assuming UserCard is in the same directory or can be imported
import JoinGoldenModal from './JoinGoldenModal';

const Step1Stocks = ({ selectedStocks, setSelectedStocks }) => {
    const { t } = useTranslation();

    const loadOptions = (inputValue, callback) => {
        if (!inputValue) {
            return callback([]);
        }
        const apiUrl = import.meta.env.VITE_API_URL;
        axios.get(`${apiUrl}/api/search/${inputValue}`) // <-- CORRECT URL
            .then(res => {
                const options = (res.data.quotes || []).map(stock => ({ // Use res.data.quotes
                    value: stock.symbol,
                    label: `${stock.symbol} - ${stock.shortname || stock.longname}` // Adjust based on API response
                }));
                callback(options);
            })
            .catch(() => callback([])); // Handle errors gracefully
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

const GoldenProgressBar = () => {
    const { t } = useTranslation();
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        // This simulates the progress bar filling up over 2.5 seconds
        const timer = setTimeout(() => setProgress(100), 100);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="text-center p-8">
            <div className="flex justify-center items-center mb-4">
                <FaSpinner className="animate-spin text-yellow-400 text-2xl me-3" />
                <p className="text-lg font-semibold text-gray-300">{t('find_member_wizard.loading_recommendations')}</p>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2.5">
                <div
                    className="bg-gradient-to-r from-yellow-600 to-yellow-400 h-2.5 rounded-full transition-all duration-[5000ms] ease-out"
                    style={{ width: `${progress}%` }}
                ></div>
            </div>
        </div>
    );
};

const Step4Results = ({ recommendations, loading, error, onJoin, settings }) => { // Add onJoin and settings
    const { t } = useTranslation();
    const getMatchColor = (percentage) => {
        if (percentage >= 80) return 'bg-yellow-500 text-gray-900'; // Bright yellow for high match
        if (percentage >= 60) return 'bg-yellow-700 text-yellow-100'; // Darker yellow for medium match
        return 'bg-yellow-900 text-yellow-300'; // Muted yellow for low match
    };

    if (loading) return <GoldenProgressBar />;
    if (error) return <div className="text-center p-8 text-red-400">{t('find_member_wizard.error_recommendations')}</div>;
    if (recommendations.length === 0) return <div className="text-center p-8">{t('find_member_wizard.no_recommendations')}</div>;

    return (
        <div>
            <h2 className="text-xl font-bold mb-2">{t('find_member_wizard.step4_title')}</h2>
            <p className="text-gray-400 mb-4">{t('find_member_wizard.step4_description')}</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-96 overflow-y-auto p-1">
                {recommendations.map(user => (
                    <div key={user._id} className="relative">
                        {/* Pass onJoin and settings to UserCard */}
                        <UserCard user={user} onJoin={onJoin} settings={settings} />
                        <div className={`absolute top-2 end-2 text-xs font-bold px-2 py-1 rounded-full ${getMatchColor(user.matchPercentage)}`}>
                            {user.matchPercentage}% {t('find_member_wizard.match_rate')}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const RecommendationWizard = ({ isOpen, onClose, settings }) => { // Add settings prop
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
        setRecommendations([]); // Clear previous results

        const payload = {
            stocks: selectedStocks.map(s => s.value),
            riskTolerance: risk,
            investmentHorizon: horizon,
        };
        const apiUrl = `${import.meta.env.VITE_API_URL}/api/golden-members/recommend`;

        // Promise for a minimum display time that matches the animation
        const minDisplayTimePromise = new Promise(resolve => setTimeout(resolve, 3500));

        // Promise for the actual API call
        const apiCallPromise = axios.post(apiUrl, payload, { withCredentials: true })
            .then(response => {
                const mySubscriptions = settings?.goldenSubscriptions?.map(sub => sub.user) || [];
                const recsWithSubStatus = response.data.map(rec => ({
                    ...rec,
                    isSubscribed: mySubscriptions.includes(rec._id)
                }));
                // Set the results, but don't turn off loading yet
                setRecommendations(recsWithSubStatus);
            })
            .catch(err => {
                console.error("Failed to fetch recommendations:", err);
                setError(true);
            });

        // Wait for BOTH the minimum time AND the API call to complete
        await Promise.all([minDisplayTimePromise, apiCallPromise]);

        // Now it's safe to hide the progress bar
        setLoading(false);
    };

    const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
    const [userToJoin, setUserToJoin] = useState(null);

    // Modify the handleJoin function
    const handleJoin = (user) => {
        console.log("Wizard Join button clicked for user:", user.username);
        setUserToJoin(user);
        setIsJoinModalOpen(true);
    };

    // 4. Add this new function to handle success
    const handleJoinSuccess = () => {
        toast.success(`Successfully subscribed to ${userToJoin.username}!`);
        setRecommendations(prevRecs => prevRecs.map(rec =>
            rec._id === userToJoin._id ? { ...rec, isSubscribed: true } : rec
        ));
        setIsJoinModalOpen(false);
        setUserToJoin(null);
    };

    if (!isOpen) return null;

    const renderStep = () => {
        switch (step) {
            case 1: return <Step1Stocks selectedStocks={selectedStocks} setSelectedStocks={setSelectedStocks} />;
            case 2: return <Step2Risk risk={risk} setRisk={setRisk} />;
            case 3: return <Step3Horizon horizon={horizon} setHorizon={setHorizon} />;
            case 4: return <Step4Results recommendations={recommendations} loading={loading} error={error} onJoin={handleJoin} settings={settings} />;
            default: return null;
        }
    };

    return (
        <>
            <JoinGoldenModal
                isOpen={isJoinModalOpen}
                onClose={() => setIsJoinModalOpen(false)}
                goldenMember={userToJoin}
                onUpdate={handleJoinSuccess}
            />
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
                                <button onClick={handleBack} className="text-gray-400 font-bold py-2 px-4 rounded me-2 hover:bg-gray-700">{t('common_back')}</button>
                            )}
                        </div>
                        <div>
                            {step === 1 && (
                                <button onClick={handleNext} className="text-gray-400 font-bold py-2 px-4 rounded me-2 hover:bg-gray-700">{t('find_member_wizard.skip_step')}</button>
                            )}
                            {step < 3 && (
                                <button onClick={handleNext} className="bg-yellow-500 text-gray-900 font-bold py-2 px-4 rounded hover:bg-yellow-400">{t('common_next')}</button>
                            )}
                            {step === 3 && (
                                <button onClick={handleFindRecommendations} className="bg-green-500 text-white font-bold py-2 px-4 rounded hover:bg-green-600 flex items-center">
                                    <FaCheckCircle className="me-2" /> {t('find_member_wizard.find_button')}
                                </button>
                            )}
                            {step === 4 && (
                                <button onClick={handleClose} className="bg-yellow-500 text-gray-900 font-bold py-2 px-4 rounded hover:bg-yellow-400">{t('common_close')}</button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default RecommendationWizard;